"""One FastAPI entry point. Works with python -m backend.app or python backend/app.py."""
import asyncio
import hmac
import os
import sys
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from backend.agent import TravelAgent
from backend import auth
from backend.commerce import CommerceService, public_booking
from backend.config import capabilities
from backend.memory import MemoryStore
from backend.models import (
    ApprovalDecisionRequest,
    AuthSessionRequest,
    ChatRequest,
    CheckoutRequest,
    DraftRequest,
    MemoryItemRequest,
    Preferences,
    QuoteRequest,
    ReservationRequest,
    WorkflowRequest,
)
from backend.roles import list_roles
from backend.storage import Store
from backend.mcp_server import mcp
from backend.travel_provider import CommerceError


def create_app(store=None, agent=None, commerce=None, memory=None):
    mcp_app = mcp.streamable_http_app()
    @asynccontextmanager
    async def lifespan(app):
        async with mcp.session_manager.run():
            yield
    app = FastAPI(title="Vacanes travel agents", version="2.0.0", lifespan=lifespan)
    app.mount("/mcp", mcp_app)
    @app.middleware("http")
    async def secure_mcp(request, call_next):
        key = os.getenv("BACKEND_SERVICE_KEY", "")
        if request.url.path.startswith("/mcp") and key and not hmac.compare_digest(key, request.headers.get("X-Service-Key", "")):
            return JSONResponse({"error": "Invalid service credentials."}, status_code=401)
        return await call_next(request)
    app.state.store = store or Store()
    app.state.memory = memory or MemoryStore()
    app.state.agent = agent or TravelAgent(memory_store=app.state.memory)
    app.state.commerce = commerce or CommerceService(app.state.store)
    rate = defaultdict(deque)
    active = set()

    @app.exception_handler(CommerceError)
    async def commerce_error(request, error):
        return JSONResponse({"detail": error.detail}, status_code=error.status)

    async def service(x_service_key: str = Header(default="")):
        service_key = os.getenv("BACKEND_SERVICE_KEY", "")
        if service_key and not hmac.compare_digest(service_key, x_service_key):
            raise HTTPException(401, "Invalid service credentials.")

    async def identity(x_auth_session: str = Header(default=""), checked=Depends(service)):
        if not x_auth_session:
            return None
        user = await run_in_threadpool(auth.verify_session, x_auth_session)
        if not user:
            raise HTTPException(401, "Your login session expired. Sign in again.")
        return user

    async def session(x_session_id: str = Header(default=""), user=Depends(identity)):
        if user:
            return "user:" + user["uid"]
        try:
            return str(UUID(x_session_id))
        except ValueError:
            raise HTTPException(400, "Invalid session.")

    async def account(user=Depends(identity)):
        if not user:
            raise HTTPException(401, "Sign in before reserving travel or opening Checkout.")
        return "user:" + user["uid"]

    @app.post("/api/auth/session")
    async def auth_session(body: AuthSessionRequest, checked=Depends(service)):
        return await run_in_threadpool(auth.exchange_id_token, body.id_token)

    @app.get("/api/auth/me")
    async def auth_me(user=Depends(identity)):
        return {"authenticated": bool(user), "user": user}

    @app.get("/health")
    async def health():
        return {"status": "ok", "capabilities": capabilities()}

    @app.get("/api/profile")
    async def profile(sid=Depends(session)):
        return {"preferences": app.state.store.profile(sid).model_dump(mode="json"), "capabilities": capabilities()}

    @app.put("/api/profile")
    async def save_profile(p: Preferences, sid=Depends(session)):
        app.state.store.save_profile(sid, p)
        return {"preferences": p.model_dump(mode="json")}

    @app.get("/api/memory")
    async def memory(sid=Depends(session)):
        return {"messages": app.state.store.history(sid)}

    @app.delete("/api/memory")
    async def clear(sid=Depends(session)):
        if sid in active:
            raise HTTPException(409, "Wait for the current response before clearing this chat.")
        app.state.store.clear_history(sid)
        return {"success": True}

    async def respond(body, sid):
        now = time.monotonic()
        bucket = rate[sid]
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= 12:
            raise HTTPException(429, "Please wait a minute before sending more messages.")
        if sid in active:
            raise HTTPException(409, "A response is already being prepared for this chat.")
        # Sweep old session rate buckets to keep local memory bounded.
        if len(rate) > 2000:
            for key in list(rate):
                if key != sid and (not rate[key] or rate[key][-1] < now - 60):
                    del rate[key]
        bucket.append(now)
        active.add(sid)
        try:
            response = await asyncio.wait_for(
                app.state.agent.run(
                    body.message,
                    app.state.store.profile(sid),
                    app.state.store.history(sid),
                    session_id=sid,
                ),
                timeout=110,
            )
            app.state.store.append_turn(sid, body.message, response)
            return response
        except TimeoutError:
            if hasattr(app.state, "memory"):
                app.state.memory.log_event(sid, "coordinator", "timeout", {"message": body.message[:200]})
            raise HTTPException(504, "The planner timed out. Please try a shorter request.")
        finally:
            active.discard(sid)

    @app.post("/api/ai/agent")
    async def chat(body: ChatRequest, sid=Depends(session)):
        return await respond(body, sid)

    @app.post("/api/planner")
    async def planner(body: ChatRequest, sid=Depends(session)):
        return await respond(body, sid)

    @app.post("/api/flights")
    async def flights(p: Preferences, sid=Depends(session)):
        if not p.destination:
            raise HTTPException(422, "Destination is required.")
        return await app.state.commerce.search("flight", p, sid)

    @app.post("/api/hotels")
    async def hotels(p: Preferences, sid=Depends(session)):
        if not p.destination:
            raise HTTPException(422, "Destination is required.")
        return await app.state.commerce.search("hotel", p, sid)

    @app.post("/api/bookings/quote")
    async def quote(body: QuoteRequest, sid=Depends(session)):
        return await app.state.commerce.quote(sid, body.offer_id)

    @app.post("/api/bookings/drafts")
    async def draft(body: DraftRequest, sid=Depends(session)):
        return app.state.commerce.draft(sid, body)

    @app.get("/api/bookings")
    async def bookings(sid=Depends(session)):
        return app.state.commerce.list_bookings(sid)

    @app.get("/api/bookings/{booking_id}")
    async def booking(booking_id: str, sid=Depends(session)):
        return {"booking": public_booking(app.state.commerce.owned_booking(sid, booking_id))}

    @app.post("/api/bookings/{booking_id}/reserve")
    async def reserve(booking_id: str, body: ReservationRequest, sid=Depends(account)):
        return await app.state.commerce.reserve(sid, booking_id, body)

    @app.post("/api/bookings/{booking_id}/checkout")
    async def checkout(booking_id: str, body: CheckoutRequest, sid=Depends(account)):
        return await app.state.commerce.checkout(sid, booking_id, body)

    @app.post("/api/payments/webhook")
    async def webhook(request: Request):
        payload = await request.body()
        if len(payload) > 1048576:
            raise HTTPException(413, "Webhook payload is too large.")
        return app.state.commerce.webhook(payload, request.headers.get("Stripe-Signature", ""))

    # ── Long-term memory ─────────────────────────────────────────────────────

    @app.get("/api/memory/long-term")
    async def long_term_memory(q: str = "", sid=Depends(session)):
        items = app.state.memory.recall(sid, query=q)
        return {"items": items, "count": len(items)}

    @app.post("/api/memory/long-term")
    async def add_memory(body: MemoryItemRequest, sid=Depends(session)):
        item = app.state.memory.remember(sid, body.key, body.value, body.kind, body.source)
        return {"item": item}

    @app.delete("/api/memory/long-term/{key}")
    async def delete_memory(key: str, sid=Depends(session)):
        deleted = app.state.memory.forget(sid, key)
        if not deleted:
            raise HTTPException(404, "Memory item not found.")
        return {"deleted": True}

    # ── Human-in-the-loop approvals ──────────────────────────────────────────

    @app.get("/api/approvals")
    async def get_approvals(all: bool = False, sid=Depends(session)):
        if all:
            items = app.state.memory.all_approvals(sid)
        else:
            items = app.state.memory.pending_approvals(sid)
        return {"approvals": items, "pending": sum(1 for a in items if a["status"] == "pending")}

    @app.post("/api/approvals/{approval_id}/decide")
    async def decide_approval(approval_id: str, body: ApprovalDecisionRequest, sid=Depends(session)):
        result = app.state.memory.decide_approval(sid, approval_id, body.decision, body.feedback)
        if not result:
            raise HTTPException(404, "Approval request not found or already decided.")
        app.state.memory.log_event(sid, "user", "approval_decided", {"approval_id": approval_id, "decision": body.decision})
        return {"approval": result}

    # ── Workflows ────────────────────────────────────────────────────────────

    @app.get("/api/workflows")
    async def list_workflows(sid=Depends(session)):
        return {"workflows": app.state.memory.list_workflows(sid)}

    @app.post("/api/workflows")
    async def create_workflow(body: WorkflowRequest, sid=Depends(session)):
        from uuid import uuid4
        wf_id = str(uuid4())
        wf = app.state.memory.save_workflow(sid, wf_id, body.name, body.kind, body.payload)
        app.state.memory.log_event(sid, "coordinator", "workflow_created", {"workflow_id": wf_id, "kind": body.kind, "name": body.name})
        return {"workflow": wf}

    @app.patch("/api/workflows/{workflow_id}")
    async def update_workflow(workflow_id: str, status: str, sid=Depends(session)):
        allowed_statuses = {"active", "paused", "completed", "cancelled"}
        if status not in allowed_statuses:
            raise HTTPException(422, f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        wf = app.state.memory.update_workflow_status(sid, workflow_id, status)
        if not wf:
            raise HTTPException(404, "Workflow not found.")
        return {"workflow": wf}

    # ── Agent roles ──────────────────────────────────────────────────────────

    @app.get("/api/agents/roles")
    async def agent_roles(checked=Depends(service)):
        return {"roles": list_roles()}

    # ── Observability: trace and metrics ─────────────────────────────────────

    @app.get("/api/trace")
    async def trace(workflow_id: str | None = None, limit: int = 100, sid=Depends(session)):
        limit = max(1, min(limit, 500))
        events = app.state.memory.events(sid, workflow_id=workflow_id, limit=limit)
        return {"events": events, "count": len(events)}

    @app.get("/api/metrics")
    async def metrics(sid=Depends(session)):
        m = app.state.memory.metrics(sid)
        return {**m, "capabilities": capabilities()}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000)

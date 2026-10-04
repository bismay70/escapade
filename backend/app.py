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
from backend.models import AuthSessionRequest, ChatRequest, CheckoutRequest, DraftRequest, Preferences, QuoteRequest, ReservationRequest
from backend.storage import Store
from backend.mcp_server import mcp
from backend.travel_provider import CommerceError


def create_app(store=None, agent=None, commerce=None):
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
    app.state.agent = agent or TravelAgent()
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
            response = await asyncio.wait_for(app.state.agent.run(body.message, app.state.store.profile(sid), app.state.store.history(sid)), timeout=110)
            app.state.store.append_turn(sid, body.message, response)
            return response
        except TimeoutError:
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

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000)

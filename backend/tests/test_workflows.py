import asyncio
import time
from uuid import uuid4

import pytest
from fastapi import HTTPException
import httpx

from backend.agent import TravelAgent
from backend.app import create_app
from backend.models import Preferences
from backend.storage import Store
from backend.workflows import Workflows, RunRequest


def test_review_persistence_isolation_and_retry(tmp_path):
    store = Store(tmp_path / "workflows.db")
    store.save_profile("alice", Preferences(dietary="vegan", days=2))
    workflows = Workflows(store, TravelAgent())
    run = workflows.create("alice", RunRequest(message="Two days in Goa"))
    with pytest.raises(HTTPException) as forbidden:
        workflows.get("bob", run["id"])
    assert forbidden.value.status_code == 404
    with pytest.raises(HTTPException):
        workflows.review("alice", run["id"], "approved")
    asyncio.run(workflows.execute("alice", run["id"]))
    result = workflows.get("alice", run["id"])
    assert result["status"] == "awaiting_review"
    assert result["result"]["preferences_used"]["dietary"] == "vegan"
    assert len(result["trace"]) >= 5
    assert result["duration_ms"] >= 0
    workflows.review("alice", run["id"], "rejected")
    store.save_profile("alice", Preferences(dietary="halal"))
    retry = workflows.retry("alice", run["id"])
    assert retry["id"] != run["id"]
    assert retry["preferences"]["dietary"] == "halal"
    reopened = Workflows(Store(store.path), TravelAgent())
    assert reopened.get("alice", run["id"])["status"] == "rejected"
    assert reopened.list("bob") == []
    assert store.bookings("alice") == []


def test_stale_lease_recovery_and_concurrent_limit(tmp_path):
    store = Store(tmp_path / "runs.db")
    workflows = Workflows(store, TravelAgent())
    run = workflows.create("alice", RunRequest(message="Goa trip"))
    with pytest.raises(HTTPException) as conflict:
        workflows.create("alice", RunRequest(message="Paris trip"))
    assert conflict.value.status_code == 409
    with store.connect() as c:
        c.execute("UPDATE workflow_runs SET updated=? WHERE id=?", (time.time()-200, run["id"]))
    assert workflows.get("alice", run["id"])["status"] == "interrupted"
    assert workflows.retry("alice", run["id"])["status"] == "running"


def test_provider_failure_is_persisted_without_secrets(tmp_path):
    class Broken:
        async def run(self, *args, **kwargs):
            raise ValueError("secret-provider-token")
    workflows = Workflows(Store(tmp_path / "runs.db"), Broken())
    run = workflows.create("alice", RunRequest(message="Goa trip"))
    asyncio.run(workflows.execute("alice", run["id"]))
    result = workflows.get("alice", run["id"])
    assert result["status"] == "failed"
    assert "secret-provider-token" not in str(result)


def test_api_review_and_owner_boundary(tmp_path):
    class Instant:
        async def run(self, message, preferences, history, on_progress=None):
            on_progress([{"agent": "coordinator", "status": "complete", "detail": "Parsed brief"}])
            return {"answer": "Research complete", "trace": [], "mode": "sample"}
    app = create_app(Store(tmp_path / "api.db"), Instant())
    owner = {"X-Session-Id": str(uuid4())}
    other = {"X-Session-Id": str(uuid4())}
    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/research-runs", headers=owner, json={"message": "Goa trip"})
            assert response.status_code == 200
            run_id = response.json()["id"]
            await asyncio.gather(*app.state.workflows.tasks)
            run = (await client.get(f"/api/research-runs/{run_id}", headers=owner)).json()
            assert run["status"] == "awaiting_review"
            assert "history" not in run
            path = f"/api/research-runs/{run_id}/review"
            assert (await client.post(path, headers=other, json={"decision": "approved"})).status_code == 404
            assert (await client.post(path, headers=owner, json={"decision": "approved"})).json()["status"] == "approved"
            assert (await client.post(path, headers=owner, json={"decision": "rejected"})).status_code == 409
            assert (await client.get("/api/research-runs", headers=other)).json()["runs"] == []
    asyncio.run(check())

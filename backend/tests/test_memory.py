"""Tests for long-term memory, approvals, workflows, and observability endpoints."""
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.memory import MemoryStore
from backend.storage import Store


@pytest.fixture
def client(tmp_path, monkeypatch):
    for name in ("GROQ_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY", "BACKEND_SERVICE_KEY"):
        monkeypatch.delenv(name, raising=False)
    store = Store(tmp_path / "test.sqlite3")
    mem = MemoryStore(tmp_path / "test.sqlite3")
    app = create_app(store=store, memory=mem)
    return TestClient(app)


def sid():
    return {"X-Session-Id": str(uuid4())}


# ── Long-term memory ────────────────────────────────────────────────────────

def test_remember_and_recall(client):
    h = sid()
    result = client.post("/api/memory/long-term", headers=h, json={"key": "fav_dest", "value": "Goa", "kind": "preference"})
    assert result.status_code == 200
    assert result.json()["item"]["key"] == "fav_dest"
    items = client.get("/api/memory/long-term", headers=h).json()["items"]
    assert any(i["key"] == "fav_dest" for i in items)


def test_recall_with_query(client):
    h = sid()
    client.post("/api/memory/long-term", headers=h, json={"key": "diet", "value": "vegan always", "kind": "fact"})
    client.post("/api/memory/long-term", headers=h, json={"key": "pace", "value": "relaxed traveller", "kind": "fact"})
    result = client.get("/api/memory/long-term?q=vegan", headers=h).json()
    assert len(result["items"]) == 1
    assert result["items"][0]["key"] == "diet"


def test_delete_memory(client):
    h = sid()
    client.post("/api/memory/long-term", headers=h, json={"key": "to_delete", "value": "gone", "kind": "note"})
    assert client.delete("/api/memory/long-term/to_delete", headers=h).status_code == 200
    items = client.get("/api/memory/long-term", headers=h).json()["items"]
    assert not any(i["key"] == "to_delete" for i in items)
    assert client.delete("/api/memory/long-term/to_delete", headers=h).status_code == 404


def test_memory_is_session_scoped(client):
    a, b = sid(), sid()
    client.post("/api/memory/long-term", headers=a, json={"key": "private", "value": "only for a", "kind": "fact"})
    items_b = client.get("/api/memory/long-term", headers=b).json()["items"]
    assert not any(i["key"] == "private" for i in items_b)


def test_invalid_memory_item(client):
    h = sid()
    assert client.post("/api/memory/long-term", headers=h, json={"key": "", "value": "x"}).status_code == 422
    assert client.post("/api/memory/long-term", headers=h, json={"key": "k", "value": "x", "kind": "unknown_kind"}).status_code == 422


# ── Approvals ────────────────────────────────────────────────────────────────

def test_approvals_empty_initially(client):
    result = client.get("/api/approvals", headers=sid())
    assert result.status_code == 200
    assert result.json()["approvals"] == []
    assert result.json()["pending"] == 0


def test_create_and_decide_approval(tmp_path, monkeypatch):
    """Create an approval directly in the store and decide it via the API."""
    for name in ("GROQ_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY", "BACKEND_SERVICE_KEY"):
        monkeypatch.delenv(name, raising=False)
    mem = MemoryStore(tmp_path / "test.sqlite3")
    store = Store(tmp_path / "test.sqlite3")
    app = create_app(store=store, memory=mem)
    client = TestClient(app)

    h = sid()
    session_id = h["X-Session-Id"]
    approval_id = str(uuid4())
    mem.create_approval(session_id, approval_id, "coordinator", "review", "Approve this booking?", {"offer": "flight-to-goa"})

    pending = client.get("/api/approvals", headers=h).json()
    assert pending["pending"] == 1
    assert any(a["id"] == approval_id for a in pending["approvals"])

    result = client.post(f"/api/approvals/{approval_id}/decide", headers=h, json={"decision": "approve"})
    assert result.status_code == 200
    assert result.json()["approval"]["decision"] == "approve"

    # Already decided — should 404 on a second attempt
    assert client.post(f"/api/approvals/{approval_id}/decide", headers=h, json={"decision": "reject"}).status_code == 404

    # Other session cannot decide
    assert client.post(f"/api/approvals/{approval_id}/decide", headers=sid(), json={"decision": "approve"}).status_code == 404


# ── Workflows ────────────────────────────────────────────────────────────────

def test_create_list_and_update_workflow(client):
    h = sid()
    result = client.post("/api/workflows", headers=h, json={"name": "Goa Trip", "kind": "travel_plan"})
    assert result.status_code == 200
    wf = result.json()["workflow"]
    assert wf["name"] == "Goa Trip"
    assert wf["status"] == "active"

    listed = client.get("/api/workflows", headers=h).json()["workflows"]
    assert any(w["id"] == wf["id"] for w in listed)

    updated = client.patch(f"/api/workflows/{wf['id']}?status=completed", headers=h)
    assert updated.status_code == 200
    assert updated.json()["workflow"]["status"] == "completed"

    assert client.patch(f"/api/workflows/{wf['id']}?status=invalid_status", headers=h).status_code == 422


def test_workflows_are_session_scoped(client):
    a, b = sid(), sid()
    client.post("/api/workflows", headers=a, json={"name": "Private", "kind": "custom"})
    assert client.get("/api/workflows", headers=b).json()["workflows"] == []


# ── Metrics and trace ────────────────────────────────────────────────────────

def test_metrics_returns_structure(client):
    result = client.get("/api/metrics", headers=sid())
    assert result.status_code == 200
    m = result.json()
    assert "total_events" in m
    assert "pending_approvals" in m
    assert "active_workflows" in m
    assert "capabilities" in m


def test_trace_returns_events(client):
    result = client.get("/api/trace", headers=sid())
    assert result.status_code == 200
    assert "events" in result.json()


# ── Agent roles ──────────────────────────────────────────────────────────────

def test_agent_roles_endpoint(client):
    result = client.get("/api/agents/roles")
    assert result.status_code == 200
    roles = result.json()["roles"]
    role_ids = {r["id"] for r in roles}
    assert {"coordinator", "researcher", "planner", "analyst", "assistant"} == role_ids
    for role in roles:
        assert "name" in role
        assert "description" in role
        assert "tools" in role

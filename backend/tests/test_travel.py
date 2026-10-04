import asyncio
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.agent import TravelAgent
from backend.app import create_app
from backend.models import Preferences
from backend.providers import Providers
from backend.storage import Store


@pytest.fixture
def client(tmp_path, monkeypatch):
    for name in ("GROQ_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY", "TAVILY_MCP_URL", "OPENWEATHER_API_KEY", "AVIATIONSTACK_API_KEY", "BACKEND_SERVICE_KEY"):
        monkeypatch.delenv(name, raising=False)
    app = create_app(Store(tmp_path / "test.sqlite3"), TravelAgent())
    return TestClient(app)


def headers():
    return {"X-Session-Id": str(uuid4())}


def test_preferences_persist_and_are_session_scoped(client):
    a, b = headers(), headers()
    prefs = Preferences(dietary="vegan", pace="relaxed", accessibility=True).model_dump(mode="json")
    assert client.put("/api/profile", headers=a, json=prefs).status_code == 200
    assert client.get("/api/profile", headers=a).json()["preferences"]["dietary"] == "vegan"
    assert client.get("/api/profile", headers=b).json()["preferences"]["dietary"] == "any"


def test_store_survives_recreation(tmp_path):
    path = tmp_path / "memory.sqlite3"
    sid = str(uuid4())
    Store(path).save_profile(sid, Preferences(dietary="halal"))
    assert Store(path).profile(sid).dietary == "halal"


def test_trip_uses_preferences_and_followup_memory(client):
    sid = headers()
    p = Preferences(travel_style="family", travelers=4, dietary="vegan", pace="relaxed", accessibility=True, interests=["beaches"], budget=20000)
    client.put("/api/profile", headers=sid, json=p.model_dump(mode="json"))
    trip = client.post("/api/ai/agent", headers=sid, json={"message": "Plan a 3-day trip to Goa"}).json()
    assert trip["destination"] == "Goa"
    assert len(trip["itinerary"]) == 3
    assert "vegan" in trip["itinerary"][0]["meals"]
    assert any("step-free" in a for a in trip["itinerary"][0]["activities"])
    assert trip["budget"]["warning"]
    assert sum(trip["budget"]["allocations"].values()) == p.budget
    assert trip["mode"] == "sample"
    followup = client.post("/api/ai/agent", headers=sid, json={"message": "What hotels would suit us there?"}).json()
    assert followup["destination"] == "Goa"
    assert followup["preferences_used"]["days"] == 3
    assert "vegan" in followup["answer"]
    assert not followup["itinerary"]
    assert len(client.get("/api/memory", headers=sid).json()["messages"]) == 4


def test_message_overrides_are_not_written_to_profile(client):
    sid = headers()
    trip = client.post("/api/ai/agent", headers=sid, json={"message": "Plan a 2-day trip from Delhi to Paris under INR 90000"}).json()
    assert trip["destination"] == "Paris"
    assert trip["preferences_used"]["origin"] == "Delhi"
    assert trip["preferences_used"]["budget"] == 90000
    assert client.get("/api/profile", headers=sid).json()["preferences"]["budget"] == 35000


def test_recommendations_change_with_interests(client):
    sid = headers()
    p = Preferences(interests=["beaches", "wellness"])
    client.put("/api/profile", headers=sid, json=p.model_dump(mode="json"))
    result = client.post("/api/ai/agent", headers=sid, json={"message": "Suggest destinations for my preferences"}).json()
    assert result["recommendations"][0]["destination"] == "Goa"
    assert result["recommendations"][0]["sample"]


def test_recommendations_prioritize_budget_before_interest_matches(client):
    sid = headers()
    p = Preferences(interests=["nature", "culture"], budget=35000)
    client.put("/api/profile", headers=sid, json=p.model_dump(mode="json"))
    result = client.post("/api/ai/agent", headers=sid, json={"message": "Suggest destinations"}).json()
    assert all(rec["estimated_ground_cost"] <= p.budget for rec in result["recommendations"])
    assert not any(rec["destination"] == "Japan" for rec in result["recommendations"])


def test_missing_destination_asks_before_research(client):
    result = client.post("/api/ai/agent", headers=headers(), json={"message": "Plan a trip"}).json()
    assert "Which destination" in result["answer"]
    assert not result["itinerary"]
    assert [step["agent"] for step in result["trace"]] == ["coordinator", "final"]


@pytest.mark.parametrize("message", ["", "   ", "x" * 4001])
def test_invalid_messages(client, message):
    assert client.post("/api/ai/agent", headers=headers(), json={"message": message}).status_code == 422


def test_invalid_preferences_and_dates(client):
    sid = headers()
    for change in ({"budget": -1}, {"interests": ["unknown"]}, {"return_date": "2026-11-01"}, {"departure_date": "2026-11-05", "return_date": "2026-11-01"}):
        assert client.put("/api/profile", headers=sid, json=Preferences().model_dump(mode="json") | change).status_code == 422


def test_clear_keeps_preferences_and_isolates_sessions(client):
    a, b = headers(), headers()
    client.put("/api/profile", headers=a, json=Preferences(dietary="vegan").model_dump(mode="json"))
    client.post("/api/ai/agent", headers=a, json={"message": "Plan a trip to Goa"})
    assert client.get("/api/memory", headers=b).json()["messages"] == []
    assert client.delete("/api/memory", headers=a).status_code == 200
    assert client.get("/api/memory", headers=a).json()["messages"] == []
    assert client.get("/api/profile", headers=a).json()["preferences"]["dietary"] == "vegan"


def test_service_key_and_session_validation(client, monkeypatch):
    assert client.get("/api/profile", headers={"X-Session-Id": "not-a-session"}).status_code == 400
    monkeypatch.setenv("BACKEND_SERVICE_KEY", "test-service-key")
    assert client.get("/api/profile", headers=headers()).status_code == 401
    assert client.get("/api/profile", headers=headers() | {"X-Service-Key": "test-service-key"}).status_code == 200


def test_ai_failure_falls_back_without_exposing_credentials(client):
    agent = client.app.state.agent
    agent.providers.capabilities["ai"] = True
    async def failing(*args, **kwargs):
        raise RuntimeError("secret-key-test")
    agent.providers.llm = failing
    response = client.post("/api/ai/agent", headers=headers(), json={"message": "Plan a trip to Goa"})
    assert response.status_code == 200
    assert response.json()["mode"] == "sample"
    assert "secret-key-test" not in response.text


def test_mocked_ai_coordinator_and_synthesis(client):
    agent = client.app.state.agent
    agent.providers.capabilities["ai"] = True
    async def mock_llm(messages, json_mode=False):
        if json_mode:
            if "itinerary specialist" in messages[0]["content"]:
                return {"days": [{"day": n, "title": f"Udaipur day {n}", "activities": ["Explore the lakeside"], "meals": "Local food with dietary checks"} for n in (1, 2)]}
            return {"destination": "Udaipur", "task": "plan", "days": 2, "budget": 40000}
        assert "preferences" in messages[-1]["content"]
        return "Your personalised two-day Udaipur plan."
    agent.providers.llm = mock_llm
    result = client.post("/api/ai/agent", headers=headers(), json={"message": "Find a calm city break"}).json()
    assert result["mode"] == "ai"
    assert result["destination"] == "Udaipur"
    assert len(result["itinerary"]) == 2
    assert result["itinerary"][0]["title"] == "Udaipur day 1"


def test_new_saved_preferences_override_previous_turn_memory(client):
    sid = headers()
    client.post("/api/ai/agent", headers=sid, json={"message": "Plan a 3-day trip to Goa under INR 90000"})
    client.put("/api/profile", headers=sid, json=Preferences(budget=20000, dietary="halal", days=7).model_dump(mode="json"))
    result = client.post("/api/ai/agent", headers=sid, json={"message": "What hotels would suit me there?"}).json()
    assert result["preferences_used"]["budget"] == 20000
    assert result["preferences_used"]["days"] == 7
    assert result["preferences_used"]["dietary"] == "halal"


def test_provider_http_failure_and_live_weather(monkeypatch):
    monkeypatch.setenv("OPENWEATHER_API_KEY", "dummy")
    provider = Providers()
    real_client = httpx.AsyncClient
    def handler(request):
        return httpx.Response(200, json={"name": "Goa", "main": {"temp": 28}, "weather": [{"description": "clear sky"}], "dt": 123})
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    result = asyncio.run(provider.weather("Goa"))
    assert result["temperature_c"] == 28
    assert result["status"] == "live"
    def failure(request):
        return httpx.Response(401)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(failure), **kwargs))
    assert asyncio.run(provider.weather("Goa"))["status"] == "unavailable"


def test_database_path_is_independent_of_cwd(monkeypatch, tmp_path):
    from backend.config import BASE_DIR, database_path
    monkeypatch.setenv("DATABASE_PATH", "data/test.sqlite3")
    monkeypatch.chdir(tmp_path)
    assert database_path() == BASE_DIR / "data/test.sqlite3"


def test_mcp_http_tool_discovery_and_weather(client):
    accept = {"Accept": "application/json, text/event-stream", "Host": "127.0.0.1:8000"}
    with client:
        initialized = client.post("/mcp/", headers=accept, json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "vacanes-test", "version": "1"}}})
        assert initialized.status_code == 200
        tools = client.post("/mcp/", headers=accept, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}).json()
        assert {tool["name"] for tool in tools["result"]["tools"]} == {"search_hotels", "search_transport", "current_weather"}
        weather = client.post("/mcp/", headers=accept, json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "current_weather", "arguments": {"destination": "Goa"}}})
        assert weather.status_code == 200
        assert "unconfigured" in weather.text

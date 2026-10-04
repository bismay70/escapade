"""Tests must never use credentials from a developer's local .env file."""
import pytest


@pytest.fixture(autouse=True)
def isolate_provider_credentials(monkeypatch):
    for name in (
        "GROQ_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY", "TAVILY_MCP_URL",
        "OPENWEATHER_API_KEY", "AVIATIONSTACK_API_KEY", "BACKEND_SERVICE_KEY",
        "AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET", "FIREBASE_PROJECT_ID",
        "FIREBASE_SERVICE_ACCOUNT_PATH", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
        "AMADEUS_ENABLE_RESERVATIONS", "AMADEUS_ENABLE_LIVE_RESERVATIONS",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("AMADEUS_ENV", "test")

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def database_path() -> Path:
    path = Path(os.getenv("DATABASE_PATH", "data/vacanes.sqlite3"))
    return path if path.is_absolute() else BASE_DIR / path


def capabilities() -> dict:
    provider = os.getenv("LLM_PROVIDER", "groq")
    key_name = "OPENAI_API_KEY" if provider == "openai" else "GROQ_API_KEY"
    return {
        "ai": bool(os.getenv(key_name)),
        "provider": provider,
        "search": bool(os.getenv("TAVILY_API_KEY") or os.getenv("TAVILY_MCP_URL")),
        "weather": bool(os.getenv("OPENWEATHER_API_KEY")),
        "flight_status": bool(os.getenv("AVIATIONSTACK_API_KEY")),
        "inventory": bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET")),
        "inventory_sandbox": os.getenv("AMADEUS_ENV", "test") != "production",
        "authentication": bool(os.getenv("FIREBASE_PROJECT_ID") and os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")),
        "auth": bool(os.getenv("FIREBASE_PROJECT_ID") and os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")),
        "flights": bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET")),
        "hotels": bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET")),
        "bookings": bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET")),
        "reservations": os.getenv("AMADEUS_ENABLE_RESERVATIONS", "false").lower() == "true",
        "payments": bool(os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_WEBHOOK_SECRET")),
        "live_payments": False,
    }

"""Optional MCP stdio server, using the exact same tools as FastAPI.

Run: backend/.venv/Scripts/python.exe -m backend.mcp_server
"""
from mcp.server.fastmcp import FastMCP

from backend.models import Preferences
from backend.providers import Providers
from backend.tools import build_tools

mcp = FastMCP("Vacanes travel research", stateless_http=True, streamable_http_path="/", json_response=True)
tools = build_tools(Providers())


@mcp.tool()
async def search_hotels(destination: str, preferences: dict) -> dict:
    """Research stays aligned with preferences; returns sources, not bookings."""
    p = Preferences.model_validate(preferences)
    return await tools["hotels"].ainvoke({"destination": destination, "preferences": p.model_dump(mode="json")})


@mcp.tool()
async def search_transport(origin: str, destination: str, preferences: dict) -> dict:
    """Research routes without claiming bookable fares."""
    p = Preferences.model_validate(preferences)
    return await tools["flights"].ainvoke({"origin": origin, "destination": destination, "preferences": p.model_dump(mode="json")})


@mcp.tool()
async def current_weather(destination: str) -> dict:
    """Get current weather, not future travel forecasts."""
    return await tools["weather"].ainvoke({"destination": destination})


if __name__ == "__main__":
    mcp.run(transport="stdio")

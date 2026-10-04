"""LangChain tools shared by the graph and optional local MCP server."""
from langchain_core.tools import tool

from backend.models import Preferences
from backend.providers import Providers


def build_tools(providers: Providers):
    @tool
    async def search_hotels(destination: str, preferences: dict) -> dict:
        """Research hotels aligned with preferences; never claim confirmed availability."""
        p = Preferences.model_validate(preferences)
        return await providers.hotels(destination, p)

    @tool
    async def search_transport(origin: str, destination: str, preferences: dict) -> dict:
        """Research transport routes; results are guidance, not live ticket prices."""
        return await providers.flights(origin, destination, Preferences.model_validate(preferences))

    @tool
    async def current_weather(destination: str) -> dict:
        """Get current weather, explicitly distinguished from a future trip forecast."""
        return await providers.weather(destination)

    @tool
    async def research_activities(destination: str, preferences: dict) -> dict:
        """Research activities using interests, diet, pace and accessibility constraints."""
        p = Preferences.model_validate(preferences)
        return await providers.search(f"{destination} {', '.join(p.interests)} activities {p.travel_style} {p.pace} trip {p.dietary} restaurants {'step-free accessible attractions' if p.accessibility else ''}")

    return {"hotels": search_hotels, "flights": search_transport, "weather": current_weather, "activities": research_activities}

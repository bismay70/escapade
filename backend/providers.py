import asyncio
import json
import os
from urllib.parse import urlparse

import httpx

from backend.config import capabilities
from backend.mcp_client import tavily_mcp_search
from backend.travel_provider import AmadeusProvider, CommerceError, public_offer


def safe_url(url):
    return url if isinstance(url, str) and urlparse(url).scheme in ("http", "https") else ""


class Providers:
    def __init__(self):
        self.capabilities = capabilities()
        self.inventory = AmadeusProvider()

    async def llm(self, messages, json_mode=False):
        provider = self.capabilities["provider"]
        key = os.getenv("OPENAI_API_KEY" if provider == "openai" else "GROQ_API_KEY", "")
        if not key:
            return None
        url = "https://api.openai.com/v1/chat/completions" if provider == "openai" else "https://api.groq.com/openai/v1/chat/completions"
        model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini") if provider == "openai" else os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        body = {"model": model, "messages": messages, "temperature": 0.3, "max_tokens": 2200}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, headers={"Authorization": f"Bearer {key}"}, json=body)
            response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content) if json_mode else content

    async def search(self, query):
        if not self.capabilities["search"]:
            return {"status": "unconfigured", "items": [], "notice": "Live web search is not configured."}
        try:
            if os.getenv("TAVILY_MCP_URL"):
                raw = await asyncio.wait_for(tavily_mcp_search(query), timeout=25)
                if isinstance(raw, str):
                    raw = json.loads(raw)
                if isinstance(raw, list):
                    raw = json.loads("".join(b.get("text", "") for b in raw if isinstance(b, dict)))
                data = raw.get("structuredContent", raw)
            else:
                async with httpx.AsyncClient(timeout=18) as client:
                    response = await client.post("https://api.tavily.com/search", headers={"Authorization": f"Bearer {os.environ['TAVILY_API_KEY']}"}, json={"query": query, "max_results": 4, "search_depth": "basic"})
                    response.raise_for_status()
                    data = response.json()
            items = [{"title": item.get("title", "Source"), "url": safe_url(item.get("url")), "content": item.get("content", "")[:1600]} for item in data.get("results", [])]
            return {"status": "live", "items": items, "notice": "Web research, not verified availability or bookable prices."}
        except Exception:
            return {"status": "unavailable", "items": [], "notice": "Search provider could not respond. No live results are available."}

    async def weather(self, city):
        if not self.capabilities["weather"]:
            return {"status": "unconfigured", "notice": "Current weather needs OPENWEATHER_API_KEY; check conditions before travel."}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get("https://api.openweathermap.org/data/2.5/weather", params={"q": city, "appid": os.environ["OPENWEATHER_API_KEY"], "units": "metric"})
                response.raise_for_status()
                data = response.json()
            return {"status": "live", "city": data["name"], "temperature_c": data["main"]["temp"], "description": data["weather"][0]["description"], "observed_at": data["dt"], "notice": "Current observation, not a forecast for future dates."}
        except Exception:
            return {"status": "unavailable", "notice": "Current weather could not be retrieved for this location."}

    async def flights(self, origin, destination, p):
        if self.inventory.configured and p.transport in ("any", "flight"):
            try:
                merged = p.model_copy(update={"origin": origin, "destination": destination})
                offers = await self.inventory.search_flights(merged)
                return {"status": "sandbox" if self.inventory.sandbox else "live", "source": "amadeus", "sandbox": self.inventory.sandbox, "offers": [public_offer(row) for row in offers], "items": [], "notice": "Amadeus test flight offers. No real tickets or reservations." if self.inventory.sandbox else "Provider flight offers. Reprice and explicitly confirm in Bookings; the assistant cannot reserve or charge."}
            except (CommerceError, httpx.HTTPError, KeyError, ValueError) as error:
                return {"status": "unavailable", "offers": [], "items": [], "notice": error.detail if isinstance(error, CommerceError) else "Flight inventory is unavailable. Check your route, dates and Amadeus credentials."}
        research = await self.search(f"Travel from {origin or 'departure city'} to {destination} by {p.transport}, {p.departure_date or 'flexible dates'}, {p.travelers} travelers. Transport routes and official airline or train websites")
        research["fare_notice"] = "No live fares, ticket inventory, or booking confirmation. AviationStack supplies flight status only."
        key = os.getenv("AVIATIONSTACK_API_KEY")
        if key and p.transport in ("any", "flight") and len(origin) == 3 and len(destination) == 3 and origin.isalpha() and destination.isalpha():
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    response = await client.get("https://api.aviationstack.com/v1/flights", params={"access_key": key, "dep_iata": origin.upper(), "arr_iata": destination.upper(), "limit": 5})
                    response.raise_for_status()
                    data = response.json()
                research["flight_status"] = [{"airline": i.get("airline", {}).get("name"), "flight": i.get("flight", {}).get("iata"), "status": i.get("flight_status")} for i in data.get("data", [])]
            except Exception:
                research["status_notice"] = "Flight status provider could not respond."
        return research

    async def hotels(self, destination, p):
        if self.inventory.configured:
            try:
                offers = await self.inventory.search_hotels(p.model_copy(update={"destination": destination}))
                return {"status": "sandbox" if self.inventory.sandbox else "live", "source": "amadeus", "sandbox": self.inventory.sandbox, "offers": [public_offer(row) for row in offers], "items": [], "notice": "Amadeus test hotel offers. Dietary/accessibility requirements still need supplier confirmation." if self.inventory.sandbox else "Provider hotel offers. Reprice in Bookings; guest requirements still need supplier confirmation."}
            except (CommerceError, httpx.HTTPError, KeyError, ValueError) as error:
                return {"status": "unavailable", "offers": [], "items": [], "notice": error.detail if isinstance(error, CommerceError) else "Hotel inventory is unavailable. Check dates and Amadeus credentials."}
        nightly = int(p.budget * 0.35 / max(1, p.days - 1))
        return await self.search(f"{destination} {p.hotel_type} hotels {p.travel_style} {p.travelers} guests around INR {nightly} total per night {'step-free accessible' if p.accessibility else ''} {p.dietary} food {p.departure_date or ''} {p.return_date or ''}")

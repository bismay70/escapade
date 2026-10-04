"""Amadeus inventory adapter. Provider payloads stay on the server for repricing."""
import asyncio
import os
import re
import time
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

import httpx


class CommerceError(Exception):
    def __init__(self, status, detail):
        self.status, self.detail = status, detail
        super().__init__(detail)


def public_offer(offer):
    return {key: value for key, value in offer.items() if not key.startswith("_")}


class AmadeusProvider:
    def __init__(self):
        self._token = ""
        self._expiry = 0
        self._token_lock = asyncio.Lock()

    @property
    def configured(self):
        return bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET"))

    @property
    def sandbox(self):
        return os.getenv("AMADEUS_ENV", "test") != "production"

    @property
    def base_url(self):
        return "https://test.api.amadeus.com" if self.sandbox else "https://api.amadeus.com"

    async def token(self):
        if not self.configured:
            raise CommerceError(503, "Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to backend/.env for flight and hotel inventory.")
        async with self._token_lock:
            if self._token and time.monotonic() < self._expiry:
                return self._token
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    response = await client.post(self.base_url + "/v1/security/oauth2/token", data={
                        "grant_type": "client_credentials", "client_id": os.environ["AMADEUS_CLIENT_ID"],
                        "client_secret": os.environ["AMADEUS_CLIENT_SECRET"],
                    })
                    if response.status_code != 200:
                        raise CommerceError(503, "Amadeus authentication failed. Check credentials and AMADEUS_ENV.")
                    data = response.json()
                self._token = data["access_token"]
                self._expiry = time.monotonic() + max(0, int(data.get("expires_in", 0)) - 30)
            except (httpx.HTTPError, KeyError, TypeError, ValueError):
                raise CommerceError(503, "Amadeus authentication is unavailable. Check credentials, environment and connectivity.") from None
            return self._token

    async def request(self, method, path, *, params=None, body=None):
        token = await self.token()
        try:
            async with httpx.AsyncClient(timeout=25) as client:
                headers = {"Authorization": "Bearer " + token}
                if path == "/v1/shopping/flight-offers/pricing":
                    headers["X-HTTP-Method-Override"] = "GET"
                response = await client.request(method, self.base_url + path, headers=headers, params=params, json=body)
        except httpx.HTTPError:
            raise CommerceError(503, "Amadeus response is unavailable. Check connectivity and provider access.") from None
        if response.status_code == 401:
            self._token = ""
        if not response.is_success:
            status = 422 if response.status_code in (400, 404, 409, 422) else 503
            raise CommerceError(status, "Amadeus could not complete this request. Check travel dates, route and provider access; search again if the offer expired.")
        try:
            return response.json()
        except ValueError:
            raise CommerceError(502, "Amadeus returned an invalid response. Please search again.") from None

    async def location_code(self, text):
        text = text.strip()
        if re.fullmatch(r"[A-Za-z]{3}", text):
            return text.upper()
        if not text:
            raise CommerceError(422, "Choose an origin and destination city or IATA code.")
        data = await self.request("GET", "/v1/reference-data/locations", params={"subType": "CITY,AIRPORT", "keyword": text, "page[limit]": 10})
        rows = data.get("data", [])
        cities = [row for row in rows if row.get("subType") == "CITY" and row.get("iataCode")]
        usable = cities or [row for row in rows if row.get("iataCode")]
        # Never silently select between multiple cities from an ambiguous text search.
        exact = [row for row in usable if text.casefold() in (str(row.get("name", "")).casefold(), str(row.get("address", {}).get("cityName", "")).casefold())]
        if len(exact) == 1:
            return exact[0]["iataCode"]
        if len(usable) == 1:
            return usable[0]["iataCode"]
        raise CommerceError(422, "This city is missing or ambiguous in Amadeus. Enter a three-letter IATA city/airport code such as DEL, BOM or PAR.")

    @staticmethod
    def price(raw):
        try:
            amount = Decimal(str(raw.get("grandTotal") or raw["total"]))
            currency = raw["currency"]
            if not amount.is_finite() or amount <= 0 or not re.fullmatch(r"[A-Z]{3}", currency):
                raise ValueError
            return {"amount": str(amount), "currency": currency}
        except (KeyError, InvalidOperation, TypeError, ValueError):
            raise CommerceError(502, "The provider returned an invalid price. Please search again.")

    def flight_offer(self, raw, dictionaries=None):
        carriers = (dictionaries or {}).get("carriers", {})
        codes = raw.get("validatingAirlineCodes", [])
        journeys = []
        for itinerary in raw.get("itineraries", []):
            segments = itinerary.get("segments", [])
            journeys.append({"duration": itinerary.get("duration"), "stops": max(0, len(segments) - 1), "segments": [
                {"departure": segment.get("departure", {}), "arrival": segment.get("arrival", {}), "airline": carriers.get(segment.get("carrierCode"), segment.get("carrierCode")), "flight_number": str(segment.get("carrierCode", "")) + str(segment.get("number", ""))}
                for segment in segments
            ]})
        return {"kind": "flight", "title": " / ".join(carriers.get(code, code) for code in codes) or "Flight offer", "price": self.price(raw.get("price", {})),
                "details": {"journeys": journeys, "travelers": len(raw.get("travelerPricings", [])), "traveler_ids": [row.get("travelerId") for row in raw.get("travelerPricings", [])], "last_ticketing_date": raw.get("lastTicketingDate"), "fare_rules": raw.get("pricingOptions", {}), "traveler_fares": [{"traveler_id": row.get("travelerId"), "fare_option": row.get("fareOption"), "segments": row.get("fareDetailsBySegment", [])} for row in raw.get("travelerPricings", [])]},
                "source": "amadeus", "sandbox": self.sandbox, "_raw": raw}

    def hotel_offer(self, hotel, raw):
        return {"kind": "hotel", "title": hotel.get("name", "Hotel offer"), "price": self.price(raw.get("price", {})),
                "details": {"hotel_id": hotel.get("hotelId"), "check_in": raw.get("checkInDate"), "check_out": raw.get("checkOutDate"), "guests": raw.get("guests", {}), "room": raw.get("room", {}), "policies": raw.get("policies", {}), "board_type": raw.get("boardType"), "room_quantity": raw.get("roomQuantity", 1)},
                "source": "amadeus", "sandbox": self.sandbox, "_raw": {"hotel": hotel, "offer": raw}}

    async def search_flights(self, p):
        if not p.departure_date:
            raise CommerceError(422, "Choose a departure date to search flight offers.")
        if p.travelers > 9:
            raise CommerceError(422, "Amadeus flight search supports up to nine seated travelers per request.")
        if p.departure_date < date.today():
            raise CommerceError(422, "Choose a future departure date.")
        origin, destination = await asyncio.gather(self.location_code(p.origin), self.location_code(p.destination))
        params = {"originLocationCode": origin, "destinationLocationCode": destination, "departureDate": str(p.departure_date), "adults": p.travelers, "currencyCode": "INR", "max": 8, "maxPrice": max(1, p.budget // p.travelers)}
        if p.return_date:
            params["returnDate"] = str(p.return_date)
        data = await self.request("GET", "/v2/shopping/flight-offers", params=params)
        return [self.flight_offer(row, data.get("dictionaries")) for row in data.get("data", [])]

    async def search_hotels(self, p):
        if not p.departure_date:
            raise CommerceError(422, "Choose check-in and check-out dates to search hotels.")
        check_out = p.return_date or p.departure_date + timedelta(days=max(1, p.days - 1))
        if check_out <= p.departure_date or p.departure_date < date.today():
            raise CommerceError(422, "Choose future hotel dates with check-out after check-in.")
        if p.travelers > 9:
            raise CommerceError(422, "Use up to nine adult guests in this hotel search.")
        city = await self.location_code(p.destination)
        listing = await self.request("GET", "/v1/reference-data/locations/hotels/by-city", params={"cityCode": city, "radius": 15, "radiusUnit": "KM", "hotelSource": "ALL"})
        ids = [row["hotelId"] for row in listing.get("data", []) if row.get("hotelId")][:15]
        if not ids:
            return []
        data = await self.request("GET", "/v3/shopping/hotel-offers", params={"hotelIds": ",".join(ids), "adults": p.travelers, "roomQuantity": 1, "checkInDate": str(p.departure_date), "checkOutDate": str(check_out), "currency": "INR", "bestRateOnly": "true"})
        offers = []
        for row in data.get("data", []):
            if row.get("available") is False:
                continue
            for raw in row.get("offers", []):
                offer = self.hotel_offer(row.get("hotel", {}), raw)
                offer["details"]["preferences_to_confirm"] = {"dietary": p.dietary, "accessibility": p.accessibility, "hotel_type": p.hotel_type}
                # Guest needs are requests; provider search does not verify them.
                if offer["price"]["currency"] != "INR" or Decimal(offer["price"]["amount"]) <= p.budget:
                    offers.append(offer)
        return offers[:8]

    async def reprice(self, offer):
        if offer["sandbox"] != self.sandbox:
            raise CommerceError(409, "Provider environment changed. Search again before continuing.")
        if offer["kind"] == "flight":
            data = await self.request("POST", "/v1/shopping/flight-offers/pricing", params={"forceClass": "true"}, body={"data": {"type": "flight-offers-pricing", "flightOffers": [offer["_raw"]]}})
            rows = data.get("data", {}).get("flightOffers", [])
            if not rows:
                raise CommerceError(409, "This flight offer is no longer available. Search again.")
            return self.flight_offer(rows[0], data.get("dictionaries"))
        raw_id = offer["_raw"]["offer"]["id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", raw_id):
            raise CommerceError(502, "The hotel offer identifier is invalid.")
        data = await self.request("GET", "/v3/shopping/hotel-offers/" + raw_id)
        row = data.get("data", {})
        if not row.get("offers") or row.get("available") is False:
            raise CommerceError(409, "This hotel offer is no longer available. Search again.")
        return self.hotel_offer(row.get("hotel", offer["_raw"]["hotel"]), row["offers"][0])

    async def reserve_flight(self, offer, travelers):
        body = {"data": {"type": "flight-order", "flightOffers": [offer["_raw"]], "travelers": [{
            "id": traveler.id, "dateOfBirth": str(traveler.date_of_birth), "name": {"firstName": traveler.first_name, "lastName": traveler.last_name},
            "contact": {"emailAddress": traveler.email, "phones": [{"deviceType": "MOBILE", "countryCallingCode": traveler.country_code, "number": traveler.phone}]},
        } for traveler in travelers], "ticketingAgreement": {"option": "DELAY_TO_CANCEL", "delay": "1"}}}
        # No automatic retries: a lost response may still have created an order.
        data = await self.request("POST", "/v1/booking/flight-orders", body=body)
        order = data.get("data", {})
        if not order.get("id"):
            raise CommerceError(502, "The provider response did not include a reservation identifier. Manual reconciliation is required.")
        return {"id": order["id"], "references": order.get("associatedRecords", []), "ticketing_agreement": order.get("ticketingAgreement", {})}

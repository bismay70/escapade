import asyncio
import copy
import hashlib
import hmac
import json
import time
from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from backend import auth
from backend.app import create_app
from backend.commerce import CommerceService
from backend.models import Preferences
from backend.storage import Store
from backend.travel_provider import AmadeusProvider, CommerceError


DEPARTURE = str(date.today() + timedelta(days=40))
RETURN = str(date.today() + timedelta(days=44))
RAW_FLIGHT = {"type": "flight-offer", "id": "1", "source": "GDS", "price": {"currency": "INR", "total": "6500.00"}, "validatingAirlineCodes": ["AI"], "travelerPricings": [{"travelerId": "1", "travelerType": "ADULT"}], "itineraries": [{"duration": "PT2H", "segments": [{"departure": {"iataCode": "DEL", "at": DEPARTURE + "T08:00:00"}, "arrival": {"iataCode": "BOM", "at": DEPARTURE + "T10:00:00"}, "carrierCode": "AI", "number": "101"}]}]}
RAW_HOTEL = {"id": "HOTEL01", "checkInDate": DEPARTURE, "checkOutDate": RETURN, "price": {"currency": "INR", "total": "12000.00"}, "guests": {"adults": 1}, "room": {"description": {"text": "Double room"}}, "policies": {"paymentType": "GUARANTEE"}}


class FakeProvider:
    configured = True
    sandbox = True

    def __init__(self):
        self.reprices = 0
        self.reservations = 0
        self.fail_reserve = False
        self.changed_price = False
        self.adapter = AmadeusProvider()

    async def search_flights(self, p):
        return [self.adapter.flight_offer(copy.deepcopy(RAW_FLIGHT), {"carriers": {"AI": "Air India"}})]

    async def search_hotels(self, p):
        return [self.adapter.hotel_offer({"hotelId": "HOTEL001", "name": "Provider Hotel"}, copy.deepcopy(RAW_HOTEL))]

    async def reprice(self, offer):
        self.reprices += 1
        fresh = {key: value for key, value in copy.deepcopy(offer).items() if key not in ("offer_id", "status", "expires_at")}
        if self.changed_price:
            fresh["price"]["amount"] = "7000.00"
        return fresh

    async def reserve_flight(self, offer, travelers):
        self.reservations += 1
        if self.fail_reserve:
            raise httpx.ReadTimeout("a response may have been lost")
        return {"id": "test-order-1", "references": [{"reference": "TESTPNR"}]}


@pytest.fixture
def commerce_client(tmp_path, monkeypatch):
    for key in ("BACKEND_SERVICE_KEY", "AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET", "AMADEUS_ENABLE_RESERVATIONS", "AMADEUS_ENABLE_LIVE_RESERVATIONS", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "GROQ_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY", "TAVILY_MCP_URL", "OPENWEATHER_API_KEY", "AVIATIONSTACK_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("AMADEUS_ENV", "test")
    monkeypatch.setattr(auth, "verify_session", lambda value: {"uid": value, "email": "test@example.com", "name": "Traveler"} if value in ("alice", "bob") else None)
    store = Store(tmp_path / "commerce.sqlite3")
    provider = FakeProvider()
    app = create_app(store=store, commerce=CommerceService(store, provider))
    return TestClient(app)


def identity(user="alice"):
    return {"X-Auth-Session": user, "X-Session-Id": str(uuid4())}


def preferences():
    return Preferences(origin="DEL", destination="BOM", departure_date=DEPARTURE, return_date=RETURN).model_dump(mode="json")


def searched(client, kind="flights", user="alice"):
    result = client.post("/api/" + kind, headers=identity(user), json=preferences())
    assert result.status_code == 200, result.text
    return result.json()["offers"][0]


def quoted(client, kind="flights", user="alice"):
    offer = searched(client, kind, user)
    result = client.post("/api/bookings/quote", headers=identity(user), json={"offer_id": offer["offer_id"]})
    assert result.status_code == 200, result.text
    return result.json()["offer"]


def drafted(client, kind="flights", user="alice"):
    offer = quoted(client, kind, user)
    result = client.post("/api/bookings/drafts", headers=identity(user), json={"offer_id": offer["offer_id"], "confirmed": True, "idempotency_key": str(uuid4())})
    assert result.status_code == 200, result.text
    return result.json()["booking"]


def traveler():
    return {"confirmed": True, "travelers": [{"id": "1", "date_of_birth": "1995-03-05", "first_name": "Test", "last_name": "Traveler", "email": "test@example.com", "phone": "9876543210", "country_code": "91"}]}


def checkout_body():
    return {"confirmed": True, "success_url": "http://localhost:3000/bookings?checkout=success", "cancel_url": "http://localhost:3000/bookings?checkout=cancelled"}


def stripe_mock(monkeypatch, handler=None):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_placeholder")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
    real_client = httpx.AsyncClient
    calls = []
    def respond(request):
        calls.append(request)
        if handler:
            return handler(request)
        return httpx.Response(200, json={"id": "cs_test_1", "url": "https://checkout.stripe.com/c/pay/test_session"})
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(respond), **kwargs))
    return calls


def signed_event(booking, *, event_id="evt_1", amount=650000, event_type="checkout.session.completed", paid="paid", timestamp=None):
    payload = json.dumps({"id": event_id, "type": event_type, "livemode": False, "data": {"object": {"id": "cs_test_1", "client_reference_id": booking["id"], "metadata": {"booking_id": booking["id"]}, "amount_total": amount, "currency": "inr", "payment_status": paid, "payment_intent": "pi_test_1"}}}, separators=(",", ":")).encode()
    stamp = timestamp or int(time.time())
    digest = hmac.new(b"whsec_placeholder", str(stamp).encode() + b"." + payload, hashlib.sha256).hexdigest()
    return payload, {"Stripe-Signature": f"t={stamp},v1={digest}", "Content-Type": "application/json"}


def test_verified_user_profile_ignores_client_uuid_and_rejects_bad_cookie(commerce_client):
    client = commerce_client
    client.put("/api/profile", headers=identity(), json=Preferences(dietary="vegan").model_dump(mode="json"))
    assert client.get("/api/profile", headers=identity()).json()["preferences"]["dietary"] == "vegan"
    assert client.get("/api/profile", headers=identity("bob")).json()["preferences"]["dietary"] == "any"
    assert client.get("/api/auth/me", headers=identity()).json()["user"]["uid"] == "alice"
    assert client.get("/api/auth/me").json() == {"authenticated": False, "user": None}
    assert client.get("/api/profile", headers=identity("forged")).status_code == 401


def test_auth_exchange_contract_is_server_verified(commerce_client, monkeypatch):
    monkeypatch.setattr(auth, "exchange_id_token", lambda token: {"session_cookie": "signed", "expires_in": 432000, "user": {"uid": "alice"}})
    result = commerce_client.post("/api/auth/session", json={"id_token": "x" * 30})
    assert result.status_code == 200
    assert result.json()["session_cookie"] == "signed"
    assert commerce_client.post("/api/auth/session", json={"uid": "forged"}).status_code == 422


@pytest.mark.parametrize("kind", ["flights", "hotels"])
def test_owned_provider_offers_and_reprice_snapshots(commerce_client, kind):
    client = commerce_client
    offer = searched(client, kind)
    assert offer["status"] == "searched" and offer["sandbox"]
    assert "_raw" not in offer and offer["source"] == "amadeus"
    assert client.post("/api/bookings/quote", headers=identity("bob"), json={"offer_id": offer["offer_id"]}).status_code == 404
    quote = client.post("/api/bookings/quote", headers=identity(), json={"offer_id": offer["offer_id"]}).json()["offer"]
    assert quote["status"] == "quoted" and quote["offer_id"] != offer["offer_id"]
    assert quote["price"] == offer["price"]


def test_draft_confirmation_and_idempotency(commerce_client):
    client = commerce_client
    search = searched(client)
    body = {"offer_id": search["offer_id"], "confirmed": True, "idempotency_key": "retry-key-123"}
    assert client.post("/api/bookings/drafts", headers=identity(), json=body).status_code == 409
    body["offer_id"] = quoted(client)["offer_id"]
    assert client.post("/api/bookings/drafts", headers=identity(), json=body | {"confirmed": False}).status_code == 422
    assert client.post("/api/bookings/drafts", headers=identity(), json=body | {"price": 1}).status_code == 422
    first = client.post("/api/bookings/drafts", headers=identity(), json=body).json()["booking"]
    second = client.post("/api/bookings/drafts", headers=identity(), json=body).json()["booking"]
    assert first["id"] == second["id"]
    assert first["payment_status"] == "unpaid" and first["provider_status"] == "not_reserved" and first["ticket_status"] == "not_issued"
    assert "_raw" not in first["offer"] and "_idempotency_key" not in first
    body["offer_id"] = quoted(client)["offer_id"]
    assert client.post("/api/bookings/drafts", headers=identity(), json=body).status_code == 409
    assert len(client.get("/api/bookings", headers=identity()).json()["bookings"]) == 1
    assert client.get("/api/bookings/" + first["id"], headers=identity("bob")).status_code == 404


def test_quote_expiry_requires_new_search(commerce_client):
    offer = searched(commerce_client)
    with commerce_client.app.state.store.connect() as conn:
        conn.execute("UPDATE offers SET expires_at=0 WHERE id=?", (offer["offer_id"],))
    assert commerce_client.post("/api/bookings/quote", headers=identity(), json={"offer_id": offer["offer_id"]}).status_code == 409


def test_unconfigured_search_has_no_fake_inventory(commerce_client):
    commerce_client.app.state.commerce.provider.configured = False
    response = commerce_client.post("/api/flights", headers=identity(), json=preferences()).json()
    assert response["status"] == "unconfigured" and response["offers"] == []


def test_booking_mutations_require_auth_and_confirmation(commerce_client):
    booking = drafted(commerce_client)
    for path, body in (("reserve", traveler()), ("checkout", checkout_body())):
        endpoint = f"/api/bookings/{booking['id']}/{path}"
        assert commerce_client.post(endpoint, headers={"X-Session-Id": str(uuid4())}, json=body).status_code == 401
        assert commerce_client.post(endpoint, headers=identity(), json=body | {"confirmed": False}).status_code == 422
    assert commerce_client.post(f"/api/bookings/{booking['id']}/reserve", headers=identity(), json=traveler()).status_code == 503


def test_reservation_once_and_never_claims_ticket(commerce_client, monkeypatch):
    monkeypatch.setenv("AMADEUS_ENABLE_RESERVATIONS", "true")
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/reserve"
    first = commerce_client.post(url, headers=identity(), json=traveler()).json()["booking"]
    assert first["provider_status"] == "reserved" and first["ticket_status"] == "not_issued" and first["payment_status"] == "unpaid"
    second = commerce_client.post(url, headers=identity(), json=traveler()).json()["booking"]
    assert second["provider_reference"]["id"] == "test-order-1"
    assert commerce_client.app.state.commerce.provider.reservations == 1


def test_lost_reservation_response_preserves_uncertainty_and_blocks_retry(commerce_client, monkeypatch):
    monkeypatch.setenv("AMADEUS_ENABLE_RESERVATIONS", "true")
    provider = commerce_client.app.state.commerce.provider
    provider.fail_reserve = True
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/reserve"
    for _ in range(2):
        result = commerce_client.post(url, headers=identity(), json=traveler()).json()["booking"]
        assert result["provider_status"] == "unknown" and result["ticket_status"] == "not_issued"
    assert provider.reservations == 1


def test_changed_reservation_price_needs_new_confirmation(commerce_client, monkeypatch):
    monkeypatch.setenv("AMADEUS_ENABLE_RESERVATIONS", "true")
    booking = drafted(commerce_client)
    commerce_client.app.state.commerce.provider.changed_price = True
    response = commerce_client.post(f"/api/bookings/{booking['id']}/reserve", headers=identity(), json=traveler())
    assert response.status_code == 409
    assert commerce_client.app.state.commerce.provider.reservations == 0


def test_traveler_ids_and_age_match_offer(commerce_client, monkeypatch):
    monkeypatch.setenv("AMADEUS_ENABLE_RESERVATIONS", "true")
    booking = drafted(commerce_client)
    body = traveler()
    body["travelers"][0]["id"] = "2"
    url = f"/api/bookings/{booking['id']}/reserve"
    assert commerce_client.post(url, headers=identity(), json=body).status_code == 422
    body = traveler()
    body["travelers"][0]["date_of_birth"] = str(date.today() - timedelta(days=365 * 8))
    assert commerce_client.post(url, headers=identity(), json=body).status_code == 422


def test_hotel_reservation_requires_tokenized_supplier_integration(commerce_client, monkeypatch):
    monkeypatch.setenv("AMADEUS_ENABLE_RESERVATIONS", "true")
    booking = drafted(commerce_client, "hotels")
    response = commerce_client.post(f"/api/bookings/{booking['id']}/reserve", headers=identity(), json=traveler())
    assert response.status_code == 503 and "raw card" in response.json()["detail"]


def test_stripe_checkout_uses_frozen_quote_and_idempotent_hosted_session(commerce_client, monkeypatch):
    calls = stripe_mock(monkeypatch)
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/checkout"
    for _ in range(2):
        response = commerce_client.post(url, headers=identity(), json=checkout_body())
        assert response.status_code == 200, response.text
        assert response.json()["checkout_url"].startswith("https://checkout.stripe.com/")
    assert len(calls) == 1
    assert calls[0].headers["Idempotency-Key"] == "vacanes-checkout-" + booking["id"]
    assert b"unit_amount%5D=650000" in calls[0].content
    assert "_checkout_parameters" not in response.text
    assert response.json()["booking"]["payment_status"] == "pending"


def test_checkout_rejects_external_return_origin(commerce_client, monkeypatch):
    calls = stripe_mock(monkeypatch)
    booking = drafted(commerce_client)
    body = checkout_body() | {"success_url": "https://attacker.example/paid"}
    assert commerce_client.post(f"/api/bookings/{booking['id']}/checkout", headers=identity(), json=body).status_code == 422
    assert calls == []


def test_live_charging_hard_disabled_without_fulfillment(commerce_client, monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_live_placeholder")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/checkout"
    assert commerce_client.post(url, headers=identity(), json=checkout_body()).status_code == 409
    commerce_client.app.state.store.change_booking("user:alice", booking["id"], lambda row: row.update(sandbox=False))
    assert commerce_client.post(url, headers=identity(), json=checkout_body()).status_code == 503


def test_checkout_network_retry_reuses_same_provider_idempotency_key(commerce_client, monkeypatch):
    def failure(request):
        raise httpx.ReadTimeout("network-secret")
    calls = stripe_mock(monkeypatch, failure)
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/checkout"
    for _ in range(2):
        response = commerce_client.post(url, headers=identity(), json=checkout_body())
        assert response.status_code == 503 and "network-secret" not in response.text
    assert len(calls) == 2 and calls[0].headers["Idempotency-Key"] == calls[1].headers["Idempotency-Key"]
    assert calls[0].content == calls[1].content


def test_signed_webhook_is_idempotent_and_payment_does_not_issue_ticket(commerce_client, monkeypatch):
    stripe_mock(monkeypatch)
    booking = drafted(commerce_client)
    commerce_client.post(f"/api/bookings/{booking['id']}/checkout", headers=identity(), json=checkout_body())
    payload, headers = signed_event(booking)
    assert commerce_client.post("/api/payments/webhook", content=payload, headers=headers).json()["duplicate"] is False
    assert commerce_client.post("/api/payments/webhook", content=payload, headers=headers).json()["duplicate"] is True
    record = commerce_client.get("/api/bookings/" + booking["id"], headers=identity()).json()["booking"]
    assert record["payment_status"] == "paid" and record["status"] == "paid_pending_fulfillment"
    assert record["provider_status"] == "not_reserved" and record["ticket_status"] == "not_issued"
    payload, headers = signed_event(booking, event_id="evt_failed_late", event_type="checkout.session.async_payment_failed", paid="unpaid")
    assert commerce_client.post("/api/payments/webhook", content=payload, headers=headers).status_code == 200
    assert commerce_client.get("/api/bookings/" + booking["id"], headers=identity()).json()["booking"]["payment_status"] == "paid"


def test_forged_stale_or_mismatched_webhooks_cannot_mark_paid(commerce_client, monkeypatch):
    stripe_mock(monkeypatch)
    booking = drafted(commerce_client)
    commerce_client.post(f"/api/bookings/{booking['id']}/checkout", headers=identity(), json=checkout_body())
    payload, headers = signed_event(booking)
    assert commerce_client.post("/api/payments/webhook", content=payload, headers={"Stripe-Signature": "forged"}).status_code == 400
    for options in ({"timestamp": int(time.time()) - 600}, {"amount": 1}):
        payload, headers = signed_event(booking, **options)
        assert commerce_client.post("/api/payments/webhook", content=payload, headers=headers).status_code == 400
    assert commerce_client.get("/api/bookings/" + booking["id"], headers=identity()).json()["booking"]["payment_status"] == "pending"


def test_expired_checkout_cannot_reuse_stale_url(commerce_client, monkeypatch):
    stripe_mock(monkeypatch)
    booking = drafted(commerce_client)
    url = f"/api/bookings/{booking['id']}/checkout"
    commerce_client.post(url, headers=identity(), json=checkout_body())
    payload, headers = signed_event(booking, event_type="checkout.session.expired", paid="unpaid")
    assert commerce_client.post("/api/payments/webhook", content=payload, headers=headers).status_code == 200
    assert commerce_client.post(url, headers=identity(), json=checkout_body()).status_code == 409


def test_real_adapter_oauth_search_reprice_and_hotel_normalization(monkeypatch):
    monkeypatch.setenv("AMADEUS_CLIENT_ID", "dummy-client")
    monkeypatch.setenv("AMADEUS_CLIENT_SECRET", "dummy-secret")
    monkeypatch.setenv("AMADEUS_ENV", "test")
    calls = []
    def handler(request):
        calls.append(request)
        assert request.url.host == "test.api.amadeus.com"
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "server-token", "expires_in": 1800})
        assert request.headers["Authorization"] == "Bearer server-token"
        if request.url.path == "/v2/shopping/flight-offers":
            assert request.url.params["originLocationCode"] == "DEL" and request.url.params["adults"] == "1"
            return httpx.Response(200, json={"data": [RAW_FLIGHT], "dictionaries": {"carriers": {"AI": "Air India"}}})
        if request.url.path == "/v1/shopping/flight-offers/pricing":
            assert request.headers["X-HTTP-Method-Override"] == "GET"
            assert json.loads(request.content)["data"]["flightOffers"][0]["id"] == "1"
            return httpx.Response(200, json={"data": {"flightOffers": [RAW_FLIGHT]}})
        if request.url.path == "/v1/reference-data/locations/hotels/by-city":
            return httpx.Response(200, json={"data": [{"hotelId": "HOTEL001"}]})
        if request.url.path in ("/v3/shopping/hotel-offers", "/v3/shopping/hotel-offers/HOTEL01"):
            data = {"available": True, "hotel": {"hotelId": "HOTEL001", "name": "Provider Hotel"}, "offers": [RAW_HOTEL]}
            return httpx.Response(200, json={"data": [data] if request.url.path.endswith("hotel-offers") else data})
        if request.url.path == "/v1/booking/flight-orders":
            assert json.loads(request.content)["data"]["ticketingAgreement"]["option"] == "DELAY_TO_CANCEL"
            return httpx.Response(201, json={"data": {"id": "order-1", "associatedRecords": []}})
        raise AssertionError(request.url)
    real_client = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    provider = AmadeusProvider()
    async def exercise():
        p = Preferences.model_validate(preferences())
        flights = await provider.search_flights(p)
        assert flights[0]["title"] == "Air India" and flights[0]["price"]["amount"] == "6500.00"
        assert (await provider.reprice(flights[0]))["price"] == flights[0]["price"]
        hotels = await provider.search_hotels(p)
        assert hotels[0]["details"]["check_in"] == DEPARTURE
        assert (await provider.reprice(hotels[0]))["price"]["amount"] == "12000.00"
        from backend.models import ReservationRequest
        result = await provider.reserve_flight(flights[0], ReservationRequest.model_validate(traveler()).travelers)
        assert result["id"] == "order-1"
    asyncio.run(exercise())
    assert sum(request.url.path.endswith("/oauth2/token") for request in calls) == 1


def test_adapter_input_validation_and_sanitized_provider_outage(monkeypatch):
    provider = AmadeusProvider()
    with pytest.raises(CommerceError) as missing:
        asyncio.run(provider.search_flights(Preferences(origin="DEL", destination="BOM")))
    assert missing.value.status == 422
    monkeypatch.setenv("AMADEUS_CLIENT_ID", "secret-client")
    monkeypatch.setenv("AMADEUS_CLIENT_SECRET", "secret-key")
    real_client = httpx.AsyncClient
    def failure(request):
        raise httpx.ReadTimeout("secret-client secret-key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(failure), **kwargs))
    with pytest.raises(CommerceError) as outage:
        asyncio.run(provider.search_flights(Preferences.model_validate(preferences())))
    assert "secret" not in outage.value.detail

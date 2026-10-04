"""Explicit commerce commands. No LLM or MCP tool can reserve or charge a trip."""
import os
import json
import time
from datetime import date, datetime, timezone
from decimal import Decimal
from urllib.parse import urlparse
from uuid import uuid4

import httpx
import stripe

from backend.travel_provider import AmadeusProvider, CommerceError, public_offer


def enabled(name):
    return os.getenv(name, "false").lower() == "true"


def public_booking(booking):
    result = {key: value for key, value in booking.items() if not key.startswith("_")}
    result["offer"] = public_offer(booking["offer"])
    return result


def flight_terms(offer):
    """Compare supplier identities and fare terms, independent of display dictionaries."""
    raw = offer["_raw"]
    return {
        "itineraries": [[{key: segment.get(key) for key in ("departure", "arrival", "carrierCode", "number", "operating")} for segment in row.get("segments", [])] for row in raw.get("itineraries", [])],
        "travelers": [{key: row.get(key) for key in ("travelerId", "travelerType", "fareOption", "fareDetailsBySegment")} for row in raw.get("travelerPricings", [])],
        "pricing_options": raw.get("pricingOptions"),
        "validating_carriers": raw.get("validatingAirlineCodes"),
    }


class CommerceService:
    def __init__(self, store, provider=None):
        self.store = store
        self.provider = provider or AmadeusProvider()

    def snapshot(self, session, offer, status="searched"):
        expiry = time.time() + 600
        saved = offer | {"offer_id": str(uuid4()), "status": status, "expires_at": datetime.fromtimestamp(expiry, timezone.utc).isoformat()}
        self.store.save_offer(session, saved, expiry)
        return public_offer(saved)

    def owned_offer(self, session, offer_id):
        saved = self.store.offer(session, offer_id)
        if not saved:
            raise CommerceError(404, "Offer not found in this account/session. Search again.")
        offer, expiry = saved
        if expiry <= time.time():
            raise CommerceError(409, "This quote expired. Search and confirm a new price.")
        return offer

    def owned_booking(self, session, booking_id):
        booking = self.store.booking(session, booking_id)
        if not booking:
            raise CommerceError(404, "Booking draft not found in this account/session.")
        return booking

    async def search(self, kind, preferences, session):
        if not self.provider.configured:
            return {"status": "unconfigured", "source": "amadeus", "sandbox": self.provider.sandbox, "offers": [], "items": [], "notice": "Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to search flight/hotel offers. No inventory or fares have been invented."}
        offers = await (self.provider.search_flights(preferences) if kind == "flight" else self.provider.search_hotels(preferences))
        return {"status": "sandbox" if self.provider.sandbox else "live", "source": "amadeus", "sandbox": self.provider.sandbox, "offers": [self.snapshot(session, offer) for offer in offers], "items": [], "notice": "Amadeus test inventory; no real reservation or ticket." if self.provider.sandbox else "Provider offers; final availability and price require a fresh quote. Guest requirements must be confirmed with the supplier."}

    async def quote(self, session, offer_id):
        offer = self.owned_offer(session, offer_id)
        fresh = await self.provider.reprice(offer)
        return {"offer": self.snapshot(session, fresh, "quoted"), "notice": "Review this latest price before saving a draft. A quote is not a reservation."}

    def draft(self, session, body):
        # Retry succeeds even if the original quote subsequently expired.
        existing = next((row for row in self.store.bookings(session) if row.get("_idempotency_key") == body.idempotency_key), None)
        if existing:
            if existing["offer"]["offer_id"] != body.offer_id:
                raise CommerceError(409, "This idempotency key belongs to a different offer.")
            return {"booking": public_booking(existing)}
        offer = self.owned_offer(session, body.offer_id)
        if offer["status"] != "quoted":
            raise CommerceError(409, "Reprice this offer before confirming a booking draft.")
        booking = {"id": str(uuid4()), "offer": offer, "status": "draft", "payment_status": "unpaid", "provider_status": "not_reserved", "ticket_status": "not_issued", "sandbox": offer["sandbox"], "created_at": datetime.now(timezone.utc).isoformat(), "notice": "Draft saved. No reservation, charge or ticket has been created.", "_idempotency_key": body.idempotency_key}
        booking = self.store.create_booking(session, booking, body.idempotency_key)
        if booking["offer"]["offer_id"] != body.offer_id:
            raise CommerceError(409, "This idempotency key belongs to a different offer.")
        return {"booking": public_booking(booking)}

    def list_bookings(self, session):
        return {"bookings": [public_booking(row) for row in self.store.bookings(session)]}

    async def reserve(self, session, booking_id, body):
        booking = self.owned_booking(session, booking_id)
        if booking["offer"]["kind"] != "flight":
            raise CommerceError(503, "Hotel reservations require a contracted hotel supplier with a tokenized payment guarantee. This app does not collect raw card data; use the hotel/provider directly.")
        if not enabled("AMADEUS_ENABLE_RESERVATIONS") or (not booking["sandbox"] and not enabled("AMADEUS_ENABLE_LIVE_RESERVATIONS")):
            raise CommerceError(503, "Flight reservation is disabled. Enable AMADEUS_ENABLE_RESERVATIONS for sandbox testing; live orders also need production booking access, a ticketing consolidator and AMADEUS_ENABLE_LIVE_RESERVATIONS.")
        if booking["sandbox"] != self.provider.sandbox:
            raise CommerceError(409, "Provider environment changed. Create a new quote and draft.")
        if booking["provider_status"] != "not_reserved":
            return {"booking": public_booking(booking)}
        self.owned_offer(session, booking["offer"]["offer_id"])
        expected = sorted(booking["offer"]["details"].get("traveler_ids", []))
        if sorted(traveler.id for traveler in body.travelers) != expected or len(set(t.id for t in body.travelers)) != len(body.travelers):
            raise CommerceError(422, "Traveler IDs must exactly match the adult travelers in the quoted flight offer.")
        journeys = booking["offer"]["details"].get("journeys") or []
        segments = journeys[0].get("segments", []) if journeys else []
        first_departure = segments[0].get("departure", {}).get("at", "")[:10] if segments else ""
        try:
            departure = date.fromisoformat(first_departure)
        except ValueError:
            raise CommerceError(502, "The quoted departure date is invalid. Search again.") from None
        for traveler in body.travelers:
            age = departure.year - traveler.date_of_birth.year - ((departure.month, departure.day) < (traveler.date_of_birth.month, traveler.date_of_birth.day))
            if age < 12:
                raise CommerceError(422, "These offers cover adult travelers aged 12 or older. Search with a supported traveler mix for children.")
        claimed = False
        def claim(row):
            nonlocal claimed
            if row["provider_status"] == "not_reserved":
                claimed = True
                row.update(status="reservation_pending", provider_status="pending", notice="Provider reservation request started; no ticket has been issued.")
        booking = self.store.change_booking(session, booking_id, claim)
        if not claimed:
            return {"booking": public_booking(booking)}
        try:
            # Recheck at reservation time; never accept a changed price without a new user confirmation.
            fresh = await self.provider.reprice(booking["offer"])
            original = booking["offer"]
            if fresh["price"]["currency"] != original["price"]["currency"] or Decimal(fresh["price"]["amount"]) != Decimal(original["price"]["amount"]) or flight_terms(fresh) != flight_terms(original):
                raise CommerceError(409, "Price or itinerary changed. Create a new quote/draft and confirm the new offer.")
        except (CommerceError, httpx.HTTPError, ValueError, KeyError):
            def preflight_failed(row):
                row.update(status="failed", provider_status="failed", notice="Reservation was not submitted because the offer could not be revalidated. Create a new quote.")
            self.store.change_booking(session, booking_id, preflight_failed)
            raise CommerceError(409, "Reservation was not submitted. Reprice and confirm a new draft.")
        try:
            reservation = await self.provider.reserve_flight(fresh, body.travelers)
            def reserved(row):
                row.update(status="reserved", provider_status="reserved", provider_reference=reservation, notice="Sandbox order reserved; no real ticket has been issued." if row["sandbox"] else "Provider reservation created. Ticket issuance is pending with your consolidator; this is not a ticket.")
            booking = self.store.change_booking(session, booking_id, reserved)
        except CommerceError as error:
            def rejected(row):
                # 5xx/invalid provider response may follow a successful reservation.
                unknown = error.status >= 500
                row.update(status="reservation_unknown" if unknown else "failed", provider_status="unknown" if unknown else "failed", notice="Provider outcome uncertain. Reconcile with Amadeus before any retry." if unknown else "Provider rejected the reservation. No ticket has been issued.")
            booking = self.store.change_booking(session, booking_id, rejected)
        except (httpx.HTTPError, ValueError, KeyError):
            def unknown(row):
                row.update(status="reservation_unknown", provider_status="unknown", notice="Reservation response was lost or invalid. Reconcile with Amadeus; automatic retry is blocked to prevent duplicates.")
            booking = self.store.change_booking(session, booking_id, unknown)
        return {"booking": public_booking(booking)}

    @staticmethod
    def return_url(value):
        configured = urlparse(os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"))
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https") or parsed.username or parsed.password or (parsed.scheme, parsed.netloc) != (configured.scheme, configured.netloc):
            raise CommerceError(422, "Checkout return URLs must use the configured FRONTEND_ORIGIN.")
        return value

    @staticmethod
    def minor_amount(price):
        # Use explicit supported currency exponents, never blindly multiply arbitrary currencies.
        exponents = {"INR": 2, "USD": 2, "EUR": 2, "GBP": 2, "AUD": 2, "CAD": 2, "SGD": 2, "AED": 2, "JPY": 0}
        exponent = exponents.get(price["currency"])
        if exponent is None:
            raise CommerceError(422, "Checkout currency is unsupported. Contact the supplier.")
        amount = Decimal(price["amount"]) * (10 ** exponent)
        if not amount.is_finite() or amount != amount.to_integral_value() or amount <= 0 or amount > 99999999:
            raise CommerceError(422, "The quoted amount cannot be charged safely in this currency.")
        return int(amount)

    async def checkout(self, session, booking_id, body):
        booking = self.owned_booking(session, booking_id)
        key = os.getenv("STRIPE_SECRET_KEY", "")
        if not key or not os.getenv("STRIPE_WEBHOOK_SECRET"):
            raise CommerceError(503, "Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET before Checkout.")
        if booking["payment_status"] == "paid":
            raise CommerceError(409, "Payment is already recorded for this draft.")
        if booking["payment_status"] == "failed":
            raise CommerceError(409, "Checkout failed or expired. Reprice the offer and explicitly confirm a new draft.")
        test_mode = key.startswith(("sk_test_", "rk_test_"))
        if booking["sandbox"] != test_mode:
            raise CommerceError(409, "Travel inventory and Stripe must both use matching test/live environments.")
        if not test_mode:
            # A reservation is insufficient: this repo has no ticket issuance/settlement integration.
            raise CommerceError(503, "Live payment is disabled until supplier ticketing, settlement, cancellation and refund fulfillment are operational. Use Stripe test keys.")
        if booking["status"] in ("failed", "reservation_unknown", "reservation_pending"):
            raise CommerceError(409, "Resolve the reservation status before starting Checkout.")
        if booking.get("checkout_url"):
            return {"booking": public_booking(booking), "checkout_url": booking["checkout_url"]}
        success = self.return_url(body.success_url)
        cancel = self.return_url(body.cancel_url)
        self.owned_offer(session, booking["offer"]["offer_id"])
        amount = self.minor_amount(booking["offer"]["price"])
        parameters = {"mode": "payment", "success_url": success, "cancel_url": cancel, "client_reference_id": booking_id,
                      "metadata[booking_id]": booking_id, "payment_intent_data[metadata][booking_id]": booking_id,
                      "line_items[0][price_data][currency]": booking["offer"]["price"]["currency"].lower(), "line_items[0][price_data][unit_amount]": str(amount),
                      "line_items[0][price_data][product_data][name]": "SANDBOX travel draft: " + booking["offer"]["title"], "line_items[0][quantity]": "1"}
        def prepare(row):
            if row["payment_status"] in ("paid", "failed"):
                raise CommerceError(409, "Checkout is already paid or expired. Refresh this booking before continuing.")
            if row["status"] in ("failed", "reservation_unknown", "reservation_pending"):
                raise CommerceError(409, "Resolve the reservation status before starting Checkout.")
            if row.get("checkout_url"):
                return
            if not row.get("_checkout_parameters"):
                row["_checkout_parameters"] = parameters
            row.update(payment_status="pending", notice="Test Checkout started. Payment does not reserve travel or issue a ticket.")
        booking = self.store.change_booking(session, booking_id, prepare)
        if booking.get("checkout_url"):
            return {"booking": public_booking(booking), "checkout_url": booking["checkout_url"]}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post("https://api.stripe.com/v1/checkout/sessions", headers={"Authorization": "Bearer " + key, "Idempotency-Key": "vacanes-checkout-" + booking_id}, data=booking["_checkout_parameters"])
            if not response.is_success:
                raise CommerceError(503, "Stripe could not create Checkout. Check test keys and provider access. Retrying this draft is safe.")
            data = response.json()
            if not data.get("id") or urlparse(data.get("url", "")).hostname != "checkout.stripe.com" or urlparse(data["url"]).scheme != "https":
                raise CommerceError(502, "Stripe returned an invalid Checkout URL. Retry this draft.")
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            raise CommerceError(503, "Checkout response was unavailable. Retry this draft; the same Stripe idempotency key prevents duplicate sessions.")
        def created(row):
            row.update(checkout_id=data["id"], checkout_url=data["url"])
        booking = self.store.change_booking(session, booking_id, created)
        return {"booking": public_booking(booking), "checkout_url": data["url"]}

    def webhook(self, payload, signature):
        secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        if not secret:
            raise CommerceError(503, "Stripe webhook is not configured.")
        try:
            stripe.Webhook.construct_event(payload, signature, secret, tolerance=300)
            # Parse the exact verified bytes. Stripe 15 resources are no longer dicts.
            event = json.loads(payload)
        except (ValueError, stripe.SignatureVerificationError):
            raise CommerceError(400, "Invalid Stripe webhook signature or payload.")
        relevant = {"checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"}
        if event["type"] not in relevant:
            return {"received": True, "ignored": True}
        data = event["data"]["object"]
        booking_id = data.get("metadata", {}).get("booking_id", "")
        def apply(booking):
            # Signed events still must match the frozen server quote and Checkout session.
            if not booking.get("checkout_id"):
                # Stripe retries non-2xx delivery. If the create response was lost, a
                # client retry recovers that same Session using its idempotency key.
                raise CommerceError(409, "Checkout session is not stored yet. Retry session creation before webhook reconciliation.")
            if not booking.get("_checkout_parameters") or data.get("client_reference_id") != booking["id"] or data.get("id") != booking["checkout_id"]:
                raise CommerceError(400, "Stripe event does not match this booking Checkout session.")
            if bool(event.get("livemode")) == booking["sandbox"] or data.get("amount_total") != self.minor_amount(booking["offer"]["price"]) or data.get("currency", "").upper() != booking["offer"]["price"]["currency"]:
                raise CommerceError(400, "Stripe event environment or amount does not match the booking quote.")
            if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and data.get("payment_status") == "paid":
                booking.update(payment_status="paid", payment_intent_id=data.get("payment_intent"), status="paid_pending_fulfillment", notice="Test payment recorded. Supplier fulfillment and ticket issuance remain pending; payment is not a ticket.")
            elif event["type"] in ("checkout.session.async_payment_failed", "checkout.session.expired") and booking["payment_status"] != "paid":
                booking.update(payment_status="failed", notice="Checkout payment failed or expired. No ticket has been issued.")
            # No event can infer supplier reservation or ticket issuance.
        applied = self.store.apply_payment_event(event["id"], booking_id, apply)
        return {"received": True, "duplicate": not applied}

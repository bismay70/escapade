"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Compass, LoaderCircle, RefreshCw } from "lucide-react";
import { authStatus, logout, defaultPreferences, AuthUser, Preferences, travelApi } from "@/lib/travel";
import styles from "./bookings.module.css";

type Offer = {
  offer_id: string; kind: "flight" | "hotel"; title: string;
  price: { amount: string; currency: string }; sandbox: boolean;
  expires_at: string; status: string; details: Record<string, unknown>;
};
type Booking = { id: string; offer: Offer; status: string; payment_status: string; provider_status: string; ticket_status: string; sandbox: boolean; notice: string };
const money = (offer: Offer) => new Intl.NumberFormat("en-IN", { style: "currency", currency: offer.price.currency }).format(Number(offer.price.amount));
const readable = (value: string) => value.replaceAll("_", " ");

export default function BookingWorkspace() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<"flight" | "hotel">("flight");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [quote, setQuote] = useState<Offer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const operation = useRef(false);
  const draftKey = useRef("");

  const initialize = useCallback(async () => {
    try {
      setKind(new URLSearchParams(window.location.search).get("kind") === "hotel" ? "hotel" : "flight");
      const auth = await authStatus();
      setAccount(auth.user);
      const profile = await travelApi<{ preferences: Preferences }>("profile");
      setPreferences(profile.preferences);
      if (auth.authenticated) setBookings((await travelApi<{ bookings: Booking[] }>("bookings")).bookings);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not connect to your account."); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { void initialize(); }, [initialize]);

  async function perform(label: string, action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(label); setError("");
    try { await action(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Please try again."); }
    finally { operation.current = false; setBusy(""); }
  }
  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences(current => ({ ...current, [key]: value }));
    setOffers([]); setQuote(null); setNotice("");
  }
  async function search() {
    setQuote(null); setOffers([]); setNotice("");
    await perform("Searching offers", async () => {
      const response = await travelApi<{ offers: Offer[]; notice?: string }>(kind === "flight" ? "flights" : "hotels", { method: "POST", body: JSON.stringify(preferences) });
      setOffers(response.offers ?? []);
      setNotice(response.notice || (response.offers?.length ? "Select an offer to check its latest price and conditions." : "No offers found for these dates. Try another date or destination."));
    });
  }
  async function review(offer: Offer) {
    await perform("Checking price", async () => {
      const result = await travelApi<{ offer: Offer }>("bookings/quote", { method: "POST", body: JSON.stringify({ offer_id: offer.offer_id }) });
      setQuote(result.offer); setConfirmed(false); draftKey.current = crypto.randomUUID();
    });
  }
  async function saveDraft() {
    if (!quote || !confirmed) return;
    await perform("Saving booking draft", async () => {
      const result = await travelApi<{ booking: Booking }>("bookings/drafts", { method: "POST", body: JSON.stringify({ offer_id: quote.offer_id, confirmed: true, idempotency_key: draftKey.current }) });
      setBookings(current => [result.booking, ...current.filter(item => item.id !== result.booking.id)]);
      setQuote(null); setNotice("Draft saved. Inventory is not held and no payment has been taken.");
    });
  }
  async function checkout(booking: Booking) {
    await perform("Opening secure checkout", async () => {
      const result = await travelApi<{ checkout_url: string }>(`bookings/${booking.id}/checkout`, { method: "POST", body: JSON.stringify({ confirmed: true, success_url: `${window.location.origin}/bookings?payment=returned`, cancel_url: `${window.location.origin}/bookings?payment=cancelled` }) });
      const url = new URL(result.checkout_url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("The payment provider returned an invalid checkout link.");
      window.location.assign(url.href);
    });
  }

  return <main className={styles.workspace}>
    <header className={styles.topbar}><Link href="/" className={styles.brand}><Compass size={25} /> Vacanes</Link><nav><Link href="/planner"><ArrowLeft size={15} /> Travel planner</Link>{account && <button disabled={!!busy} onClick={() => void perform("Signing out", async () => { await logout(); window.location.assign("/planner"); })}>Sign out</button>}</nav></header>
    <div className={styles.container}>
      <div className={styles.intro}><p>From inspiration to your itinerary</p><h1>Make room for the journey.</h1><span>Search provider offers, review current prices, and keep your booking progress in one place.</span></div>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!ready ? <p className={styles.notice}>Connecting to your travel account…</p> : !account ? <section className={styles.signIn}><Compass size={30} /><h2>Your trips, together.</h2><p>Sign in to save booking drafts and access checkout. Guest preferences remain in your guest planner. After signing in, choose your trip details for this account.</p><Link href="/login?next=/bookings">Sign in with Google <ArrowUpRight size={16} /></Link></section> : <>
        <p className={styles.account}>Signed in as {account.name || account.email || "traveller"}</p>
        <section className={styles.search} aria-label="Find travel offers">
          <div className={styles.tabs}>{(["flight", "hotel"] as const).map(type => <button key={type} type="button" aria-pressed={kind === type} disabled={!!busy} onClick={() => { setKind(type); setOffers([]); setQuote(null); setNotice(""); }}>{type === "flight" ? "Flights" : "Hotels"}</button>)}</div>
          <form onSubmit={event => { event.preventDefault(); void search(); }}>
            <fieldset disabled={!!busy} className={styles.fields}>
              {kind === "flight" && <label>From (city or airport code)<input value={preferences.origin} onChange={event => update("origin", event.target.value)} placeholder="Delhi or DEL" maxLength={80} required /></label>}
              <label>{kind === "flight" ? "To (city or airport code)" : "Destination (city or code)"}<input value={preferences.destination} onChange={event => update("destination", event.target.value)} placeholder={kind === "flight" ? "Goa or GOI" : "Paris or PAR"} maxLength={80} required /></label>
              <label>{kind === "flight" ? "Departure" : "Check-in"}<input type="date" value={preferences.departure_date ?? ""} onChange={event => update("departure_date", event.target.value || null)} required /></label>
              <label>{kind === "flight" ? "Return (optional)" : "Check-out"}<input type="date" value={preferences.return_date ?? ""} min={preferences.departure_date ?? undefined} onChange={event => update("return_date", event.target.value || null)} required={kind === "hotel"} /></label>
              <label>Adults<input type="number" min={1} max={9} value={preferences.travelers} onChange={event => update("travelers", Number(event.target.value))} required /></label>
              <button className={styles.primary} type="submit">Search offers <ArrowUpRight size={16} /></button>
            </fieldset>
          </form>
          <p className={styles.hint}>Enter a city or its three-letter code. Search uses adult fares; special meals and accessibility requests must be confirmed with the provider.</p>
        </section>
        {busy && <p className={styles.notice} role="status"><LoaderCircle className={styles.spin} size={17} />{busy}…</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {quote && <section className={styles.review} aria-label="Review latest quote"><div><p className={styles.eyebrow}>Review the latest quote</p><h2>{quote.title}</h2><strong className={styles.price}>{money(quote)}</strong><OfferDetails offer={quote} /></div><div className={styles.reviewAction}><p>{quote.sandbox ? "Test inventory · no real reservation" : "Provider quote · availability may change"}</p><p>Quote expires {new Date(quote.expires_at).toLocaleString()}.</p><label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I have reviewed this price and its conditions. Save it as a draft.</label><button className={styles.primary} disabled={!confirmed || !!busy} onClick={() => void saveDraft()}>Save booking draft</button><button className={styles.secondary} disabled={!!busy} onClick={() => setQuote(null)}>Close review</button></div></section>}
        {offers.length > 0 && <section aria-label="Available offers"><h2 className={styles.sectionTitle}>A few ways to get there</h2><div className={styles.offers}>{offers.map(offer => <article className={styles.offer} key={offer.offer_id}><span className={styles.badge}>{offer.sandbox ? "Amadeus test offer" : "Amadeus offer"}</span><h3>{offer.title}</h3><OfferDetails offer={offer} /><footer><strong>{money(offer)}</strong><button disabled={!!busy} onClick={() => void review(offer)}>Check latest price <ArrowUpRight size={15} /></button></footer></article>)}</div></section>}
        <section aria-label="Your booking drafts"><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Your bookings</h2><button disabled={!!busy} onClick={() => void perform("Refreshing bookings", async () => setBookings((await travelApi<{ bookings: Booking[] }>("bookings")).bookings))}><RefreshCw size={14} /> Refresh status</button></div>{!bookings.length && <p className={styles.empty}>Your saved drafts and booking progress will appear here.</p>}{bookings.map(booking => <article className={styles.booking} key={booking.id}><div><span className={styles.badge}>{booking.sandbox ? "Test booking" : "Booking draft"}</span><h3>{booking.offer.title}</h3><strong>{money(booking.offer)}</strong><p className={styles.reference}>Reference {booking.id}</p></div><div><dl><div><dt>Booking</dt><dd>{readable(booking.status)}</dd></div><div><dt>Payment</dt><dd>{readable(booking.payment_status)}</dd></div><div><dt>Reservation</dt><dd>{readable(booking.provider_status)}</dd></div><div><dt>Ticket</dt><dd>{readable(booking.ticket_status)}</dd></div></dl><p className={styles.hint}>{booking.notice || "A draft does not reserve inventory. Payment alone does not issue a ticket."}</p>{booking.payment_status !== "paid" && booking.payment_status !== "failed" && <button className={styles.primary} disabled={!!busy} onClick={() => void checkout(booking)}>{booking.sandbox ? "Continue to test checkout" : "Continue to secure checkout"} <ArrowUpRight size={15} /></button>}</div></article>)}</section>
      </>}
    </div>
  </main>;
}

function OfferDetails({ offer }: { offer: Offer }) {
  const details = offer.details;
  const journeys = details.journeys as { duration?: string; stops?: number; segments?: { departure?: { iataCode?: string; at?: string }; arrival?: { iataCode?: string; at?: string }; airline?: string; flight_number?: string }[] }[] | undefined;
  const room = details.room as { description?: { text?: string } } | undefined;
  const fares = details.traveler_fares as { traveler_id?: string; segments?: { cabin?: string; class?: string; fareBasis?: string; includedCheckedBags?: { quantity?: number; weight?: number; weightUnit?: string } }[] }[] | undefined;
  const guests = typeof details.guests === "object" && details.guests !== null ? (details.guests as { adults?: number }).adults : details.guests;
  return <div className={styles.details}>
    {offer.kind === "flight" ? journeys?.map((journey, i) => <p key={i}>{journey.segments?.map((segment, index) => <span key={index}>{segment.departure?.iataCode} → {segment.arrival?.iataCode} · {segment.departure?.at?.replace("T", " ")} · {segment.airline} {segment.flight_number}<br /></span>)}{journey.stops === 0 ? "Nonstop" : `${journey.stops ?? 0} stop(s)`}{journey.duration ? ` · ${journey.duration.replace("PT", "").toLowerCase()}` : ""}</p>) : <><p>{String(details.check_in ?? "")} → {String(details.check_out ?? "")}</p><p>{String(guests ?? "")} guest(s) · {String(details.board_type ?? "Check meal inclusions")}</p>{room?.description?.text && <p>{room.description.text}</p>}</>}
    {fares?.map((fare, index) => <p key={index}>Traveller {fare.traveler_id}: {fare.segments?.map((segment, i) => <span key={i}>{i > 0 ? " / " : ""}{readable(segment.cabin?.toLowerCase() ?? "Cabin unspecified")} · class {segment.class ?? "—"} · fare {segment.fareBasis ?? "—"} · checked baggage {segment.includedCheckedBags?.quantity !== undefined ? `${segment.includedCheckedBags.quantity} piece(s)` : segment.includedCheckedBags?.weight !== undefined ? `${segment.includedCheckedBags.weight} ${segment.includedCheckedBags.weightUnit ?? ""}` : "not specified"}</span>)}</p>)}
    <details><summary>Fare and cancellation conditions</summary><div className={styles.conditions}><Conditions value={details.policies ?? details.fare_rules} /><p>Confirm cancellation fees, baggage and special requests with the supplier before paying.</p></div></details>
  </div>;
}

function Conditions({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p>Detailed conditions were not supplied.</p>;
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}><Conditions value={item} /></li>)}</ul>;
  if (typeof value === "object") return <dl>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}</dt><dd><Conditions value={item} /></dd></div>)}</dl>;
  return <span>{typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}</span>;
}

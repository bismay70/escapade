# Vacanes / Escapade

Next.js frontend plus one Python FastAPI agent service. The legacy dummy backend has been replaced; there is no second `pythonbackend` folder and no dependency on absent `static`, `templates`, or `custom_weather_mcp_server.py` files.

## Run locally (Windows)

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Start-local.ps1
```

Open http://localhost:3000/planner, or use **Plan with AI** on the homepage. **Offers & bookings** opens http://localhost:3000/bookings. The startup script installs dependencies when required (including changed Python requirements) and starts hidden processes. Logs live under `backend/data/logs`. Existing listeners on ports 3000/8000 are retained; restart your own running services after editing environment variables.

Manual setup:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe -m backend.app
# In a second terminal:
cd frontend
npm ci
npm run dev -- --hostname 127.0.0.1
```

`python backend/app.py` also works. All backend imports use the `backend` package; config and database paths are based on the source directory, not the terminal directory.

## API keys

The ignored `backend/.env` and `frontend/.env.local` files are prepared locally. For a fresh checkout, copy the matching `.env.example` files. Add provider secrets to `backend/.env` and restart Python. Only the public Firebase web configuration belongs in browser code. Never paste private keys into chat or commit them.

| Variable | Purpose | Needed? |
| --- | --- | --- |
| `GROQ_API_KEY` | Coordinator, itinerary specialist, conversational answers | Choose Groq or OpenAI for full AI |
| `OPENAI_API_KEY` | Alternative AI provider; set `LLM_PROVIDER=openai` | Alternative to Groq |
| `TAVILY_API_KEY` | Live hotel, route and activity web research | Optional, recommended |
| `OPENWEATHER_API_KEY` | Current weather observations | Optional |
| `AVIATIONSTACK_API_KEY` | Flight status for routes supplied as IATA codes | Optional; does not provide fares |
| `TAVILY_MCP_URL` | Connect an existing remote Tavily MCP server | Optional alternative to direct Tavily |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | Structured flight/hotel inventory and fresh quotes | Required for provider offers; start with test credentials |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH` | Verified Google account sessions | Required for account profiles and checkout; path points to a private service-account JSON file |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Hosted test Checkout and signed payment events | Required for payment testing; use `sk_test_...` and `whsec_...` |
| `BACKEND_SERVICE_KEY` | Shared secret between Next.js and Python | Required before public deployment |

Provider docs: [Groq](https://console.groq.com/docs/api-reference), [Tavily](https://docs.tavily.com/documentation/api-reference/endpoint/search), [OpenWeather](https://openweathermap.org/api/current).

The current Groq default is `openai/gpt-oss-20b`, hosted by Groq and using the Groq key. The previous Llama model was unavailable to the configured account. Model availability can change; check the [Groq model list](https://console.groq.com/docs/models) when configuring another account. The locally configured Groq key completed a live preference-aware itinerary test; other integrations have only been tested with mocked responses so far.

With no keys, the UI explicitly shows **Local sample planner**. It uses a small curated catalog and limited intent parsing. Sample itineraries and ground-cost examples are not live inventory. AI failures fall back to that mode with a notice. Without an AI key, multilingual open-ended answers are unavailable. Current weather is never presented as a forecast for future trip dates.

Firebase setup: enable Google in Authentication, authorize `localhost` (and your deployed domain), and place the Web app configuration into the `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` fields of `frontend/.env.local`. Storage bucket and messaging sender ID are optional for sign-in. Put the Admin service-account JSON at `backend/.secrets/firebase-service-account.json` and set the matching backend project ID. That directory is ignored by Git. The backend verifies Firebase tokens and revoked sessions, and Next.js stores a five-day HttpOnly session cookie. Signed-in preferences/history use the verified account ID; guest data stays in its separate browser session and is not automatically migrated.

The local services already have a generated matching `BACKEND_SERVICE_KEY`. For a new deployment, set matching values in both services, plus `BACKEND_URL` on Next.js and `FRONTEND_ORIGIN` on Python. Keep Python private. This implementation uses local SQLite and a per-process chat rate limiter; a public rollout still needs distributed abuse controls, managed persistence, operational monitoring, and provider/fulfillment approval.

### Inventory, reservations and payments

1. Search flights/hotels with trip dates and an origin/destination. The booking page accepts three-letter airport/city codes. Amadeus search returns provider inventory, with test inventory explicitly labeled. Missing credentials return an unconfigured response, never invented offers.
2. Reprice an offer before saving a draft. The server keeps the authoritative amount and provider payload; clients submit only an opaque offer ID. Quotes expire and belong to the current account/session. Draft creation requires explicit confirmation and an idempotency key.
3. Flight reservation is an authenticated API action separate from chat. Set `AMADEUS_ENABLE_RESERVATIONS=true` to test it. Production orders additionally require Amadeus production booking access, a ticketing consolidator, and `AMADEUS_ENABLE_LIVE_RESERVATIONS=true`. The API checks traveler IDs, age, fare conditions and price before submission. Uncertain provider outcomes block automatic retries. A reservation is never presented as an issued ticket.
4. Hosted Stripe Checkout is implemented for **test payments only**. Start with `AMADEUS_ENV=test` and Stripe test keys. Stripe supplies the payment form; the app does not collect card numbers. The server validates return URLs against `FRONTEND_ORIGIN` and uses the saved quote amount. Signed, idempotent webhooks record payment independently of reservation and ticket status. Returning to the website alone cannot mark a payment successful.

Hotel reservation fulfillment requires a contracted supplier with a tokenized payment guarantee and is not implemented. Live charging is deliberately disabled until ticket issuance, supplier settlement, cancellations and refunds are implemented and operational. These are remaining integrations, not features unlocked simply by adding API keys. The `/bookings` UI supports search, quote review, drafts, status and test checkout; the flight reservation command is currently available through the API docs.

For local Stripe webhook delivery, use the official Stripe CLI:

```powershell
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```

Put the listener's signing secret in `STRIPE_WEBHOOK_SECRET` and restart Python. The relevant events are `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. No Stripe publishable key is needed for this server-created hosted Checkout flow.

Provider references: [Amadeus API specifications](https://github.com/amadeus4dev/amadeus-open-api-specification), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions), [Stripe webhooks](https://docs.stripe.com/webhooks), [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies).

## Agent and memory flow

1. Next.js `/api/*` routes proxy to FastAPI using a server-issued HttpOnly browser-session cookie. No user ID or provider keys are accepted from chat inputs.
2. The coordinator reads the saved profile and recent conversation, identifies intent and handles missing destinations. Explicit trip fields in a message override profile values for that turn; they do not silently change the saved profile.
3. Named LangGraph hotel, transport, weather and activity specialists invoke LangChain tools. Transport/weather/activity research runs concurrently after the hotel step. Irrelevant specialists skip their tool calls.
4. The itinerary specialist generates a validated structured outline with AI when available; the budget specialist checks group cost and returns a total-INR allocation. The final agent answers the actual question with source links and capability notices.
5. SQLite persists preferences and the last 100 chat messages per browser session or verified account in `backend/data/vacanes.sqlite3`. It also stores owned offer snapshots, booking drafts and payment events. Reloading or restarting preserves them. Clear chat keeps preferences.

Routes: `GET/PUT /api/profile`, `GET/DELETE /api/memory`, `POST /api/ai/agent`, `POST /api/planner`, `POST /api/flights`, `POST /api/hotels`. FastAPI health is at `/health`; docs at `http://127.0.0.1:8000/docs`. Direct API calls need an `X-Session-Id` UUID and, when configured, `X-Service-Key`. `/api/planner` takes the same `{ "message": "..." }` body as chat. Flight/hotel endpoints take a full preferences object.

Commerce routes: `POST /api/bookings/quote` (`offer_id`), `POST /api/bookings/drafts` (`offer_id`, `confirmed: true`, UUID `idempotency_key`), `GET /api/bookings`, `GET /api/bookings/{id}`, `POST /api/bookings/{id}/reserve` (`confirmed: true`, `travelers`), `POST /api/bookings/{id}/checkout` (`confirmed: true`, `success_url`, `cancel_url`), and signed `POST /api/payments/webhook`. Quote review returns a new quoted `offer_id`; use that ID to create the draft. Reserve and checkout require a verified account session. Next.js forwards its HttpOnly cookie as `X-Auth-Session` over the private backend connection. Auth routes are `POST /api/auth/session`, `GET /api/auth/me`, and frontend `DELETE /api/auth/session` for logout. Full request schemas are in FastAPI's docs.

MCP: the running FastAPI service exposes the same research tools at `http://127.0.0.1:8000/mcp/` using streamable HTTP. When configured, clients must supply the matching `X-Service-Key` header. `backend/mcp_server.py` also exposes them as a stdio server: start with `backend/.venv/Scripts/python.exe -m backend.mcp_server` from the root. Configure a remote Tavily MCP server using `TAVILY_MCP_URL` if desired. The main app does not need a separate weather MCP process.

Voice input uses browser speech recognition when supported; spoken answers use speech synthesis. Typing works in every browser. Homepage motion includes staggered headings/cards, hero letter entrances and parallax, gallery reveals, image hover zoom and animated FAQ expansion. A persistent Full/Reduced motion control also stops banner autoplay. The page defaults to full motion; this page preference does not change the operating-system preference. Server-rendered content remains visible without JavaScript.

## Backups before every future change

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Backup.ps1 -Label before-next-change
```

Backups go beside the repo in `../backups/escapade-TIMESTAMP-LABEL`. They contain source files and a consistent SQLite snapshot (including saved preferences/history). They exclude `.git`, dependencies, build caches and virtual environments. Restore source into a new folder, reinstall dependencies and run it; do not overwrite your only copy while services are running. `.env` files stay in local backups and are ignored by Git.

Baseline saved before this implementation: `../backups/escapade-20261002-212751` and Git tag `backup-before-agentic-20261002-212751` at commit `86e8382`. Original dummy Python files are recoverable there.

## Verify

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests -q
cd frontend
npx tsc --noEmit
npx eslint app/planner app/bookings app/api lib/travel.ts app/common/HomeMotion.tsx app/common/ScrollReveal.tsx app/common/AgentWidget.tsx app/common/AppShell.tsx
npm run build
```

Tests cover persistence/session isolation, verified identity, preference-aware plans, follow-up memory, per-message overrides, validation, provider outages, mocked AI/weather/inventory responses, quote ownership/expiry, duplicate commands, reservation uncertainty, tamper-resistant amounts, and signed payment webhook replay. Provider-backed sign-in, search, reservations and test payments still require validation with your credentials. No real reservation or charge has been made.

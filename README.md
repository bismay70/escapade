# Vacanes — AI-Powered Travel Planner

> A full-stack, preference-aware travel planning assistant with a multi-agent AI backend, real flight/hotel inventory via Amadeus, Stripe-powered checkout, and Firebase authentication.

---

## Table of Contents

- [Purpose](#purpose)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Backend Deep Dive](#backend-deep-dive)
- [Frontend Deep Dive](#frontend-deep-dive)
- [Data Flow](#data-flow)
- [API Reference](#api-reference)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Design Decisions & Safety Principles](#design-decisions--safety-principles)

---

## Purpose

Vacanes is a travel planning web application that combines an **AI multi-agent system** with **real travel inventory** (flights and hotels via Amadeus) and a **full commerce pipeline** (Stripe Checkout). Users can:

- Chat with an AI travel agent to get personalised trip plans, destination suggestions, hotel/flight research, and weather
- Save persistent travel preferences (budget, pace, dietary needs, accessibility, language, etc.)
- Browse and reprice live flight and hotel offers from Amadeus
- Draft bookings, reserve flights, and pay via Stripe Checkout (test mode)
- Access all functionality without any API keys — a curated local sample mode always runs as a fallback

The app is intentionally honest: it clearly labels **sample data**, never fabricates live prices or confirmed reservations, and keeps all AI/search keys server-side only.

---

## Key Features

### Multi-Agent AI Planning
- Built on **LangGraph** with a directed state graph (`coordinator -> specialists -> itinerary -> budget -> final`)
- **Coordinator agent** extracts user intent using LLM or falls back to a robust regex/rule parser
- **Specialist agents** run concurrently for hotels, flights, weather, and activities research
- **Itinerary agent** generates a day-by-day trip outline respecting pace, dietary, and accessibility constraints
- **Budget agent** allocates the total INR budget across stay, transport, food, and activities
- **Final agent** synthesises all research into a plain-text, preference-aligned answer via LLM

### Destination Catalog
- Curated catalog of 12 destinations (India domestic + international): Goa, Kerala, Jaipur, Manali, Udaipur, Rishikesh, Meghalaya, Bali, Thailand, Paris, Japan, Dubai
- Each destination has interest tags, sample daily costs, and per-interest curated activity suggestions
- Smart recommendation engine ranks destinations by interest overlap and budget fit

### Live Travel Inventory (Amadeus)
- **Flight search**: Amadeus v2 shopping API with IATA code resolution, per-person budget cap, return flights, up to 9 travelers
- **Hotel search**: Amadeus v1/v3 APIs by city code, 15 km radius, best-rate-only, up to 8 offers
- **Offer repricing**: Re-validates price and itinerary before every draft or reservation to prevent stale-price acceptance
- **Flight reservation**: Full Amadeus flight order creation with traveler details and ticketing agreement
- Sandbox/live environment strictly separated; mismatches are rejected

### Stripe Checkout Commerce Pipeline
- Full booking lifecycle: `searched -> quoted -> draft -> reserved -> paid_pending_fulfillment`
- Stripe Checkout Sessions created server-side with idempotency keys (safe retries)
- Signed webhook verification (`stripe.Webhook.construct_event`) with exact amount and currency double-checks
- Live payment deliberately disabled until a supplier ticketing/settlement integration exists

### Authentication
- **Firebase Authentication** (Google Sign-In) on the frontend
- Backend exchanges Firebase ID tokens for **5-day signed session cookies**
- Sessions scope all preferences, conversation history, offers, and bookings
- Anonymous users get a UUID session; authenticated users get a `user:<uid>` session
- Service-to-service requests authenticated via HMAC-compared `BACKEND_SERVICE_KEY`

### Session-Scoped Persistent Store
- **SQLite** with WAL mode via a custom `Store` class (no ORM overhead)
- Tables: `profiles`, `messages`, `offers`, `bookings`, `payment_events`
- All queries strictly scoped by session — no cross-session data leakage
- Offer TTL of 10 minutes, with automatic expiry cleanup
- History capped at 100 messages per session for bounded local storage

### Web Research Integration
- **Tavily API** (direct or via MCP) for live hotel, activity, and route research
- **OpenWeatherMap** for current weather (clearly labelled as observation, not forecast)
- **AviationStack** for live flight status by IATA code (status only, no fares)
- All research results are labelled as unverified web content

### MCP Server (Model Context Protocol)
- FastMCP server mounted at `/mcp` within the same FastAPI process
- Exposes `search_hotels`, `search_transport`, `current_weather` as MCP tools
- Protected by the same `BACKEND_SERVICE_KEY` middleware as all other routes
- Supports both stdio and streamable HTTP transports

### Multilingual Support
- Language preference (English, Hindi, French, Spanish, Arabic, German) is a first-class preference
- AI agents are instructed to respond in the user's selected language

### Rate Limiting & Concurrency Safety
- Per-session rate limit: 12 messages per 60-second window (HTTP 429)
- Per-session active request lock: prevents concurrent duplicate agent runs (HTTP 409)
- Rate-bucket memory auto-swept when more than 2,000 active sessions exist
- Agent calls time out at 110 seconds (HTTP 504)

---

## Architecture Overview

```
+-------------------------------------------------------------------+
|                      Browser (Next.js 16)                         |
|  /home  /planner  /bookings  /destination_all  /blog  /about     |
+---------------------------+---------------------------------------+
                            | fetch /api/[...path]  (Next.js proxy)
                            v
+---------------------------------------------------------------------+
|            Next.js API Route  (frontend/app/api/)                   |
|   Adds X-Service-Key header, forwards session cookies               |
+---------------------------+-----------------------------------------+
                            | HTTP
                            v
+---------------------------------------------------------------------+
|              FastAPI Backend  (backend/app.py)                      |
|                                                                     |
|  Auth middleware --> identity / session / account guards            |
|  Rate limiter (12 req/min per session, 110s timeout)                |
|                                                                     |
|  POST /api/planner ---------> TravelAgent (LangGraph)              |
|  POST /api/flights/hotels --> CommerceService.search()             |
|  POST /api/bookings/quote --> CommerceService.quote()              |
|  POST /api/bookings/drafts -> CommerceService.draft()              |
|  POST /api/bookings/{id}/reserve --> CommerceService.reserve()     |
|  POST /api/bookings/{id}/checkout -> CommerceService.checkout()    |
|  POST /api/payments/webhook --> CommerceService.webhook()          |
|  GET/PUT /api/profile --> Store                                     |
|  /mcp --> FastMCP (search_hotels, search_transport, weather)       |
+----------------------------+-------+------+------------------------+
                             |       |      |
             +---------------v-+  +--v---+  +-v---------+
             | LangGraph        |  |Amadeus|  |  SQLite    |
             | TravelAgent      |  | API   |  |  (Store)   |
             +------+-----------+  +-------+  +------------+
                    |
        +-----------+-------------------+
        v           v           v        v
    Groq/OpenAI  Tavily    OpenWeather  AviationStack
      (LLM)    (Search)    (Weather)   (Flight status)
```

---

## Project Structure

```
vacanes/
├── AGENTS.md                    # Project-specific agent/contributor rules
├── README.md                    # This file
├── .gitignore
│
├── backend/                     # Python FastAPI backend
│   ├── app.py                   # Entry point: all routes, rate limiter, MCP mount
│   ├── agent.py                 # LangGraph multi-agent travel planner (TravelAgent)
│   ├── auth.py                  # Firebase session cookie authentication
│   ├── catalog.py               # Curated destination catalog & recommendation engine
│   ├── commerce.py              # Booking lifecycle: search, quote, draft, reserve, checkout, webhook
│   ├── config.py                # Env-based capability flags, database path
│   ├── mcp_client.py            # Tavily MCP client helper
│   ├── mcp_server.py            # FastMCP server (search_hotels, search_transport, current_weather)
│   ├── models.py                # Pydantic models: Preferences, TripIntent, ChatRequest, booking models
│   ├── providers.py             # LLM, search, weather, flight status, hotel/flight provider wrappers
│   ├── storage.py               # SQLite store: profiles, messages, offers, bookings, payment_events
│   ├── tools.py                 # LangChain tool builders for agent specialists
│   ├── travel_provider.py       # Amadeus API adapter: auth, search, repricing, reservation
│   ├── backend.py               # Thin convenience entry point
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # All configurable environment variables with comments
│   └── tests/
│       ├── conftest.py          # Shared pytest fixtures
│       ├── test_auth.py         # Firebase auth unit tests
│       ├── test_commerce.py     # Commerce pipeline end-to-end tests
│       └── test_travel.py       # Travel agent: intent, itinerary, budget, full runs
│
├── frontend/                    # Next.js 16 + React 19 + TypeScript frontend
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Root redirect to /home
│   │   ├── globals.css          # Global CSS design tokens
│   │   ├── home/                # Landing page
│   │   ├── planner/             # AI chat + trip planning workspace
│   │   │   ├── TravelWorkspace.tsx  # Chat, day cards, budget, sources, preferences panel
│   │   │   └── planner.module.css
│   │   ├── bookings/            # Booking management workspace
│   │   │   ├── BookingWorkspace.tsx
│   │   │   └── bookings.module.css
│   │   ├── destination_all/     # Browse all destinations
│   │   ├── destination_india/   # India-specific destinations
│   │   ├── about/               # About page
│   │   ├── blog/                # Travel articles
│   │   ├── login/               # Firebase Google Sign-In
│   │   ├── common/              # Shared nav/footer components
│   │   └── api/
│   │       ├── [...path]/       # Catch-all proxy to backend (injects X-Service-Key)
│   │       └── auth/            # Firebase token exchange route
│   ├── components/ui/           # Radix UI primitives (button, card, input, select, checkbox, nav-menu)
│   ├── lib/
│   │   ├── travel.ts            # API client + TypeScript types (Preferences, AgentResponse, etc.)
│   │   └── utils.ts             # cn() class-merging utility
│   ├── public/                  # Static assets
│   ├── package.json
│   └── .env.example
│
└── scripts/
    ├── Backup.ps1               # PowerShell backup (run before any source change)
    └── Start-local.ps1          # One-command local dev startup
```

---

## Backend Deep Dive

### `agent.py` — LangGraph Multi-Agent System

The core planning engine is a **compiled LangGraph state graph**:

```
START
  └── coordinator          (extracts TripIntent via LLM or regex fallback)
        ├── final           (if task=recommend/conversation or no destination)
        └── hotels ──┬──── flights  ──┐
                     ├──── weather    ├── itinerary ── budget ── final ── END
                     └──── activities ┘
```

| Agent | Role |
|---|---|
| `coordinator` | Extracts `TripIntent` from user message + history + saved preferences; merges into `Preferences` |
| `hotels` | Researches accommodation via Amadeus or Tavily web search |
| `flights` | Researches routes via Amadeus or Tavily + AviationStack flight status |
| `weather` | Fetches current weather from OpenWeatherMap |
| `activities` | Researches things to do at the destination |
| `itinerary` | Builds a day-by-day plan using catalog activities or LLM generation; respects pace, diet, accessibility |
| `budget` | Allocates total INR budget: 35% stay, 25% transport, 15% food, 15% activities, 10% buffer |
| `final` | Generates the conversational answer via LLM, or falls back to a preference-aligned template |

**Preference merging**: the coordinator compares saved preferences against the previous turn's preferences to restore per-turn overrides on follow-up questions.

---

### `commerce.py` — Booking Pipeline

```
Search offers (Amadeus)
  └── snapshot() -- offer stored with 10-min TTL in SQLite
       └── quote() -- Amadeus repricing, new snapshot (status=quoted)
             └── draft() -- idempotency-key-protected booking record (status=draft)
                   ├── reserve() -- Amadeus flight order (requires AMADEUS_ENABLE_RESERVATIONS=true)
                   │      └── pre-flight reprice: rejects if price or itinerary changed
                   └── checkout() -- Stripe Checkout Session (test mode only)
                         └── webhook() -- signed Stripe event -- "paid_pending_fulfillment"
```

**Safety guarantees:**
- No LLM or MCP tool can trigger a reservation or payment
- Price is re-validated at reservation time; any change blocks the reservation
- Stripe amount and currency are double-checked against the stored quote in the webhook handler
- Duplicate Stripe events detected via `payment_events` idempotency table

---

### `models.py` — Pydantic Schema

| Model | Purpose |
|---|---|
| `Preferences` | Full user travel profile: budget 3k–1M INR, days 1–30, travelers 1–20, date ordering validation |
| `TripIntent` | Coordinator output: task type + extracted trip parameters |
| `TripOutline` / `PlanDay` | LLM itinerary schema: 1–30 days, max 6 activities/day |
| `ChatRequest` | Validated chat message: 1–4000 chars, non-empty |
| `DraftRequest` | Booking draft with idempotency key (alphanumeric, 8–100 chars) |
| `ReservationRequest` | Traveler details with strict validation: DOB, name, email, phone, country code |
| `CheckoutRequest` | Stripe checkout with URLs validated against `FRONTEND_ORIGIN` |

---

### `storage.py` — SQLite Store

| Table | Contents |
|---|---|
| `profiles` | One row per session — serialised `Preferences` JSON |
| `messages` | Conversation history (role, content, payload, timestamp); capped at 100/session |
| `offers` | Time-limited offer snapshots (10-min TTL); auto-purged after 24h |
| `bookings` | Booking records with full offer snapshot; unique `(session, idempotency_key)` |
| `payment_events` | Deduplication table for processed Stripe webhook event IDs |

Booking mutations use `BEGIN IMMEDIATE` transactions to serialise concurrent writes safely.

---

## Frontend Deep Dive

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 + React 19 |
| Styling | Tailwind CSS 4 + CSS Modules per page |
| UI Primitives | Radix UI (Select, Checkbox, NavigationMenu, Slot) |
| Animation | GSAP 3, Motion (Framer Motion) |
| Carousel / Marquee | Swiper 12, react-fast-marquee |
| Icons | Lucide React |
| Auth | Firebase JS SDK (client-side) |

### Pages

| Route | Description |
|---|---|
| `/` | Redirects to `/home` |
| `/home` | Landing page: hero, features, destinations preview, how-it-works, CTA |
| `/planner` | AI chat workspace: chat, day cards, budget breakdown, source links, preferences panel, recommendations |
| `/bookings` | Booking management: flight/hotel search, offer cards, quote/draft/reserve/checkout flow |
| `/destination_all` | Browse all catalog destinations |
| `/destination_india` | India-focused destination page |
| `/blog` | Travel articles and guides |
| `/about` | About the product |
| `/login` | Firebase Google Sign-In |

### API Proxy (`app/api/[...path]/`)

All frontend API calls go through a Next.js catch-all proxy that:
1. Injects the `X-Service-Key` header (server-side env only — never exposed to browser)
2. Forwards session cookies for authenticated requests
3. Keeps all AI/search provider keys off the client (`NEXT_PUBLIC_*` = Firebase config only)

---

## Data Flow

### AI Planning Request

```
User types message in /planner
  --> POST /api/planner { message }
  --> Next.js proxy --> FastAPI POST /api/planner
  --> rate check + concurrency lock
  --> TravelAgent.run(message, preferences, history)
      --> LangGraph: coordinator --> specialists --> itinerary --> budget --> final
  --> Store.append_turn() saves user + assistant messages to SQLite
  --> Returns AgentResponse:
      { answer, itinerary[], budget, sources[], recommendations[], notices[], mode }
  --> Frontend renders: answer + day cards + budget bars + source chips + recommendation cards
```

### Booking Flow

```
User opens /bookings, sets dates + preferences
  --> POST /api/flights or /api/hotels
  --> AmadeusProvider.search_flights/search_hotels()
  --> Offers stored in SQLite (10-min TTL)
  --> "Get Quote" --> POST /api/bookings/quote { offer_id }
      --> AmadeusProvider.reprice() --> fresh snapshot (status=quoted)
  --> "Save Draft" --> POST /api/bookings/drafts { offer_id, confirmed, idempotency_key }
      --> Booking record in SQLite (status=draft)
  --> [Optional] "Reserve" --> POST /api/bookings/{id}/reserve { confirmed, travelers[] }
      --> Pre-flight reprice --> Amadeus flight order
  --> "Pay" --> POST /api/bookings/{id}/checkout { confirmed, success_url, cancel_url }
      --> Stripe Checkout Session --> user redirected to checkout.stripe.com
  --> Stripe webhook --> POST /api/payments/webhook
      --> Signed event verified, amount matched --> paid_pending_fulfillment
```

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/session` | Service key | Exchange Firebase ID token for session cookie |
| `GET` | `/api/auth/me` | Optional | Current authenticated user |
| `GET` | `/api/profile` | Session | Get saved preferences + capabilities |
| `PUT` | `/api/profile` | Session | Save preferences |
| `GET` | `/api/memory` | Session | Get conversation history |
| `DELETE` | `/api/memory` | Session | Clear conversation history |
| `POST` | `/api/planner` | Session | Send message to travel agent |
| `POST` | `/api/ai/agent` | Session | Alias for `/api/planner` |
| `POST` | `/api/flights` | Session | Search Amadeus flight offers |
| `POST` | `/api/hotels` | Session | Search Amadeus hotel offers |
| `POST` | `/api/bookings/quote` | Session | Reprice an offer |
| `POST` | `/api/bookings/drafts` | Session | Create booking draft |
| `GET` | `/api/bookings` | Session | List all bookings |
| `GET` | `/api/bookings/{id}` | Session | Get one booking |
| `POST` | `/api/bookings/{id}/reserve` | Account (login required) | Reserve flight with Amadeus |
| `POST` | `/api/bookings/{id}/checkout` | Account (login required) | Create Stripe Checkout |
| `POST` | `/api/payments/webhook` | Stripe signature | Handle Stripe payment events |
| `GET` | `/health` | None | Backend health + capabilities |
| `*` | `/mcp/*` | Service key | MCP tool server |

---

## Configuration & Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `LLM_PROVIDER` | No | `groq` (default) or `openai` |
| `GROQ_API_KEY` | For AI | Groq API key |
| `GROQ_MODEL` | No | Default: `openai/gpt-oss-20b` |
| `OPENAI_API_KEY` | For AI | OpenAI API key (if using openai provider) |
| `OPENAI_MODEL` | No | Default: `gpt-4.1-mini` |
| `TAVILY_API_KEY` | For search | Tavily web search |
| `TAVILY_MCP_URL` | For MCP search | Alternative: remote Tavily MCP URL |
| `OPENWEATHER_API_KEY` | For weather | OpenWeatherMap current weather |
| `AVIATIONSTACK_API_KEY` | For flight status | Live flight status (IATA codes only) |
| `AMADEUS_CLIENT_ID` | For inventory | Amadeus app key |
| `AMADEUS_CLIENT_SECRET` | For inventory | Amadeus app secret |
| `AMADEUS_ENV` | No | `test` (default) or `production` |
| `AMADEUS_ENABLE_RESERVATIONS` | No | `true` to enable sandbox reservations |
| `AMADEUS_ENABLE_LIVE_RESERVATIONS` | No | `true` to enable live flight orders |
| `FIREBASE_PROJECT_ID` | For auth | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | For auth | Path to Firebase service account JSON |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret (`whsec_...`) |
| `FRONTEND_ORIGIN` | No | Default: `http://localhost:3000` |
| `BACKEND_SERVICE_KEY` | For security | Shared HMAC key for service-to-service calls |
| `DATABASE_PATH` | No | Default: `data/vacanes.sqlite3` |

> **No API keys are required to run the app.** A clearly labelled sample planner works with zero configuration.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `BACKEND_URL` | Yes | Backend base URL (default: `http://127.0.0.1:8000`) |
| `BACKEND_SERVICE_KEY` | No | Must match backend if set |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | For auth | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | For auth | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | For auth | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | For auth | Firebase app ID |

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **PowerShell** (Windows — for convenience scripts)

### One-Command Local Start (Windows)

```powershell
# From the repository root
.\scripts\Start-local.ps1
```

This script:
1. Creates `backend/.venv` if missing
2. Installs Python requirements (cached by requirements hash)
3. Copies `.env.example` files if not present (sample mode works immediately — no keys needed)
4. Runs `npm ci` for the frontend if needed
5. Starts FastAPI backend on `http://127.0.0.1:8000`
6. Starts Next.js dev server on `http://localhost:3000/planner`

### Manual Setup

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # then add your API keys
python -m backend.app           # http://127.0.0.1:8000

# Frontend (separate terminal)
cd frontend
npm ci
copy .env.example .env.local    # then set BACKEND_URL
npm run dev                     # http://localhost:3000
```

### Backup Before Changes

```powershell
.\scripts\Backup.ps1 -Label before-my-change
# Backup saved to ../backups/escapade-<timestamp>-before-my-change
```

---

## Testing

```bash
# Run all backend tests
backend\.venv\Scripts\python.exe -m pytest backend/tests -q

# Run a specific test file
backend\.venv\Scripts\python.exe -m pytest backend/tests/test_commerce.py -v
```

### Test Coverage

| File | What it tests |
|---|---|
| `test_auth.py` | Firebase session verification, token exchange, invalid/expired sessions |
| `test_commerce.py` | Offer search, quote, draft (idempotency), reserve (flight), checkout, Stripe webhook, all edge cases |
| `test_travel.py` | Intent extraction (LLM + fallback parser), itinerary generation, budget allocation, full agent runs |

---

## Design Decisions & Safety Principles

### Honesty-First AI
- All itinerary day cards are marked `"sample": true` — the UI always displays this label
- LLM prompts explicitly forbid: inventing hotel names, fabricating prices, claiming reservations, predicting weather for future dates, or naming venues as accessible/vegan/halal without verified evidence
- Budget allocations carry the notice: *"Target allocation, not provider quotes"*
- Web search results are treated as untrusted data in the prompt, never as instructions to the model

### Commerce Separation
- **The LLM and MCP tools cannot trigger any booking or payment** — these are explicit HTTP endpoints requiring confirmed user intent (`"confirmed": true` in request bodies)
- Offer snapshots are stored server-side; the frontend only receives sanitised public views with no raw Amadeus payloads

### Security
- Service key uses `hmac.compare_digest` (timing-safe comparison, immune to timing attacks)
- Firebase ID tokens must have been issued within the last 300 seconds to be exchanged for a session cookie
- Checkout `success_url` and `cancel_url` are validated against `FRONTEND_ORIGIN` to prevent open redirects
- All private keys live in server-side `.env` only; `NEXT_PUBLIC_*` contains only Firebase web app config (public by design)

### Graceful Degradation
- Every external provider call has a fallback path — the app always returns a useful response even when all APIs are unconfigured
- Capability flags (`/health`, `GET /api/profile`) let the frontend show/hide features dynamically based on what is configured on the server


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

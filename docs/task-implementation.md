# Orchestration implementation and deployment

Upstream `bismay70/escapade` main was fetched and fast-forwarded locally to `399aa67a122f1e2dec3ee5225499875a3f8365d4` on 9 October 2026. Existing fork changes were restored and conflicts reconciled. The safety stash and sibling backup remain available. Nothing has been pushed.

## Interfaces

- `/dashboard`: upstream agent dashboard, roles, memory management, trace metrics and legacy workflow records.
- `/workflows`: preference-aware travel research runs and review history preserved from this fork.
- `/studio`: executable graph builder with saved immutable versions, configurable specialist instructions and enforced tool permissions; conditional routing; review gates; schedules; teams; run results and event timeline.
- Homepage 3D remains below the hero; the hero contains no decorative 3D objects.

The upstream dashboard's workflow records are organizational records, not executable graphs. Use Studio to execute a graph. A review approves research continuation only; neither review system reserves travel or charges money.

## Execution guarantees and limits

The studio accepts up to 16 reachable nodes in an acyclic graph. Supported operations are research, condition (has sources / AI response), human approval, note, and finish. Connections can branch. Reordering is supported for linear graphs; conditional graphs use explicit connections. Arbitrary executable code, URLs and plugins cannot be supplied by browser users.

A completed node saves its output and next node atomically. Approval saves a durable waiting state. Resumption keeps completed outputs. A crash during a read-only research node may repeat that node; this is not exactly-once external API execution or a checkpoint inside every LangGraph specialist. Runs snapshot the creator's current preferences. New and scheduled runs load the latest saved preferences. Team runs never receive private conversation history.

Workers claim runs with a lease, refresh it during execution, and fence stale results with a unique token. Expired leases become claimable. Read-only step failures retry up to three attempts with backoff, then enter dead-letter status. Cancellation invalidates the token, preventing late results from replacing the cancelled state. The current remote HTTP request may finish after cancellation; no subsequent step can commit.

Local SQLite supports multiple workers on one host. For remote worker hosts, set `STUDIO_DATABASE_URL` to the same PostgreSQL database on the API and each worker. The shared queue uses database transactions and an advisory lock for claims/transitions. PostgreSQL transport credentials belong in server environment only. Private chat/commerce remain in the original application store; this is not a horizontally replicated commerce API.

Run an additional worker from the repository root:

```
backend/.venv/Scripts/python.exe -m backend.worker
```

For separate workers, set `STUDIO_EMBEDDED_WORKER=0` on the API. Schedules require a running worker, persist between restarts, use UTC timestamps, and coalesce missed repetitions into one catch-up run. The minimum repeating interval is 15 minutes. Workspaces have bounded active queues and schedules.

## Teams and identity

Firebase sign-in is required to create a shared workspace. Owners explicitly add a Firebase UID and assign editor, reviewer or viewer. Editors build and launch; reviewers approve; viewers read; owners have both privileges. There is no email invitation delivery. Guest studio work remains scoped to the server-issued guest cookie. Team members can see the shared brief, selected preferences, outputs and events. Membership removal disables that member's future scheduled execution.

## Memory and observability

Long-term memory stores 384-dimensional local hashed word/trigram vectors and uses cosine similarity. It is lexical similarity, not a neural semantic embedding model. Updates replace the same identity/key; deletes remove its vector. Existing non-vector records are embedded during retrieval. No new key or third-party data transfer is needed.

Studio records audit events, statuses, attempt counts and step duration. OpenTelemetry spans share the run UUID as trace ID and contain node metadata, not user briefs, preferences, prompts or API keys. Set `OTEL_EXPORTER_OTLP_ENDPOINT` / standard OTLP headers to enable an external collector. Export is disabled by default. Setup follows the official Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/.

## Container setup

`compose.yaml` defines PostgreSQL, the API and a separately scalable worker. Set `PG_PASSWORD` (URL-safe random value) and `FIREBASE_JSON_PATH` to the existing private service-account JSON. Provider keys are read from ignored `backend/.env`. Images exclude environment files, credentials and local databases. Start the frontend separately with its existing environment settings.

```
docker compose up --build --scale worker=2
```

The API binds to loopback; PostgreSQL is not published to the host. Add TLS, managed database backups and hosting-specific secret management before remote deployment. Docker/PostgreSQL integration requires a Docker runtime or a test PostgreSQL URL; it has not been verified by the local SQLite test suite.

## Remaining roadmap work

This implements the workflow platform's core user-facing operations, but it is not a claim that every enterprise research suggestion in task.md is complete. Remaining: arbitrary connector SDK and email/Slack/calendar adapters, neural semantic embeddings, agent-to-agent network protocol, editable model credentials, collaborative file editing, external notifications, automatic quality/drift evaluation, multi-region/Kubernetes deployment, load/penetration testing, legal privacy policies, and independent compliance certification. The optional PostgreSQL and collector paths require integration testing with those services. No external service has been provisioned or billed by this change.

## Backups and keys

Continue using `scripts/Backup.ps1` before source changes. Back up the PostgreSQL studio database separately with `pg_dump` when configured. The script's SQLite copy does not include remote PostgreSQL data. Existing Groq, Tavily, Aviationstack and Firebase credentials remain in their original ignored locations. Core Studio does not need another API key. An OTLP collector may require a vendor token; distributed workers require a PostgreSQL connection string. Live booking/weather/payment provider limitations in README still apply.

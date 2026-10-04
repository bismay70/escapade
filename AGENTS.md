# Working on Vacanes

- Before making future source changes, run `scripts/Backup.ps1 -Label before-<change>` from the repository root. The user requires a recoverable backup before changes. Keep backups in the sibling `../backups` directory.
- Keep a single Python backend under `backend/`. Use package imports (`from backend...`) and paths derived from `__file__`. Do not introduce a competing root `pythonbackend` folder or references to missing templates/static/MCP scripts.
- Keep provider credentials in ignored `backend/.env`. Frontend server settings belong in `frontend/.env.local`; never expose AI/search keys through `NEXT_PUBLIC_*`.
- Preference and history changes must be scoped to the server-issued session. New saved preferences override older conversation memory.
- Label sample guidance, cost allocations, web research and provider failures honestly. Do not claim live ticket prices, confirmed bookings, or future weather forecasts from unsupported APIs.
- Verify backend changes with `backend/.venv/Scripts/python.exe -m pytest backend/tests -q`. Verify frontend changes with TypeScript and relevant lint checks, then a production build when appropriate.

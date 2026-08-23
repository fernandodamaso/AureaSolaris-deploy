# Setup Guide — Private Web V1

The supported application runtime is the private Web V1: React/Vite in `apps/web`, FastAPI in `services/api`, and Supabase for authentication/private persistence.

## Requirements

- Node.js 22
- npm
- Python 3.12
- Docker and Supabase CLI for disposable schema/RLS checks and the full local E2E harness

## Install dependencies

From the repository root:

```bash
npm ci
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
```

## Frontend development

```bash
npm run dev:web
```

Frontend configuration uses the `VITE_*` variables documented in [`.env.example`](../.env.example). Never put production secrets in a Vite variable.

## Web API

The API requires Python 3.12 and the server-side `AUREA_*` values documented in [`.env.example`](../.env.example). See [`services/api/README.md`](../services/api/README.md) for API validation and [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) for environment boundaries.

## Disposable integrated E2E

For the authoritative local browser flow, use:

```bash
python tools/run_e2e.py
```

This harness starts disposable local Supabase infrastructure, creates a synthetic identity, starts the authenticated API and a Vite preview on free loopback ports, runs Playwright, and cleans up. It is test infrastructure, not a user-facing local runtime.

Never point automated checks at a person's real Aurea data or a real desktop database/backup retained from historical versions.

## Quality gates

### Web

```bash
npm run check:web
npm run assert:web-only
```

### API

```bash
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

### Full repository

With Docker and Supabase CLI running:

```bash
npm run quality:gate
```

### E2E

```bash
python tools/run_e2e.py
```

## Related documentation

- [`../AGENTS.md`](../AGENTS.md) — mandatory agent and privacy rules
- [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — compact task routing
- [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) — preview/production boundaries
- [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md) — Supabase operations
- [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md) — web deployment operations
- [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) — API deployment operations

Historical desktop release evidence remains recoverable from Git but is not a supported setup path.

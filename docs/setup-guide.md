# Setup Guide — Private Web V1

The supported application runtime is the hosted Private Web V1: React/Vite in `apps/web`, FastAPI in `services/api`, Vercel for web/API hosting, and Supabase for Auth/private Postgres/RLS. Railway is not part of Web V1.

Development happens in `vivicabsb-eng/AureaSolaris`. `fernandodamaso/AureaSolaris-deploy` is deployment-only and must not be used as a development checkout.

## Requirements

- Node.js 22
- npm
- Python 3.12
- Docker and Supabase CLI for disposable schema/RLS checks and the full local E2E harness

## Install dependencies

From the source-of-truth repository root:

```bash
npm ci
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
```

## Frontend development

```bash
npm run dev:web
```

This starts a developer server. It is not an alternative user-facing Aurea runtime and does not change the hosted production architecture.

Frontend configuration uses the `VITE_*` variables documented in [`.env.example`](../.env.example). Never put production secrets, service credentials, or database credentials in a Vite variable.

## Web API development

The API requires Python 3.12 and the server-side `AUREA_*` values documented in [`.env.example`](../.env.example). See [`services/api/README.md`](../services/api/README.md) for API validation and [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) for preview/production boundaries.

For local development, use only test/development configuration. Do not copy production database credentials or provider secrets into source files, shell history, tickets, or documentation.

## Disposable integrated E2E

For the authoritative local browser flow, use:

```bash
python tools/run_e2e.py
```

This harness starts disposable local Supabase infrastructure, creates synthetic identities, starts the authenticated API and a Vite preview on free loopback ports, runs Playwright, and cleans up. It is test infrastructure, not a user-facing local product runtime.

Never point automated checks at a person's real Aurea data, retained historical databases/backups, or production private records.

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

With Docker and Supabase CLI available:

```bash
npm run quality:gate
```

### E2E

```bash
python tools/run_e2e.py
```

## Hosted preview and production

Do not deploy from an arbitrary working tree. Hosted candidates are tied to exact Git SHAs and are verified against the deployment mirror.

For a promotion/deployment issue:

1. verify the source-of-truth upstream SHA;
2. verify the exact authorized SHA on `fernandodamaso/AureaSolaris-deploy`;
3. verify the Vercel web/API deployments record that mirror repository/ref/SHA;
4. verify the expected aliases and environment boundaries;
5. run the hosted verification required by the issue.

An upstream/mirror difference is allowed when no promotion has been authorized. Do not “fix” it as drift without the promotion contract.

## Agent autonomy

Within an already-approved issue, routine provider configuration, exact-SHA mirror updates, deployments, approved migrations, PR review/fix loops, and clean merges after final verification do not require additional human confirmation. Stop for destructive/user-data actions, credential disclosure/provisioning, material identity/environment ambiguity, or provider state that contradicts the approved contract.

## Related documentation

- [`../AGENTS.md`](../AGENTS.md) — mandatory agent and privacy rules
- [`CONSTITUICAO.md`](CONSTITUICAO.md) — normative product/data contract
- [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — compact task routing
- [`arquitetura.md`](arquitetura.md) — current Web V1 architecture
- [`data-persistence.md`](data-persistence.md) — persistence and owner boundaries
- [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) — preview/production boundaries
- [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md) — Supabase operations
- [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md) — web deployment operations
- [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) — API deployment operations
- [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md) — incident, disablement, rotation, and rollback

Historical desktop/local release evidence remains recoverable from Git but is not a supported setup path.
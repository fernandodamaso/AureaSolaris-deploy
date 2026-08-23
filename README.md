# Aurea Solaris

Aurea Solaris Private Web V1 is a browser application in `apps/web`, backed by the authenticated FastAPI service in `services/api` and private Supabase storage. The former desktop/local application runtime has been retired; historical records may still describe it, but they are not supported execution paths.

FDM-735 owns the broader product/operations documentation normalization after this runtime retirement. This README reflects the executable repository truth needed to build and validate the current Web V1.

## Start here as an AI agent

Read in this order:

1. [`AGENTS.md`](AGENTS.md) — mandatory safety, privacy, repository, and validation rules.
2. [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md) — normative product/data decisions.
3. [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) — current task routing and validation loop.
4. [`docs/index.md`](docs/index.md) — domain references.

Do not read the entire `docs/` tree by default. Use the smallest current domain reference needed for the task.

## Runtime map

| Area | Current entry points |
| --- | --- |
| React Web V1 | `apps/web/src/App.tsx`, `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/features/` |
| Browser authentication | `apps/web/src/auth/` |
| Web API | `services/api/src/aurea_api/`, `services/api/api/index.py` |
| Certified astrology engine | `services/api/src/aurea_api/domain/astrology/`, `services/api/ephe/` |
| Private schema / RLS | `supabase/migrations/`, `supabase/tests/` |
| Editorial corpus | `knowledge/engenharia_astrologica/` |
| Disposable Web V1 E2E | `tools/run_e2e.py`, `tools/e2e_api.py`, `apps/web/e2e/` |
| Hosted verification | `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py` |

## Development setup

Requirements:

- Node.js 22
- Python 3.12
- npm
- Docker and the Supabase CLI for disposable schema/RLS and full E2E checks

From the repository root:

```bash
npm ci
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
```

Run the frontend development server with:

```bash
npm run dev:web
```

The Web API requires the environment documented in [`.env.example`](.env.example) and [`services/api/README.md`](services/api/README.md). For an integrated local verification environment, prefer the disposable harness instead of wiring a personal environment:

```bash
python tools/run_e2e.py
```

That harness creates disposable test infrastructure and must never be pointed at a person's real Aurea data.

## Quality commands

```bash
npm run check:web
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

With Docker and the Supabase CLI available, the repository-wide gate is:

```bash
npm run quality:gate
```

The authoritative isolated browser gate is:

```bash
python tools/run_e2e.py
```

## Product/data boundaries

- Editorial astrology knowledge and private person-owned records remain separate trust domains.
- Private Web V1 access is authenticated and owner-scoped.
- Astrological calculations preserve UTC, IANA timezone, location, configuration, engine/ephemeris version, and input hash.
- Never commit secrets or point automated tests at real personal data.
- Historical release/desktop evidence is recoverable from Git and is not a current execution target.

# Aurea Solaris

Aurea Solaris Private Web V1 is a browser application in `apps/web`, backed by the authenticated FastAPI service in `services/api` and private Supabase storage. Vercel hosts the web and API projects; Supabase owns Auth, Postgres, and Row Level Security (RLS). Railway is not part of Web V1.

The former desktop/local product runtime is retired. Historical records may still describe it, but they are not supported execution paths.

## Repository topology

- **Development/source of truth:** `vivicabsb-eng/AureaSolaris`
- **Deployment-only mirror:** `fernandodamaso/AureaSolaris-deploy`

Development, branches, PRs, CI, and merges happen in the source-of-truth repository. The deployment mirror is updated only to an exact, already-validated SHA when a promotion is authorized. An upstream/mirror SHA difference can therefore be intentional and is not automatically drift.

## Current Private Web V1 scope

The released private flow includes:

- authentication;
- profile and onboarding;
- persisted birth profile;
- Mandala/dashboard;
- certified natal calculations;
- certified transit calculations;
- persisted calculation receipts.

Editorial astrology knowledge and provenance are a separate, impersonal domain. Private person-owned data never becomes editorial corpus data.

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
| Incident / rollback | `docs/operations/INCIDENT_AND_ROLLBACK.md` |

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

That harness creates disposable test infrastructure and synthetic identities. It is not a user-facing local Aurea runtime and must never be pointed at a person's real data or retained historical databases/backups.

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

- Browser identity comes from Supabase Auth and is validated by the API.
- Product persistence uses owner-scoped FastAPI repositories backed by Supabase/Postgres; RLS is defense in depth.
- Private tables and relationships preserve the authenticated `user_id`; future multi-user expansion keeps the same boundary.
- Astrological calculations preserve UTC, IANA timezone, location, configuration, engine/ephemeris version, and input hash.
- Never commit secrets or point automated tests at real personal data.
- Historical desktop/local release evidence is recoverable from Git and is not a current execution target.

## Operations

Current runbooks are under [`docs/operations/`](docs/operations/). Safe production verification checks the upstream SHA, authorized mirror SHA, Vercel deployment SHA, canonical aliases, and web/API health. An application rollback restores a compatible last-known-good web/API deployment and does not destructively roll back user data.

Within an already-approved issue, routine provider configuration, exact-SHA mirror promotion, deployments, approved migrations, PR review/fix loops, and clean merges are agent-autonomous unless a destructive, user-data, credential, or material environment-identity boundary is encountered.
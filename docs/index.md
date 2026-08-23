# Aurea Solaris — AI Documentation Index

Use this as a routing map, not a reading list.

1. [`AGENTS.md`](../AGENTS.md) — mandatory rules.
2. [`CONSTITUICAO.md`](CONSTITUICAO.md) — normative product/data decisions.
3. [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — current runtime/task map and validation loop.
4. The relevant domain reference below.

## Current domain references

| Domain | Source of truth |
| --- | --- |
| Web V1 setup | [`setup-guide.md`](setup-guide.md), [`CONFIGURACAO_DE_TRABALHO.md`](CONFIGURACAO_DE_TRABALHO.md) |
| Current architecture | [`arquitetura.md`](arquitetura.md) |
| React/UI/accessibility | `../apps/web/src/`, [`accessibility.md`](accessibility.md) |
| Web API/auth | `../services/api/`, [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) |
| Supabase/private schema | [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md), [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md) |
| Persistence and data boundaries | [`data-persistence.md`](data-persistence.md), [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md) |
| Environments/deployment | [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md), [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md), [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) |
| Incident/rollback | [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md) |
| Astrology engine | [`astrology-engine.md`](astrology-engine.md), [`ENGINE_CERTIFICATION_PLAN.md`](ENGINE_CERTIFICATION_PLAN.md), [`astrology-knowledge-contract.md`](astrology-knowledge-contract.md) |
| Editorial corpus/library | [`BIBLIOTECA_VISUAL.md`](BIBLIOTECA_VISUAL.md), [`data/ENGENHARIA_SYNC_PLAYBOOK.md`](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Integrations/roadmap | [`google-calendar-integration.md`](google-calendar-integration.md), [`ROADMAP.md`](ROADMAP.md) |
| Deployment evidence | [`operations/deployments/`](operations/deployments/) |
| Historical release/cleanup evidence | [`RELEASE_VALIDATION_2026-08-10.md`](RELEASE_VALIDATION_2026-08-10.md), [`archive/`](archive/) |

## Current executable state

- Private Web V1 is the only active application runtime.
- Vercel hosts web/API; Supabase owns Auth/Postgres/RLS; Railway is not part of Web V1.
- `vivicabsb-eng/AureaSolaris` is the development source of truth.
- `fernandodamaso/AureaSolaris-deploy` is deployment-only and receives an exact validated SHA only when promotion is authorized.
- The authenticated Web API and Supabase owner isolation are current supported boundaries.
- Current Web V1 scope is authentication, profile/onboarding, persisted birth profile, Mandala/dashboard, certified natal/transit calculations, and persisted receipts.
- Disposable local E2E is provided by `../tools/run_e2e.py`; it is test infrastructure only.
- Historical desktop/local release material is not a supported runtime target.

## Data-domain rule

Private person-owned application data remains separate from editorial astrology knowledge/provenance. Multi-user expansion preserves authenticated owner identity, owner-scoped API operations, RLS, and cross-owner relationship protections.

## Operations rule

Production verification is SHA-based: verify upstream, authorized mirror, Vercel deployment metadata, aliases, and health. An upstream/mirror difference may be intentional when a newer upstream commit has not been promoted.

Application rollback restores a compatible known-good web/API version without destructive user-data actions. Follow [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md).
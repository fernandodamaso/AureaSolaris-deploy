# Aurea Solaris — AI Documentation Index

Use this as a routing map, not a reading list.

1. [`AGENTS.md`](../AGENTS.md) — mandatory rules.
2. [`CONSTITUICAO.md`](CONSTITUICAO.md) — normative product/data decisions.
3. [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — current runtime/task map and validation loop.
4. The relevant domain reference below.

## Current domain references

| Domain | Source of truth |
| --- | --- |
| Web V1 setup | [`setup-guide.md`](setup-guide.md), [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) |
| React/UI/accessibility | `../apps/web/src/`, [`accessibility.md`](accessibility.md) |
| Web API/auth | `../services/api/`, [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) |
| Supabase/private schema | [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md), [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md) |
| Environments/deployment | [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md), [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md) |
| Astrology engine | [`astrology-engine.md`](astrology-engine.md), [`ENGINE_CERTIFICATION_PLAN.md`](ENGINE_CERTIFICATION_PLAN.md), [`astrology-knowledge-contract.md`](astrology-knowledge-contract.md) |
| Editorial corpus/library | [`BIBLIOTECA_VISUAL.md`](BIBLIOTECA_VISUAL.md), [`data/ENGENHARIA_SYNC_PLAYBOOK.md`](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Data-domain boundaries | [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md) |
| Integrations/roadmap | [`google-calendar-integration.md`](google-calendar-integration.md), [`ROADMAP.md`](ROADMAP.md) |
| Deployment evidence | [`operations/deployments/`](operations/deployments/) |
| Historical release/cleanup evidence | [`RELEASE_VALIDATION_2026-08-10.md`](RELEASE_VALIDATION_2026-08-10.md), [`archive/`](archive/) |

## Current executable state

- Private Web V1 is the only active application runtime.
- The authenticated Web API and Supabase owner isolation are current supported boundaries.
- Disposable local E2E is provided by `../tools/run_e2e.py`; it is test infrastructure only.
- Historical desktop/local release material is not a supported runtime target.
- Broader documentation normalization after the removal is intentionally handled by FDM-735.

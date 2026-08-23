# FDM-734 Legacy Runtime Removal Inventory

Recovery commit: `19f272acace62403e21a83ddfe842759a83617c6`

This inventory covers Git-tracked runtime/build/test surfaces only. No real Aurea user data, desktop SQLite database, backup, or directory outside Git may be inspected or modified.

| Decision | Path / surface | Reason / replacement |
| --- | --- | --- |
| DELETE | root loopback API/browser workspace/local-storage implementation | Retired user-facing local product runtime; hosted Web V1 uses `services/api`. |
| DELETE | root `persistence/` | Repository wrappers around retired private/local storage. |
| DELETE | complete native desktop tree | Entire native runtime, configuration, local migrations, icons and packaged binary; recoverable from recovery commit. |
| DELETE | historical launcher/build/packaging scripts and obsolete root runtime requirements | Retired product launch and packaging paths. |
| DELETE | obsolete local-runtime Python and Windows smoke tests | Their only contract was the deleted product runtime/package/launcher. |
| DELETE | dead Web Tauri/browser-command compatibility closure | Guarded reverse-dependency analysis proved 33 files in the retired closure and zero overlap with the 54-file active Web V1 graph before deletion. |
| DELETE | obsolete native IPC current-target document | Described a removed implementation and would otherwise remain an executable-looking current target. History remains in Git. |
| MIGRATE | editorial knowledge schema | Preserved as `knowledge/engenharia_astrologica/knowledge/aurea_editorial_schema.sql`; private native migrations were not migrated. |
| MIGRATE | `tools/import_engenharia_to_aurea.py` | Preserved editorial/provenance tooling; now initializes the impersonal schema directly and has no retired runtime dependency. |
| MIGRATE | Web V1 E2E personal-data guard | Safety check moved into `tools/run_e2e.py`; obsolete local seeder was not restored. |
| KEEP | `tools/run_e2e.py`, `tools/e2e_api.py` | Supported disposable local **test harness** for Web V1, not a user-facing local runtime. |
| KEEP | hosted preview/provider verification scripts | Current hosted acceptance and provenance tooling. |
| KEEP | `apps/web` reachable Web V1 graph | Current private web product. |
| KEEP | `services/api` | Current authenticated FastAPI package boundary. |
| KEEP | `supabase/` | Current schema, migration, disposable RLS validation. |
| KEEP | `knowledge/` and API ephemeris assets | Certified/editorial assets, provenance and Swiss Ephemeris data. |
| KEEP | certified engine and hosted-verifier root tests | Current calculation/provider/security contracts. |
| KEEP | root `astro_engine.py`, `engine_governance.py` | Thin calculation compatibility imports used by characterization/transition contracts; not application runtimes. |
| UPDATE | `.github/workflows/e2e.yml` | Now installs supported API/test dependencies, builds Web V1 and runs only the disposable Web V1 Playwright harness. |
| UPDATE | `.github/python-test-classification.txt` | Only surviving supported root Python modules; every module is classified exactly once. |
| UPDATE | root/web package manifests and lockfile | Removed native desktop scripts/dependencies; guarded lock regeneration removed 14 package records with no retained package version changes. |
| UPDATE | README, agent guide, setup guide, docs index, environment example, API README | Current operational targets no longer instruct agents/users to launch the retired runtime. FDM-735 still owns the broader product/operations documentation normalization. |
| KEEP/HISTORY | `docs/archive/**`, FDM-732/FDM-733 deployment evidence and old plans/specs | Historical/recovery evidence may describe removed behavior. Do not rewrite history. |

## Pre-removal production rollback evidence

- upstream `main`: `19f272acace62403e21a83ddfe842759a83617c6`
- deployment mirror `main`: same exact SHA
- web production: `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` — READY, Git `main`, exact recovery SHA
- API production: `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf` — READY, Git `main`, exact recovery SHA
- previous API recovery deployment retained by Vercel: `dpl_BUGEYMRWEgZWzJEEDemGD9tPv5P8`
- canonical web `/`: HTTP 200 immediately before removal
- canonical API `/health`: HTTP 200 immediately before removal

## Execution validation checkpoints

- TDD RED: new editorial-importer boundary test was the sole failure while 104 pre-existing Python tests passed.
- Importer GREEN: normal Python Quality passed after moving the impersonal schema under `knowledge/` and removing local-runtime imports.
- Guarded Web cleanup: 33-file retired compatibility closure, 54-file active Web V1 graph, zero intersection; `npm run check:web` passed with 32 Vitest files / 171 tests and a production build.
- Package-lock cleanup: 14 retired native package records removed; no retained package version changed.
- CI-retirement dry verification: 38 surviving root Python tests passed before the verified tree was committed through the GitHub API.
- Clean-head structural run at `f83e29706323b26cf905ee462fcc7b568636c27c`: Frontend Quality PASS, Python Quality PASS, Web API Quality PASS, Web V1 Web/API/API-deploy-contract/Schema jobs PASS, standalone Supabase Schema PASS; isolated E2E was still running when the current-target documentation guard was prepared.

A final post-documentation CI/E2E, production-baseline smoke, stale-reference/secret scan, and full PR diff review are required before FDM-734 can be marked Done.

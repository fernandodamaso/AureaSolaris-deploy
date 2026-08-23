# FDM-734 Legacy Runtime Removal Inventory

Recovery commit: `19f272acace62403e21a83ddfe842759a83617c6`

This inventory covers Git-tracked runtime/build/test surfaces only. No real Aurea user data, desktop SQLite database, backup, or directory outside Git may be inspected or modified.

| Decision | Path / surface | Reason / replacement |
| --- | --- | --- |
| DELETE | `main_api.py` | Retired loopback FastAPI/browser bridge; hosted Web V1 uses `services/api`. |
| DELETE | `browser_workspace.py` | Local-owner/browser workspace command implementation used by retired runtime. |
| DELETE | `local_storage.py` | Desktop/local SQLite facade; hosted private data is Supabase + `services/api` repositories. |
| DELETE | `persistence/**` | Repository wrappers around retired local storage/private SQLite/Hermes runtime. |
| DELETE | `src-tauri/**` | Entire desktop/native runtime, Cargo config, capabilities, migrations, icons and packaged sidecar binary. Recoverable from recovery commit. |
| DELETE | `build.bat`, `build_sidecar.spec` | Retired PyInstaller/Tauri packaging. |
| DELETE | `launch_chrome.bat`, `launch_chrome.ps1`, `run_tauri.bat`, `start-dev.bat` | Retired product launch paths. Disposable test harness remains `tools/run_e2e.py`. |
| DELETE | `requirements-api.txt` | Legacy sidecar/runtime dependency bundle including PyInstaller; CI will install `services/api[dev]` directly. |
| DELETE | `tools/clean-generated.ps1` | Release/local generated-artifact cleanup coupled to retired desktop paths; not part of Web V1 gate. |
| DELETE | `tools/seed_test_user.py` | Seeds retired local SQLite/test-user life; Web V1 E2E uses isolated hosted/API test identity paths instead. |
| DELETE | `tests/test_browser_runtime.py` | Explicit `main_api` + browser-command + local SQLite contract. |
| DELETE | `tests/test_chat_provider_selection.py` | Explicit retired `main_api` `/chat` contract. |
| DELETE | `tests/test_compiled_runtime_smoke.py` | Explicitly launches retired `main_api.py`; current CI preflight to remove. |
| DELETE | `tests/test_hermes_mind_api.py` | Retired local Hermes/local-storage API contract. |
| DELETE | `tests/test_local_storage.py` | Retired desktop/local SQLite behavior. |
| DELETE | `tests/test_persistence_repositories.py` | Tests wrappers around retired `persistence/`. |
| DELETE | `tests/test_pytest_capture_runtime.py` | Only asserts importing retired `main_api`. |
| DELETE | `tests/test_seed_test_user.py` | Tests retired local test-user seeding/local storage. |
| DELETE | `tests/test_clean_generated.py` | Tests retired PowerShell release/local artifact cleaner. |
| DELETE | `tests/browser_runtime_packaged_smoke.ps1`, `tests/browser_runtime_process_tree.ps1`, `tests/browser_runtime_smoke.ps1`, `tests/manual_launcher_verify.ps1`, `tests/mandala_visual_smoke.ps1` | Windows/local runtime, launcher or packaged-runtime smoke surfaces. |
| DELETE | `apps/web/src/utils/tauri.ts`, `apps/web/src/__tests__/utils/tauri.test.ts` | Dead Tauri + `/browser/command` compatibility bridge; active Web V1 graph already forbids these markers. |
| REVIEW/DELETE | `apps/web/src/services/diary.ts`, `apps/web/src/services/notebook.ts`, `apps/web/src/services/chat.ts` and direct tests/importers | They import the retired bridge. Delete only if outside the supported Web V1 reachable graph; otherwise migrate to supported API contracts. |
| MIGRATE | `src-tauri/migrations/knowledge/0001_initial.sql` | Impersonal editorial schema must survive under `knowledge/engenharia_astrologica/knowledge/aurea_editorial_schema.sql`. Private Tauri migrations do not migrate. |
| MIGRATE | `tools/import_engenharia_to_aurea.py` | Preserve editorial/provenance importer, but initialize its SQLite schema directly from preserved `knowledge/` schema; no `LocalStorage` or `src-tauri`. |
| KEEP | `tools/run_e2e.py`, `tools/e2e_api.py` | Supported disposable local **test harness** for Web V1, explicitly not the retired product runtime. |
| KEEP | `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py`, smoke/deployment verification scripts | Hosted acceptance and provider verification. |
| KEEP | `apps/web/**` reachable Web V1 shell/profile/Mandala/natal/transit source and supported tests | Current private web product. |
| KEEP | `services/api/**` | Current authenticated FastAPI package boundary. |
| KEEP | `supabase/**` | Current schema, migration and disposable RLS validation. |
| KEEP | `knowledge/**` and `services/api/ephe/**` | Certified/editorial assets, provenance and Swiss Ephemeris data. |
| KEEP | `tests/test_engine_utc_boundary.py`, `tests/test_web_v1_engine_contract.py`, `test_transit.py` | Direct certified engine behavior; no retired runtime dependency. |
| KEEP | `tests/test_preview_verification_script.py`, `tests/test_vercel_preview_verifier.py`, `tests/test_run_e2e.py` | Current hosted/Web V1 verification tooling. |
| REVIEW | `astro_engine.py`, `engine_governance.py` | Thin Web V1 package compatibility imports, not a runtime. Remove only if final stale-reference scan proves no current consumer; certified engine package itself remains under `services/api`. |
| UPDATE | `.github/workflows/e2e.yml` | Remove compiled local-runtime smoke and legacy requirements; keep Web V1 build + Playwright + `tools/run_e2e.py`. |
| UPDATE | `.github/python-test-classification.txt` | Remove deleted tests; every surviving `tests/test_*.py` must remain classified exactly once. |
| UPDATE | root `package.json`, `apps/web/package.json`, `package-lock.json` | Remove Tauri scripts/declarations/lock entries only; no unrelated upgrades. |
| KEEP/HISTORY | `docs/archive/**`, FDM-732/FDM-733 deployment evidence and old plans | Historical/recovery evidence may name the old runtime. Do not rewrite history. |
| UPDATE-LATER | broader product/operations narrative | FDM-735 owns the post-removal web-first documentation rewrite. FDM-734 changes only executable/current references necessary for a coherent repository. |

## Pre-removal production rollback evidence

- Web production: `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` — READY, Git `main`, SHA `19f272acace62403e21a83ddfe842759a83617c6`.
- API production: `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf` — READY, Git `main`, SHA `19f272acace62403e21a83ddfe842759a83617c6`.
- Previous API recovery deployment retained by Vercel: `dpl_BUGEYMRWEgZWzJEEDemGD9tPv5P8`.

Final validation evidence will be appended before FDM-734 is marked Done.

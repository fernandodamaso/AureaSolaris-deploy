# FDM-734 Desktop/Local Runtime Retirement Design

## Goal

Retire the verified obsolete desktop/local Aurea runtime after FDM-733 production parity, leaving `apps/web`, `services/api`, Supabase, certified astrology assets, and disposable Web V1 test tooling as the only active application/runtime surfaces.

## Recovery anchor

Pre-removal upstream and deployment-mirror commit:

`19f272acace62403e21a83ddfe842759a83617c6`

Fresh pre-removal production evidence on 2026-08-22:

- upstream `main`: `19f272acace62403e21a83ddfe842759a83617c6`
- deployment mirror `main`: `19f272acace62403e21a83ddfe842759a83617c6`
- web production: `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S`, READY, Git `main`, exact SHA
- API production: `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf`, READY, Git `main`, exact SHA
- canonical web `/`: HTTP 200
- canonical API `/health`: HTTP 200

No local Aurea user directory, SQLite database, backup, or data outside Git is in scope.

## Retirement boundary

### Delete

Delete Git-tracked surfaces whose supported purpose is the retired desktop/local product runtime:

- root `main_api.py`, `browser_workspace.py`, `local_storage.py`, and `persistence/`;
- `src-tauri/` including native source, capabilities, migrations, icons, Cargo metadata, and bundled sidecar binary;
- desktop/local launchers and packaging (`build.bat`, `build_sidecar.spec`, `launch_chrome.*`, `run_tauri.bat`, `start-dev.bat`);
- obsolete PyInstaller/local-runtime requirements and generated-artifact cleanup whose contract is the retired packaging/runtime;
- tests and PowerShell smokes that launch, package, seed, or assert `main_api.py`, local-owner/browser-command, Tauri, or local SQLite runtime behavior;
- dead web compatibility code whose only transport is Tauri or `/browser/command`, together with tests that only cover that path.

### Keep

Preserve:

- `apps/web` Web V1 reachable shell and supported tests;
- `services/api` authenticated FastAPI service, auth/JWT/RLS, repositories, astrology package and tests;
- `supabase/` migrations and disposable schema/RLS tests;
- `tools/run_e2e.py` and `tools/e2e_api.py` as disposable Web V1 test infrastructure;
- hosted verification/deployment tooling;
- `knowledge/`, Swiss Ephemeris assets, calculation fixtures, governance/provenance, deployment records, and Git history;
- root tests that directly protect certified engine or hosted verification contracts.

### Migrate instead of delete

`tools/import_engenharia_to_aurea.py` is editorial/provenance tooling but currently bootstraps its impersonal SQLite schema through `LocalStorage` and `src-tauri/migrations/knowledge/0001_initial.sql`. Preserve that behavior by moving the editorial schema under `knowledge/engenharia_astrologica/knowledge/` and making the importer initialize the schema directly. This prevents a knowledge/provenance tool from keeping the retired runtime alive.

## CI end state

- `.github/workflows/e2e.yml` installs the API package/dev dependencies directly, builds Web V1, installs Chromium, and runs `python tools/run_e2e.py`.
- It no longer launches `tests.test_compiled_runtime_smoke` or labels Web V1 E2E as a local-product runtime gate.
- `.github/python-test-classification.txt` contains every surviving `tests/test_*.py` exactly once and no deleted paths.
- Root and web package scripts contain no Tauri command.
- Tauri/PyInstaller packages are not declared as supported build/runtime dependencies.

## Validation

Required before completion:

1. Web V1 quality gate.
2. API quality and Vercel deployment-contract checks.
3. Disposable Supabase schema/RLS validation.
4. Isolated Web V1 Playwright through `tools/run_e2e.py` without `main_api.py`.
5. Certified engine/Swiss Ephemeris checks.
6. Repository stale-runtime scans for Tauri, `main_api.py`, ports 9876/9878, local-owner/browser-command, PyInstaller/sidecar, and deleted launchers.
7. Production web/API smoke remains green against the FDM-733 baseline.
8. Secret scan and complete PR diff review.

Historical deployment/evidence documents may describe the removed runtime as history; current operational targets must not instruct users or CI to run it. Broader product-documentation truth is FDM-735.
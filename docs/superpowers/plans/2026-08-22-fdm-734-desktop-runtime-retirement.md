# FDM-734 Desktop/Local Runtime Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete desktop/local runtime and every CI/test/build dependency that keeps it alive while preserving Web V1, certified astrology behavior, and editorial provenance.

**Architecture:** Perform a forward-only, inventory-first retirement from the verified FDM-733 SHA. Delete runtime-specific surfaces in coherent groups; migrate the one editorial importer dependency away from local storage/Tauri; then make CI and test routing describe only Web V1. Production and deployment-mirror refs are not modified by this issue.

**Tech Stack:** React/Vite/TypeScript, Python 3.12/FastAPI, pytest/unittest, GitHub Actions, Supabase CLI/pgTAP, Vercel, Swiss Ephemeris.

**Spec:** `docs/superpowers/specs/2026-08-22-fdm-734-desktop-runtime-retirement-design.md`

## Global Constraints

- Recovery commit is `19f272acace62403e21a83ddfe842759a83617c6`.
- Never inspect, migrate, delete, or modify real local Aurea user data, desktop SQLite databases, or backups outside Git.
- Preserve certified astrology behavior, ephemeris assets, provenance, and reference tests.
- Preserve `tools/run_e2e.py` / `tools/e2e_api.py` as disposable Web V1 test infrastructure.
- No unrelated dependency upgrades.
- FDM-735 owns the broader web-first documentation rewrite.

---

### Task 1: Lock recovery evidence and classify the removal

**Files:**
- Create: `LEGACY_REMOVAL_INVENTORY.md`
- Create: `docs/superpowers/specs/2026-08-22-fdm-734-desktop-runtime-retirement-design.md`
- Create: `docs/superpowers/plans/2026-08-22-fdm-734-desktop-runtime-retirement.md`

**Interfaces:**
- Consumes: FDM-733 production parity at exact SHA `19f272acace62403e21a83ddfe842759a83617c6`.
- Produces: explicit DELETE / KEEP / MIGRATE decisions and recovery anchor for every cleanup task.

- [x] **Step 1: Re-read upstream and deployment-mirror `main`.**

Expected: both equal `19f272acace62403e21a83ddfe842759a83617c6`.

- [x] **Step 2: Re-read latest production deployments and canonical health.**

Expected: web/API production READY from Git `main` at the exact recovery SHA; web `/` and API `/health` return 200.

- [x] **Step 3: Record design, plan, inventory and rollback targets.**

Commit message: `docs: plan FDM-734 runtime retirement`

### Task 2: TDD the editorial-importer migration away from local runtime

**Files:**
- Create: `tests/test_editorial_importer.py`
- Create: `knowledge/engenharia_astrologica/knowledge/aurea_editorial_schema.sql`
- Modify: `tools/import_engenharia_to_aurea.py`
- Modify: `.github/python-test-classification.txt`

**Interfaces:**
- Consumes: corpus at `knowledge/engenharia_astrologica/docs/`.
- Produces: `import_corpus(source_root: Path, output: Path) -> dict[str, int]` without importing `local_storage` or reading `src-tauri`.

- [ ] **Step 1: Add the failing dependency-boundary test.**

```python
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORTER = REPO_ROOT / "tools" / "import_engenharia_to_aurea.py"


def test_editorial_importer_has_no_retired_runtime_dependency() -> None:
    source = IMPORTER.read_text(encoding="utf-8")
    assert "local_storage" not in source
    assert "src-tauri" not in source
```

- [ ] **Step 2: Run the test and verify RED.**

Run: `python -m pytest tests/test_editorial_importer.py -q`

Expected: FAIL because the current importer contains both `local_storage` and `src-tauri`.

- [ ] **Step 3: Preserve the exact impersonal knowledge schema under `knowledge/`.**

Create `knowledge/engenharia_astrologica/knowledge/aurea_editorial_schema.sql` from the current knowledge migration schema. Do not move private-account migrations.

- [ ] **Step 4: Initialize the importer database directly.**

Replace the `LocalStorage` bootstrap with:

```python
EDITORIAL_SCHEMA = ROOT / "knowledge" / "engenharia_astrologica" / "knowledge" / "aurea_editorial_schema.sql"


def initialize_editorial_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    schema = EDITORIAL_SCHEMA.read_text(encoding="utf-8")
    with sqlite3.connect(database_path) as connection:
        connection.executescript(schema)
        connection.execute(
            "INSERT OR IGNORE INTO schema_migration(version, checksum) VALUES (?, ?)",
            ("0001_initial", hashlib.sha256(schema.encode("utf-8")).hexdigest()),
        )
        connection.commit()
```

Then call `initialize_editorial_database(database_path)` before the existing corpus inserts.

- [ ] **Step 5: Add a behavior-preservation test.**

The test imports a small temporary corpus or the checked-in corpus, writes to a temporary SQLite file, and asserts non-zero `concept`, `claim`, and `source_document` counts plus one `import_manifest` row.

- [ ] **Step 6: Run importer tests and the surviving engine contract tests.**

Run:

```bash
python -m pytest tests/test_editorial_importer.py -q
python -m unittest tests.test_engine_utc_boundary tests.test_web_v1_engine_contract -v
```

Expected: PASS.

- [ ] **Step 7: Commit.**

Commit message: `refactor: decouple editorial importer from local runtime`

### Task 3: Delete the root desktop/local runtime and packaging surface

**Files:**
- Delete: `main_api.py`
- Delete: `browser_workspace.py`
- Delete: `local_storage.py`
- Delete: `persistence/**`
- Delete: `src-tauri/**`
- Delete: `build.bat`
- Delete: `build_sidecar.spec`
- Delete: `launch_chrome.bat`
- Delete: `launch_chrome.ps1`
- Delete: `run_tauri.bat`
- Delete: `start-dev.bat`
- Delete: `requirements-api.txt`
- Delete: `tools/clean-generated.ps1`
- Delete: `tools/seed_test_user.py`

**Interfaces:**
- Consumes: successful Task 2 proof that editorial import no longer needs deleted modules.
- Produces: repository with no user-facing Python/Tauri local application runtime.

- [ ] **Step 1: Delete the classified runtime/packaging files in one coherent tree change.**
- [ ] **Step 2: Verify `services/api`, `apps/web`, `supabase`, `knowledge`, `tools/run_e2e.py`, and `tools/e2e_api.py` are untouched.**
- [ ] **Step 3: Commit.**

Commit message: `refactor: remove retired desktop runtime`

### Task 4: Remove dead web Tauri/browser-command compatibility code and dependency declarations

**Files:**
- Delete: `apps/web/src/utils/tauri.ts`
- Delete: `apps/web/src/__tests__/utils/tauri.test.ts`
- Delete or migrate: dead service/UI/test files that import only the retired bridge, including `apps/web/src/services/diary.ts`, `apps/web/src/services/notebook.ts`, `apps/web/src/services/chat.ts`, only when their reachable supported Web V1 replacement is absent and `assert:web-only` confirms they are outside the active graph.
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Web V1 reachable-graph rule from `apps/web/scripts/assert-web-only.mjs`.
- Produces: no Tauri command or declared Tauri build/runtime dependency.

- [ ] **Step 1: Remove root/web `tauri` scripts and `@tauri-apps/*` declarations.**
- [ ] **Step 2: Regenerate only the lockfile metadata required by those removals.**

Run: `npm install --package-lock-only --ignore-scripts`

Expected: no unrelated dependency version upgrades.

- [ ] **Step 3: Run web typecheck/build and web-only assertion.**

Run:

```bash
npm ci
npm run check:web
npm run assert:web-only
```

Expected: PASS and no reachable Tauri/browser-command/9876/9878 marker.

- [ ] **Step 4: Commit.**

Commit message: `refactor: retire web desktop compatibility bridge`

### Task 5: Retire legacy tests and make CI Web V1-only

**Files:**
- Delete: `tests/test_browser_runtime.py`
- Delete: `tests/test_chat_provider_selection.py`
- Delete: `tests/test_compiled_runtime_smoke.py`
- Delete: `tests/test_hermes_mind_api.py`
- Delete: `tests/test_local_storage.py`
- Delete: `tests/test_persistence_repositories.py`
- Delete: `tests/test_pytest_capture_runtime.py`
- Delete: `tests/test_seed_test_user.py`
- Delete: `tests/test_clean_generated.py`
- Delete: `tests/browser_runtime_packaged_smoke.ps1`
- Delete: `tests/browser_runtime_process_tree.ps1`
- Delete: `tests/browser_runtime_smoke.ps1`
- Delete: `tests/manual_launcher_verify.ps1`
- Delete: `tests/mandala_visual_smoke.ps1`
- Modify: `.github/workflows/e2e.yml`
- Modify: `.github/python-test-classification.txt`

**Interfaces:**
- Consumes: supported API package `services/api[dev]` and `tools/run_e2e.py`.
- Produces: CI with frontend quality, surviving root Python checks, and disposable Web V1 E2E only.

- [ ] **Step 1: Remove the compiled-runtime smoke and all `requirements-api.txt` installs from CI.**
- [ ] **Step 2: Use Python 3.12 and `python -m pip install -e "./services/api[dev]"` for root Python quality/E2E dependencies.**
- [ ] **Step 3: Rename E2E summary text from `local-runtime` to `Web V1` and remove runtime-smoke result rows/reproduction commands.**
- [ ] **Step 4: Rebuild Python test classification so every surviving `tests/test_*.py` appears exactly once.**
- [ ] **Step 5: Run classification, Python quality, and `python tools/run_e2e.py`.**
- [ ] **Step 6: Commit.**

Commit message: `ci: retire desktop runtime gates`

### Task 6: Stale-reference sweep and narrow current-doc cleanup

**Files:**
- Modify only current operational/config docs whose executable instructions point at removed files.
- Preserve historical evidence/archive records as historical records.

**Interfaces:**
- Consumes: final post-removal repository tree.
- Produces: no current instruction telling users/CI to launch the removed runtime; broader product narrative remains for FDM-735.

- [ ] **Step 1: Search repository for `main_api.py`, `src-tauri`, `9876`, `9878`, `local-owner`, `/browser/command`, `PyInstaller`, `sidecar`, `launch_chrome`, `run_tauri`, `build_sidecar`, and `start-dev`.**
- [ ] **Step 2: Classify each hit as historical evidence, certified/editorial context, or stale active instruction.**
- [ ] **Step 3: Remove/update only stale active instructions.**
- [ ] **Step 4: Update `LEGACY_REMOVAL_INVENTORY.md` with final deleted/migrated paths and validation evidence.**
- [ ] **Step 5: Commit.**

Commit message: `docs: close FDM-734 runtime retirement inventory`

### Task 7: Full verification and PR handoff

**Files:**
- No product files unless a verification failure exposes a cleanup defect.

- [ ] **Step 1: Run `npm run quality:gate`.**
- [ ] **Step 2: Run GitHub CI/Web V1 quality workflows to green.**
- [ ] **Step 3: Run isolated private Web V1 E2E through `tools/run_e2e.py`.**
- [ ] **Step 4: Verify Supabase disposable schema/RLS and API deploy-contract jobs are green.**
- [ ] **Step 5: Verify certified engine tests and hosted API calculation smoke.**
- [ ] **Step 6: Re-run canonical production web/API smoke against the unchanged FDM-733 production baseline.**
- [ ] **Step 7: Review complete PR diff, secret scan, and stale-runtime search output.**
- [ ] **Step 8: Keep FDM-734 In Progress until all checks are green; then attach sanitized evidence and mark Done.**

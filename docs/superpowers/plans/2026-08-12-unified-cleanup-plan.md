# Cleanup plan — finish what the recent pass started

Unified implementation plan merging (A) the audit of Fernando's recent cleanup commits and (B) the ChatGPT-authored plan `docs/superpowers/plans/2026-08-12-runtime-and-cleanup.md`, re-validated against the tree on 2026-08-12. Supersedes the referenced file; execute this document.

**Goal:** Bring the repo to a healthy state: private data out of the index, dead weight gone, packaged Chrome runtime certified, zero-warning static gates, and the largest modules (Caderno, Mandala, hooks, Tauri bridge) broken up — without changing approved product behavior or any certified astrological result.

**Validated baseline (measured 2026-08-12):**
- `npm run lint`: 0 errors, **82 warnings** (62 `@typescript-eslint/no-explicit-any`, 10 `no-unused-vars`, 10 `react-hooks/exhaustive-deps`).
- `natal_charts/viviane.json` and `src-tauri/memory/board.json` are **still tracked** (VIV-8 incomplete — `ff97426` only edited `.gitignore`).
- `test_transit.py` at root is broken per the VIV-6 baseline and superseded by `tests/engine_reference/` + `tests/test_engine_utc_boundary.py`.
- `BiometricsChart.tsx`, `PdfViewer.tsx`, `InformationLegend.tsx` exist, tracked, zero consumers (verified by source-wide reference search).
- Already done by recent commits (do not redo): BoardManager extraction (`src/components/BoardManager.tsx`), Mandala orientation geometry (`src/utils/mandalaGeometry.ts`), dead AI providers removal (guarded by test), typecheck script, worktree ignore.

## Global Constraints

- Primary runtime: local web app in Chrome at `127.0.0.1`; preserve local-first behavior and future Tauri compatibility.
- Never use real personal data for tests. Set `AUREA_DATA_DIR` to a new temp directory for live validation.
- Never delete or rewrite the editorial astrology database or any source attribution.
- Preserve calculation provenance, school, engine version, input hash, certified-result behavior.
- No dependency upgrades; no `npm audit fix --force`.
- One task = one focused commit (Task 0 allows three). Review the staged diff before every commit. Record `git status --short --branch` before each task; preserve and explain pre-existing changes.
- Live services on isolated ports (9877–9899); verify the app landmark before accepting a browser result.
- Stop a task when its acceptance criteria pass. Report `BLOCKED` on any stop condition instead of improvising.

## Delivery Map

| # | Deliverable | Commit | Required gate |
|---|---|---|---|
| 0a | Private files untracked (VIV-8 finished) | `chore: finish untracking private legacy files (VIV-8)` | `git ls-files` no longer lists them; files remain on disk |
| 0b | Broken root test removed | `chore: remove superseded root transit test` | pytest suite still green |
| 0c | Single canonical launcher | `chore: drop redundant launcher alias` | README accurate; `launch_chrome.bat` works |
| 1 | Packaged Chrome runtime certified | `fix: package Chrome frontend with local runtime` | exe serves `/health` + compiled UI from one origin |
| 2 | Unreachable UI removed | `refactor: remove unreachable UI components` | typecheck, lint, tests, build |
| 3 | Effect dependencies corrected | `fix: stabilize React effect dependencies` | zero `react-hooks/exhaustive-deps` warnings |
| 4 | Typed boundaries, zero-warning lint | `refactor: enforce typed frontend boundaries` | `eslint --max-warnings=0` passes |
| 5 | Main screens lazy-loaded | `perf: lazy-load primary application screens` | separate chunks; six screens navigate |
| 6 | Caderno canvas split | `refactor: split Caderno canvas responsibilities` | board behavior + persistence unchanged |
| 7 | One Mandala reference-data source | `refactor: centralize Mandala reference data` | no astrology value changes |
| 8 | Astrology hooks renamed/separated | `refactor: separate natal and transit hooks` | contracts and receipts unchanged |
| 9 | Tauri bridge modularized, docs archived | `refactor: modularize deferred Tauri compatibility` | same command inventory; `cargo check` |

---

### Task 0: Repository hygiene (three small commits)

**0a — Finish VIV-8 (HIGH).** The privacy rule in AGENTS.md is violated while these stay tracked.
- [ ] `git rm --cached natal_charts/viviane.json src-tauri/memory/board.json`
- [ ] Verify `git ls-files | Select-String "viviane|board.json"` is empty and both files still exist on disk (`.gitignore` already covers them).
- [ ] Commit `chore: finish untracking private legacy files (VIV-8)`.
- Caveat for the handoff: git **history** still contains both files. Full purge = `git filter-repo` + force push; destructive; separate explicit decision. Only worth it if the repo is/will be shared.

**0b — Remove broken root test (MEDIUM).**
- [ ] `git rm test_transit.py` (broken per VIV-6 baseline; coverage lives in `tests/engine_reference/` and `tests/test_engine_utc_boundary.py`).
- [ ] `python -m pytest tests/ -q` passes. Commit `chore: remove superseded root transit test`.

**0c — Remove launcher alias (LOW, optional).**
- [ ] `git rm launch_aurea.bat`; delete its one-sentence mention in `README.md` (~line 24).
- [ ] Sanity: `launch_chrome.bat` still documented in README, setup-guide, arquitetura.md. Commit `chore: drop redundant launcher alias`.

---

### Task 1: Repair and Certify the Packaged Chrome Runtime

**Files:** `build.bat`, `build_sidecar.spec`, `tests/test_browser_runtime.py`, `docs/RELEASE_VALIDATION_2026-08-10.md`; `main_api.py` only if the failing test requires; regenerate `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`.

- [x] Add a package-content regression test in `tests/test_browser_runtime.py`: spec contains `frontend_datas = [('dist', 'dist')]`; `main_api.py` mounts StaticFiles at `/` **after** `@app.get("/health")`.
- [x] Run `python -m pytest tests/test_browser_runtime.py -q`; record that the committed exe currently returns `404` at `/` (the failure to fix).
- [x] Make `build.bat` order explicit and fail-fast: `npm run build` → verify `dist\index.html` exists → PyInstaller spec → copy exe to `src-tauri\binaries` → packaged smoke test. PyInstaller never runs before `dist/index.html` exists.
- [x] Run `.\build.bat`; expect exit `0` and a regenerated executable.
- [x] Isolated smoke test (new temp dir, `AUREA_DATA_DIR=<temp>\data`, free port 9877–9899, start only the packaged exe): `/health` → 200 with `engine: swisseph`; `/` → 200 containing `Aurea Solaris`; `/openapi.json` → contains `/browser/command`.
- [x] Browser landmark: `AUREA SOLARIS`, `ENTRAR`, `INSCREVER-SE` visible; no console startup errors.
- [x] Append exe SHA-256, build time, port, three HTTP results, landmark result, exact commands to `docs/RELEASE_VALIDATION_2026-08-10.md`. Do not claim full user acceptance.
- [x] Gate: `npm run typecheck`; `npm run test`; `python -m pytest tests/test_browser_runtime.py -q`; `git diff --check` — all exit `0`.

Completion record: Implemented across commits `c9ef760`, `c5f4304`, `352c7e6`, `3ae8c41`, `5b4c720`, `d091504`, `0daa595`, `d522df0`, `9626594`, and `38b2654`. Full build/NSIS, isolated packaged runtime, visible-login CDP smoke, typecheck, frontend tests, and Python tests passed. Manual user acceptance remains pending.
- [ ] Commit only the runtime repair.

**Stop:** exe serves `/health` but not `/`; engine is not `swisseph`; browser test used a non-isolated server.

---

### Task 2: Remove Confirmed Unreachable UI Components

**Delete:** `src/components/common/BiometricsChart.tsx`, `src/components/common/PdfViewer.tsx`, `src/components/common/InformationLegend.tsx`.

- [ ] Reconfirm zero consumers: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String "BiometricsChart|PdfViewer|InformationLegend"` → only self-references. (Note: use Select-String, not `git grep -w` with `|` — BRE false negatives.)
- [ ] `npm run build`; confirm built assets contain none of: `Sono, humor e energia`, `Visualizador Seguro`, `Como ler esta área`.
- [ ] Delete only the three files. Do not touch shared styles or health data types without a fresh reference search.
- [ ] Gate: `npm run typecheck`, `npm run lint` (the known 82 warnings remain until Tasks 3–4), `npm run test`, `npm run build`, `git diff --check`.
- [ ] Packaged login-screen smoke test on a new isolated port/data dir (Task 1 exe).
- [ ] Commit `refactor: remove unreachable UI components`.

**Stop:** a consumer or bundled string appears.

---

### Task 3: Correct React Effect Dependencies

**Files:** `HermesChat.tsx`, `MandalaChart.tsx`, `MemoriasView.tsx`, `MesaCriacao.tsx`, `mesa/StudyPanel.tsx`, `src/hooks/useAstroData.ts`, `src/hooks/useAstrologyData.ts`; focused tests under `src/__tests__/`.

Baseline (verified 2026-08-12): 10 `react-hooks/exhaustive-deps` warnings.

- [ ] `npm run lint 2>&1 | Select-String "react-hooks/exhaustive-deps"` — save the list.
- [ ] For each effect: write a failing rerender-based regression test first (changed input → exactly the required update; for request-producing effects also assert total call count — no request loops).
- [ ] Stabilize with `useCallback` only where the function is an effect dependency or passed to memoized children; move pure computations out of the component. **Never** disable the rule.
- [ ] Run each focused test after its minimal fix.
- [ ] Gate: lint output contains no `react-hooks/exhaustive-deps`; `npm run test`; `npm run typecheck`.
- [ ] Live: open each affected screen twice, Hermes twice, switch active subject once; network panel shows no unbounded loop (isolated account).
- [ ] Commit `fix: stabilize React effect dependencies`.

**Stop:** repeated requests, duplicate persistence, or changed certified-calculation output.

---

### Task 4: Replace Weak Types and Enforce Zero-Warning Lint

**Files:** `src/types/caderno.ts`, `src/types/diario.ts`; create `src/types/astrology.ts`, `src/types/private-profile.ts`; files reported by lint; `package.json`; `eslint.config.js` only if a rule is demonstrably invalid for test code.

Baseline (verified 2026-08-12): 82 warnings — 62 `no-explicit-any`, 10 `no-unused-vars` (the 10 exhaustive-deps die in Task 3).

- [ ] Save warning inventory by rule and file.
- [ ] Define `AstrologyCalculationRequest`, `CertifiedAstrologyResult`, `PrivateProfile`, typed browser-command payloads — only fields current consumers read; `unknown` at the boundary, narrowed at the API edge; no index signatures hiding missing fields.
- [ ] Replace `any` in order: `src/utils/tauri.ts` → `useAstroData.ts` → `useAstrologyData.ts` → `GlobalContext.tsx` → `AgendaContext.tsx` → UI consumers/tests. After each file: `npm run typecheck` + `npm run test`.
- [ ] Remove unused vars/params outright (no underscore-alias renames); use a typed allowlist/sanitizer when dropping persisted fields.
- [ ] Set `"lint": "eslint src/ --max-warnings=0"` in `package.json`.
- [ ] Gate: `npm run lint` (zero warnings), `npm run typecheck`, `npm run test`, `npm run build`, `git diff --check`.
- [ ] Commit `refactor: enforce typed frontend boundaries`.

**Stop:** a type would require inventing an API field or untraceable calculation field.

---

### Task 5: Lazy-Load Main Application Screens

**Files:** `src/App.tsx`; create `src/components/common/PageLoadingFallback.tsx`; create/modify `src/__tests__/App.test.tsx`.

- [ ] Navigation test first: render `App` with mocked auth/context; each nav item eventually shows its page landmark.
- [ ] Accessible fallback: `role="status"`, `aria-live="polite"`, "Carregando área…".
- [ ] `React.lazy` the six main content screens only; keep shell eager; one `Suspense` boundary around `renderPage()`; preserve `currentPage` keys and `CadernoIntent` behavior.
- [ ] Gate: App test, lint, typecheck, `npm run build` — confirm separate page chunks; record entry size before/after.
- [ ] Live: open Astrology, Health, Agenda, Caderno Vivo, Memories, Diary; title correct; no failed chunk request.
- [ ] Commit `perf: lazy-load primary application screens`.

**Stop:** page state lost on navigation, or chunk failure under the packaged same-origin runtime.

---

### Task 6: Split the Caderno Canvas by Responsibility (re-scoped)

Already landed (do not redo): `BoardManager` extraction. Remaining: canvas, node card, history, keyboard.

**Files:** `MesaCriacao.tsx`; create `src/components/mesa/MesaCanvas.tsx`, `NodeCard.tsx`, `useBoardHistory.ts`, `useBoardKeyboard.ts`; `src/types/caderno.ts`; tests: `MesaCriacao.test.tsx` (modify), `NodeCard.test.tsx`, `useBoardHistory.test.ts` (create).

- [ ] Characterization tests first: create node, edit text, delete node, undo, redo, autosave, reopen board, keyboard deletion — assert persisted payloads.
- [ ] Extract `NodeCard` without editing markup/classes; run NodeCard + MesaCriacao tests.
- [ ] Extract bounded history into `useBoardHistory` (`MAX_HISTORY = 50`; 51st entry drops only the oldest; preserve transition order).
- [ ] Extract keyboard registration/cleanup into `useBoardKeyboard`; shortcuts inert while input/textarea focused.
- [ ] Extract `MesaCanvas` (canvas, tool palette, pointer handlers, export, autosave, node rendering) as one unit; `MesaCriacao` keeps board selection, intent routing, active-board lifecycle.
- [ ] Gate: lint, typecheck, focused tests, full `npm run test`, `npm run build`.
- [ ] Live (isolated account): create board, add text + checklist nodes, edit, undo, redo, reload, reopen, delete; stored data belongs only to the test owner.
- [ ] Commit `refactor: split Caderno canvas responsibilities`.

**Stop:** persisted-payload difference, focus regression, owner mismatch, undo-order change.

---

### Task 7: Establish One Mandala Reference-Data Source (re-scoped)

Already landed (do not redo): orientation geometry in `src/utils/mandalaGeometry.ts`. Remaining: sign names/symbols, planet symbols, element presentation, Egyptian terms, decanate rulers live in two copies (`astro-dignity.ts` + `MandalaChart.tsx`).

**Files:** create `src/utils/astro-reference-data.ts`; modify `src/utils/astro-dignity.ts`, `src/components/MandalaChart.tsx`; tests: `astroDignity.test.ts`, `mandalaGeometry.test.ts` (modify), `astroReferenceData.test.ts` (create); `docs/astrology-rules.md` only if attribution changes.

- [ ] Equality tests first for both current copies: 12 signs, all term boundaries, 36 decanate rulers, every planet symbol — fail on any order/value change.
- [ ] Create the immutable module (readonly tuples/records); move values verbatim — no "corrections"; add source/school comment for Egyptian terms and decanates from existing project docs; never invent attribution.
- [ ] Delete duplicate declarations only after both consumers compile against the new module.
- [ ] Gate: the three test files, lint, typecheck, build.
- [ ] Rendered comparison with the same saved input receipt and viewport: identical labels, symbols, boundaries, orientation, aspect lines.
- [ ] Commit `refactor: centralize Mandala reference data`.

**Stop:** any displayed/calculated astrology value changes — a correction is a separate sourced task with a difference report.

---

### Task 8: Rename and Separate Astrology Hooks

**Files:** rename `useAstroData.ts` → `useCertifiedNatalCalculation.ts`; rename `useAstrologyData.ts` → `useLiveTransitData.ts`; create `src/services/astrologyApi.ts`; modify `MandalaPage.tsx`, `SaudeView.tsx`, `GlobalContext.tsx`; create `src/__tests__/hooks/`.

- [ ] Contract tests first for both hooks: endpoint, request/response shape, loading transition, error behavior, no silent fallback.
- [ ] Rename natal hook; `rg -n "useAstroData" src` → zero; typecheck + tests.
- [ ] Rename transit hook; `rg -n "useAstrologyData" src` → zero; typecheck + tests.
- [ ] Extract typed HTTP transport only (request construction, response decoding, error conversion) into `astrologyApi.ts`; certification stays in the natal hook, scheduling in the transit hook.
- [ ] Gate: lint, typecheck, `npm run test`, `python -m pytest tests/test_browser_runtime.py tests/engine_reference -q`, build.
- [ ] Live: one certified natal calculation + current transits on an isolated profile; receipt unchanged; no provider/engine fallback.
- [ ] Commit `refactor: separate natal and transit hooks`.

**Stop:** endpoint, receipt, refresh schedule, or failure behavior changes.

---

### Task 9: Modularize Deferred Tauri Compatibility and Index Historical Docs

**Files:** create `src-tauri/src/{private_session,boards,diary,sidecar,windows_secrets,legacy_migration}.rs`; modify `lib.rs`; modify `docs/tauri-ipc-api.md`; create `docs/archive/README.md`; modify `docs/index.md`; move only `VIV-6_EXECUTABLE_BASELINE_2026-08-11.md`, `ENGINE_INCIDENT_2026-08-10.md`, `CLEANUP_VALIDATION_2026-08-11.md` into `docs/archive/`.

- [ ] Capture command inventory: `rg -n "#\[tauri::command\]|generate_handler" src-tauri\src\lib.rs`; `cargo check`. No command may disappear.
- [ ] Extract one domain at a time (windows_secrets → private_session → legacy_migration → boards → diary → sidecar); after each: `cargo fmt --check` + `cargo check`. Move code only — no name/serialization/path/migration changes.
- [ ] Compare final inventory to the captured one.
- [ ] Update source locations in `docs/tauri-ipc-api.md`; do not describe Tauri as the primary runtime.
- [ ] `docs/archive/README.md`: each moved doc's name, date, and why it remains useful. Keep RELEASE_VALIDATION, Constitution, working guide, roadmap, data contracts, engine contract, setup guide where they are.
- [ ] Fix every internal link to moved docs (`rg -n "RELEASE_VALIDATION|CLEANUP_VALIDATION|VIV-6_EXECUTABLE_BASELINE|ENGINE_INCIDENT" README.md AGENTS.md docs`).
- [ ] Final gate: `cargo fmt --check`, `cargo check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `python -m pytest -q`, `git diff --check`.
- [ ] Final smokes: packaged exe per Task 1 procedure; `npm run tauri -- build` only if prerequisites exist (record missing prerequisites as blocker, never bypass).
- [ ] Commit `refactor: modularize deferred Tauri compatibility`.

**Stop:** a command disappears, a private path changes, a migration checksum changes, or an active doc becomes harder to find.

---

## Final Acceptance Criteria

- [ ] `git ls-files` contains no private data files; `test_transit.py` and the three dead components are gone; one canonical launcher.
- [ ] Packaged exe serves `/health`, `/openapi.json`, and the compiled UI from one isolated loopback origin; login screen renders with no dev server.
- [ ] `npm run lint` exits 0 with zero warnings; `npm run typecheck`, `npm run test`, `npm run build`, `python -m pytest -q` pass.
- [ ] Six screens lazy-load and navigate; Caderno CRUD/autosave/undo/redo/reopen unchanged; Mandala values provably unchanged; hook contracts unchanged; Tauri command inventory unchanged and `cargo check` passes.
- [ ] No test used real private data; every task is its own reviewed commit; final `git status --short --branch` clean; handoff reports commit hashes and push/merge status.

## Program Stop Conditions

Stop and request a decision if any task would: change a certified astrological result; remove/rewrite editorial source material; access real private data; change a public Tauri/browser command contract; require a mass dependency upgrade; perform destructive cleanup outside an explicitly created temp directory; or continue after a required test/landmark fails.

## Explicitly Skipped

- Git history rewrite (duplicate commit pairs, purging private files from history) — destructive; separate explicit decision.
- `start-dev.bat` / `run_tauri.bat` — documented, harmless dev conveniences.
- Dependency upgrades of any kind.

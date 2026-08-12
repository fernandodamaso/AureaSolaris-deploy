# Aurea Solaris Runtime and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the Chrome-first packaged runtime, remove confirmed dead code, enforce clean quality gates, and reduce the largest maintenance boundaries without changing approved product behavior.

**Architecture:** Work from the outside inward. First make the packaged Chrome runtime reproducible. Then remove unreachable files and establish strict static checks. After those gates are stable, introduce route-level code splitting and refactor the Caderno, Mandala, astrology hooks, and deferred Tauri bridge in separate commits.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Vitest 4, ESLint 9, Python 3.11, FastAPI, PyInstaller, Rust, Tauri 2, Windows PowerShell.

## Global Constraints

- The primary runtime is the local web application opened in Chrome at `127.0.0.1`.
- Preserve local-first behavior and future Tauri compatibility.
- Never use real personal data for tests. Set `AUREA_DATA_DIR` to a new temporary directory for live validation.
- Never delete or rewrite the editorial astrology database.
- Preserve calculation provenance, school, engine version, input hash, and certified-result behavior.
- Do not add dependency upgrades or use `npm audit fix --force`.
- Keep each task in one focused commit. Review the staged diff before every commit.
- Run live services on isolated ports. Verify the application landmark before accepting a browser result.
- Stop a task when its acceptance criteria pass. Do not begin the next task in the same executor thread.
- Before each task, record `git status --short --branch`. Preserve and explain any pre-existing changes.

## Delivery Map

| Order | Deliverable | Main risk | Required gate |
|---|---|---|---|
| 1 | Working packaged Chrome runtime | Package starts but serves `404` | Executable serves `/health` and the compiled UI |
| 2 | Confirmed dead UI removed | Hidden consumer removed | Import graph, build, tests, live smoke |
| 3 | React effect warnings removed | Changed timing or duplicate calls | Focused tests and live navigation |
| 4 | Typed boundaries and zero-warning lint | Contract drift | Type-check, lint with zero warnings, tests |
| 5 | Lazy-loaded main screens | Loading regression | Chunk evidence and navigation smoke |
| 6 | Smaller Caderno modules | Board behavior regression | Board tests and live edit/reopen flow |
| 7 | One Mandala reference-data source | Astrology meaning changes | Reference tests and rendered comparison |
| 8 | Clearly named astrology hooks | Natal/transit paths crossed | Hook tests and calculation smoke |
| 9 | Modular Tauri bridge and indexed docs | Deferred runtime regression | Cargo check, Tauri tests, documentation links |

---

### Task 1: Repair and Certify the Packaged Chrome Runtime

**Files:**
- Modify: `build.bat`
- Modify: `build_sidecar.spec`
- Modify: `tests/test_browser_runtime.py`
- Modify: `docs/RELEASE_VALIDATION_2026-08-10.md`
- Modify only if required by the failing test: `main_api.py`
- Regenerate: `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`

**Interfaces:**
- Consumes: compiled `dist/index.html`, `ASTRO_API_PORT`, and `AUREA_DATA_DIR`.
- Produces: one executable that serves the API and compiled SPA from the same loopback origin.

- [ ] **Step 1: Add a package-content regression test**

Add a test in `tests/test_browser_runtime.py` that asserts the PyInstaller specification includes `dist` and that the application mounts the frontend after API routes:

```python
def test_sidecar_package_includes_compiled_frontend():
    project_root = Path(__file__).resolve().parents[1]
    spec = (project_root / "build_sidecar.spec").read_text(encoding="utf-8")
    api = (project_root / "main_api.py").read_text(encoding="utf-8")

    assert "frontend_datas = [('dist', 'dist')]" in spec
    assert 'app.mount("/", StaticFiles' in api
    assert api.index('@app.get("/health")') < api.index('app.mount("/", StaticFiles')
```

- [ ] **Step 2: Run the focused test and record the baseline**

Run:

```powershell
python -m pytest tests/test_browser_runtime.py -q
```

Expected: the source-contract tests pass. Record separately that the currently committed executable returns `404` at `/`; this is the package artifact failure that the rebuild must correct.

- [ ] **Step 3: Make the build order explicit**

Update `build.bat` so it performs these operations in order and stops on the first non-zero exit code:

```text
npm run build
verify dist\index.html exists
pyinstaller --clean --noconfirm build_sidecar.spec
copy the generated executable into src-tauri\binaries
run the packaged smoke test
```

Do not allow PyInstaller to run before `dist/index.html` exists.

- [ ] **Step 4: Rebuild the executable**

Run the repository build command that uses the pinned build environment:

```powershell
.\build.bat
```

Expected: the executable is regenerated after the frontend build and the build command exits `0`.

- [ ] **Step 5: Perform an isolated packaged-runtime smoke test**

Use a new directory under `$env:TEMP`, set `AUREA_DATA_DIR` to its `data` child, and select a free port from `9877` through `9899`. Start only the packaged executable. Verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/openapi.json
```

Expected:

- `/health` returns `200` and reports `engine: swisseph`.
- `/` returns `200` and contains `Aurea Solaris`.
- `/openapi.json` contains `/browser/command`.
- No request uses the person's normal Aurea data directory.

- [ ] **Step 6: Verify the login landmark in the shared browser**

Open `http://127.0.0.1:<PORT>/` and verify the visible landmarks `AUREA SOLARIS`, `ENTRAR`, and `INSCREVER-SE`. Check the browser console for startup errors.

- [ ] **Step 7: Update release evidence**

Add the executable SHA-256, build time, isolated port, three HTTP results, browser landmark result, and exact commands to `docs/RELEASE_VALIDATION_2026-08-10.md`. Do not claim full user acceptance.

- [ ] **Step 8: Run the complete Task 1 gate**

```powershell
npm run typecheck
npm run test
python -m pytest tests/test_browser_runtime.py -q
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 9: Commit only the runtime repair**

```powershell
git add build.bat build_sidecar.spec main_api.py tests/test_browser_runtime.py docs/RELEASE_VALIDATION_2026-08-10.md src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe
git diff --cached --stat
git commit -m "fix: package Chrome frontend with local runtime"
```

**Stop condition:** Stop and report `BLOCKED` if the executable serves `/health` but not `/`, if the engine is not `swisseph`, or if the browser test uses an existing non-isolated server.

---

### Task 2: Remove Confirmed Unreachable UI Components

**Files:**
- Delete: `src/components/common/BiometricsChart.tsx`
- Delete: `src/components/common/PdfViewer.tsx`
- Delete: `src/components/common/InformationLegend.tsx`
- Test: existing TypeScript, Vitest, and production-build gates

**Interfaces:**
- Consumes: the current import graph, in which each component has no consumer.
- Produces: no replacement interface; deletion is the deliverable.

- [ ] **Step 1: Reconfirm that each name has only one source reference**

```powershell
rg -n -w "BiometricsChart|PdfViewer|InformationLegend" src -g "*.ts" -g "*.tsx"
```

Expected: one declaration per component and no import or render reference.

- [ ] **Step 2: Record distinctive strings and rebuild before deletion**

```powershell
npm run build
rg -n "Sono, humor e energia|Visualizador Seguro|Como ler esta área" dist\assets -g "*.js"
```

Expected: no built JavaScript contains those component-only strings.

- [ ] **Step 3: Delete only the three files**

Use `apply_patch` to delete the files. Do not delete shared styles or health data types unless a fresh reference search proves they are also unused.

- [ ] **Step 4: Run the full frontend gate**

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
git diff --check
```

Expected: all commands exit `0`; lint may still report the already known warnings until Task 4.

- [ ] **Step 5: Run a packaged login-screen smoke test**

Start the Task 1 executable on a new isolated port and data directory. Verify the login landmarks and confirm no new browser console error appears.

- [ ] **Step 6: Commit the deletion**

```powershell
git add -u src/components/common
git diff --cached --stat
git commit -m "refactor: remove unreachable UI components"
```

**Stop condition:** Do not delete a file if the second reference search finds a consumer or if its distinctive text appears in the built bundle.

---

### Task 3: Correct React Effect Dependencies

**Files:**
- Modify: `src/components/HermesChat.tsx`
- Modify: `src/components/MandalaChart.tsx`
- Modify: `src/components/MemoriasView.tsx`
- Modify: `src/components/MesaCriacao.tsx`
- Modify: `src/components/mesa/StudyPanel.tsx`
- Modify: `src/hooks/useAstroData.ts`
- Modify: `src/hooks/useAstrologyData.ts`
- Test: focused files under `src/__tests__/`

**Interfaces:**
- Consumes: current component props and context contracts.
- Produces: stable callbacks and effects whose dependency arrays match the values they read.

- [ ] **Step 1: Capture only hook warnings**

```powershell
npm run lint 2>&1 | Select-String "react-hooks/exhaustive-deps"
```

Expected: warnings identify each effect that requires investigation.

- [ ] **Step 2: Add a failing regression test for each effect before changing it**

Use rerender-based Vitest tests. The test pattern must prove that a changed input causes exactly the required update:

```tsx
const { rerender } = render(<SubjectUnderTest value="first" />);
rerender(<SubjectUnderTest value="second" />);
await waitFor(() => expect(effectBoundary).toHaveBeenLastCalledWith("second"));
```

For request-producing effects, also assert the total call count so the fix does not create a request loop.

- [ ] **Step 3: Stabilize functions used by effects**

Use `useCallback` only for functions that are dependencies of an effect or passed to memoized children. Move pure computations outside the component when they do not use component state. Do not disable `react-hooks/exhaustive-deps`.

- [ ] **Step 4: Run each focused test after its minimal fix**

```powershell
npm run test -- src/__tests__/HermesChat.test.ts
npm run test -- src/__tests__/components/MesaCriacao.test.tsx
npm run test -- src/__tests__/utils/mandalaGeometry.test.ts
```

Add the exact new test file to the command when an existing file does not cover the changed effect.

- [ ] **Step 5: Run the hook-warning gate**

```powershell
$output = npm run lint 2>&1
$output
if ($output -match "react-hooks/exhaustive-deps") { exit 1 }
npm run test
npm run typecheck
```

Expected: no `react-hooks/exhaustive-deps` warning and all tests pass.

- [ ] **Step 6: Verify live navigation and repeated open/close behavior**

In an isolated account, open each affected screen twice. Open and close Hermes twice. Change the active subject once. Confirm that the network panel does not show an unbounded request loop.

- [ ] **Step 7: Commit the effect corrections**

```powershell
git add src/components src/hooks src/__tests__
git diff --cached --stat
git commit -m "fix: stabilize React effect dependencies"
```

**Stop condition:** Stop if a dependency correction produces repeated requests, duplicate persistence, or changed certified-calculation output.

---

### Task 4: Replace Weak Types and Enforce Zero-Warning Lint

**Files:**
- Modify: `src/types/caderno.ts`
- Modify: `src/types/diario.ts`
- Create: `src/types/astrology.ts`
- Create: `src/types/private-profile.ts`
- Modify: files currently reported by `npm run lint`
- Modify: `package.json`
- Modify: `eslint.config.js` only if a rule is demonstrably invalid for test code

**Interfaces:**
- Produces: `AstrologyCalculationRequest`, `CertifiedAstrologyResult`, `PrivateProfile`, and typed browser-command payloads.
- Consumers: contexts, astrology hooks, Mandala page, profile editor, health view, and tests.

- [ ] **Step 1: Save the warning inventory by rule and file**

```powershell
npm run lint
```

Expected baseline: zero errors and the known warning set. Do not suppress the warnings globally.

- [ ] **Step 2: Define shared profile and astrology contracts**

Create explicit interfaces that contain only fields read by current consumers. Use `unknown` for unvalidated external payloads and narrow them at the API boundary. Do not use an index signature to hide missing fields.

- [ ] **Step 3: Replace `any` from boundary to consumer**

Work in this order:

1. `src/utils/tauri.ts`
2. `src/hooks/useAstroData.ts`
3. `src/hooks/useAstrologyData.ts`
4. `src/context/GlobalContext.tsx`
5. `src/context/AgendaContext.tsx`
6. UI consumers and tests

After each file:

```powershell
npm run typecheck
npm run test
```

- [ ] **Step 4: Remove unused-variable warnings without renaming them to ignored aliases**

Remove unused destructured values and unused callback parameters. If a value must be removed from a persisted object, use a typed allowlist or an explicit sanitizer function instead of unused destructuring.

- [ ] **Step 5: Make lint reject warnings**

Change the script to:

```json
"lint": "eslint src/ --max-warnings=0"
```

- [ ] **Step 6: Run the complete zero-warning gate**

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Expected: all commands exit `0` and ESLint reports no warning.

- [ ] **Step 7: Commit the typed boundary**

```powershell
git add src package.json eslint.config.js
git diff --cached --stat
git commit -m "refactor: enforce typed frontend boundaries"
```

**Stop condition:** Stop if a proposed type requires inventing an API field or if a calculation field cannot be traced to the current API contract.

---

### Task 5: Lazy-Load Main Application Screens

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/common/PageLoadingFallback.tsx`
- Create or modify: `src/__tests__/App.test.tsx`

**Interfaces:**
- Produces: one lazy module boundary for each main navigation screen.
- Preserves: the current `currentPage` keys and `CadernoIntent` behavior.

- [ ] **Step 1: Add a navigation test before changing imports**

Render `App` with mocked authentication/context boundaries and assert that selecting each navigation item eventually shows its page landmark with `findByText` or `findByRole`.

- [ ] **Step 2: Create an accessible loading fallback**

```tsx
export const PageLoadingFallback = () => (
  <div role="status" aria-live="polite" className="grid h-full place-items-center">
    Carregando área…
  </div>
);
```

- [ ] **Step 3: Replace eager screen imports with `React.lazy`**

Keep shared shell components eager. Lazy-load only the six main content screens. Wrap `renderPage()` output in one `Suspense` boundary using `PageLoadingFallback`.

- [ ] **Step 4: Run the navigation test and frontend checks**

```powershell
npm run test -- src/__tests__/App.test.tsx
npm run lint
npm run typecheck
npm run build
```

Expected: navigation tests pass and Vite emits separate page chunks. Record the initial compressed entry size before and after.

- [ ] **Step 5: Verify all six screens in the isolated live application**

Open Astrology, Health, Agenda, Caderno Vivo, Memories, and Diary. For each screen, verify its title and confirm there is no failed JavaScript chunk request.

- [ ] **Step 6: Commit the loading boundaries**

```powershell
git add src/App.tsx src/components/common/PageLoadingFallback.tsx src/__tests__/App.test.tsx
git diff --cached --stat
git commit -m "perf: lazy-load primary application screens"
```

**Stop condition:** Stop if a page loses state during normal navigation or if a chunk fails under the packaged same-origin runtime.

---

### Task 6: Split the Caderno Canvas by Responsibility

**Files:**
- Modify: `src/components/MesaCriacao.tsx`
- Create: `src/components/mesa/MesaCanvas.tsx`
- Create: `src/components/mesa/NodeCard.tsx`
- Create: `src/components/mesa/useBoardHistory.ts`
- Create: `src/components/mesa/useBoardKeyboard.ts`
- Modify: `src/types/caderno.ts`
- Modify: `src/__tests__/components/MesaCriacao.test.tsx`
- Create: `src/__tests__/components/NodeCard.test.tsx`
- Create: `src/__tests__/components/useBoardHistory.test.ts`

**Interfaces:**
- `useBoardHistory(initialNodes)` produces `{ nodes, setNodes, undo, redo, canUndo, canRedo, record }`.
- `NodeCard` consumes a typed `CadernoNode` and typed update/delete callbacks.
- `MesaCanvas` consumes board identity, node state, persistence callbacks, and the current tool.

- [ ] **Step 1: Add characterization tests for current behavior**

Cover create node, edit text, delete node, undo, redo, autosave, reopen board, and keyboard deletion. Assert persisted payloads, not visual copy alone.

- [ ] **Step 2: Extract `NodeCard` without editing its markup or classes**

Move the existing component and its props interface. Run:

```powershell
npm run test -- src/__tests__/components/NodeCard.test.tsx src/__tests__/components/MesaCriacao.test.tsx
```

- [ ] **Step 3: Extract bounded history behavior**

Move the existing `MAX_HISTORY = 50` behavior into `useBoardHistory`. Preserve the current state transition order. Test that the fifty-first entry drops only the oldest history item.

- [ ] **Step 4: Extract keyboard behavior**

Move keyboard event registration and cleanup into `useBoardKeyboard`. Test that shortcuts do not run while an input or textarea owns focus.

- [ ] **Step 5: Extract `MesaCanvas`**

Move the canvas, tool palette, pointer handlers, export, autosave, and node rendering as one existing unit. Keep `MesaCriacao` responsible only for board selection, intent routing, and active-board lifecycle.

- [ ] **Step 6: Run the Caderno gate**

```powershell
npm run lint
npm run typecheck
npm run test -- src/__tests__/components/MesaCriacao.test.tsx src/__tests__/components/NodeCard.test.tsx src/__tests__/components/useBoardHistory.test.ts
npm run test
npm run build
```

- [ ] **Step 7: Perform the live Caderno scenario**

With an isolated account: create a board, add text and checklist nodes, edit both, undo, redo, reload, reopen the board, and delete it. Confirm the stored data belongs only to the test owner.

- [ ] **Step 8: Commit the extraction**

```powershell
git add src/components/MesaCriacao.tsx src/components/mesa src/types/caderno.ts src/__tests__/components
git diff --cached --stat
git commit -m "refactor: split Caderno canvas responsibilities"
```

**Stop condition:** Stop on any persisted-payload difference, focus regression, owner mismatch, or undo-order change.

---

### Task 7: Establish One Mandala Reference-Data Source

**Files:**
- Create: `src/utils/astro-reference-data.ts`
- Modify: `src/utils/astro-dignity.ts`
- Modify: `src/components/MandalaChart.tsx`
- Modify: `src/__tests__/utils/astroDignity.test.ts`
- Modify: `src/__tests__/utils/mandalaGeometry.test.ts`
- Create: `src/__tests__/utils/astroReferenceData.test.ts`
- Modify if source attribution changes: `docs/astrology-rules.md`

**Interfaces:**
- Produces immutable exports for sign names, sign symbols, planet symbols, element presentation, Egyptian terms, and decanate rulers.
- Consumers: `astro-dignity.ts` and `MandalaChart.tsx`.

- [ ] **Step 1: Add equality tests for both current copies**

Before moving data, test all twelve signs, all term boundaries, all thirty-six decanate rulers, and every supported planet symbol. The test must fail if an entry changes order or value.

- [ ] **Step 2: Create the immutable reference module**

Move the existing values without rewriting or “correcting” them. Export readonly tuples or readonly records. Add a source/school comment for Egyptian terms and decanates based on existing project documentation; do not invent an attribution.

- [ ] **Step 3: Replace both local copies with imports**

Delete duplicate declarations only after both consumers compile against `astro-reference-data.ts`.

- [ ] **Step 4: Run calculation and rendering tests**

```powershell
npm run test -- src/__tests__/utils/astroDignity.test.ts src/__tests__/utils/mandalaGeometry.test.ts src/__tests__/utils/astroReferenceData.test.ts
npm run lint
npm run typecheck
npm run build
```

- [ ] **Step 5: Compare a certified Mandala before and after**

Use the same saved input receipt and viewport. Capture before/after screenshots. Confirm the same sign labels, planet symbols, term boundaries, decanate labels, house orientation, and aspect lines.

- [ ] **Step 6: Commit the single source**

```powershell
git add src/utils/astro-reference-data.ts src/utils/astro-dignity.ts src/components/MandalaChart.tsx src/__tests__ docs/astrology-rules.md
git diff --cached --stat
git commit -m "refactor: centralize Mandala reference data"
```

**Stop condition:** Stop if any displayed or calculated astrology value changes. A value correction requires a separate sourced calculation task and difference report.

---

### Task 8: Rename and Separate Astrology Hooks

**Files:**
- Rename: `src/hooks/useAstroData.ts` to `src/hooks/useCertifiedNatalCalculation.ts`
- Rename: `src/hooks/useAstrologyData.ts` to `src/hooks/useLiveTransitData.ts`
- Create: `src/services/astrologyApi.ts`
- Modify: `src/components/MandalaPage.tsx`
- Modify: `src/components/SaudeView.tsx`
- Modify: `src/context/GlobalContext.tsx`
- Create: focused hook tests under `src/__tests__/hooks/`

**Interfaces:**
- `useCertifiedNatalCalculation(birthData, enabled)` owns natal calculation and receipt validation.
- `useLiveTransitData(natalData?)` owns current transits, Moon phase, and planetary-hour data.
- `astrologyApi.ts` owns typed HTTP transport only; it does not select fallbacks or interpret results.

- [ ] **Step 1: Add contract tests for both current hooks**

Assert the API endpoint, request shape, response shape, loading transition, error behavior, and absence of silent fallback for each hook.

- [ ] **Step 2: Rename the natal hook and update only its consumers**

Run:

```powershell
rg -n "useAstroData" src
npm run typecheck
npm run test
```

Expected after the rename: no `useAstroData` reference remains.

- [ ] **Step 3: Rename the transit hook and update only its consumers**

Run:

```powershell
rg -n "useAstrologyData" src
npm run typecheck
npm run test
```

Expected after the rename: no `useAstrologyData` reference remains.

- [ ] **Step 4: Extract shared typed HTTP transport**

Move only request construction, response decoding, and HTTP error conversion into `astrologyApi.ts`. Keep natal certification in the natal hook and current-time scheduling in the transit hook.

- [ ] **Step 5: Run the astrology gate**

```powershell
npm run lint
npm run typecheck
npm run test
python -m pytest tests/test_browser_runtime.py tests/engine_reference -q
npm run build
```

- [ ] **Step 6: Verify natal and transit behavior live**

With one isolated test profile, run one certified natal calculation and load current transits. Confirm that the natal receipt is unchanged and no provider or engine fallback occurs.

- [ ] **Step 7: Commit the naming and transport boundary**

```powershell
git add src/hooks src/services/astrologyApi.ts src/components/MandalaPage.tsx src/components/SaudeView.tsx src/context/GlobalContext.tsx src/__tests__/hooks
git diff --cached --stat
git commit -m "refactor: separate natal and transit hooks"
```

**Stop condition:** Stop if the renamed hooks change an endpoint, calculation receipt, refresh schedule, or failure behavior.

---

### Task 9: Modularize Deferred Tauri Compatibility and Index Historical Docs

**Files:**
- Create: `src-tauri/src/private_session.rs`
- Create: `src-tauri/src/boards.rs`
- Create: `src-tauri/src/diary.rs`
- Create: `src-tauri/src/sidecar.rs`
- Create: `src-tauri/src/windows_secrets.rs`
- Create: `src-tauri/src/legacy_migration.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `docs/tauri-ipc-api.md`
- Create: `docs/archive/README.md`
- Modify: `docs/index.md`
- Move only after link review: `VIV-6_EXECUTABLE_BASELINE_2026-08-11.md`, `ENGINE_INCIDENT_2026-08-10.md`, and `CLEANUP_VALIDATION_2026-08-11.md` into `docs/archive/`

**Interfaces:**
- Preserves every existing `#[tauri::command]` name and payload.
- `lib.rs` remains the application composition root and handler registry.
- `docs/archive/README.md` records the original document name, date, and reason it remains useful.

- [ ] **Step 1: Capture the public Tauri command inventory**

```powershell
rg -n "#\[tauri::command\]|generate_handler" src-tauri\src\lib.rs
cargo check --manifest-path .\src-tauri\Cargo.toml
```

Save the command names in the task notes. No command may disappear during extraction.

- [ ] **Step 2: Extract modules one domain at a time**

Use this order: Windows secrets, private session, legacy migration, boards, diary, sidecar. After each module:

```powershell
cargo fmt --manifest-path .\src-tauri\Cargo.toml -- --check
cargo check --manifest-path .\src-tauri\Cargo.toml
```

Move code without changing command names, serialization, paths, or migration behavior.

- [ ] **Step 3: Compare the final command inventory**

Run the same `rg` command as Step 1. Expected: the handler registry exposes the same public command names.

- [ ] **Step 4: Update the Tauri API document**

Update source-file locations in `docs/tauri-ipc-api.md`. Do not describe Tauri as the primary runtime.

- [ ] **Step 5: Create the documentation archive index**

List each historical document with its date and purpose. Move only the three named completed evidence files. Keep `RELEASE_VALIDATION_2026-08-10.md`, the Constitution, working guide, current roadmap, data contracts, engine contract, setup guide, and active release instructions in their current locations.

- [ ] **Step 6: Verify every changed Markdown link**

```powershell
rg -n "RELEASE_VALIDATION|CLEANUP_VALIDATION|VIV-6_EXECUTABLE_BASELINE|ENGINE_INCIDENT" README.md AGENTS.md docs -g "*.md"
```

Update all internal links to the new archive locations.

- [ ] **Step 7: Run the final program gate**

```powershell
cargo fmt --manifest-path .\src-tauri\Cargo.toml -- --check
cargo check --manifest-path .\src-tauri\Cargo.toml
npm run lint
npm run typecheck
npm run test
npm run build
python -m pytest -q
git diff --check
```

- [ ] **Step 8: Perform final packaged and Tauri-compatible smoke checks**

Verify the Chrome-first executable using Task 1's isolated procedure. If the Tauri build prerequisites are present, run:

```powershell
npm run tauri -- build
```

Record a missing external prerequisite as a blocker; do not bypass it.

- [ ] **Step 9: Commit the compatibility organization**

```powershell
git add src-tauri/src docs
git diff --cached --stat
git commit -m "refactor: modularize deferred Tauri compatibility"
```

**Stop condition:** Stop if any command disappears, a private path changes, a migration checksum changes, or an active document would become harder to discover.

---

## Final Acceptance Criteria

- [ ] The packaged executable serves `/health`, `/openapi.json`, and the compiled UI from one isolated loopback origin.
- [ ] The login screen renders from the packaged executable without a development server.
- [ ] The three unreachable UI files no longer exist.
- [ ] `npm run lint` exits `0` with zero warnings.
- [ ] `npm run typecheck`, `npm run test`, `npm run build`, and `python -m pytest -q` pass.
- [ ] Main screens load as separate chunks and all six navigation paths work.
- [ ] Caderno create, edit, autosave, undo, redo, reopen, and delete behavior is unchanged.
- [ ] Mandala reference tests and before/after rendering show no astrology-value change.
- [ ] Natal and transit hooks have distinct names and unchanged contracts.
- [ ] Tauri exposes the same command names and passes `cargo check`.
- [ ] No test uses Fernando's or another person's private database.
- [ ] Every task has its own reviewed commit.
- [ ] Final `git status --short --branch` is clean, and the handoff reports commit hashes plus push/merge status.

## Program Stop Conditions

Stop the program and request a decision if any task would:

- change a certified astrological result;
- remove or rewrite editorial source material;
- access real private data;
- change a public Tauri/browser command contract;
- require a mass dependency upgrade;
- perform destructive cleanup outside an explicitly created temporary directory;
- continue after a required test or live landmark fails.

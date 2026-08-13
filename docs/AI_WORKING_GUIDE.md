# AI Working Guide — Aurea Solaris

This is the compact operational context for AI agents. Do not read every document by default.

## Read order

1. `AGENTS.md` — mandatory repository rules and product boundaries.
2. `docs/CONSTITUICAO.md` — normative decisions about privacy, data, editorial rigor, and Hermes.
3. This guide — task routing, validation, and release state.
4. Only the domain document required by the task.

If sources conflict, use: safety/privacy → Constitution → `AGENTS.md` → this guide → domain reference.

## Product invariant

Aurea Solaris is a local-first Windows application whose primary experience is currently a local web app opened in Chrome by a one-click launcher. Tauri remains a deferred native compatibility path. The Caderno Vivo board and journal are two views of the same data. The editorial astrology database is separate from each person's private database. Hermes proposes reversible actions; it never silently creates memory, tasks, events, interpretations, or external effects.

## Task routing

| Task | Start here |
|---|---|
| React screens/components | `src/App.tsx`, `src/components/`, `src/context/` |
| Caderno Vivo / journal | `src/components/MesaCriacao.tsx`, `src/components/DiarioView.tsx` |
| Browser/Chrome runtime | `vite.config.ts`, `main_api.py`, `launch_chrome.bat` |
| Tauri commands/window/native compatibility | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `docs/tauri-ipc-api.md` |
| Astrology calculations/API | `astro_engine.py`, `main_api.py`, `docs/astrology-engine.md` |
| Private/editorial storage | `local_storage.py`, `src-tauri/migrations/`, `docs/data-persistence.md`, `docs/data/DOMINIOS_DE_DADOS.md` |
| Knowledge corpus/import | `knowledge/engenharia_astrologica/`, `docs/astrology-knowledge-contract.md`, `docs/data/ENGENHARIA_SYNC_PLAYBOOK.md` |
| Hermes memory/API | `src/components/HermesChat.tsx`, `docs/HERMES_MIND_ARCHITECTURE.md`, `docs/HERMES_MIND_API.md` |
| Release/installer | `build.bat`, `build_sidecar.spec`, `src-tauri/binaries/`, `docs/RELEASE_VALIDATION_2026-08-10.md` |

## Chrome access and release path

- Default Chrome launch has no login and no logout.
- **Prefer the test-user sandbox** for manual checks, smoke tests, browser/runtime validation, and any agent-driven UI work (see next section).
- Testing mock natal is opt-in on the default runtime only: `?mockNatal=1` or `.\launch_chrome.ps1 -MockNatal`; turn off with `?mockNatal=0`.
- Local-owner tokens do not expire; an API restart invalidates them.
- A mode environment change needs an API restart.
- Require-login is for known-password accounts; password enrollment for an auto-created owner is not part of this change.
- Multiple, disabled, orphaned, or mismatched owners stop at setup-required and are never migrated automatically.
- `npm run build` updates `dist` only. It does not update the PyInstaller executable.
- `build.bat` is the release path that rebuilds the frontend and embedded runtime.

## Test-user sandbox (preferred for agents)

Use the isolated **Pessoa Teste** sandbox whenever you need to open Aurea, click through screens, or validate runtime behavior. It keeps the person's real Aurea data untouched.

**Start the sandbox** (from the repository root):

```powershell
.\launch_chrome.ps1 -TestUser
```

**Wipe and re-seed** a clean dummy life (safe; only affects the test sandbox):

```powershell
.\launch_chrome.ps1 -TestUser -Reset
```

On `-Reset`, the launcher stops Aurea test-user runtimes on ports **9878–9899**, closes the isolated Chrome profile if needed, deletes the test sandbox folder, re-runs the seed, and starts a fresh API process.

| Item | Value |
|---|---|
| Owner id | `aurea-test` (display name **Pessoa Teste**) |
| Test private data | `%LOCALAPPDATA%\Aurea Solaris\test-user\data` |
| Test Chrome profile | `%LOCALAPPDATA%\Aurea Solaris\test-user\chrome-profile` |
| API port | **9878** by default (falls back to **9879–9899** if busy) |
| Health check | `GET http://127.0.0.1:<port>/health` → `"test_user": true` (use the port printed by the launcher) |
| Seed prerequisite | `.aurea-build-venv` must exist; `-TestUser` runs `tools\seed_test_user.py` via that venv |

**Never touch real data.** Agents must **not** seed, reset, delete, or modify `%LOCALAPPDATA%\Aurea Solaris\data`. That path is the person's real private Aurea. The seed script (`tools/seed_test_user.py`) refuses that directory and any folder inside it. If you need a clean state, use `-TestUser -Reset` only.

**What the dummy life includes** (high level):

- **Mandala / maps** — reference natal (Belo Horizonte fixture) plus a second known-person map (UI seed via `src/fixtures/test-user-ui.json`).
- **Caderno Vivo** — board with sticky notes and a link between them.
- **Diário** — folder and sample entry.
- **Agenda** — sample tasks and one event.
- **Saúde** — fictional document preview (not a real exam).
- **Hermes** — sample thread, proposed memory, and one approved memory.

**`-MockNatal` vs `-TestUser`:**

| Mode | When to use |
|---|---|
| `-TestUser` | Full isolated sandbox with its own data dir, Chrome profile, port, and seeded dummy life. **Default choice for agents.** |
| `-MockNatal` or `?mockNatal=1` | Quick natal inject on the **default** runtime (`local-owner` on port 9876) without switching data directories. Good for a single chart check when you do not need Caderno, Agenda, or Hermes fixtures. |
| Both flags | `-TestUser` wins; the launcher never applies `-MockNatal` in test-user mode. |

Full persistence details: `docs/data-persistence.md`.

## Required working loop

1. Inspect `git status --short --branch` and preserve existing changes.
2. Search with `rg`; read the smallest relevant code and domain document.
3. Make a small change with `apply_patch`.
4. Update the relevant documentation when behavior, data, or workflow changes.
5. Validate proportionally: `npm run check` for the frontend gate; Python tests and `cargo check --manifest-path .\src-tauri\Cargo.toml` remain separate gates; use `build.bat` for release work.
6. Report files changed, data/privacy risk, validation performed, and real remaining blockers.

Never use destructive Git commands, invent astrological values or sources, commit secrets, mix private data with editorial data, or silently downgrade a certified calculation to a fallback.

## Calculation requirements

Every calculation must preserve UTC, IANA timezone, location, zodiac, ayanamsa when applicable, house system, orbs, engine/ephemeris version, and input hash. A result is certified only when its receipt is valid and the relevant reference checks pass.

## Release state

Release `0.1.1` has a successful technical build and source-generated sidecar smoke test. The Chrome-first local runtime now serves the compiled frontend from the local API and opens in default `local-owner` mode without a login screen. Native installer work remains paused. Do not claim the browser release fully accepted until launcher startup, navigation, calculation, Hermes, persistence, and shutdown are checked by a person.

## Documentation policy

- Keep this guide short and operational.
- Keep product/data rules in `AGENTS.md` and `docs/CONSTITUICAO.md`; do not duplicate them here.
- Keep detailed domain facts in one domain document and link to it.
- Keep completed plans and abandoned implementation notes out of the current documentation tree; Git history preserves them when needed.
- Do not create a handoff document with a second project status; update this guide or the release validation record instead.

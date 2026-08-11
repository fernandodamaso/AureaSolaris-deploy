# Aurea Solaris

Aurea Solaris is a local-first application for astrological study, personal organization, and reflection. Its current primary experience is a local web app opened in Chrome by a one-click Windows launcher. Tauri remains available as a deferred native compatibility path. It is maintained through AI agents, so the repository's documentation is optimized for machine task routing and safe, small changes.

## Start here as an AI agent

Read in this order:

1. [`AGENTS.md`](AGENTS.md) — mandatory rules, privacy boundaries, product map, and commands.
2. [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md) — normative product and data decisions.
3. [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) — compact task routing and validation loop.
4. [`docs/index.md`](docs/index.md) — domain references.

Do not read the entire `docs/` tree by default. Use the domain document relevant to the task; treat `docs/archive/` as historical context.

## Product boundaries

- The Caderno Vivo board and journal are two views of the same data.
- Editorial astrology knowledge and private person-owned data are separate databases.
- Hermes is the single assistant. Suggestions and memory are always reviewable and reversible.
- Astrological calculations preserve UTC, IANA timezone, location, configuration, engine/ephemeris version, and input hash.
- Financial features and Gmail are outside the current scope.

## Code map

| Area | Entry points |
|---|---|
| React interface | `src/App.tsx`, `src/components/`, `src/context/` |
| Caderno Vivo/journal | `src/components/MesaCriacao.tsx`, `src/components/DiarioView.tsx` |
| Astrology engine/API | `astro_engine.py`, `main_api.py` |
| Chrome/local runtime | `vite.config.ts`, `main_api.py`, `launch_chrome.bat` |
| Tauri/native compatibility | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| Data migrations | `src-tauri/migrations/knowledge/`, `src-tauri/migrations/private/` |
| Editorial corpus | `knowledge/engenharia_astrologica/` |

## Development commands

Run from the repository root:

```powershell
npm run build
npm run test
cargo check --manifest-path .\src-tauri\Cargo.toml
npm run tauri -- dev
```

The Python sidecar uses the isolated `.aurea-build-venv`; do not depend on a globally installed Python for release work.

## Windows release

`build.bat` rebuilds the PyInstaller sidecar, copies it into `src-tauri/binaries/`, and creates the NSIS installer. The current release evidence, artifact hashes, technical checks, and remaining manual acceptance are recorded in [`docs/RELEASE_VALIDATION_2026-08-10.md`](docs/RELEASE_VALIDATION_2026-08-10.md).

Current state: release `0.1.1` has a passing technical build and sidecar smoke test; Chrome-first launcher/runtime work is now the active focus. Native Windows installer work is paused.

## Change discipline

Inspect Git status first. Preserve unrelated changes. Use `rg` for discovery and `apply_patch` for edits. Never commit secrets, mix private/editorial data, invent sources or calculations, or use destructive Git commands. Every change should report affected files, data/privacy risk, validation, and real pending work.

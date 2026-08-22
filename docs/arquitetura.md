# Aurea Solaris — Architecture

## Current target

The primary experience is a local web app opened in Chrome on Windows by `launch_chrome.bat`. It remains local-first: the browser talks to services bound to loopback, and private/editorial data stays on the computer. Tauri is retained as a native compatibility path while Chrome is the active focus.

## Runtime layers

```text
Chrome
  └─ React + TypeScript + Vite
       ├─ local HTTP API: FastAPI / Uvicorn at 127.0.0.1:9876
       │    ├─ `aurea_api.domain.astrology` + packaged Swiss Ephemeris
       │    ├─ SQLite editorial and private storage
       │    └─ Hermes/local services
       └─ browser adapter for operations previously exposed by Tauri IPC

Optional native path:
Tauri 2 + Rust ── starts/coordinates the same Python sidecar
```

## Source map

| Layer | Entry points |
|---|---|
| UI | `src/App.tsx`, `src/components/`, `src/context/` |
| Browser startup | `launch_chrome.bat`, `vite.config.ts`, `start-dev.bat` |
| Local API | `main_api.py`, `local_storage.py` |
| Astrology | `services/api/src/aurea_api/domain/astrology/`, `services/api/ephe/` |
| Native compatibility | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| Migrations | `src-tauri/migrations/private/`, `src-tauri/migrations/knowledge/` |
| Editorial corpus | `knowledge/engenharia_astrologica/` |

## Data flow

```text
User clicks launcher
  → local FastAPI runtime starts (or is reused)
  → FastAPI serves the compiled frontend from dist/
  → Chrome opens 127.0.0.1:9876
  → React calls local HTTP endpoints
  → FastAPI validates owner/session and performs local work
  → SQLite/files/ephemeris are read or written locally
  → JSON result and provenance return to React
```

The browser must not receive passwords, API keys, refresh tokens, or private provider credentials. The API binds to loopback only. Any external provider call requires the configured consent and provenance rules in `AGENTS.md` and `docs/CONSTITUICAO.md`.

## Release-style local launcher

`launch_chrome.bat` calls `launch_chrome.ps1`. The script checks for the
compiled `dist/index.html`, prepares it once when running from a source
checkout, starts only `main_api.py`, waits for `/health` and the compiled
frontend, and opens Chrome. It does not start Vite for normal use and does not
move to an external or hosted API. If `9876` is occupied, it chooses another
loopback port and the compiled frontend follows its own local page origin.

## Browser migration rule

`src/utils/tauri.ts` is an adapter boundary, not a reason to keep the browser incomplete. When a feature currently calls `safeInvoke`, implement an equivalent authenticated local HTTP operation or a deliberate browser-safe alternative. Do not silently return `null` for a private feature and call the feature complete.

The browser adapter must preserve:

- `owner_id` isolation;
- Argon2id account authentication;
- private/editorial separation;
- explicit receipts for calculations;
- reversible Hermes actions;
- backup and migration behavior.

## Native compatibility

The Rust/Tauri path remains available for native-only capabilities and future packaging. It is not the primary acceptance path during the Chrome-first phase. Do not remove it or redesign around it until the browser runtime covers the required user flows.

## Validation

```powershell
npm run build
npm run test
& .\.aurea-build-venv\Scripts\python.exe -m unittest discover -s tests -p 'test_*.py'
```

For the Chrome path, additionally verify launcher startup, browser login, natal calculation, Caderno Vivo, journal, Hermes, persistence after restart, and clean shutdown. The Windows installer record remains historical in `docs/RELEASE_VALIDATION_2026-08-10.md` while native work is paused.

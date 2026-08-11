# Setup Guide

Primary runtime: a local web app opened in Chrome. Tauri is optional compatibility tooling while the Chrome path is the active focus.

## Requirements

- Windows
- Google Chrome
- Python 3.10+
- Repository Python environment `.aurea-build-venv` with `requirements-api.txt` installed
- Node.js 18+ and npm only for the one-time frontend build in a source checkout

Rust and the Tauri CLI are required only for native compatibility work, not for the primary browser runtime.

## First setup

From the repository root:

```powershell
python -m venv .aurea-build-venv
.\.aurea-build-venv\Scripts\python.exe -m pip install -r requirements-api.txt
npm install
```

## Start the local Chrome app

Double-click [`launch_chrome.bat`](../launch_chrome.bat), or run it from a terminal:

```powershell
.\launch_chrome.bat
```

The launcher starts:

- FastAPI local runtime: `http://127.0.0.1:9876`
- the already-built frontend from `dist/`
- Chrome at the local interface URL

The API serves the frontend and the local API from the same loopback origin. Vite is not started by the launcher. No hosted URL or external data transfer is required for the local runtime.

On the first run from a source checkout, if `dist/index.html` is missing, the launcher performs `npm run build` once. After that, Node.js is not needed to open the application.

## Development commands

| Command | Purpose |
|---|---|
| `npm start` | Start the browser UI in development mode only |
| `npm run build` | TypeScript check and production frontend build |
| `npm run test` | Run Vitest tests |
| `python main_api.py` | Start the local API directly |
| `npm run tauri -- dev` | Optional native compatibility path |
| `build.bat` | Build the Windows release artifacts; currently paused while Chrome is primary |

## Acceptance note

The browser adapter and release-style launcher are implemented. Final product
acceptance still requires a person to exercise login, private storage, Caderno
Vivo, journal, Hermes, persistence after restart, and shutdown on the target
Windows machine.

## Troubleshooting

### Port in use

The release-style launcher uses only `127.0.0.1:9876`. Check and stop only the process owning that port, then run the launcher again. Do not terminate unrelated Python or Node processes.

### API does not start

```powershell
& .\.aurea-build-venv\Scripts\python.exe -m pip install -r requirements-api.txt
& .\.aurea-build-venv\Scripts\python.exe main_api.py
```

### TypeScript or UI build errors

```powershell
npm run build
```

## Related documentation

- [`AGENTS.md`](../AGENTS.md) — mandatory agent rules
- [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — compact task routing
- [`arquitetura.md`](arquitetura.md) — system layers
- [`RELEASE_VALIDATION_2026-08-10.md`](RELEASE_VALIDATION_2026-08-10.md) — historical Windows release evidence

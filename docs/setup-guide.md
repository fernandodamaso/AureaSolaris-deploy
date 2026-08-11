# Setup Guide

> How to install and run Aurea Solaris.
> **Ownership:** This is the ONLY source for setup instructions.

## Prerequisites

| Program | Version | Install |
|---------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Rust | Stable | [rustup.rs](https://rustup.rs) |
| Python | 3.10+ | [python.org](https://python.org) |
| Tauri CLI | v2 | `cargo install tauri-cli` |

### Python Dependencies

```bash
pip install kerykeion
```

## Quick Start

### Option 1: One-Click (Recommended)

Double-click `AureaSolaris-Dev.bat` on Desktop.

### Option 2: From Project Folder

```batch
start-dev.bat
```

### Option 3: Terminal

```bash
npm start
```

Server runs at `http://localhost:1420/`

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Vite dev server |
| `npm run dev` | Vite with hot reload |
| `npm run build` | TypeScript check + build |
| `npm run tauri dev` | Full desktop app with Tauri |
| `npm run lint` | Code linting |
| `npm test` | Run tests (Vitest) |

## Troubleshooting

### Port in use

```bash
npx kill-port 1420
npm start
```

### TypeScript errors

```bash
npm run build
```

## Environment Variables

| Variable | Required For |
|----------|--------------|
| `OPENROUTER_API_KEY` | Cloud AI agents |
| `TELEGRAM_TOKEN` | Telegram notifications |
| `VITE_COMPOSIO_API_KEY` | Google Calendar |

**Note:** Ollama local works automatically at `http://localhost:11434` if installed.

## Related Documentation

- [quick-reference.md](quick-reference.md) — Fast task lookup
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure
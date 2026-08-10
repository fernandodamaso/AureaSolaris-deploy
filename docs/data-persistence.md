# Data Persistence

> How and where data is stored in Aurea Solaris.
> **Ownership:** This is the ONLY source for persistence details.

## Storage Matrix

| Data Type | Location | Mechanism |
|-----------|----------|-----------|
| UI Preferences | `localStorage` | React State + useEffect |
| Profiles & Agenda | `localStorage` | AgendaContext |
| Health & Habits | `localStorage` | SaudeContext |
# Removido do escopo atual
| Chat History | `memory/{agent}.json` | Tauri FS API (`save_history`) |
| Assets (Images) | `assets/` | Tauri FS API (`save_asset`) |
| Board State | `memory/board.json` | Tauri FS API (`save_board/load_board`) |
| Astrology Cache | `astro_data.json` | Python Script |
| Google Drive Tokens | `google_tokens.json` | Tauri FS API (app data dir) |
| AI Token Usage | `memory/usage.json` | Tauri FS API (`log_usage`) |

## Memory Directory

`src-tauri/memory/` contains:
- Chat histories per agent
- Board state
- Usage statistics

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — FS commands (save_history, save_asset, etc.)
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure details
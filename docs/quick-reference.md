# Quick Reference

> Fast lookup for common agent tasks. For full details, see domain docs.

## "I need to..." → "Go to..."

### UI & Components
| Task | File | Docs |
|------|------|------|
| Modify UI component | `src/components/` | [estrutura-do-projeto.md](estrutura-do-projeto.md) |
| Change buttons/inputs | `src/components/common/UIComponents.tsx` | [estrutura-do-projeto.md](estrutura-do-projeto.md) |
| Modify agent chat | `src/components/AgentChat.tsx` | [agents-system.md](agents-system.md) |

### Backend & Tauri
| Task | File | Docs |
|------|------|------|
| Add Tauri command | `src-tauri/src/lib.rs` | [tauri-ipc-api.md](tauri-ipc-api.md) |
| Use safeInvoke | `src/utils/tauri.ts` | [tauri-ipc-api.md](tauri-ipc-api.md) |
| Change window config | `src-tauri/tauri.conf.json` | [tauri-ipc-api.md](tauri-ipc-api.md) |

### Astrology Engine
| Task | File | Docs |
|------|------|------|
| Modify calculations | `astro_engine.py` | [astrology-engine.md](astrology-engine.md) |
| Change ephemeris | `de421.bsp` | [astrology-engine.md](astrology-engine.md) |

### Integrations
| Task | File | Docs |
|------|------|------|
| Calendar sync | `src/services/composio.ts` | [google-calendar.md](google-calendar.md) |
|| Google Drive | Integrations settings | [google-drive-integration.md](google-drive-integration.md) |

### Configuration
| Task | File | Docs |
|------|------|------|
| Environment vars | `.env`, `.env.local` | [setup-guide.md](setup-guide.md) |
| Dependencies | `package.json` | [setup-guide.md](setup-guide.md) |
| Run tests | `npm test` | [setup-guide.md](setup-guide.md) |

---

## Mandatory Rules

1. **Update docs** with every code change
2. **English primary**, Portuguese secondary
3. **Max 150 lines** per domain doc
4. **Cross-reference**, never duplicate

---

## Agent Personas (Quick)

| Agent | Scope | Default Model |
|-------|-------|---------------|
| Dr. Strange | Global | gemini-2.0-pro |
| Alfred | Health, Agenda | gpt-4o-mini |
| Uncle Duck | Finance | llama3.2 → gpt-4o-mini |
| Rafiki | Astrology, Diary | gpt-4o-mini |
| Stark | Control Panel | claude-3.5-sonnet |

> **Full details:** [agents-system.md](agents-system.md)
# AI Assistant System — Historical Hermes Migration Note

> Historical reference only. The current single-assistant rules are in [`AGENTS.md`](../AGENTS.md), [`docs/CONSTITUICAO.md`](CONSTITUICAO.md), and [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md). Do not use the retired persona list below as current product scope.

> **Single assistant architecture.** All previous multi-agent personas (Dr. Strange, Alfred, Uncle Duck, Rafiki, Stark) have been removed. Hermes handles everything.

## Overview

Aurea Solaris uses **Hermes** as its sole AI assistant, accessible through the **HermesChat** sidebar panel. Hermes has context-aware access to the app's astrological data, diary, calendar, and tasks.

## Architecture

- **Chat Panel:** `src/components/HermesChat.tsx` — sidebar panel, toggle from any screen
- **Backend:** Chat goes through Tauri IPC → processed locally
- **No external AI APIs:** All inference runs on the user's machine

## Hermes's Capabilities

| Area | How Hermes Helps |
|------|-----------------|
| **Astrology** | Interprets natal charts, analyzes transits, explains planetary hours, teaches techniques |
| **Diary** | Helps write entries, reflects on themes, connects to astrological context |
| **Productivity** | Manages local tasks, schedules events, organizes priorities |
| **Calendar** | Reviews Google Calendar events, suggests optimal timing based on transits |
| **Obsidian** | Reads/writes to Obsidian vault for second-brain organization |
| **Learning** | Teaches astrology concepts, chart reading, house systems, aspect patterns |

## Personality

- **Concise and direct** — no verbosity
- **Astrology-first** — always considers planetary context
- **Respectful of privacy** — all processing local
- **Educational** — explains concepts when asked, like a teacher
- **Portuguese-native** — communicates primarily in Portuguese

## Rules

1. **Privacy absolute** — no data leaves the machine for AI inference
2. **Astrology guides everything** — every interaction considers the astrological moment
3. **Less is more** — efficiency over feature bloat
4. **Consistency** — same tone and approach across all views

## Migration from 5-Agent System

The previous system had 5 separate AI personas:
- **Dr. Strange** → Global astrological supervisor → **Merged into Hermes**
- **Alfred** → Productivity butler → **Merged into Hermes**
- **Uncle Duck** → Financial consultant → **Merged into Hermes**
- **Rafiki** → Technical astrologer → **Merged into Hermes**
- **Stark** → Technical monitor → **Removed** (system monitoring via native Tauri)

All their responsibilities are now handled by Hermes through context-aware prompting in the chat panel.

## Related

- [../AGENTS.md](../AGENTS.md) — Hermes guide (project root)
- [arquitetura.md](arquitetura.md) — Full architecture reference

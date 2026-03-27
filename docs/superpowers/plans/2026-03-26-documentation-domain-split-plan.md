# Documentation Domain-Based Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize documentation into domain-based files for better readability by agents, enabling parallel work without conflicts.

**Architecture:** Create new domain-specific docs, extract organized content from existing files, add navigation headers. **NEVER DELETE content — only organize and cross-reference.**

**Tech Stack:** Markdown, Git for coordination

---

## Critical Rules (Read First)

1. **NEVER DELETE** content from existing files
2. **ONLY ADD** deprecation headers and cross-references to old files
3. **EXTRACT AND ORGANIZE** content into new domain files
4. **PRESERVE** all information — reorganize for readability

---

## File Structure Map

### Files to CREATE (New domain docs)

| File | Content Source | Owner Domain |
|------|----------------|--------------|
| `docs/index.md` | New (navigation) | Navigation |
| `docs/agents-system.md` | arquitetura.md §2, AGENTS.md personas | Agents |
| `docs/tauri-ipc-api.md` | arquitetura.md §4 | Backend API |
| `docs/astrology-engine.md` | arquitetura.md §5 | Engine |
| `docs/google-calendar.md` | arquitetura.md §3 | Integrations |
| `docs/google-drive-integration.md` | arquitetura.md §4.6 | Integrations |
| `docs/data-persistence.md` | arquitetura.md §8 | Storage |
| `docs/export-system.md` | arquitetura.md §9 | Frontend Utils |
| `docs/setup-guide.md` | README.md §2-4 | Getting Started |
| `docs/quick-reference.md` | AGENTS.md tables (slimmed) | Quick Lookup |

### Files to MODIFY (Add headers only)

| File | Modification |
|------|--------------|
| `docs/arquitetura.md` | Add deprecation header at top |
| `AGENTS.md` | Add deprecation header at top |
| `docs/estrutura-do-projeto.md` | Add bilingual cross-reference |

---

## Task Decomposition

### Task 1: Create Navigation Hub

**Files:**
- Create: `docs/index.md`

**Why first:** Enables navigation for all subsequent work. Other agents can find new docs.

- [ ] **Step 1: Create `docs/index.md` with navigation tables**

```markdown
# Aurea Solaris Documentation

> **For AI agents:** This hub links to domain-specific documentation.
> **Rule:** Each domain doc has ONE source of truth. Do not duplicate.

## Quick Access (≤3 clicks to any info)

| I need to... | Go to... |
|--------------|----------|
| First time setup | [setup-guide.md](setup-guide.md) |
| Find where to edit code | [quick-reference.md](quick-reference.md) |
| Modify agent personas | [agents-system.md](agents-system.md) |
| Add Tauri command | [tauri-ipc-api.md](tauri-ipc-api.md) |
| Change astrology calc | [astrology-engine.md](astrology-engine.md) |
| Integrate with calendar | [google-calendar.md](google-calendar.md) |
| Connect Google Drive | [google-drive-integration.md](google-drive-integration.md) |
| Understand data storage | [data-persistence.md](data-persistence.md) |
| Export content | [export-system.md](export-system.md) |
| See folder structure | [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) |

## By Domain

### Agents & AI
- [agents-system.md](agents-system.md) — Personas, config, models

### Backend
- [tauri-ipc-api.md](tauri-ipc-api.md) — All Tauri commands
- [data-persistence.md](data-persistence.md) — Storage mechanisms

### Integrations
- [google-calendar.md](google-calendar.md) — Calendar via Composio
- [google-drive-integration.md](google-drive-integration.md) — OAuth2 Drive

### Engine
- [astrology-engine.md](astrology-engine.md) — Python calculations

### Frontend
- [export-system.md](export-system.md) — Export utilities
- [setup-guide.md](setup-guide.md) — Installation guide

### Portuguese
- [estrutura-do-projeto.md](estrutura-do-projeto.md) — 🇧🇷 Folder structure guide

## Legacy (Preserved)
- [arquitetura.md](arquitetura.md) — ⚠️ Original (deprecated, content preserved)
- [AGENTS.md](../AGENTS.md) — ⚠️ Original (deprecated, content preserved)
```

- [ ] **Step 2: Commit navigation hub**

```bash
git add docs/index.md
git commit -m "docs: add navigation hub for domain-based documentation"
```

---

### Task 2: Create Quick Reference

**Files:**
- Create: `docs/quick-reference.md`
- Source: `AGENTS.md` lines 5-71 (navigation tables only)

**Why:** Fast lookup for common tasks, replaces scrolling through large files.

- [ ] **Step 1: Read `AGENTS.md` lines 5-71**

Extract navigation tables:
- Componentes e Interface do Usuário
- APIs do Backend Tauri
- Motor de Astrologia
- Google Calendar
- Agentes de IA
- Configuração do Sistema
- Documentação de Referência

- [ ] **Step 2: Create `docs/quick-reference.md`**

```markdown
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
| Google Drive | `ControlePanel.tsx` | [google-drive-integration.md](google-drive-integration.md) |

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
```

- [ ] **Step 3: Commit quick reference**

```bash
git add docs/quick-reference.md
git commit -m "docs: add quick reference guide for fast agent lookup"
```

---

### Task 3: Create Agents System Doc

**Files:**
- Create: `docs/agents-system.md`
- Source: `arquitetura.md` §2 (lines 19-59), `AGENTS.md` lines 99-148

**Why:** Single source of truth for all persona details.

- [ ] **Step 1: Read source files**

Read:
- `docs/arquitetura.md` lines 19-59
- `AGENTS.md` lines 99-148

- [ ] **Step 2: Create `docs/agents-system.md`**

```markdown
# Agents System

> Complete reference for AI agent personas, configuration, and integration.
> **Ownership:** This is the ONLY source for persona details. Do not duplicate elsewhere.

## Overview

Aurea Solaris integrates 5 AI agents, each with distinct personality and scope. Agents operate via:
- **OpenRouter** — Cloud LLMs (GPT-4o, Gemini, Claude)
- **Ollama** — Local models (default: llama3.2)

The Master AI Key in `ControlePanel.tsx` allows switching between cloud and local processing.

## Master AI Key

Located in `ControlePanel.tsx`, monitored by agent **Stark**:

| Mode | Source | Privacy | Power |
|------|--------|---------|-------|
| **Ollama (Default)** | localhost:11434 | Private | Limited |
| **OpenRouter** | Cloud API | Shared | High |

## Agent Personas

### Dr. Strange — Supervisor Macro

| Attribute | Value |
|-----------|-------|
| **Scope** | Global (floating button in `App.tsx`) |
| **Personality** | Wise, concise, mystical. Connects planetary patterns to daily actions. |
| **Default Model** | `google/gemini-2.0-pro-exp-02-05` |
| **When Active** | Always available via floating button |

**Function:** Provides macro perspective, linking celestial hours to current UI activities.

---

### Alfred — Productivity Butler

| Attribute | Value |
|-----------|-------|
| **Scope** | `SaudeView.tsx`, `AgendaView.tsx`, `AlfredHubView.tsx` |
| **Personality** | Direct, impeccable, formal but helpful. British efficiency. |
| **Default Model** | `openai/gpt-4o-mini` |
| **When Active** | Health, Agenda, and Alfred Hub views |

**Function:** Manages tasks, appointments, and wellness with maximum efficiency.

---

### Uncle Duck — Financial Consultant

| Attribute | Value |
|-----------|-------|
| **Scope** | `FinancasView.tsx` (Gestão de Ouro) |
| **Personality** | Pragmatic, profit-hungry, objective. Speaks directly to the point. |
| **Default Model** | Ollama `llama3.2` → Fallback: OpenRouter `openai/gpt-4o-mini` |
| **When Active** | Finance view |

**Function:** Analyzes expenses, suggests savings, monitors investments.

---

### Rafiki — Technical Astrologer

| Attribute | Value |
|-----------|-------|
| **Scope** | `AstrologiaBoard.tsx`, `MandalaPage.tsx`, `DiarioView.tsx` |
| **Personality** | Precise, technical, data-driven. No metaphors, concrete data only. |
| **Default Model** | `openai/gpt-4o-mini` |
| **When Active** | Astrology, Mandala, and Diary views |

**Function:** Translates raw astrological data into practical advice.

**Response Format:** `[Planet] at [exact position]. Aspect: [type] with [planet/point]. Direct interpretation: [suggested action].`

**Data provided:** Planetary positions (degrees, minutes), exact signs, geometric aspects (trine 120°, square 90°, etc.), natal chart, astrological houses, transits with orbs.

---

### Stark — Technical Monitor

| Attribute | Value |
|-----------|-------|
| **Scope** | `ControlePanel.tsx` |
| **Personality** | Highly technical, sarcastic, concise. Speaks in technical jargon. |
| **Default Model** | `anthropic/claude-3.5-sonnet` |
| **When Active** | Control Panel view |

**Function:** Monitors system health, Tauri-React bridge stability, provides technical data.

## Agent Injection Points

| Agent | Component | Views |
|-------|-----------|-------|
| Dr. Strange | `App.tsx` | All (global) |
| Alfred | `SaudeView.tsx` | Health |
| Alfred | `AgendaView.tsx` | Agenda |
| Alfred | `AlfredHubView.tsx` | Hub |
| Uncle Duck | `FinancasView.tsx` | Finance |
| Rafiki | `AstrologiaBoard.tsx` | Astrology |
| Rafiki | `MandalaPage.tsx` | Mandala |
| Rafiki | `DiarioView.tsx` | Diary |
| Stark | `ControlePanel.tsx` | Control |

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — Chat commands (openrouter_chat, ollama_chat)
- [quick-reference.md](quick-reference.md) — Fast agent lookup
```

- [ ] **Step 3: Commit agents system doc**

```bash
git add docs/agents-system.md
git commit -m "docs: add agents system documentation with persona details"
```

---

### Task 4: Create Tauri IPC API Doc

**Files:**
- Create: `docs/tauri-ipc-api.md`
- Source: `arquitetura.md` §4 (lines 118-195)

- [ ] **Step 1: Read `docs/arquitetura.md` lines 118-195**

- [ ] **Step 2: Create `docs/tauri-ipc-api.md`**

```markdown
# Tauri IPC API Reference

> All Tauri commands available to the React frontend.
> **Ownership:** This is the ONLY source for command documentation.

## safeInvoke Pattern

Communication between React and Rust uses `safeInvoke` from `src/utils/tauri.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    // @ts-expect-error - Tauri internal API not typed
    if (window.__TAURI_INTERNALS__) return await invoke<T>(cmd, args);
    return null;
  } catch (err) {
    console.error(`[safeInvoke Error] ${cmd}:`, err);
    return null;
  }
}
```

## Command Registration

Commands are registered in `src-tauri/src/lib.rs`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        openrouter_chat,
        ollama_chat,
        save_history,
        // ... more commands
    ])
```

## Command Categories

### Chat & AI

| Command | Description |
|---------|-------------|
| `openrouter_chat` | Sends messages to OpenRouter API (cloud LLMs) |
| `ollama_chat` | Sends messages to local Ollama (localhost:11434) |

### Chat History

| Command | Description |
|---------|-------------|
| `save_history` | Saves chat history for an agent to JSON |
| `load_history` | Loads chat history for an agent |
| `list_chat_sessions` | Lists sessions with preview and message count |
| `delete_chat_session` | Deletes a specific session by ID |
| `archive_chat` | Moves current chat to archive directory |
| `list_archived_chats` | Lists archived chats |
| `load_archived_chat` | Loads a specific archived chat |

### Todoist Integration

| Command | Description |
|---------|-------------|
| `get_todoist_tasks` | Fetches tasks from Todoist API |
| `add_todoist_task` | Creates new Todoist task |
| `delete_todoist_task` | Deletes Todoist task by ID |
| `toggle_todoist_task` | Completes or reopens a task |
| `postpone_todoist_task` | Postpones task to tomorrow |

### Google Calendar

| Command | Description |
|---------|-------------|
| `add_google_event` | ⚠️ Stub — requires OAuth2 |
| `delete_google_event` | ⚠️ Stub — requires OAuth2 |
| `get_google_events` | Returns mock events (MVP) |

### Telegram

| Command | Description |
|---------|-------------|
| `send_telegram_message` | Sends messages via Telegram Bot API |

### Board (Mesa de Criação)

| Command | Description |
|---------|-------------|
| `save_board` | Saves node and edge state of Mesa de Criação |
| `load_board` | Loads Mesa de Criação state |

### System & Files

| Command | Description |
|---------|-------------|
| `save_asset` | Copies file to app assets folder |
| `get_sys_info` | Returns system info (CPU, RAM, Disk) |
| `read_text_file` | Reads text file content |
| `list_lab_files` | Lists files in `Laboratorio_Stark/` |
| `get_total_tokens` | Returns total AI tokens consumed |

### Astrology Engine

| Command | Description |
|---------|-------------|
| `run_astro_engine` | Executes Python astrology engine as subprocess |
| `get_transit_positions` | Returns current planetary positions for given date/time |
| `run_agm_engine` | Executes AntiGravity Module (AGM) Python engine |

### Google Drive

| Command | Description |
|---------|-------------|
| `google_drive_status` | Checks if Google Drive is connected |
| `google_drive_connect` | Starts OAuth2 flow (opens browser) |
| `google_drive_disconnect` | Removes OAuth2 tokens, disconnects |
| `google_drive_list_files` | Lists files in connected Google Drive |
| `google_drive_upload` | Uploads file (name + content) to Google Drive |

## Related Documentation

- [agents-system.md](agents-system.md) — Chat commands context
- [astrology-engine.md](astrology-engine.md) — run_astro_engine details
- [google-drive-integration.md](google-drive-integration.md) — Drive OAuth flow
```

- [ ] **Step 3: Commit**

```bash
git add docs/tauri-ipc-api.md
git commit -m "docs: add Tauri IPC API reference with all commands"
```

---

### Task 5: Create Astrology Engine Doc

**Files:**
- Create: `docs/astrology-engine.md`
- Source: `arquitetura.md` §5 (lines 217-370)

- [ ] **Step 1: Read `docs/arquitetura.md` lines 217-370**

- [ ] **Step 2: Create `docs/astrology-engine.md`**

```markdown
# Astrology Engine

> Python-based calculations using kerykeion and NASA ephemeris.
> **Ownership:** This is the ONLY source for engine details.

## Overview

The astrology engine is a Python script (`astro_engine.py`) that runs as a subprocess called by Rust via Tauri.

**Key files:**
- `astro_engine.py` — Main engine script
- `de421.bsp` — NASA Swiss Ephemeris data
- `astro_data.json` — Cache of latest calculations

## Rust-Python Integration

Command `run_astro_engine` in `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    use std::path::PathBuf;
    use std::process::Command;
    let project_root = PathBuf::from("C:\\AureaSolaris");
    let astro_path = project_root.join("astro_engine.py");
    let mut cmd = Command::new("python.exe");
    cmd.arg(astro_path);
    if let Some(p) = payload {
        cmd.arg(p);
    }
    let output = cmd.output().map_err(|e| format!("Command failed: {}", e))?;
    // ... process output
}
```

**Flow:**
1. Frontend calls `safeInvoke('run_astro_engine', payload)`
2. Rust executes `python.exe astro_engine.py` with JSON payload
3. Python calculates and prints JSON to stdout
4. Rust captures stdout and returns to React

## Calculation Functions

| Function | Description |
|----------|-------------|
| `calculate_astrology` | Calculates planets, aspects, and rulers |
| `calculate_transit_positions` | Current planetary positions (no houses/aspects) |
| `get_aspects` | Dynamic aspect detection with configurable orbs |
| `get_planetary_hour` | Chaldean order planetary hours (24 hours) |

## House Systems

Configurable via `house_system` parameter:

| Code | System | Description |
|------|--------|-------------|
| `R` | Regiomontanus | Default. Cusps at meridian-equator intersection |
| `P` | Placidus | Most common worldwide |
| `K` | Koch | Based on diurnal motions |
| `O` | Porphyrius | Equal zodiac arc divisions |
| `C` | Campanus | Based on quadrant divisions |
| `W` | Whole Sign | Houses defined by complete sign |

## Celestial Bodies

Beyond the 10 classical planets:

| Body | Description | Formula |
|------|-------------|---------|
| North Node (☊) | Lunar North Node | Moon - 180° |
| South Node (☋) | Lunar South Node | Moon + 180° |
| Lilith (⚸) | Black Moon Lilith | Moon + 180° |
| Part of Fortune (⊙) | Fortune Point | ASC + Moon - Sun |
| Vertex (Vx) | Fictitious Point | ASC + 60° (approx) |
| Chiron (⚷) | Centaur | Via kerykeion |

## Aspects

| Aspect | Angle | Orb | Type |
|--------|-------|-----|------|
| Conjunction ☌ | 0° | 8° | Major |
| Opposition ☍ | 180° | 8° | Major |
| Trine △ | 120° | 8° | Major |
| Square □ | 90° | 6° | Major |
| Sextile ＊ | 60° | 4° | Minor |
| Inconjunct ☽ | 150° | 3° | Minor |
| Quintil ℍ | 72° | 3° | Minor |
| Bi-Quintil ℎ | 144° | 3° | Minor |
| Semi-Sextil ⚹ | 30° | 2° | Minor |
| Semi-Square ∠ | 45° | 2° | Minor |

Each aspect includes `applying` (converging) or `separating` (diverging) indicator.

## Zodiac Wheel Convention

Western astrology standard (compatible with AstroChart, astro-seek.com, Solar Fire):

| Point | Position |
|-------|----------|
| 0° Aries | 9 o'clock (left) |
| 0° Cancer | 12 o'clock (top) |
| 0° Libra | 3 o'clock (right) |
| 0° Capricorn | 6 o'clock (bottom) |

- **Direction:** Counter-clockwise (Western standard)
- **Conversion formula:** `(180 - angle) * PI/180`
- **ASC rotation:** In `MandalaChart.tsx`, wheel rotates so ASC is always at 9 o'clock

## Fallback Engine (TypeScript)

When Tauri/Python unavailable, `src/utils/astro-calc.ts` provides approximations (±1-2°):

```typescript
import { calculateFallback } from '../utils/astro-calc';

const result = await calculateFallback(
  2026, 3, 25, 14, 30,  // year, month, day, hour, minute
  -15.7833,              // latitude
  -47.9333,              // longitude
  'Regiomontanus'        // house system
);
```

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — run_astro_engine command
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure
```

- [ ] **Step 3: Commit**

```bash
git add docs/astrology-engine.md
git commit -m "docs: add astrology engine documentation"
```

---

### Task 6: Create Integration Docs

**Files:**
- Create: `docs/google-calendar.md`
- Create: `docs/google-drive-integration.md`
- Sources: `arquitetura.md` §3, §4.6

- [ ] **Step 1: Read sources** (`arquitetura.md` lines 62-115, 208-214)

- [ ] **Step 2: Create `docs/google-calendar.md`**

```markdown
# Google Calendar Integration

> Calendar sync via Composio MCP.
> **Ownership:** This is the ONLY source for calendar details.

## Configuration

1. Get API key at [app.composio.dev](https://app.composio.dev)
2. Add to `.env`:
   ```
   VITE_COMPOSIO_API_KEY=your_key_here
   ```
3. Connect Google account via Composio dashboard

## Service API (`src/services/composio.ts`)

| Function | Description |
|----------|-------------|
| `connect()` | Connects to Google via Composio |
| `listEvents(params)` | Lists events (supports timeMin, timeMax) |
| `createEvent(params)` | Creates new calendar event |
| `deleteEvent(id)` | Removes calendar event |

## UI Integration (`AgendaView.tsx`)

- **"Google Calendar" button** — Connect/disconnect
- **Google events** — Blue badge, Calendar icon
- **Local events** — Gold badge, Clock icon
- Events merged in daily view

## Example Usage

```typescript
import { googleCalendarService } from '../services/composio';

await googleCalendarService.connect();
const events = await googleCalendarService.listEvents({
  timeMin: new Date().toISOString(),
  timeMax: endOfDay.toISOString(),
});
```

## Related

- [agents-system.md](agents-system.md) — Alfred (manages agenda)
```

- [ ] **Step 3: Create `docs/google-drive-integration.md`**

```markdown
# Google Drive Integration

> OAuth2 connection with PKCE flow.
> **Ownership:** This is the ONLY source for Drive details.

## Commands

| Command | Description |
|---------|-------------|
| `google_drive_status` | Checks if connected |
| `google_drive_connect` | Opens browser for OAuth consent |
| `google_drive_disconnect` | Removes saved tokens |
| `google_drive_list_files` | Lists files in Drive |
| `google_drive_upload` | Uploads file (name + content) |

## Token Storage

Tokens saved to `google_tokens.json` in app data directory.

## OAuth Flow

1. `google_drive_connect` opens browser
2. User grants consent
3. Callback received at `localhost:8919`
4. Tokens saved locally

## UI Integration

Control Panel (`ControlePanel.tsx`) — monitored by **Stark**.

## Related

- [tauri-ipc-api.md](tauri-ipc-api.md) — Command details
```

- [ ] **Step 4: Commit both**

```bash
git add docs/google-calendar.md docs/google-drive-integration.md
git commit -m "docs: add Google Calendar and Drive integration docs"
```

---

### Task 7: Create Data Persistence and Export Docs

**Files:**
- Create: `docs/data-persistence.md`
- Create: `docs/export-system.md`
- Sources: `arquitetura.md` §8, §9

- [ ] **Step 1: Create `docs/data-persistence.md`**

```markdown
# Data Persistence

> How and where data is stored in Aurea Solaris.
> **Ownership:** This is the ONLY source for persistence details.

## Storage Matrix

| Data Type | Location | Mechanism |
|-----------|----------|-----------|
| UI Preferences | `localStorage` | React State + useEffect |
| Profiles & Agenda | `localStorage` | AgendaContext |
| Health & Habits | `localStorage` | SaudeContext |
| Transactions & Goals | `localStorage` | FinancasContext |
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

## Related

- [tauri-ipc-api.md](tauri-ipc-api.md) — FS commands
```

- [ ] **Step 2: Create `docs/export-system.md`**

```markdown
# Export System

> Unified export utilities in `src/utils/exportUtils.ts`.
> **Ownership:** This is the ONLY source for export details.

## Functions

| Function | Format | Used By |
|----------|--------|---------|
| `downloadText` | Text file | Diary, Mesa |
| `downloadAsPDF` | PDF | All views |
| `sendEmail` | Email client | All views |
| `saveToGoogleDrive` | Clipboard | All views |
| `exportAsJSON` | JSON | Diary, Mesa |
| `exportAsMarkdown` | Markdown | Diary |

## File Formats

- **Markdown:** `# Title\n\ncontent\n\n---\n*Exported from Aurea Solaris on [date]*`
- **JSON:** `{ title, content, date, exportedAt }`
- **SVG/PNG:** Vector/raster mandala image

## Views with Export

- **DiarioView.tsx** — Markdown, JSON, Email, Drive
- **MandalaPage.tsx** — SVG, PNG, Email, Drive
- **MesaCriacao.tsx** — JSON, SVG, Email, Drive

## Related

- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Component details
```

- [ ] **Step 3: Commit**

```bash
git add docs/data-persistence.md docs/export-system.md
git commit -m "docs: add data persistence and export system docs"
```

---

### Task 8: Create Setup Guide

**Files:**
- Create: `docs/setup-guide.md`
- Source: `README.md` lines 20-104

- [ ] **Step 1: Read `README.md` lines 20-104**

- [ ] **Step 2: Create `docs/setup-guide.md`**

```markdown
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
| `TODOIST_TOKEN` | Todoist integration |
| `TELEGRAM_TOKEN` | Telegram notifications |
| `VITE_COMPOSIO_API_KEY` | Google Calendar |

**Note:** Ollama local works automatically at `http://localhost:11434` if installed.

## Related

- [quick-reference.md](quick-reference.md) — Fast task lookup
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure
```

- [ ] **Step 3: Commit**

```bash
git add docs/setup-guide.md
git commit -m "docs: add setup and installation guide"
```

---

### Task 9: Add Deprecation Headers

**Files:**
- Modify: `docs/arquitetura.md`
- Modify: `AGENTS.md`
- Modify: `docs/estrutura-do-projeto.md`

**CRITICAL: ADD headers only, NEVER delete content.**

- [ ] **Step 1: Add header to `docs/arquitetura.md`**

Add at line 1 (before existing content):

```markdown
> ⚠️ **ARCHIVED — Domain-Split Documentation Active**
> 
> This document is preserved intact. For organized, searchable content see:
> - **Agents/Personas:** [agents-system.md](agents-system.md)
> - **Tauri Commands:** [tauri-ipc-api.md](tauri-ipc-api.md)
> - **Astrology Engine:** [astrology-engine.md](astrology-engine.md)
> - **Google Calendar:** [google-calendar.md](google-calendar.md)
> - **Google Drive:** [google-drive-integration.md](google-drive-integration.md)
> - **Data Persistence:** [data-persistence.md](data-persistence.md)
> - **Export System:** [export-system.md](export-system.md)
> - **Navigation Hub:** [index.md](index.md)
> 
> Last valid: 2026-03-26

---
```

- [ ] **Step 2: Add header to `AGENTS.md`**

Add at line 1 (before existing content):

```markdown
> ⚠️ **ARCHIVED — See Quick Reference**
> 
> This document is preserved intact. For fast navigation see:
> - **Quick Reference:** [docs/quick-reference.md](docs/quick-reference.md)
> - **Agents System:** [docs/agents-system.md](docs/agents-system.md)
> - **Navigation Hub:** [docs/index.md](docs/index.md)
> 
> Last valid: 2026-03-26

---
```

- [ ] **Step 3: Add header to `docs/estrutura-do-projeto.md`**

Add at line 1 (before existing content):

```markdown
> 📖 **Portuguese Version / Versão em Português**
> 
> This is the Portuguese documentation. For English, see:
> - **Navigation Hub:** [index.md](index.md)
> - **Setup Guide:** [setup-guide.md](setup-guide.md)
> - **Quick Reference:** [quick-reference.md](quick-reference.md)
> 
> Última atualização: 26 de Março de 2026

---
```

- [ ] **Step 4: Commit deprecation headers**

```bash
git add docs/arquitetura.md AGENTS.md docs/estrutura-do-projeto.md
git commit -m "docs: add deprecation headers to legacy files (content preserved)"
```

---

### Task 9.5: Update README.md Cross-References

**Files:**
- Modify: `README.md`

Add reference to domain docs in the Documentation section.

- [ ] **Step 1: Read `README.md` lines 261-265**

Current content:
```markdown
## 📚 Documentação

- [Estrutura do Projeto](docs/estrutura-do-projeto.md) — Guia completo de pastas e arquivos
- [Arquitetura Técnica](docs/arquitetura.md) — Detalhes técnicos do sistema
```

- [ ] **Step 2: Add domain docs reference**

Replace with:
```markdown
## 📚 Documentação

### Navigation Hub
- **[docs/index.md](docs/index.md)** — All documentation organized by domain (English)

### Quick Reference
- **[docs/quick-reference.md](docs/quick-reference.md)** — Fast lookup for common tasks

### Domain Documentation (English)
- [Agents System](docs/agents-system.md) — Personas, configuration, models
- [Tauri IPC API](docs/tauri-ipc-api.md) — All backend commands
- [Astrology Engine](docs/astrology-engine.md) — Python calculations
- [Google Calendar](docs/google-calendar.md) — Calendar integration
- [Data Persistence](docs/data-persistence.md) — Storage mechanisms
- [Setup Guide](docs/setup-guide.md) — Installation instructions

### Portuguese Documentation
- [Estrutura do Projeto](docs/estrutura-do-projeto.md) — Guia completo de pastas e arquivos

### Legacy (Preserved)
- [Arquitetura Técnica](docs/arquitetura.md) — ⚠️ Original (see domain docs above)
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with domain documentation links"
```

---

### Task 10: Verification

- [ ] **Step 1: Verify all links in ALL new files**

```bash
# Check links in all new markdown files
for file in docs/index.md docs/quick-reference.md docs/agents-system.md \
            docs/tauri-ipc-api.md docs/astrology-engine.md docs/google-calendar.md \
            docs/google-drive-integration.md docs/data-persistence.md docs/export-system.md \
            docs/setup-guide.md; do
  echo "Checking $file..."
  grep -oP '\[.*?\]\((.*?\.md)' "$file" | while read -r match; do
    target=$(echo "$match" | grep -oP '\((.*?\.md)' | tr -d '(')
    if [ ! -f "$target" ]; then
      echo "  BROKEN: $target"
    fi
  done
done
```

- [ ] **Step 2: Verify content parity**

Check that all sections from arquitetura.md appear in new docs:
- Section 2 → agents-system.md ✓
- Section 3 → google-calendar.md ✓
- Section 4 → tauri-ipc-api.md ✓
- Section 5 → astrology-engine.md ✓
- Section 8 → data-persistence.md ✓
- Section 9 → export-system.md ✓

- [ ] **Step 3: Navigation test**

Simulate: "Agent needs to find how to change Alfred's model"

Expected path:
1. `index.md` → "Modify agent personas" link
2. `agents-system.md` → "Alfred" section
3. Find: `openai/gpt-4o-mini`

**Result:** ≤3 clicks ✓

- [ ] **Step 4: Verify no content was deleted**

```bash
# Count lines in original arquitetura.md (should be same or more with header)
wc -l docs/arquitetura.md
# Original was ~472 lines, should now be ~490+ (header added)
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "docs: domain-based documentation restructuring complete"
```

---

## Summary

| Task | Files Created | Files Modified |
|------|---------------|----------------|
| 1. Navigation Hub | `docs/index.md` | — |
| 2. Quick Reference | `docs/quick-reference.md` | — |
| 3. Agents System | `docs/agents-system.md` | — |
| 4. Tauri IPC API | `docs/tauri-ipc-api.md` | — |
| 5. Astrology Engine | `docs/astrology-engine.md` | — |
| 6. Integrations | `docs/google-calendar.md`, `docs/google-drive-integration.md` | — |
| 7. Storage & Export | `docs/data-persistence.md`, `docs/export-system.md` | — |
| 8. Setup Guide | `docs/setup-guide.md` | — |
| 9. Deprecation Headers | — | `arquitetura.md`, `AGENTS.md`, `estrutura-do-projeto.md` |
| 9.5. README Update | — | `README.md` |
| 10. Verification | — | — |

**Total: 10 files created, 4 files modified (headers/links only)**

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-03-26-documentation-domain-split-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch fresh subagent per task, review between tasks
**2. Inline Execution** — Execute tasks in this session with checkpoints

**Which approach?**

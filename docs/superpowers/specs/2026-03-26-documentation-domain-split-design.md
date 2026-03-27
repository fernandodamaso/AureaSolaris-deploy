# Design Specification: Documentation Domain-Based Split

> **Date:** 2026-03-26
> **Author:** AI Agent (via brainstorming skill)
> **Status:** Draft - Pending Review
> **Goal:** Restructure documentation for parallel agent work, reduce duplication, enable faster navigation

---

## Executive Summary

Transform the current documentation structure from monolithic files into domain-based modules that:
1. Eliminate duplication of persona/agent information across 3+ files
2. Allow multiple agents to work on documentation simultaneously without conflicts
3. Provide faster navigation for agents seeking specific information
4. Support English primary with Portuguese secondary for bilingual use

**Key Constraint:** All changes are ADDITIVE - existing files remain intact with redirects/links to new structure.

---

## Problem Analysis

### Current State Issues

| Issue | Evidence | Impact |
|-------|----------|--------|
| **Duplication** | Persona info in AGENTS.md, README.md, arquitetura.md | Conflicting updates, stale data |
| **Monolithic files** | arquitetura.md (472 lines), estrutura-do-projeto.md (558 lines) | Slow parsing, merge conflicts |
| **No clear ownership** | Multiple agents edit same large files | Merge conflicts in parallel work |
| **Mixed concerns** | Technical + navigation + rules in single files | Confusing for targeted tasks |

### Current Structure

```
Current:
├── AGENTS.md (153 lines) — Navigation + rules + personas + modules (MIXED)
├── README.md (311 lines) — Overview + setup + agents + architecture (MIXED)
├── docs/arquitetura.md (472 lines) — ALL technical details (MONOLITHIC)
└── docs/estrutura-do-projeto.md (558 lines) — ALL folder details (MONOLITHIC)
```

---

## Proposed Structure (Domain-Based)

### New File Organization

```
docs/
├── index.md                      # 🗺️ NEW — Navigation hub (links to everything)
├── agents-system.md              # 🤖 NEW — From arquitetura.md §2 + AGENTS.md personas
├── tauri-ipc-api.md              # 🦀 NEW — From arquitetura.md §4 (all commands)
├── astrology-engine.md           # 🔮 NEW — From arquitetura.md §5 (Python engine)
├── google-calendar.md            # 📅 NEW — From arquitetura.md §3
├── google-drive-integration.md   # 📁 NEW — From arquitetura.md §4.6
├── data-persistence.md           # 💾 NEW — From arquitetura.md §8
├── export-system.md              # 📤 NEW — From arquitetura.md §9
├── project-structure.md          # 📁 RENAME — Keep estrutura-do-projeto.md content (PT)
├── quick-reference.md            # ⚡ RENAME — Slimmed AGENTS.md for fast lookup
├── setup-guide.md                # 🔧 NEW — From README.md setup sections
│
├── [EXISTING FILES PRESERVED]    # 🛡️ Non-destructive
│   ├── arquitetura.md            # → Add header: "⚠️ DEPRECATED: See docs/*.md"
│   ├── AGENTS.md                 # → Add header: "⚠️ DEPRECATED: See quick-reference.md"
│   └── estrutura-do-projeto.md   # → Add header: "⚠️ PT version: See project-structure.md"
│
└── superpowers/
    ├── specs/
    └── plans/
```

### File Size Targets

| New File | Target Size | Source |
|----------|-------------|--------|
| `index.md` | ~50 lines | Navigation hub |
| `agents-system.md` | ~150 lines | arquitetura.md §2 + AGENTS.md personas |
| `tauri-ipc-api.md` | ~120 lines | arquitetura.md §4 |
| `astrology-engine.md` | ~130 lines | arquitetura.md §5 |
| `google-calendar.md` | ~80 lines | arquitetura.md §3 |
| `google-drive-integration.md` | ~60 lines | arquitetura.md §4.6 |
| `data-persistence.md` | ~50 lines | arquitetura.md §8 |
| `export-system.md` | ~40 lines | arquitetura.md §9 |
| `quick-reference.md` | ~30 lines | AGENTS.md (slimmed) |
| `setup-guide.md` | ~100 lines | README.md §2-4 |

---

## Detailed Design (All 11 Documentation Files)

### 1. `docs/index.md` — Navigation Hub
*[Template shown above]*

---

### 2. `docs/agents-system.md` — AI Agents System

**Content sources:**
- `arquitetura.md` §2 (Sistema de Agentes de IA, lines 19-59)
- `AGENTS.md` (Personas tables, lines 99-109, 139-148)

**Template:**
```markdown
# Agents System

> Complete reference for AI agent personas, configuration, and integration.
> **Ownership:** This file is the ONLY source for persona details.

## Overview
[2-3 sentences: multi-agent architecture, 5 agents, OpenRouter/Ollama]

## Master AI Key
- Ollama (Local/Default) vs OpenRouter (Cloud) switch
- ControlePanel.tsx → Stark monitors this

## Agent Personas

### Dr. Strange (Supervisor Macro)
- **Scope:** Global (App.tsx floating button)
- **Personality:** Wise, concise, mystical
- **Default Model:** google/gemini-2.0-pro-exp-02-05
- **When Active:** Always available
- **Example Prompt:** "Based on the current planetary hour..."

### Alfred (Productivity Butler)
- **Scope:** SaudeView, AgendaView, AlfredHubView
- **Personality:** Direct, impeccable, formal but helpful
- **Default Model:** openai/gpt-4o-mini
- **When Active:** Health/Agenda views open
- [Continue pattern for all 5 agents]

## Agent Injection Points
| Agent | Component | Views |
|-------|-----------|-------|
| Dr. Strange | App.tsx | All |
| Alfred | SaudeView.tsx | Health, Agenda |
| Uncle Duck | FinancasView.tsx | Finance |
| Rafiki | AstrologiaBoard.tsx | Astrology, Diary |
| Stark | ControlePanel.tsx | Control Panel |

## Related
- [tauri-ipc-api.md](tauri-ipc-api.md) → Chat commands
```

---

### 3. `docs/tauri-ipc-api.md` — Tauri Commands Reference

**Content sources:**
- `arquitetura.md` §4 (lines 118-195)

**Template:**
```markdown
# Tauri IPC API Reference

> All Tauri commands available to the React frontend.
> **Ownership:** This file is the ONLY source for command documentation.

## safeInvoke Pattern
[src/utils/tauri.ts wrapper, error handling]

## Command Categories

### Chat & AI
| Command | Description |
|---------|-------------|
| openrouter_chat | OpenRouter API |
| ollama_chat | Local Ollama |

### Storage & History
| Command | Description |
|---------|-------------|
| save_history | Save chat history |
| load_history | Load chat history |
| [continue pattern...]

### System
| Command | Description |
|---------|-------------|
| get_sys_info | System info |
| [continue pattern...]

## Related
- [agents-system.md](agents-system.md) → Agent configuration
```

---

### 4. `docs/astrology-engine.md` — Python Astrology Engine

**Content sources:**
- `arquitetura.md` §5 (lines 217-370)

**Template:**
```markdown
# Astrology Engine

> Python-based calculations using kerykeion and NASA ephemeris.
> **Ownership:** This file is the ONLY source for engine details.

## Overview
[kerykeion, de421.bsp, subprocess architecture]

## Rust-Python Integration
[run_astro_engine command, JSON payload/response]

## Calculation Functions
- calculate_astrology
- calculate_transit_positions
- get_aspects
- get_planetary_hour

## House Systems
| Code | System | Description |
|------|--------|-------------|
| R | Regiomontanus | Default |
| [continue...] |

## Aspects
| Aspect | Angle | Orb |
|--------|-------|-----|
| Conjunction | 0° | 8° |
| [continue...] |

## Related
- [tauri-ipc-api.md](tauri-ipc-api.md) → run_astro_engine command
```

---

### 5. `docs/google-calendar.md` — Calendar Integration

**Content sources:**
- `arquitetura.md` §3 (lines 62-115)

**Template:**
```markdown
# Google Calendar Integration

> Calendar sync via Composio MCP.
> **Ownership:** This file is the ONLY source for calendar details.

## Configuration
[VITE_COMPOSIO_API_KEY, setup steps]

## Service API (composio.ts)
| Function | Description |
|----------|-------------|
| connect() | Connect via Composio |
| listEvents() | List events |
| createEvent() | Create event |
| deleteEvent() | Delete event |

## UI Integration (AgendaView.tsx)
[Google badge, merge with local events]

## Example Usage
[code sample]
```

---

### 6. `docs/google-drive-integration.md` — Drive OAuth2

**Content sources:**
- `arquitetura.md` §4.6 (lines 208-214)

**Template:**
```markdown
# Google Drive Integration

> OAuth2 connection with PKCE flow.
> **Ownership:** This file is the ONLY source for Drive details.

## Commands
| Command | Description |
|---------|-------------|
| google_drive_status | Check connection |
| google_drive_connect | Start OAuth flow |
| [continue...]

## Token Storage
[google_tokens.json location]

## OAuth Flow
[Browser → consent → callback → save tokens]
```

---

### 7. `docs/data-persistence.md` — Storage Mechanisms

**Content sources:**
- `arquitetura.md` §8 (lines 408-422)

**Template:**
```markdown
# Data Persistence

> How and where data is stored.
> **Ownership:** This file is the ONLY source for persistence details.

## Storage Matrix
| Data Type | Location | Mechanism |
|-----------|----------|-----------|
| UI Preferences | localStorage | React State |
| Chat History | memory/*.json | Tauri FS |
| [continue...] |

## Memory Directory
[src-tauri/memory/ structure]
```

---

### 8. `docs/export-system.md` — Export Utilities

**Content sources:**
- `arquitetura.md` §9 (lines 425-451)

**Template:**
```markdown
# Export System

> Unified export utilities in exportUtils.ts.
> **Ownership:** This file is the ONLY source for export details.

## Functions
| Function | Format | Views |
|----------|--------|-------|
| downloadText | Text file | Diary, Mesa |
| downloadAsPDF | PDF | All |
| [continue...]

## File Formats
[Markdown, JSON, SVG/PNG specs]
```

---

### 9. `docs/setup-guide.md` — Installation & Setup

**Content sources:**
- `README.md` §2-4 (lines 20-104)

**Template:**
```markdown
# Setup Guide

> How to install and run Aurea Solaris.
> **Ownership:** This file is the ONLY source for setup instructions.

## Prerequisites
| Program | Version | Install |
|---------|---------|---------|
| Node.js | 18+ | nodejs.org |
| [continue...]

## Quick Start
[One-click bat, npm start, npm run dev]

## Available Commands
| Command | Description |
|---------|-------------|
| npm start | Dev server |
| [continue...]

## Troubleshooting
[Port in use, TypeScript errors]
```

---

### 10. `docs/project-structure.md` — Folder Guide (Portuguese)

**Content sources:**
- `docs/estrutura-do-projeto.md` (preserve entire content)
- Rename: No, keep as-is with cross-reference added

**Note:** This is the PT version. Add header linking to English index.

---

### 11. `docs/quick-reference.md` — Fast Navigation

**Content sources:**
- `AGENTS.md` (lines 1-71: navigation tables only)
- Slimmed to 30 lines max

**Template:**
```markdown
# Quick Reference

> Fast lookup for common agent tasks.

## "I need to..." → "Go to..."

| Task | File | Docs |
|------|------|------|
| Modify UI component | src/components/ | [project-structure.md](project-structure.md) |
| Add Tauri command | src-tauri/src/lib.rs | [tauri-ipc-api.md](tauri-ipc-api.md) |
| [Continue pattern...] |

## Mandatory Rules
1. Update docs with code changes
2. English primary, PT secondary
3. Max 150 lines per domain doc

## Agents Quick Table
| Agent | Scope | Model |
|-------|-------|-------|
| Dr. Strange | Global | gemini-2.0-pro |
| [continue...] |
```

---

## Non-Destructive Migration Strategy

### Phase 1: Create New Files (SAFE)
1. Create all new domain docs in `docs/`
2. Create `docs/index.md` navigation hub
3. Update `docs/quick-reference.md` (based on AGENTS.md)

### Phase 2: Add Deprecation Headers (ADDITIVE)
Add to top of existing files:
```markdown
> ⚠️ **ARCHIVED** — This document is preserved for reference.
> **New location:** [link to new docs]
> Last valid: 2026-03-26
```

### Phase 3: Update Cross-References (ADDITIVE)
- Update README.md to link to domain docs
- Add navigation hints in AGENTS.md
- No deletions, only additions

## Conflict Prevention (Parallel Agents)

Since multiple agents work on documentation simultaneously:

### Coordination Protocol
1. **File Locking via Git:** Before editing a domain doc, check git status for uncommitted changes
2. **Sequential Edits:** If two agents need same file, the second waits (check git log for recent commits)
3. **New Files Only:** All new work goes to NEW files in `docs/` — old files are frozen

### What Agents CAN Do in Parallel
| Agent A edits | Agent B edits | Safe? |
|---------------|---------------|-------|
| `agents-system.md` | `tauri-ipc-api.md` | ✅ Yes — different domains |
| `agents-system.md` | `astrology-engine.md` | ✅ Yes — different domains |
| `agents-system.md` | `agents-system.md` | ⚠️ No — coordinate via git |

### What Agents CANNOT Do
- Modify content in frozen files (only add deprecation headers)
- Create files outside the documented structure
- Duplicate information across domain docs

---

## Anti-Duplication Rules

Each domain doc MUST start with this ownership header:

```markdown
## Ownership
- **Domain:** [This file's domain]
- **DO NOT DUPLICATE:** Persona details → agents-system.md | Commands → tauri-ipc-api.md
- **Cross-reference only:** If info belongs elsewhere, link to it
```

### Enforcement Options (Pick One)

| Option | Effort | Effectiveness |
|--------|--------|---------------|
| **A. Agent Compliance** (Current) | Low | Medium — relies on agent following rules |
| **B. Pre-commit Hook** | Medium | High — blocks commits with duplicated content |
| **C. CI Validation** | High | Highest — automated checks on PR |

**Recommendation:** Start with Option A, add Option B if duplication issues occur.

---

## Testing Plan

| Test | Method | Success Criteria |
|------|--------|------------------|
| **Link validation** | `grep -r "\[.*\](.*\.md)" docs/` | All links resolve to existing files |
| **Content parity** | Compare section headings old vs new | Each section appears exactly once |
| **Navigation speed** | Timed test: "Find Alfred's model" | ≤3 clicks from index.md |
| **Parallel safety** | Two agents edit different domain docs | Zero merge conflicts |
| **No regressions** | Check old files still accessible | Headers present, links work |

---

## Rollback Plan

If issues arise:
1. Remove deprecation headers from old files
2. Old structure remains intact (nothing was deleted)
3. New files can be archived separately

---

## Implementation Checklist (Ordered by Priority)

### Phase 1: Foundation (Create First)
These enable navigation for all subsequent work.

- [ ] **Create `docs/index.md`** — Navigation hub
  - **Acceptance:** All domain doc links present and valid
  
- [ ] **Create `docs/quick-reference.md`** — Fast lookup
  - **Source:** Extract from `AGENTS.md` lines 1-71 (navigation tables only)
  - **Acceptance:** ≤30 lines, all "task→file" mappings present

### Phase 2: Domain Files (Any Order)
These can be created in parallel by different agents.

- [ ] **Create `docs/agents-system.md`** — Agent personas
  - **Sources:** `arquitetura.md` §2 (lines 19-59) + `AGENTS.md` lines 99-109, 139-148
  - **Acceptance:** All 5 agents documented with models, scopes, personalities

- [ ] **Create `docs/tauri-ipc-api.md`** — Tauri commands
  - **Source:** `arquitetura.md` §4 (lines 118-195)
  - **Acceptance:** All commands in table, safeInvoke pattern documented

- [ ] **Create `docs/astrology-engine.md`** — Python engine
  - **Source:** `arquitetura.md` §5 (lines 217-370)
  - **Acceptance:** House systems, aspects, functions all documented

- [ ] **Create `docs/google-calendar.md`** — Calendar integration
  - **Source:** `arquitetura.md` §3 (lines 62-115)
  - **Acceptance:** Service API and UI integration documented

- [ ] **Create `docs/google-drive-integration.md`** — Drive OAuth
  - **Source:** `arquitetura.md` §4.6 (lines 208-214)
  - **Acceptance:** Commands and OAuth flow documented

- [ ] **Create `docs/data-persistence.md`** — Storage
  - **Source:** `arquitetura.md` §8 (lines 408-422)
  - **Acceptance:** Storage matrix complete

- [ ] **Create `docs/export-system.md`** — Export utilities
  - **Source:** `arquitetura.md` §9 (lines 425-451)
  - **Acceptance:** All export functions documented

- [ ] **Create `docs/setup-guide.md`** — Installation
  - **Source:** `README.md` §2-4 (lines 20-104)
  - **Acceptance:** Prereqs, quick start, commands, troubleshooting

### Phase 3: Deprecation (Last)
Add warnings to old files after all new docs exist.

- [ ] **Add deprecation header to `arquitetura.md`**
  - **Header:**
    ```markdown
    > ⚠️ **ARCHIVED** — Domain-split documentation is now active.
    > **New docs:** [docs/index.md](index.md) for navigation
    > Last valid: 2026-03-26
    ```

- [ ] **Add deprecation header to `AGENTS.md`**
  - **Header:**
    ```markdown
    > ⚠️ **ARCHIVED** — See [docs/quick-reference.md](docs/quick-reference.md)
    > Last valid: 2026-03-26
    ```

- [ ] **Add cross-reference to `docs/estrutura-do-projeto.md`**
  - **Header:**
    ```markdown
    > 📖 **Portuguese version** — English: [docs/index.md](index.md)
    ```

### Phase 4: Verification
- [ ] **Verify all links** — Run `grep -r "\[.*\](.*\.md)" docs/` and check validity
- [ ] **Content parity check** — Each source section appears in exactly ONE new doc
- [ ] **Navigation test** — Agent can find "how to change Alfred's model" in ≤3 clicks from index.md

---

## Approval

- [ ] Design reviewed and approved
- [ ] Ready for implementation

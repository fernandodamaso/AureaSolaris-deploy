# Agents System

> Complete reference for AI agent personas, configuration, and integration.
> **Ownership:** This file is the ONLY source for persona details. Do not duplicate elsewhere.

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
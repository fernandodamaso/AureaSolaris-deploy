# Aurea Solaris Documentation

> **Navigation hub** — all project docs organized by domain.
> **Rule:** Each domain has ONE source of truth.

## Quick Access

| I need to... | Go to... |
|--------------|----------|
| Understand the architecture | [arquitetura.md](arquitetura.md) |
| Find where to edit code | [quick-reference.md](quick-reference.md) |
| Add/modify Tauri command | [tauri-ipc-api.md](tauri-ipc-api.md) |
| Change astrology calculations | [astrology-engine.md](astrology-engine.md) |
| Understand the canonical astrology knowledge contract | [astrology-knowledge-contract.md](astrology-knowledge-contract.md) |
| Open the Biblioteca Visual installation notes | [BIBLIOTECA_VISUAL.md](BIBLIOTECA_VISUAL.md) |
| Sync/import the Engenharia Astrológica corpus safely | [data/ENGENHARIA_SYNC_PLAYBOOK.md](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Certify the astrology engine | [ENGINE_CERTIFICATION_PLAN.md](ENGINE_CERTIFICATION_PLAN.md) |
| Resume the project safely | [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) |
| Integrate with Google Calendar | [google-calendar.md](google-calendar.md) |
| Understand data storage | [data-persistence.md](data-persistence.md) |
| See folder structure | [estrutura-do-projeto.md](estrutura-do-projeto.md) |
| Know the AI assistant (Hermes) | [../AGENTS.md](../AGENTS.md) |

## By Domain

### Architecture & System

- [arquitetura.md](arquitetura.md) — Architecture, layers, commands
- [tauri-ipc-api.md](tauri-ipc-api.md) — All Tauri commands and types
- [data-persistence.md](data-persistence.md) — Storage mechanisms

### Astrology Engine

- [astrology-engine.md](astrology-engine.md) — Python calculations, Swiss Ephemeris
- [astrology-rules.md](astrology-rules.md) — Astrological rules and techniques
- [astrology-knowledge-contract.md](astrology-knowledge-contract.md) — Normative contract linking Engenharia Astrológica to the engine
- [BIBLIOTECA_VISUAL.md](BIBLIOTECA_VISUAL.md) — Current in-app library mode, bundled snapshot, and consultation rules
- [data/ENGENHARIA_SYNC_PLAYBOOK.md](data/ENGENHARIA_SYNC_PLAYBOOK.md) — Operational sync/import playbook with manifests, snapshots, and anti-drift rules
- [ASTROLOGY_LESSONS_LEARNED.md](ASTROLOGY_LESSONS_LEARNED.md) — Lessons from engine development

### Frontend

- [components.md](components.md) — Reusable components
- [design-system.md](design-system.md) — Design tokens and visual guide
- [accessibility.md](accessibility.md) — Accessibility patterns
- [estrutura-do-projeto.md](estrutura-do-projeto.md) — Folder structure (PT-BR)

### Integrations

- [google-calendar.md](google-calendar.md) — Calendar via Composio
- [google-calendar-integration.md](google-calendar-integration.md) — Integration details

### AI Assistant

- [../AGENTS.md](../AGENTS.md) — Hermes: the single AI assistant

### Project Management

- [ROADMAP.md](ROADMAP.md) — canonical implementation order
- [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) — current state and next action
- [MVP_Alfa_Checklist.md](MVP_Alfa_Checklist.md) — MVP progress checklist
- [PLANO_SIMPLIFICACAO.md](PLANO_SIMPLIFICACAO.md) — Simplification plan (June 2026)

### Historical (Preserved)

- [agents-system.md](agents-system.md) — Old 5-agent system (deprecated)
- [AGENTS.md](../AGENTS.md) — Rewritten: now describes Hermes

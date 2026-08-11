# Aurea Solaris — AI Documentation Index

Use this as a routing map, not as a reading list. The canonical agent path is:

1. [`AGENTS.md`](../AGENTS.md) — mandatory rules.
2. [`CONSTITUICAO.md`](CONSTITUICAO.md) — normative product/data decisions.
3. [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — compact task map and validation loop.
4. The relevant domain reference below.

## Domain references

| Domain | Source of truth |
|---|---|
| Browser/local runtime | [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md), [`setup-guide.md`](setup-guide.md), [`arquitetura.md`](arquitetura.md) |
| Native compatibility | [`arquitetura.md`](arquitetura.md), [`tauri-ipc-api.md`](tauri-ipc-api.md) |
| React/UI/accessibility | [`estrutura-do-projeto.md`](estrutura-do-projeto.md), [`components.md`](components.md), [`accessibility.md`](accessibility.md), [`design-system.md`](design-system.md) |
| Astrology engine | [`astrology-engine.md`](astrology-engine.md), [`ENGINE_CERTIFICATION_PLAN.md`](ENGINE_CERTIFICATION_PLAN.md), [`astrology-knowledge-contract.md`](astrology-knowledge-contract.md) |
| Editorial corpus/library | [`BIBLIOTECA_VISUAL.md`](BIBLIOTECA_VISUAL.md), [`data/ENGENHARIA_SYNC_PLAYBOOK.md`](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Private data/storage | [`data-persistence.md`](data-persistence.md), [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md) |
| Hermes | [`HERMES_MIND_ARCHITECTURE.md`](HERMES_MIND_ARCHITECTURE.md), [`HERMES_MIND_API.md`](HERMES_MIND_API.md) |
| Integrations | [`google-calendar-integration.md`](google-calendar-integration.md), [`google-drive-integration.md`](google-drive-integration.md) |
| Setup/commands | [`setup-guide.md`](setup-guide.md), [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) |
| Release evidence | [`RELEASE_VALIDATION_2026-08-10.md`](RELEASE_VALIDATION_2026-08-10.md) |

## Current project state

- Release `0.1.1` technical build and generated-sidecar smoke: documented as passed in the release record.
- Chrome-first launcher/runtime: implemented; manual Windows acceptance remains.
- Native Windows installer acceptance: paused while the Chrome-first path is implemented.
- Branch push/merge: not performed.

## What is not canonical

- `docs/archive/` contains historical plans, specifications, and reviews.
- `docs/agents-system.md` describes the retired multi-agent architecture; current Hermes rules are in `AGENTS.md` and the Hermes domain documents.
- Old implementation plans do not override the Constitution or current code.

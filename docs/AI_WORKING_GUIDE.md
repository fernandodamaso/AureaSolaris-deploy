# AI Working Guide — Aurea Solaris

This is the compact operational context for AI agents. Do not read every document by default.

## Read order

1. `AGENTS.md` — mandatory repository rules and product boundaries.
2. `docs/CONSTITUICAO.md` — normative decisions about privacy, data, editorial rigor, and Hermes.
3. This guide — task routing, validation, and release state.
4. Only the domain document required by the task.
5. `docs/archive/` only when historical context is explicitly needed.

If sources conflict, use: safety/privacy → Constitution → `AGENTS.md` → this guide → domain reference.

## Product invariant

Aurea Solaris is a local-first Windows desktop app. The Caderno Vivo board and journal are two views of the same data. The editorial astrology database is separate from each person's private database. Hermes proposes reversible actions; it never silently creates memory, tasks, events, interpretations, or external effects.

## Task routing

| Task | Start here |
|---|---|
| React screens/components | `src/App.tsx`, `src/components/`, `src/context/` |
| Caderno Vivo / journal | `src/components/MesaCriacao.tsx`, `src/components/DiarioView.tsx` |
| Tauri commands/window/native behavior | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `docs/tauri-ipc-api.md` |
| Astrology calculations/API | `astro_engine.py`, `main_api.py`, `docs/astrology-engine.md` |
| Private/editorial storage | `local_storage.py`, `src-tauri/migrations/`, `docs/data-persistence.md`, `docs/data/DOMINIOS_DE_DADOS.md` |
| Knowledge corpus/import | `knowledge/engenharia_astrologica/`, `docs/astrology-knowledge-contract.md`, `docs/data/ENGENHARIA_SYNC_PLAYBOOK.md` |
| Hermes memory/API | `src/components/HermesChat.tsx`, `docs/HERMES_MIND_ARCHITECTURE.md`, `docs/HERMES_MIND_API.md` |
| Release/installer | `build.bat`, `build_sidecar.spec`, `src-tauri/binaries/`, `docs/RELEASE_VALIDATION_2026-08-10.md` |

## Required working loop

1. Inspect `git status --short --branch` and preserve existing changes.
2. Search with `rg`; read the smallest relevant code and domain document.
3. Make a small change with `apply_patch`.
4. Update the relevant documentation when behavior, data, or workflow changes.
5. Validate proportionally: `npm run build`, `npm run test`, Python engine tests, `cargo check --manifest-path .\src-tauri\Cargo.toml`, or `build.bat` for release work.
6. Report files changed, data/privacy risk, validation performed, and real remaining blockers.

Never use destructive Git commands, invent astrological values or sources, commit secrets, mix private data with editorial data, or silently downgrade a certified calculation to a fallback.

## Calculation requirements

Every calculation must preserve UTC, IANA timezone, location, zodiac, ayanamsa when applicable, house system, orbs, engine/ephemeris version, and input hash. A result is certified only when its receipt is valid and the relevant reference checks pass.

## Release state

Release `0.1.1` has a successful technical build and source-generated sidecar smoke test. The generated installer is recorded in `docs/RELEASE_VALIDATION_2026-08-10.md`. Manual Windows acceptance is still pending. Do not claim the release fully accepted until native install, scaling, navigation, Hermes, persistence, and uninstall are checked by a person.

## Documentation policy

- Keep this guide short and operational.
- Keep product/data rules in `AGENTS.md` and `docs/CONSTITUICAO.md`; do not duplicate them here.
- Keep detailed domain facts in one domain document and link to it.
- Treat `docs/archive/` and historical incident/design files as reference, not current instructions.
- Do not create a handoff document with a second project status; update this guide or the release validation record instead.

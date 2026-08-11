# Quick Reference

This file is retained as a compatibility link for existing references. The canonical AI operating instructions are in [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md).

## Fast routing

| Need to change | Start at |
|---|---|
| React UI/state | `src/App.tsx`, `src/components/`, `src/context/` |
| Caderno Vivo/journal | `src/components/MesaCriacao.tsx`, `src/components/DiarioView.tsx` |
| Tauri/native | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| Astrology | `astro_engine.py`, `main_api.py` |
| Private/editorial storage | `local_storage.py`, `src-tauri/migrations/` |
| Hermes | `src/components/HermesChat.tsx`, `docs/HERMES_MIND_*.md` |
| Installer/release | `build.bat`, `build_sidecar.spec`, `docs/RELEASE_VALIDATION_2026-08-10.md` |

## Validation

```powershell
npm run build
npm run test
cargo check --manifest-path .\src-tauri\Cargo.toml
```

For a Windows release, use `build.bat` and then the release validation record. Read `AGENTS.md` before changing code, data, documentation, or configuration.

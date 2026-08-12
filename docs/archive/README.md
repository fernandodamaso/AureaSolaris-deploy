# Historical documentation archive

This folder holds completed evidence and incident records that remain useful for audit trails but are no longer part of the active agent routing map. Current instructions live in [`docs/index.md`](../index.md), [`AGENTS.md`](../../AGENTS.md), and [`AI_WORKING_GUIDE.md`](../AI_WORKING_GUIDE.md).

| Document | Date | Why it remains |
|----------|------|----------------|
| [`VIV-6_EXECUTABLE_BASELINE_2026-08-11.md`](VIV-6_EXECUTABLE_BASELINE_2026-08-11.md) | 2026-08-11 | Executable and Git baseline captured before the VIV audit hardening pass; reference for what was measured, not what to run today. |
| [`ENGINE_INCIDENT_2026-08-10.md`](ENGINE_INCIDENT_2026-08-10.md) | 2026-08-10 | Root-cause record for the Mandala/Hermes sidecar failure (packaged entrypoint, UTC boundary, speed labeling); useful when verifying regressions are fixed. |
| [`CLEANUP_VALIDATION_2026-08-11.md`](CLEANUP_VALIDATION_2026-08-11.md) | 2026-08-11 | Post-cleanup validation: editorial corpus hashes, installer backup SHA-256, and scope of removed artifacts. |

Active release evidence stays at [`RELEASE_VALIDATION_2026-08-10.md`](../RELEASE_VALIDATION_2026-08-10.md).

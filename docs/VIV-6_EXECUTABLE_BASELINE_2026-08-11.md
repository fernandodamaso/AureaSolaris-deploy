# VIV-6 — Executable baseline

Audit date: 2026-08-11, 23:00:14 -03:00
Repository: repository root supplied for this task
Branch: `work/viv-audit-hardening`

This record establishes the executable baseline for the later VIV audit work.
It does not implement VIV-7 through VIV-17, rewrite Git history, move or delete
user files, or change credentials.

## Audited Git state

- HEAD: `2669751f160106943ac1b9560a065feaf871e314`
- HEAD subject: `documentação`
- HEAD author/date: `Vivic`, `2026-08-11T19:55:21-03:00`
- `git status --short --branch`: `## work/viv-audit-hardening`
- `git diff --check`: exit `0`, no output
- `git ls-files --others --exclude-standard`: zero files

The audited HEAD was clean before this evidence document was created.

## Tool and runtime baseline

| Tool | Observed version/state |
| --- | --- |
| Git | `2.54.0.windows.1` |
| Node.js | `v24.19.0` |
| npm | `11.17.0` |
| Python | `3.11.15` in the active interpreter |
| Rust compiler (`rustc`) | Not found |
| Cargo | Not found |
| Node dependencies | `node_modules` absent |
| `swisseph` Python module | Not available in the active interpreter |
| FastAPI / Uvicorn | Available in the active interpreter |

The declared Python runtime pins `pyswisseph==2.10.3.2` in
`requirements-api.txt`; the pinned package is not installed in this active
interpreter. The application source catches that import failure, but the
current transit test reaches `swe.SUN` and fails before executing its test
logic.

## Reproducible baseline commands and results

Commands were run from the repository root at the audit time above.

| Command | Result |
| --- | --- |
| `git status --short --branch` | Exit `0`; clean `work/viv-audit-hardening` branch |
| `git rev-parse --verify HEAD` | Exit `0`; `2669751f160106943ac1b9560a065feaf871e314` |
| `git diff --check` | Exit `0`; no output |
| `npm run build` | Exit `1`; `tsc` not recognized because Node dependencies are absent |
| `npm run lint` | Exit `1`; `eslint` not recognized because Node dependencies are absent |
| `npm test` | Exit `1`; `vitest` not recognized because Node dependencies are absent |
| `python test_transit.py` | Exit `1`; `NameError: name 'swe' is not defined` after unavailable `swisseph` import |
| `cargo check --manifest-path .\src-tauri\Cargo.toml` | Exit `1`; `cargo` not found |

The npm scripts are declared in `package.json` and were not changed by this
task. These failures are environment/setup blockers, not ESLint, TypeScript,
Vitest, Python-engine, or Rust findings.

## Conditional follow-up work

Linear is unavailable in this session and the repository does not contain the
titles or dependency graph for VIV-7 through VIV-17. Therefore this baseline
does not invent a numeric task-to-task mapping. The following gates apply to
the later issues by subject:

1. **ESLint or frontend quality work:** conditional on restoring the locked
   Node dependency environment, then rerunning `npm run lint` and the relevant
   build/test commands. The current `eslint` result is “not executable”, not a
   list of lint violations.
2. **Astrology-engine work:** conditional on the isolated Python environment
   being provisioned from `requirements-api.txt`, followed by a fresh engine
   test run. VIV-6 does not repair the `swisseph` import path.
3. **Tauri/Rust work:** conditional on installing or exposing the required
   Rust/Cargo toolchain, followed by `cargo check`.
4. **Secret/private-file work:** requires a separate, explicit privacy
   inventory and preservation decision. The tracked path
   `natal_charts/viviane.json` is a personal-looking chart file and must not be
   deleted, moved, or rewritten as part of this baseline. The tracked
   `src-tauri/migrations/private/` files are schema files, while
   `knowledge/engenharia_astrologica/knowledge/build/` is editorial build
   output; neither classification is a certification that file contents are
   safe. No file contents or credentials were changed here.

The `.gitignore` rules for `.env` and `.env.*` matched the checked paths. Only
`.env.example` is tracked in that family. This path-level check does not prove
that Git history or every tracked text file is free of secrets; any later
secret audit must establish its own evidence and preserve recoverability.

## Scope and risk

Only this documentation/evidence file is intended to change for VIV-6. The
runtime remains unvalidated until the missing dependencies/toolchains are
available. The main privacy risk identified for follow-up is the tracked
personal chart path noted above; no destructive cleanup or credential action
was authorized or performed.

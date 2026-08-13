# Task 3 Report — Enforce loopback request boundary and expose runtime mode

**Branch:** `feat/skip-login-local-owner`  
**Date:** 2026-08-13

## Summary

Implemented TrustedHost middleware, browser-command Origin/Sec-Fetch-Site guard, and `/health` runtime identity fields (`auth_mode`, `browser_contract_version`). Updated existing `TestClient` constructions to use `base_url="http://127.0.0.1"`.

## Files changed

| File | Change |
| --- | --- |
| `main_api.py` | `TrustedHostMiddleware`, `_resolve_auth_mode` / `AUTH_MODE`, health fields, browser-command guard |
| `tests/test_browser_runtime.py` | Request-boundary tests, health-contract tests, `base_url` on isolated clients |

## TDD — RED

Command:

```powershell
C:\git\AureaSolaris\.aurea-build-venv\Scripts\python.exe -m unittest tests.test_browser_runtime
```

Result: **FAILED** (failures=3, errors=2) — unsafe requests still passed.

Relevant failures:

```
FAIL: test_non_loopback_host_is_rejected
AssertionError: 200 != 400

FAIL: test_cross_site_browser_command_is_rejected
AssertionError: 401 != 403

FAIL: test_unapproved_origin_is_rejected
AssertionError: 401 != 403

ERROR: test_health_exposes_auth_mode_and_browser_contract_version
KeyError: 'auth_mode'

ERROR: test_health_auth_mode_reflects_module_state
AttributeError: module 'main_api' does not have the attribute 'AUTH_MODE'
```

Control tests (served origin, Vite origins, automation without Origin) passed on RED (not rejected with 403).

## TDD — GREEN

Command:

```powershell
C:\git\AureaSolaris\.aurea-build-venv\Scripts\python.exe -m unittest tests.test_browser_runtime
```

Result: **OK** — Ran 19 tests in ~15s.

```
....................
----------------------------------------------------------------------
Ran 19 tests in 15.101s

OK
```

## Implementation notes

- `TrustedHostMiddleware` added **before** CORS with `allowed_hosts=["127.0.0.1", "localhost"]`; no `testserver`.
- `AUTH_MODE` resolved once at import: trimmed `AUREA_REQUIRE_LOGIN=1` → `require-login`, else `local-owner`.
- Browser guard runs before command dispatch; CORS origins unchanged for Tauri.
- `private_initial_access` not implemented (Task 4); rejection tests use it only to hit the guard early.

## Commit

Hash: `638c1dd`

```
feat(security): constrain browser access to loopback
```

## Out of scope (not touched)

- `private_initial_access` / owner resolution (Task 4)
- `docs/RELEASE_VALIDATION_2026-08-10.md`, `src/components/MandalaPage.tsx`, `tests/mandala_visual_smoke.ps1`

## Concerns

- Other test modules (`test_chat_provider_selection.py`, `test_hermes_mind_api.py`) still use `TestClient(main_api.app)` without `base_url`; they may fail once those routes are exercised under TrustedHost. Task brief scoped changes to `test_browser_runtime.py` only.

## Fix appended 2026-08-13

- Updated every `TestClient(main_api.app ...)` in `tests/test_chat_provider_selection.py` and `tests/test_hermes_mind_api.py` to use `base_url="http://127.0.0.1"`.
- Verification: `& .\.aurea-build-venv\Scripts\python.exe -m unittest tests.test_chat_provider_selection tests.test_hermes_mind_api tests.test_browser_runtime` → **OK** (28 tests).

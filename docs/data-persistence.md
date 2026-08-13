# Data Persistence

The Chrome runtime keeps the editorial database and each person's private data
separate. The browser session is held in memory and is not written to
`localStorage`.

## Storage matrix

| Data type | Current Chrome storage | Ownership |
|---|---|---|
| Account credentials and Hermes records | Local SQLite under the configured Aurea data directory | `owner_id` in the private database |
| Caderno Vivo boards | Local JSON under the owner's private workspace | Authenticated browser owner |
| Diary folders and entries | Local JSON under the owner's private workspace | Authenticated browser owner |
| Health document previews | Local JSON under the owner's private workspace | Authenticated browser owner and selected map |
| Profile, agenda and UI preferences | Browser `localStorage` | App-local UI state; never used as password storage |
| Editorial knowledge | Local SQLite imported from the canonical editorial snapshot | Shared impersonal corpus; never mixed with private records |

In `local-owner` mode the UI does not invent a natal. For testing, enable the
project mock chart (`src/fixtures/reference-natal.json`, Belo Horizonte,
1985-12-01 16:04) with `?mockNatal=1` or `.\launch_chrome.ps1 -MockNatal`.
That flag is remembered in `localStorage` as `aurea_mock_natal=1` until
`?mockNatal=0`. The mock stays in the private UI profile and is never mixed
into the editorial database.

## Real data vs test user

The person's **real** private Aurea lives at `%LOCALAPPDATA%\Aurea Solaris\data`.
Agents and automated checks must **not** seed, reset, or modify that directory.
Use the isolated test-user sandbox instead.

| Scope | Path |
|---|---|
| Real private data | `%LOCALAPPDATA%\Aurea Solaris\data` |
| Test user root | `%LOCALAPPDATA%\Aurea Solaris\test-user` |
| Test user private data | `%LOCALAPPDATA%\Aurea Solaris\test-user\data` |
| Test user Chrome profile | `%LOCALAPPDATA%\Aurea Solaris\test-user\chrome-profile` |

### Commands (PowerShell, repository root)

Start the isolated test user:

```powershell
.\launch_chrome.ps1 -TestUser
```

Wipe the sandbox and re-seed a fresh dummy life:

```powershell
.\launch_chrome.ps1 -TestUser -Reset
```

`-Reset` only works with `-TestUser`. It stops Aurea test-user runtimes on ports
**9878–9899** (it does not kill unrelated listeners), closes the isolated Chrome
profile if it is still open, removes the entire `test-user` folder, runs
`tools\seed_test_user.py`, and starts a new API process (it does not reuse a
stale test-user runtime).

### Isolation and runtime

- Owner id: **`aurea-test`** (display name **Pessoa Teste**).
- API: port **9878** by default; if busy, the launcher picks **9879–9899**. A later
  `-TestUser` launch reuses a compatible test-user runtime already listening in
  that range instead of starting another process.
- Environment: the child runtime receives `AUREA_DATA_DIR` and `AUREA_TEST_USER=1`.
  The launcher restores the parent PowerShell environment before returning, so a
  later default launch in the same session does not inherit the sandbox. Test-user
  always uses `local-owner`, even if `AUREA_REQUIRE_LOGIN=1` is set for the normal
  runtime.
- Chrome opens with a dedicated profile under `test-user\chrome-profile`. The
  launcher looks for Chrome on `PATH` and in the usual Program Files / LocalAppData
  install folders.
- `GET /health` includes `"test_user": true` when the test-user API is active.
- The default Aurea runtime (no `-TestUser`) uses port **9876** and the real data dir.
- `-TestUser` requires `.aurea-build-venv` for the initial seed step (the launcher
  always invokes `tools\seed_test_user.py` through that venv).

`tools/seed_test_user.py` seeds the private SQLite account and file-backed workspace.
It **refuses** to run against `%LOCALAPPDATA%\Aurea Solaris\data` or any folder
inside that tree.

### Dummy life contents

**Backend seed** (`tools/seed_test_user.py`):

- Caderno Vivo board with sticky notes and an edge between them.
- Diário folder and sample entry.
- Fictional health document preview.
- Hermes thread with a proposed memory and one approved memory.

**UI seed** (applied in the isolated Chrome profile only when `/health` reports
`test_user: true` **and** the authenticated owner is `aurea-test`, from
`src/fixtures/test-user-ui.json` via `src/utils/test-user-ui-seed.ts`):

- Mandala maps (reference natal fixture plus a second known-person map).
- Agenda tasks and one calendar event in `localStorage`.

### `-MockNatal` vs `-TestUser`

| Mode | Data dir | Typical use |
|---|---|---|
| Default launch | Real `%LOCALAPPDATA%\Aurea Solaris\data` | Person's own Aurea |
| `-TestUser` | `test-user\data` | Full isolated sandbox with seeded dummy life |
| `-MockNatal` / `?mockNatal=1` | Same as current runtime | Inject the reference natal into the open owner's UI profile only |

`-MockNatal` does not switch directories. If both `-TestUser` and `-MockNatal` are
passed, **`-TestUser` wins** (the launcher exits before applying mock natal).

The browser adapter calls the local FastAPI runtime on every application
opening. In default `local-owner` mode, the API resolves one unambiguous
enabled owner, returns one process-lifetime session token held only in API and
browser module memory, and reuses that token until the API process stops. There
is no time-based or inactivity expiry in this mode. In `require-login` mode
(`AUREA_REQUIRE_LOGIN=1`), password authentication and the existing
session close behavior apply.

Owner resolution is fail-closed. The API inspects `private.sqlite` accounts and
`memory/owners/*` workspaces and must not select among accounts, migrate
directories, or adopt orphan data. When reusing an existing account, the
resolver must never assume its id is `local-owner`, never rename an owner or
move a directory, and must not hash a throwaway password:

| Accounts in `private.sqlite` | Owner workspaces | Result |
|---|---|---|
| None | None | Create account `local-owner`, then use it |
| Exactly one enabled account | None, or only the matching owner directory | Reuse that account's real id and display name |
| One disabled account | Any | `setup-required: disabled-owner` |
| More than one account, including disabled accounts | Any | `setup-required: multiple-owners` |
| None | One or more owner directories | `setup-required: orphan-workspace` |
| One account | Any non-matching owner directory | `setup-required: owner-conflict` |

Full contract: `docs/superpowers/plans/2026-08-12-skip-login-local-owner.md`.

## Backups and migration

Private SQLite backups are created only by an explicit backup action and carry
an integrity check and SHA-256 receipt. Schema migrations preserve the original
database through a verified pre-migration backup. Editorial imports preserve
source hashes and publication metadata.

One pre-release private bootstrap checksum is recognized as a read-only
compatibility marker so an existing database can open after the migration file
was committed. The data and recorded historical checksum are not rewritten;
any other checksum mismatch still blocks startup.

## Important boundary

The old `src-tauri/memory/` files and the Tauri filesystem commands remain for
native compatibility. They are not the source of truth for the Chrome path.

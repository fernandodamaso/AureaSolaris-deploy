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

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

The browser adapter authenticates with the local FastAPI runtime on every
application opening. It keeps only a short-lived in-memory session token while
the tab is open. Closing the session invalidates that token.

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

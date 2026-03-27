# Google Drive Integration

> OAuth2 connection with PKCE flow.
> **Ownership:** This is the ONLY source for Drive details.

## Commands

| Command | Description |
|---------|-------------|
| `google_drive_status` | Checks if Google Drive is connected |
| `google_drive_connect` | Starts OAuth2 flow (opens browser for consent) |
| `google_drive_disconnect` | Removes OAuth2 tokens, disconnects from Drive |
| `google_drive_list_files` | Lists files in the connected Google Drive |
| `google_drive_upload` | Uploads file (name + content) to Google Drive |

## Token Storage

Tokens saved to `google_tokens.json` in the app data directory.

## OAuth Flow

1. `google_drive_connect` opens browser for Google consent
2. User grants permission to access Drive
3. Callback received at `localhost:8919`
4. Tokens saved locally for future use

## UI Integration

Accessible through Control Panel (`ControlePanel.tsx`) — monitored by agent **Stark**.

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — Command details
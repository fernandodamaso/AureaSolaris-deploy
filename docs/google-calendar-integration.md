# Google Calendar Integration

> OAuth2 connection via Composio MCP.
> **Ownership:** This is the ONLY source for Calendar details.

## Configuration

1. Obtenha uma API key em [app.composio.dev](https://app.composio.dev)
2. Adicione ao `.env`:
   ```
   VITE_COMPOSIO_API_KEY=sua_chave_aqui
   ```
3. Conecte sua conta Google via dashboard do Composio

## Service: `src/services/composio.ts`

The wrapper provides functions for basic operations:

| Function | Description |
|----------|-------------|
| `connect()` | Conects to Google account via Composio |
| `listEvents(params)` | Lists events (supports `timeMin`, `timeMax`) |
| `createEvent(params)` | Creates new event in Google Calendar |
| `deleteEvent(id)` | Removes event from Google Calendar |

## Frontend Integration

The `AgendaView.tsx` component integrates Google Calendar events:
- **Button "Google Calendar"** — connects/disconnects
- **Google Events** — shown with blue badge and `Calendar` icon
- **Local Events** — shown with gold badge and `Clock` icon

## Token Storage

Tokens managed by Composio MCP (external storage).

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — Command details for `add_google_event`, `delete_google_event`, `get_google_events`
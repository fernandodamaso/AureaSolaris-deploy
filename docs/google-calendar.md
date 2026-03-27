# Google Calendar Integration

> Calendar sync via Composio MCP.
> **Ownership:** This is the ONLY source for calendar details.

## Configuration

1. Get API key at [app.composio.dev](https://app.composio.dev)
2. Add to `.env`:
   ```
   VITE_COMPOSIO_API_KEY=your_key_here
   ```
3. Connect Google account via Composio dashboard

## Service API (`src/services/composio.ts`)

| Function | Description |
|----------|-------------|
| `connect()` | Connects to Google via Composio |
| `listEvents(params)` | Lists events (supports timeMin, timeMax) |
| `createEvent(params)` | Creates new calendar event |
| `deleteEvent(id)` | Removes calendar event |

## UI Integration (`AgendaView.tsx`)

- **"Google Calendar" button** — Connect/disconnect
- **Google events** — Blue badge, Calendar icon
- **Local events** — Gold badge, Clock icon
- Events merged in daily view

## Example Usage

```typescript
import { googleCalendarService } from '../services/composio';

await googleCalendarService.connect();
const events = await googleCalendarService.listEvents({
  timeMin: new Date().toISOString(),
  timeMax: endOfDay.toISOString(),
});
```

## Related Documentation

- [agents-system.md](agents-system.md) — Alfred (manages agenda)
- [tauri-ipc-api.md](tauri-ipc-api.md) — Composio service commands
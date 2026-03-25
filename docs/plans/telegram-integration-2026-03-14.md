# Implementation Plan: Telegram Integration with Dashboard Configuration

## Goal

Create a comprehensive Telegram integration that:
1. **Verifies** the existing basic Telegram integration
2. **Enhances** it with proper error handling and testing capabilities
3. **Provides** a dashboard interface for configuring Telegram settings
4. **Makes** configuration updates easy and accessible

## Scope

### In Scope
- Backend Telegram module refactoring (`telegram.rs`)
- New Tauri commands for configuration management and testing
- Frontend `TelegramConfig` component for dashboard
- Integration into `ControlePanel` and `AlfredHub`
- Error handling taxonomy (Network, Auth, Validation)
- Documentation updates

### Out of Scope
- Receiving incoming Telegram messages (webhooks)
- Supporting multiple bots/chats (single bot architecture)
- Message history storage in database
- Rate limiting implementation (handled by Telegram API)

## Technical Constraints
- **Tauri Version:** 2.0 (verified in `Cargo.toml`)
- **Storage Strategy:** JSON files via `tauri-plugin-fs` (already installed)
- **Frontend:** React + TypeScript + Tailwind CSS
- **Language:** Portuguese (BR) for UI text
- **Pattern:** Use existing `safeInvoke` wrapper for IPC

---

## Phase 0: Verification & Baseline (NEW)

> **Objective:** Verify current functionality and technical compatibility before writing code.

### Tasks
1. **Verify Current Telegram Functionality**
   - Test existing `send_telegram_message` with current `.env.local` credentials
   - Document success/failure baseline
   - *Reviewer:* User confirmation

2. **Verify Tauri FS Plugin Capabilities**
   - Confirm `tauri-plugin-fs` can write to `app_data_dir()`
   - Test JSON read/write operations
   - *Reviewer:* Technical verification via minimal test command

3. **Define Error Templates**
   - Create error message map for UI display
   - Categories: `AUTH_ERROR`, `NETWORK_ERROR`, `VALIDATION_ERROR`, `API_ERROR`
   - *Reviewer:* User review for clarity

### Phase 0 Completion Gate
- [ ] Existing `send_telegram_message` verified working
- [ ] Tauri FS write permissions confirmed
- [ ] Error templates approved

---

## Phase 1: Backend Enhancement

> **Objective:** Create robust Telegram backend module with configuration management.

### Tasks

1. **Create `src-tauri/src/telegram.rs`**
   - Struct `TelegramConfig { token: String, chat_id: String }`
   - Function `get_config_path(app: &AppHandle) -> PathBuf`
   - Function `load_config(app: &AppHandle) -> Result<TelegramConfig, String>`
   - Function `save_config(app: &AppHandle, config: &TelegramConfig) -> Result<(), String>`

2. **Implement `get_telegram_config` Command**
   - Load from app data JSON
   - Fallback to `.env.local` if JSON doesn't exist
   - Return masked token (last 4 chars) to frontend

3. **Implement `set_telegram_config` Command**
   - Validate token format (starts with numbers: `<bot_id>:<hash>`)
   - Validate chat_id format (numeric)
   - Save to `{app_data}/config/telegram.json`

4. **Implement `test_telegram_connection` Command**
   - Call `https://api.telegram.org/bot<token>/getMe`
   - Return `{ valid: boolean, bot_name: string, error?: string }`

5. **Implement `send_telegram_test_message` Command**
   - Use stored config (not env vars)
   - Send "Aurea Solaris Test Message 🌟"
   - Return success/failure status

6. **Refactor `lib.rs`**
   - Move existing `send_telegram_message` logic to use `telegram.rs` module
   - Register new commands in `invoke_handler`

### Phase 1 Completion Gate
- [ ] All new commands tested via `curl` or unit tests
- [ ] Error cases return structured JSON errors
- [ ] Existing `send_telegram_message` still works (backward compat)

---

## Phase 2: Frontend Integration

> **Objective:** Build user-friendly configuration interface.

### Tasks

1. **Create `src/components/TelegramConfig.tsx`**
   - Form fields: Token (masked display), Chat ID
   - Buttons: "Salvar", "Testar Conexão", "Enviar Teste"
   - Status indicator: Connected/Error/Not Configured
   - Real-time validation feedback

2. **Create `src/components/common/TelegramStatus.tsx`**
   - Compact status badge component
   - Props: `status: 'online' | 'offline' | 'error' | 'loading'`
   - Used in multiple views

3. **Integrate into `ControlePanel.tsx`**
   - Add Telegram section under "Conexões Estelares"
   - Replace static "online" status with real `TelegramStatus`
   - Add "Configurar" button to open full config modal

4. **Integrate into `AlfredHubView.tsx`**
   - Add quick "Send to Telegram" action
   - Simple message input + send button
   - Uses stored config

5. **Create `src/hooks/useTelegram.ts`**
   - Hook for Telegram status management
   - Functions: `testConnection`, `sendMessage`, `getConfig`, `updateConfig`
   - Auto-refresh status on mount

### Phase 2 Completion Gate
- [ ] UI matches Stark's aesthetic (dark/gold theme)
- [ ] Connection status reflects real API state
- [ ] Configuration persists between page navigations

---

## Phase 3: Testing, Documentation & Cleanup

> **Objective:** Ensure quality and maintainability.

### Tasks

1. **End-to-End Testing**
   - Test full flow: Configure → Test → Send Message
   - Test error scenarios: invalid token, network failure
   - Test persistence: restart app, config survives

2. **Update `docs/arquitetura.md`**
   - Add new Telegram commands to command table
   - Document configuration storage location
   - Update flow diagrams

3. **Update `.factory/library/environment.md`**
   - Note that `.env.local` is now fallback
   - Document new config file location

4. **Update `AGENTS.md`**
   - Add Telegram config location to navigation table
   - Update agent personas if needed

### Phase 3 Completion Gate
- [ ] All documentation updated
- [ ] No TypeScript/compilation errors
- [ ] Manual test pass completed

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src-tauri/src/telegram.rs` | Telegram backend module |
| `src/components/TelegramConfig.tsx` | Configuration UI component |
| `src/components/common/TelegramStatus.tsx` | Status badge component |
| `src/hooks/useTelegram.ts` | Telegram React hook |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/lib.rs` | Add telegram module, new commands |
| `src/components/ControlePanel.tsx` | Add Telegram config section |
| `src/components/AlfredHubView.tsx` | Add quick message sending |
| `docs/arquitetura.md` | Document new commands |
| `.factory/library/environment.md` | Update env var docs |
| `AGENTS.md` | Update navigation table |

---

## Error Handling Taxonomy

| Error Type | Code | User Message (PT-BR) |
|------------|------|----------------------|
| Invalid Token | `AUTH_ERROR` | "Token inválido. Verifique as credenciais do bot." |
| Network Timeout | `NETWORK_ERROR` | "Não foi possível conectar ao Telegram. Verifique sua internet." |
| Invalid Chat ID | `VALIDATION_ERROR` | "Chat ID inválido. Deve ser numérico." |
| API Error | `API_ERROR` | "Erro na API do Telegram: {details}" |

---

## Configuration Storage

**Location:** `{app_data}/config/telegram.json`

```json
{
  "token": "8709373822:AAFSk6pXENBrxDNEUxIXohObhKlmgchlNqU",
  "chat_id": "6834785039"
}
```

**Fallback:** If JSON doesn't exist, read from `.env.local` environment variables.

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Multiple bots? | No - single bot architecture |
| Incoming messages? | No - send only |
| Message history? | No - Telegram stores history |
| Rate limiting? | Handled by Telegram API, no custom implementation |

---

## Reviewer Requirements

### Phase 0
- **Reviewer:** User (Viviane)
- **Context:** Current `.env.local` has valid credentials
- **Action:** Confirm existing `/sendMessage` works

### Phase 1
- **Reviewer:** Stark persona (technical review)
- **Context:** New `telegram.rs` module + commands
- **Action:** Verify error handling, edge cases

### Phase 2
- **Reviewer:** User (Viviane)
- **Context:** UI screenshots or live demo
- **Action:** Confirm UX, aesthetics, functionality

### Phase 3
- **Reviewer:** User + Documentation check
- **Context:** Full integration test
- **Action:** Sign-off for production use

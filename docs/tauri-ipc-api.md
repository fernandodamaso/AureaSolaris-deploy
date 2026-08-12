# Tauri IPC API — Aurea Solaris (deferred compatibility)

> **Runtime note:** The primary runtime is the local web app served in Chrome at `127.0.0.1`. The Tauri shell and IPC commands below remain for future native packaging compatibility; new features should target the browser runtime and `main_api.py` HTTP API first.

## Como funciona

O frontend chama comandos Rust via `safeInvoke`:
```typescript
const result = await safeInvoke<T>('comando', { param1: value1 });
```

`safeInvoke` (em `src/utils/tauri.ts`) retorna `null` em caso de erro (nunca lança exceção). Sempre verifique o retorno.

## Source locations (Rust modules)

| Domain | Module | Commands |
|--------|--------|----------|
| Private session & auth | `src-tauri/src/private_session.rs` | `private_session_open`, `private_account_register`, `private_sidecar_request`, `private_session_close` |
| Windows DPAPI secrets | `src-tauri/src/windows_secrets.rs` | `remembered_owner_set`, `remembered_owner_get`, `remembered_owner_clear` |
| Boards & health memory | `src-tauri/src/boards.rs` | `save_board`, `load_board`, `list_boards`, `delete_board`, `load_health_memory`, `save_health_memory` |
| Astro sidecar proxy | `src-tauri/src/sidecar.rs` | `run_astro_engine`, `get_transit_positions`, `get_sys_info` |
| Diary & Obsidian vault | `src-tauri/src/diary.rs` | `diary_*`, `obsidian_diary_*` (15 commands) |
| Legacy migration | `src-tauri/src/legacy_migration.rs` | (internal; no IPC) |

Handler registration: `src-tauri/src/lib.rs` → `generate_handler![…]`.

## Comandos Registrados

### Sessão privada (4 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `private_session_open` | `{ owner_id, login_name, password }` | `string` | Autentica e abre sessão |
| `private_account_register` | `{ owner_id, display_name, login_name, password }` | `string` | Cria perfil e abre sessão |
| `private_sidecar_request` | `{ method, path, query?, body? }` | `Value` | Proxy autenticado para rotas Hermes/storage |
| `private_session_close` | — | `()` | Encerra sessão |

### Lembrar proprietário — Windows DPAPI (3 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `remembered_owner_set` | `{ owner_id }` | `bool` | Memoriza owner_id com DPAPI |
| `remembered_owner_get` | — | `string \| null` | Recupera owner memorizado |
| `remembered_owner_clear` | — | `bool` | Remove owner memorizado |

### Diário (10 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `diary_create_entry` | `{ title, folder_id }` | `DiaryEntry` | Cria nova entrada |
| `diary_update_entry` | `{ id, title?, content?, folder_id? }` | `DiaryEntry` | Atualiza entrada |
| `diary_delete_entry` | `{ id }` | `()` | Deleta entrada |
| `diary_list_entries` | `{ folder_id? }` | `DiaryEntry[]` | Lista entradas de uma pasta |
| `diary_get_entry` | `{ id }` | `DiaryEntry` | Busca entrada por ID |
| `diary_create_folder` | `{ name, icon }` | `DiaryFolder` | Cria pasta |
| `diary_list_folders` | — | `DiaryFolder[]` | Lista todas as pastas |
| `diary_delete_folder` | `{ id }` | `()` | Deleta pasta e suas entradas |
| `diary_save_tabs` | `{ open_ids, active_id }` | `()` | Salva estado das abas |
| `diary_load_tabs` | — | `{ openTabIds, activeTabId }` | Carrega estado das abas |

### Obsidian (5 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `obsidian_diary_list_entries` | — | `[{ date, filename, path, preview }]` | Lista entradas do vault |
| `obsidian_diary_read_entry` | `{ date }` | `{ date, content, path }` | Lê entrada por data |
| `obsidian_diary_save_entry` | `{ date, content }` | `()` | Salva/atualiza entrada |
| `obsidian_diary_delete_entry` | `{ date }` | `()` | Deleta entrada |
| `obsidian_diary_get_vault_path` | — | `string` | Caminho do vault |

### Mesa de Criação (4 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `save_board` | `{ board_id, name, nodes, edges }` | `u64` | Salva board |
| `load_board` | `{ board_id }` | `{ nodes, edges }` | Carrega board |
| `list_boards` | — | `BoardIndex[]` | Lista boards do proprietário |
| `delete_board` | `{ board_id }` | `()` | Remove board |

### Saúde (2 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `load_health_memory` | `{ profile_id }` | `Value` | Carrega memória de saúde |
| `save_health_memory` | `{ profile_id, memory }` | `()` | Salva memória de saúde |

### Astrologia (2 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `run_astro_engine` | `{ type: 'natal'\|'transit', ... }` | `AstroResult` | Calcula mapa/trânsitos via sidecar |
| `get_transit_positions` | `payload` | `AstroResult` | Atalho de trânsito (injeta `transit: true`) |

### Sistema (1 comando)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `get_sys_info` | — | `SysInfo` | CPU, RAM, disco |

## Tipos

```typescript
interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
}

interface DiaryFolder {
  id: string;
  name: string;
  icon: string;
}

interface DiaryTabState {
  openTabIds: string[];
  activeTabId: string | null;
}
```

## Erros

Todos os comandos retornam `Result<T, String>` no Rust. O `safeInvoke` captura erros e retorna `null`. Verifique sempre:

```typescript
const result = await safeInvoke<DiaryEntry[]>('diary_list_entries');
if (result) {
  // sucesso
} else {
  // erro silencioso (log no console)
}
```

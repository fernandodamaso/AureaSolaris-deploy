# Tauri IPC API — Aurea Solaris

## Como funciona

O frontend chama comandos Rust via `safeInvoke`:
```typescript
const result = await safeInvoke<T>('comando', { param1: value1 });
```

`safeInvoke` (em `src/utils/tauri.ts`) retorna `null` em caso de erro (nunca lança exceção). Sempre verifique o retorno.

## Comandos Registrados

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

### Mesa de Criação (2 comandos)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `save_board` | `{ nodes, edges }` | `()` | Salva board |
| `load_board` | — | `{ nodes, edges }` | Carrega board |

### Astrologia (1 comando)

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `run_astro_engine` | `{ type: 'natal'\|'transit', ... }` | `AstroResult` | Calcula mapa/trânsitos via sidecar |

### Integrações

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| *(nenhuma integração externa obrigatória no escopo atual)* | — | — | Agenda e tarefas são persistidas localmente primeiro; adapters de calendário são opcionais e consentidos. |

### Sistema

| Comando | Parâmetros | Retorno | Descrição |
|---------|-----------|---------|-----------|
| `get_sys_info` | — | `SysInfo` | CPU, RAM, disco, OS |
| `get_key` | `{ service, key }` | `string` | Busca chave segura |
| `save_app_setting` | `{ key, value }` | `()` | Salva config do app |

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

# Tauri IPC API — Aurea Solaris

> Documentação da interface de comunicação entre o frontend (React/TypeScript) e o backend (Tauri/Rust) via comandos Tauri.

## Visão Geral

A comunicação entre o React (frontend) e o Rust (backend) no Aurea Solaris é feita através do sistema de invoke do Tauri. Todos os comandos são expostos como funções assíncronas que podem ser chamadas do frontend usando o wrapper `safeInvoke`.

## Frontend: `safeInvoke`

Utilizamos um wrapper em `src/utils/tauri.ts` chamado `safeInvoke`. Ele verifica se o ambiente Tauri está disponível antes de fazer a chamada, prevenindo erros em desenvolvimento web puro.

```typescript
// src/utils/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    // @ts-expect-error - Tauri internal API not typed
    if (window.__TAURI_INTERNALS__) return await invoke<T>(cmd, args);
    return null;
  } catch (err) {
    console.error(`[safeInvoke Error] ${cmd}:`, err);
    return null;
  }
}
```

### Uso Básico

```typescript
import { safeInvoke } from '../utils/tauri';

// Chamada simples
const result = await safeInvoke('command_name', { param1: 'value', param2: 42 });

// Tratamento de resultado
if (result !== null) {
  // Sucesso
  console.log('Resultado:', result);
} else {
  // Falha ou ambiente não-Tauri (dev web)
  console.log('Comando não disponível ou falhou');
}
```

## Backend: `#[tauri::command]`

No Rust (`src-tauri/src/lib.rs`), cada função exposta ao frontend é marcada com o atributo `#[tauri::command]`.

As funções são registradas no `invoke_handler` dentro de `tauri::Builder`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        openrouter_chat,
        ollama_chat,
        save_history,
        load_history,
        run_astro_engine,
        // ... outros comandos
    ])
```

## Lista de Comandos Disponíveis

### Agentes de IA e Chat

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `openrouter_chat` | Envia mensagens para a API OpenRouter (LLMs na nuvem). | `Promise<string \| null>` |
| `ollama_chat` | Envia mensagens para o Ollama local (`localhost:11434`). | `Promise<string \| null>` |
| `save_history` | Salva o histórico de chat de um agente em JSON. | `Promise<void \| null>` |
| `load_history` | Carrega o histórico de chat de um agente. | `Promise<string \| null>` |
| `list_chat_sessions` | Lista sessões de chat de um agente (com preview e contagem de mensagens). | `Promise<Array<{id: string, preview: string, count: number}> \| null>` |
| `delete_chat_session` | Deleta uma sessão de chat específica por ID. | `Promise<void \| null>` |
| `archive_chat` | Move o chat atual para o diretório de arquivos. | `Promise<void \| null>` |
| `list_archived_chats` | Lista chats arquivados. | `Promise<Array<string> \| null>` |
| `load_archived_chat` | Carrega um chat arquivado específico. | `Promise<string \| null>` |

### Diario (Nota: Implementação em progresso conforme passos-tauri-commands.md)

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `diary_create_entry` | Cria uma nova entrada de diário. | `Promise<DiaryEntry \| null>` |
| `diary_update_entry` | Atualiza uma entrada de diário existente. | `Promise<DiaryEntry \| null>` |
| `diary_delete_entry` | Exclui uma entrada de diário. | `Promise<void \| null>` |
| `diary_list_entries` | Lista entradas de diário (opcionalmente filtradas por pasta). | `Promise<DiaryEntry[] \| null>` |
| `diary_get_entry` | Obtém uma entrada de diário específica por ID. | `Promise<DiaryEntry \| null>` |
| `diary_create_folder` | Cria uma nova pasta de diário. | `Promise<DiaryFolder \| null>` |
| `diary_list_folders` | Lista todas as pastas de diário. | `Promise<DiaryFolder[] \| null>` |
| `diary_delete_folder` | Exclui uma pasta de diário. | `Promise<void \| null>` |
| `diary_save_tabs` | Salva o estado das abas abertas do diário. | `Promise<void \| null>` |
| `diary_load_tabs` | Carrega o estado das abas abertas do diário. | `Promise<DiaryTabsState \| null>` |

### Integrações Externas

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `get_todoist_tasks` | Busca tarefas da API do Todoist. | `Promise<Array<Task> \| null>` |
| `add_todoist_task` | Cria nova tarefa no Todoist. | `Promise<Task \| null>` |
| `delete_todoist_task` | Deleta tarefa do Todoist por ID. | `Promise<void \| null>` |
| `toggle_todoist_task` | Conclui ou reabre uma tarefa no Todoist. | `Promise<void \| null>` |
| `postpone_todoist_task` | Adia tarefa para amanhã no Todoist. | `Promise<void \| null>` |
| `send_telegram_message` | Envia mensagens via Telegram Bot API. | `Promise<void \| null>` |

### Google Drive (OAuth2)

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `google_drive_status` | Verifica se o Google Drive está conectado (tokens OAuth2 salvos). | `Promise<boolean \| null>` |
| `google_drive_connect` | Inicia fluxo OAuth2 com Google (abre navegador, aguarda callback). | `Promise<void \| null>` |
| `google_drive_disconnect` | Remove tokens OAuth2 salvos, desconectando do Google Drive. | `Promise<void \| null>` |
| `google_drive_list_files` | Lista arquivos no Google Drive do usuário conectado. | `Promise<Array<File> \| null>` |
| `google_drive_upload` | Faz upload de arquivo (nome + conteúdo) para o Google Drive. | `Promise<void \| null>` |

### Sistema e Informações

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `get_sys_info` | Retorna info de sistema (CPU, RAM, Disco). | `Promise<SystemInfo \| null>` |
| `get_total_tokens` | Retorna o total de tokens de IA consumidos. | `Promise<number \| null>` |
| `list_lab_files` | Lista arquivos na pasta `Laboratorio_Stark`. | `Promise<Array<string> \| null>` |

### Astrologia

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `run_astro_engine` | Executa o motor de astrologia Python como subprocesso. | `Promise<string \| null>` |
| `get_transit_positions` | Retorna posições planetárias atuais (trânsitos) para data/hora fornecida. | `Promise<TransitData \| null>` |
| `read_text_file` | Lê o conteúdo de um arquivo de texto (usado para fallback de dados astrais). | `Promise<string \| null>` |

### Mesa de Criação

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `save_board` | Salva o estado dos nós e arestas da Mesa de Criação. | `Promise<void \| null>` |
| `load_board` | Carrega o estado da Mesa de Criação. | `Promise<BoardState \| null>` |
| `save_asset` | Copia um arquivo para a pasta de assets do app. | `Promise<void \| null>` |

### Google Calendar (Stubs - requer OAuth2 via Composio)

| Comando | Descrição | Retorno |
|---------|-----------|---------|
| `add_google_event` | ⚠️ Stub — requer OAuth2. Cria evento no Google Calendar. | `Promise<void \| null>` |
| `delete_google_event` | ⚠️ Stub — requer OAuth2. Remove evento do Google Calendar. | `Promise<void \| null>` |
| `get_google_events` | Retorna eventos do Google Calendar (mock para MVP). | `Promise<Array<Event> \| null>` |

## Tipos de Dados Comuns

### DiaryEntry
```typescript
interface DiaryEntry {
  id: string;
  title: string;
  content: string; // TipTap JSON stringificado
  folder_id: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  word_count: number;
}
```

### DiaryFolder
```typescript
interface DiaryFolder {
  id: string;
  name: string;
  icon: string; // emoji
  order: number;
  created_at: string; // ISO 8601
}
```

### DiaryTabsState
```typescript
interface DiaryTabsState {
  open_tab_ids: string[];
  active_tab_id: string | null;
}
```

### SystemInfo
```typescript
interface SystemInfo {
  cpu: {
    cores: number;
    usage: number;
  };
  memory: {
    total: number; // MB
    used: number; // MB
    usage: number; // percentage
  };
  storage: {
    total: number; // GB
    free: number; // GB
    usage: number; // percentage
  };
}
```

### TransitData
```typescript
interface TransitData {
  planets: Record<string, {
    longitude: number;
    latitude: number;
    speed: number;
    house: number;
    sign: string;
    sign_longitude: number;
  }>;
  secondary: Record<string, {
    longitude: number;
    latitude: number;
    speed: number;
  }>;
  moon_phase: number; // 0-1
  meta: {
    timestamp: string;
    calculation_time_ms: number;
  };
}
```

## Tratamento de Erros

Todos os comandos Tauri retornam `Result<T, String>` no backend, que é convertido para `T | null` no frontend através do `safeInvoke`. Quando um comando falha:

1. O backend retorna um `Err(string)` com uma mensagem descritiva
2. O `safeInvoke` captura o erro, loga no console e retorna `null`
3. O frontend deve verificar se o resultado é `null` antes de usá-lo

### Boas Práticas

```typescript
// Sempre verifique se o resultado não é null
const result = await safeInvoke('some_command', args);
if (result === null) {
  // Trate o erro apropriadamente (mostrar notificação, logar, etc.)
  showError('Falha ao executar comando');
  return;
}

// Use o resultado normalmente
processResult(result);

// Para comandos que não retornam dados importantes
await safeInvoke('command_without_return', args);
// Trate falhas se necessário
const result = await safeInvoke('command_without_return', args);
if (result === null) {
  showError('Falha ao executar comando');
}
```

## Segurança

### Validação de Inputs

Todos os comandos Tauri devem validar seus inputs para prevenir:
- Path traversal attacks
- Injeção de comandos
- Dados malformados

### Escopo de Arquivos

O acesso ao sistema de arquivos é restrito a diretórios específicos configurados em `tauri.conf.json`. Por padrão, o aplicativo só pode acessar:
- Diretório de dados da aplicação (`memory/`)
- Diretório de cache
- Diretório de configuração

Consulte a seção "Observações Importantes" em `passos-tauri-commands.md` para detalhes sobre a configuração do escopo de filesystem para o diário.

## Desenvolvimento e Testes

### Modo Desenvolvimento Web

Ao desenvolver em modo web puro (sem Tauri), o `safeInvoke` retorna `null` para todos os comandos. Isso permite:
- Desenvolvimento frontend independente
- Testes unitários sem necessidade de ambiente Tauri
- Depuração rápida no navegador

### Mocking para Testes

Para testes unitários, você pode mockar o `safeInvoke`:

```typescript
// Exemplo de mock para Jest
jest.mock('../utils/tauri', () => ({
  safeInvoke: jest.fn().mockResolvedValue('mocked result')
}));

// Em seu teste
import { safeInvoke } from '../utils/tauri';

test('deve chamar o comando e processar resultado', async () => {
  const result = await safeInvoke('test_command', { param: 'value' });
  expect(safeInvoke).toHaveBeenCalleduvoz();
  expect(result).toBe('mocked result');
});
```

## Atualizando Esta Documentação

Esta documentação deve ser atualizada sempre que:
1. Um novo comando Tauri for adicionado
2. Um comando existente for modificado (assinatura, comportamento)
3. Um comando for removido ou depreciado
4. Houver mudanças significativas no padrão de uso ou boas práticas

Sempre verifique a implementação real em `src-tauri/src/lib.rs` e `src/utils/tauri.ts` para garantir que esta documentação esteja sincronizada com o código.
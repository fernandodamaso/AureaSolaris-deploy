# Architecture - Aurea Solaris

Decisoes arquiteturais, padroes e notas tecnicas do projeto.

---

## Stack Tecnologica

| Camada | Tecnologia | Versao | Descricao |
|--------|------------|--------|-----------|
| Frontend | React | 19.x | Framework de UI declarativo |
| Linguagem | TypeScript | 5.8.x | JavaScript com tipagem estatica |
| Build | Vite | 7.x | Bundler rapido para desenvolvimento |
| Estilos | Tailwind CSS | 4.x | CSS utility-first |
| Backend | Tauri (Rust) | 2.x | Framework de apps desktop |
| Motor | Python | 3.x | Calculos astrológicos |
| Estado | React Context | - | Gerenciamento de estado global |

---

## Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Views   │ │  Hooks   │ │ Context  │ │Components│ │  Utils   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │            │             │            │        │
│       └─────────────┴────────────┴─────────────┴────────────┘        │
│                              │                                       │
│                         safeInvoke()                                 │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ IPC (Invoke)
┌──────────────────────────────┼───────────────────────────────────────┐
│                         BACKEND (Tauri/Rust)                         │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │                    #[tauri::command] handlers                 │   │
│  │  openrouter_chat │ ollama_chat │ save_history │ run_astro... │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ std::process::Command
┌──────────────────────────────┼───────────────────────────────────────┐
│                         MOTOR (Python)                               │
│  ┌───────────────────────────┴──────────────────────────────────┐   │
│  │                    astro_engine.py                            │   │
│  │              (kerykeion + Swiss Ephemeris)                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Padrões Principais

### IPC Bridge (React → Rust)

O frontend React comunica com o backend Rust via **invoke** do Tauri:

```typescript
// src/utils/tauri.ts - Wrapper seguro
import { invoke } from '@tauri-apps/api/core';

export async function safeInvoke<T>(
  command: string, 
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`[Tauri IPC] Error in ${command}:`, error);
    throw error;
  }
}
```

**Uso nos componentes:**
```typescript
const result = await safeInvoke<string>('openrouter_chat', { 
  model: 'gpt-4', 
  messages: [...] 
});
```

### Comandos Tauri Registrados (lib.rs)

| Comando | Funcao |
|---------|--------|
| `openrouter_chat` | Chat via OpenRouter API |
| `ollama_chat` | Chat via Ollama local |
| `save_history` | Salvar historico de chat |
| `load_history` | Carregar historico de chat |
| `archive_chat` | Arquivar conversa |
| `list_archived_chats` | Listar conversas arquivadas |
| `load_archived_chat` | Carregar conversa arquivada |
| `get_total_tokens` | Obter total de tokens usados |
| `send_telegram_message` | Enviar msg pelo Telegram |
| `save_board` | Salvar mesa de criacao |
| `load_board` | Carregar mesa de criacao |
| `save_asset` | Salvar asset/local |
| `get_sys_info` | Info do sistema (CPU/RAM/disco) |
| `read_text_file` | Ler arquivo de texto |
| `run_astro_engine` | Executar motor de astrologia |
| `list_lab_files` | Listar arquivos do Laboratorio |

### Multi-Arquitetura de Agentes (OpenRouter + Ollama)

O suporte dual permite:
- **OpenRouter:** Acesso a modelos cloud (GPT-4, Claude, etc.)
- **Ollama:** Modelos locais para privacidade (llama3.2, etc.)

A seleção do backend é feita no `AgentChat.tsx` baseado na view ativa.

---

## Sistema de Agentes de IA (Personas)

Cada persona tem uma view associada e personalidade definida:

| Persona | View Associada | Escopo | Personalidade |
|---------|----------------|--------|---------------|
| **Dr. Strange** | `App.tsx` | Global | Sabio, conciso, conecta padrones celestes |
| **Alfred** | `SaudeView`, `AgendaView`, `AlfredHubView` | Produtividade | Direto, impecavel, pratico |
| **Uncle Duck** | `FinancasView` | Financeiro | Pragmatico, focado em lucro |
| **Rafiki** | `AstrologiaBoard`, `DiarioView` | Espiritual | Poetico, cirurgico, espiritual |
| **Stark** | `ControlePanel` | Tecnico | Tecnico, sarcasto, conciso |

**Como funcionam:**
1. Cada view tem um `agentId` associado
2. O `AgentChat.tsx` carrega a persona correta
3. A persona define system prompt, modelo e comportamento
4. O chat usa `openrouter_chat` ou `ollama_chat` via IPC

---

## Motor de Astrologia Python

### Como Funciona

```
React → safeInvoke('run_astro_engine', payload)
    ↓
Tauri (Rust) → std::process::Command::new("python.exe")
    ↓
Python → astro_engine.py processa payload
    ↓
Resultado → stdout capturado → JSON retornado ao React
```

### Arquivos do Motor

| Arquivo | Descricao |
|---------|-----------|
| `astro_engine.py` | Codigo principal do motor |
| `de421.bsp` | Efemerides NASA (Swiss Ephemeris) |
| `astro_data.json` | Cache de dados processados |

### Dependencias Python

- `kerykeion`: Biblioteca para calculos astrológicos
- `swisseph`: Efemerides precisas

---

## Gerenciamento de Estado

### AgendaContext

O `AgendaContext` (em `src/context/`) gerencia estado global relacionado a:
- Perfis de usuario
- Tarefas da agenda
- Dados persistentes da aplicacao

### Persistencia de Dados

| Tipo de Dado | Onde Persiste |
|--------------|---------------|
| Historico de chat | `%APPDATA%/aurea-solaris/memory/` |
| Perfis de usuario | `localStorage` |
| Dados de agenda | `localStorage` |
| Tarefas locais | localStorage / adaptador opcional |
| Mesa de Criacao | `%APPDATA%/aurea-solaris/memory/board.json` |
| Uso de tokens | `%APPDATA%/aurea-solaris/memory/usage.json` |

---

## Views Modulares

| View | Arquivo | Persona | Descricao |
|------|---------|---------|-----------|
| Mesa de Criacao | `MesaCriacao.tsx` | - | Canvas infinito interativo |
| Astrologia | `AstrologiaBoard.tsx` | Rafiki | Mapa natal e trânsitos |
| Saude | `SaudeView.tsx` | Alfred | Gestão de bem-estar |
| Agenda | `AgendaView.tsx` | Alfred | Agenda preditiva |
| Financas | `FinancasView.tsx` | Uncle Duck | Gestão de ouro |
| Controle | `ControlePanel.tsx` | Stark | Configuracoes do sistema |
| Alfred Hub | `AlfredHubView.tsx` | Alfred | Hub de produtividade |
| Diario | `DiarioView.tsx` | Rafiki | Registro diário |
| Login | `LoginView.tsx` | - | Autenticacao |
| Importacao | `ImportFinancialView.tsx` | Uncle Duck | Importar dados financeiros |

---

## Convenções de Codigo

1. **Componentes:** PascalCase (`AgentChat.tsx`)
2. **Hooks:** camelCase com prefixo `use` (`useAstrologyData.ts`)
3. **Utils:** camelCase (`tauri.ts`)
4. **Estilos:** Tailwind CSS classes
5. **IPC:** Comandos snake_case em Rust (`openrouter_chat`)
6. **Tipagem:** TypeScript strict mode
7. **Exports:** Named exports preferiveis

---

## Diretorios Chave

| Diretorio | Conteudo |
|-----------|----------|
| `src/components/` | Views e componentes UI |
| `src/hooks/` | Hooks customizados |
| `src/context/` | React Contexts |
| `src/utils/` | Utilitarios (tauri.ts) |
| `src-tauri/src/` | Codigo Rust (lib.rs, main.rs) |
| `.agent/` | Regras dos agentes IA |
| `.factory/` | Infraestrutura Factory |
| `Laboratorio_Stark/` | Area de experimentacao |

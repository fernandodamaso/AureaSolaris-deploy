# Arquitetura do Aurea Solaris — Referência Completa

> **Guia técnico para desenvolvedores e agentes de IA.** Este documento descreve a arquitetura interna do Aurea Solaris, incluindo o sistema de agentes, a ponte Tauri, o motor de astrologia e os fluxos de dados.

---

## 1. Visão Geral da Arquitetura

O Aurea Solaris é uma aplicação desktop híbrida construída com:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Tauri (Rust) para acesso nativo ao sistema operacional
- **Motor Analítico:** Python para cálculos astrológicos pesados

A comunicação entre frontend e backend ocorre via **IPC (Inter-Process Communication)** do Tauri, usando comandos Rust expostos ao JavaScript.

---

## 2. Sistema de Agentes de IA (Multi-Agent)

O diferencial do projeto é a integração modular de **5 agentes de IA**, cada um com personalidade e escopo definidos. Todos operam via modelos de linguagem (LLMs) hospedados na **OpenRouter** ou localmente via **Ollama**.

A injeção das personas ocorre no componente `AgentChat.tsx`, que seleciona o agente baseado na view ativa.

### 2.1. Dr. Strange (Supervisor Macro)
- **Escopo:** Global (Atua via botão flutuante no `App.tsx`)
- **Função:** Fornece uma visão macro do sistema, conectando as horas celestes (`useAstrologyData`) às ações atuais na UI.
- **Personalidade:** Sábio, conciso, místico. Conecta padrões entre astros e cotidiano.
- **Modelo Padrão:** `google/gemini-2.0-pro-exp-02-05`

### 2.2. Alfred (Mordomo de Produtividade)
- **Escopo:** `SaudeView.tsx`, `AgendaView.tsx`, `AlfredHubView.tsx`
- **Função:** Gerente impecável de ordem, produtividade e saúde. Foco em organização prática.
- **Personalidade:** Direto, impecável, formal mas prestativo.
- **Modelo Padrão:** `openai/gpt-4o-mini`

### 2.3. Uncle Duck (Consultor Financeiro)
- **Escopo:** `FinancasView.tsx` (Gestão de Ouro)
- **Função:** Consultoria financeira focada em maximizar lucros e controlar gastos.
- **Personalidade:** Pragmático, ávido por lucros, objetivo, fala direto ao ponto.
- **Modelo Padrão:** Tenta primeiro **Ollama Local** (`llama3.2`), fallback para OpenRouter (`openai/gpt-4o-mini`).

### 2.4. Rafiki (Tradutor Poético)
- **Escopo:** `AstrologiaBoard.tsx`, `DiarioView.tsx`
- **Função:** Traduz os dados brutos do motor de astrologia (`astro_engine.py`) em conselhos espirituais e poéticos.
- **Personalidade:** Poético mas cirúrgico, espiritual, usa metáforas.
- **Modelo Padrão:** `openai/gpt-4o-mini`

### 2.5. Stark (Monitor Técnico)
- **Escopo:** `ControlePanel.tsx`
- **Função:** Monitora a saúde do sistema, a ponte Tauri-React, e fornece dados técnicos.
- **Personalidade:** Técnico, sarcástico, conciso, fala em jargão técnico.
- **Modelo Padrão:** `anthropic/claude-3.5-sonnet`

---

## 3. Ponte Tauri IPC (Rust ↔ React)

A comunicação entre o React (frontend) e o Rust (backend) é feita através do sistema de invoke do Tauri.

### 3.1. Frontend: `safeInvoke`
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

### 3.2. Backend: `#[tauri::command]`
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

### 3.3. Lista de Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `openrouter_chat` | Envia mensagens para a API OpenRouter (LLMs na nuvem). |
| `ollama_chat` | Envia mensagens para o Ollama local (`localhost:11434`). |
| `save_history` | Salva o histórico de chat de um agente em JSON. |
| `load_history` | Carrega o histórico de chat de um agente. |
| `archive_chat` | Move o chat atual para o diretório de arquivos. |
| `list_archived_chats` | Lista chats arquivados. |
| `load_archived_chat` | Carrega um chat arquivado específico. |
| `get_todoist_tasks` | Busca tarefas da API do Todoist. |
| `send_telegram_message` | Envia mensagens via Telegram Bot API. |
| `save_board` | Salva o estado dos nós e arestas da Mesa de Criação. |
| `load_board` | Carrega o estado da Mesa de Criação. |
| `save_asset` | Copia um arquivo para a pasta de assets do app. |
| `get_sys_info` | Retorna info de sistema (CPU, RAM, Disco). |
| `run_astro_engine` | Executa o motor de astrologia Python como subprocesso. |
| `read_text_file` | Lê o conteúdo de um arquivo de texto (usado para fallback de dados astrais). |
| `list_lab_files` | Lista arquivos na pasta `Laboratorio_Stark`. |
| `get_total_tokens` | Retorna o total de tokens de IA consumidos. |

---

## 4. Motor de Astrologia (Python)

O cálculo astrológico complexo é delegado a um script Python, que roda como um **subprocesso** chamado pelo Rust.

### 4.1. Arquivo Principal
- **Local:** `astro_engine.py` (raiz do projeto)

### 4.2. Dependências
- **Biblioteca:** `kerykeion` (para cálculos astrológicos)
- **Efemérides:** `de421.bsp` (Swiss Ephemeris - dados de posição planetária da NASA)

### 4.3. Integração Rust-Python
O comando Tauri `run_astro_engine` em `lib.rs` executa o script Python:

```rust
#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    use std::process::Command;
    let mut cmd = Command::new("python.exe");
    cmd.arg("astro_engine.py");
    if let Some(p) = payload {
        cmd.arg(p);
    }
    let output = cmd.output().map_err(|e| format!("Falha ao executar comando: {}", e))?;
    // ... tratamento do output
}
```

O script Python recebe argumentos em JSON (opcional), processa e retorna o resultado em JSON para o Rust, que repassa ao frontend.

### 4.4. Funcionalidades
- `calculate_natal`: Calcula posições planetárias para uma data/hora/local.
- `get_agenda_data`: Gera dados preditivos para a agenda.
- Cache de dados em `astro_data.json`.

---

## 5. Fluxo de Dados

### 5.1. Fluxo de Chat com IA
1. Usuário envia mensagem na UI (`AgentChat.tsx`).
2. Frontend chama `safeInvoke('openrouter_chat', { model, messages })`.
3. Rust recebe a chamada, busca a API Key de `.env.local`, e faz a requisição HTTP para OpenRouter.
4. Resposta volta para o Rust, que retorna a string para o React.
5. React atualiza o estado e salva o histórico via `safeInvoke('save_history')`.

### 5.2. Fluxo de Astrologia
1. `useAstrologyData` ou componente chama `safeInvoke('run_astro_engine')`.
2. Rust executa `python.exe astro_engine.py` como subprocesso.
3. Python usa `kerykeion` para calcular posições.
4. Python imprime JSON no stdout e salva em `astro_data.json`.
5. Rust captura o stdout e retorna para o React.

---

## 6. Gerenciamento de Estado Global (AgendaContext)

O `src/context/AgendaContext.tsx` é o coração do estado global da aplicação.

### 6.1. Responsabilidades
- **Perfis:** Gerencia múltiplos perfis de usuários (ex: Viviane, conexões).
- **Tarefas:** Sincroniza tarefas com o Todoist via API.
- **Eventos:** Gerencia eventos da agenda (integração Google Calendar planejada).
- **Documentos:** Gerencia metadados de documentos locais.
- **Insights:** Fornece insights do agente Alfred baseados nos dados.

### 6.2. Persistência no Contexto
- **Perfis e Documentos:** Persistidos em `localStorage` (`aurea_profiles`, `aurea_documents`).
- **Tarefas:** Persistidas remotamente no Todoist.
- **Chat:** Persistidos no sistema de arquivos local via comandos Tauri (`memory/`).

---

## 7. Persistência de Dados

| Tipo de Dado | Local de Armazenamento | Mecanismo |
|---|---|---|
| Preferências de UI | `localStorage` | React State + `useEffect` |
| Perfis de Usuário | `localStorage` | `AgendaContext` |
| Histórico de Chat | `memory/{agent}.json` | Tauri FS API (`save_history`) |
| Assets (Imagens) | `assets/` | Tauri FS API (`save_asset`) |
| Estado da Mesa | `memory/board.json` | Tauri FS API (`save_board/load_board`) |
| Cache de Astrologia | `astro_data.json` (raiz) | Python Script |
| Tokens de IA | `memory/usage.json` | Tauri FS API |

---

## 8. Stack Tecnológica

- **Desktop Framework:** Tauri 2.0 (Rust)
- **Frontend:** React 18, TypeScript, Vite
- **Estilização:** Tailwind CSS, Lucide Icons
- **Estado Global:** React Context API
- **Motor Analítico:** Python 3, Kerykeion
- **APIs Externas:** OpenRouter, Ollama, Todoist, Telegram

---

## 9. Convenções de Código

- **Componentes:** Funcionais com Hooks (`useState`, `useEffect`, `useContext`).
- **Nomenclatura:** PascalCase para componentes, camelCase para funções/variáveis.
- **Estilização:** Classes utilitárias do Tailwind. Cores customizadas via CSS (`text-gold`, `bg-gold`).
- **Comunicação:** Sempre usar `safeInvoke` para chamadas ao backend.
- **Tratamento de Erros:** Retornar `null` ou logs no console, evitar crashes na UI.
- **Idioma:** Comentários e textos de UI em Português (BR).

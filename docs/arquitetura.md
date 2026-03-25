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

A injeção das personas ocorre no componente `AgentChat.tsx`, que obedece à **Chave Mestra de IA** definida no `ControlePanel.tsx`. Essa chave permite ao usuário alternar globalmente o processamento entre o **Ollama (Local/Offline - Padrão)** e o **OpenRouter (Nuvem)**, garantindo privacidade ou poder de processamento conforme a necessidade.

### 2.1. Dr. Strange (Supervisor Macro)
- **Escopo:** Global (Atua via botão flutuante no `App.tsx`)
- **Função:** Fornece uma visão macro do sistema, conectando as horas celestes (`useAstrologyData`) às ações atuais na UI.
- **Personalidade:** Sábio, conciso, místico. Conecta padrões entre astros e cotidiano.
- **Modelo Padrão:** `google/gemini-2.0-pro-exp-02-05`

### 2.2. Alfred (Mordomo de Produtividade)
- **Escopo:** `SaudeView.tsx`, `components/agenda/AgendaView.tsx`, `AlfredHubView.tsx`
- **Função:** Gerente impecável de ordem, produtividade e saúde. Foco em organização prática.
- **Personalidade:** Direto, impecável, formal mas prestativo.
- **Modelo Padrão:** `openai/gpt-4o-mini`

### 2.3. Uncle Duck (Consultor Financeiro)
- **Escopo:** `FinancasView.tsx` (Gestão de Ouro)
- **Função:** Consultoria financeira focada em maximizar lucros e controlar gastos.
- **Personalidade:** Pragmático, ávido por lucros, objetivo, fala direto ao ponto.
- **Modelo Padrão:** Tenta primeiro **Ollama Local** (`llama3.2`), fallback para OpenRouter (`openai/gpt-4o-mini`).

### 2.4. Rafiki (Astrólogo Técnico)
- **Escopo:** `AstrologiaBoard.tsx` (Lista Técnica), `MandalaPage.tsx` (Visualização Visual), `DiarioView.tsx`
- **Função:** Traduz os dados brutos do motor de astrologia em conselhos. A aba **Astrologia** agora foca em efemérides textuais e horários planetários, enquanto a aba **Mandala** é o telescópio visual para o Céu do Momento e Mapas Natais.
- **Personalidade:** Preciso, técnico, direto ao ponto. Sem metáforas, usa dados concretos (graus, minutos, orbes). Formato de resposta: "[Planeta] em [posição exata]. Aspecto: [tipo] com [planeta/ponto]. Interpretação direta: [ação sugerida]."
- **Dados fornecidos:** Posições planetárias com graus e minutos, signos exatos, aspectos geométricos (trígono 120°, quadratura 90°, etc.), mapa natal do usuário, casas astrológicas, trânsitos com orbes.
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
| `list_chat_sessions` | Lista sessões de chat de um agente (com preview e contagem de mensagens). |
| `delete_chat_session` | Deleta uma sessão de chat específica por ID. |
| `archive_chat` | Move o chat atual para o diretório de arquivos. |
| `list_archived_chats` | Lista chats arquivados. |
| `load_archived_chat` | Carrega um chat arquivado específico. |
| `get_todoist_tasks` | Busca tarefas da API do Todoist. |
| `add_todoist_task` | Cria nova tarefa no Todoist. |
| `delete_todoist_task` | Deleta tarefa do Todoist por ID. |
| `toggle_todoist_task` | Conclui ou reabre uma tarefa no Todoist. |
| `postpone_todoist_task` | Adia tarefa para amanhã no Todoist. |
| `add_google_event` | ⚠️ Stub — requer OAuth2. Cria evento no Google Calendar. |
| `delete_google_event` | ⚠️ Stub — requer OAuth2. Remove evento do Google Calendar. |
| `get_google_events` | Retorna eventos do Google Calendar (mock para MVP). |
| `send_telegram_message` | Envia mensagens via Telegram Bot API. |
| `save_board` | Salva o estado dos nós e arestas da Mesa de Criação. |
| `load_board` | Carrega o estado da Mesa de Criação. |
| `save_asset` | Copia um arquivo para a pasta de assets do app. |
| `get_sys_info` | Retorna info de sistema (CPU, RAM, Disco). |
| `run_astro_engine` | Executa o motor de astrologia Python como subprocesso (com `current_dir` do projeto). |
| `run_agm_engine` | Executa o motor AntiGravity Module (AGM) Python como subprocesso. |
| `read_text_file` | Lê o conteúdo de um arquivo de texto (usado para fallback de dados astrais). |
| `list_lab_files` | Lista arquivos na pasta `Laboratorio_Stark`. |
| `get_total_tokens` | Retorna o total de tokens de IA consumidos. |
| `google_drive_status` | Verifica se o Google Drive está conectado (tokens OAuth2 salvos). |
| `google_drive_connect` | Inicia fluxo OAuth2 com Google (abre navegador, aguarda callback). |
| `google_drive_disconnect` | Remove tokens OAuth2 salvos, desconectando do Google Drive. |
| `google_drive_list_files` | Lista arquivos no Google Drive do usuário conectado. |
| `google_drive_upload` | Faz upload de arquivo (nome + conteúdo) para o Google Drive. |

### 3.4. Gestão de Ouro (Finanças)
- **Componente:** `FinancasView.tsx`
- **Contexto:** `FinancasContext.tsx`
- **Agente:** Uncle Duck (Pragmático).
- **Funcionalidades:** CRUD de transações, gestão de reservas/metas, integração de timing astral.

### 3.5. Saúde & Vitalidade
- **Componente:** `SaudeView.tsx`
- **Contexto:** `SaudeContext.tsx`
- **Agente:** Alfred (Eficiente).
- **Funcionalidades:** Rastreamento de hábitos, biometria e gestão de documentos de saúde.

### 3.6. Google Drive (OAuth2)
- **Componente:** Integração no `ControlePanel.tsx`
- **Funcionalidades:** Conexão OAuth2 com PKCE, listagem de arquivos, upload de conteúdo.
- **Comandos:** `google_drive_status`, `google_drive_connect`, `google_drive_disconnect`, `google_drive_list_files`, `google_drive_upload`.
- **Tokens:** Armazenados em `google_tokens.json` no diretório de dados do app.
- **Fluxo:** Abre navegador para consentimento Google → aguarda callback em `localhost:8919` → salva tokens localmente.

---

## 4. Motor de Astrologia (Python)

O cálculo astrológico complexo é delegado a um script Python, que roda como um **subprocesso** chamado pelo Rust.

### 4.1. Arquivo Principal e Ambiente
- **Motor:** `C:\AureaSolaris\astro_engine.py` (caminho fixo em ambiente Dev)
- **Biblioteca:** `kerykeion` (para cálculos astrológicos)
- **Efemérides:** `de421.bsp` (Swiss Ephemeris - NASA)

### 4.2. Integração Rust-Python
O comando Tauri `run_astro_engine` em `lib.rs` executa o script Python usando caminhos absolutos para estabilidade no Windows:

```rust
#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    use std::path::PathBuf;
    use std::process::Command;
    let project_root = PathBuf::from("C:\\AureaSolaris");
    let astro_path = project_root.join("astro_engine.py");
    let mut cmd = Command::new("python.exe");
    cmd.arg(astro_path);
    if let Some(p) = payload {
        cmd.arg(p);
    }
    let output = cmd.output().map_err(|e| format!("Falha ao executar comando: {}", e))?;
    // ... tratamento do output
}
```

O script Python recebe argumentos em JSON (opcional), processa e retorna o resultado em JSON para o Rust, que repassa ao frontend.

### 4.3. Funcionalidades
- `calculate_astrology`: Calcula planetas, aspectos e regências (dia/hora).
- `get_aspects`: Detecção dinâmica de distâncias com orbes configuráveis.
- `get_planetary_hour`: Cálculo baseado na ordem caldéia (24 horas).
- Cache global em `astro_data.json` na raiz do projeto.


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
| Perfis e Agenda | `localStorage` | `AgendaContext` |
| Saúde e Hábitos | `localStorage` | `SaudeContext` |
| Transações e Metas | `localStorage` | `FinancasContext` (via `useFinancasData`) |
| Histórico de Chat | `memory/{agent}.json` | Tauri FS API (`save_history`) |
| Assets (Imagens) | `assets/` | Tauri FS API (`save_asset`) |
| Estado da Mesa | `memory/board.json` | Tauri FS API (`save_board/load_board`) |
| Cache de Astrologia | `astro_data.json` (raiz) | Python Script |
| Tokens Google Drive | `google_tokens.json` | Tauri FS API (app data dir) |
| Uso de Tokens IA | `memory/usage.json` | Tauri FS API (`log_usage`) |

---

## 8. Sistema de Exportação

O Aurea Solaris possui um sistema de exportação unificado em `src/utils/exportUtils.ts` que permite aos usuários exportar conteúdo de diferentes views.

### 8.1. Funcionalidades Disponíveis

| Função | Descrição | Views |
|--------|-----------|-------|
| `downloadText` | Download de texto como arquivo | DiarioView, MesaCriacao |
| `downloadAsPDF` | Exporta elemento HTML como PDF | Todas |
| `sendEmail` | Abre cliente de email padrão | Todas |
| `saveToGoogleDrive` | Copia para clipboard (para colar no Drive) | Todas |
| `exportAsJSON` | Exporta dados como JSON | DiarioView, MesaCriacao |
| `exportAsMarkdown` | Exporta como arquivo Markdown | DiarioView |

### 8.2. Views com Exportação

- **DiarioView.tsx**: Download (Markdown/JSON), Email, Google Drive
- **MandalaPage.tsx** / **MandalaView.tsx**: Download (SVG/PNG), Email, Google Drive  
- **MesaCriacao.tsx**: Download (JSON/SVG), Email, Google Drive

### 8.3. Formato de Arquivos

- **Markdown**: `# Título\n\nconteúdo\n\n---\n*Exportado do Aurea Solaris em [data]*`
- **JSON**: `{ title, content, date, exportedAt }`
- **SVG/PNG**: Imagem vetorial/rasterizada da mandala

---

## 10. Stack Tecnológica

- **Desktop Framework:** Tauri 2.0 (Rust)
- **Frontend:** React 19.1, TypeScript 5.8, Vite 7
- **Estilização:** Tailwind CSS v4 (via `@tailwindcss/vite`), Lucide Icons 0.577
- **Estado Global:** React Context API (`AgendaContext`, `FinancasContext`, `SaudeContext`)
- **Motor Analítico:** Python 3, Kerykeion
- **APIs Externas:** OpenRouter, Ollama, Todoist REST v2, Telegram, Google Calendar (stubs), Google Drive (OAuth2)

---

## 11. Convenções de Código

- **Componentes:** Funcionais com Hooks (`useState`, `useEffect`, `useContext`).
- **Nomenclatura:** PascalCase para componentes, camelCase para funções/variáveis.
- **Estilização:** Classes utilitárias do Tailwind. Cores customizadas via CSS (`text-gold`, `bg-gold`).
- **Comunicação:** Sempre usar `safeInvoke` para chamadas ao backend.
- **Tratamento de Erros:** Retornar `null` ou logs no console, evitar crashes na UI.
- **Idioma:** Comentários e textos de UI em Português (BR).

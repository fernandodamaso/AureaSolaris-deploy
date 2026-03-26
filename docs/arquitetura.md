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
- **Mandala Chart Improvements:** 
  - Correção crítica nos Decanatos: Array DECANATE_RULERS expandido de 12 para 36 entradas para suportar todos os 3 decanatos por signo
  - Visibilidade melhorada: Opacidade aumentada para signos (0.08→0.14), decanatos (0.35→0.50) e termos (0.12→0.30)
  - Tamanhos de fonte aumentados para melhor legibilidade em telas de alta densidade
- **Modelo Padrão:** `openai/gpt-4o-mini`

### 2.5. Stark (Monitor Técnico)
- **Escopo:** `ControlePanel.tsx`
- **Função:** Monitora a saúde do sistema, a ponte Tauri-React, e fornece dados técnicos.
- **Personalidade:** Técnico, sarcástico, conciso, fala em jargão técnico.
- **Modelo Padrão:** `anthropic/claude-3.5-sonnet`

---

## 3. Integração com Google Calendar (Composio MCP)

A integração com Google Calendar utiliza o **Composio MCP** para gerenciar OAuth2 e chamadas à API.

### 3.1 Configuração

1. Obtenha uma API key em [app.composio.dev](https://app.composio.dev)
2. Adicione ao `.env`:
   ```
   VITE_COMPOSIO_API_KEY=sua_chave_aqui
   ```
3. Conecte sua conta Google via dashboard do Composio

### 3.2 Serviço: `src/services/composio.ts`

O wrapper fornece funções para operações básicas:

| Função | Descrição |
|--------|-----------|
| `connect()` | Conecta à conta Google via Composio |
| `listEvents(params)` | Lista eventos (suporta `timeMin`, `timeMax`) |
| `createEvent(params)` | Cria novo evento no Google Calendar |
| `deleteEvent(id)` | Remove evento do Google Calendar |

### 3.3 Interface no Frontend

O componente `AgendaView.tsx` integra eventos do Google Calendar:
- **Botão "Google Calendar"** — conecta/desconecta
- **Eventos Google** — mostrados com badge azul e ícone `Calendar`
- **Eventos locais** — mostrados com badge dourado e ícone `Clock`
- Os eventos são mesclados na visualização diária

### 3.4 Exemplo de Uso

```typescript
import { googleCalendarService } from '../services/composio';

// Conectar
await googleCalendarService.connect();

// Listar eventos do dia
const events = await googleCalendarService.listEvents({
  timeMin: new Date().toISOString(),
  timeMax: endOfDay.toISOString(),
});

// Criar evento
await googleCalendarService.createEvent({
  summary: 'Reunião importante',
  start: '2026-03-25T14:00:00',
  end: '2026-03-25T15:00:00',
});
```

---

## 4. Ponte Tauri IPC (Rust ↔ React)

A comunicação entre o React (frontend) e o Rust (backend) é feita através do sistema de invoke do Tauri.

### 4.1. Frontend: `safeInvoke`
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

### 4.2. Backend: `#[tauri::command]`
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

### 4.3. Lista de Comandos Disponíveis

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
| `get_transit_positions` | Retorna posições planetárias atuais (trânsitos) para data/hora fornecida. |
| `run_agm_engine` | Executa o motor AntiGravity Module (AGM) Python como subprocesso. |
| `read_text_file` | Lê o conteúdo de um arquivo de texto (usado para fallback de dados astrais). |
| `list_lab_files` | Lista arquivos na pasta `Laboratorio_Stark`. |
| `get_total_tokens` | Retorna o total de tokens de IA consumidos. |
| `google_drive_status` | Verifica se o Google Drive está conectado (tokens OAuth2 salvos). |
| `google_drive_connect` | Inicia fluxo OAuth2 com Google (abre navegador, aguarda callback). |
| `google_drive_disconnect` | Remove tokens OAuth2 salvos, desconectando do Google Drive. |
| `google_drive_list_files` | Lista arquivos no Google Drive do usuário conectado. |
| `google_drive_upload` | Faz upload de arquivo (nome + conteúdo) para o Google Drive. |

### 4.4. Gestão de Ouro (Finanças)
- **Componente:** `FinancasView.tsx`
- **Contexto:** `FinancasContext.tsx`
- **Agente:** Uncle Duck (Pragmático).
- **Funcionalidades:** CRUD de transações, gestão de reservas/metas, integração de timing astral.

### 4.5. Saúde & Vitalidade
- **Componente:** `SaudeView.tsx`
- **Contexto:** `SaudeContext.tsx`
- **Agente:** Alfred (Eficiente).
- **Funcionalidades:** Rastreamento de hábitos, biometria e gestão de documentos de saúde.

### 4.6. Google Drive (OAuth2)
- **Componente:** Integração no `ControlePanel.tsx`
- **Funcionalidades:** Conexão OAuth2 com PKCE, listagem de arquivos, upload de conteúdo.
- **Comandos:** `google_drive_status`, `google_drive_connect`, `google_drive_disconnect`, `google_drive_list_files`, `google_drive_upload`.
- **Tokens:** Armazenados em `google_tokens.json` no diretório de dados do app.
- **Fluxo:** Abre navegador para consentimento Google → aguarda callback em `localhost:8919` → salva tokens localmente.

---

## 5. Motor de Astrologia (Python)

O cálculo astrológico complexo é delegado a um script Python, que roda como um **subprocesso** chamado pelo Rust.

### 5.1. Arquivo Principal e Ambiente
- **Motor:** `C:\AureaSolaris\astro_engine.py` (caminho fixo em ambiente Dev)
- **Biblioteca:** `kerykeion` (para cálculos astrológicos)
- **Efemérides:** `de421.bsp` (Swiss Ephemeris - NASA)

### 5.2. Integração Rust-Python
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

### 5.3. Funcionalidades
- `calculate_astrology`: Calcula planetas, aspectos e regências (dia/hora).
- `calculate_transit_positions`: Calcula posições planetárias atuais (trânsitos) para data/hora, sem casas, sem aspectos, sem ângulos (ASC, MC) e sem campo `house` em cada planeta.
- `get_aspects`: Detecção dinâmica de distâncias com orbes configuráveis.
- `get_planetary_hour`: Cálculo baseado na ordem caldéia (24 horas).
- Cache global em `astro_data.json` na raiz do projeto.

### 5.4 Corpos Celestes e Pontos Adicionais

Além dos 10 planetas clássicos, o motor calcula:

| Corpo | Descrição | Fórmula |
|-------|-----------|---------|
| North Node (☊) | Nodo Norte Lunar | Lua - 180° |
| South Node (☋) | Nodo Sul Lunar | Lua + 180° |
| Lilith (⚸) | Nodo Sul Lunar (Black Moon) | Lua + 180° |
| Part of Fortune (⊙) | Ponto de Fortuna | ASC + Lua - Sol |
| Vertex (Vx) | Ponto Fictício | ASC + 60° (aproximado) |
| Chiron (⚷) | Centauro | Via kerykeion |

### 5.5 Sistema de Casas

O sistema de casas é **configurável** via parâmetro `house_system`:

| Código | Sistema | Descrição |
|--------|---------|-----------|
| `R` | Regiomontanus | Padrão. Cúspides na intersecção do meridiano do lugar com o equador |
| `P` | Placidus | Mais usado worldwide |
| `K` | Koch | Baseado em movimentos diurnos |
| `O` | Porphyrius | Divisions equal of the zodiac arc |
| `C` | Campanus | Baseado em quadrant divisions |
| `W` | Whole Sign | Casas definidas pelo signo completo |

### 5.6 Aspectos Astrológicos

| Aspecto | Ângulo | Orb | Tipo |
|---------|--------|-----|------|
| Conjunção ☌ | 0° | 8° | Maior |
| Oposição ☍ | 180° | 8° | Maior |
| Trígono △ | 120° | 8° | Maior |
| Quadratura □ | 90° | 6° | Maior |
| Sextil ＊ | 60° | 4° | Menor |
| Inconjunto ☽ | 150° | 3° | Menor |
| Quintil ℍ | 72° | 3° | Menor |
| Bi-Quintil ℎ | 144° | 3° | Menor |
| Semi-Sextil ⚹ | 30° | 2° | Menor |
| Semi-Quadratura ∠ | 45° | 2° | Menor |

Cada aspecto inclui indicador `applying` (planetas convergindo) ou `separating` (divergindo).

### 5.7 Fallback Browser (TypeScript)

Quando Tauri/Python não está disponível (ex: desenvolvimento web puro sem Tauri), um motor em TypeScript puro (`src/utils/astro-calc.ts`) fornece cálculos approximations para uso em desenvolvimento web.

**Arquivo:** `src/utils/astro-calc.ts`

**Funcionalidades:**
- Cálculo de posição planetária via fórmulas simplificadas (VSOP87-style)
- Cálculo de aspectos com orbes configuráveis
- Cálculo de casas (sistema Regiomontanus)
- Cálculo de pontos adicionais (Nodos, Lilith, Part of Fortune)
- Cálculo de fase lunar

**Uso:**
```typescript
import { calculateFallback } from '../utils/astro-calc';

const result = await calculateFallback(
  2026, 3, 25, 14, 30,  // year, month, day, hour, minute
  -15.7833,              // latitude
  -47.9333,              // longitude
  'Regiomontanus'        // house system
);
```

**Hooks que usam fallback:**
- `useAstrologyData.ts` — Dados astrais em tempo real
- `useAstroData.ts` — Cálculos de mapa natal

**Nota:** Os cálculos são aproximações (±1-2°). Para precisão completa, use o motor Python via Tauri.

### 5.8 Mapa Natal de Referência

O mapa natal de Viviane está salvo em `natal_charts/viviane.json` como base de validação para os cálculos astrológicos.

### 5.9 Convenção de Orientação da Roda Zodiacal

A mandala zodiacal segue o padrão da astrologia ocidental (compatível com AstroChart, astro-seek.com, Solar Fire):

| Ponto | Posição |
|-------|---------|
| 0° Áries | 9 horas (esquerda) |
| 0° Câncer | 12 horas (topo) |
| 0° Libra | 3 horas (direita) |
| 0° Capricórnio | 6 horas (base) |

- **Direção:** Anti-horária (counterclockwise) — padrão ocidental
- **Fórmula de conversão:** `(180 - angle) * PI/180` — equivalente a `SHIFT_IN_DEGREES = 180` do AstroChart
- **Rotação ASC:** Em `MandalaChart.tsx`, a roda gira para que o ASC fique sempre às 9 horas

**Componentes:**
- `MandalaChart.tsx` — Renderiza mapa natal com rotação ASC
- `MandalaView.tsx` — Visualização do Céu do Momento (sem rotação ASC)

### 5.10 Cálculo de Trânsitos Atuais

A função `calculate_transit_positions` fornece posições planetárias para uma data/hora específica (geralmente o momento atual), sem calcular casas, aspectos ou ângulos (ASC, MC). Os planetas e corpos secundários retornados não incluem o campo `house`.

**Uso:**
```python
# No astro_engine.py
result = calculate_transit_positions(
    year=2026, month=3, day=26, hour=15.5,
    lat=-15.7833, lon=-47.9333,
    include_asteroids=False  # Apenas 10 planetas + Chiron + NorthNode
)
```

**Retorno:** Objeto JSON com `planets`, `secondary` (apenas NorthNode se `include_asteroids=False`), `moon_phase`, `meta`.

**Integração frontend:** Hook `useTransitData.ts` busca dados via comando Tauri `get_transit_positions`.

### 5.11 Cálculo de Aspectos de Trânsitos

A função `calculateTransitAspects` em `src/utils/transitAspects.ts` calcula aspectos entre planetas de trânsito (posições atuais) e planetas natais (mapa natal).

**Aspectos considerados:** Conjunção (0°, orb 8°), Oposição (180°, orb 8°), Trígono (120°, orb 8°), Quadratura (90°, orb 6°), Sextil (60°, orb 4°), Quincúncio (150°, orb 3°).

**Regras:**
- Ignora ASC e MC (ângulos) nos cálculos.
- Usa a menor distância angular (considerando wrapping 0°/360°).
- Retorna o primeiro aspecto que se enquadra dentro do orb (por ordem de definição).
- Interfaces `Planet` e `Aspect` exportadas de `MandalaChart.tsx`.

---

## 6. Fluxo de Dados

### 6.1. Fluxo de Chat com IA
1. Usuário envia mensagem na UI (`AgentChat.tsx`).
2. Frontend chama `safeInvoke('openrouter_chat', { model, messages })`.
3. Rust recebe a chamada, busca a API Key de `.env.local`, e faz a requisição HTTP para OpenRouter.
4. Resposta volta para o Rust, que retorna a string para o React.
5. React atualiza o estado e salva o histórico via `safeInvoke('save_history')`.

### 6.2. Fluxo de Astrologia
1. `useAstrologyData` ou componente chama `safeInvoke('run_astro_engine')`.
2. Rust executa `python.exe astro_engine.py` como subprocesso.
3. Python usa `kerykeion` para calcular posições.
4. Python imprime JSON no stdout e salva em `astro_data.json`.
5. Rust captura o stdout e retorna para o React.

---

## 7. Gerenciamento de Estado Global (AgendaContext)

O `src/context/AgendaContext.tsx` é o coração do estado global da aplicação.

### 7.1. Responsabilidades
- **Perfis:** Gerencia múltiplos perfis de usuários (ex: Viviane, conexões).
- **Tarefas:** Sincroniza tarefas com o Todoist via API.
- **Eventos:** Gerencia eventos da agenda (integração Google Calendar planejada).
- **Documentos:** Gerencia metadados de documentos locais.
- **Insights:** Fornece insights do agente Alfred baseados nos dados.

### 7.2. Persistência no Contexto
- **Perfis e Documentos:** Persistidos em `localStorage` (`aurea_profiles`, `aurea_documents`).
- **Tarefas:** Persistidas remotamente no Todoist.
- **Chat:** Persistidos no sistema de arquivos local via comandos Tauri (`memory/`).

---

## 8. Persistência de Dados

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

## 9. Sistema de Exportação

O Aurea Solaris possui um sistema de exportação unificado em `src/utils/exportUtils.ts` que permite aos usuários exportar conteúdo de diferentes views.

### 9.1. Funcionalidades Disponíveis

| Função | Descrição | Views |
|--------|-----------|-------|
| `downloadText` | Download de texto como arquivo | DiarioView, MesaCriacao |
| `downloadAsPDF` | Exporta elemento HTML como PDF | Todas |
| `sendEmail` | Abre cliente de email padrão | Todas |
| `saveToGoogleDrive` | Copia para clipboard (para colar no Drive) | Todas |
| `exportAsJSON` | Exporta dados como JSON | DiarioView, MesaCriacao |
| `exportAsMarkdown` | Exporta como arquivo Markdown | DiarioView |

### 9.2. Views com Exportação

- **DiarioView.tsx**: Download (Markdown/JSON), Email, Google Drive
- **MandalaPage.tsx** / **MandalaView.tsx**: Download (SVG/PNG), Email, Google Drive  
- **MesaCriacao.tsx**: Download (JSON/SVG), Email, Google Drive

### 9.3. Formato de Arquivos

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

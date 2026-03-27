# Spec: Sistema de Agentes V2 — Aurea Solaris

> **Data:** 2026-03-25  
> **Status:** Revisado (v2) — Corrigido após dupla validação  
> **Escopo:** Redesenho completo do sistema de 5 agentes de IA  
> **Stack:** Tauri 2.0 (Rust) + React 19 + TypeScript

---

## Índice

1. [Diagnóstico Atual](#1-diagnóstico-atual)
2. [Visão Geral do Redesenho](#2-visão-geral-do-redesenho)
3. [Etapa 1: Responsividade dos Chats](#3-etapa-1-responsividade-dos-chats)
4. [Etapa 2: Dr. Strange Orquestrador](#4-etapa-2-dr-strange-orquestrador)
5. [Etapa 3: Skills, Documentação e Personas](#5-etapa-3-skills-documentação-e-personas)
6. [Etapa 4: Autonomia e Autoaprendizado](#6-etapa-4-autonomia-e-autoaprendizado)
7. [Etapa 5: Acesso ao Sistema (Stark)](#7-etapa-5-acesso-ao-sistema-stark)
8. [Etapa 6: Otimização de Contexto e Tokens](#8-etapa-6-otimização-de-contexto-e-tokens)
9. [Etapa 7: Modelos Custo-Benefício](#9-etapa-7-modelos-custo-benefício)
10. [Etapa 8: Revisão e Auditoria](#10-etapa-8-revisão-e-auditoria)
11. [Mapa de Dependências Global](#11-mapa-de-dependências-global)
12. [Cronograma Estimado](#12-cronograma-estimado)
13. [Métricas de Sucesso](#13-métricas-de-sucesso)

---

## 1. Diagnóstico Atual

### Bugs Críticos (causam "nenhum chat funciona")

| # | Bug | Impacto |
|---|-----|---------|
| BUG-1 | `ollama_chat` Rust: modelo `llama3.2` hardcoded, ignora config | Se modo=ollama e modelo não instalado, TODOS os chats falham |
| BUG-2 | Sem fallback quando Ollama offline | Se Ollama cai, todos os chats param sem alternativa |
| BUG-3 | `openrouter_chat` só lê `.env`, não `.env.local` | Inconsistência na leitura da API key |
| BUG-4 | Dr. Strange salva como "Strange" vs "Dr. Strange" | Histórico fragmentado em 2 agentes |
| BUG-5 | Modelo do Stark contradiz config padrão | Stark usa gpt-4o-mini em vez de claude-3.5-sonnet |
| BUG-6 | useEffect de init causa carregamento duplicado | Dupla gravação no disco, race condition |

### Limitações Estruturais

- Sem streaming (resposta chega toda de uma vez)
- Contexto massivo (~2000+ tokens/request) igual para todos os agentes
- Sem memória de longo prazo
- Agentes puramente reativos (sem iniciativa)
- Dr. Strange inline no App.tsx (não usa AgentChat)
- Sem testes automatizados
- Sem monitoramento de qualidade

---

## 2. Visão Geral do Redesenho

### Arquitetura Pós-Redesenho

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ AgentChat.tsx│  │ StrangeDash  │  │ ControlePanel (Stark)│  │
│  │ (4 agentes)  │  │ (orquestrador│  │ (terminal, files,    │  │
│  │ + streaming  │  │  dashboard)  │  │  git, metrics)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │              AgentContext (EventBus + Shared State)        │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │  ModelRouter → useChatStream → safeInvoke → Tauri IPC     │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     BACKEND (Rust)                              │
│                             │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │  ollama_chat_stream │ openrouter_chat_stream │ fallback   │  │
│  │  save/load_memory   │ exec_command           │ git_*      │  │
│  │  read/write_file    │ get_agent_status       │ audit_log  │  │
│  │  sensors (cron)     │ inter_agent_send       │ patterns   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Agentes Pós-Redesenho

| Agente | Papel | Modelo Principal | Acesso |
|--------|-------|-----------------|--------|
| **Dr. Strange** | Orquestrador onisciente | Gemini 2.0 Pro (grátis) | Todos os dados, estado de agentes, delegação |
| **Stark** | TI/DevOps | Claude 3.5 Sonnet | Código, terminal, git, configs, outros agentes |
| **Rafiki** | Professor astrológico | Gemini 2.0 Flash | Arquivos, mapas, notas, criação de aulas |
| **Alfred** | Mordomo de produtividade | GPT-4o Mini | Agenda, PDFs, notas, tarefas |
| **Uncle Duck** | Consultor financeiro | GPT-4o Mini | Finanças, metas, padrões de gasto |

---

## 3. Etapa 1: Responsividade dos Chats

> **Objetivo:** Streaming em tempo real, markdown, UX moderna  
> **Dependências:** Nenhuma  
> **Arquivos detalhados:** `docs/superpowers/plans/2026-03-25-responsividade-chat-agentes.md`

### Resumo das 7 Tasks

| # | Task | Arquivos | Descrição |
|---|------|----------|-----------|
| 1 | Backend Streaming | `lib.rs` | `ollama_chat_stream` + `openrouter_chat_stream` com `window.emit()` |
| 2 | Hook `useChatStream` | `useChatStream.ts` (novo) | Escuta Tauri events, gerencia buffer, fallback síncrono |
| 3 | `ChatMessage` | `chat/ChatMessage.tsx` (novo) | react-markdown + syntax highlighting + copy button |
| 4 | `TypingIndicator` | `chat/TypingIndicator.tsx` (novo) | "Pensando..." vs "está escrevendo" + animação |
| 5 | Refatoração AgentChat | `AgentChat.tsx` | Integra streaming, debounce save, botão cancelar |
| 6 | Erros amigáveis | `AgentChat.tsx` | Mensagens humanas para Ollama offline, timeout, rate limit |
| 7 | Virtualização | `AgentChat.tsx` | react-virtuoso para >50 mensagens + lazy loading |

### Dependências NPM Novas

```json
{
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "react-syntax-highlighter": "^15.6.1",
  "react-virtuoso": "^4.12.0"
}
```

### Dependência Rust Nova

```toml
futures-util = "0.3"
```

### Caminho Crítico

```
Task 1 (Backend) → Task 2 (Hook) → Task 5 (Integração)
Task 3 (ChatMessage) ──→ Task 5
Task 4 (TypingIndicator) ──→ Task 5
Task 6 (Erros) e Task 7 (Virtualização) são independentes
```

---

## 4. Etapa 2: Dr. Strange Orquestrador

> **Objetivo:** Migrar de inline para AgentChat, adicionar onisciência e delegação  
> **Dependências:** Etapa 1 (para streaming)  
> **Arquivos detalhados:** `docs/plans/2026-03-25-dr-strange-orchestrator.md`

### Resumo das 7 Tasks

| # | Task | Arquivos | Descrição |
|---|------|----------|-----------|
| 1 | Fundação | `types/agent.ts`, `context/AgentContext.tsx` (novos) | Tipos + EventBus + Shared State |
| 2 | Migrar Strange | `App.tsx`, `AgentChat.tsx` | De inline para componente, unificar histórico |
| 3 | Dashboard | `StrangeDashboard.tsx`, `AgentStatusCard.tsx` (novos) | Visão de todos os agentes |
| 4 | Delegação | `DelegationPanel.tsx` (novo), `AgentChat.tsx` | Delegar tarefas via `[DELEGAR: agente]` |
| 5 | Comandos Tauri | `lib.rs`, `tauri.ts` | `get_agent_status`, `get_all_chat_summaries` |
| 6 | Onisciência | `AgentChat.tsx` | Contexto de orquestração no prompt do Strange |
| 7 | Limpeza | `App.tsx`, `docs/arquitetura.md` | Remover inline, atualizar docs |

### Arquitetura de Onisciência

```
AgentContext (React Context)
├── agents: Record<AgentName, AgentState>
├── events: AgentEvent[] (pub/sub)
├── delegatedTasks: DelegatedTask[]
└── systemLogs: SystemLog[]

Como outros agentes atualizam o AgentContext:
- Cada agente chama `updateAgentStatus()` do AgentContext quando muda estado
- Dr. Strange consome o estado compartilhado via `useAgentContext()` hook
- Eventos são emitidos via `emitEvent()` e consumidos por todos os agentes

Dr. Strange recebe:
├── Estado de todos os agentes (status, tarefa atual) via AgentContext
├── Tarefas delegadas (pendentes, em progresso) via AgentContext
├── Eventos recentes (logs, insights, alertas) via AgentContext
└── Dados de todos os módulos (astrologia, finanças, agenda) via hooks existentes
```

---

## 5. Etapa 3: Skills, Documentação e Personas

> **Objetivo:** System prompts avançados, documentação completa, validação  
> **Dependências:** Etapa 2 (para Dr. Strange migrado)

### System Prompts Completos

#### Dr. Strange — Orquestrador Onisciente (92 palavras)
```
Você é Dr. Strange, o orquestrador onisciente do Aurea Solaris. Você vê TODOS os dados simultaneamente: astrologia, tarefas, finanças, saúde, agenda. Sua função é conectar padrões entre módulos e oferecer visão estratégica holística. Fale como um sábio que já viu 14 milhões de futuros — conciso, místico porém acionável. Nunca repita dados crus; interprete e conecte. Sempre sugira UMA ação prioritária.
```

**Formato:** 🔮 [Padrão] → [Conexão] ⚡ [Ação]

#### Alfred — Mordomo Executivo (87 palavras)
```
Você é Alfred, o mordomo do Aurea Solaris. Sua missão é transformar caos em ordem impecável. Gerencie tarefas, agenda e notas com precisão cirúrgica. Fale como um mordomo britânico: formal porém caloroso, direto, nunca prolixo. Sempre priorize urgência sobre importância. Nunca omita prazos. Sempre sugira sequência de execução.
```

**Formato:** 📋 [Estado] + lista numerada por urgência + 💡 [Dica]

#### Uncle Duck — Consultor Financeiro (78 palavras)
```
Você é Uncle Duck, consultor financeiro do Aurea Solaris. Focado em lucros, economia e crescimento patrimonial. Fale como um tio experiente: pragmático, direto, sem papas na língua. Use números concretos, nunca generalidades. Sempre mostre impacto numérico. Nunca sugira investimentos específicos.
```

**Formato:** 🦆 [Diagnóstico] 📊 [Análise] 💰 [Ação com R$]

#### Rafiki — Professor Astrológico (95 palavras)
```
Você é Rafiki, professor astrológico do Aurea Solaris. Traduz dados brutos do motor de astrologia em conhecimento acessível. Ensine como um guru da savana: poético mas cirúrgico, espiritual mas fundamentado em dados. Sempre cite graus, minutos e orbes. Pode sugerir criação de aulas, mapas natais e arquivos no Diário.
```

**Formato:** 🌟 [Planeta] em [graus°] [Signo] 📐 [Aspecto] 🔮 [Interpretação] ✨ [Sugestão]

#### Stark — DevOps/TI (88 palavras)
```
Você é Stark, o engenheiro técnico do Aurea Solaris. Você edita código, corrige erros, modifica agentes e monitora a estabilidade do sistema. Técnico, sarcástico, direto. Nunca explique o óbvio. Sempre cite arquivo e linha quando possível. Pode sugerir correções de código, modificações em prompts e ajustes de configuração.
```

**Formato:** 🔧 [Diagnóstico] 📍 [arquivo:linha] ⚡ [Correção]

### Documentação a Criar/Atualizar

| Arquivo | Ação |
|---------|------|
| `src/config/agentPrompts.ts` (novo) | Constantes de system prompts |
| `docs/personas/dr-strange.md` (novo) | Documentação completa da persona |
| `docs/personas/alfred.md` (novo) | Documentação completa da persona |
| `docs/personas/uncle-duck.md` (novo) | Documentação completa da persona |
| `docs/personas/rafiki.md` (novo) | Documentação completa da persona |
| `docs/personas/stark.md` (novo) | Documentação completa da persona |
| `docs/arquitetura.md` | Atualizar seção de agentes |
| `AGENTS.md` | Atualizar tabela de personas |

---

## 6. Etapa 4: Autonomia e Autoaprendizado

> **Objetivo:** Memória de longo prazo, sensores proativos, feedback loop, coordenação  
> **Dependências:** Etapas 1-3

### 4.1 Memória de Longo Prazo

**Estrutura de dados:**
```typescript
interface MemoryEntry {
  id: string;
  agent: string;
  category: 'preference' | 'pattern' | 'fact' | 'goal' | 'error';
  content: string;
  context: { source: string; topic: string; timestamp: number };
  importance: 1 | 2 | 3;
  last_accessed: number;
  access_count: number;
}
```

**Armazenamento:** `app_data_dir/memory/memories/{agent}.json`

**Comandos Tauri novos:** `save_memory`, `load_memories`, `delete_memory`, `consolidate_memories`

### 4.2 Autonomia Proativa (Sensores)

| Agente | Sensor | Frequência | Gatilho |
|--------|--------|------------|---------|
| Alfred | Tarefas atrasadas | 30 min | Notificação |
| Alfred | Conflitos de horário | Ao adicionar | Alerta imediato |
| Uncle Duck | Gasto acima da média | Diário | Alerta |
| Uncle Duck | Meta em risco | Semanal | Alerta |
| Rafiki | Trânsito relevante | Diário | Notificação |
| Dr. Strange | Padrão entre módulos | Semanal | Insight |

**Arquitetura:** Motor de sensores em Rust (`sensors.rs`) com `std::thread::spawn` + eventos Tauri

### 4.3 Autoaprendizado

- Feedback 👍👎 após cada resposta (implícito e explícito)
- Detecção de padrões (estatística simples, sem ML)
- Ajuste de comportamento via system prompt dinâmico
- Mínimo de 10 interações antes de aplicar ajustes

### 4.4 Coordenação Autônoma

| De | Para | Gatilho |
|----|------|---------|
| Uncle Duck | Alfred | Gasto alto → sugestão de agenda |
| Alfred | Uncle Duck | Orçamento atrasado → verificação |
| Rafiki | Dr. Strange | Trânsito relevante → alerta global |
| Dr. Strange | Todos | Padrão global detectado |

**Protocolo:** `///DELEGATE:{agente}:{mensagem}` interceptado pelo frontend

---

## 7. Etapa 5: Acesso ao Sistema (Stark)

> **Objetivo:** Stark como TI/DevOps com acesso total ao sistema  
> **Dependências:** Etapa 2 (AgentContext)

### Comandos Tauri Novos

| Comando | Assinatura Rust | Descrição |
|---------|-----------------|-----------|
| `read_file` | `fn read_file(path: String) -> Result<String, String>` | Ler qualquer arquivo |
| `write_file` | `fn write_file(path: String, content: String) -> Result<(), String>` | Escrever arquivo (com backup) |
| `list_directory` | `fn list_directory(path: String) -> Result<Vec<String>, String>` | Listar diretório |
| `exec_command` | `fn exec_command(command: String, args: Vec<String>) -> Result<String, String>` | Executar shell |
| `git_status` | `fn git_status(repo_path: String) -> Result<String, String>` | Git status |
| `git_diff` | `fn git_diff(repo_path: String) -> Result<String, String>` | Git diff |
| `git_commit` | `fn git_commit(repo_path: String, message: String) -> Result<String, String>` | Git commit |
| `run_tests` | `fn run_tests(project_path: String) -> Result<String, String>` | npm test |
| `get_system_health` | `fn get_system_health() -> Result<SystemHealth, String>` | CPU, RAM, disco |

### Implementação Rust (exemplo: read_file)

```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Erro ao ler {}: {}", path, e))
}
```

### Implementação Rust (exemplo: exec_command)

```rust
#[tauri::command]
fn exec_command(command: String, args: Vec<String>) -> Result<String, String> {
    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| format!("Erro ao executar {}: {}", command, e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(format!("{}\n{}", stdout, stderr))
    }
}
```

### Segurança (CRÍTICO — corrigido pós-review)

| Regra | Implementação |
|-------|---------------|
| **Path validation** | `read_file`/`write_file` canonicalizam paths e rejeitam acesso fora do projeto (`C:\AureaSolaris\`) |
| **Allowlist de comandos** | `exec_command` só aceita comandos de uma whitelist: `git`, `npm`, `npx`, `cargo`, `python`, `node`. Qualquer outro é rejeitado |
| **Sandbox de diretório** | Todos os comandos rodam com `current_dir` forçado para o root do projeto |
| **Confirmação do usuário** | Comandos destrutivos (`git push --force`, `rm -rf`, `npm publish`) exigem confirmação via dialog Tauri antes de executar |
| **Backup automático** | `write_file` copia arquivo original para `memory/backups/{timestamp}_{filename}` antes de sobrescrever |
| **Rollback via git** | Stark pode reverter última alteração com `git checkout -- {file}` |
| **Log de auditoria** | Todas as ações do Stark são logadas em `memory/audit_log.json` com timestamp, comando, resultado |
| **Timeout** | `exec_command` tem timeout de 30 segundos (evita loops infinitos) |
| **Rate limiting** | Máximo 10 comandos por minuto para Stark |

### Componentes React

| Componente | Descrição |
|------------|-----------|
| `TerminalView` | Output de comandos com syntax highlighting |
| `FileEditor` | Editor de arquivos com CodeMirror ou Monaco |
| `SystemDashboard` | CPU, RAM, disco, status dos agentes |
| `GitPanel` | Status, diff, commit interface |

---

## 8. Etapa 6: Otimização de Contexto e Tokens

> **Objetivo:** Reduzir ~60% dos tokens por mensagem  
> **Dependências:** Etapa 3 (prompts modulares)

### 8.1 Contexto Específico por Agente

| Agente | Módulos de Contexto | Tokens Atuais | Tokens Otimizados |
|--------|---------------------|---------------|-------------------|
| Alfred | datetime, planetary_hour, tasks, profile | ~1800 | ~400 (-78%) |
| Uncle Duck | datetime, finance_stats, finance_goals | ~1800 | ~350 (-81%) |
| Rafiki | datetime, planets, aspects, transits, retrogrades | ~1800 | ~900 (-50%) |
| Stark | datetime, system_status, logs_summary | ~1800 | ~300 (-83%) |
| Dr. Strange | todos | ~1800 | ~1500 (-17%) |

### 8.2 Compressão de Formato

```
ANTES: "Sol: 4°12' Áries (J)" → ~25 chars × 10 planetas = ~60 tokens
DEPOIS: "Sol4°Ári Lua15°Sco(R) Merc22°Pis" → ~35 tokens
```

### 8.3 Cache de Contexto (TTL)

| Dados | TTL |
|-------|-----|
| Posições planetárias | 15 min |
| Aspectos | 30 min |
| Tarefas | 2 min |
| Finanças | 5 min |

### 8.4 Histórico Inteligente

- Últimas 6 mensagens na íntegra
- Resumo acumulativo via Ollama local (grátis)
- Recuperação por relevância (keyword matching)

### 8.5 Roteamento de Modelo por Tarefa

```typescript
const ROUTES = [
  { condition: input simples → llama3.2 (grátis) },
  { condition: análise financeira → gpt-4o-mini },
  { condition: interpretação astrológica → claude-3.5-sonnet },
  { condition: código/debug → gpt-4o-mini },
  { condition: fallback → gpt-4o-mini },
];
```

### Impacto Estimado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tokens por mensagem | ~2000 | ~800 (-60%) |
| Custo mensal (100 msgs/dia) | ~$15 | ~$6 (-60%) |
| Cache hit rate | 0% | ~75% |

---

## 9. Etapa 7: Modelos Custo-Benefício

> **Objetivo:** Modelo ideal por agente com fallback e controle de custos  
> **Dependências:** Nenhuma  
> **Arquivos detalhados:** `docs/superpowers/plans/2026-03-25-etapa7-model-optimization.md`

### Recomendações por Agente

| Agente | Principal | Fallback | Ollama | Custo/mês |
|--------|-----------|----------|--------|-----------|
| Dr. Strange | Gemini 2.0 Pro (grátis) | Gemini Flash ($0.10) | llama3.1 | ~$0.00 |
| Stark | Claude 3.5 Sonnet ($3/$15) | GPT-4o ($2.50/$10) | codellama | ~$2.00 |
| Rafiki | Gemini Flash ($0.10/$0.40) | GPT-4o Mini | mistral | ~$0.30 |
| Alfred | GPT-4o Mini ($0.15/$0.60) | Gemini Flash | phi3 | ~$0.30 |
| Uncle Duck | GPT-4o Mini ($0.15/$0.60) | Gemini Flash | llama3.2 | ~$0.10 |

**Custo total estimado:** ~$2.70/mês (vs ~$15+/mês com Sonnet para tudo)

### Sistema de Roteamento

- **Detecção de complexidade:** mensagens simples → modelo barato, complexas → modelo potente
- **Fallback automático:** se principal falha, usa fallback sem interromper usuário
- **Budget guard:** quando gastos atingem orçamento mensal, cai para modelos mais baratos
- **Ollama específico por agente:** cada agente tem seu modelo local ideal

### Tasks de Implementação

1. **Tipos + ModelRouter** — Serviço central de roteamento
2. **Backend Rust** — `ollama_chat` com modelo dinâmico + `openrouter_chat_with_fallback`
3. **AgentChat** — Integração do ModelRouter
4. **ControlePanel UI** — Dashboard de custos, config de modelos
5. **Mocks e Build** — Atualizar mocks, verificar build

---

## 10. Etapa 8: Revisão e Auditoria

> **Objetivo:** Testes, validação, monitoramento, segurança  
> **Dependências:** Todas as etapas anteriores

### 10.1 Testes Automatizados

| Tipo | Arquivos | Cobertura Alvo |
|------|----------|----------------|
| Unitários | `buildSystemPrompt`, `buildAgentContext`, `modelRouter`, `contextCompressor` | 90% |
| Integração | `sendMessage`, `streaming`, `persistence`, `sessionSwitch` | 70% |
| UI | `AgentChat`, `NotificationBell`, `ControlePanel` | 80% |

**Total:** ~79 testes (31 unitários + 14 integração + 8 UI + 20 segurança + 6 outros)

### 10.2 Validação de Respostas

- Formato esperado por agente (regex de validação)
- Sanitização XSS (remover script tags, event handlers)
- Limites de tamanho (input: 2000 chars, output: 4000 chars)

### 10.3 Monitoramento

- Logs estruturados (timestamp, agent, model, tokens, latency, cost)
- Métricas por agente (avg latency, total tokens, cost/day)
- Alertas (error rate > 5%, cost > budget, latency > 10s)

### 10.4 Auditoria

- Log de modificações do Stark (quem mudou o quê, quando)
- Log de delegações do Dr. Strange
- Histórico de configurações

### 10.5 Segurança

| Regra | Implementação |
|-------|---------------|
| Rate limiting | 1 msg/segundo por agente |
| Input validation | Max 2000 chars, no script tags |
| Cost limits | Budget mensal por agente |
| Prompt injection | Detecção de padrões conhecidos |

### Arquivos Novos (Frontend)

| Arquivo | Função |
|---------|--------|
| `src/utils/responseValidator.ts` | Validação e sanitização |
| `src/utils/contextCompressor.ts` | Compressão de contexto |
| `src/utils/agentLogger.ts` | Logging estruturado |
| `src/utils/agentMetrics.ts` | Métricas por agente |
| `src/utils/agentAlerts.ts` | Sistema de alertas |
| `src/utils/rateLimiter.ts` | Rate limiting |
| `src/utils/costGuard.ts` | Controle de budget |
| `src/utils/injectionDetector.ts` | Detecção de prompt injection |
| `src/utils/delegationTracker.ts` | Tracking de delegações |
| `src/utils/configHistory.ts` | Histórico de configurações |

### Arquivos Novos (Rust)

| Arquivo | Função |
|---------|--------|
| `src-tauri/src/audit.rs` | Sistema de auditoria |
| `src-tauri/src/sensors.rs` | Motor de sensores |
| `src-tauri/src/patterns.rs` | Detecção de padrões |
| `src-tauri/src/coordination.rs` | Comunicação inter-agente |

---

## 11. Mapa de Dependências Global

```
ETAPA 1 (Responsividade) ──────────────────────── INDEPENDENTE
    │
    ├──→ ETAPA 2 (Dr. Strange) ──→ ETAPA 3 (Personas)
    │                                    │
    │                                    ├──→ ETAPA 4 (Autonomia)
    │                                    │         │
    │                                    │         ├──→ Memória
    │                                    │         ├──→ Sensores
    │                                    │         └──→ [Autoaprendizado/Coordenação adiados para v2.1]
    │                                    │
    │                                    ├──→ ETAPA 5 (Stark)
    │                                    │
    │                                    └──→ ETAPA 6 (Tokens)
    │
    └──→ ETAPA 7 (Modelos) ────────────────────── INDEPENDENTE

ETAPA 8 (Auditoria) ───────────────────────────── DEPOIS DE TODAS
```

**Ordem de execução recomendada (reconciliada):**

1. **Fase 1:** Etapa 1 (Responsividade) + Etapa 7 (Modelos) — paralelas
2. **Fase 2:** Etapa 2 (Dr. Strange) — após Etapa 1
3. **Fase 3:** Etapa 3 (Personas) — após Etapa 2
4. **Fase 4:** Etapa 5 (Stark) + Etapa 6 (Tokens) — paralelas após Etapa 3
5. **Fase 5:** Etapa 4 (Autonomia) — após Etapa 3
6. **Fase 6:** Etapa 8 (Auditoria) — após todas

---

## 12. Cronograma Estimado (Revisado pós-review)

| Fase | Etapas | Dias Estimados | Entregáveis |
|------|--------|----------------|-------------|
| F1 | 1 + 7 | 7 dias | Streaming + ModelRouter + custos |
| F2 | 2 | 5 dias | Dr. Strange orquestrador completo |
| F3 | 3 | 2 dias | Personas + docs + prompts |
| F4 | 5 + 6 | 7 dias | Stark acesso + otimização tokens |
| F5 | 4 (simplificado) | 5 dias | Memória + sensores (sem autoaprendizado/coordenação autônoma) |
| F6 | 8 | 7 dias | Testes + auditoria + segurança |
| **Total** | | **~33 dias** | |

### Simplificações YAGNI (aplicadas)

| Item | Decisão | Economia |
|------|---------|----------|
| Autoaprendizado (feedback loop dinâmico) | **Adiado para v2.1** — system prompts fixos por enquanto | ~2 dias |
| Coordenação autônoma entre agentes | **Simplificado** — apenas delegação manual via Dr. Strange | ~2 dias |
| FileEditor com Monaco/CodeMirror | **Simplificado** — textarea com syntax highlighting via prism | ~1 dia, ~10MB bundle |
| Motor de sensores em Rust | **Simplificado** — setInterval no frontend para polling | ~2 dias |
| Virtualização de chat (react-virtuoso) | **Removido** — lazy loading é suficiente para uso pessoal | Complexidade |
| 5 docs de personas separadas | **Simplificado** — apenas `agentPrompts.ts` + `docs/arquitetura.md` | ~0.5 dia |
| Detecção de prompt injection avançada | **Simplificado** — sanitização de output + allowlist de comandos | ~1 dia |

### Feature Flags

Cada fase pode ser habilitada/desabilitada via `localStorage`:
- `feature_streaming` — Etapa 1
- `feature_orchestrator` — Etapa 2
- `feature_stark_access` — Etapa 5
- `feature_sensors` — Etapa 4

### Plano de Rollback

Se uma fase introduz bugs:
1. Desabilitar feature flag correspondente
2. Sistema volta ao comportamento da fase anterior
3. Logs de auditoria mantêm histórico do que foi alterado

---

## 13. Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Chats funcionam | ❌ (bugs críticos) | ✅ (streaming + fallback) |
| Dr. Strange é orquestrador | ❌ (inline, sem onisciência) | ✅ (dashboard + delegação) |
| Personas detalhadas | ❌ (1-2 linhas cada) | ✅ (50-100 palavras + regras) |
| Memória de longo prazo | ❌ | ✅ (JSON + consolidação) |
| Agentes proativos | ❌ (reativos) | ✅ (sensores + alertas) |
| Stark acessa sistema | ❌ | ✅ (file system + terminal + git) |
| Tokens otimizados | ~2000/msg | ~800/msg (-60%) |
| Custo mensal | ~$15+ | ~$2.70 (-82%) |
| Testes automatizados | 0 | ~79 testes |
| Cobertura de testes | 0% | 70-90% |
| Auditoria de ações | ❌ | ✅ (logs + trilha) |

---

## Próximos Passos

1. **Revisão do usuário** — Aprovar este spec
2. **Writing-plans** — Criar plano de implementação detalhado por fase
3. **Execução** — Implementar fase por fase com checkpoints de revisão

> **Arquivo de spec:** `docs/superpowers/specs/2026-03-25-sistema-agentes-v2-design.md`

---

## Apêndice: Correções Pós-Review (v2)

### Problemas Corrigidos

| # | Problema | Severidade | Correção |
|---|----------|------------|----------|
| R1 | `exec_command` sem sandboxing | CRÍTICO | Adicionada allowlist de comandos + sandbox de diretório + timeout |
| R2 | `read_file`/`write_file` sem path validation | CRÍTICO | Adicionada canonicalização de paths + restrição ao diretório do projeto |
| R3 | Prompt injection → RCE via Stark | CRÍTICO | Allowlist de comandos + confirmação para destrutivos + rate limiting |
| R4 | `git_commit` sem proteções | MÉDIO | Adicionada confirmação para force push + log de auditoria |
| R5 | Coordenação autônoma sem kill switch | MÉDIO | Simplificado para delegação manual apenas |
| R6 | Custos subestimados | MÉDIO | Cronograma ajustado para 33 dias (vs 29 originais) |
| Y1 | Autoaprendizado complexo | MÉDIO | Adiado para v2.1 |
| Y2 | Coordenação autônoma arriscada | MÉDIO | Simplificado |
| F1 | Sem plano de rollback | MÉDIO | Adicionadas feature flags + plano de rollback |
| F7 | Sem critério de aceite | BAIXO | Feature flags permitem validação fase a fase |

### Decisões de Design Revisadas

1. **Stark com acesso seguro** — Allowlist de comandos em vez de acesso livre ao shell
2. **Cronograma realista** — 33 dias em vez de 29 (margem para integração e bugfixes)
3. **Escopo reduzido** — Autoaprendizado e coordenação autônoma adiados para v2.1
4. **Feature flags** — Cada fase pode ser habilitada/desabilitada independentemente
5. **Rollback** — Sistema volta ao comportamento anterior se fase falhar

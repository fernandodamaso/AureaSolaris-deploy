# ETAPA 7 — Otimização de Seleção de Modelos de IA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar um sistema inteligente de roteamento de modelos de IA por agente, com fallback automático, controle de custos e configuração dinâmica via UI.

**Architecture:** Serviço centralizado de roteamento (`ModelRouter`) que seleciona o modelo ideal por agente baseado em complexidade da tarefa, com fallback chain, tracking de custos em tempo real e configuração persistente via Rust backend + UI no ControlePanel.

**Tech Stack:** TypeScript (frontend), Rust (backend Tauri), OpenRouter API, Ollama local, localStorage + JSON persistência.

---

## Análise de Modelos Disponíveis (Referência)

### OpenRouter — Custos e Capacidades (Março 2026)

| Modelo | Custo Input/1M | Custo Output/1M | Contexto | Força Principal | Velocidade |
|--------|---------------|-----------------|----------|-----------------|------------|
| `openai/gpt-4o-mini` | $0.15 | $0.60 | 128k | Rápido, econômico, bom geral | ★★★★★ |
| `openai/gpt-4o` | $2.50 | $10.00 | 128k | Excelente reasoning + coding | ★★★★ |
| `anthropic/claude-3.5-sonnet` | $3.00 | $15.00 | 200k | Melhor coding, preciso | ★★★★ |
| `anthropic/claude-3-haiku` | $0.25 | $1.25 | 200k | Rápido, bom custo-benefício | ★★★★★ |
| `google/gemini-2.0-flash` | $0.10 | $0.40 | 1M | Barato, contexto enorme | ★★★★★ |
| `google/gemini-2.0-pro-exp` | Gratuito | Gratuito | ~32k | Gratuito mas limitado/rate-limited | ★★★ |
| `meta-llama/llama-3.1-70b-instruct` | $0.40 | $0.40 | 128k | Open-source, bom reasoning | ★★★★ |
| `mistralai/mixtral-8x7b-instruct` | $0.24 | $0.24 | 32k | Rápido, econômico | ★★★★ |

### Ollama Local — Modelos Disponíveis

| Modelo | RAM Necessária | Força Principal | Recomendado Para |
|--------|---------------|-----------------|------------------|
| `llama3.2` (3B) | ~2GB | Rápido, leve | Tarefas simples, fallback |
| `llama3.1` (8B) | ~5GB | Bom geral | Uso geral local |
| `codellama` (7B-13B) | ~5-8GB | Coding focado | Stark (debug local) |
| `mistral` (7B) | ~4GB | Bom geral, rápido | Alternativa equilibrada |
| `phi3` (3.8B) | ~2GB | Muito rápido, eficiente | Tarefas rápidas/local |
| `gemma2` (2B-9B) | ~2-5GB | Google, eficiente | Alternativa leve |

---

## Arquivo de Mapeamento

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/services/ModelRouter.ts` | **NOVO** —Serviço central de roteamento de modelos |
| `src/types/modelConfig.ts` | **NOVO** — Tipos TypeScript para configuração de modelos |
| `src-tauri/src/lib.rs:54-84` | **MODIFICAR** — `ollama_chat` aceitar modelo dinâmico |
| `src-tauri/src/lib.rs:107-159` | **MODIFICAR** — `openrouter_chat` com fallback chain |
| `src/components/AgentChat.tsx:231-271` | **MODIFICAR** — `sendMessage` usar ModelRouter |
| `src/components/ControlePanel.tsx:202-352` | **MODIFICAR** — `AgentConfigModal` com modelos expandidos |
| `src/components/ControlePanel.tsx:150-182` | **MODIFICAR** — Cards de agentes com custo real |
| `src/utils/tauri.ts` | **MODIFICAR** — Mock atualizado para novo sistema |

---

## Ordem de Implementação

### Task 1: Tipos e Configuração Base

**Files:**
- Create: `src/types/modelConfig.ts`
- Create: `src/services/ModelRouter.ts`

- [ ] **Step 1: Criar tipos TypeScript para configuração de modelos**

```typescript
// src/types/modelConfig.ts

export interface ModelConfig {
  id: string;                    // ex: "openai/gpt-4o-mini"
  name: string;                  // ex: "GPT-4o Mini"
  provider: 'openrouter' | 'ollama';
  costPerMillionInput: number;   // USD
  costPerMillionOutput: number;  // USD
  maxContext: number;            // tokens
  strengths: string[];           // ex: ["coding", "reasoning"]
  speed: 1 | 2 | 3 | 4 | 5;
  quality: 1 | 2 | 3 | 4 | 5;
}

export interface AgentModelProfile {
  agent: AgentName;
  primaryModel: string;          // modelo principal
  fallbackModel: string;         // fallback se principal falhar
  localModel: string;            // modelo Ollama quando em modo local
  complexityThreshold: 'low' | 'medium' | 'high';
}

export type AgentName = 'Dr. Strange' | 'Alfred' | 'Uncle Duck' | 'Rafiki' | 'Stark';

export interface CostTracker {
  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCostUSD: number;
  monthlyBudgetUSD: number;
  byAgent: Record<AgentName, {
    tokensInput: number;
    tokensOutput: number;
    costUSD: number;
    requestCount: number;
  }>;
}

export interface ModelRouteResult {
  model: string;
  provider: 'openrouter' | 'ollama';
  reason: string;               // "primary", "fallback", "budget_exceeded", "local_mode"
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.60,
    maxContext: 128000,
    strengths: ['general', 'fast', 'economical'],
    speed: 5,
    quality: 3,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    costPerMillionInput: 2.50,
    costPerMillionOutput: 10.00,
    maxContext: 128000,
    strengths: ['reasoning', 'coding', 'analysis'],
    speed: 4,
    quality: 5,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    costPerMillionInput: 3.00,
    costPerMillionOutput: 15.00,
    maxContext: 200000,
    strengths: ['coding', 'debugging', 'precision'],
    speed: 4,
    quality: 5,
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'openrouter',
    costPerMillionInput: 0.25,
    costPerMillionOutput: 1.25,
    maxContext: 200000,
    strengths: ['fast', 'economical', 'general'],
    speed: 5,
    quality: 4,
  },
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    costPerMillionInput: 0.10,
    costPerMillionOutput: 0.40,
    maxContext: 1000000,
    strengths: ['fast', 'cheap', 'long_context'],
    speed: 5,
    quality: 4,
  },
  {
    id: 'google/gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro (Experimental)',
    provider: 'openrouter',
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    maxContext: 32000,
    strengths: ['free', 'reasoning'],
    speed: 3,
    quality: 4,
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'openrouter',
    costPerMillionInput: 0.40,
    costPerMillionOutput: 0.40,
    maxContext: 128000,
    strengths: ['open_source', 'reasoning', 'economical'],
    speed: 3,
    quality: 4,
  },
];

export const OLLAMA_MODELS = [
  { id: 'llama3.2', name: 'Llama 3.2 (3B)', ramGB: 2, strengths: ['fast', 'light'] },
  { id: 'llama3.1', name: 'Llama 3.1 (8B)', ramGB: 5, strengths: ['general', 'balanced'] },
  { id: 'codellama', name: 'Code Llama (7B)', ramGB: 5, strengths: ['coding', 'debugging'] },
  { id: 'mistral', name: 'Mistral (7B)', ramGB: 4, strengths: ['fast', 'general'] },
  { id: 'phi3', name: 'Phi-3 (3.8B)', ramGB: 2, strengths: ['fast', 'efficient'] },
  { id: 'gemma2', name: 'Gemma 2 (9B)', ramGB: 5, strengths: ['balanced', 'google'] },
];
```

- [ ] **Step 2: Criar serviço ModelRouter**

```typescript
// src/services/ModelRouter.ts

import {
  AgentName, AgentModelProfile, CostTracker, ModelRouteResult,
  AVAILABLE_MODELS, OLLAMA_MODELS
} from '../types/modelConfig';

const DEFAULT_PROFILES: Record<AgentName, AgentModelProfile> = {
  'Dr. Strange': {
    agent: 'Dr. Strange',
    primaryModel: 'google/gemini-2.0-pro-exp-02-05',
    fallbackModel: 'google/gemini-2.0-flash',
    localModel: 'llama3.1',
    complexityThreshold: 'high',
  },
  'Stark': {
    agent: 'Stark',
    primaryModel: 'anthropic/claude-3.5-sonnet',
    fallbackModel: 'openai/gpt-4o',
    localModel: 'codellama',
    complexityThreshold: 'high',
  },
  'Rafiki': {
    agent: 'Rafiki',
    primaryModel: 'google/gemini-2.0-flash',
    fallbackModel: 'openai/gpt-4o-mini',
    localModel: 'mistral',
    complexityThreshold: 'medium',
  },
  'Alfred': {
    agent: 'Alfred',
    primaryModel: 'openai/gpt-4o-mini',
    fallbackModel: 'google/gemini-2.0-flash',
    localModel: 'phi3',
    complexityThreshold: 'low',
  },
  'Uncle Duck': {
    agent: 'Uncle Duck',
    primaryModel: 'openai/gpt-4o-mini',
    fallbackModel: 'google/gemini-2.0-flash',
    localModel: 'llama3.2',
    complexityThreshold: 'low',
  },
};

function loadProfiles(): Record<AgentName, AgentModelProfile> {
  const saved = localStorage.getItem('agent_model_profiles');
  if (saved) {
    try {
      return { ...DEFAULT_PROFILES, ...JSON.parse(saved) };
    } catch {
      return { ...DEFAULT_PROFILES };
    }
  }
  return { ...DEFAULT_PROFILES };
}

function loadCostTracker(): CostTracker {
  const saved = localStorage.getItem('cost_tracker');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch { /* fall through */ }
  }
  return {
    totalTokensInput: 0,
    totalTokensOutput: 0,
    estimatedCostUSD: 0,
    monthlyBudgetUSD: 5.00,
    byAgent: {
      'Dr. Strange': { tokensInput: 0, tokensOutput: 0, costUSD: 0, requestCount: 0 },
      'Alfred': { tokensInput: 0, tokensOutput: 0, costUSD: 0, requestCount: 0 },
      'Uncle Duck': { tokensInput: 0, tokensOutput: 0, costUSD: 0, requestCount: 0 },
      'Rafiki': { tokensInput: 0, tokensOutput: 0, costUSD: 0, requestCount: 0 },
      'Stark': { tokensInput: 0, tokensOutput: 0, costUSD: 0, requestCount: 0 },
    },
  };
}

function detectComplexity(message: string): 'low' | 'medium' | 'high' {
  const highSignals = [
    'analise', 'debug', 'explique detalhadamente', 'compare', 'implemente',
    'refatore', 'arquitetura', 'otimize', 'review código', 'stack trace',
  ];
  const mediumSignals = [
    'liste', 'resuma', 'sugira', 'como', 'por que', 'quais',
    'calcule', 'projete', 'planeje',
  ];
  const lower = message.toLowerCase();
  if (highSignals.some(s => lower.includes(s))) return 'high';
  if (mediumSignals.some(s => lower.includes(s))) return 'medium';
  if (message.length > 500) return 'medium';
  return 'low';
}

export function routeModel(
  agent: AgentName,
  userMessage: string,
  aiMode: 'ollama' | 'openrouter' = 'openrouter',
): ModelRouteResult {
  const profiles = loadProfiles();
  const profile = profiles[agent] || DEFAULT_PROFILES[agent];
  const costTracker = loadCostTracker();
  const complexity = detectComplexity(userMessage);

  // Mode: Ollama local
  if (aiMode === 'ollama') {
    return {
      model: profile.localModel,
      provider: 'ollama',
      reason: 'local_mode',
    };
  }

  // Budget check
  const budgetExceeded = costTracker.estimatedCostUSD >= costTracker.monthlyBudgetUSD;
  if (budgetExceeded) {
    // Fallback to cheapest available or local
    return {
      model: 'google/gemini-2.0-flash',
      provider: 'openrouter',
      reason: 'budget_exceeded',
    };
  }

  // Complexity-based routing
  if (complexity === 'high' && profile.complexityThreshold !== 'high') {
    // Escalate to a stronger model
    const escalateModel = agent === 'Stark'
      ? 'anthropic/claude-3.5-sonnet'
      : 'openai/gpt-4o';
    return {
      model: escalateModel,
      provider: 'openrouter',
      reason: 'complexity_escalation',
    };
  }

  // Normal: use primary model
  return {
    model: profile.primaryModel,
    provider: 'openrouter',
    reason: 'primary',
  };
}

export function getFallbackModel(agent: AgentName, failedModel: string): ModelRouteResult {
  const profiles = loadProfiles();
  const profile = profiles[agent] || DEFAULT_PROFILES[agent];

  if (failedModel === profile.primaryModel) {
    return {
      model: profile.fallbackModel,
      provider: 'openrouter',
      reason: 'fallback',
    };
  }
  // Last resort
  return {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    reason: 'last_resort',
  };
}

export function trackUsage(
  agent: AgentName,
  modelId: string,
  tokensInput: number,
  tokensOutput: number,
): void {
  const tracker = loadCostTracker();
  const modelDef = AVAILABLE_MODELS.find(m => m.id === modelId);
  const costInput = modelDef ? (tokensInput / 1_000_000) * modelDef.costPerMillionInput : 0;
  const costOutput = modelDef ? (tokensOutput / 1_000_000) * modelDef.costPerMillionOutput : 0;
  const totalCost = costInput + costOutput;

  tracker.totalTokensInput += tokensInput;
  tracker.totalTokensOutput += tokensOutput;
  tracker.estimatedCostUSD += totalCost;

  if (tracker.byAgent[agent]) {
    tracker.byAgent[agent].tokensInput += tokensInput;
    tracker.byAgent[agent].tokensOutput += tokensOutput;
    tracker.byAgent[agent].costUSD += totalCost;
    tracker.byAgent[agent].requestCount += 1;
  }

  localStorage.setItem('cost_tracker', JSON.stringify(tracker));
}

export function getCostTracker(): CostTracker {
  return loadCostTracker();
}

export function setMonthlyBudget(budgetUSD: number): void {
  const tracker = loadCostTracker();
  tracker.monthlyBudgetUSD = budgetUSD;
  localStorage.setItem('cost_tracker', JSON.stringify(tracker));
}

export function updateAgentProfile(agent: AgentName, profile: Partial<AgentModelProfile>): void {
  const profiles = loadProfiles();
  profiles[agent] = { ...profiles[agent], ...profile };
  localStorage.setItem('agent_model_profiles', JSON.stringify(profiles));
}

export function getAgentProfiles(): Record<AgentName, AgentModelProfile> {
  return loadProfiles();
}
```

- [ ] **Step 3: Commit tipos e serviço**

```bash
git add src/types/modelConfig.ts src/services/ModelRouter.ts
git commit -m "feat(etapa7): add model routing service with cost tracking"
```

---

### Task 2: Backend — Comando Tauri com Fallback Chain

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Modificar `ollama_chat` para aceitar modelo dinâmico**

```rust
// src-tauri/src/lib.rs — substituir a função ollama_chat existente (linha 54)

#[tauri::command]
async fn ollama_chat(messages: Vec<OpenRouterMessage>, model: Option<String>) -> Result<String, String> {
    let model_name = model.unwrap_or_else(|| "llama3.2".to_string());
    println!("Stark: Ollama local — modelo: {}", model_name);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP para Ollama: {}", e))?;

    let req_body = OllamaRequest {
        model: model_name,
        messages,
        stream: false,
    };

    let res = client.post("http://localhost:11434/api/chat")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de rede ao conectar ao Ollama (Certifique-se que está rodando): {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Erro no Ollama: {}", err_text));
    }

    let json_res: OllamaResponse = res.json().await.map_err(|e| format!("Erro ao decodificar JSON do Ollama: {}", e))?;

    let content = json_res.message.content;
    println!("Stark: Resposta Ollama recebida ({} chars)", content.len());
    Ok(content)
}
```

- [ ] **Step 2: Criar comando `openrouter_chat_with_fallback`**

```rust
// src-tauri/src/lib.rs — adicionar após a função openrouter_chat existente

#[tauri::command]
async fn openrouter_chat_with_fallback(
    app: tauri::AppHandle,
    model: String,
    fallback_model: Option<String>,
    messages: Vec<OpenRouterMessage>,
) -> Result<String, String> {
    // Try primary model
    match openrouter_chat(app.clone(), model.clone(), messages.clone()).await {
        Ok(content) => Ok(content),
        Err(primary_err) => {
            println!("Stark: Modelo {} falhou: {}", model, primary_err);

            // Try fallback if available
            if let Some(fallback) = fallback_model {
                println!("Stark: Tentando fallback: {}", fallback);
                match openrouter_chat(app, fallback.clone(), messages).await {
                    Ok(content) => {
                        println!("Stark: Fallback {} sucesso", fallback);
                        Ok(content)
                    }
                    Err(fallback_err) => {
                        Err(format!(
                            "Modelo principal ({}) e fallback ({}) falharam.\nErro principal: {}\nErro fallback: {}",
                            model, fallback, primary_err, fallback_err
                        ))
                    }
                }
            } else {
                Err(primary_err)
            }
        }
    }
}
```

- [ ] **Step 3: Registrar novo comando no invoke_handler**

```rust
// src-tauri/src/lib.rs — adicionar openrouter_chat_with_fallback ao invoke_handler
// Procurar por tauri::generate_handler![ e adicionar o novo comando
```

- [ ] **Step 4: Commit backend**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(etapa7): add dynamic Ollama model param and fallback chain"
```

---

### Task 3: Frontend — Integrar ModelRouter no AgentChat

**Files:**
- Modify: `src/components/AgentChat.tsx:231-271`

- [ ] **Step 1: Atualizar `sendMessage` para usar ModelRouter**

Substituir o bloco de envio de mensagem no `AgentChat.tsx` para usar o serviço de roteamento:

```typescript
// src/components/AgentChat.tsx — dentro de sendMessage(), substituir linhas 242-260

import { routeModel, getFallbackModel, trackUsage } from '../services/ModelRouter';

// ... dentro de sendMessage():
const systemMsg = { role: 'system', content: buildSystemPrompt() };
const aiMode = (localStorage.getItem('ai_master_switch') || 'ollama') as 'ollama' | 'openrouter';

const route = routeModel(agent as any, input, aiMode);
console.log(`[ModelRouter] ${agent} → ${route.model} (${route.reason})`);

let response: string | null = null;

try {
  if (route.provider === 'ollama') {
    response = await safeInvoke<string>('ollama_chat', {
      model: route.model,
      messages: [systemMsg, ...newMessages.slice(-8)]
    });
  } else {
    const profile = getAgentProfiles()[agent as AgentName];
    response = await safeInvoke<string>('openrouter_chat_with_fallback', {
      model: route.model,
      fallbackModel: profile?.fallbackModel,
      messages: [systemMsg, ...newMessages.slice(-8)]
    });
  }
} catch (e: any) {
  // If primary failed and we got here, try fallback
  const fallback = getFallbackModel(agent as any, route.model);
  console.log(`[ModelRouter] Fallback: ${fallback.model} (${fallback.reason})`);
  try {
    response = await safeInvoke<string>('openrouter_chat', {
      model: fallback.model,
      messages: [systemMsg, ...newMessages.slice(-8)]
    });
  } catch (fallbackErr: any) {
    setError(`Erro em ambos modelos: ${fallbackErr.toString()}`);
  }
}

// Track token usage (approximate)
if (response) {
  const approxInputTokens = Math.ceil((systemMsg.content.length + input.length) / 4);
  const approxOutputTokens = Math.ceil(response.length / 4);
  trackUsage(agent as any, route.model, approxInputTokens, approxOutputTokens);
}
```

- [ ] **Step 2: Commit integração AgentChat**

```bash
git add src/components/AgentChat.tsx
git commit -m "feat(etapa7): integrate ModelRouter into AgentChat sendMessage"
```

---

### Task 4: UI — Configuração Avançada no ControlePanel

**Files:**
- Modify: `src/components/ControlePanel.tsx:202-352` (AgentConfigModal)
- Modify: `src/components/ControlePanel.tsx:150-182` (Agent cards)

- [ ] **Step 1: Expandir AgentConfigModal com modelos por agente**

Atualizar o modal para mostrar:
- Dropdown com todos os modelos OpenRouter disponíveis
- Dropdown separado para modelo Ollama local
- Fallback model selector
- Indicador de custo estimado por 1000 mensagens

- [ ] **Step 2: Adicionar seção de Orçamento e Custos**

Nova seção no ControlePanel:
- Input para orçamento mensal em USD
- Barra de progresso de gastos vs orçamento
- Tabela de custo por agente
- Botão "Resetar contadores" (reseta mês)

- [ ] **Step 3: Commit UI**

```bash
git add src/components/ControlePanel.tsx
git commit -m "feat(etapa7): add model config UI and cost dashboard to ControlePanel"
```

---

### Task 5: Tipagem e Testes

**Files:**
- Modify: `src/utils/tauri.ts` (mocks atualizados)

- [ ] **Step 1: Atualizar mocks no `tauri.ts`**

Atualizar o `handleMockStorage` e `handleCommand` para suportar os novos comandos:
- `openrouter_chat_with_fallback`
- `ollama_chat` com parâmetro `model`

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

- [ ] **Step 3: Commit final**

```bash
git add src/utils/tauri.ts
git commit -m "feat(etapa7): update mocks and verify build"
```

---

## Recomendações por Agente — Resumo

| Agente | Modelo Principal | Fallback | Ollama Local | Justificativa |
|--------|-----------------|----------|--------------|---------------|
| **Dr. Strange** | `gemini-2.0-pro-exp` (gratuito) | `gemini-2.0-flash` ($0.10/$0.40) | `llama3.1` | Orquestração precisa de reasoning, contexto longo. Gemini Pro é gratuito e suficiente para visão macro. Flash como fallback barato. |
| **Stark** | `claude-3.5-sonnet` ($3/$15) | `gpt-4o` ($2.50/$10) | `codellama` | Coding/debugging exige máxima precisão. Sonnet é o melhor para código. CodeLlama como opção local. |
| **Rafiki** | `gemini-2.0-flash` ($0.10/$0.40) | `gpt-4o-mini` ($0.15/$0.60) | `mistral` | Interpretação criativa não precisa do modelo mais caro. Flash é rápido e tem contexto de 1M tokens para dados astrais extensos. |
| **Alfred** | `gpt-4o-mini` ($0.15/$0.60) | `gemini-2.0-flash` ($0.10/$0.40) | `phi3` | Respostas diretas e organização são tarefas de baixa complexidade. Mini é perfeito: rápido e barato. |
| **Uncle Duck** | `gpt-4o-mini` ($0.15/$0.60) | `gemini-2.0-flash` ($0.10/$0.40) | `llama3.2` | Análise financeira pragmática não precisa de modelo premium. Mini é preciso com números. |

### Custo Estimado Mensal (50 msgs/dia por agente = 250 msgs/dia total)

| Cenário | Custo Estimado/mês |
|---------|-------------------|
| **Econômico** (todos Mini/Flash) | ~$1.50 - $3.00 |
| **Recomendado** (mix por agente) | ~$3.00 - $6.00 |
| **Premium** (todos Sonnet/4o) | ~$15.00 - $30.00 |
| **100% Ollama Local** | $0.00 (usa hardware local) |

---

## Checklist de Validação Final

- [ ] `npm run build` passa sem erros
- [ ] Cada agente usa o modelo correto por padrão
- [ ] Fallback funciona quando modelo principal retorna erro
- [ ] Custos são rastreados e exibidos no ControlePanel
- [ ] Modo Ollama usa modelos locais específicos por agente
- [ ] Orçamento mensal impede gastos excessivos
- [ ] Documentação atualizada (`docs/arquitetura.md` e `AGENTS.md`)

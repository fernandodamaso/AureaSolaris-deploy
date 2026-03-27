# Dr. Strange — Orquestrador Onisciente (ETAPA 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar Dr. Strange de um chat inline em um orquestrador onisciente que vê, coordena e delega para todos os outros agentes do sistema.

**Architecture:** Sistema de eventos pub/sub via React Context + novos comandos Tauri para orquestração. Dr. Strange migra de App.tsx inline para AgentChat.tsx, ganhando acesso ao sistema de sessões, contexto compartilhado e dashboard de agentes.

**Tech Stack:** React 19 (Context + Events), TypeScript, Tauri (Rust), Zustand-like patterns via Context

---

## Problema Atual (Diagnóstico)

| Problema | Impacto |
|----------|---------|
| Dr. Strange implementado INLINE em `App.tsx` (linhas 110-211) | Não usa sistema de sessões do AgentChat |
| `chat_id: null` sempre (linha 205) | Sem histórico organizado por sessão |
| Salva como `"Strange"` (linha 205) mas AgentChat salva como `"Dr. Strange"` | Histórico fragmentado em 2 agentes diferentes |
| Sem acesso ao estado de outros agentes | Não pode coordenar |
| Sem sistema de eventos | Não pode delegar tarefas |
| FAB flutuante limitado (420x650px) | UI insuficiente para orquestração |

---

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────┐
│                   AgentContext (NOVO)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Rafiki   │ │ Alfred   │ │ Uncle    │ │ Stark  │ │
│  │ state    │ │ state    │ │ Duck     │ │ state  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│         ↓           ↓           ↓           ↓       │
│              EventBus (pub/sub)                      │
│         ↓           ↓           ↓           ↓       │
│  ┌─────────────────────────────────────────────┐    │
│  │           Dr. Strange (Orchestrator)         │    │
│  │  • Vê estado de todos os agentes             │    │
│  │  • Delega tarefas via EventBus               │    │
│  │  • Monitora progresso                        │    │
│  │  • Acesso a logs do sistema                  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Mapa de Arquivos

### Arquivos a CRIAR

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/context/AgentContext.tsx` | Estado compartilhado de todos os agentes + EventBus |
| `src/types/agent.ts` | Tipos TypeScript para agentes, eventos, tarefas delegadas |
| `src/components/StrangeDashboard.tsx` | Dashboard de orquestração (visão de todos os agentes) |
| `src/components/AgentStatusCard.tsx` | Card de status individual de cada agente |
| `src/components/DelegationPanel.tsx` | Painel para delegar tarefas a agentes |

### Arquivos a MODIFICAR

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Remover Dr. Strange inline (linhas 86-211), usar AgentChat |
| `src/components/AgentChat.tsx` | Adicionar suporte a Dr. Strange com contexto onisciente |
| `src/utils/tauri.ts` | Adicionar mock para novos comandos de orquestração |
| `src-tauri/src/lib.rs` | Adicionar comandos de orquestração (agent_status, delegate_task) |
| `docs/arquitetura.md` | Atualizar seção de agentes |

---

## Implementação — Tarefas em Ordem

### Task 1: Fundação de Tipos e Contexto

**Files:**
- Create: `src/types/agent.ts`
- Create: `src/context/AgentContext.tsx`
- Modify: `src/App.tsx:1-32` (imports)

- [ ] **Step 1: Criar tipos TypeScript para o sistema de agentes**

```typescript
// src/types/agent.ts

export type AgentName = 'Dr. Strange' | 'Rafiki' | 'Alfred' | 'Uncle Duck' | 'Stark';

export type AgentStatus = 'idle' | 'active' | 'busy' | 'error';

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  currentPage: string | null;
  lastActivity: string | null;
  currentTask: string | null;
  messageCount: number;
}

export interface AgentEvent {
  id: string;
  type: 'task_delegated' | 'task_completed' | 'status_change' | 'insight' | 'alert';
  source: AgentName;
  target?: AgentName;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DelegatedTask {
  id: string;
  description: string;
  assignedTo: AgentName;
  assignedBy: AgentName;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SystemLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
  timestamp: string;
}
```

- [ ] **Step 2: Criar AgentContext com EventBus**

```typescript
// src/context/AgentContext.tsx
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { AgentState, AgentEvent, DelegatedTask, AgentName, SystemLog } from '../types/agent';

interface AgentContextType {
  agents: Record<AgentName, AgentState>;
  events: AgentEvent[];
  delegatedTasks: DelegatedTask[];
  systemLogs: SystemLog[];
  updateAgentStatus: (name: AgentName, status: Partial<AgentState>) => void;
  emitEvent: (event: Omit<AgentEvent, 'id' | 'timestamp'>) => void;
  delegateTask: (task: Omit<DelegatedTask, 'id' | 'createdAt' | 'status'>) => string;
  completeTask: (taskId: string, result: string) => void;
  addSystemLog: (log: Omit<SystemLog, 'timestamp'>) => void;
  getAgentEvents: (agentName: AgentName) => AgentEvent[];
  getAgentTasks: (agentName: AgentName) => DelegatedTask[];
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const defaultAgents: Record<AgentName, AgentState> = {
  'Dr. Strange': { name: 'Dr. Strange', status: 'idle', currentPage: null, lastActivity: null, currentTask: null, messageCount: 0 },
  'Rafiki': { name: 'Rafiki', status: 'idle', currentPage: 'astrologia', lastActivity: null, currentTask: null, messageCount: 0 },
  'Alfred': { name: 'Alfred', status: 'idle', currentPage: null, lastActivity: null, currentTask: null, messageCount: 0 },
  'Uncle Duck': { name: 'Uncle Duck', status: 'idle', currentPage: 'financas', lastActivity: null, currentTask: null, messageCount: 0 },
  'Stark': { name: 'Stark', status: 'idle', currentPage: 'controle', lastActivity: null, currentTask: null, messageCount: 0 },
};

export const AgentProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<Record<AgentName, AgentState>>(defaultAgents);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [delegatedTasks, setDelegatedTasks] = useState<DelegatedTask[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const listenersRef = useRef<Map<string, (event: AgentEvent) => void>>(new Map());

  const updateAgentStatus = useCallback((name: AgentName, update: Partial<AgentState>) => {
    setAgents(prev => ({
      ...prev,
      [name]: { ...prev[name], ...update, lastActivity: new Date().toISOString() }
    }));
  }, []);

  const emitEvent = useCallback((event: Omit<AgentEvent, 'id' | 'timestamp'>) => {
    const fullEvent: AgentEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    setEvents(prev => [fullEvent, ...prev].slice(0, 100));
    listenersRef.current.forEach(listener => listener(fullEvent));
  }, []);

  const delegateTask = useCallback((task: Omit<DelegatedTask, 'id' | 'createdAt' | 'status'>) => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTask: DelegatedTask = { ...task, id, status: 'pending', createdAt: new Date().toISOString() };
    setDelegatedTasks(prev => [newTask, ...prev]);
    emitEvent({ type: 'task_delegated', source: task.assignedBy, target: task.assignedTo, payload: { taskId: id, description: task.description } });
    return id;
  }, [emitEvent]);

  const completeTask = useCallback((taskId: string, result: string) => {
    setDelegatedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', result, completedAt: new Date().toISOString() } : t));
    const task = delegatedTasks.find(t => t.id === taskId);
    if (task) emitEvent({ type: 'task_completed', source: task.assignedTo, payload: { taskId, result } });
  }, [emitEvent, delegatedTasks]);

  const addSystemLog = useCallback((log: Omit<SystemLog, 'timestamp'>) => {
    setSystemLogs(prev => [{ ...log, timestamp: new Date().toISOString() }, ...prev].slice(0, 200));
  }, []);

  const getAgentEvents = useCallback((agentName: AgentName) =>
    events.filter(e => e.source === agentName || e.target === agentName), [events]);

  const getAgentTasks = useCallback((agentName: AgentName) =>
    delegatedTasks.filter(t => t.assignedTo === agentName), [delegatedTasks]);

  return (
    <AgentContext.Provider value={{
      agents, events, delegatedTasks, systemLogs,
      updateAgentStatus, emitEvent, delegateTask, completeTask,
      addSystemLog, getAgentEvents, getAgentTasks
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgentContext must be used within AgentProvider');
  return context;
};
```

- [ ] **Step 3: Integrar AgentProvider no App.tsx**

No `App.tsx`, envolver o app com `<AgentProvider>`:

```tsx
// src/App.tsx - linha ~247
import { AgentProvider } from './context/AgentContext';

// Dentro do return, envolver AgendaProvider:
<AgentProvider>
  <AgendaProvider>
    {/* ... existing code ... */}
  </AgendaProvider>
</AgentProvider>
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 2: Migrar Dr. Strange de Inline para AgentChat

**Files:**
- Modify: `src/App.tsx:86-211` (remover lógica inline do Strange)
- Modify: `src/App.tsx:345-376` (remover FAB e UI inline)
- Modify: `src/components/AgentChat.tsx:194-229` (atualizar buildSystemPrompt para Dr. Strange)

- [ ] **Step 1: Remover estado e lógica inline do Dr. Strange em App.tsx**

Remover do `App.tsx`:
- Linha 90: `const [strangeMsgs, setStrangeMsgs] = useState<any[]>([]);`
- Linha 91: `const [strangeInput, setStrangeInput] = useState('');`
- Linha 92: `const [loadingStrange, setLoadingStrange] = useState(false);`
- Linhas 109-211: `useEffect` de load + `handleStrange` function
- Linhas 345-376: JSX do FAB flutuante e modal do Strange

- [ ] **Step 2: Adicionar Dr. Strange ao chat lateral**

Modificar a seção de chat lateral em `App.tsx` (linhas 336-343):

```tsx
{/* CHAT DIREITO */}
<aside className={`h-full shrink-0 z-10 transition-all duration-500 overflow-hidden ${hasChat ? 'w-[360px] opacity-100' : 'w-0 opacity-0'}`}>
  {currentPage === 'astrologia' && <AgentChat agent="Rafiki" />}
  {currentPage === 'saude' && <AgentChat agent="Alfred" />}
  {currentPage === 'agenda' && <AgentChat agent="Alfred" />}
  {currentPage === 'financas' && <AgentChat agent="Uncle Duck" />}
  {currentPage === 'hub' && <AgentChat agent="Alfred" />}
  {currentPage === 'controle' && <AgentChat agent="Stark" />}
  {isStrangeOpen && <AgentChat agent="Dr. Strange" />}
</aside>
```

Substituir o FAB flutuante por um toggle simples:

```tsx
{/* STRANGE TOGGLE */}
<button
  onClick={() => setIsStrangeOpen(!isStrangeOpen)}
  className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl border-2 flex items-center justify-center transition-all hover:scale-110 ${
    isStrangeOpen ? 'bg-[#c5a059] border-[#c5a059] text-white' : 'bg-white border-[#c5a059]/30 text-[#c5a059]'
  }`}
>
  <Eye size={24} />
</button>
```

- [ ] **Step 3: Atualizar buildSystemPrompt no AgentChat para Dr. Strange onisciente**

Em `src/components/AgentChat.tsx`, atualizar o bloco `if (agent === 'Dr. Strange')` (linha 222):

```typescript
if (agent === 'Dr. Strange') {
  return `${basePrompt} Você é Dr. Strange, o MESTRE SUPREMO ORQUESTRADOR do sistema Aurea Solaris.

ONISCIÊNCIA: Você tem visão MACRO de TUDO. Você vê o estado de todos os outros agentes (Rafiki, Alfred, Uncle Duck, Stark), suas atividades recentes e tarefas em andamento.

PODERES DE ORQUESTRAÇÃO:
- Você pode DELEGAR tarefas para outros agentes usando o formato: [DELEGAR: agente_alvo] descrição da tarefa
- Você pode COORDENAR fluxos entre agentes
- Você pode RECOMENDAR qual agente o usuário deve consultar para cada necessidade
- Você MONITORA o progresso de tudo

AGENTES DISPONÍVEIS:
- Rafiki: Astrólogo técnico. Dados astrológicos precisos, mapas, aspectos.
- Alfred: Mordomo de produtividade. Tarefas, agenda, organização.
- Uncle Duck: Consultor financeiro. Finanças, metas, economia.
- Stark: Monitor técnico. Sistema, logs, performance, código.

Seu estilo: Sábio, conciso, místico, proativo. Conecte padrões entre dados. Quando apropriado, sugira ações concretas ou delegue para o agente mais adequado.

${context}`;
}
```

- [ ] **Step 4: Verificar que Dr. Strange usa o sistema de sessões correto**

No AgentChat, o agente `"Dr. Strange"` agora usará:
- `save_history` com `agent: "Dr. Strange"` (não `"Strange"`)
- Sistema de sessões com `chat_id` gerado
- Contexto completo via `buildAgentContext()`

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Dashboard de Agentes para Dr. Strange

**Files:**
- Create: `src/components/AgentStatusCard.tsx`
- Create: `src/components/StrangeDashboard.tsx`
- Modify: `src/components/AgentChat.tsx` (integrar dashboard)

- [ ] **Step 1: Criar AgentStatusCard**

```typescript
// src/components/AgentStatusCard.tsx
import { AgentState } from '../types/agent';
import { MessageSquare, Clock, Activity } from 'lucide-react';

interface AgentStatusCardProps {
  agent: AgentState;
  isActive: boolean;
}

export const AgentStatusCard = ({ agent, isActive }: AgentStatusCardProps) => {
  const statusColors = {
    idle: 'bg-gray-200',
    active: 'bg-emerald-500',
    busy: 'bg-amber-500',
    error: 'bg-red-500',
  };

  const agentIcons: Record<string, string> = {
    'Dr. Strange': '👁️',
    'Rafiki': '🦁',
    'Alfred': '🎩',
    'Uncle Duck': '🦆',
    'Stark': '⚙️',
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
      isActive ? 'border-gold/30 bg-gold/5' : 'border-gray-100 bg-white'
    }`}>
      <div className="text-lg">{agentIcons[agent.name] || '🤖'}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-700 truncate">{agent.name}</p>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[agent.status]}`} />
          <span className="text-[8px] text-gray-400 uppercase tracking-wider">{agent.status}</span>
        </div>
      </div>
      {agent.currentTask && (
        <div className="flex items-center gap-1 text-[8px] text-gold/60">
          <Activity size={8} />
          <span className="truncate max-w-[60px]">{agent.currentTask}</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Criar StrangeDashboard**

```typescript
// src/components/StrangeDashboard.tsx
import { useAgentContext } from '../context/AgentContext';
import { AgentStatusCard } from './AgentStatusCard';
import { useAgendaContext } from '../context/AgendaContext';
import { useFinancas } from '../context/FinancasContext';
import { Activity, Zap, Clock, AlertTriangle } from 'lucide-react';

export const StrangeDashboard = () => {
  const { agents, delegatedTasks, events } = useAgentContext();
  const { tasks } = useAgendaContext();
  const { stats } = useFinancas();

  const activeAgents = Object.values(agents).filter(a => a.status !== 'idle');
  const pendingDelegations = delegatedTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const recentEvents = events.slice(0, 5);

  return (
    <div className="p-3 space-y-3">
      {/* Status dos Agentes */}
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold/60 mb-2">Agentes</p>
        <div className="space-y-1.5">
          {Object.values(agents).filter(a => a.name !== 'Dr. Strange').map(agent => (
            <AgentStatusCard
              key={agent.name}
              agent={agent}
              isActive={agent.status !== 'idle'}
            />
          ))}
        </div>
      </div>

      {/* Tarefas Delegadas */}
      {pendingDelegations.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold/60 mb-2">
            <Zap size={8} className="inline mr-1" />
            Delegações Ativas
          </p>
          <div className="space-y-1">
            {pendingDelegations.map(task => (
              <div key={task.id} className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[9px] text-gray-600 truncate">{task.description}</p>
                <p className="text-[7px] text-amber-500 mt-0.5">→ {task.assignedTo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo Rápido */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-white rounded-lg border border-gray-100">
          <p className="text-[7px] text-gray-400 uppercase">Tarefas</p>
          <p className="text-[12px] font-bold text-gray-700">{tasks.filter(t => !t.completed && !t.is_completed).length} pendentes</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-gray-100">
          <p className="text-[7px] text-gray-400 uppercase">Saldo</p>
          <p className="text-[12px] font-bold text-gray-700">R$ {stats.balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Eventos Recentes */}
      {recentEvents.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold/60 mb-1.5">
            <Activity size={8} className="inline mr-1" />
            Eventos
          </p>
          <div className="space-y-1">
            {recentEvents.map(evt => (
              <div key={evt.id} className="text-[8px] text-gray-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-gold/40" />
                <span className="truncate">{evt.source}: {evt.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Integrar dashboard no AgentChat quando agente é Dr. Strange**

No `AgentChat.tsx`, adicionar o dashboard acima das mensagens quando o agente é Dr. Strange:

```tsx
// src/components/AgentChat.tsx - dentro do return, antes das mensagens
import { StrangeDashboard } from './StrangeDashboard';

// Dentro do container de mensagens:
{agent === 'Dr. Strange' && messages.length === 0 && <StrangeDashboard />}
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 4: Sistema de Delegação entre Agentes

**Files:**
- Create: `src/components/DelegationPanel.tsx`
- Modify: `src/components/AgentChat.tsx` (detectar comandos de delegação)
- Modify: `src/context/AgentContext.tsx` (já criado na Task 1)

- [ ] **Step 1: Criar DelegationPanel**

```typescript
// src/components/DelegationPanel.tsx
import { useState } from 'react';
import { useAgentContext } from '../context/AgentContext';
import { AgentName } from '../types/agent';
import { Send, User } from 'lucide-react';

interface DelegationPanelProps {
  onDelegate: (agent: AgentName, task: string) => void;
}

export const DelegationPanel = ({ onDelegate }: DelegationPanelProps) => {
  const { agents } = useAgentContext();
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('Rafiki');
  const [taskDescription, setTaskDescription] = useState('');

  const availableAgents: { name: AgentName; icon: string; desc: string }[] = [
    { name: 'Rafiki', icon: '🦁', desc: 'Astrologia' },
    { name: 'Alfred', icon: '🎩', desc: 'Produtividade' },
    { name: 'Uncle Duck', icon: '🦆', desc: 'Finanças' },
    { name: 'Stark', icon: '⚙️', desc: 'Sistema' },
  ];

  const handleDelegate = () => {
    if (!taskDescription.trim()) return;
    onDelegate(selectedAgent, taskDescription);
    setTaskDescription('');
  };

  return (
    <div className="p-3 border-t border-gold/10 bg-[#FCF9F1]/50">
      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold/60 mb-2">Delegar Tarefa</p>
      <div className="flex gap-1.5 mb-2">
        {availableAgents.map(a => (
          <button
            key={a.name}
            onClick={() => setSelectedAgent(a.name)}
            className={`flex-1 p-1.5 rounded-lg border text-center transition-all ${
              selectedAgent === a.name
                ? 'border-gold/30 bg-gold/10'
                : 'border-gray-100 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-sm">{a.icon}</span>
            <p className="text-[7px] text-gray-500 mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={taskDescription}
          onChange={e => setTaskDescription(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDelegate()}
          placeholder="Descrever tarefa..."
          className="flex-1 bg-white border border-gray-100 rounded-lg px-3 py-2 text-[10px] placeholder:text-gray-300 focus:outline-none focus:border-gold/30"
        />
        <button
          onClick={handleDelegate}
          disabled={!taskDescription.trim()}
          className="p-2 bg-[#c5a059] text-white rounded-lg hover:bg-[#b8924d] transition-all disabled:opacity-30"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Detectar comandos de delegação nas respostas do Dr. Strange**

No `AgentChat.tsx`, após receber resposta da IA, verificar se contém padrão de delegação:

```typescript
// src/components/AgentChat.tsx - dentro do sendMessage, após receber response
import { useAgentContext } from '../context/AgentContext';

// Dentro do componente AgentChat:
const { delegateTask, emitEvent, updateAgentStatus } = useAgentContext();

// Após setMessages com a resposta:
if (agent === 'Dr. Strange' && response) {
  // Detectar padrão [DELEGAR: agente] descrição
  const delegationMatch = response.match(/\[DELEGAR:\s*(Rafiki|Alfred|Uncle Duck|Stark)\]\s*(.+?)(?:\n|$)/i);
  if (delegationMatch) {
    const targetAgent = delegationMatch[1] as AgentName;
    const taskDesc = delegationMatch[2].trim();
    delegateTask({
      description: taskDesc,
      assignedTo: targetAgent,
      assignedBy: 'Dr. Strange',
    });
    updateAgentStatus(targetAgent, { status: 'busy', currentTask: taskDesc });
    emitEvent({
      type: 'task_delegated',
      source: 'Dr. Strange',
      target: targetAgent,
      payload: { task: taskDesc },
    });
  }
}
```

- [ ] **Step 3: Integrar DelegationPanel no AgentChat para Dr. Strange**

```tsx
// src/components/AgentChat.tsx - no return, antes do input
{agent === 'Dr. Strange' && (
  <DelegationPanel
    onDelegate={(targetAgent, task) => {
      delegateTask({
        description: task,
        assignedTo: targetAgent,
        assignedBy: 'Dr. Strange',
      });
    }}
  />
)}
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 5: Comandos Tauri para Orquestração

**Files:**
- Modify: `src-tauri/src/lib.rs` (adicionar comandos)
- Modify: `src/utils/tauri.ts` (adicionar mocks)

- [ ] **Step 1: Adicionar comando `get_agent_status` no Rust**

```rust
// src-tauri/src/lib.rs

#[tauri::command]
fn get_agent_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let mem_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("memory");

    let agents = serde_json::json!({
        "Dr. Strange": {
            "name": "Dr. Strange",
            "status": "active",
            "sessions": count_sessions(&mem_dir, "Dr. Strange"),
            "lastActivity": get_last_activity(&mem_dir, "Dr. Strange")
        },
        "Rafiki": {
            "name": "Rafiki",
            "status": "idle",
            "sessions": count_sessions(&mem_dir, "Rafiki"),
            "lastActivity": get_last_activity(&mem_dir, "Rafiki")
        },
        "Alfred": {
            "name": "Alfred",
            "status": "idle",
            "sessions": count_sessions(&mem_dir, "Alfred"),
            "lastActivity": get_last_activity(&mem_dir, "Alfred")
        },
        "Uncle Duck": {
            "name": "Uncle Duck",
            "status": "idle",
            "sessions": count_sessions(&mem_dir, "Uncle Duck"),
            "lastActivity": get_last_activity(&mem_dir, "Uncle Duck")
        },
        "Stark": {
            "name": "Stark",
            "status": "idle",
            "sessions": count_sessions(&mem_dir, "Stark"),
            "lastActivity": get_last_activity(&mem_dir, "Stark")
        }
    });

    Ok(agents)
}

fn count_sessions(mem_dir: &Path, agent: &str) -> usize {
    if !mem_dir.exists() { return 0; }
    let prefix = format!("{}_", agent);
    fs::read_dir(mem_dir)
        .map(|entries| entries.filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(&prefix))
            .count())
        .unwrap_or(0)
}

fn get_last_activity(mem_dir: &Path, agent: &str) -> Option<String> {
    if !mem_dir.exists() { return None; }
    let filename = format!("{}.json", agent);
    let path = mem_dir.join(&filename);
    if !path.exists() { return None; }
    path.metadata().ok()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            chrono::DateTime::<chrono::Local>::from(t)
                .format("%d/%m %H:%M").to_string()
        })
}
```

- [ ] **Step 2: Adicionar comando `get_all_chat_summaries` no Rust**

```rust
// src-tauri/src/lib.rs

#[tauri::command]
fn get_all_chat_summaries(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let agents = vec!["Dr. Strange", "Rafiki", "Alfred", "Uncle Duck", "Stark"];
    let mut all_summaries = vec![];

    for agent in agents {
        let sessions = list_chat_sessions(app.clone(), agent.to_string())?;
        for session in sessions {
            all_summaries.push(session);
        }
    }

    all_summaries.sort_by(|a, b| b["date"].as_str().unwrap_or("").cmp(a["date"].as_str().unwrap_or("")));
    Ok(all_summaries)
}
```

- [ ] **Step 3: Registrar novos comandos no invoke_handler**

```rust
// src-tauri/src/lib.rs - linha ~721
.invoke_handler(tauri::generate_handler![
    openrouter_chat,
    ollama_chat,
    save_history,
    load_history,
    list_chat_sessions,
    delete_chat_session,
    get_todoist_tasks,
    add_todoist_task,
    delete_todoist_task,
    toggle_todoist_task,
    postpone_todoist_task,
    add_google_event,
    delete_google_event,
    send_telegram_message,
    save_board,
    load_board,
    get_sys_info,
    save_asset,
    archive_chat,
    restore_chat,
    list_archived_chats,
    load_archived_chat,
    get_total_tokens,
    read_text_file,
    run_astro_engine,
    list_lab_files,
    run_agm_engine,
    get_google_events,
    get_agent_status,        // NOVO
    get_all_chat_summaries,  // NOVO
])
```

- [ ] **Step 4: Adicionar mocks no tauri.ts**

```typescript
// src/utils/tauri.ts - dentro do handleCommand switch
case 'get_agent_status':
  return {
    'Dr. Strange': { name: 'Dr. Strange', status: 'active', sessions: 3, lastActivity: 'há 5 min' },
    'Rafiki': { name: 'Rafiki', status: 'idle', sessions: 2, lastActivity: 'há 12 min' },
    'Alfred': { name: 'Alfred', status: 'idle', sessions: 4, lastActivity: 'há 8 min' },
    'Uncle Duck': { name: 'Uncle Duck', status: 'idle', sessions: 1, lastActivity: 'há 20 min' },
    'Stark': { name: 'Stark', status: 'idle', sessions: 1, lastActivity: 'há 15 min' },
  } as T;

case 'get_all_chat_summaries':
  return [
    { chatId: 'mock_1', agent: 'Dr. Strange', date: '25/03 14:30', messageCount: 8, preview: 'Visão macro do dia' },
    { chatId: 'mock_2', agent: 'Rafiki', date: '25/03 14:25', messageCount: 4, preview: 'Trânsitos de Netuno' },
    { chatId: 'mock_3', agent: 'Alfred', date: '25/03 14:20', messageCount: 6, preview: 'Priorizar tarefas' },
  ] as T;
```

- [ ] **Step 5: Verificar compilação Rust + TypeScript**

Run: `npx tsc --noEmit` e verificar que `cargo build` compila

---

### Task 6: Atualizar Contexto do Dr. Strange com Onisciência

**Files:**
- Modify: `src/components/AgentChat.tsx` (enriquecer buildAgentContext para Dr. Strange)

- [ ] **Step 1: Estender buildAgentContext para incluir estado de outros agentes**

No `AgentChat.tsx`, quando o agente é Dr. Strange, adicionar seção de onisciência:

```typescript
// src/components/AgentChat.tsx - dentro de buildAgentContext
const { agents, delegatedTasks, events } = useAgentContext();

// Após o contexto padrão, adicionar seção de orquestração se for Dr. Strange:
const buildOrchestrationContext = () => {
  if (agent !== 'Dr. Strange') return '';

  const agentStatuses = Object.values(agents)
    .filter(a => a.name !== 'Dr. Strange')
    .map(a => `- ${a.name}: ${a.status}${a.currentTask ? ` (${a.currentTask})` : ''}`)
    .join('\n');

  const pendingTasks = delegatedTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .map(t => `- ${t.description} → ${t.assignedTo} [${t.status}]`)
    .join('\n') || '- Nenhuma delegação ativa';

  const recentEvents = events
    .slice(0, 5)
    .map(e => `- ${e.timestamp.split('T')[1]?.split('.')[0]} | ${e.source}: ${e.type}`)
    .join('\n') || '- Nenhum evento recente';

  return `
--- STATUS DOS AGENTES ---
${agentStatuses}

--- TAREFAS DELEGADAS ---
${pendingTasks}

--- EVENTOS RECENTES ---
${recentEvents}
`;
};
```

- [ ] **Step 2: Incluir contexto de orquestração no system prompt do Dr. Strange**

Atualizar o bloco `if (agent === 'Dr. Strange')` em `buildSystemPrompt`:

```typescript
if (agent === 'Dr. Strange') {
  const orchContext = buildOrchestrationContext();
  return `${basePrompt} Você é Dr. Strange, o MESTRE SUPREMO ORQUESTRADOR do sistema Aurea Solaris.

ONISCIÊNCIA: Você tem visão MACRO de TUDO. Você vê o estado de todos os outros agentes, suas atividades e tarefas em andamento.

PODERES:
- DELEGAR: Use [DELEGAR: NomeDoAgente] descrição para delegar tarefas
- COORDENAR: Sugira fluxos entre agentes
- RECOMENDAR: Indique qual agente consultar para cada necessidade
- MONITORAR: Acompanhe progresso de tudo

AGENTES: Rafiki (Astrologia), Alfred (Produtividade), Uncle Duck (Finanças), Stark (Sistema)

${context}${orchContext}`;
}
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 7: Limpeza Final e Documentação

**Files:**
- Modify: `src/App.tsx` (limpar imports não usados)
- Modify: `docs/arquitetura.md` (atualizar seção de agentes)

- [ ] **Step 1: Limpar imports não usados em App.tsx após remoção do Strange inline**

Remover imports que eram usados apenas pelo Dr. Strange inline:
- `Eye` de lucide-react (se não usado em outro lugar — verificar)
- Manter `Sparkles` e `X` se usados em outro lugar

- [ ] **Step 2: Atualizar docs/arquitetura.md**

Atualizar seção 2.1 (Dr. Strange):

```markdown
### 2.1. Dr. Strange (Orquestrador Onisciente)
- **Escopo:** Global (via chat lateral + dashboard de orquestração)
- **Função:** Orquestrador mestre que vê e coordena todos os outros agentes. Acesso ao estado compartilhado, sistema de eventos e delegação de tarefas.
- **Personalidade:** Sábio, conciso, místico, proativo. Conecta padrões entre dados de todos os módulos.
- **Poderes:** Delegação de tarefas, monitoramento de agentes, visão macro do sistema.
- **Modelo Padrão:** `google/gemini-2.0-pro-exp-02-05`
- **Arquitetura:** Usa `AgentContext` para onisciência, `AgentChat.tsx` para comunicação, `StrangeDashboard.tsx` para visão geral.
```

- [ ] **Step 3: Verificação final de compilação**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/agent.ts src/context/AgentContext.tsx src/components/AgentStatusCard.tsx src/components/StrangeDashboard.tsx src/components/DelegationPanel.tsx src/components/AgentChat.tsx src/App.tsx src/utils/tauri.ts src-tauri/src/lib.rs docs/arquitetura.md
git commit -m "feat: transform Dr. Strange into omniscient orchestrator

- Migrate from inline App.tsx to AgentChat.tsx with session management
- Add AgentContext with EventBus for inter-agent communication
- Create StrangeDashboard for agent overview
- Add delegation system for task coordination
- Add Tauri commands: get_agent_status, get_all_chat_summaries
- Fix fragmented history (unified 'Dr. Strange' agent name)"
```

---

## Resumo de Dependências

```
Task 1 (Tipos + Context) ← PRIMEIRO (base para tudo)
  ↓
Task 2 (Migrar Strange) ← depende de Task 1
  ↓
Task 3 (Dashboard) ← depende de Task 1
  ↓
Task 4 (Delegação) ← depende de Task 1 + Task 3
  ↓
Task 5 (Comandos Tauri) ← independente, pode rodar em paralelo com Task 2-4
  ↓
Task 6 (Onisciência) ← depende de Task 1 + Task 2
  ↓
Task 7 (Limpeza) ← depende de todas as anteriores
```

**Ordem recomendada para execução paralela:**
- Grupo A: Task 1 (sequencial)
- Grupo B: Task 2 + Task 3 + Task 5 (paralelas após Task 1)
- Grupo C: Task 4 + Task 6 (após Task 2 e 3)
- Grupo D: Task 7 (final)

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Dr. Strange usa sessões | ❌ `chat_id: null` | ✅ Sistema de sessões |
| Histórico fragmentado | ❌ "Strange" vs "Dr. Strange" | ✅ Unificado |
| Vê estado de outros agentes | ❌ | ✅ via AgentContext |
| Pode delegar tarefas | ❌ | ✅ via DelegationPanel |
| Dashboard de orquestração | ❌ | ✅ StrangeDashboard |
| Comandos Tauri de orquestração | ❌ | ✅ get_agent_status, get_all_chat_summaries |

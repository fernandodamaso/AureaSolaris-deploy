# Implementation Plan: Aurea Solaris Project Structure Refactor

## Goal

Refactor the Aurea Solaris codebase to improve organization, maintainability, and AI-agent discoverability while maintaining backward compatibility with existing functionality.

## Scope

### In Scope
- Frontend TypeScript/React refactoring (types, services, constants, utils)
- Single Rust bug fix for `log_usage` compilation error
- Documentation updates for each change
- Barrel exports for cleaner imports

### Out of Scope
- Full Rust backend module splitting (deferred to future phase)
- State management overhaul (Zustand, React Query)
- New feature development
- UI/UX changes

## Technical Constraints
- **Framework:** Tauri 2.0 + React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (existing classes preserved)
- **Language:** Portuguese (BR) for UI text
- **Pattern:** Use existing `safeInvoke` wrapper for IPC
- **Backward Compatibility:** All existing chat history JSON files in `memory/` must remain loadable without migration

---

## Phase 0: Bug Fixes (PREREQUISITE)

> **Objective:** Fix compilation-blocking bugs before refactoring begins.

### Tasks

| # | Task | File(s) | Dependencies | Reviewer |
|---|------|---------|--------------|----------|
| 0.1 | Fix `log_usage` missing `app` parameter in `openrouter_chat` | `src-tauri/src/lib.rs` | None | Type check passes |

**Task 0.1 Details:**
- Current bug: `openrouter_chat` calls `log_usage(&app, usage.total_tokens)` but function signature is `async fn openrouter_chat(model: String, messages: Vec<OpenRouterMessage>)` (no `app` parameter)
- Fix: Add `app: tauri::AppHandle` as first parameter to `openrouter_chat`
- File: `src-tauri/src/lib.rs`, line ~130

### Phase 0 Completion Gate
- [ ] `cargo check` passes in `src-tauri/`
- [ ] User confirms existing chat functionality still works
- [ ] Documentation updated in `docs/arquitetura.md`

---

## Phase 1: Type Foundation

> **Objective:** Create shared TypeScript interfaces for type safety and AI-agent discoverability.

### Tasks

| # | Task | File(s) | Dependencies | Reviewer |
|---|------|---------|--------------|----------|
| 1.1 | Create `src/types/` directory | New directory | None | Directory exists |
| 1.2 | Define `AgentConfig` interface | `src/types/agents.ts` | 1.1 | TypeScript compiles |
| 1.3 | Define `ChatMessage` interface | `src/types/chat.ts` | 1.1 | TypeScript compiles |
| 1.4 | Define `AstroData` interfaces | `src/types/astrology.ts` | 1.1 | TypeScript compiles |
| 1.5 | Define `SystemInfo` interface | `src/types/system.ts` | 1.1 | TypeScript compiles |
| 1.6 | Create barrel export | `src/types/index.ts` | 1.2-1.5 | All types importable |

**Types to Create:**

```typescript
// src/types/agents.ts
export interface AgentConfig {
  model?: string;
  personality?: string;
  functionalities?: string;
}

export interface AgentPersona {
  name: string;
  defaultModel: string;
  systemPrompt: string;
  color: string;
}

// src/types/chat.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatHistory {
  agent: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

// src/types/astrology.ts
export interface PlanetPosition {
  degree: number;
  sign: string;
  pos_in_sign: number;
  element: string;
  house: number | string | null;
  retrograde: boolean;
}

export interface NatalChart {
  [planet: string]: PlanetPosition | number[] | undefined;
  Sun?: PlanetPosition;
  Moon?: PlanetPosition;
  Mercury?: PlanetPosition;
  Venus?: PlanetPosition;
  Mars?: PlanetPosition;
  Jupiter?: PlanetPosition;
  Saturn?: PlanetPosition;
  Uranus?: PlanetPosition;
  Neptune?: PlanetPosition;
  Pluto?: PlanetPosition;
  Chiron?: PlanetPosition;
  'North Node'?: PlanetPosition;
  Houses?: number[];
}

// src/types/system.ts
export interface SystemInfo {
  cpu_load: string;
  ram_usage: string;
  disk_free: string;
}
```

### Phase 1 Completion Gate
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All types are documented with JSDoc comments
- [ ] Documentation updated in `docs/estrutura-do-projeto.md`

---

## Phase 2: Constants

> **Objective:** Centralize magic strings and agent configurations.

### Tasks

| # | Task | File(s) | Dependencies | Reviewer |
|---|------|---------|--------------|----------|
| 2.1 | Create `src/constants/` directory | New directory | None | Directory exists |
| 2.2 | Create agent models map | `src/constants/agents.ts` | 1.6 | Imports from types |
| 2.3 | Create agent personas config | `src/constants/agents.ts` | 2.2 | Same file |
| 2.4 | Create UI color constants | `src/constants/ui.ts` | 2.1 | TypeScript compiles |
| 2.5 | Create barrel export | `src/constants/index.ts` | 2.2-2.4 | All constants importable |

**Constants to Create:**

```typescript
// src/constants/agents.ts
import { AgentPersona } from '../types';

export const AGENT_MODELS: Record<string, string> = {
  'Dr. Strange': 'google/gemini-2.0-pro-exp-02-05',
  'Alfred': 'openai/gpt-4o-mini',
  'Uncle Duck': 'openai/gpt-4o-mini',
  'Rafiki': 'openai/gpt-4o-mini',
  'Stark': 'anthropic/claude-3.5-sonnet',
};

export const AGENT_PERSONAS: Record<string, AgentPersona> = {
  'Dr. Strange': {
    name: 'Dr. Strange',
    defaultModel: 'google/gemini-2.0-pro-exp-02-05',
    systemPrompt: 'Você é Dr. Strange, um astrólogo sábio e conciso. Conecte padrões entre astros e cotidiano.',
    color: '#9333ea',
  },
  'Alfred': {
    name: 'Alfred',
    defaultModel: 'openai/gpt-4o-mini',
    systemPrompt: 'Você é Alfred, consultor de produtividade. Seja direto e impecável.',
    color: '#B8860B',
  },
  'Uncle Duck': {
    name: 'Uncle Duck',
    defaultModel: 'openai/gpt-4o-mini',
    systemPrompt: 'Você é Uncle Duck, consultor financeiro. Responda de forma objetiva sobre finanças.',
    color: '#eab308',
  },
  'Rafiki': {
    name: 'Rafiki',
    defaultModel: 'openai/gpt-4o-mini',
    systemPrompt: 'Você é Rafiki, um astrólogo místico e sábio. Seja poético.',
    color: '#22c55e',
  },
  'Stark': {
    name: 'Stark',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    systemPrompt: 'Você é Dr. Stark, IA técnica e sarcástica.',
    color: '#ef4444',
  },
};

// src/constants/ui.ts
export const UI_COLORS = {
  gold: '#B8860B',
  goldLight: '#FCF9F1',
  goldBorder: 'border-[#B8860B]/10',
  dark: '#333333',
} as const;
```

### Phase 2 Completion Gate
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No hardcoded model names remain in `AgentChat.tsx`
- [ ] Documentation updated in `docs/arquitetura.md` (agent personas section)

---

## Phase 3: Service Layer

> **Objective:** Extract business logic from components into testable service modules.

### Tasks

| # | Task | File(s) | Dependencies | Reviewer |
|---|------|---------|--------------|----------|
| 3.1 | Create `src/services/` directory | New directory | None | Directory exists |
| 3.2 | Create AI service | `src/services/ai.ts` | 2.6 | Imports work |
| 3.3 | Create astrology service | `src/services/astrology.ts` | 1.6 | Imports work |
| 3.4 | Create barrel export | `src/services/index.ts` | 3.2-3.3 | All services importable |
| 3.5 | Refactor `AgentChat.tsx` to use services | `src/components/AgentChat.tsx` | 3.2 | Functionality preserved |

**Services to Create:**

```typescript
// src/services/ai.ts
import { safeInvoke } from '../utils/tauri';
import { ChatMessage, AgentConfig } from '../types';
import { AGENT_MODELS, AGENT_PERSONAS } from '../constants/agents';

export function getAgentModel(agent: string, config?: AgentConfig | null): string {
  return config?.model || AGENT_MODELS[agent] || 'openai/gpt-4o-mini';
}

export function getAgentSystemPrompt(agent: string, config?: AgentConfig | null): string {
  if (config?.personality) {
    return `Você é ${agent}. Sua personalidade: ${config.personality}. Suas funcionalidades: ${config.functionalities || 'N/A'}.`;
  }
  return AGENT_PERSONAS[agent]?.systemPrompt || `Você é ${agent} no sistema Aurea Solaris.`;
}

export function getLocalAgentConfig(agent: string): AgentConfig | null {
  try {
    const saved = localStorage.getItem(`agent_config_${agent}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function sendMessage(
  agent: string,
  messages: ChatMessage[]
): Promise<string | null> {
  const config = getLocalAgentConfig(agent);
  
  // Uncle Duck: Try Ollama first, fallback to OpenRouter
  if (agent === 'Uncle Duck' && !config) {
    const ollamaRes = await safeInvoke<string>('ollama_chat', {
      messages: [{ role: 'system', content: AGENT_PERSONAS['Uncle Duck'].systemPrompt }, ...messages]
    });
    if (ollamaRes) return ollamaRes;
    
    // Fallback to OpenRouter
    return safeInvoke<string>('openrouter_chat', {
      model: AGENT_MODELS['Uncle Duck'],
      messages: [{ role: 'system', content: AGENT_PERSONAS['Uncle Duck'].systemPrompt + ' O sistema local falhou, fallback para nuvem.' }, ...messages]
    });
  }
  
  // Default: OpenRouter
  const model = getAgentModel(agent, config);
  const systemPrompt = getAgentSystemPrompt(agent, config);
  
  return safeInvoke<string>('openrouter_chat', {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages]
  });
}

// src/services/astrology.ts
import { safeInvoke } from '../utils/tauri';
import { NatalChart } from '../types';

export interface AstroRequest {
  type?: 'positions' | 'agenda';
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
}

export async function calculateNatalChart(params: AstroRequest): Promise<NatalChart | null> {
  return safeInvoke<NatalChart>('run_astro_engine', { payload: JSON.stringify(params) });
}

export async function getAgendaData(params: AstroRequest): Promise<any | null> {
  return safeInvoke('run_astro_engine', { payload: JSON.stringify({ ...params, type: 'agenda' }) });
}
```

### Phase 3 Completion Gate
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `AgentChat.tsx` is simplified (no inline persona/model logic)
- [ ] Manual test: Chat with each agent still works
- [ ] Documentation updated in `docs/estrutura-do-projeto.md`

---

## Phase 4: Utils & Barrel Exports

> **Objective:** Standardize error handling and clean up imports.

### Tasks

| # | Task | File(s) | Dependencies | Reviewer |
|---|------|---------|--------------|----------|
| 4.1 | Create error utility | `src/utils/errors.ts` | 1.6 | TypeScript compiles |
| 4.2 | Add barrel export to `src/components/` | `src/components/index.ts` | None | Imports work |
| 4.3 | Add barrel export to `src/hooks/` | `src/hooks/index.ts` | None | Imports work |
| 4.4 | Update imports in `App.tsx` | `src/App.tsx` | 4.2-4.3 | App still works |

**Error Utility:**

```typescript
// src/utils/errors.ts
export type ErrorCategory = 'NETWORK' | 'AUTH' | 'VALIDATION' | 'SYSTEM' | 'UNKNOWN';

export interface AppError {
  category: ErrorCategory;
  message: string;
  details?: string;
  timestamp: number;
}

export function createError(category: ErrorCategory, message: string, details?: string): AppError {
  return {
    category,
    message,
    details,
    timestamp: Date.now(),
  };
}

export function getUserFriendlyMessage(error: AppError | string): string {
  if (typeof error === 'string') return error;
  
  const messages: Record<ErrorCategory, string> = {
    NETWORK: 'Erro de conexão. Verifique sua internet.',
    AUTH: 'Erro de autenticação. Verifique suas credenciais.',
    VALIDATION: 'Dados inválidos. Verifique os campos.',
    SYSTEM: 'Erro interno do sistema.',
    UNKNOWN: 'Erro desconhecido.',
  };
  
  return messages[error.category] || error.message;
}
```

### Phase 4 Completion Gate
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Manual test: All views render correctly
- [ ] Documentation updated in `docs/estrutura-do-projeto.md`

---

## Documentation Updates Required

Per AGENTS.md rules, update docs with each change:

| Phase | Document | Changes |
|-------|----------|---------|
| 0 | `docs/arquitetura.md` | Note bug fix in `openrouter_chat` signature |
| 1 | `docs/estrutura-do-projeto.md` | Add `src/types/` to directory tree |
| 2 | `docs/arquitetura.md` | Update agent personas section with centralized config |
| 3 | `docs/estrutura-do-projeto.md` | Add `src/services/` to directory tree |
| 4 | `docs/estrutura-do-projeto.md` | Update import examples |

---

## File Manifest

### New Files
| File | Purpose |
|------|---------|
| `src/types/agents.ts` | Agent configuration interfaces |
| `src/types/chat.ts` | Chat message and history interfaces |
| `src/types/astrology.ts` | Astrology data interfaces |
| `src/types/system.ts` | System info interface |
| `src/types/index.ts` | Barrel export for types |
| `src/constants/agents.ts` | Agent models and personas |
| `src/constants/ui.ts` | UI color constants |
| `src/constants/index.ts` | Barrel export for constants |
| `src/services/ai.ts` | AI chat service layer |
| `src/services/astrology.ts` | Astrology calculation service |
| `src/services/index.ts` | Barrel export for services |
| `src/utils/errors.ts` | Error types and utilities |
| `src/components/index.ts` | Barrel export for components |
| `src/hooks/index.ts` | Barrel export for hooks |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/lib.rs` | Add `app: tauri::AppHandle` param to `openrouter_chat` |
| `src/components/AgentChat.tsx` | Use services instead of inline logic |
| `src/App.tsx` | Update imports if using barrel exports |
| `docs/arquitetura.md` | Update sections per table above |
| `docs/estrutura-do-projeto.md` | Add new directories to tree |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing chat functionality | Manual test each agent after Phase 3 |
| Type mismatches with runtime data | Use `unknown` with runtime validation for API responses |
| Import path confusion during refactor | Complete each phase before starting next |
| localStorage schema changes | No schema changes - only add new optional fields |

---

## Execution Order

```
Phase 0 (Bug Fix)
    ↓
Phase 1 (Types)
    ↓
Phase 2 (Constants)
    ↓
Phase 3 (Services + AgentChat refactor)
    ↓
Phase 4 (Utils + Barrel exports)
    ↓
Documentation sweep
```

**Parallel Execution Allowed:**
- Within each phase, tasks marked as parallel (no dependencies) can run concurrently
- Phase 1 tasks 1.2-1.5 can run in parallel
- Phase 2 tasks 2.2-2.4 can run in parallel

---

## Reviewer Requirements

| Phase | Reviewer | Context | Action |
|-------|----------|---------|--------|
| 0 | User (Viviane) | cargo check output | Confirm compilation |
| 1 | User | tsc output | Confirm no type errors |
| 2 | User | tsc output + manual test | Confirm models centralized |
| 3 | User | tsc output + manual chat test | Confirm chat works with each agent |
| 4 | User | npm run build output | Confirm full build succeeds |

---

## Open Questions (Deferred)

These are noted for future phases:
- Full Rust backend module splitting (Phase 5?)
- Error boundary React components
- API retry logic
- Configuration validation on startup

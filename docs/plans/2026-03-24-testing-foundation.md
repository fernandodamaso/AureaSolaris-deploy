# Testing Foundation & useSaude Hook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest testing infrastructure and write initial tests for the project's testable pure logic, establishing a foundation for future TDD.

**Architecture:** Install Vitest + jsdom for React component/hook testing. Write unit tests for pure functions (`mockData.ts`), the Tauri IPC mock layer (`tauri.ts`), and the standalone finance hook (`useFinancasData.ts`). Each test file mirrors the source structure under `src/__tests__/`.

**Tech Stack:** Vitest 3.x, jsdom, @testing-library/react (for hook tests), TypeScript

---

## Context & Discoveries

- `useSaudeData` hook **already exists** at `src/context/SaudeContext.tsx:121-124` — co-located with its context. No new file needed.
- `src/utils/tauri.ts` has a `handleCommand()` mock layer that returns data when not in Tauri — very testable.
- `src/utils/mockData.ts` exports `getMockResponse()` — a pure function with no side effects.
- `src/hooks/useFinancasData.ts` is a standalone hook with localStorage and state logic — good candidate for hook testing.
- `tsconfig.json` already has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- No test infrastructure exists at all — no vitest, no jest, no test runner configured.
- The project uses Vite 7 + React 19.1 + Tailwind CSS v4.

---

## File Structure

### Files to Create
| File | Responsibility |
|------|----------------|
| `vitest.config.ts` | Vitest configuration — extends Vite config, adds jsdom environment |
| `src/__tests__/utils/mockData.test.ts` | Tests for `getMockResponse()` pure function |
| `src/__tests__/utils/tauri.test.ts` | Tests for `safeInvoke()` mock mode and `handleCommand()` |
| `src/__tests__/hooks/useFinancasData.test.ts` | Tests for the finance hook state + localStorage logic |

### Files to Modify
| File | Change |
|------|--------|
| `package.json` | Add `vitest`, `jsdom`, `@testing-library/react` devDependencies; add `"test"` script |

---

## Task 1: Install Vitest and Configure

**Files:**
- Modify: `C:\AureaSolaris\package.json`
- Create: `C:\AureaSolaris\vitest.config.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest jsdom @testing-library/react
```

- [ ] **Step 2: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify Vitest runs**

```bash
npx vitest --version
```
Expected: prints version number (e.g., `3.x.x`)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest testing infrastructure"
```

---

## Task 2: Test mockData — Pure Function

**Files:**
- Create: `C:\AureaSolaris\src\__tests__\utils\mockData.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect } from 'vitest';
import { MOCK_ASTRO_DATA, MOCK_AGENT_RESPONSES, getMockResponse } from '../../utils/mockData';

describe('MOCK_ASTRO_DATA', () => {
  it('has all 10 planets', () => {
    const planets = Object.keys(MOCK_ASTRO_DATA.planets);
    expect(planets).toHaveLength(10);
    expect(planets).toContain('Sun');
    expect(planets).toContain('Moon');
    expect(planets).toContain('Pluto');
  });

  it('each planet has degree, sign, and retrograde', () => {
    for (const planet of Object.values(MOCK_ASTRO_DATA.planets)) {
      expect(planet).toHaveProperty('degree');
      expect(planet).toHaveProperty('sign');
      expect(planet).toHaveProperty('retrograde');
      expect(typeof planet.degree).toBe('number');
      expect(typeof planet.sign).toBe('string');
    }
  });

  it('has aspects with expected structure', () => {
    expect(MOCK_ASTRO_DATA.aspects.length).toBeGreaterThan(0);
    for (const aspect of MOCK_ASTRO_DATA.aspects) {
      expect(aspect).toHaveProperty('p1');
      expect(aspect).toHaveProperty('p2');
      expect(aspect).toHaveProperty('type');
      expect(aspect).toHaveProperty('orb');
    }
  });

  it('has 12 houses', () => {
    expect(MOCK_ASTRO_DATA.houses).toHaveLength(12);
  });
});

describe('getMockResponse', () => {
  it('returns a string for known agents', () => {
    for (const agent of ['Rafiki', 'Alfred', 'Uncle Duck', 'Stark', 'Dr. Strange']) {
      const response = getMockResponse(agent);
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }
  });

  it('falls back to Rafiki for unknown agents', () => {
    const response = getMockResponse('UnknownAgent');
    expect(MOCK_AGENT_RESPONSES['Rafiki']).toContain(response);
  });
});
```

- [ ] **Step 2: Run test and verify it passes**

```bash
npx vitest run src/__tests__/utils/mockData.test.ts
```
Expected: 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/utils/mockData.test.ts
git commit -m "test: add unit tests for mockData utilities"
```

---

## Task 3: Test safeInvoke — Tauri IPC Mock Layer

**Files:**
- Create: `C:\AureaSolaris\src\__tests__\utils\tauri.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeInvoke } from '../../utils/tauri';

// Mock @tauri-apps/api/core to simulate non-Tauri environment
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('safeInvoke (browser/mock mode)', () => {
  beforeEach(() => {
    // Ensure we're not in Tauri mode
    // @ts-expect-error - clearing Tauri internals
    delete window.__TAURI_INTERNALS__;
  });

  it('returns mock astro data for run_astro_engine', async () => {
    const result = await safeInvoke<string>('run_astro_engine', {});
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed).toHaveProperty('planets');
    expect(parsed).toHaveProperty('aspects');
  });

  it('returns mock agent response for openrouter_chat', async () => {
    const result = await safeInvoke<string>('openrouter_chat', {
      messages: [{ role: 'system', content: 'Você é Alfred.' }],
    });
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('returns mock agent response for ollama_chat', async () => {
    const result = await safeInvoke<string>('ollama_chat', {
      messages: [{ role: 'system', content: 'Você é Stark.' }],
    });
    expect(typeof result).toBe('string');
  });

  it('handles save_history and load_history via localStorage', async () => {
    await safeInvoke('save_history', {
      agent: 'test-agent',
      history: [{ role: 'user', content: 'hello' }],
      chat_id: 'test-1',
    });
    const loaded = await safeInvoke<any[]>('load_history', {
      agent: 'test-agent',
      chat_id: 'test-1',
    });
    expect(loaded).toHaveLength(1);
    expect(loaded![0].content).toBe('hello');
  });

  it('returns null for unknown commands', async () => {
    const result = await safeInvoke('nonexistent_command', {});
    expect(result).toBeNull();
  });

  it('returns mock todoist tasks', async () => {
    const result = await safeInvoke<string>('get_todoist_tasks', {});
    expect(result).not.toBeNull();
    const tasks = JSON.parse(result!);
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('returns mock google events', async () => {
    const result = await safeInvoke<string>('get_google_events', {});
    expect(result).not.toBeNull();
    const events = JSON.parse(result!);
    expect(Array.isArray(events)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test and verify it passes**

```bash
npx vitest run src/__tests__/utils/tauri.test.ts
```
Expected: 7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/utils/tauri.test.ts
git commit -m "test: add unit tests for safeInvoke Tauri IPC mock layer"
```

---

## Task 4: Test useFinancasData — Standalone Hook

**Files:**
- Create: `C:\AureaSolaris\src\__tests__\hooks\useFinancasData.test.ts`

- [ ] **Step 1: Install @testing-library/react if not already present**

Verify `@testing-library/react` was installed in Task 1. If not:
```bash
npm install -D @testing-library/react
```

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFinancasData } from '../../hooks/useFinancasData';

describe('useFinancasData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default transactions when localStorage is empty', () => {
    const { result } = renderHook(() => useFinancasData());
    expect(result.current.transactions.length).toBeGreaterThan(0);
  });

  it('calculates correct balance', () => {
    const { result } = renderHook(() => useFinancasData());
    const { incomes, expenses } = result.current.stats;
    expect(result.current.stats.balance).toBe(incomes - expenses);
  });

  it('adds a new transaction', () => {
    const { result } = renderHook(() => useFinancasData());
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.addTransaction({
        description: 'Teste',
        amount: 100,
        type: 'income',
        date: '2026-03-24',
        category: 'Teste',
      });
    });

    expect(result.current.transactions).toHaveLength(initialCount + 1);
    expect(result.current.transactions[0].description).toBe('Teste');
  });

  it('deletes a transaction', () => {
    const { result } = renderHook(() => useFinancasData());
    const idToDelete = result.current.transactions[0].id;
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.deleteTransaction(idToDelete);
    });

    expect(result.current.transactions).toHaveLength(initialCount - 1);
    expect(result.current.transactions.find(t => t.id === idToDelete)).toBeUndefined();
  });

  it('batch adds transactions', () => {
    const { result } = renderHook(() => useFinancasData());
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.batchAddTransactions([
        { description: 'Batch 1', amount: 50, type: 'expense', date: '2026-03-24', category: 'Teste' },
        { description: 'Batch 2', amount: 200, type: 'income', date: '2026-03-24', category: 'Teste' },
      ]);
    });

    expect(result.current.transactions).toHaveLength(initialCount + 2);
  });

  it('persists transactions to localStorage', () => {
    const { result } = renderHook(() => useFinancasData());

    act(() => {
      result.current.addTransaction({
        description: 'Persist Test',
        amount: 999,
        type: 'income',
        date: '2026-03-24',
        category: 'Teste',
      });
    });

    const stored = JSON.parse(localStorage.getItem('aurea_transactions')!);
    expect(stored[0].description).toBe('Persist Test');
  });

  it('updates goal current amount', () => {
    const { result } = renderHook(() => useFinancasData());
    const goalId = result.current.goals[0].id;

    act(() => {
      result.current.updateGoal(goalId, 99999);
    });

    const updatedGoal = result.current.goals.find(g => g.id === goalId);
    expect(updatedGoal!.current).toBe(99999);
  });
});
```

- [ ] **Step 3: Run test and verify it passes**

```bash
npx vitest run src/__tests__/hooks/useFinancasData.test.ts
```
Expected: 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/hooks/useFinancasData.test.ts
git commit -m "test: add unit tests for useFinancasData hook"
```

---

## Task 5: Run Full Test Suite and Verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: 20 tests PASS across 3 files, 0 failures

- [ ] **Step 2: Verify test script works**

```bash
npm run test
```
Expected: same output as Step 1

- [ ] **Step 3: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: verify full test suite passes"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `C:\AureaSolaris\docs\estrutura-do-projeto.md`
- Modify: `C:\AureaSolaris\AGENTS.md`
- Modify: `C:\AureaSolaris\README.md`

- [ ] **Step 1: Update estrutura-do-projeto.md**

Add to the tree diagram under `src/`:
```
├── __tests__/                  # 🧪 Testes automatizados (Vitest)
```

Add to the hooks section: document that `useSaudeData` is co-located inside `SaudeContext.tsx` (not a separate file).

Update the "Comandos Disponíveis" / scripts section to include `npm test`.

- [ ] **Step 2: Update README.md**

Add `npm test` and `npm run test:watch` to the Commands table.

- [ ] **Step 3: Update AGENTS.md**

Add testing note: "Run `npm test` before committing changes."

- [ ] **Step 4: Commit**

```bash
git add docs/estrutura-do-projeto.md AGENTS.md README.md
git commit -m "docs: add testing infrastructure and useSaudeData hook documentation"
```

---

## Verification

After all tasks:

```bash
npm test          # All 20+ tests pass
npm run lint      # No lint errors
npx tsc --noEmit  # TypeScript compiles cleanly
```

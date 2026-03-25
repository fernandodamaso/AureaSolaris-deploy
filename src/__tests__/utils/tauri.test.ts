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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeInvoke } from '../../utils/tauri';

// Mock @tauri-apps/api/core to simulate non-Tauri environment
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('safeInvoke (browser mode — no Tauri bridge)', () => {
  beforeEach(() => {
    // Ensure we're not in Tauri mode
    // @ts-expect-error - clearing Tauri internals
    delete window.__TAURI_INTERNALS__;
    // The browser bridge is an HTTP boundary. Keep this unit test independent
    // from a locally running Aurea server and assert its null-result contract.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: null }),
    }));
  });

  it('returns null for run_astro_engine to trigger real JS fallback', async () => {
    const result = await safeInvoke<string>('run_astro_engine', {});
    expect(result).toBeNull();
  });

  it('returns null for any command outside Tauri (callers handle real fallback)', async () => {
    const result = await safeInvoke('nonexistent_tauri_command', {});
    expect(result).toBeNull();
  });

  it('returns null for unknown commands', async () => {
    const result = await safeInvoke('nonexistent_command', {});
    expect(result).toBeNull();
  });
});

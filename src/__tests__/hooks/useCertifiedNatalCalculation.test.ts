import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCertifiedNatalCalculation } from '../../hooks/useCertifiedNatalCalculation';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../services/astrologyApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/astrologyApi')>('../../services/astrologyApi');
  return {
    ...actual,
    postNatalCalculation: vi.fn(),
    buildNatalPayload: vi.fn((birthData?: Record<string, unknown>) => JSON.stringify(birthData ?? { year: 2000 })),
  };
});

import { safeInvoke } from '../../utils/tauri';
import { buildNatalPayload, postNatalCalculation } from '../../services/astrologyApi';

const birthData = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14.5,
  lat: -23.55,
  lon: -46.63,
  house_system: 'Regiomontanus',
};

const makeCertifiedNatalResponse = () => ({
  planets: {
    Sun: { degree: 54.2, sign: 'Taurus' },
    Moon: { degree: 210.1, sign: 'Sco' },
    ASC: { degree: 12.4, sign: 'Ari' },
    MC: { degree: 281.7, sign: 'Cap' },
  },
  houses: Array.from({ length: 12 }, (_, index) => ({ degree: index * 30 })),
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2026-08-10T12:00:00Z', iana_timezone: 'UTC' },
    },
  },
});

describe('useCertifiedNatalCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeInvoke).mockResolvedValue(null);
  });

  it('requests natal transport with the birth payload and returns certified data', async () => {
    const certified = makeCertifiedNatalResponse();
    const payload = JSON.stringify(birthData);
    vi.mocked(buildNatalPayload).mockReturnValue(payload);
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(buildNatalPayload).toHaveBeenCalledWith(birthData);
    expect(postNatalCalculation).toHaveBeenCalledWith(payload);
    expect(result.current.data).toEqual(certified);
    expect(result.current.error).toBeNull();
    expect(safeInvoke).not.toHaveBeenCalled();
  });

  it('falls back to Tauri only after HTTP transport returns null', async () => {
    const certified = makeCertifiedNatalResponse();
    const payload = JSON.stringify(birthData);
    vi.mocked(buildNatalPayload).mockReturnValue(payload);
    vi.mocked(postNatalCalculation).mockResolvedValue(null);
    vi.mocked(safeInvoke).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(safeInvoke).toHaveBeenCalledWith('run_astro_engine', { payload });
    expect(result.current.data).toEqual(certified);
  });

  it('surfaces engine unavailability without estimating a chart', async () => {
    vi.mocked(postNatalCalculation).mockResolvedValue(null);

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Motor astrológico indisponível');
  });

  it('rejects responses without an audit receipt instead of silently displaying them', async () => {
    const uncertified = { planets: makeCertifiedNatalResponse().planets, houses: makeCertifiedNatalResponse().houses };
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(uncertified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('recibo auditável');
  });

  it('does not recalculate when birth data is a new object with the same contents', async () => {
    const certified = makeCertifiedNatalResponse();
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(certified));

    const { rerender } = renderHook(
      ({ request }) => useCertifiedNatalCalculation(request),
      { initialProps: { request: { ...birthData } } },
    );

    await waitFor(() => {
      expect(postNatalCalculation).toHaveBeenCalledTimes(1);
    });

    rerender({ request: { ...birthData } });

    await act(async () => {
      await Promise.resolve();
    });

    expect(postNatalCalculation).toHaveBeenCalledTimes(1);
  });

  it('skips calculation when disabled and clears prior state', async () => {
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData, false));

    await act(async () => {
      await Promise.resolve();
    });

    expect(postNatalCalculation).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

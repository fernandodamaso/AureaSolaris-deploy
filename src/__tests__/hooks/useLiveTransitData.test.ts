import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTransitData } from '../../hooks/useLiveTransitData';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../services/astrologyApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/astrologyApi')>('../../services/astrologyApi');
  return {
    ...actual,
    postTransitPositions: vi.fn(),
    buildTransitPayload: vi.fn(() => JSON.stringify({})),
  };
});

import { safeInvoke } from '../../utils/tauri';
import { buildTransitPayload, postTransitPositions } from '../../services/astrologyApi';

const makeCertifiedTransitResponse = () => ({
  planets: {
    Sun: { sign: 'Ari', degree: 10, pos_in_sign: 10, element: 'Fire' },
    Moon: { sign: 'Tau', degree: 45, pos_in_sign: 15, element: 'Earth' },
  },
  aspects: [],
  houses: [],
  regence: { day_regent: 'Sun', hour_regent: 'Moon' },
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'transit',
      input_hash: 'transit-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2026-08-10T12:00:00Z', iana_timezone: 'UTC' },
    },
  },
});

describe('useLiveTransitData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeInvoke).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests transit transport with an empty payload and normalizes certified data', async () => {
    const certified = makeCertifiedTransitResponse();
    const payload = JSON.stringify({});
    vi.mocked(buildTransitPayload).mockReturnValue(payload);
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useLiveTransitData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(buildTransitPayload).toHaveBeenCalled();
    expect(postTransitPositions).toHaveBeenCalledWith(payload);
    expect(result.current.liveData?.planets.Sun.sign).toBe('Áries');
    expect(result.current.error).toBeNull();
    expect(safeInvoke).not.toHaveBeenCalled();
  });

  it('falls back to Tauri only after HTTP transport returns null', async () => {
    const certified = makeCertifiedTransitResponse();
    const payload = JSON.stringify({});
    vi.mocked(buildTransitPayload).mockReturnValue(payload);
    vi.mocked(postTransitPositions).mockResolvedValue(null);
    vi.mocked(safeInvoke).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(safeInvoke).toHaveBeenCalledWith('get_transit_positions', { payload });
    expect(result.current.liveData?.planets.Sun.sign).toBe('Áries');
  });

  it('surfaces engine unavailability without approximating positions', async () => {
    vi.mocked(postTransitPositions).mockResolvedValue(null);

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('rejects responses without an audit receipt instead of silently displaying them', async () => {
    const uncertified = { planets: makeCertifiedTransitResponse().planets };
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(uncertified));

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('refreshes transit data every 60 seconds', async () => {
    vi.useFakeTimers();
    const certified = makeCertifiedTransitResponse();
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(certified));

    renderHook(() => useLiveTransitData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(postTransitPositions).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(postTransitPositions).toHaveBeenCalledTimes(2);
  });
});

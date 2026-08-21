import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import type { ApiClient, ReceiptResponse } from '../../api/client';
import { ApiClientContext } from '../../api/provider';
import { useCertifiedNatalCalculation } from '../../hooks/useCertifiedNatalCalculation';

const birthData = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 23.5,
  lat: -23.5505,
  lon: -46.6333,
  timezone_name: 'America/Sao_Paulo',
  utc_offset_minutes: -120,
  house_system: 'Regiomontanus',
};

const makeCertifiedNatalResponse = () => ({
  planets: {
    Sun: { degree: 281.15, sign: 'Cap' },
    Moon: { degree: 224.01, sign: 'Sco' },
    ASC: { degree: 111.67, sign: 'Can' },
    MC: { degree: 24.85, sign: 'Ari' },
  },
  houses: Array.from({ length: 12 }, (_, index) => ({ degree: index * 30 })),
  aspects: [{ p1: 'Sun', p2: 'Moon', type: 'Trine', symbol: '△', orb: 1 }],
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: {
        utc: '2000-01-02T01:30:00Z',
        iana_timezone: 'America/Sao_Paulo',
        utc_offset_minutes: -120,
      },
      ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    },
  },
});

const makeReceipt = (result_payload: ReceiptResponse['result_payload'] = makeCertifiedNatalResponse()): ReceiptResponse => ({
  id: 'receipt-id',
  birth_profile_id: 'birth-profile-id',
  kind: 'natal',
  schema_version: 'calculation-receipt.v1',
  input_hash: 'natal-input-hash',
  input_payload: {},
  result_payload,
  engine_name: 'aurea-solaris-astro-engine',
  engine_version: '2026.08.audit-1',
  ephemeris_version: '2.10.03',
  resolved_at: '2000-01-02T01:30:00Z',
  resolved_timezone: 'America/Sao_Paulo',
  created_at: '2000-01-02T01:30:00Z',
});

function wrapperFor(api: ApiClient) {
  const ApiWrapper = ({ children }: { children: ReactNode }) => (
    createElement(ApiClientContext.Provider, { value: api }, children)
  );
  ApiWrapper.displayName = 'ApiWrapper';
  return ApiWrapper;
}

describe('useCertifiedNatalCalculation', () => {
  let calculateNatal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calculateNatal = vi.fn().mockResolvedValue(makeReceipt());
  });

  it('uses the API receipt result and preserves certified metadata', async () => {
    const api = { calculateNatal } as unknown as ApiClient;
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData), { wrapper: wrapperFor(api) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calculateNatal).toHaveBeenCalledWith({ force: false }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result.current.data?.meta.receipt).toMatchObject({
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
    });
    expect(result.current.data?.aspects?.[0].type).toBe('Trígono');
    expect(result.current.error).toBeNull();
  });

  it('retries with force and keeps the cached chart when retry fails', async () => {
    const api = { calculateNatal } as unknown as ApiClient;
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData), { wrapper: wrapperFor(api) });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const cached = result.current.data;
    calculateNatal.mockRejectedValueOnce(new Error('provider detail'));

    await act(async () => {
      await result.current.recalculate();
    });

    expect(calculateNatal).toHaveBeenLastCalledWith({ force: true }, expect.objectContaining({ signal: undefined }));
    expect(result.current.data).toBe(cached);
    expect(result.current.error).toContain('Não foi possível calcular');
  });

  it('rejects an uncertified response without displaying a chart', async () => {
    const api = { calculateNatal: vi.fn().mockResolvedValue(makeReceipt({ planets: {} })) } as unknown as ApiClient;
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData), { wrapper: wrapperFor(api) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('certificação auditável');
  });

  it('does not recalculate for a new birth-data object with the same values', async () => {
    const api = { calculateNatal } as unknown as ApiClient;
    const { rerender } = renderHook(
      ({ request }) => useCertifiedNatalCalculation(request),
      { initialProps: { request: { ...birthData } }, wrapper: wrapperFor(api) },
    );
    await waitFor(() => expect(calculateNatal).toHaveBeenCalledTimes(1));

    rerender({ request: { ...birthData } });
    await act(async () => { await Promise.resolve(); });

    expect(calculateNatal).toHaveBeenCalledTimes(1);
  });

  it('clears the previous certified natal while a changed map is pending and after it fails', async () => {
    let rejectChangedMap!: (error: Error) => void;
    const changedMap = new Promise<ReceiptResponse>((_resolve, reject) => { rejectChangedMap = reject; });
    calculateNatal
      .mockResolvedValueOnce(makeReceipt())
      .mockReturnValueOnce(changedMap);
    const api = { calculateNatal } as unknown as ApiClient;
    const { result, rerender } = renderHook(
      ({ request }) => useCertifiedNatalCalculation(request),
      { initialProps: { request: birthData }, wrapper: wrapperFor(api) },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());

    rerender({ request: { ...birthData, year: 2001 } });
    await waitFor(() => expect(calculateNatal).toHaveBeenCalledTimes(2));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await act(async () => { rejectChangedMap(new Error('changed map failed')); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Não foi possível calcular');
  });

  it('skips calculation when disabled and clears prior state', async () => {
    const api = { calculateNatal } as unknown as ApiClient;
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData, false), { wrapper: wrapperFor(api) });

    await act(async () => { await Promise.resolve(); });

    expect(calculateNatal).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

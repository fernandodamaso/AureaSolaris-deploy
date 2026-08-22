import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import type { ApiClient, ReceiptResponse } from '../../api/client';
import { ApiClientContext } from '../../api/provider';
import { useLiveTransitData } from '../../hooks/useLiveTransitData';

const makeTransitResult = () => ({
  planets: {
    Sun: { sign: 'Ari', degree: 10, pos_in_sign: 10, element: 'Fire' },
    Moon: { sign: 'Tau', degree: 45, pos_in_sign: 15, element: 'Earth' },
  },
  secondary: { NorthNode: { sign: 'Gem', degree: 75, pos_in_sign: 15 } },
  moon_phase: { phase: 'Crescente', icon: '🌒', illumination: 22.5 },
  meta: {
    timestamp: '2026-08-10T12:30:00+00:00',
    timestamp_utc: '2026-08-10T12:30:00Z',
    timezone: 'UTC',
    location: null,
    ephemeris: 'swiss',
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'transit',
      input_hash: 'transit-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2026-08-10T12:30:00Z', iana_timezone: 'UTC' },
      ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    },
  },
});

const makeReceipt = (result_payload: ReceiptResponse['result_payload'] = makeTransitResult()): ReceiptResponse => ({
  id: 'receipt-id',
  birth_profile_id: 'birth-profile-id',
  kind: 'transit',
  schema_version: 'calculation-receipt.v1',
  input_hash: 'transit-input-hash',
  input_payload: {},
  result_payload,
  engine_name: 'aurea-solaris-astro-engine',
  engine_version: '2026.08.audit-1',
  ephemeris_version: '2.10.03',
  resolved_at: '2026-08-10T12:30:00Z',
  resolved_timezone: 'UTC',
  created_at: '2026-08-10T12:30:00Z',
});

function wrapperFor(api: ApiClient) {
  const ApiWrapper = ({ children }: { children: ReactNode }) => createElement(
    ApiClientContext.Provider,
    { value: api },
    children,
  );
  ApiWrapper.displayName = 'ApiWrapper';
  return ApiWrapper;
}

describe('useLiveTransitData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not request a transit before a certified natal result is available', async () => {
    const calculateTransits = vi.fn();
    const api = { calculateTransits } as unknown as ApiClient;
    const { result } = renderHook(() => useLiveTransitData(undefined, false), {
      wrapper: wrapperFor(api),
    });

    expect(result.current.loading).toBe(false);
    expect(calculateTransits).not.toHaveBeenCalled();
  });

  it('keeps transit evidence empty when a disabled in-flight request resolves', async () => {
    let resolveTransit!: (value: ReceiptResponse) => void;
    const pendingTransit = new Promise<ReceiptResponse>((resolve) => { resolveTransit = resolve; });
    const calculateTransits = vi.fn().mockReturnValue(pendingTransit);
    const api = { calculateTransits } as unknown as ApiClient;
    const natal = { Sun: 1, Moon: 2, ASC: 3 };
    const { result, rerender } = renderHook(
      ({ enabled }) => useLiveTransitData(natal, enabled),
      { initialProps: { enabled: true }, wrapper: wrapperFor(api) },
    );
    await waitFor(() => expect(calculateTransits).toHaveBeenCalledTimes(1));

    rerender({ enabled: false });
    expect(result.current.loading).toBe(false);
    expect(result.current.liveData).toBeNull();

    await act(async () => { resolveTransit(makeReceipt()); });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('requests a certified transit receipt with a UTC ISO timestamp and normalizes presentation values', async () => {
    const calculateTransits = vi.fn().mockResolvedValue(makeReceipt());
    const api = { calculateTransits } as unknown as ApiClient;
    const { result } = renderHook(() => useLiveTransitData(), { wrapper: wrapperFor(api) });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calculateTransits).toHaveBeenCalledTimes(1);
    const [input, options] = calculateTransits.mock.calls[0];
    expect(input).toMatchObject({ force: false });
    expect(input.as_of).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(result.current.liveData).toMatchObject({
      planets: { Sun: { sign: 'Áries', degree: 10, element: 'Fogo' }, Moon: { sign: 'Touro' } },
      secondary: { NorthNode: { sign: 'Gêmeos' } },
      meta: { receipt: { kind: 'transit', input_hash: 'transit-input-hash' } },
    });
    expect(result.current.error).toBeNull();
  });

  it('rejects uncertified results without approximating positions', async () => {
    const api = { calculateTransits: vi.fn().mockResolvedValue(makeReceipt({ planets: {} })) } as unknown as ApiClient;
    const { result } = renderHook(() => useLiveTransitData(), { wrapper: wrapperFor(api) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('cancels an in-flight request on unmount', async () => {
    let receivedSignal: AbortSignal | undefined;
    const calculateTransits = vi.fn((_input: { as_of: string; force: boolean }, options: { signal?: AbortSignal }) => {
      receivedSignal = options.signal;
      return new Promise<ReceiptResponse>(() => undefined);
    });
    const api = { calculateTransits } as unknown as ApiClient;
    const { unmount } = renderHook(() => useLiveTransitData(), { wrapper: wrapperFor(api) });

    await waitFor(() => expect(receivedSignal).toBeInstanceOf(AbortSignal));
    unmount();
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('retries with force and replaces unavailable data only after a failed request', async () => {
    const calculateTransits = vi.fn().mockResolvedValue(makeReceipt());
    const api = { calculateTransits } as unknown as ApiClient;
    const { result } = renderHook(() => useLiveTransitData(), { wrapper: wrapperFor(api) });
    await waitFor(() => expect(result.current.liveData).not.toBeNull());

    calculateTransits.mockRejectedValueOnce(new Error('provider detail'));
    await act(async () => { await result.current.fetchAstro(true); });

    expect(calculateTransits).toHaveBeenLastCalledWith(
      expect.objectContaining({ force: true, as_of: expect.stringMatching(/Z$/) }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('suppresses a stale response when a newer request completes first', async () => {
    let resolveFirst!: (value: ReceiptResponse) => void;
    const first = new Promise<ReceiptResponse>((resolve) => { resolveFirst = resolve; });
    const calculateTransits = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValue(makeReceipt());
    const api = { calculateTransits } as unknown as ApiClient;
    type TestNatal = { Sun: number; Moon: number; ASC: number } | undefined;
    const { result, rerender } = renderHook(
      ({ natal }) => useLiveTransitData(natal),
      { initialProps: { natal: undefined as TestNatal }, wrapper: wrapperFor(api) },
    );

    rerender({ natal: { Sun: 1, Moon: 2, ASC: 3 } });
    await waitFor(() => expect(result.current.liveData).not.toBeNull());
    const latest = result.current.liveData;
    resolveFirst(makeReceipt({ planets: { Sun: { sign: 'Sco', degree: 200 } } }));
    await act(async () => { await Promise.resolve(); });

    expect(result.current.liveData).toBe(latest);
  });

  it('does not poll while the document is hidden and refreshes when visible again', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    const calculateTransits = vi.fn().mockResolvedValue(makeReceipt());
    const api = { calculateTransits } as unknown as ApiClient;
    renderHook(() => useLiveTransitData(), { wrapper: wrapperFor(api) });
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(calculateTransits).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => { await Promise.resolve(); });
    expect(calculateTransits).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

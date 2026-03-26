import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransitData } from '../../hooks/useTransitData';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../utils/astro-calc', () => ({
  calculateFallback: vi.fn().mockResolvedValue({
    planets: [{ name: 'Sol', degree: 45, sign: 'Áries', color: '#ff0' }],
    secondary: [],
    moon_phase: 'Nova',
  }),
}));

import { safeInvoke } from '../../utils/tauri';

describe('useTransitData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    (safeInvoke as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTransitData());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns data on successful Tauri invoke', async () => {
    const mockData = JSON.stringify({
      planets: [{ name: 'Sol', degree: 45, sign: 'Áries', color: '#ff0' }],
      secondary: [],
      moon_phase: 'Nova',
    });
    (safeInvoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTransitData());
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.data.planets[0].name).toBe('Sol');
  });

  it('falls back to JS calculation when Tauri returns null', async () => {
    (safeInvoke as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useTransitData());
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeTruthy();
    expect(result.current.data.planets[0].name).toBe('Sol');
    expect(result.current.error).toBeNull();
  });

  it('sets error on Tauri failure', async () => {
    (safeInvoke as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('IPC failed'));

    const { result } = renderHook(() => useTransitData());
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('IPC failed');
  });

  it('sets error when API returns error object', async () => {
    const mockData = JSON.stringify({ error: 'Swiss Ephemeris not found' });
    (safeInvoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTransitData());
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Swiss Ephemeris not found');
  });

  it('recalculate always makes a fresh API call', async () => {
    const mockData = JSON.stringify({
      planets: [{ name: 'Sol', degree: 45 }],
      secondary: [],
    });
    (safeInvoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTransitData());
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    const callCountBefore = (safeInvoke as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => { result.current.recalculate(); });
    expect((safeInvoke as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCountBefore + 1);
  });

  it('refetches when birthData changes', async () => {
    const mockData = JSON.stringify({
      planets: [{ name: 'Sol', degree: 45 }],
      secondary: [],
    });
    (safeInvoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const { result, rerender } = renderHook(
      ({ bd }) => useTransitData(bd),
      { initialProps: { bd: { lat: -15.78, lon: -47.93 } } }
    );
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    const callCountBefore = (safeInvoke as ReturnType<typeof vi.fn>).mock.calls.length;

    rerender({ bd: { lat: -23.55, lon: -46.63 } });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    expect((safeInvoke as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callCountBefore);
  });
});

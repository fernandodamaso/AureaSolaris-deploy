import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptResponse } from '../../api/client';
import { requestNatal, requestTransits, AstrologyApiError } from '../../services/astrologyApi';

const makeResult = (kind: 'natal' | 'transit' = 'natal') => ({
  planets: { Sun: { degree: 10 } },
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind,
      input_hash: `${kind}-input-hash`,
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2000-01-02T01:30:00Z', iana_timezone: 'America/Sao_Paulo' },
      ephemeris: { library_version: '2.10.03' },
    },
  },
});

const makeReceipt = (
  kind: 'natal' | 'transit' = 'natal',
  result_payload: ReceiptResponse['result_payload'] = makeResult(kind),
): ReceiptResponse => ({
  id: 'receipt-id',
  birth_profile_id: 'birth-profile-id',
  kind,
  schema_version: 'calculation-receipt.v1',
  input_hash: `${kind}-input-hash`,
  input_payload: {},
  result_payload,
  engine_name: 'aurea-solaris-astro-engine',
  engine_version: '2026.08.audit-1',
  ephemeris_version: '2.10.03',
  resolved_at: '2000-01-02T01:30:00Z',
  resolved_timezone: 'America/Sao_Paulo',
  created_at: '2000-01-02T01:30:00Z',
});

describe('astrologyApi receipts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the typed authenticated natal client and verifies receipt metadata', async () => {
    const calculateNatal = vi.fn().mockResolvedValue(makeReceipt());
    const signal = new AbortController().signal;
    const receipt = await requestNatal({ calculateNatal }, signal);

    expect(calculateNatal).toHaveBeenCalledWith({ force: false }, { signal });
    expect(receipt.result_payload).toEqual(makeResult());
  });

  it('sends a UTC ISO timestamp and force flag for transit receipts', async () => {
    const calculateTransits = vi.fn().mockResolvedValue(makeReceipt('transit'));
    const signal = new AbortController().signal;
    const receipt = await requestTransits({ calculateTransits }, '2026-08-14T21:30:00.000Z', signal, true);

    expect(calculateTransits).toHaveBeenCalledWith(
      { as_of: '2026-08-14T21:30:00.000Z', force: true },
      { signal },
    );
    expect(receipt.kind).toBe('transit');
  });

  it('rejects a response without certification or matching ephemeris', async () => {
    const uncertified = makeReceipt('natal', { planets: {} });
    await expect(requestNatal({ calculateNatal: vi.fn().mockResolvedValue(uncertified) }, undefined))
      .rejects.toThrow('certificação auditável');

    const mismatched = makeReceipt();
    mismatched.ephemeris_version = 'different';
    await expect(requestNatal({ calculateNatal: vi.fn().mockResolvedValue(mismatched) }, undefined))
      .rejects.toThrow('efemérides verificável');
  });

  it('forwards cancellation to the typed client', async () => {
    const controller = new AbortController();
    const calculateTransits = vi.fn(async (_input: { as_of: string; force: boolean }, options: { signal?: AbortSignal }) => {
      expect(options.signal).toBe(controller.signal);
      throw new DOMException('aborted', 'AbortError');
    });

    await expect(requestTransits({ calculateTransits }, '2026-08-14T21:30:00.000Z', controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
  });

  it('exposes a typed error for invalid receipt metadata', async () => {
    await expect(requestTransits({ calculateTransits: vi.fn().mockResolvedValue(makeReceipt()) }, 'now'))
      .rejects.toBeInstanceOf(AstrologyApiError);
  });
});

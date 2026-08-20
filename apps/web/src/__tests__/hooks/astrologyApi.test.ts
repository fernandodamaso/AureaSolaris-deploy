import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptResponse } from '../../api/client';
import {
  buildTransitPayload,
  decodeAstrologyResponse,
  postTransitPositions,
  requestNatal,
  AstrologyApiError,
} from '../../services/astrologyApi';
import { LOCAL_API_URL } from '../../utils/api';

const makeNatalResult = () => ({
  planets: { Sun: { degree: 10 } },
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2000-01-02T01:30:00Z', iana_timezone: 'America/Sao_Paulo' },
      ephemeris: { library_version: '2.10.03' },
    },
  },
});

const makeReceipt = (result_payload = makeNatalResult()): ReceiptResponse => ({
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

describe('astrologyApi transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds an explicit UTC transit payload from a fixed instant', () => {
    expect(JSON.parse(buildTransitPayload(new Date('2026-08-14T21:30:00.000Z')))).toEqual({
      year: 2026,
      month: 8,
      day: 14,
      hour: 21.5,
      timezone: 'UTC',
      utc_offset_minutes: 0,
    });
  });

  it('decodes JSON responses and converts parse failures', () => {
    expect(decodeAstrologyResponse('{"planets":{}}')).toEqual({ planets: {} });
    expect(() => decodeAstrologyResponse('not-json')).toThrow(AstrologyApiError);
  });

  it('uses the typed authenticated natal client and verifies receipt metadata', async () => {
    const calculateNatal = vi.fn().mockResolvedValue(makeReceipt());
    const signal = new AbortController().signal;
    const receipt = await requestNatal({ calculateNatal }, signal);

    expect(calculateNatal).toHaveBeenCalledWith({ force: false }, { signal });
    expect(receipt.result_payload).toEqual(makeNatalResult());
  });

  it('rejects a natal response without certification or matching ephemeris', async () => {
    const uncertified = { ...makeReceipt(), result_payload: { planets: {} } };
    await expect(requestNatal({ calculateNatal: vi.fn().mockResolvedValue(uncertified) }, undefined))
      .rejects.toThrow('certificação auditável');

    const mismatched = makeReceipt();
    mismatched.ephemeris_version = 'different';
    await expect(requestNatal({ calculateNatal: vi.fn().mockResolvedValue(mismatched) }, undefined))
      .rejects.toThrow('efemérides verificável');
  });

  it('forwards cancellation to the typed client', async () => {
    const controller = new AbortController();
    const calculateNatal = vi.fn(async (_input: { force: boolean }, options: { signal?: AbortSignal }) => {
      expect(options.signal).toBe(controller.signal);
      throw new DOMException('aborted', 'AbortError');
    });

    await expect(requestNatal({ calculateNatal }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('posts transit requests only through the legacy transit transport', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"planets":{"Sun":{}}}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = buildTransitPayload();
    const response = await postTransitPositions(payload);

    expect(fetchMock).toHaveBeenCalledWith(`${LOCAL_API_URL}/transit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    expect(response).toBe('{"planets":{"Sun":{}}}');
  });
});

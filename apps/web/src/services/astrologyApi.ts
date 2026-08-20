import { LOCAL_API_URL } from '../utils/api';
import type { ApiClient, ReceiptResponse } from '../api/client';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';

export class AstrologyApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AstrologyApiError';
    this.status = status;
  }
}

/** Calls the authenticated API and accepts only a receipt that matches its result metadata. */
export async function requestNatal(
  api: Pick<ApiClient, 'calculateNatal'>,
  signal?: AbortSignal,
  force = false,
): Promise<ReceiptResponse> {
  const receipt = await api.calculateNatal({ force }, { signal });
  const certified = readCertifiedCalculation(receipt.result_payload, 'natal');
  const metadata = certified?.meta.receipt;

  if (!metadata) {
    throw new AstrologyApiError('O recibo natal não contém certificação auditável.');
  }

  if (
    receipt.kind !== 'natal' ||
    receipt.schema_version !== 'calculation-receipt.v1' ||
    receipt.input_hash !== metadata.input_hash ||
    receipt.engine_name !== metadata.engine.name ||
    receipt.engine_version !== metadata.engine.version
  ) {
    throw new AstrologyApiError('O recibo natal não corresponde à certificação recebida.');
  }

  const resultEphemeris = metadata.ephemeris?.library_version;
  if (!resultEphemeris || receipt.ephemeris_version !== resultEphemeris) {
    throw new AstrologyApiError('O recibo natal não declara uma versão de efemérides verificável.');
  }

  return receipt;
}

export function buildTransitPayload(now: Date = new Date()): string {
  // Resolve one UTC instant in the client so the direct HTTP request and the
  // browser/Tauri fallback always calculate the same valid transit request.
  return JSON.stringify({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours()
      + (now.getUTCMinutes() / 60)
      + (now.getUTCSeconds() / 3600)
      + (now.getUTCMilliseconds() / 3_600_000),
    timezone: 'UTC',
    utc_offset_minutes: 0,
  });
}

export function decodeAstrologyResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new AstrologyApiError(cause instanceof Error ? cause.message : 'Resposta do motor inválida.');
  }
}

/**
 * POST /transit. Returns raw response text or null when HTTP is unavailable.
 * Tauri IPC fallback is owned by the transit hook, not this transport layer.
 */
export async function postTransitPositions(payload: string): Promise<string | null> {
  try {
    const response = await fetch(`${LOCAL_API_URL}/transit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (response.ok) return await response.text();
  } catch {
    // Network error — caller may fall back to Tauri IPC.
  }
  return null;
}

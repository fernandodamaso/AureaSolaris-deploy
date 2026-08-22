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

function verifyReceipt(receipt: ReceiptResponse, expectedKind: 'natal' | 'transit'): ReceiptResponse {
  const certified = readCertifiedCalculation(receipt.result_payload, expectedKind);
  const metadata = certified?.meta.receipt;

  if (!metadata) {
    throw new AstrologyApiError(`O recibo ${expectedKind} não contém certificação auditável.`);
  }

  if (
    receipt.kind !== expectedKind ||
    receipt.schema_version !== 'calculation-receipt.v1' ||
    receipt.input_hash !== metadata.input_hash ||
    receipt.engine_name !== metadata.engine.name ||
    receipt.engine_version !== metadata.engine.version
  ) {
    throw new AstrologyApiError(`O recibo ${expectedKind} não corresponde à certificação recebida.`);
  }

  const resultEphemeris = metadata.ephemeris?.library_version;
  if (!resultEphemeris || receipt.ephemeris_version !== resultEphemeris) {
    throw new AstrologyApiError(`O recibo ${expectedKind} não declara uma versão de efemérides verificável.`);
  }

  return receipt;
}

/** Calls the authenticated API and accepts only a receipt that matches its result metadata. */
export async function requestNatal(
  api: Pick<ApiClient, 'calculateNatal'>,
  signal?: AbortSignal,
  force = false,
): Promise<ReceiptResponse> {
  return verifyReceipt(await api.calculateNatal({ force }, { signal }), 'natal');
}

export async function requestTransits(
  api: Pick<ApiClient, 'calculateTransits'>,
  asOf: string,
  signal?: AbortSignal,
  force = false,
): Promise<ReceiptResponse> {
  return verifyReceipt(await api.calculateTransits({ as_of: asOf, force }, { signal }), 'transit');
}

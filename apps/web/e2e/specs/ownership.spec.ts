import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

type ReceiptBody = {
  id: string;
  kind: 'natal' | 'transit';
  result_payload: {
    meta?: { receipt?: { schema_version?: string; input_hash?: string } };
  };
};

const canonicalProductionSupabase = 'https://tgpcpxqqusehssaihvcp.supabase.co';
const configuredProductionSupabase = process.env.AUREA_PRODUCTION_SUPABASE_URL;
if (!configuredProductionSupabase) {
  throw new Error('AUREA_PRODUCTION_SUPABASE_URL is required.');
}
const productionSupabase = configuredProductionSupabase.endsWith('/')
  ? configuredProductionSupabase.slice(0, -1)
  : configuredProductionSupabase;
if (productionSupabase !== canonicalProductionSupabase) {
  throw new Error(
    `AUREA_PRODUCTION_SUPABASE_URL must equal ${canonicalProductionSupabase}.`,
  );
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('hosted private flow and receipt ownership boundary', async ({ page, request }) => {
  const apiUrl = process.env.AUREA_E2E_API_URL;
  const secondJwt = process.env.AUREA_E2E_SECOND_JWT;
  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;
  if (!apiUrl || !secondJwt) throw new Error('Hosted ownership credentials are missing.');

  const observedUrls: string[] = [];
  page.on('request', (requestEvent) => observedUrls.push(requestEvent.url()));

  const natalResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && response.url().startsWith(apiUrl)
      && response.url().endsWith('/v1/astrology/natal'),
    { timeout: 60_000 },
  );
  const transitResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && response.url().startsWith(apiUrl)
      && response.url().endsWith('/v1/astrology/transits'),
    { timeout: 60_000 },
  );

  await waitForShell(page);
  const [natalResponse, transitResponse] = await Promise.all([
    natalResponsePromise,
    transitResponsePromise,
  ]);
  expect(natalResponse.status()).toBe(200);
  expect(transitResponse.status()).toBe(200);
  const natalBody = await natalResponse.json() as ReceiptBody;
  const transitBody = await transitResponse.json() as ReceiptBody;
  expect(natalBody.kind).toBe('natal');
  expect(transitBody.kind).toBe('transit');
  expect(natalBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');
  expect(transitBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();

  expect(natalBody.id).toMatch(/^[0-9a-f-]{36}$/i);

  const natalEvidence = page.getByRole('region', { name: 'Proveniência do mapa natal' });
  const transitEvidence = page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' });
  await expect(natalEvidence).toBeVisible({ timeout: 60_000 });
  await expect(transitEvidence).toBeVisible({ timeout: 60_000 });
  await natalEvidence.getByText('Ver recibo técnico').click();
  await transitEvidence.getByText('Ver recibo técnico').click();
  await expect(natalEvidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(transitEvidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(page.getByRole('heading', { name: 'Mandala Astrológica' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Mandala Astrológica' })).toBeVisible({ timeout: 60_000 });

  const noToken = await request.get(`${apiUrl}/v1/astrology/receipts/${natalBody.id}`, {
    headers: apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : undefined,
  });
  expect(noToken.status()).toBe(401);

  const otherUser = await request.get(`${apiUrl}/v1/astrology/receipts/${natalBody.id}`, {
    headers: {
      Authorization: `Bearer ${secondJwt}`,
      ...(apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : {}),
    },
  });
  expect(otherUser.status()).toBe(404);
  expect((await otherUser.json()).code).toBe('receipt_not_found');

  const reloadedNatal = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/v1/astrology/natal'));
  const reloadedTransit = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/v1/astrology/transits'));
  await page.reload();
  await Promise.all([reloadedNatal, reloadedTransit]);
  await expect(page.getByRole('button', { name: 'E2E Test User' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('region', { name: 'Proveniência do mapa natal' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' })).toBeVisible();

  const profileButton = page.locator('aside button').last();
  await profileButton.click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  const productionApi = process.env.AUREA_PRODUCTION_API_URL ?? 'https://aurea-solaris-api.vercel.app';
  for (const value of observedUrls) {
    const parsed = new URL(value);
    expect(parsed.protocol, `mixed-content request: ${value}`).not.toBe('http:');
    expect(value).not.toContain('localhost');
    expect(value).not.toContain('127.0.0.1');
    expect(value).not.toContain(productionApi);
    expect(value).not.toContain(productionSupabase);
  }
});

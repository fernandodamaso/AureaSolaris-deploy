import { test, expect } from '@playwright/test';
import { readAccessToken, waitForShell } from '../helpers/app';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('hosted private flow and receipt ownership boundary', async ({ page, request }) => {
  const apiUrl = process.env.AUREA_E2E_API_URL;
  const secondJwt = process.env.AUREA_E2E_SECOND_JWT;
  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;
  if (!apiUrl || !secondJwt) throw new Error('Hosted ownership credentials are missing.');

  const observedUrls: string[] = [];
  page.on('request', (requestEvent) => observedUrls.push(requestEvent.url()));

  await waitForShell(page);
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();

  const headers = {
    Authorization: `Bearer ${await readAccessToken(page)}`,
    ...(apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : {}),
  };
  const natal = await request.post(`${apiUrl}/v1/astrology/natal`, {
    headers,
    data: {},
  });
  expect(natal.status()).toBe(200);
  const natalBody = await natal.json() as { id: string };
  expect(natalBody.id).toMatch(/^[0-9a-f-]{36}$/i);

  const transit = await request.post(`${apiUrl}/v1/astrology/transits`, {
    headers,
    data: { as_of: new Date().toISOString() },
  });
  expect(transit.status()).toBe(200);
  expect((await transit.json()).kind).toBe('transit');

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

  await page.reload();
  await waitForShell(page);
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();

  const profileButton = page.locator('aside button').last();
  await profileButton.click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  const productionApi = process.env.AUREA_PRODUCTION_API_URL ?? 'https://aurea-solaris-api.vercel.app';
  const productionSupabase = process.env.AUREA_PRODUCTION_SUPABASE_URL ?? '';
  for (const value of observedUrls) {
    const parsed = new URL(value);
    expect(parsed.protocol, `mixed-content request: ${value}`).not.toBe('http:');
    expect(value).not.toContain('localhost');
    expect(value).not.toContain('127.0.0.1');
    expect(value).not.toContain(productionApi);
    if (productionSupabase) expect(value).not.toContain(productionSupabase);
  }
});

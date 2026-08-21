import { test, expect, type Page } from '@playwright/test';
import { waitForShell } from '../helpers/app';

async function openAstrologia(page: Page) {
  await waitForShell(page);
  await expect(page.getByRole('heading', { name: 'Mandala Astrológica' })).toBeVisible({ timeout: 60_000 });
}

async function readAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (const index = 0; index < sessionStorage.length; index += 1) {
      const value = sessionStorage.getItem(sessionStorage.key(index) ?? '');
      if (!value) continue;
      try {
        const parsed = JSON.parse(value) as { access_token?: unknown };
        if (typeof parsed.access_token === 'string') return parsed.access_token;
      } catch {
        // Ignore unrelated session storage entries.
      }
    }
    return null;
  });
  expect(token).toBeTruthy();
  return token as string;
}

test('astrologia-certified-natal: receipt shows UTC, IANA, hash, engine, and ephemeris', async ({ page }) => {
  await openAstrologia(page);
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByText('Ver recibo técnico').click();
  await expect(page.getByText(/Instante UTC:/)).toBeVisible();
  await expect(page.getByText(/Fuso IANA:/)).toBeVisible();
  await expect(page.getByText(/Hash da entrada:/)).toBeVisible();
  await expect(page.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(page.getByText(/Efeméride:/)).not.toContainText('não declarada');
});

test('astrologia-retry: force recalculation keeps the certified boundary', async ({ page }) => {
  await openAstrologia(page);
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
});

test('astrologia-certified-transit: authenticated transit receipt is available', async ({ page, request }) => {
  await openAstrologia(page);
  const token = await readAccessToken(page);
  const apiUrl = process.env.AUREA_E2E_API_URL;
  if (!apiUrl) throw new Error('AUREA_E2E_API_URL is required.');
  const response = await request.post(`${apiUrl}/v1/astrology/transits`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { as_of: new Date().toISOString() },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.kind).toBe('transit');
  expect(body.result_payload.meta.receipt.schema_version).toBe('calculation-receipt.v1');
});

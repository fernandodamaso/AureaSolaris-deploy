import { test, expect, type Page } from '@playwright/test';
import { waitForShell } from '../helpers/app';

async function openAstrologia(page: Page) {
  await waitForShell(page);
  await expect(page.getByRole('heading', { name: 'Mandala Astrológica' })).toBeVisible({ timeout: 60_000 });
}

test('astrologia-certified-natal: receipt shows UTC, IANA, hash, engine, and ephemeris', async ({ page }) => {
  await openAstrologia(page);
  const evidence = page.getByRole('region', { name: 'Proveniência do mapa natal' });
  await expect(evidence).toBeVisible({ timeout: 60_000 });
  await evidence.getByText('Ver recibo técnico').click();
  await expect(evidence.getByText(/Instante UTC:/)).toBeVisible();
  await expect(evidence.getByText(/Fuso IANA:/)).toBeVisible();
  await expect(evidence.getByText(/Hash da entrada:/)).toBeVisible();
  await expect(evidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(evidence.getByText(/Efeméride:/)).not.toContainText('não declarada');
});

test('astrologia-retry: force recalculation keeps the certified boundary', async ({ page }) => {
  await openAstrologia(page);
  const natalEvidence = page.getByRole('region', { name: 'Proveniência do mapa natal' });
  await expect(natalEvidence).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect(natalEvidence).toBeVisible({ timeout: 60_000 });
  await expect(natalEvidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
});

test('astrologia-certified-transit: rendered transit receipt is available', async ({ page }) => {
  await openAstrologia(page);
  const evidence = page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' });
  await expect(evidence).toBeVisible({ timeout: 60_000 });
  await evidence.getByText('Ver recibo técnico').click();
  await expect(evidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(evidence.getByText(/Efeméride:/)).not.toContainText('não declarada');
});

import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('memorias-review: approve revoke forget controls exist on seeded memories', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByText(/Memoria proposta de teste/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Memoria aprovada de teste/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revogar' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Esquecer' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Aprovar' }).first().click();
});

test('memorias-open-caderno: Estudar no Caderno from approved memory', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Memórias' }).click();
  await page.getByRole('button', { name: 'Estudar no Caderno' }).first().click();
  await expect(page.getByText(/Caderno|Memória Hermes/i).first()).toBeVisible();
});

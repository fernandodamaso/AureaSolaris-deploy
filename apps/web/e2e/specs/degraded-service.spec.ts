import { test, expect } from '@playwright/test';
import { login } from '../helpers/app';

test('degraded-service: account outage is visible and offers retry/logout', async ({ page }) => {
  const apiUrl = process.env.AUREA_E2E_API_URL;
  if (!apiUrl) throw new Error('AUREA_E2E_API_URL is required.');

  await page.route(`${apiUrl}/v1/me`, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'service_unavailable', message: 'temporary test outage' }),
    });
  });

  await page.goto('/');
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar sua conta. Tente novamente.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar sua conta. Tente novamente.');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});

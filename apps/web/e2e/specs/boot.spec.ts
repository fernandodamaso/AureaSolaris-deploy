import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test.describe('private boot', () => {
  test('health reports the disposable API', async ({ request }) => {
    const apiUrl = process.env.AUREA_E2E_API_URL;
    if (!apiUrl) throw new Error('AUREA_E2E_API_URL is required.');
    const response = await request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
    await expect(response).toBeOK();
    expect((await response.json()).status).toBe('ok');
  });

  test('login and onboarding open the private Astrology shell', async ({ page }) => {
    await waitForShell(page);
    await expect(page.getByRole('button', { name: 'Entrar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Agenda Preditiva' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();
  });
});

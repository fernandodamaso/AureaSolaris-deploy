import { expect, type Page } from '@playwright/test';

/** Wait until local-owner shell is visible (no login). */
export async function waitForShell(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aurea Solaris' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();
}

export async function assertHealthIsTestUser(request: import('@playwright/test').APIRequestContext): Promise<void> {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.test_user).toBe(true);
  expect(body.browser_contract_version).toBe(2);
}

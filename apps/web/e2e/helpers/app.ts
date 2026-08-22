import { test, expect, type Page } from '@playwright/test';

const failures = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  const apiUrl = process.env.AUREA_E2E_API_URL;
  if (!apiUrl) throw new Error('AUREA_E2E_API_URL is required for private E2E health checks.');

  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;
  const response = await request.get(`${apiUrl}/health`, {
    headers: apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : undefined,
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).status).toBe('ok');

  const errors: string[] = [];
  failures.set(page, errors);
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.text().startsWith('Failed to load resource:')) return;
    errors.push(`console: ${message.text()}`);
  });
});

const protectionBypassHeader = 'x-vercel-protection-bypass';

export async function installPreviewProtectionRoutes(page: Page): Promise<void> {
  const webUrl = process.env.AUREA_E2E_URL;
  const apiUrl = process.env.AUREA_E2E_API_URL;
  if (!webUrl || !apiUrl) {
    throw new Error('AUREA_E2E_URL and AUREA_E2E_API_URL are required for protected E2E routing.');
  }

  const webOrigin = new URL(webUrl).origin;
  const apiOrigin = new URL(apiUrl).origin;
  const webBypass = process.env.AUREA_VERCEL_WEB_PROTECTION_BYPASS;
  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;

  await page.route('**/*', async (route) => {
    const headers = { ...route.request().headers() };
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === protectionBypassHeader) delete headers[name];
    }

    const requestOrigin = new URL(route.request().url()).origin;
    if (requestOrigin === webOrigin && webBypass) {
      headers[protectionBypassHeader] = webBypass;
    } else if (requestOrigin === apiOrigin && apiBypass) {
      headers[protectionBypassHeader] = apiBypass;
    }

    await route.continue({ headers });
  });
}

test.afterEach(async ({ page }) => {
  const errors = failures.get(page) ?? [];
  expect(errors, `Browser application errors:\n${errors.join('\n')}`).toEqual([]);
});

export async function login(page: Page): Promise<void> {
  const email = process.env.AUREA_E2E_EMAIL;
  const password = process.env.AUREA_E2E_PASSWORD;
  if (!email || !password) throw new Error('Private E2E credentials are missing from the secure test environment.');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function waitForShell(page: Page): Promise<void> {
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: 'Entrar' });
  const profileForm = page.getByRole('form', { name: 'Formulário de perfil' });
  const astrologyButton = page.getByRole('button', { name: 'Astrologia' });
  await expect(loginButton.or(profileForm).or(astrologyButton).first()).toBeVisible({ timeout: 30_000 });
  if (await loginButton.isVisible()) {
    await login(page);
  }
  await expect(profileForm.or(astrologyButton).first()).toBeVisible({ timeout: 30_000 });
  if (await profileForm.isVisible()) {
    await completeBirthOnboarding(page);
  }
  await expect(astrologyButton).toBeVisible({ timeout: 30_000 });
}

export async function completeBirthOnboarding(page: Page): Promise<void> {
  const form = page.getByRole('form', { name: 'Formulário de perfil' });
  await expect(form).toBeVisible();
  if (await page.getByLabel('Nome do perfil').isVisible().catch(() => false)) {
    await page.getByLabel('Nome do perfil').fill('E2E Test User');
  }
  await page.getByLabel('Rótulo do mapa').fill('E2E Birth Profile');
  await page.getByLabel('Data de nascimento').fill('01/01/2000');
  await page.getByLabel('Hora de nascimento').fill('12:30');
  await page.getByLabel('Local de nascimento').fill('São Paulo');
  await page.getByLabel('Latitude').fill('-23.5505');
  await page.getByLabel('Longitude').fill('-46.6333');
  await page.getByLabel('Fuso horário IANA').fill('America/Sao_Paulo');
  await form.getByRole('button', { name: 'Salvar e continuar' }).click();
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible({ timeout: 30_000 });
}

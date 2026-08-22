import { test, expect } from '@playwright/test';
import { login, waitForShell } from '../helpers/app';

test('profile-flow: saves profile without birth data, then persists birth profile and logout', async ({ page }) => {
  await page.goto('/');
  await login(page);

  const form = page.getByRole('form', { name: 'Formulário de perfil' });
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Configure seu perfil' })).toBeVisible();
  await page.getByLabel('Nome do perfil').fill('E2E Test User');
  await form.getByRole('button', { name: 'Salvar e continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Adicione seus dados de nascimento' })).toBeVisible();
  await page.getByLabel('Rótulo do mapa').fill('E2E Birth Profile');
  await page.getByLabel('Data de nascimento').fill('01/01/2000');
  await page.getByLabel('Hora de nascimento').fill('12:30');
  await page.getByLabel('Local de nascimento').fill('São Paulo');
  await page.getByLabel('Latitude').fill('-23.5505');
  await page.getByLabel('Longitude').fill('-46.6333');
  await page.getByLabel('Fuso horário IANA').fill('America/Sao_Paulo');
  await form.getByRole('button', { name: 'Salvar e continuar' }).click();

  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await waitForShell(page);
  await expect(page.getByRole('button', { name: 'E2E Test User' })).toBeVisible();

  await page.getByRole('button', { name: 'E2E Test User' }).click();
  await expect(page.getByLabel('Fechar configurações')).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});

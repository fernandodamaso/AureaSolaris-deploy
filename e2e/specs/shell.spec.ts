import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('shell-navigation: six nav items, Hermes FAB, profile', async ({ page }) => {
  await waitForShell(page);

  await page.getByRole('button', { name: 'Caderno Vivo' }).click();
  await expect(page.getByText(/Caderno/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Astrologia' }).click();
  await expect(page.getByRole('tab', { name: 'Mandala visual' })).toBeVisible();

  await page.getByRole('button', { name: 'Saúde & Vitalidade' }).click();
  await expect(page.getByText(/Saúde/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Agenda Preditiva' }).click();
  await expect(page.getByText(/Agenda/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByText(/Memória/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Histórico & Notas' }).click();
  await expect(page.getByText(/Histórico|Notas/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Abrir conversa com Hermes' }).click();
  await expect(page.getByLabel('Pergunte ao Hermes')).toBeVisible();

  await page.getByRole('button', { name: 'Pessoa Teste' }).click();
  await expect(page.getByLabel('Fechar configurações')).toBeVisible();
});

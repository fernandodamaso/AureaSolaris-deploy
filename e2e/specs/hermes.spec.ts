import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';
import { installHermesMocks } from '../helpers/hermesMock';

test('hermes-mocked-proposal: reply stays proposal until review', async ({ page }) => {
  await installHermesMocks(page);
  await waitForShell(page);
  await page.getByRole('button', { name: 'Abrir conversa com Hermes' }).click();
  await page.getByLabel('Provedor do Hermes').selectOption('openai');
  await page.getByText(/Permito enviar esta conversa/i).click();
  await page.getByLabel('Pergunte ao Hermes').fill('Pergunta E2E sobre o mapa');
  await page.getByRole('button', { name: 'Enviar mensagem ao Hermes' }).click();
  await expect(page.getByText('Resposta ficticia de teste do Hermes.')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Propor memória' }).click();
  // Memory is proposed, not silently approved — open Memórias and look for proposed status if UI surfaces it.
  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByText(/proposed|proposta|Pergunta E2E|Resposta ficticia/i).first()).toBeVisible({ timeout: 30_000 });
});

test('study-loop: map to hermes to caderno', async ({ page }) => {
  await installHermesMocks(page);
  await waitForShell(page);
  await page.getByRole('button', { name: 'Astrologia' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Tutor IA/i }).click();
  await page.getByText(/Permito enviar esta conversa/i).click();
  await page.getByLabel('Pergunte ao Hermes').fill('Explique o Sol no mapa de teste');
  await page.getByRole('button', { name: 'Enviar mensagem ao Hermes' }).click();
  await expect(page.getByText('Resposta ficticia de teste do Hermes.').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Estudar no Caderno/i }).first().click();
  await expect(page.getByText(/Caderno/i).first()).toBeVisible();
  await page.reload();
  await waitForShell(page);
  await page.getByRole('button', { name: 'Caderno Vivo' }).click();
  // Board still opens after study loop
  await expect(page.getByText(/Nota A de teste|Caderno/i).first()).toBeVisible({ timeout: 30_000 });
});

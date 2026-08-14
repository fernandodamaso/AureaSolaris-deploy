import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';
import { installHermesMocks } from '../helpers/hermesMock';

async function openAstrologia(page: import('@playwright/test').Page) {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Astrologia' }).click();
  await expect(page.getByRole('tab', { name: 'Mandala visual' })).toBeVisible();
}

test('astrologia-seeded-natal: receipt shows UTC, IANA, hash', async ({ page }) => {
  await openAstrologia(page);
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByText('Ver recibo técnico').click();
  await expect(page.getByText(/Instante UTC:/)).toBeVisible();
  await expect(page.getByText(/Fuso IANA:/)).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: /America\/Sao_Paulo|UTC/ }).first()).toBeVisible();
  await expect(page.getByText(/Hash da entrada:/)).toBeVisible();
  const hashRow = page.locator('dl').getByText(/Hash da entrada:/).locator('..');
  await expect(hashRow).not.toContainText('não declarado');
});

test('astrologia-recalculate: switch maps and refresh', async ({ page }) => {
  await openAstrologia(page);
  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Pessoa Conhecida' });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Mapa de referencia' });
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
});

test('astrologia-incomplete-birth: no invented chart', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Adicionar mapa/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome').fill('Mapa incompleto E2E');
  // Leave date/time/location empty — form must error, not invent values.
  await dialog.getByRole('button', { name: /Salvar dados/i }).click();
  await expect(dialog.getByRole('alert')).toContainText(/DD\/MM\/AAAA|hora|local|latitude|fuso/i);
  await expect(dialog.getByRole('alert')).toBeVisible();
  // Still on the dialog: no silent save of an incomplete map into the selector.
  await expect(page.getByLabel('Mapa em foco').locator('option', { hasText: 'Mapa incompleto E2E' })).toHaveCount(0);
});

test('astrologia-open-caderno: Estudar no Caderno', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Estudar no Caderno/i }).click();
  await expect(page.getByText(/Caderno/i).first()).toBeVisible();
});

test('astrologia-open-hermes: Tutor IA', async ({ page }) => {
  await installHermesMocks(page);
  await openAstrologia(page);
  await page.getByRole('button', { name: /Tutor IA/i }).click();
  await expect(page.getByLabel('Pergunte ao Hermes')).toBeVisible();
});

test('astrologia-second-map: add map using Pessoa Conhecida fixture values', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Adicionar mapa/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome').fill('Mapa E2E Extra');
  await dialog.getByLabel('Data de nascimento').fill('15/06/1990');
  await dialog.getByLabel('Hora exata').fill('09:00');
  await dialog.getByLabel('Cidade ou local').selectOption('São Paulo, SP');
  await dialog.getByRole('button', { name: /Salvar dados/i }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Mapa E2E Extra' });
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
});

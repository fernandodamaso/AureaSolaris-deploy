import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('agenda-task-event: create task and event', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Agenda Preditiva' }).click();
  await expect(page.getByText('Revisar mandala de teste')).toBeVisible();

  await page.getByRole('button', { name: '+ Nova Tarefa' }).click();
  await page.getByRole('textbox', { name: 'Tarefa' }).fill('Tarefa E2E');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Tarefa criada com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Tarefa E2E')).toBeVisible();

  await page.getByRole('button', { name: '+ Novo Compromisso' }).click();
  await page.getByLabel('Título').fill('Evento E2E');
  await page.getByLabel('Horário local').fill('15:30');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Evento E2E')).toBeVisible();
});

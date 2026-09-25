import { expect, test } from '@playwright/test';
import { launchApp, nav, register, type RunningApp } from './app';

let run: RunningApp;

test.beforeAll(async () => {
  run = await launchApp({ hostPort: 4592 });
});

test.afterAll(async () => {
  await run?.app.close();
});

test('builds a wizard with the guided flow, casts and levels up', async () => {
  const page = run.page;
  const next = () => page.getByRole('button', { name: /^Avanti/ }).click();
  await register(page, { where: 'host', username: 'elara', displayName: 'Elara' });

  await nav(page, 'Personaggi');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo personaggio' }).click();
  await page.getByRole('button', { name: /^Mago/ }).click();
  await expect(page.getByText('Recupero arcano.')).toBeVisible();
  await next();
  await page.getByRole('button', { name: /^Elfo/ }).click();
  await page.getByRole('button', { name: /^Alto elfo/ }).click();
  await next();
  await page.getByRole('button', { name: /^Sapiente/ }).click();
  await next();
  await page.locator('.ability select').nth(3).selectOption('15');
  await page.getByRole('button', { name: '+2 / +1' }).click();
  await page.locator('label:has-text("+2") select').selectOption('int');
  await expect(page.locator('.ability').nth(3).locator('.score')).toHaveText('17');
  await next();
  await page.getByRole('button', { name: /^Indagare/ }).first().click();
  await page.getByRole('button', { name: /^Medicina/ }).first().click();
  await page.locator('.chip', { hasText: 'Percezione' }).first().click();
  await next();
  await next();
  for (const n of ['Dardo di fuoco', 'Mano magica', 'Luce']) await page.locator('.option', { has: page.locator(`b:text-is("${n}")`) }).click();
  for (const n of ['Dardo incantato', 'Scudo', 'Armatura magica', 'Sonno']) await page.locator('.option', { has: page.locator(`b:text-is("${n}")`) }).click();
  await next();
  await page.getByRole('button', { name: /Opzione A/ }).first().click();
  await page.getByRole('button', { name: /Opzione A/ }).last().click();
  await expect(page.getByText('Libro degli incantesimi')).toBeVisible();
  await next();
  await page.getByLabel('Nome').fill('Elara Luminvento');
  await next();
  await expect(page.getByText('Personaggio pronto')).toBeVisible();
  await page.getByRole('button', { name: /^Salva$/ }).click();

  // sheet
  await expect(page.getByRole('button', { name: 'Modifica scelte' })).toBeVisible();
  await expect(page.locator('.hp-value')).toContainText('8/8');
  await page.locator('.sheet-tabs button', { hasText: 'Incantesimi' }).click();
  await page.locator('.spell', { has: page.locator('summary', { hasText: 'Dardo incantato' }) }).getByRole('button', { name: 'Lancia' }).click();
  await expect(page.locator('.toast', { hasText: 'Dardo incantato · danni' })).toBeVisible();
  await expect(page.locator('.pip.used')).toHaveCount(1);

  await page.getByTitle('Sali di livello').click();
  await page.getByRole('button', { name: 'Sali di livello', exact: true }).click();
  await expect(page.getByText('Elfo Mago 2')).toBeVisible();
  // 8 + (4 + 2)
  await expect(page.locator('.hp-value')).toContainText('14/14');
  await expect(page.getByText('Da completare')).toBeVisible();

  await page.getByRole('button', { name: 'Riposo lungo' }).click().catch(async () => {
    await page.locator('.sheet-tabs button', { hasText: 'Combattimento' }).click();
    await page.getByRole('button', { name: 'Riposo lungo' }).click();
  });
  await page.locator('.sheet-tabs button', { hasText: 'Incantesimi' }).click();
  await expect(page.locator('.pip.used')).toHaveCount(0);
  expect(run.errors, run.errors.join('\n')).toEqual([]);
});

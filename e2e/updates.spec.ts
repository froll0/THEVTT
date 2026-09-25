import { expect, test } from '@playwright/test';
import { launchApp, register } from './app';

test('offers a new version of the app', async () => {
  const run = await launchApp({
    hostPort: 4594,
    release: {
      tag_name: 'v99.0.0',
      body: '- Diario personale\n- Copertine delle campagne',
      html_url: 'https://github.com/froll0/THEVTT/releases/tag/v99.0.0',
      published_at: '2026-09-25T10:00:00Z',
      assets: [{ name: 'TheVTT-Setup-99.0.0.exe', browser_download_url: 'https://example.invalid/setup.exe', size: 1 }],
    },
  });
  const page = run.page;
  await register(page, { where: 'host', username: 'nuovo', displayName: 'Nuovo' });
  await page.getByRole('button', { name: 'Aggiorna a 99.0.0' }).click();
  await expect(page.getByText('Copertine delle campagne')).toBeVisible();
  await expect(page.getByRole('button', { name: /Installa e riavvia|Scarica la nuova versione/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Impostazioni').click();
  await page.getByRole('button', { name: 'Avanzate' }).click();
  await expect(page.getByText('Disponibile la 99.0.0')).toBeVisible();
  expect(run.errors, run.errors.join('\n')).toEqual([]);
  await run.app.close();
});

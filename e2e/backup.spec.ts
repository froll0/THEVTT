import { expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiCall, launchApp, nav, register } from './app';

test('backs up everything and restores it after a loss', async () => {
  const first = await launchApp({ hostPort: 4596 });
  const page = first.page;
  await register(page, { where: 'host', username: 'custode', displayName: 'Custode' });
  const camp = await apiCall<{ id: string }>(page, 'POST', '/campaigns', { name: 'La Torre Spezzata', systemId: 'dnd5e-2024' });
  const file = join(mkdtempSync(join(tmpdir(), 'thevtt-backup-e2e-')), 'gruppo.thevtt-backup');
  // the native file dialogs answer by themselves; the restart is left to the test
  await first.app.evaluate(({ dialog, app }, path) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: path })) as typeof dialog.showSaveDialog;
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog;
    app.relaunch = () => {};
  }, file);

  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Impostazioni').click();
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  await page.getByRole('button', { name: 'Crea backup' }).click();
  await expect(page.locator('.toast', { hasText: 'Backup salvato' })).toBeVisible();

  // disaster: the campaign is gone
  await apiCall(page, 'DELETE', `/campaigns/${camp.id}`);
  await page.getByRole('button', { name: 'Scegli il file…' }).click();
  await expect(page.getByText('Ripristinare questo backup?')).toBeVisible();
  await expect(page.locator('.modal')).toContainText('campagne, account e diari del gruppo');
  const closed = first.app.waitForEvent('close');
  await page.getByRole('button', { name: 'Ripristina e riavvia' }).click();
  await closed;

  // the app starts again on the restored data
  const second = await launchApp({ hostPort: 4596, profile: first.profile });
  await expect(second.page.getByText(', Custode')).toBeVisible();
  await nav(second.page, 'Campagne');
  await expect(second.page.getByText('La Torre Spezzata')).toBeVisible();
  expect(first.errors, first.errors.join('\n')).toEqual([]);
  expect(second.errors, second.errors.join('\n')).toEqual([]);
  await second.app.close();
});

import { expect, test } from '@playwright/test';
import { launchApp, nav, register, apiCall } from './app';

test('the GM generates a playable map', async () => {
  const gm = await launchApp({ hostPort: 4600 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Sotterranei', systemId: 'dnd5e-2024' });
  await G.reload();
  await expect(G.getByText(', Marco')).toBeVisible();
  await nav(G, 'Campagne');
  await G.getByText('Sotterranei').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Genera una mappa' }).click();
  const dialog = G.getByRole('dialog', { name: 'Genera una mappa' });
  await expect(dialog.getByLabel('Anteprima della mappa')).toBeVisible();
  // another variant, then a cave, then back to a dungeon
  await dialog.getByRole('button', { name: /Un’altra/ }).click();
  await dialog.getByRole('radio', { name: 'Caverna' }).click();
  await expect(dialog).toContainText('Gallerie naturali');
  await dialog.getByRole('radio', { name: 'Dungeon' }).click();
  await expect(dialog).toContainText(/\d+ porte/);
  await dialog.getByRole('button', { name: 'Crea la scena' }).click();
  await expect(dialog).toHaveCount(0);
  // the new scene is the active one, dark and walled
  await expect(G.locator('.table-title')).toContainText('Dungeon 1');
  await G.keyboard.press('l');
  await expect(G.getByRole('complementary', { name: 'Editor mappa' }).getByRole('switch', { name: 'Visione dinamica' })).toHaveAttribute('aria-checked', 'true');
  await G.keyboard.press('e');
  // one step to undo the whole generation
  await G.keyboard.press('Control+z');
  await expect(G.locator('.toast', { hasText: /Annullato/ })).toBeVisible();
  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

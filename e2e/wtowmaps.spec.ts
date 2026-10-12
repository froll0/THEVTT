import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the maps of the Warhammer book become scenes in one click', async () => {
  const gm = await launchApp({ hostPort: 4615 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Talagaad', systemId: 'wtow' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Talagaad').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  await G.getByTitle('Editor mappa: terreno, muri, porte, oggetti, luci (E)').click();
  await G.getByTitle('Libreria di mappe: salva questa, o usane una già pronta').click();
  const book = G.getByRole('list', { name: 'Mappe del manuale' });
  await expect(book.getByRole('listitem')).toHaveCount(2);
  await book.getByRole('listitem', { name: 'Talabheim e dintorni' }).getByTitle('Usala in questa campagna').click();
  await expect(G.locator('.toast', { hasText: '«Talabheim e dintorni» è una nuova scena' })).toBeVisible();
  await expect(G.getByLabel('Scena da modificare')).toContainText('Talabheim e dintorni');
  expect(gm.errors).toEqual([]);
  await gm.app.close();
});

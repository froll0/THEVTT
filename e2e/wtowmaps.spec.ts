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

test('Talagaad as a scene, a Tetro Presagio prepared and a day on the road', async () => {
  const gm = await launchApp({ hostPort: 4624 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Talagaad', systemId: 'wtow' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Talagaad', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  await G.getByTitle('Talagaad e viaggi').click();
  await G.getByRole('button', { name: 'Crea la scena di Talagaad' }).click();
  await expect(G.getByRole('button', { name: 'La scena di Talagaad c’è già' })).toBeDisabled();
  await G.locator('.omen-card', { hasText: 'Dalle Ceneri' }).getByRole('button', { name: 'Prepara' }).click();
  await expect(G.locator('.toast', { hasText: 'nota per il master e missione nascosta pronte' })).toBeVisible();

  await G.getByLabel('A', { exact: true }).fill('Küsel');
  await G.getByRole('button', { name: 'Si parte' }).click();
  await G.getByLabel('Pericolo di oggi').selectOption('');
  await G.getByRole('button', { name: 'Un giorno di viaggio' }).click();
  await expect(G.getByLabel('Ora del mondo: Giorno 2 · 08:00')).toBeVisible();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText('Giorno di viaggio 1/3');

  await G.getByTitle('Scene').click();
  await expect(G.getByText('Talagaad', { exact: true }).last()).toBeVisible();
  await G.getByTitle('Note e dispense').click();
  await expect(G.locator('.note-row', { hasText: 'Tetro Presagio: Dalle Ceneri' })).toBeVisible();
  expect(gm.errors).toEqual([]);
  await gm.app.close();
});

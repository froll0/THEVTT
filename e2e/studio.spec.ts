import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the map studio: a world shaped by hand and a dungeon, both used at the table', async () => {
  const gm = await launchApp({ hostPort: 4652 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });

  // a world, generated to start with
  await nav(G, 'Mappe');
  await G.getByRole('button', { name: 'Nuovo mondo' }).first().click();
  await G.getByRole('dialog').getByLabel('Nome').fill('Aldoria');
  await G.getByRole('dialog').getByRole('button', { name: 'Isole' }).click();
  await G.getByRole('dialog').getByRole('button', { name: 'Crea' }).click();
  const canvas = G.getByTestId('world-canvas');
  await expect(canvas).toBeVisible();
  await expect(G.getByLabel('Nome del mondo')).toHaveValue('Aldoria');
  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  // a mountain raised by hand, and taken back
  await G.keyboard.press('b');
  await G.getByRole('button', { name: 'Alza' }).click();
  await G.mouse.move(at(0.3, 0.4).x, at(0.3, 0.4).y);
  await G.mouse.down();
  await G.mouse.move(at(0.4, 0.45).x, at(0.4, 0.45).y, { steps: 8 });
  await G.mouse.up();
  await expect(G.getByRole('button', { name: 'Annulla' })).toBeEnabled();
  await G.keyboard.press('Control+z');
  await G.keyboard.press('Control+y');

  // a label with its own name, then changed
  await G.keyboard.press('t');
  await G.getByLabel('Testo della scritta').fill('Mare delle Brume');
  await G.mouse.click(at(0.5, 0.15).x, at(0.5, 0.15).y);
  await G.keyboard.press('v');
  await expect(G.getByLabel('Testo', { exact: true })).toHaveValue('Mare delle Brume');
  await G.getByLabel('Curvatura').fill('0.4');
  // a road of three points
  await G.keyboard.press('s');
  for (const [fx, fy] of [[0.3, 0.5], [0.4, 0.55], [0.5, 0.5]] as const) await G.mouse.click(at(fx, fy).x, at(fx, fy).y);
  await G.keyboard.press('Enter');
  await expect(G.getByRole('button', { name: 'Togli' })).toBeVisible();
  // a pin with notes
  await G.keyboard.press('n');
  await G.mouse.click(at(0.6, 0.6).x, at(0.6, 0.6).y);
  await G.getByLabel('Titolo del segnaposto').fill('La torre del mago');
  await G.getByLabel('Note del segnaposto').fill('Qui vive Ostrega, che sa dove si trova la Corona.');

  // the map's style and a hex grid, as at the table
  await G.getByRole('button', { name: 'Mappa', exact: true }).click();
  await G.getByRole('button', { name: 'Pergamena' }).click();
  await G.getByRole('button', { name: 'Esagoni' }).click();
  // a new ground from the generator keeps what was placed by hand
  await G.getByRole('button', { name: 'Genera', exact: true }).click();
  await G.getByRole('dialog', { name: 'Genera il mondo' }).getByRole('button', { name: 'Arcipelago' }).click();
  await expect(G.getByRole('img', { name: 'Anteprima del mondo' })).toBeVisible();
  await G.getByRole('button', { name: 'Usa questa terra' }).click();
  await G.keyboard.press('v');
  await G.mouse.click(at(0.6, 0.6).x, at(0.6, 0.6).y - 12);
  await expect(G.getByLabel('Titolo del segnaposto')).toHaveValue('La torre del mago');

  // to the table's library, then back to the studio's
  await G.getByRole('button', { name: 'Usa al tavolo' }).click();
  await expect(G.locator('.toast', { hasText: 'Nella libreria delle mappe' })).toBeVisible();
  await G.getByRole('button', { name: 'Mappe', exact: true }).first().click();
  await expect(G.locator('.map-tile', { hasText: 'Aldoria' })).toHaveCount(2);

  // a dungeon map, painted in the studio with the table's own editor
  await G.getByRole('button', { name: 'Nuova mappa' }).first().click();
  await G.getByRole('dialog').getByLabel('Nome').fill('La cripta sotto il mulino');
  await G.getByRole('dialog').getByRole('button', { name: 'Crea' }).click();
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await expect(ed).toBeVisible();
  await expect(G.getByLabel('Nome della mappa')).toHaveValue('La cripta sotto il mulino');
  const board = (await G.locator('.board canvas').boundingBox())!;
  const bt = (fx: number, fy: number) => ({ x: board.x + board.width * fx, y: board.y + board.height * fy });
  await ed.getByRole('radio', { name: 'Roccia' }).click();
  await ed.getByRole('radio', { name: 'Riempi' }).click();
  await G.mouse.click(bt(0.5, 0.5).x, bt(0.5, 0.5).y);
  await ed.getByRole('radio', { name: 'Pietra' }).click();
  await ed.getByRole('radio', { name: 'Rettangolo' }).click();
  await G.mouse.move(bt(0.35, 0.35).x, bt(0.35, 0.35).y);
  await G.mouse.down();
  await G.mouse.move(bt(0.6, 0.65).x, bt(0.6, 0.65).y, { steps: 6 });
  await G.mouse.up();
  await expect(G.getByText('Salvata nella libreria')).toBeVisible({ timeout: 10_000 });
  await G.getByRole('button', { name: 'Mappe', exact: true }).first().click();
  await expect(G.locator('.map-tile', { hasText: 'La cripta sotto il mulino' })).toBeVisible();
  // the world travels as a file too
  expect(readdirSync(join(gm.profile, 'data')).some((f) => /^world-(?!library).*\.json$/.test(f))).toBe(true);

  // at the table: both in the library, the dungeon becomes a scene
  await apiCall(G, 'POST', '/campaigns', { name: 'Le isole perdute', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Le isole perdute').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await expect(lib.getByRole('listitem', { name: 'Aldoria' })).toBeVisible();
  await lib.getByRole('listitem', { name: 'La cripta sotto il mulino' }).getByRole('button', { name: 'Usa qui' }).click();
  await expect(G.locator('.toast', { hasText: 'nuova scena di questa campagna' })).toBeVisible();
  await expect(G.getByRole('status').filter({ hasText: 'lavori in privato' })).toContainText('La cripta sotto il mulino');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

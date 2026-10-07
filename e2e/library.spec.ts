import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('a map prepared in one campaign is used in another, and travels as a file', async () => {
  const gm = await launchApp({ hostPort: 4608 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Prima campagna', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Seconda campagna', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Prima campagna').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  // a monster on the map, then a crypt painted around it
  await G.getByTitle('Aggiungi token').click();
  await G.keyboard.press('Escape');
  await G.keyboard.press('b');
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await ed.getByLabel('Nome', { exact: true }).fill('Cripta di Varos');
  await ed.getByLabel('Nome', { exact: true }).press('Tab');
  await ed.getByRole('radio', { name: 'Roccia' }).click();
  await ed.getByRole('radio', { name: 'Riempi' }).click();
  await G.mouse.click(at(0.5, 0.5).x, at(0.5, 0.5).y);
  await ed.getByRole('radio', { name: 'Pietra' }).click();
  await ed.getByRole('radio', { name: 'Rettangolo' }).click();
  await G.mouse.move(at(0.3, 0.3).x, at(0.3, 0.3).y);
  await G.mouse.down();
  await G.mouse.move(at(0.6, 0.7).x, at(0.6, 0.7).y, { steps: 6 });
  await G.mouse.up();
  await G.keyboard.press('o');
  await ed.getByRole('radio', { name: 'Forziere' }).click();
  await G.mouse.click(at(0.45, 0.5).x, at(0.45, 0.5).y);

  // into the library, with its monster
  await ed.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await expect(lib).toContainText('La libreria è vuota');
  await lib.getByRole('switch', { name: 'Con mostri e PNG' }).click();
  await lib.getByRole('button', { name: 'Salva nella libreria' }).click();
  const card = lib.getByRole('listitem', { name: 'Cripta di Varos' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('1 oggetto');
  await expect(card).toContainText('1 creatura');
  await lib.getByRole('button', { name: 'Chiudi' }).click();
  await G.getByRole('button', { name: 'Fine', exact: true }).click();

  // another campaign: the map is there, ready
  await G.getByTitle('Chiudi la sessione').click();
  await nav(G, 'Campagne');
  await G.getByText('Seconda campagna').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib2 = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await lib2.getByRole('listitem', { name: 'Cripta di Varos' }).getByRole('button', { name: 'Usa qui' }).click();
  // it opens in the editor, in private: the players are still on their scene
  await expect(G.getByRole('status').filter({ hasText: 'lavori in privato' })).toContainText('Cripta di Varos');
  await expect(G.locator('.toast', { hasText: 'nuova scena di questa campagna' })).toBeVisible();
  // one undo and it's gone
  await G.keyboard.press('Control+z');
  await expect(G.locator('.toast', { hasText: 'Annullato: mappa dalla libreria' })).toBeVisible();

  // a map file from another GM joins the library
  const file = readdirSync(join(gm.profile, 'data')).find((f) => /^map-(?!library).*\.json$/.test(f))!;
  await G.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib3 = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await lib3.getByLabel('Importa mappe da file').setInputFiles(join(gm.profile, 'data', file));
  await expect(lib3.getByRole('listitem', { name: 'Cripta di Varos' })).toHaveCount(2);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

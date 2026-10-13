import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('a Dungeondraft map comes in with walls, doors and lights; its grid lined up in two clicks', async () => {
  const gm = await launchApp({ hostPort: 4615 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Sotterranei', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Sotterranei').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  // the .dd2vtt file joins the library
  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await lib.getByLabel('Importa mappe da file').setInputFiles(fileURLToPath(new URL('./fixtures/cripta.dd2vtt', import.meta.url)));
  const card = lib.getByRole('listitem', { name: 'cripta' });
  await expect(card).toContainText('1 porta');
  await expect(card).toContainText('1 oggetto');
  await card.getByRole('button', { name: 'Usa qui' }).click();
  await expect(G.getByRole('status').filter({ hasText: 'lavori in privato' })).toContainText('cripta');

  // its grid, pointed at on the picture: two corners of a block of 2 × 2 squares
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await ed.getByRole('button', { name: 'Allinea con due clic' }).click();
  const cal = G.getByRole('dialog', { name: 'Allinea la griglia' });
  const img = cal.getByRole('img', { name: 'La mappa' });
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(640);
  // its size on screen (the dialog may still be growing in: the layout size, not the box)
  const shown = await img.evaluate((i: HTMLImageElement) => i.clientWidth);
  // the picture is 640 px wide, squares of 64: corners at 128 and 256
  const px = (v: number) => (v / 640) * shown;
  await img.click({ position: { x: px(128), y: px(128) } });
  await img.click({ position: { x: px(256), y: px(256) } });
  await cal.getByLabel('Quadretti per lato').fill('2');
  await expect(cal).toContainText(/6[34](\.\d+)? pixel per quadretto/);
  await cal.getByRole('button', { name: 'Applica' }).click();
  const field = ed.getByLabel('Pixel per casella');
  await expect.poll(async () => Math.abs(Number(await field.inputValue()) - 64)).toBeLessThan(1.5);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

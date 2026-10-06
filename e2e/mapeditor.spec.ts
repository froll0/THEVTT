import { expect, test, type Page } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

/** brightness of the board at a point of the screen */
async function shade(page: Page, x: number, y: number): Promise<number> {
  return page.evaluate(
    ([sx, sy]) => {
      const c = document.querySelector('.board canvas') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const k = c.width / r.width;
      const [R, G, B] = c.getContext('2d')!.getImageData(Math.round((sx! - r.left) * k), Math.round((sy! - r.top) * k), 1, 1).data;
      return (R! + G! + B!) / 3;
    },
    [x, y],
  );
}

test('the GM paints a map at the table and the players see it', async () => {
  const gm = await launchApp({ hostPort: 4602 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4602' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Fortezza', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();
  await nav(G, 'Campagne');
  await G.getByText('Fortezza').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await nav(P, 'Campagne');
  await P.getByText('Fortezza').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  const box = (await G.locator('.board canvas').boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  const drag = async (a: { x: number; y: number }, b: { x: number; y: number }) => {
    await G.mouse.move(a.x, a.y);
    await G.mouse.down();
    await G.mouse.move(b.x, b.y, { steps: 8 });
    await G.mouse.up();
  };

  await G.keyboard.press('b');
  const tools = G.getByRole('toolbar', { name: 'Dipingi la mappa' });
  await expect(tools).toBeVisible();
  // solid rock everywhere, then a room of stone carved in it
  await tools.getByRole('radio', { name: 'Roccia' }).click();
  await tools.getByRole('button', { name: 'Riempi' }).click();
  const c = at(0.5, 0.55);
  await G.mouse.click(c.x, c.y);
  await expect(G.getByRole('button', { name: 'Annulla' })).toHaveAttribute('title', /mappa/);
  await tools.getByRole('radio', { name: 'Pietra' }).click();
  await tools.getByRole('button', { name: 'Rettangolo' }).click();
  await drag(at(0.3, 0.35), at(0.6, 0.7));
  // a stream across it with the brush
  await tools.getByRole('radio', { name: 'Acqua', exact: true }).click();
  await tools.getByRole('button', { name: 'Pennello' }).click();
  await drag(at(0.33, 0.6), at(0.57, 0.6));
  // the rock gave the room its walls
  await G.getByTitle('Luci e visione (L)').click();
  await expect(G.getByRole('button', { name: /Visione dinamica attiva/ })).toBeVisible();
  // for this check the players see the whole map
  await G.getByRole('button', { name: /Visione dinamica attiva/ }).click();
  await expect(G.getByRole('button', { name: /Visione dinamica spenta/ })).toBeVisible();

  // the player's table shows the same painting: light stone inside, dark rock outside
  const room = at(0.45, 0.45);
  const rock = at(0.8, 0.85);
  await expect.poll(async () => (await shade(P, room.x, room.y)) - (await shade(P, rock.x, rock.y)), { timeout: 15_000 }).toBeGreaterThan(40);

  // the stream goes with one undo
  await G.keyboard.press('Control+z');
  await expect(G.locator('.toast', { hasText: 'Annullato: modifica della scena' })).toBeVisible();
  await G.keyboard.press('Control+z');
  await expect(G.locator('.toast', { hasText: 'Annullato: mappa' })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

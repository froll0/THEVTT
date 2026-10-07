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

  // the map editor: only the tools that make a map
  await G.getByRole('button', { name: 'Editor mappa', exact: true }).first().click();
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await expect(ed).toBeVisible();
  await expect(G.getByRole('status').filter({ hasText: 'i giocatori vedono le modifiche dal vivo' })).toBeVisible();
  await expect(G.locator('.dicebar')).toHaveCount(0);
  // solid rock everywhere, then a room of stone carved in it
  await ed.getByRole('radio', { name: 'Roccia' }).click();
  await ed.getByRole('radio', { name: 'Riempi' }).click();
  const c = at(0.5, 0.55);
  await G.mouse.click(c.x, c.y);
  await expect(G.getByRole('button', { name: 'Annulla' })).toHaveAttribute('title', /mappa/);
  await ed.getByRole('radio', { name: 'Pietra' }).click();
  await ed.getByRole('radio', { name: 'Rettangolo' }).click();
  await drag(at(0.3, 0.35), at(0.6, 0.7));
  // a pond (ellipse) and a stream (line) across it
  await ed.getByRole('radio', { name: 'Acqua', exact: true }).click();
  await ed.getByRole('radio', { name: 'Ellisse' }).click();
  await drag(at(0.32, 0.4), at(0.38, 0.5));
  await ed.getByRole('radio', { name: 'Linea' }).click();
  await drag(at(0.33, 0.6), at(0.57, 0.6));
  // the eyedropper takes the stone back
  await ed.getByRole('radio', { name: 'Contagocce' }).click();
  const st = at(0.5, 0.45);
  await G.mouse.click(st.x, st.y);
  await expect(ed.getByRole('radio', { name: 'Pietra' })).toHaveAttribute('aria-checked', 'true');
  await expect(ed.getByRole('radio', { name: 'Pennello' })).toHaveAttribute('aria-checked', 'true');
  // a door on the side of a cell, with one click
  await G.keyboard.press('w');
  await ed.getByRole('radio', { name: 'Porta' }).click();
  await expect(ed.getByRole('radio', { name: 'Sul lato' })).toHaveAttribute('aria-checked', 'true');
  const top = at(0.45, 0.35);
  await G.mouse.click(top.x, top.y);
  // a torch, previewed and placed
  await G.keyboard.press('l');
  await ed.getByRole('radio', { name: /Torcia/ }).click();
  // the rock gave the room its walls, and walls turn dynamic vision on
  const vision = ed.getByRole('switch', { name: 'Visione dinamica' });
  await expect(vision).toHaveAttribute('aria-checked', 'true');
  // for this check the players see the whole map
  await vision.click();
  await expect(vision).toHaveAttribute('aria-checked', 'false');

  // the player's table shows the same painting: light stone inside, dark rock outside
  const room = at(0.5, 0.45);
  const rock = at(0.8, 0.85);
  await expect.poll(async () => (await shade(P, room.x, room.y)) - (await shade(P, rock.x, rock.y)), { timeout: 15_000 }).toBeGreaterThan(25);

  // the next scene, prepared in private
  await ed.getByRole('button', { name: 'Nuova scena vuota' }).click();
  await ed.getByLabel('Nome della nuova scena').fill('Cripta');
  await ed.getByRole('radio', { name: 'Tutta roccia' }).click();
  await ed.getByRole('button', { name: 'Crea e modifica' }).click();
  await expect(G.getByRole('status').filter({ hasText: 'lavori in privato' })).toContainText('Cripta');
  await G.keyboard.press('b');
  await ed.getByRole('radio', { name: 'Rettangolo' }).click();
  await drag(at(0.4, 0.4), at(0.55, 0.6));
  await G.keyboard.press('o');
  await ed.getByRole('radio', { name: 'Forziere' }).click();
  const chest = at(0.47, 0.5);
  await G.mouse.click(chest.x, chest.y);
  // the players are still where they were
  await expect(P.locator('.table-title')).toContainText('Scena 1');
  await G.getByRole('button', { name: 'Mostra ai giocatori' }).click();
  await expect(P.locator('.table-title')).toContainText('Cripta');
  await expect(G.getByRole('status').filter({ hasText: 'dal vivo' })).toBeVisible();

  // walls around buildings, on by default, can be switched off
  await G.keyboard.press('b');
  const buildings = ed.getByRole('switch', { name: 'Muri attorno agli edifici' });
  await expect(buildings).toHaveAttribute('aria-checked', 'true');
  await buildings.click();
  await expect(buildings).toHaveAttribute('aria-checked', 'false');
  await buildings.click();

  // undo works in the editor too, then back to the game
  await G.keyboard.press('Control+z');
  await expect(G.locator('.toast', { hasText: /Annullato/ })).toBeVisible();
  await G.getByRole('button', { name: 'Fine', exact: true }).click();
  await expect(ed).toHaveCount(0);
  await expect(G.locator('.dicebar')).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

import { expect, test, type Page } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

/** a finger on the map: pointer events as a touch screen sends them */
async function finger(page: Page, type: 'pointerdown' | 'pointermove' | 'pointerup', id: number, x: number, y: number) {
  await page.locator('.board canvas').evaluate(
    (el, { type, id, x, y }) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: id === 1, button: 0, buttons: type === 'pointerup' ? 0 : 1 })),
    { type, id, x, y },
  );
}
const tap = async (page: Page, x: number, y: number) => {
  await finger(page, 'pointerdown', 1, x, y);
  await finger(page, 'pointerup', 1, x, y);
};

test('by touch: a tap moves the selected token, two fingers pinch to zoom', async () => {
  const gm = await launchApp({ hostPort: 4669 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Dita', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Dita', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Bestiario').click();
  // added, the goblin is selected: a tap on the map sends it there
  await expect(G.locator('.inspector input').first()).toHaveValue('Guerriero goblin');
  const box = (await G.locator('.board canvas').boundingBox())!;
  const cx = box.x + box.width / 3;
  const cy = box.y + box.height / 2;
  await tap(G, cx + 210, cy);
  await G.keyboard.press('Escape');
  await expect(G.locator('.inspector')).toHaveCount(0);
  // it is where the finger was
  await tap(G, cx + 210, cy);
  await expect(G.locator('.inspector input').first()).toHaveValue('Guerriero goblin');
  await G.keyboard.press('Escape');

  // pinch out around the goblin: it stays under the fingers, the map grows (taps 1.5 cells off now miss it… unless zoomed)
  await tap(G, cx + 210 + 105, cy);
  await expect(G.locator('.inspector')).toHaveCount(0);
  await finger(G, 'pointerdown', 1, cx + 170, cy);
  await finger(G, 'pointerdown', 2, cx + 250, cy);
  for (let i = 1; i <= 8; i++) {
    await finger(G, 'pointermove', 1, cx + 170 - i * 10, cy);
    await finger(G, 'pointermove', 2, cx + 250 + i * 10, cy);
  }
  await finger(G, 'pointerup', 1, cx + 90, cy);
  await finger(G, 'pointerup', 2, cx + 330, cy);
  // twice as big: 1.5 cells off the goblin's middle is now inside it
  await tap(G, cx + 210 + 60, cy);
  await expect(G.locator('.inspector input').first()).toHaveValue('Guerriero goblin');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

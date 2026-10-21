import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('fog painted by hand: a lasso reveals a goblin to the players, a brush hides it again', async () => {
  const gm = await launchApp({ hostPort: 4665 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4665' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Grotte', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();
  await nav(G, 'Campagne');
  await G.getByText('Grotte', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await nav(P, 'Campagne');
  await P.getByText('Grotte', { exact: true }).click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.getByTitle('Chat e tiri')).toBeVisible();

  // a goblin, everything covered, the goblin in the initiative
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Nebbia di guerra').click();
  await G.getByRole('button', { name: 'Copri tutto' }).click();
  await G.getByTitle('Iniziativa', { exact: true }).click();
  await G.getByRole('button', { name: 'Tira per tutti i token' }).click();
  await P.getByTitle('Iniziativa', { exact: true }).click();
  await expect(P.locator('.ini-row', { hasText: 'Guerriero goblin' })).toHaveCount(0);

  // a lasso drawn around the goblin: it comes out of the fog (panels closed, the map in view)
  await G.getByTitle('Iniziativa', { exact: true }).click();
  await G.keyboard.press('Escape');
  await expect(G.locator('.inspector')).toHaveCount(0);
  await G.getByTitle('Nebbia di guerra').click();
  await G.getByRole('button', { name: 'Rivela', exact: true }).click();
  await G.getByRole('button', { name: 'Lazo' }).click();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = Math.min(box.width, box.height) * 0.45;
  await G.mouse.move(cx + r, cy);
  await G.mouse.down();
  for (let a = 0; a <= 360; a += 15) await G.mouse.move(cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180));
  await G.mouse.up();
  await expect(P.locator('.ini-row', { hasText: 'Guerriero goblin' })).toBeVisible();

  // a wide brush across it: covered again
  await G.getByRole('button', { name: 'Copri', exact: true }).click();
  await G.getByRole('button', { name: 'Pennello' }).click();
  await G.getByRole('slider', { name: 'Raggio del pennello' }).fill('6');
  await G.mouse.move(cx - r, cy);
  await G.mouse.down();
  await G.mouse.move(cx + r, cy, { steps: 12 });
  await G.mouse.move(cx + r, cy + r / 2, { steps: 4 });
  await G.mouse.move(cx - r, cy + r / 2, { steps: 12 });
  await G.mouse.move(cx - r, cy - r / 2, { steps: 4 });
  await G.mouse.move(cx + r, cy - r / 2, { steps: 12 });
  await G.mouse.up();
  await expect(P.locator('.ini-row', { hasText: 'Guerriero goblin' })).toHaveCount(0);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await gm.app.close();
  await pl.app.close();
});

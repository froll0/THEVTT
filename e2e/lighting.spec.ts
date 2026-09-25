import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';
test('walls, doors, props and dynamic light', async () => {
  const gm = await launchApp({ hostPort: 4592 });
  const pl = await launchApp();
  const G = gm.page, P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4592' }, username: 'giulia', displayName: 'Giulia' });
  const gmUser = await apiCall<{ id: string }>(G, 'GET', '/me');
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  await apiCall(G, 'POST', '/friends/requests', { username: 'giulia' });
  await apiCall(P, 'POST', `/friends/${gmUser.id}/accept`);
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Cripta', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload(); await P.reload();
  await nav(G, 'Campagne'); await G.getByText('Cripta').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await nav(P, 'Campagne'); await P.getByText('Cripta').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  // close the dock to have room
  const box = (await G.locator('.board canvas').boundingBox())!;
  // GM: a room with walls via "Stanza", and a door
  await G.getByTitle('Muri e porte (W)').click();
  await G.getByRole('button', { name: 'Stanza' }).click();
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  let a = at(0.2, 0.2), b = at(0.6, 0.75);
  await G.mouse.move(a.x, a.y); await G.mouse.down(); await G.mouse.move(b.x, b.y, { steps: 5 }); await G.mouse.up();
  // an inner wall with a door
  await G.getByRole('button', { name: 'Linea' }).click();
  a = at(0.4, 0.2); b = at(0.4, 0.45);
  await G.mouse.click(a.x, a.y); await G.mouse.click(b.x, b.y); await G.keyboard.press('Escape');
  await G.getByRole('button', { name: 'Porta' }).click();
  await G.getByLabel('Nuove porte').selectOption('locked');
  a = at(0.4, 0.45); b = at(0.4, 0.55);
  await G.mouse.click(a.x, a.y); await G.mouse.click(b.x, b.y); await G.keyboard.press('Escape');
  await G.getByRole('button', { name: 'Muro', exact: true }).click();
  a = at(0.4, 0.55); b = at(0.4, 0.75);
  await G.mouse.click(a.x, a.y); await G.mouse.click(b.x, b.y); await G.keyboard.press('Escape');
  // props
  await G.getByTitle('Oggetti di scena (O)').click();
  for (const [name, fx, fy] of [['Falò', 0.5, 0.35], ['Colonna', 0.3, 0.6], ['Tavolo', 0.28, 0.3], ['Forziere', 0.55, 0.65], ['Albero', 0.75, 0.4], ['Barile', 0.32, 0.4]] as const) {
    await G.locator('.props-palette').getByRole('button', { name, exact: true }).click();
    const p = at(fx, fy);
    await G.mouse.click(p.x, p.y);
  }
  // monsters: one in each room
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Scheletro' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Seleziona e sposta (V)').click();
  // a label on the map
  await G.getByTitle('Disegna (D)').click();
  await G.getByTitle('Testo (T): clic sulla mappa e scrivi').click();
  const lbl = at(0.25, 0.85);
  await G.mouse.click(lbl.x, lbl.y);
  await G.getByLabel('Testo sulla mappa').fill('Cripta di Varos');
  await G.getByLabel('Testo sulla mappa').press('Enter');
  await expect(G.getByLabel('Testo sulla mappa')).toHaveCount(0);
  // lights and vision from their own tool
  await G.getByTitle('Luci e visione (L)').click();
  await G.getByRole('button', { name: /Visione dinamica spenta/ }).click();
  await G.getByRole('button', { name: 'Buio', exact: true }).click();
  await G.getByTitle('Seleziona e sposta (V)').click();
  await G.getByRole('button', { name: /Vista master/ }).click();
  await expect(G.getByRole('button', { name: /Vista giocatori/ })).toBeVisible();
  // a player with no token on a scene with dynamic vision is told why it's dark
  await expect(P.locator('.board-hint', { hasText: 'Visione dinamica' })).toBeVisible();
  // a token for the player, with a torch
  await G.getByTitle('Aggiungi token').click();
  await G.getByRole('button', { name: 'Giulia' }).click();
  await G.locator('.inspector').getByLabel('Luce').selectOption('torch');
  // the GM picks the locked door, unlocks and opens it
  const d = at(0.4, 0.5);
  await G.getByTitle('Seleziona e sposta (V)').click();
  await G.keyboard.press('Escape');
  await G.mouse.click(d.x, d.y);
  const door = G.locator('.inspector', { hasText: 'Porta' });
  await expect(door.getByRole('button', { name: 'Apri la porta' })).toBeDisabled();
  await door.getByRole('switch').click();
  await door.getByRole('button', { name: 'Apri la porta' }).click();
  await expect(door.getByRole('button', { name: 'Chiudi la porta' })).toBeVisible();
  // with a token on the map the hint goes away
  await expect(P.locator('.board-hint')).toHaveCount(0);
  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close(); await gm.app.close();
});

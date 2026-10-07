import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('combat from the sheet: an attack against the AC, a fireball placed on the map, timed conditions', async () => {
  const gm = await launchApp({ hostPort: 4611 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4611' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Scontro', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  const wizard = {
    level: 5,
    classId: 'wizard',
    speciesId: 'human',
    backgroundId: 'sage',
    baseScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    backgroundBonus: { int: 2, con: 1 },
    spells: ['fireball'],
    inventory: [{ uid: 'a', ref: 'dagger', name: 'Pugnale', qty: 1, weight: 1, equipped: true }],
  };
  const ch = await apiCall<{ id: string }>(P, 'POST', '/characters', { name: 'Elara', systemId: 'dnd5e-2024', data: wizard });
  await apiCall(P, 'PUT', `/campaigns/${camp.id}/character`, { characterId: ch.id });

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Scontro').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Scontro').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();

  // Elara on the map, then a creature, selected
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Elara' }).click();
  const sheet = G.getByRole('dialog', { name: 'Elara' });
  await sheet.getByRole('button', { name: 'Metti sulla mappa' }).click();
  await G.getByTitle('Aggiungi token').click();
  const inspector = G.locator('.inspector');
  await expect(inspector).toBeVisible();

  // the dagger against the creature's AC: hit or miss in the chat
  await sheet.locator('.sheet-tabs button', { hasText: 'Combattimento' }).click();
  await sheet.locator('.attack', { hasText: 'Pugnale' }).getByRole('button', { name: /^[+-]\d+$/ }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText(/Pugnale → PNG: (colpito|mancato|colpo critico!|1 naturale, mancato)/);
  // the player sees the outcome, not the creature's AC
  await expect(P.locator('.log')).toContainText('Pugnale → PNG');

  // a fireball: the area follows the pointer and says who's in it, a click puts it down
  await sheet.locator('.sheet-tabs button', { hasText: 'Incantesimi' }).click();
  await sheet.locator('details.spell', { hasText: 'Palla di fuoco' }).getByRole('button', { name: /Lancia/ }).click();
  await expect(G.locator('.toast', { hasText: 'Clicca sulla mappa per posarla' })).toBeVisible();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await G.mouse.move(center.x - 30, center.y - 30);
  await G.mouse.move(center.x, center.y, { steps: 4 });
  await G.mouse.click(center.x, center.y);
  await expect(G.locator('.log')).toContainText(/Palla di fuoco: nell’area .*PNG/);
  await expect(G.locator('.log')).toContainText('Palla di fuoco · danni');

  // a condition for two rounds
  await G.getByTitle('Seleziona e sposta (V)').click();
  await G.keyboard.press('Escape');
  await G.getByTitle('Aggiungi token').click();
  await inspector.getByRole('button', { name: /Avvelenato/ }).click();
  await inspector.getByLabel('Durata di Avvelenato').selectOption('2');
  await expect(inspector.getByRole('button', { name: /Avvelenato · 2/ })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

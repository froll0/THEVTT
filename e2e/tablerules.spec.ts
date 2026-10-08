import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('table rules: group saves with immunities, legendary actions, turn economy, rests', async () => {
  const gm = await launchApp({ hostPort: 4614 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4614' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Tana', systemId: 'dnd5e-2024' });
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
  };
  const ch = await apiCall<{ id: string }>(P, 'POST', '/characters', { name: 'Elara', systemId: 'dnd5e-2024', data: wizard });
  await apiCall(P, 'PUT', `/campaigns/${camp.id}/character`, { characterId: ch.id });

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Tana').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Tana').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();

  // Elara and a red dragon on the map
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Elara' }).click();
  const sheet = G.getByRole('dialog', { name: 'Elara' });
  await sheet.getByRole('button', { name: 'Metti sulla mappa' }).click();
  await sheet.getByRole('button', { name: 'Riduci' }).click();
  await G.getByTitle('Bestiario').click();
  await G.getByPlaceholder(/Cerca per nome/).fill('Drago rosso adulto');
  await G.locator('.rows .r', { hasText: 'Drago rosso adulto' }).getByTitle('Aggiungi al tavolo').click();
  const inspector = G.locator('.inspector');
  // its immunity, ready on the token
  await expect(inspector.getByRole('button', { name: 'Togli fuoco da Immune' })).toBeVisible();

  // its legendary actions on the bar, spent and counted
  const bar = G.getByRole('toolbar', { name: 'Macro' });
  await expect(bar).toContainText('Leggendarie 3/3');
  await bar.getByRole('button', { name: /Presenza imperiosa/ }).click();
  await expect(bar).toContainText('Leggendarie 1/3');
  await expect(bar.getByRole('button', { name: /Presenza imperiosa/ })).toBeDisabled();
  await expect(P.locator('.log')).toContainText('usa Presenza imperiosa (leggendaria)');

  // everyone on the map rolls a Dexterity save against fire: the dragon shrugs it off
  const box = (await G.locator('.board canvas').boundingBox())!;
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await G.keyboard.press('Escape');
  await G.keyboard.down('Shift');
  await G.mouse.move(c.x - 300, c.y - 250);
  await G.mouse.down();
  await G.mouse.move(c.x + 200, c.y + 250, { steps: 8 });
  await G.mouse.up();
  await G.keyboard.up('Shift');
  const groupBar = G.getByRole('region', { name: 'Selezione multipla' });
  await groupBar.getByRole('button', { name: 'Tiro salvezza' }).click();
  const form = groupBar.getByRole('form', { name: 'Tiro salvezza di gruppo' });
  await form.getByLabel('Nome del tiro salvezza').fill('Pioggia di fuoco');
  await form.getByLabel('Classe difficoltà').fill('15');
  await form.getByLabel('Danni').fill('4d6');
  await form.getByLabel('Tipo di danno').selectOption('fuoco');
  await form.getByRole('button', { name: 'Tira per 2' }).click();
  const card = P.locator('.log .log-card', { hasText: 'Pioggia di fuoco' }).last();
  await expect(card).toContainText('Tiro salvezza su Destrezza, CD 15');
  await expect(card).toContainText(/Drago rosso adulto: \d+ — (riuscito|fallito), nessun danno \(immune\)/);
  await expect(card).toContainText(/Elara: \d+ — (riuscito, \d+ danni \(metà\)|fallito, \d+ danni)/);
  // the player sees it too, and her sheet follows her token
  await expect(P.locator('.log')).toContainText('Pioggia di fuoco');
  const sheetHp = () => apiCall<{ data: { hp?: { current: number | null } } }[]>(P, 'GET', '/characters').then((l) => l[0]?.data.hp?.current);
  await expect.poll(sheetHp, { timeout: 10_000 }).toEqual(expect.any(Number));

  // turns: action, bonus action, reaction
  await G.keyboard.press('Escape');
  await G.getByTitle('Iniziativa', { exact: true }).click();
  await G.getByRole('button', { name: 'Tira per tutti i token' }).click();
  await G.getByRole('button', { name: 'Inizia', exact: true }).click();
  const elaraRow = G.locator('.ini-row', { hasText: 'Elara' });
  await elaraRow.getByRole('button', { name: 'Azione', exact: true }).click();
  await expect(elaraRow.getByRole('button', { name: 'Azione', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await P.getByTitle('Iniziativa', { exact: true }).click();
  await expect(P.locator('.ini-row', { hasText: 'Elara' }).getByRole('button', { name: 'Azione', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // a full round later it's back
  await G.getByRole('button', { name: 'Avanti' }).click();
  await G.getByRole('button', { name: 'Avanti' }).click();
  await expect(elaraRow.getByRole('button', { name: 'Azione', exact: true })).toHaveAttribute('aria-pressed', 'false');

  // a short rest: the player spends hit dice at the table
  await G.getByLabel(/Ora del mondo/).click();
  await G.getByLabel('Orologio del mondo').getByRole('button', { name: 'Riposo breve' }).click();
  const rest = P.getByRole('dialog', { name: 'Riposo breve · Elara' });
  await expect(rest).toBeVisible();
  await rest.getByRole('button', { name: /Tira 1d6/ }).click();
  await P.getByTitle('Chat e tiri').click();
  await expect(P.locator('.log')).toContainText('Dadi vita · Elara');
  // a long rest: everyone back to full
  await G.getByLabel('Orologio del mondo').getByRole('button', { name: 'Riposo lungo' }).click();
  await expect(P.locator('.log')).toContainText('Riposo lungo');
  await expect.poll(sheetHp, { timeout: 10_000 }).toBe(null);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

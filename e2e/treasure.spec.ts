import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('random tables, the party’s loot shared out, a shop: straight onto the sheets; dice in a note roll', async () => {
  const gm = await launchApp({ hostPort: 4617 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4617' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Mercati', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  const ch = await apiCall<{ id: string }>(P, 'POST', '/characters', { name: 'Elara', systemId: 'dnd5e-2024', data: { level: 1, classId: 'wizard', speciesId: 'human', backgroundId: 'sage' } });
  await apiCall(P, 'PUT', `/campaigns/${camp.id}/character`, { characterId: ch.id });

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Mercati').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Mercati').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.locator('.log')).toBeVisible();

  // a random table, shared with the players
  await G.getByTitle('Tabelle e tesoro').click();
  await G.getByRole('button', { name: 'Nuova tabella' }).click();
  await G.getByLabel('Nome della tabella').fill('Voci di taverna');
  await G.getByLabel('Voci della tabella').fill('Il duca è malato\nUn drago a nord\nLa birra è annacquata');
  await expect(G.getByText('Si tira 1d3.')).toBeVisible();
  await G.getByRole('switch', { name: 'I giocatori la vedono' }).click();
  await G.getByRole('button', { name: 'Salva' }).click();
  await P.getByTitle('Tabelle e tesoro').click();
  await P.getByRole('group', { name: 'Voci di taverna' }).getByRole('button', { name: 'Tira', exact: true }).click();
  await P.getByTitle('Chat e tiri').click();
  await expect(P.locator('.log')).toContainText(/Voci di taverna/);
  await expect(P.locator('.log')).toContainText(/Il duca è malato|Un drago a nord|La birra è annacquata/);

  // loot: 30 gold and a potion; the gold shared out onto the sheet, the potion taken
  await G.getByRole('tab', { name: 'Bottino' }).click();
  await G.getByRole('group', { name: 'Monete del gruppo' }).getByLabel('Monete d’oro').fill('30');
  await G.getByLabel('Oggetto da aggiungere al bottino').fill('Pozione di guarigione');
  await G.locator('.treasure').getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await G.getByRole('button', { name: /Dividi tra i personaggi \(1\)/ }).click();
  await expect(G.getByRole('group', { name: 'Monete del gruppo' }).getByLabel('Monete d’oro')).toHaveValue('0');
  await P.getByTitle('Tabelle e tesoro').click();
  await P.getByRole('tab', { name: 'Bottino' }).click();
  await P.getByRole('group', { name: 'Pozione di guarigione' }).getByRole('button', { name: 'Prendi' }).click();
  await expect(P.getByText('Niente da dividere.')).toBeVisible();

  // a shop: rope for 1 gold
  await G.getByRole('tab', { name: 'Negozi' }).click();
  await G.getByRole('button', { name: 'Nuovo negozio' }).click();
  await G.getByLabel('Nome del negozio').fill('Bottega di Ilda');
  await G.getByRole('button', { name: 'Aggiungi merce' }).click();
  await G.getByLabel('Merce', { exact: true }).fill('Corda di canapa');
  await G.getByRole('switch', { name: 'Aperto ai giocatori' }).click();
  await G.getByRole('button', { name: 'Salva' }).click();
  await P.getByRole('tab', { name: 'Negozi' }).click();
  await expect(P.getByText('Nella borsa: 30 mo')).toBeVisible();
  await P.getByRole('group', { name: 'Corda di canapa' }).getByRole('button', { name: 'Compra' }).click();
  await expect(P.getByText('Nella borsa: 29 mo')).toBeVisible();
  await P.getByTitle('Chat e tiri').click();
  await expect(P.locator('.log')).toContainText('Giulia compra Corda di canapa da Bottega di Ilda');

  // dice in a handout: the player clicks them
  await G.getByTitle('Note e dispense').click();
  await G.getByTitle('Nuova nota o dispensa').click();
  await G.getByLabel('Testo della nota').fill('La trappola fa 2d6+3 danni da fuoco');
  await expect(G.getByRole('button', { name: '2d6+3' })).toBeVisible();
  await G.getByRole('button', { name: 'Tutti', exact: true }).click();
  await P.getByTitle('Note e dispense').click();
  await P.locator('.note-row', { hasText: 'Nuova nota' }).click();
  await P.locator('.inline-roll', { hasText: '2d6+3' }).click();
  await P.getByTitle('Chat e tiri').click();
  await expect(P.locator('.log')).toContainText('Nuova nota');

  // the party at a glance, and 300 XP for everyone: Elara can level up
  await G.getByTitle('Scheda').click();
  const party = G.getByRole('region', { name: 'Il gruppo' });
  await expect(party.getByRole('group', { name: 'Elara' })).toContainText('Percezione passiva');
  await party.getByLabel('Punti esperienza a testa').fill('300');
  await party.getByRole('button', { name: 'Assegna a tutti' }).click();
  await expect(party.getByRole('group', { name: 'Elara' })).toContainText('sale di livello');
  await expect(P.locator('.log')).toContainText('Elara: +300 PE (300) · può salire al livello 2');

  // who's who: a faction the party now knows
  await G.getByTitle('Missioni').click();
  await G.getByRole('tab', { name: 'Chi è chi' }).click();
  await G.getByRole('button', { name: 'Aggiungi persona, fazione o luogo' }).click();
  const card = G.getByRole('group', { name: /Scheda di/ });
  await card.getByLabel('Nome').fill('Gilda dei mercanti');
  await card.getByLabel('Tipo').selectOption('fazione');
  await card.getByRole('switch', { name: 'Visibile ai giocatori' }).click();
  await card.getByLabel('Rapporto col gruppo').fill('2');
  await P.getByTitle('Missioni').click();
  await P.getByRole('tab', { name: 'Chi è chi' }).click();
  await P.getByRole('button', { name: 'Gilda dei mercanti' }).click();
  await expect(P.locator('.relation-card')).toContainText('Alleati');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await gm.app.close();
  await pl.app.close();
});

import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('speaking as an NPC, whispers between players, the fight in numbers', async () => {
  const gm = await launchApp({ hostPort: 4633 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4633' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Locanda', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Locanda').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Locanda').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.locator('.log')).toBeVisible();

  // a goblin on the map: the GM speaks with its voice
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Chat e tiri').click();
  await G.getByLabel('Parla come').selectOption({ label: 'Guerriero goblin' });
  await G.locator('.chat-input .input').fill('Chi va là?');
  await G.locator('.chat-input .input').press('Enter');
  const said = P.locator('.log .in-voice', { hasText: 'Chi va là?' });
  await expect(said).toContainText('Guerriero goblin');
  await expect(said).toContainText('(Master)');

  // a whisper to the GM: only the GM reads it
  await P.locator('.chat-input .input').fill('/w master Ho una moneta falsa');
  await P.locator('.chat-input .input').press('Enter');
  await expect(G.locator('.log .whisper', { hasText: 'Ho una moneta falsa' })).toContainText('sussurro a master');
  await expect(P.locator('.log .whisper', { hasText: 'Ho una moneta falsa' })).toBeVisible();

  // a fight: the goblin takes damage, the log counts it
  await G.getByTitle('Iniziativa', { exact: true }).click();
  await G.getByRole('button', { name: 'Tira per tutti i token' }).click();
  await expect(G.locator('.ini-row', { hasText: 'Guerriero goblin' })).toBeVisible();
  await G.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(G.getByText('Round 1', { exact: true })).toBeVisible();
  await G.getByTitle('Chat e tiri').click();
  await G.getByLabel('Parla come').selectOption({ label: 'Io' });
  await G.getByTitle('Tira 1d20').click();
  await G.locator('.log-roll').last().getByTitle('Infliggi come danni').click();
  await G.getByTitle('Iniziativa', { exact: true }).click();
  const fight = G.getByRole('region', { name: 'Registro dello scontro' });
  await fight.getByRole('button', { name: /Registro dello scontro/ }).click();
  await expect(fight).toContainText('Guerriero goblin');
  await fight.getByRole('button', { name: 'Mostra i numeri in chat' }).click();
  await expect(P.locator('.log')).toContainText('Lo scontro in numeri');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

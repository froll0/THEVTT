import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiCall, launchApp, nav, register } from './app';

const MAP = join(fileURLToPath(new URL('.', import.meta.url)), '../apps/desktop/src/renderer/src/systems/wtow/maps/talabheim.jpg');

test('a handout revealed a piece at a time: players never get the whole picture', async () => {
  const gm = await launchApp({ hostPort: 4622 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4622' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Cronache', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();
  await nav(G, 'Campagne');
  await G.getByText('Cronache', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await nav(P, 'Campagne');
  await P.getByText('Cronache', { exact: true }).click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.getByTitle('Chat e tiri')).toBeVisible();

  await G.getByTitle('Note e dispense').click();
  await G.getByTitle('Nuova nota o dispensa').click();
  await G.locator('input[type=file][accept="image/*"]').last().setInputFiles(MAP);
  await G.getByText('Rivela a pezzi').click();
  await expect(G.getByText('0 pezzi su 24 visibili ai giocatori')).toBeVisible();
  for (const i of [1, 2, 7, 8]) await G.getByRole('button', { name: new RegExp(`^Pezzo ${i}:`) }).click();
  await expect(G.getByText('4 pezzi su 24 visibili ai giocatori')).toBeVisible();
  await G.getByRole('button', { name: 'Tutti', exact: true }).click();
  const full = await G.locator('.note-image > img').getAttribute('src');

  await P.getByTitle('Note e dispense').click();
  await P.locator('.note-row', { hasText: 'Nuova nota' }).click();
  const seen = P.locator('.note-image > img');
  await expect(seen).toBeVisible();
  // the players' copy is the masked one, never the original
  await expect.poll(async () => (await seen.getAttribute('src'))?.startsWith('data:image/webp')).toBe(true);
  expect(await seen.getAttribute('src')).not.toBe(full);
  await G.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/reveal-gm.png` : undefined });
  await P.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/reveal-player.png` : undefined });

  expect(gm.errors).toEqual([]);
  expect(pl.errors).toEqual([]);
  await gm.app.close();
  await pl.app.close();
});

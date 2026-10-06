import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('players keep their copy while the GM is away, and the journal syncs back', async () => {
  const gm = await launchApp({ hostPort: 4599 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4599' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Le Rovine di Thar', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await apiCall(G, 'POST', `/campaigns/${camp.id}/recaps`, { title: 'Sessione 1', body: '<p>Il ponte è crollato.</p>' });
  // the player looks around once: that is what gets kept
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Le Rovine di Thar').click();
  await expect(P.getByText('Il ponte è crollato.')).toBeVisible();
  await nav(P, 'Diario');
  await expect(P.getByText('Il tuo diario è vuoto')).toBeVisible();

  // the GM's computer goes off
  const profile = gm.profile;
  await gm.app.close();
  await P.reload();
  await expect(P.getByRole('status').filter({ hasText: 'Copia locale' })).toBeVisible({ timeout: 20_000 });
  await nav(P, 'Campagne');
  await P.getByText('Le Rovine di Thar').click();
  await expect(P.getByText('Il ponte è crollato.')).toBeVisible();
  // the journal still takes notes
  await nav(P, 'Diario');
  await P.getByRole('button', { name: 'Nuova pagina' }).click();
  await P.getByLabel('Titolo della pagina').fill('Mentre il master dorme');
  await P.getByLabel('Testo della pagina').fill('Ripasso gli indizi sul ponte.');
  await expect(P.locator('.journal-row', { hasText: 'Ripasso gli indizi' })).toBeVisible();

  // the GM is back: the page reaches the server by itself
  const back = await launchApp({ hostPort: 4599, profile });
  await expect(P.locator('.toast', { hasText: 'Diario sincronizzato' })).toBeVisible({ timeout: 45_000 });
  await expect(P.getByRole('status').filter({ hasText: 'Copia locale' })).toHaveCount(0);
  const pages = await apiCall<{ title: string; body: string }[]>(P, 'GET', '/journal');
  expect(pages).toHaveLength(1);
  expect(pages[0]).toMatchObject({ title: 'Mentre il master dorme' });
  expect(pages[0]!.body).toContain('Ripasso gli indizi sul ponte.');
  expect(pl.errors.filter((e) => !/net::ERR|Failed to fetch/.test(e)), pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await back.app.close();
});

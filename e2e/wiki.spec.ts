import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the campaign wiki: the GM writes linked pages and secrets, the player reads what is shown, also at the table', async () => {
  const gm = await launchApp({ hostPort: 4667 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4667' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Marca del Nord', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();

  // the GM: a place, visible, with a link and a secret
  await nav(G, 'Campagne');
  await G.getByText('Marca del Nord', { exact: true }).click();
  await G.getByRole('button', { name: 'Apri la wiki' }).click();
  await G.getByRole('button', { name: 'Nuova pagina' }).click();
  const ed = G.getByRole('dialog', { name: 'Nuova pagina' });
  await ed.getByPlaceholder('Roccanera').fill('Roccanera');
  await ed.getByRole('switch', { name: 'Visibile ai giocatori' }).click();
  await ed.getByRole('textbox', { name: 'Testo della pagina' }).fill('Un borgo di minatori, sotto la protezione della [[Gilda del Ferro]].');
  await ed.getByRole('textbox', { name: 'Parte segreta' }).fill('Il sindaco è un vampiro.');
  await ed.getByRole('button', { name: 'Salva' }).click();
  const page = G.getByRole('article', { name: 'Roccanera' });
  await expect(page).toContainText('Un borgo di minatori');
  await expect(page.getByRole('region', { name: 'Solo per il master' })).toContainText('vampiro');
  // the link to a page not written yet: the GM writes it right away (hidden for now)
  await page.getByRole('link', { name: 'Gilda del Ferro' }).or(page.locator('.wiki-link', { hasText: 'Gilda del Ferro' })).click();
  const ed2 = G.getByRole('dialog', { name: 'Nuova pagina' });
  await expect(ed2.getByPlaceholder('Roccanera')).toHaveValue('Gilda del Ferro');
  await ed2.locator('select.select').selectOption('fazione');
  await ed2.getByRole('textbox', { name: 'Testo della pagina' }).fill('Fabbri e mercanti d’armi.');
  await ed2.getByRole('button', { name: 'Salva' }).click();
  const guild = G.getByRole('article', { name: 'Gilda del Ferro' });
  await expect(guild).toContainText('Citata in');
  await expect(G.getByRole('complementary', { name: 'Pagine della wiki' })).toContainText('Fazioni');

  // the player: only the visible page, no secret; the link to the hidden one isn't followed
  await nav(P, 'Campagne');
  await P.getByText('Marca del Nord', { exact: true }).click();
  await P.getByRole('button', { name: 'Roccanera' }).click();
  const seen = P.getByRole('article', { name: 'Roccanera' });
  await expect(seen).toContainText('Un borgo di minatori');
  await expect(seen).not.toContainText('vampiro');
  await expect(P.getByRole('complementary', { name: 'Pagine della wiki' })).not.toContainText('Gilda del Ferro');
  await seen.locator('.wiki-link', { hasText: 'Gilda del Ferro' }).click();
  await expect(P.getByText('«Gilda del Ferro» non è ancora stata scritta')).toBeVisible();

  // the GM shows the guild: it reaches the player at once
  await guild.getByRole('button', { name: 'Mostra ai giocatori' }).click();
  await expect(P.getByRole('complementary', { name: 'Pagine della wiki' })).toContainText('Gilda del Ferro');
  await seen.locator('.wiki-link', { hasText: 'Gilda del Ferro' }).click();
  await expect(P.getByRole('article', { name: 'Gilda del Ferro' })).toContainText('Fabbri');

  // at the table, the same wiki in the dock
  await nav(G, 'Campagne');
  await G.getByText('Marca del Nord', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await G.getByTitle('Wiki della campagna').click();
  await G.getByRole('button', { name: 'Roccanera' }).click();
  await expect(G.getByRole('article', { name: 'Roccanera' })).toContainText('vampiro');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await gm.app.close();
  await pl.app.close();
});

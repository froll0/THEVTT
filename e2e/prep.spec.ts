import { expect, test, type Page } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

/** the REST API from the browser client: the server is the page's own origin */
const webApi = <T,>(page: Page, method: string, path: string) =>
  page.evaluate(
    async ({ method, path }) => {
      const res = await fetch(location.origin + path, { method, headers: { authorization: `Bearer ${localStorage.getItem('thevtt:token')}` } });
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      return res.json();
    },
    { method, path },
  ) as Promise<T>;

test('a player from the browser, in English; encounters launched in one click; the session recap', async () => {
  const gm = await launchApp({ hostPort: 4614 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Cronache', systemId: 'dnd5e-2024' });

  // a player with no app: the GM's server serves it at /play/ (a plain browser window, no desktop bridge)
  const opened = gm.app.waitForEvent('window');
  await gm.app.evaluate(({ BrowserWindow }) => {
    void new BrowserWindow({ width: 1280, height: 800 }).loadURL('http://localhost:4614/play/');
  });
  const B = await opened;
  await B.waitForLoadState('domcontentloaded');
  await B.evaluate(() => localStorage.setItem('thevtt:settings', JSON.stringify({ state: { language: 'en' }, version: 0 })));
  await B.reload();
  // in English, and nothing to choose about servers
  await expect(B.getByRole('button', { name: 'Create account' })).toBeVisible();
  await expect(B.getByText('Where do you play?')).toHaveCount(0);
  await B.getByLabel('Username').fill('giulia');
  await B.getByLabel('Display name (optional)').fill('Giulia');
  await B.getByLabel('Password').fill('password123');
  await B.getByRole('button', { name: 'Create account' }).click();
  await expect(B.getByRole('banner').getByRole('button', { name: 'Campaigns', exact: true })).toBeVisible();
  const me = await webApi<{ id: string }>(B, 'GET', '/me');
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: me.id });
  const [inv] = await webApi<{ id: string }[]>(B, 'GET', '/invites');
  await webApi(B, 'POST', `/invites/${inv!.id}/accept`);

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Cronache').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  await B.reload();
  await B.getByRole('banner').getByRole('button', { name: 'Campaigns', exact: true }).click();
  await B.getByText('Cronache').click();
  await B.getByRole('button', { name: 'Take a seat' }).click();
  await expect(B.getByTitle('Chat and rolls')).toBeVisible();

  // an encounter prepared ahead: the goblins leave the map until it's launched
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Incontri').click();
  const panel = G.locator('.encounters');
  await panel.getByPlaceholder('Agguato al guado').fill('Agguato al guado');
  await panel.getByPlaceholder('Capitolo 1').fill('Capitolo 1');
  await panel.getByRole('button', { name: 'Salva con 1 creatura' }).click();
  await expect(panel.locator('.encounter-row', { hasText: 'Agguato al guado' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Salva vuoto' })).toBeVisible();

  await panel.locator('.encounter-row', { hasText: 'Agguato al guado' }).getByTitle('Lancia: scena, creature, musica e dispensa').click();
  await G.getByTitle('Iniziativa').click();
  await expect(G.locator('.ini-row', { hasText: 'Guerriero goblin' })).toBeVisible();

  // a few lines in the log, then closing the session drafts the recap
  for (const msg of ['Entriamo nella grotta', 'Attenti ai goblin']) {
    const input = B.getByPlaceholder(/^Message, \/r .*\/gm to the GM$/);
    await input.fill(msg);
    await input.press('Enter');
  }
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText('Attenti ai goblin');
  await G.getByRole('button', { name: 'Chiudi la sessione' }).click();
  const modal = G.locator('.modal', { hasText: 'Ho preparato una bozza' });
  await expect(modal).toBeVisible();
  await expect(modal.locator('.recap-editor')).toContainText('Giulia: Attenti ai goblin');
  await modal.getByRole('button', { name: 'Pubblica e chiudi' }).click();
  await expect(G.locator('.recap', { hasText: 'Sessione del' })).toBeVisible();

  expect(gm.errors).toEqual([]);
  await gm.app.close();
});

import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the table talks: voice and video between GM and players', async () => {
  const gm = await launchApp({ hostPort: 4607, fakeMedia: true });
  const pl = await launchApp({ fakeMedia: true });
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4607' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Voci nel buio', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();
  await nav(G, 'Campagne');
  await G.getByText('Voci nel buio').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await nav(P, 'Campagne');
  await P.getByText('Voci nel buio').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  // the GM opens the call with the voice only
  await G.getByRole('button', { name: 'Voce', exact: true }).click();
  const gTiles = G.getByRole('list', { name: 'Chi è in voce' });
  await expect(gTiles.getByRole('listitem')).toHaveCount(1);
  // the player sees there's someone to talk to, and joins with the camera
  await expect(P.getByRole('button', { name: 'Entra in voce · 1' })).toBeVisible();
  await P.getByRole('button', { name: 'Entra con la videocamera' }).click();
  const pTiles = P.getByRole('list', { name: 'Chi è in voce' });
  await expect(pTiles.getByRole('listitem')).toHaveCount(2);
  await expect(gTiles.getByRole('listitem')).toHaveCount(2);

  // the GM gets Giulia's picture straight from her computer
  const giulia = gTiles.getByRole('listitem', { name: 'Giulia' });
  await expect(giulia).not.toHaveClass(/pending/, { timeout: 20_000 });
  await expect.poll(() => giulia.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 20_000 }).toBeGreaterThan(0);
  // and her voice: the fake microphone beeps, the tile lights up when it does
  await expect(giulia).toHaveClass(/speaking/, { timeout: 20_000 });
  // and the other way round
  const marco = pTiles.getByRole('listitem', { name: 'Marco' });
  await expect(marco).toHaveClass(/speaking/, { timeout: 20_000 });

  // Giulia mutes herself: the GM sees it
  await P.getByRole('button', { name: 'Spegni il microfono' }).click();
  await expect(giulia.getByLabel('microfono spento')).toBeVisible();
  // the GM turns the camera on too
  await G.getByRole('button', { name: 'Accendi la videocamera' }).click();
  await expect.poll(() => marco.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 20_000 }).toBeGreaterThan(0);

  // Giulia leaves the call: she's gone from the GM's tiles
  await P.getByRole('button', { name: 'Esci dalla chat vocale' }).click();
  await expect(gTiles.getByRole('listitem')).toHaveCount(1);
  await expect(P.getByRole('list', { name: 'Chi è in voce' })).toHaveCount(0);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

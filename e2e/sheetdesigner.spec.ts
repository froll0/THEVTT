import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('free system: the GM designs the campaign sheet, a player starts her character from it', async () => {
  const gm = await launchApp({ hostPort: 4664 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4664' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Notte eterna', systemId: 'libero' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  await G.reload();
  await P.reload();

  // the GM: a sheet from the d10 pool, renamed, a tick box added, blood as dots
  await nav(G, 'Campagne');
  await G.getByText('Notte eterna', { exact: true }).click();
  await G.getByRole('button', { name: 'Disegna una scheda' }).click();
  const d = G.getByRole('dialog', { name: 'Schede della campagna' });
  await d.getByRole('combobox', { name: 'Parti da' }).selectOption({ label: 'Riserva di d10' });
  await d.getByRole('button', { name: 'Nuova scheda' }).click();
  await d.getByLabel('Nome della scheda').fill('Cacciatori della notte');
  await d.getByRole('button', { name: 'Campo', exact: true }).click();
  const last = d.getByRole('textbox', { name: 'Nome del campo' }).last();
  await last.fill('Benedetto');
  await d.getByRole('combobox', { name: 'Tipo' }).last().selectOption('check');
  await d.getByRole('button', { name: 'Fame a pallini' }).click();
  // the preview shows it as the players will: dots for Fame, a box for Benedetto
  const preview = d.getByRole('region', { name: 'Anteprima' }).or(d.locator('.designer-preview'));
  await expect(preview.getByRole('group', { name: /Fame: 1 su 5/ })).toBeVisible();
  await preview.getByRole('button', { name: 'Fame 3' }).click();
  await expect(preview.getByRole('group', { name: /Fame: 3 su 5/ })).toBeVisible();
  await expect(preview.getByRole('checkbox', { name: 'Benedetto' })).toBeVisible();
  // a roll from the preview, rolled right there
  await preview.getByRole('button', { name: /Rissa/ }).click();
  await expect(d.getByRole('status')).toContainText(/Rissa: \dd10h6 = \d+/);
  await d.getByRole('button', { name: 'Salva' }).click();
  await expect(G.getByRole('button', { name: 'Modifica le schede' })).toBeVisible();

  // the player: the campaign's sheet comes first, filled in as the GM left it
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Notte eterna', { exact: true }).click();
  await P.getByRole('button', { name: 'Crea nuovo' }).click();
  await expect(P.locator('.option.on')).toContainText('Cacciatori della notte');
  await expect(P.locator('.option.on')).toContainText('della campagna');
  await expect(P.getByRole('group', { name: /Fame: 3 su 5/ })).toBeVisible();
  await P.getByRole('checkbox', { name: 'Benedetto' }).check();
  await P.getByPlaceholder('Ilda di Roccanera').fill('Vera Corvino');
  await P.getByRole('button', { name: 'Salva e assegna' }).click();
  await expect(P.getByText('Vera Corvino').first()).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await gm.app.close();
  await pl.app.close();
});

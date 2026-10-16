import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('extensions: added, switched on after a warning, a chat command and a button at the table', async () => {
  const gm = await launchApp({ hostPort: 4634 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Officina', systemId: 'dnd5e-2024' });
  await G.reload();

  await G.getByRole('button', { name: 'Account', exact: true }).click();
  await G.getByText('Impostazioni').click();
  await G.getByRole('button', { name: 'Estensioni', exact: true }).click();
  await G.getByRole('button', { name: 'Incolla il codice' }).click();
  const paste = G.getByRole('dialog', { name: 'Incolla un’estensione' });
  await paste.getByRole('button', { name: 'Usa l’esempio' }).click();
  await paste.getByRole('button', { name: 'Aggiungi' }).click();
  await G.getByRole('switch', { name: 'Attiva Tiro critico' }).click();
  const warn = G.getByRole('dialog', { name: 'Attivare «Tiro critico»?' });
  await expect(warn).toContainText('vedere quello che vedi tu');
  await warn.getByRole('button', { name: 'Attiva' }).click();
  await expect(G.getByRole('switch', { name: 'Attiva Tiro critico' })).toHaveAttribute('aria-checked', 'true');

  await nav(G, 'Campagne');
  await G.getByText('Officina').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  // the extension's button on the macro bar, its command in the chat
  await G.getByRole('toolbar', { name: 'Macro' }).getByRole('button', { name: 'Iniziativa' }).click();
  await expect(G.locator('.log')).toContainText('Iniziativa');
  await G.locator('.chat-input .input').fill('/moneta');
  await G.locator('.chat-input .input').press('Enter');
  await expect(G.locator('.log')).toContainText(/Testa!|Croce!/);
  await expect(G.locator('.log')).not.toContainText('/moneta');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

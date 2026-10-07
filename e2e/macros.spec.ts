import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('macros: made once, launched with a key, kept for every campaign', async () => {
  const gm = await launchApp({ hostPort: 4609 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Tempesta', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Tempesta').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  // a macro of one's own, seeing what it will do while writing it
  await G.getByRole('button', { name: 'Gestisci le macro' }).click();
  const dlg = G.getByRole('dialog', { name: 'Macro' });
  await dlg.getByRole('button', { name: 'Nuova macro' }).click();
  await dlg.getByLabel('Nome della macro').fill('Fulmine');
  await dlg.getByLabel('Testo della macro').fill('/danno ?{Danni|3d6} Fulmine\n/condizione prono\nZap!\n/vola');
  const preview = dlg.getByLabel('Anteprima della macro');
  await expect(preview).toContainText('Infligge 3d6 di danni ai token selezionati · Fulmine');
  await expect(preview).toContainText('Mette o toglie «prono» ai token selezionati');
  await expect(preview).toContainText('Scrive in chat: «Zap!»');
  await expect(preview).toContainText('Riga 4: Comando sconosciuto: /vola');
  await expect(preview).toContainText('Prima di partire chiede: «Danni»');
  await dlg.getByLabel('Testo della macro').fill('/danno ?{Danni|3d6} Fulmine\n/condizione prono\nZap!');
  await expect(preview).not.toContainText('Riga');
  await dlg.getByRole('button', { name: 'Salva' }).click();
  await dlg.getByRole('button', { name: 'Chiudi' }).click();
  const bar = G.getByRole('toolbar', { name: 'Macro' });
  await expect(bar.getByRole('button', { name: /Fulmine/ })).toBeVisible();

  // without a token selected it says so
  await G.keyboard.press('1');
  await G.getByRole('dialog', { name: 'Fulmine' }).getByRole('button', { name: 'Lancia' }).click();
  await expect(G.locator('.toast', { hasText: 'Seleziona prima' })).toBeVisible();

  // a creature on the map, selected: key 1, an answer, and it's done
  await G.getByTitle('Aggiungi token').click();
  const inspector = G.locator('.inspector');
  await expect(inspector).toBeVisible();
  await G.keyboard.press('1');
  const ask = G.getByRole('dialog', { name: 'Fulmine' });
  await ask.getByLabel('Danni').fill('4');
  await ask.getByRole('button', { name: 'Lancia' }).click();
  const log = G.locator('.log');
  await expect(log).toContainText('Fulmine → PNG');
  await expect(log).toContainText('Zap!');
  await expect(inspector).toContainText('Prono');

  // they stay on this computer, for every campaign
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Tempesta').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByRole('toolbar', { name: 'Macro' }).getByRole('button', { name: /Fulmine/ })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the audience’s window: the map as the players see it, the turn order, nothing of the GM’s', async () => {
  const gm = await launchApp({ hostPort: 4618 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'In diretta', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('In diretta').click();
  // the group's Discord channel: a webhook, and what goes there
  await G.getByLabel('Webhook di Discord').fill('https://discord.com/api/webhooks/1/prova');
  await expect(G.getByRole('switch', { name: 'I riassunti delle sessioni' })).toHaveAttribute('aria-checked', 'true');
  await expect(G.getByRole('switch', { name: 'I tiri che vedono tutti' })).toHaveAttribute('aria-checked', 'false');
  await G.getByLabel('Webhook di Discord').fill('');
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  const opened = gm.app.waitForEvent('window');
  await G.getByRole('button', { name: 'Vista spettatore' }).click();
  const S = await opened;
  await S.waitForLoadState('domcontentloaded');
  await expect(S.getByLabel('Vista spettatore')).toBeVisible();
  await expect(S.locator('.spectator-title')).toHaveText('In diretta');

  // the GM rolls in secret and in the open: the audience sees only the open one
  // (the chat is the dock's open tab)
  const input = G.locator('.chat-input').getByRole('textbox').first();
  await input.fill('/gr 1d20');
  await input.press('Enter');
  await expect(G.locator('.log')).toContainText('1d20');
  await S.waitForTimeout(500);
  await expect(S.locator('.spectator-roll')).toHaveCount(0);
  await input.fill('/r 1d6');
  await input.press('Enter');
  await expect(S.locator('.spectator-roll')).toContainText('Master');

  // the window closes when the GM leaves the table
  await G.getByRole('button', { name: 'Chiudi la sessione' }).click();
  await expect(S.getByText('Il master ha chiuso il tavolo')).toBeVisible();
  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

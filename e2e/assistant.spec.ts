import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('the GM’s assistant: the key in the settings, the panel at the table', async () => {
  const gm = await launchApp({ hostPort: 4632 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Cronache', systemId: 'dnd5e-2024' });
  await G.reload();

  await nav(G, 'Campagne');
  await G.getByText('Cronache', { exact: true }).click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await G.getByTitle('Assistente').click();
  await expect(G.getByText('serve una chiave API di Anthropic')).toBeVisible();
  await G.getByRole('button', { name: 'Impostazioni → Avanzate' }).click();

  await expect(G.getByText('Assistente del master (IA)')).toBeVisible();
  await G.getByLabel('Chiave API di Anthropic').fill('sk-ant-prova');
  await G.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(G.getByText('Chiave salvata')).toBeVisible();

  await nav(G, 'Campagne');
  await G.getByText('Cronache', { exact: true }).click();
  await G.getByRole('button', { name: /Torna al tavolo|Avvia sessione/ }).click();
  await G.getByTitle('Assistente').click();
  await expect(G.getByRole('button', { name: 'PNG al volo' })).toBeVisible();
  await expect(G.getByLabel('Idea del PNG')).toBeVisible();
  await G.getByRole('button', { name: 'La campagna', exact: true }).click();
  await expect(G.getByLabel('Domanda sulla campagna')).toBeVisible();
  await expect(G.getByText('Legge i riassunti delle sessioni')).toBeVisible();
  expect(gm.errors).toEqual([]);
  await gm.app.close();
});

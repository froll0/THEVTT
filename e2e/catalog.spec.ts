import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

const FROM_LINK = `// @name Oracolo remoto
// @description Chiede un responso a un sito
// @version 2.0
thevtt.command('oracolo', 'Un responso', async () => {
  const r = await fetch('https://oracolo.example/si-o-no');
  thevtt.chat(await r.text());
});
`;

test('extensions from the catalog and from a link: read before adding, with what they can do', async () => {
  const gm = await launchApp({ hostPort: 4663 });
  const G = gm.page;
  await G.route('https://estensioni.example/oracolo.js', (route) => route.fulfill({ body: FROM_LINK, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }));
  await register(G, { where: 'host', username: 'bibliotecario', displayName: 'Ugo' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Biblioteca', systemId: 'dnd5e-2024' });
  await G.reload();

  await G.getByRole('button', { name: 'Account', exact: true }).click();
  await G.getByText('Impostazioni').click();
  await G.getByRole('button', { name: 'Estensioni', exact: true }).click();

  // the catalog: an entry read in full, then added
  await G.getByRole('tab', { name: 'Catalogo' }).or(G.getByRole('button', { name: 'Catalogo' })).click();
  await G.getByRole('button', { name: 'Aggiungi Meteo del viaggio' }).click();
  const preview = G.getByRole('dialog', { name: 'Aggiungere «Meteo del viaggio»?' });
  await expect(preview).toContainText('Scrive in chat');
  await expect(preview).toContainText('Comandi in chat');
  await expect(preview).not.toContainText('Internet');
  await preview.getByText(/Il codice/).click();
  await expect(preview.locator('pre')).toContainText("thevtt.command('meteo'");
  await preview.getByRole('button', { name: 'Aggiungi' }).click();
  await expect(G.getByText('Meteo del viaggio · 1.0')).toBeVisible();
  await G.getByRole('tab', { name: 'Catalogo' }).or(G.getByRole('button', { name: 'Catalogo' })).click();
  await expect(G.locator('.catalog-card', { hasText: 'Meteo del viaggio' })).toContainText('Aggiunta');

  // from a link: going online is pointed out
  await G.getByRole('button', { name: 'Da un link' }).click();
  await G.getByRole('textbox', { name: 'Link dell’estensione' }).fill('https://estensioni.example/oracolo.js');
  await G.getByRole('button', { name: 'Scarica e leggi' }).click();
  const fromLink = G.getByRole('dialog', { name: 'Aggiungere «Oracolo remoto»?' });
  await expect(fromLink).toContainText('Internet');
  await expect(fromLink).toContainText('estensioni.example');
  await fromLink.getByRole('button', { name: 'Aggiungi' }).click();
  await expect(G.getByText('Oracolo remoto · 2.0')).toBeVisible();

  // switched on, it works at the table
  await G.getByRole('switch', { name: 'Attiva Meteo del viaggio' }).click();
  const warn = G.getByRole('dialog', { name: 'Attivare «Meteo del viaggio»?' });
  await expect(warn).toContainText('Scrive in chat');
  await warn.getByRole('button', { name: 'Attiva' }).click();
  await nav(G, 'Campagne');
  await G.getByText('Biblioteca').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await G.locator('.chat-input .input').fill('/meteo inverno');
  await G.locator('.chat-input .input').press('Enter');
  await expect(G.locator('.log')).toContainText('Il tempo di oggi');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

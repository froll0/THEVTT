import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register, type RunningApp } from './app';

const PORT = 4591;

let gm: RunningApp;
let player: RunningApp;

test.beforeAll(async () => {
  gm = await launchApp({ hostPort: PORT });
  player = await launchApp();
});

test.afterAll(async () => {
  await player?.app.close();
  await gm?.app.close();
});

test('a group plays at a table hosted inside the GM app', async () => {
  const G = gm.page;
  const P = player.page;

  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: `localhost:${PORT}` }, username: 'giulia', displayName: 'Giulia' });

  // friendship through the notification bell
  await nav(G, 'Amici');
  await G.getByPlaceholder('Cerca per nome utente').fill('giul');
  await G.getByRole('button', { name: 'Aggiungi' }).click();
  await P.getByRole('button', { name: 'Notifiche' }).click();
  await P.locator('.popover').getByRole('button', { name: 'Accetta' }).click();
  await expect(G.getByText('1 online')).toBeVisible();

  // campaign + invite
  await nav(G, 'Campagne');
  await G.getByRole('main').getByRole('button', { name: 'Nuova campagna' }).click();
  await G.getByLabel('Nome').fill('La Miniera Perduta');
  await G.getByRole('button', { name: 'Crea', exact: true }).click();
  await G.getByRole('button', { name: /Giulia/ }).click();
  await expect(G.getByText('invitato, in attesa')).toBeVisible();
  await P.getByRole('button', { name: 'Notifiche' }).click();
  await P.locator('.popover').getByRole('button', { name: 'Unisciti' }).click();
  await expect(P.getByText('Il tuo personaggio')).toBeVisible();

  // a ready-made character through the API, assigned from the UI
  const character = {
    version: 2,
    name: 'Brunhild',
    level: 1,
    classId: 'fighter',
    speciesId: 'dwarf',
    backgroundId: 'soldier',
    baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    backgroundBonus: { str: 2, con: 1 },
    classSkills: ['perception', 'survival'],
    choices: { fightingStyle: ['defense'] },
    masteries: ['longsword', 'greatsword', 'longbow'],
    inventory: [
      { uid: 'a', ref: 'chainMail', name: 'Cotta di maglia', qty: 1, weight: 55, equipped: true },
      { uid: 'b', ref: 'longsword', name: 'Spada lunga', qty: 1, weight: 3, equipped: true },
    ],
  };
  await apiCall(P, 'POST', '/characters', { name: 'Brunhild', systemId: 'dnd5e-2024', data: character });
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('La Miniera Perduta').click();
  await P.getByRole('main').locator('select').selectOption({ label: 'Brunhild' });
  await expect(P.getByText('Apri scheda')).toBeVisible();

  // next session and group chat, outside the table
  await nav(G, 'Campagne');
  await G.getByText('La Miniera Perduta').click();
  await G.getByRole('button', { name: 'Fissa una data' }).click();
  await G.getByLabel('Data e ora').fill('2031-05-17T21:00');
  await G.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(P.getByText(/prossima sessione sabato 17 maggio/i)).toBeVisible();
  await P.getByRole('button', { name: 'Ci sono' }).click();
  await expect(G.locator('.rsvp.yes', { hasText: 'Giulia' })).toBeVisible();
  await P.getByLabel('Messaggio').fill('Porto io le patatine');
  await P.getByLabel('Messaggio').press('Enter');
  await expect(G.locator('.msg', { hasText: 'Porto io le patatine' })).toBeVisible();
  // the GM writes what happened last time, the player reads it
  await G.getByRole('button', { name: 'Scrivi riassunto' }).click();
  await G.locator('.modal').getByLabel('Titolo').fill('Sessione zero');
  await G.locator('.modal').getByLabel('Cosa è successo').fill('Il gruppo si è incontrato alla locanda del Gigante.');
  await G.getByRole('button', { name: 'Pubblica' }).click();
  await expect(P.getByText('Il gruppo si è incontrato alla locanda del Gigante.')).toBeVisible();

  // session: GM hosts, player sits, direct link comes up
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.getByText('Diretta', { exact: true })).toBeVisible();
  await expect(G.getByText('1/1 diretti')).toBeVisible();

  // player: token and rolls from the sheet
  await P.getByTitle('Scheda').click();
  await P.locator('.char-row', { hasText: 'Brunhild' }).click();
  const sheetWin = P.getByRole('dialog', { name: 'Brunhild' });
  await sheetWin.getByRole('button', { name: 'Metti sulla mappa' }).click();
  await P.locator('.rows button', { hasText: 'Atletica' }).click();
  await P.getByTitle('Tira 1d20').click();
  await P.locator('.sheet-tabs button', { hasText: 'Combattimento' }).click();
  await P.locator('.attack', { hasText: 'Spada lunga' }).getByRole('button', { name: /^[+-]\d+$/ }).click();

  // GM sees every roll in the log, and rolls too (this used to blank the app)
  const log = G.locator('.log');
  await expect(log.getByText('Brunhild · Atletica')).toBeVisible();
  await expect(log.getByText('Spada lunga · attacco')).toBeVisible();
  await G.getByTitle('Tira 1d20').click();
  await G.getByTitle('Tira 1d20').click();
  await expect(G.locator('.log-roll')).toHaveCount(5);
  await expect(G.locator('#root')).not.toBeEmpty();

  // player damage from the sheet updates the token HP bar data on the GM side
  await P.locator('.sheet-tabs button', { hasText: 'Principale' }).click();
  await P.getByTitle('Danno').click();
  await expect.poll(async () => (await apiCall<{ data: { hp?: { current: number | null } } }[]>(P, 'GET', '/characters'))[0]?.data.hp?.current, { timeout: 10_000 }).toBe(12);
  // minimised, the window leaves the board free
  await sheetWin.getByRole('button', { name: 'Riduci' }).click();

  // bestiary + fog of war: covered monsters never reach players
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  await G.getByTitle('Nebbia di guerra').click();
  await G.getByRole('button', { name: 'Copri tutto' }).click();
  await G.getByTitle('Iniziativa', { exact: true }).click();
  await G.getByRole('button', { name: 'Tira per tutti i token' }).click();
  await expect(G.locator('.ini-row', { hasText: 'Guerriero goblin' })).toBeVisible();
  await P.getByTitle('Iniziativa', { exact: true }).click();
  await expect(P.locator('.ini-row', { hasText: 'Brunhild' })).toBeVisible();
  await expect(P.locator('.ini-row', { hasText: 'Guerriero goblin' })).toHaveCount(0);
  await G.getByRole('button', { name: 'Rivela tutto' }).click();
  await expect(P.locator('.ini-row', { hasText: 'Guerriero goblin' })).toBeVisible();

  // area templates drawn by a player reach the GM
  await P.getByTitle('Aree d\u2019effetto (A)').click();
  await P.getByRole('button', { name: 'Cono' }).click();
  const box = (await P.locator('.board canvas').boundingBox())!;
  await P.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await P.mouse.down();
  await P.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 20, { steps: 5 });
  await P.mouse.up();
  await G.getByTitle('Aree d\u2019effetto (A)').click();
  await expect(G.getByRole('button', { name: 'Cancella tutte' })).toBeVisible();

  // freehand drawing reaches the GM
  await P.getByTitle('Disegna (D)').click();
  await P.mouse.move(box.x + 100, box.y + 100);
  await P.mouse.down();
  await P.mouse.move(box.x + 220, box.y + 160, { steps: 8 });
  await P.mouse.up();
  await G.getByTitle('Disegna (D)').click();
  await expect(G.getByRole('button', { name: 'Cancella tutto' })).toBeVisible();

  // the GM sees a list of characters and opens one; players only get their own sheet
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Brunhild' }).click();
  await expect(G.getByRole('dialog', { name: 'Brunhild' }).locator('.sheet-head', { hasText: 'Brunhild' })).toBeVisible();
  await G.getByRole('dialog', { name: 'Brunhild' }).getByRole('button', { name: 'Chiudi finestra' }).click();

  // sharing an attack from the sheet posts a card with roll buttons
  await sheetWin.getByRole('button', { name: 'Espandi' }).click();
  await P.locator('.sheet-tabs button', { hasText: 'Combattimento' }).click();
  await P.locator('.attack', { hasText: 'Spada lunga' }).getByTitle('Mostra in chat').click();
  await G.getByTitle('Chat e tiri').click();
  const card = G.locator('.log-card', { hasText: 'Spada lunga' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /Danni/ }).click();
  await expect(G.locator('.log-roll', { hasText: 'Spada lunga · Danni' })).toBeVisible();

  // handouts: private until the GM shares them
  await G.getByTitle('Note e dispense').click();
  await G.getByRole('button', { name: 'Nuova' }).click();
  await G.getByPlaceholder('Titolo').fill('Lettera del sindaco');
  await G.getByPlaceholder('Scrivi qui…').fill('Venite subito alla miniera.');
  await P.getByTitle('Note e dispense').click();
  await expect(P.getByText('Qui trovi le dispense del master')).toBeVisible();
  await G.getByRole('button', { name: 'Tutti' }).click();
  await expect(P.getByText('Nuova dispensa: Lettera del sindaco')).toBeVisible();
  await P.locator('.note-row', { hasText: 'Lettera del sindaco' }).click();
  await expect(P.getByText('Venite subito alla miniera.')).toBeVisible();

  // compendium at the table: a player looks up a spell and shows it to everyone
  await P.getByTitle('Compendio').click();
  await P.getByLabel('Cerca nel compendio').fill('palla di fuoco');
  await P.locator('.comp-row', { hasText: 'Palla di fuoco' }).first().click();
  await P.locator('.compendium').getByRole('button', { name: 'Mostra in chat' }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log-card', { hasText: 'Palla di fuoco' })).toBeVisible();

  // homebrew creature: made in the editor, put on the table, stat block for the GM
  await G.getByTitle('Bestiario').click();
  await G.getByRole('button', { name: 'Nuova' }).click();
  const editor = G.locator('.modal');
  await editor.getByLabel('Nome').fill('Gnomo furioso');
  await editor.getByLabel('Dadi vita').fill('3d6+3');
  await editor.getByRole('button', { name: 'Salva creatura' }).click();
  const row = G.locator('.rows .r', { hasText: 'Gnomo furioso' });
  await expect(row).toBeVisible();
  await row.getByTitle('Aggiungi al tavolo').click();
  // an encounter weighed against the party, placed all at once
  const bandit = G.locator('.rows .r', { hasText: 'Bandito' }).first();
  await bandit.getByTitle('Aggiungi all’incontro').click();
  await bandit.getByTitle('Aggiungi all’incontro').click();
  await expect(G.locator('.encounter')).toContainText('2 creature');
  await expect(G.locator('.encounter')).toContainText('PG di livello');
  await G.getByRole('button', { name: 'Metti tutti sul tavolo' }).click();
  await expect(G.locator('.encounter')).toHaveCount(0);

  // pause: players can chat but not play
  await G.getByRole('button', { name: 'Pausa gioco' }).click();
  await expect(P.getByRole('heading', { name: 'Gioco in pausa' })).toBeVisible();
  await G.getByRole('button', { name: 'Riprendi il gioco' }).click();
  await expect(P.getByRole('heading', { name: 'Gioco in pausa' })).toHaveCount(0);

  // music: the GM plays a track, it plays for the player too
  await G.getByTitle('Musica').click();
  await G.locator('.panel-body input[type=file]').setInputFiles(fileURLToPath(new URL('./fixtures/taverna.wav', import.meta.url)));
  await G.getByRole('button', { name: 'Riproduci taverna' }).click();
  await expect(P.locator('.music-chip', { hasText: 'taverna' })).toHaveAttribute('data-audible', 'true', { timeout: 15_000 });
  await G.getByRole('button', { name: 'Pausa', exact: true }).first().click();
  await expect(P.locator('.music-chip')).toHaveAttribute('data-audible', 'false');

  // personal journal: a window next to the map, saved on the server, private
  await P.getByRole('button', { name: 'Diario' }).click();
  const journal = P.getByRole('dialog', { name: 'Diario' });
  await journal.getByRole('button', { name: 'Nuova pagina' }).click();
  await journal.getByLabel('Titolo della pagina').fill('La cripta');
  await journal.getByLabel('Testo della pagina').fill('Il mago Varos nasconde una chiave.');
  await expect(journal.locator('.journal-row', { hasText: 'Varos nasconde' })).toBeVisible();
  await journal.getByRole('button', { name: 'Chiudi finestra' }).click();
  await P.getByRole('button', { name: 'Diario' }).click();
  await expect(journal.getByLabel('Testo della pagina')).toHaveValue('Il mago Varos nasconde una chiave.');
  expect(await apiCall<unknown[]>(G, 'GET', '/journal')).toEqual([]);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(player.errors, player.errors.join('\n')).toEqual([]);
});

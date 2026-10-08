import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('GM tools: world clock, quests, table macros, monster actions on targets, imports', async () => {
  const gm = await launchApp({ hostPort: 4613 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4613' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Cronache', systemId: 'dnd5e-2024' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);

  // characters travel in a file: export, then import (a copy)
  await apiCall(P, 'POST', '/characters', { name: 'Elara', systemId: 'dnd5e-2024', data: { name: 'Elara', level: 3, classId: 'wizard' } });
  await P.reload();
  await nav(P, 'Personaggi');
  const file = join(tmpdir(), `thevtt-chars-${Date.now()}.json`);
  // the save dialog answers by itself
  await pl.app.evaluate(({ session }, path) => {
    session.defaultSession.on('will-download', (_e, item) => item.setSavePath(path));
  }, file);
  await P.getByRole('button', { name: 'Esporta' }).click();
  await expect.poll(() => existsSync(file) && readFileSync(file, 'utf8').includes('thevtt-character')).toBe(true);
  await P.getByLabel('Importa personaggi').setInputFiles(file);
  await expect(P.locator('.toast', { hasText: 'Personaggio importato' })).toBeVisible();
  await expect(P.locator('.character-card', { hasText: 'Elara' })).toHaveCount(2);

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Cronache').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await nav(P, 'Campagne');
  await P.getByText('Cronache').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();
  await expect(P.getByTitle('Chat e tiri')).toBeVisible();

  // the world's clock: the GM moves it on, night falls on an outdoor scene
  await expect(P.getByLabel(/Ora del mondo/)).toHaveCount(0);
  await G.getByLabel('Ora del mondo: Giorno 1 · 08:00').click();
  const clock = G.getByLabel('Orologio del mondo');
  await clock.getByRole('switch', { name: 'La luce segue l’ora' }).click();
  await clock.getByRole('button', { name: '+8 ore' }).click();
  await clock.getByRole('button', { name: '+8 ore' }).click();
  await expect(G.getByLabel('Ora del mondo: Giorno 2 · 00:00')).toBeVisible();
  await expect(P.getByLabel('Ora del mondo: Giorno 2 · 00:00')).toBeVisible();
  await expect(G.locator('.log')).toContainText('Giorno 2, ore 00:00: notte');
  await expect(P.locator('.log')).toContainText('Giorno 2, ore 00:00: notte');

  // a quest: written by the GM, seen by the players once it's visible
  await G.getByTitle('Missioni').click();
  await G.getByRole('button', { name: 'Nuova missione' }).click();
  await G.getByLabel('Titolo della missione').fill('La cripta perduta');
  await G.getByLabel('Descrizione della missione').fill('Il sindaco paga 100 mo.');
  await G.getByLabel('Nuovo obiettivo').fill('Trova la mappa');
  await G.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await G.getByLabel('Nuovo obiettivo').fill('Entra nella cripta');
  await G.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await P.getByTitle('Missioni').click();
  await expect(P.locator('.quest-card')).toHaveCount(0);
  await G.getByRole('switch', { name: 'Visibile ai giocatori' }).click();
  await expect(P.locator('.quest-card', { hasText: 'La cripta perduta' })).toContainText('Il sindaco paga 100 mo.');
  await G.getByRole('checkbox', { name: 'Trova la mappa' }).check();
  await expect(P.getByRole('checkbox', { name: 'Trova la mappa' })).toBeChecked();
  await expect(P.getByRole('checkbox', { name: 'Entra nella cripta' })).not.toBeChecked();
  await G.getByLabel('Modifica la missione').getByRole('button', { name: 'Missioni' }).click();
  await expect(G.locator('.quest-card', { hasText: 'La cripta perduta' })).toBeVisible();

  // a macro for the whole table: the GM writes it, the player uses it
  await G.getByRole('button', { name: 'Gestisci le macro' }).click();
  const dlg = G.getByRole('dialog', { name: 'Macro' });
  await dlg.getByRole('tab', { name: 'Del tavolo' }).click();
  await dlg.getByRole('button', { name: 'Nuova macro' }).click();
  await dlg.getByLabel('Nome della macro').fill('Riposo');
  await dlg.getByLabel('Testo della macro').fill('Il gruppo si accampa per la notte.');
  await dlg.getByRole('button', { name: 'Salva' }).click();
  await dlg.getByRole('button', { name: 'Chiudi' }).click();
  const pbar = P.getByRole('toolbar', { name: 'Macro' });
  await pbar.getByRole('button', { name: /Riposo/ }).click();
  await P.getByTitle('Chat e tiri').click();
  await expect(P.locator('.log')).toContainText('Il gruppo si accampa per la notte.');
  // the player can't change it
  await pbar.getByRole('button', { name: 'Gestisci le macro' }).click();
  const pdlg = P.getByRole('dialog', { name: 'Macro' });
  await pdlg.getByRole('tab', { name: 'Del tavolo' }).click();
  await expect(pdlg.getByLabel('Testo della macro')).toHaveAttribute('readonly', '');
  await pdlg.getByRole('button', { name: 'Chiudi' }).click();

  // a creature's actions on the bar; Ctrl+click marks the target
  await G.getByTitle('Bestiario').click();
  await G.locator('.rows .r', { hasText: 'Guerriero goblin' }).getByTitle('Aggiungi al tavolo').click();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // the goblin steps aside, a second creature takes the middle
  await G.mouse.move(c.x, c.y);
  await G.mouse.down();
  await G.mouse.move(c.x - 160, c.y, { steps: 6 });
  await G.mouse.up();
  await G.getByTitle('Aggiungi token').click();
  const bar = G.getByRole('toolbar', { name: 'Macro' });
  await expect(bar.getByRole('button', { name: /Scimitarra/ })).toHaveCount(0);
  await G.keyboard.down('Control');
  await G.mouse.click(c.x, c.y);
  await G.keyboard.up('Control');
  await G.mouse.click(c.x - 160, c.y);
  await bar.getByRole('button', { name: /Scimitarra/ }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText(/Scimitarra → PNG: (colpito|mancato|colpo critico!|1 naturale, mancato)/);
  // without targets it says how to mark them
  await G.keyboard.press('Escape');
  await G.mouse.click(c.x - 160, c.y);
  await bar.getByRole('button', { name: /Scimitarra/ }).click();
  await expect(G.locator('.toast', { hasText: 'segna i bersagli con Ctrl+clic' })).toBeVisible();

  // creatures from 5e.tools into the bestiary
  const fiveE = join(tmpdir(), `thevtt-5etools-${Date.now()}.json`);
  writeFileSync(
    fiveE,
    JSON.stringify({
      monster: [
        { name: 'Bandit Captain', size: ['M'], type: 'humanoid', ac: [15], hp: { average: 52, formula: '8d8+16' }, speed: { walk: 30 }, str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14, cr: '2', action: [{ name: 'Scimitar', entries: ['{@atk mw} {@hit 5} to hit, reach 5 ft. {@h}6 ({@damage 1d6 + 3}) slashing damage.'] }] },
      ],
    }),
  );
  await G.getByTitle('Bestiario').click();
  await G.getByRole('button', { name: 'Mie', exact: true }).click();
  await G.getByLabel('Importa da 5e.tools').setInputFiles(fiveE);
  await expect(G.locator('.toast', { hasText: '1 creature importate' })).toBeVisible();
  await expect(G.locator('.rows .r', { hasText: 'Bandit Captain' })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

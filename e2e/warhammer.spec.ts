import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

/** A finished Imperial soldier, as the builder makes it. */
const gunter = {
  version: 1,
  name: 'Gunter',
  lineage: 'imperiale',
  career: 'soldato',
  boosts: ['ac', 'r', 'fato'],
  lineageSkills: ['mischia', 'difesa', 'tempra'],
  careerSkills: ['mischia', 'difesa', 'atletica', 'volonta'],
  finishSkills: ['furtivita', 'percezione'],
  finish: 'skills',
  talents: [{ id: 'codice-donore' }, { id: 'gagliardo' }],
  lore: ['Impero', 'Esercito'],
  armour: 'armatura-leggera',
  shield: true,
  weapons: [{ ref: 'spada', name: 'Spada' }],
};

test('Warhammer: the guided builder makes a ready character', async () => {
  const run = await launchApp({ hostPort: 4631 });
  const page = run.page;
  const next = () => page.getByRole('button', { name: /^Avanti/ }).click();
  await register(page, { where: 'host', username: 'gunter', displayName: 'Gunter' });

  await nav(page, 'Personaggi');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo personaggio' }).click();
  await page.getByRole('button', { name: /Warhammer/ }).click();
  // lineage
  await page.locator('.option', { has: page.locator('b:text-is("Imperiale (Umano)")') }).click();
  await expect(page.getByText('Abilità a 3: — più 3 a scelta')).toBeVisible();
  await next();
  // three +1
  for (const n of ['Abilità di Combattimento', 'Resistenza', 'Fato']) await page.locator('.wtow-boosts .option', { hasText: n }).click();
  await next();
  // career
  await page.locator('.option', { has: page.locator('b:text-is("Soldato")') }).click();
  await expect(page.getByText('Spalla a Spalla')).toBeVisible();
  await next();
  // skills: three from the lineage, four from the career
  const chips = page.locator('.col', { hasText: 'Stirpe' }).first();
  for (const n of ['Mischia', 'Difesa', 'Tempra']) await chips.locator('.chip', { hasText: new RegExp(`^${n}$`) }).first().click();
  for (const n of ['Mischia', 'Difesa', 'Atletica', 'Volontà']) await page.locator('.col', { hasText: 'Carriera' }).last().locator('.chip', { hasText: new RegExp(`^${n}$`) }).click();
  await expect(page.locator('.wtow-skilltable .row', { hasText: 'Mischia' }).locator('b')).toHaveText('4');
  await next();
  // talents: two from the table
  await page.locator('.option', { has: page.locator('b', { hasText: 'Gagliardo' }) }).click();
  await page.locator('.option', { has: page.locator('b', { hasText: 'Codice d’Onore' }) }).click();
  await next();
  // lore: the lineage and the career already gave theirs
  await expect(page.locator('span.chip.on', { hasText: 'Esercito' })).toBeVisible();
  await next();
  // gear
  await page.locator('select').filter({ hasText: 'Aggiungi un’arma' }).selectOption('spada');
  await page.locator('.row', { has: page.locator('select').filter({ hasText: 'Aggiungi un’arma' }) }).getByRole('button').click();
  await expect(page.locator('b', { hasText: /^Spada$/ })).toBeVisible();
  await next();
  // finishing touches
  await page.locator('.option', { has: page.locator('b:text-is("Abilità")') }).click();
  await page.locator('.chip', { hasText: 'Furtività 2→3' }).click();
  await page.locator('.chip', { hasText: 'Percezione 2→3' }).click();
  await next();
  await page.getByLabel('Nome').fill('Gunter Krebs');
  // a Contact from the tables of the career's groups
  await page.getByRole('button', { name: /^Tira d100$/ }).click();
  await expect(page.locator('input[placeholder="Legame"]').first()).not.toHaveValue('');
  await next();
  await expect(page.getByText('Personaggio pronto')).toBeVisible();
  await page.getByRole('button', { name: /^Salva$/ }).click();

  // the sheet: a test with a bonus die, rolled locally away from the table
  // Resistenza 4, no armour picked in the builder
  await expect(page.locator('.stat', { hasText: 'Resilienza' }).locator('b')).toHaveText('4');
  await page.locator('.wtow-skill', { hasText: 'Mischia' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mischia' });
  await dialog.getByRole('button', { name: 'più' }).first().click();
  await dialog.getByRole('button', { name: /Tira 4d10s4/ }).click();
  await expect(page.locator('.toast', { hasText: /Mischia: \d+ success/ })).toBeVisible();

  // the Intermezzo: an activity rolled from the sheet, its failures marked on the skill
  await page.locator('.sheet-tabs button', { hasText: 'Intermezzo' }).click();
  await page.getByLabel('Attività', { exact: true }).selectOption('allenare');
  await page.getByRole('button', { name: /^Tira \d+d10s\d+/ }).click();
  await expect(page.getByText('Fatto in questo Intermezzo')).toBeVisible();
  // a magic item from the catalogue
  await page.locator('.sheet-tabs button', { hasText: 'Averi' }).click();
  await page.getByLabel('Aggiungi un oggetto magico').selectOption('pozione-di-guarigione');
  await page.locator('.row', { has: page.getByLabel('Aggiungi un oggetto magico') }).getByRole('button').click();
  await expect(page.locator('.magic-item', { hasText: 'Pozione di Guarigione' })).toBeVisible();
  // corruption: the stages and the paths
  await page.locator('.sheet-tabs button', { hasText: 'Corruzione' }).click();
  await page.locator('.chip', { hasText: 'Vulnerabile' }).click();
  await page.getByLabel('Sentiero', { exact: true }).selectOption('il-sangue-deve-scorrere');
  await expect(page.getByText(/attacco bonus di Mischia gratuito/)).toBeVisible();

  expect(run.errors, run.errors.join('\n')).toEqual([]);
  await run.app.close();
});

test('Warhammer at the table: opposed attacks, wounds, zones and the d10 pool', async () => {
  const gm = await launchApp({ hostPort: 4632 });
  const pl = await launchApp();
  const G = gm.page;
  const P = pl.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await register(P, { where: { join: 'localhost:4632' }, username: 'giulia', displayName: 'Giulia' });
  const plUser = await apiCall<{ id: string }>(P, 'GET', '/me');
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'Talagaad', systemId: 'wtow' });
  await apiCall(G, 'POST', `/campaigns/${camp.id}/invites`, { userId: plUser.id });
  const [inv] = await apiCall<{ id: string }[]>(P, 'GET', '/invites');
  await apiCall(P, 'POST', `/invites/${inv!.id}/accept`);
  const ch = await apiCall<{ id: string }>(P, 'POST', '/characters', { name: 'Gunter', systemId: 'wtow', data: gunter });
  await apiCall(P, 'PUT', `/campaigns/${camp.id}/character`, { characterId: ch.id });

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Talagaad').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  await P.reload();
  await nav(P, 'Campagne');
  await P.getByText('Talagaad').click();
  await P.getByRole('button', { name: 'Siediti al tavolo' }).click();

  // the d10 pool from the dice bar
  // (the chat is the dock's open tab)
  await G.getByTitle('Tira la riserva').click();
  await expect(G.locator('.log .pool-outcome').first()).toContainText(/success/);

  // Gunter on the map, a Gor from the bestiary (selected as it lands)
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Gunter' }).click();
  const sheet = G.getByRole('dialog', { name: 'Gunter' });
  await sheet.getByRole('button', { name: 'Metti sulla mappa' }).click();
  await G.getByTitle('Bestiario').click();
  await G.getByPlaceholder('Cerca un PNG…').fill('Gor');
  await G.locator('.detail', { has: G.locator('b:text-is("Gor")') }).getByTitle('Metti sulla mappa').click();
  const inspector = G.locator('.inspector');
  await expect(inspector.getByRole('button', { name: 'Servitore' })).toHaveClass(/on/);
  await expect(inspector.getByText('Resilienza').first()).toBeVisible();

  // the sword against the Gor's Protezione: the table settles it
  await sheet.locator('.sheet-tabs button', { hasText: 'Combattimento' }).click();
  await sheet.locator('button', { hasText: 'Spada' }).first().click();
  await G.getByRole('dialog', { name: 'Spada' }).getByRole('button', { name: /Attacca/ }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText('Spada → Gor');
  await expect(G.locator('.log .card, .log').first()).toContainText(/Successi: \d+/);
  await expect(P.locator('.log')).toContainText('Spada → Gor');

  // a wound for Gunter from the inspector: rolled on the table, written on the sheet
  await G.keyboard.press('Escape');
  await G.getByTitle('Iniziativa').click();
  await G.getByRole('button', { name: /Battaglia/ }).click();
  await expect(G.locator('.ini-row')).toHaveCount(2);
  await expect(G.locator('.ini-row', { hasText: 'Gunter' })).toContainText('PG');

  // an extended test for the whole table
  await G.getByPlaceholder('Nuova prova (es. Forzare il portone)').fill('Forzare il portone');
  await G.getByRole('button', { name: 'Aggiungi la prova' }).click();
  await G.getByLabel('Formula per Forzare il portone').fill('4d10s3');
  await G.locator('.extended-row').getByRole('button', { name: /Tira/ }).click();
  await expect(G.locator('.extended-row')).toContainText(/\d+\/4/);
  // the retreat: Atletica for the party, Si Salvi Chi Può! for those who fail
  await G.getByRole('button', { name: 'Ritirata' }).click();
  await G.getByRole('button', { name: 'Atletica per tutti' }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText(/Tutti si sganciano|Non riescono a sganciarsi/);

  // zones: drawn by the GM, named in the panel
  await sheet.getByRole('button', { name: 'Chiudi finestra' }).click();
  await G.getByTitle('Zone: trascina per disegnarne una').click();
  const box = (await G.locator('.board canvas').boundingBox())!;
  // bottom left: clear of the rail, the sheet window and the dice bar
  await G.mouse.move(box.x + 150, box.y + box.height - 220);
  await G.mouse.down();
  await G.mouse.move(box.x + 330, box.y + box.height - 100, { steps: 6 });
  await G.mouse.up();
  await expect(G.locator('.zones-panel input')).toHaveValue('Zona 1');
  await G.locator('.zones-panel .chip', { hasText: 'Terreno Difficile' }).click();
  await expect(G.locator('.zones-panel .chip.on', { hasText: 'Terreno Difficile' })).toBeVisible();
  await G.locator('.zones-panel .chip', { hasText: 'Sopraelevata' }).click();
  await expect(G.locator('.zones-panel .chip.on', { hasText: 'Sopraelevata' })).toBeVisible();
  await G.getByLabel('Pericolo', { exact: true }).selectOption('2');
  await G.getByLabel('Esempio di Pericolo').selectOption({ label: 'Edificio in Fiamme (Tempra 2)' });
  await expect(G.locator('.zones-panel .chip.on', { hasText: 'Ogni turno' })).toBeVisible();

  // the rules for this game
  await G.getByTitle('Compendio').click();
  await expect(G.getByText('Tabella delle Ferite').first()).toBeVisible();
  await G.getByPlaceholder('Cerca regole, incantesimi, mostri…').fill('Salvi');
  await expect(G.getByRole('button', { name: /Si Salvi Chi Può!/ })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  expect(pl.errors, pl.errors.join('\n')).toEqual([]);
  await pl.app.close();
  await gm.app.close();
});

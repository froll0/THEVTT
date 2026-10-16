import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

/** A dwarf Berserker with the class gear, as the builder makes it. */
const brunna = {
  version: 1,
  name: 'Brunna',
  classId: 'berserker',
  ancestryId: 'dwarf',
  backgroundId: 'retired',
  stats: { str: 2, dex: 2, int: 0, wil: -1 },
  array: 'standard',
  skillPoints: { might: 2, perception: 2 },
  items: [
    { id: 'a1', ref: 'battleaxe', name: 'Ascia da battaglia', slots: 2, qty: 1 },
    { id: 'a2', ref: 'cheap-hides', name: 'Pelli scadenti', slots: 1, qty: 1, equipped: true },
  ],
  languages: ['Comune', 'Nanico'],
};

test('Nimble: the guided builder makes a ready hero', async () => {
  const run = await launchApp({ hostPort: 4641 });
  const page = run.page;
  const next = () => page.getByRole('button', { name: /^Avanti/ }).click();
  await register(page, { where: 'host', username: 'brunna', displayName: 'Brunna' });

  await nav(page, 'Personaggi');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo personaggio' }).click();
  await page.getByRole('button', { name: /Nimble/ }).click();
  // class
  await page.locator('.option', { has: page.locator('b:text-is("Berserker")') }).click();
  await expect(page.getByText('PF iniziali 20')).toBeVisible();
  await next();
  // ancestry
  await page.locator('.option', { has: page.locator('b:text-is("Nano")') }).click();
  await expect(page.getByText(/\+2 Dadi Vita massimi/).first()).toBeVisible();
  await next();
  // background and motivation
  await page.locator('.option', { has: page.locator('b:text-is("Tornato dalla pensione")') }).click();
  await page.getByRole('button', { name: /A caso/ }).click();
  await expect(page.getByLabel('Motivazione', { exact: true })).not.toHaveValue('');
  await next();
  // the standard array, the best values on the key stats already
  await expect(page.getByLabel('Forza')).toHaveValue('2');
  await expect(page.getByLabel('Volontà')).toHaveValue('-1');
  await next();
  // four skill points
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Potenza più uno' }).click();
  await expect(page.getByRole('button', { name: 'Potenza più uno' })).toBeDisabled();
  await next();
  // the class gear
  await page.locator('.option', { has: page.locator('b:text-is("Equipaggiamento della classe")') }).click();
  await expect(page.getByText('• Ascia da battaglia')).toBeVisible();
  await next();
  await page.getByLabel('Nome').fill('Brunna Spaccaferro');
  await next();
  await expect(page.getByText('Eroe pronto')).toBeVisible();
  await page.getByRole('button', { name: /^Salva$/ }).click();

  // the sheet: no armour, so DES; the battleaxe rolls with the Primary Die
  await expect(page.locator('.stat', { hasText: 'Armatura' }).locator('b')).toHaveText('2');
  await expect(page.locator('.stat', { hasText: 'Dadi Vita' }).locator('b')).toHaveText('3/3 d12');
  await page.locator('.sheet-tabs button', { hasText: 'Attacchi' }).click();
  await expect(page.getByRole('button', { name: '1d10n+2' })).toBeVisible();
  // advantage goes on the Primary Die
  await page.getByRole('button', { name: 'V1', exact: true }).click();
  await expect(page.getByRole('button', { name: '1d10na1+2' })).toBeVisible();
  await page.locator('.sheet-tabs button', { hasText: 'Privilegi' }).click();
  await expect(page.getByText(/tira un Dado Furia/).first()).toBeVisible();

  expect(run.errors, run.errors.join('\n')).toEqual([]);
  await run.app.close();
});

test('Nimble at the table: the Primary Die against armour, Defend and Wounds', async () => {
  const gm = await launchApp({ hostPort: 4642 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  const camp = await apiCall<{ id: string }>(G, 'POST', '/campaigns', { name: 'La tana dei coboldi', systemId: 'nimble' });
  const ch = await apiCall<{ id: string }>(G, 'POST', '/characters', { name: 'Brunna', systemId: 'nimble', data: brunna });
  await apiCall(G, 'PUT', `/campaigns/${camp.id}/character`, { characterId: ch.id });

  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('La tana dei coboldi').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  // Brunna on the map, then out of the way
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Brunna' }).click();
  const sheet = G.getByRole('dialog', { name: 'Brunna' });
  await sheet.getByRole('button', { name: 'Metti sulla mappa' }).click();
  await sheet.getByRole('button', { name: 'Chiudi finestra' }).click();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await G.mouse.move(c.x, c.y);
  await G.mouse.down();
  await G.mouse.move(c.x - 160, c.y, { steps: 6 });
  await G.mouse.up();

  // a kobold clanger in heavy armour takes the middle (selected as it lands)
  await G.getByTitle('Bestiario').click();
  await G.getByPlaceholder('Cerca un mostro…').fill('sbatacchione');
  await G.locator('.detail', { has: G.locator('b:text-is("Coboldo sbatacchione")') }).getByTitle('Metti sulla mappa').click();
  const inspector = G.locator('.inspector');
  await expect(inspector.getByText('Scheda del mostro')).toBeVisible();

  // the axe from the sheet: the table rolls it against the armour
  await G.getByTitle('Scheda').click();
  await G.locator('.char-row', { hasText: 'Brunna' }).click();
  await sheet.locator('.sheet-tabs button', { hasText: 'Attacchi' }).click();
  await sheet.getByRole('button', { name: '1d10n+2' }).click();
  await G.getByTitle('Chat e tiri').click();
  await expect(G.locator('.log')).toContainText('Brunna · Ascia da battaglia → Coboldo sbatacchione');
  await expect(G.locator('.log')).toContainText(/mancato!|armatura pesante|critico!/);
  await sheet.getByRole('button', { name: 'Chiudi finestra' }).click();

  // the kobold stabs Brunna (marked with Ctrl+click): she chooses to Defend
  await G.keyboard.down('Control');
  await G.mouse.click(c.x - 160, c.y);
  await G.keyboard.up('Control');
  await G.mouse.click(c.x, c.y);
  await inspector.getByText('Scheda del mostro').click();
  const stab = inspector.getByRole('button', { name: '1d4n+2' });
  const defend = G.locator('.pending-damage').getByRole('button', { name: /Difenditi/ });
  // a 1 on the Primary Die misses: stab until one lands
  for (let i = 0; i < 8 && !(await defend.count()); i++) {
    await stab.click();
    await expect(G.locator('.log')).toContainText('Coboldo sbatacchione · Pugnalata → Brunna');
  }
  await expect(defend.first()).toBeVisible();
  await defend.first().click();
  await expect(G.locator('.log')).toContainText(/Brunna si difende: \d+ − 5 = \d+ danni/);

  // the rules for this game
  await G.getByTitle('Compendio').click();
  await G.getByPlaceholder('Cerca regole, incantesimi, mostri…').fill('dado primario');
  await expect(G.getByRole('button', { name: /Attaccare: il dado primario/ })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

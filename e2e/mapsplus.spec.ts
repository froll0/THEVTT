import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('a Dungeondraft map comes in with walls, doors and lights; its grid lined up in two clicks', async () => {
  const gm = await launchApp({ hostPort: 4615 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Sotterranei', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Sotterranei').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();

  // the .dd2vtt file joins the library
  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Libreria di mappe' }).click();
  const lib = G.getByRole('dialog', { name: 'Libreria di mappe' });
  await lib.getByLabel('Importa mappe da file').setInputFiles(fileURLToPath(new URL('./fixtures/cripta.dd2vtt', import.meta.url)));
  const card = lib.getByRole('listitem', { name: 'cripta' });
  await expect(card).toContainText('1 porta');
  await expect(card).toContainText('1 oggetto');
  await card.getByRole('button', { name: 'Usa qui' }).click();
  await expect(G.getByRole('status').filter({ hasText: 'lavori in privato' })).toContainText('cripta');

  // its grid, pointed at on the picture: two corners of a block of 2 × 2 squares
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await ed.getByRole('button', { name: 'Allinea con due clic' }).click();
  const cal = G.getByRole('dialog', { name: 'Allinea la griglia' });
  const img = cal.getByRole('img', { name: 'La mappa' });
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(640);
  // its size on screen (the dialog may still be growing in: the layout size, not the box)
  const shown = await img.evaluate((i: HTMLImageElement) => i.clientWidth);
  // the picture is 640 px wide, squares of 64: corners at 128 and 256
  const px = (v: number) => (v / 640) * shown;
  await img.click({ position: { x: px(128), y: px(128) } });
  await img.click({ position: { x: px(256), y: px(256) } });
  await cal.getByLabel('Quadretti per lato').fill('2');
  await expect(cal).toContainText(/6[34](\.\d+)? pixel per quadretto/);
  await cal.getByRole('button', { name: 'Applica' }).click();
  const field = ed.getByLabel('Pixel per casella');
  await expect.poll(async () => Math.abs(Number(await field.inputValue()) - 64)).toBeLessThan(1.5);

  await G.getByRole('button', { name: 'Fine', exact: true }).click();

  // the whole adventure into a file (the save dialog is skipped: the file is caught on its way out)
  await G.evaluate(() => {
    const w = window as unknown as { blob?: Blob; saved?: { name: string; text: string } };
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b: Blob | MediaSource) => {
      if (b instanceof Blob) w.blob = b;
      return create(b);
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const name = this.download;
      void w.blob?.text().then((text) => (w.saved = { name, text }));
    };
  });
  // the scenes tab may still be open from before
  const advButton = G.getByRole('button', { name: 'Avventura: salva o apri' });
  if (!(await advButton.isVisible())) await G.getByTitle('Scene').click();
  await advButton.click();
  const dlg = G.getByRole('dialog', { name: 'Avventura' });
  await dlg.getByLabel('Nome dell’avventura').fill('La cripta di Varos');
  await dlg.getByRole('button', { name: 'Salva il file' }).click();
  const saved = await G.waitForFunction(() => (window as unknown as { saved?: { name: string; text: string } }).saved).then((h) => h.jsonValue());
  expect(saved.name).toBe('La cripta di Varos.thevtt-adventure');
  await dlg.getByRole('button', { name: 'Chiudi' }).click();

  // another campaign opens it
  await G.getByTitle('Chiudi la sessione').click();
  await apiCall(G, 'POST', '/campaigns', { name: 'Altra campagna', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Altra campagna').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await G.getByTitle('Scene').click();
  await G.getByRole('button', { name: 'Avventura: salva o apri' }).click();
  const dlg2 = G.getByRole('dialog', { name: 'Avventura' });
  await dlg2.getByLabel('Apri un’avventura da file').setInputFiles({ name: saved.name, mimeType: 'application/json', buffer: Buffer.from(saved.text) });
  const card2 = dlg2.getByRole('group', { name: 'La cripta di Varos' });
  await expect(card2).toContainText('2 scene');
  await card2.getByRole('button', { name: 'Aggiungi alla campagna' }).click();
  await expect(G.locator('.ini-row', { hasText: 'cripta' })).toBeVisible();

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

test('a token flies, carries a trembling coloured light and an aura that shows who is inside', async () => {
  const gm = await launchApp({ hostPort: 4616 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Cieli', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Cieli').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await G.getByTitle('Aggiungi token').click();
  const inspector = G.locator('.inspector');
  await expect(inspector).toBeVisible();

  // up in the air, two squares
  await inspector.getByRole('button', { name: 'Più in alto' }).click();
  await inspector.getByRole('button', { name: 'Più in alto' }).click();
  await expect(inspector.getByLabel('Altezza da terra')).toHaveValue('3');

  // a torch: it trembles by itself; its colour can change
  await inspector.getByLabel('Luce').selectOption({ label: 'Torcia (6 m + 6 m)' });
  await expect(inspector.getByRole('switch', { name: 'Luce che tremola' })).toHaveAttribute('aria-checked', 'true');
  await inspector.getByLabel('Colore della luce').fill('#66ccff');

  // an aura, and nobody in it yet
  await inspector.getByLabel('Aura').selectOption('3');
  await expect(inspector).toContainText('Nessuno nell’aura');

  // for screen readers: who is on the map and where; the arrow keys walk the token
  const list = G.getByRole('list', { name: 'Token sulla mappa' });
  const before = (await list.locator('li').first().textContent())!;
  const col = Number(/colonna (\d+)/.exec(before)![1]);
  await G.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await G.keyboard.press('ArrowRight');
  await expect(list.locator('li').first()).toContainText(`colonna ${col + 1}`);
  await expect(list.locator('li').first()).toContainText('di altezza');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

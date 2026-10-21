import { expect, test } from '@playwright/test';
import { launchApp, register } from './app';

test('the extensions workshop: a template, a snippet, tried on the pretend table, saved and edited again', async () => {
  const gm = await launchApp({ hostPort: 4661 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'artefice', displayName: 'Ilaria' });

  await G.getByRole('button', { name: 'Account', exact: true }).click();
  await G.getByText('Impostazioni').click();
  await G.getByRole('button', { name: 'Estensioni', exact: true }).click();
  await G.getByRole('button', { name: 'Crea nel laboratorio' }).click();

  // a ready-made extension, its command tried at once
  await G.getByRole('button', { name: /Borsa del bottino/ }).click();
  await G.getByRole('dialog', { name: 'Partire da «Borsa del bottino»?' }).getByRole('button', { name: 'Usa il modello' }).click();
  await expect(G.locator('.workshop-title')).toContainText('Borsa del bottino');
  const bench = G.getByRole('complementary', { name: 'Banco di prova' });
  await expect(bench.getByRole('button', { name: '/bottino' })).toBeVisible();
  await bench.getByRole('textbox', { name: 'Chat del banco di prova' }).fill('/bottino');
  await bench.getByRole('textbox', { name: 'Chat del banco di prova' }).press('Enter');
  await expect(bench.getByRole('log')).toContainText('mostra «Bottino»');

  // the header from the form, a snippet from the side, typing with completions
  await G.getByPlaceholder('La mia estensione').fill('Borsa del drago');
  await expect(G.getByRole('textbox', { name: 'Codice dell’estensione' })).toContainText('// @name Borsa del drago');
  const code = G.getByRole('textbox', { name: 'Codice dell’estensione' });
  await code.click();
  await G.keyboard.press('Escape');
  await G.keyboard.press('ControlOrMeta+End');
  await G.keyboard.press('Enter');
  await G.getByRole('button', { name: 'Pulsante', exact: true }).click();
  await G.keyboard.type('Oro');
  await G.keyboard.press('Tab');
  await G.keyboard.type("thevtt.log('oro contato'); thevtt.roll('2d6', 'Oro')");
  await expect(bench.getByRole('toolbar', { name: 'Pulsanti dell’estensione' }).getByRole('button', { name: 'Oro' })).toBeVisible();
  await bench.getByRole('toolbar', { name: 'Pulsanti dell’estensione' }).getByRole('button', { name: 'Oro' }).click();
  await expect(bench.getByRole('log')).toContainText('oro contato');
  await expect(bench.getByRole('log')).toContainText(/Master tira Oro 2d6 = \d+/);

  // the pretend table plays by the rules: Lia's natural 20 reaches the extension's code
  await code.click();
  await G.keyboard.press('Escape');
  await G.keyboard.press('ControlOrMeta+End');
  await G.keyboard.press('Enter');
  await G.keyboard.type("thevtt.on('log', (e) => { if (e.roll?.parts[0]?.rolls?.[0]?.value === 20) thevtt.toast('critico!') ");
  await G.keyboard.press('ControlOrMeta+End');
  await G.keyboard.type(';');
  // the bench starts again a moment after the last key
  await G.waitForTimeout(1500);
  await bench.getByRole('button', { name: /20 naturale/ }).click();
  await expect(bench.getByRole('log')).toContainText('Lia tira Attacco 1d20+5 = 25');
  await expect(bench.getByRole('log')).toContainText('critico!');

  // a mistake is shown, not run silently
  await code.click();
  await G.keyboard.press('ControlOrMeta+End');
  await G.keyboard.press('Enter');
  await G.keyboard.type('thevtt.boh()');
  await expect(G.locator('.cm-lintRange-warning').first()).toBeVisible();
  await G.keyboard.press('ControlOrMeta+z');

  // a mistake while it runs points at its line, one click away
  await code.click();
  await G.keyboard.press('ControlOrMeta+End');
  await G.keyboard.press('Enter');
  await G.keyboard.type("thevtt.button('Rompi', () => thevtt.state.nulla.x)");
  await G.waitForTimeout(1500);
  await bench.getByRole('toolbar', { name: 'Pulsanti dell’estensione' }).getByRole('button', { name: 'Rompi' }).click();
  const goto = bench.getByRole('button', { name: /^riga \d+$/ });
  await expect(goto).toBeVisible();
  const line = Number((await goto.textContent())!.replace(/\D/g, ''));
  await goto.click();
  await expect(G.locator('.cm-lineNumbers .cm-activeLineGutter')).toHaveText(String(line));
  await expect(G.locator('.cm-activeLine')).toContainText("thevtt.button('Rompi'");

  // saved with Ctrl+S, it is one of the extensions; back in to change it
  await G.keyboard.press('ControlOrMeta+s');
  await expect(G.locator('.studio-top')).toContainText('Salvata');
  await G.getByRole('button', { name: 'Estensioni', exact: true }).first().click();
  await expect(G.getByText('Borsa del drago · 1.0')).toBeVisible();
  await G.getByRole('button', { name: 'Modifica Borsa del drago' }).click();
  await expect(G.getByRole('textbox', { name: 'Codice dell’estensione' })).toContainText("thevtt.button('Oro'");
  await G.getByPlaceholder('1.0').fill('1.1');
  await G.getByRole('button', { name: 'Salva', exact: true }).click();
  await G.getByRole('button', { name: 'Estensioni', exact: true }).first().click();
  await expect(G.getByText('Borsa del drago · 1.1')).toBeVisible();
  await expect(G.getByText(/Borsa del bottino/)).toHaveCount(0);

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

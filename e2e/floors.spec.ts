import { expect, test } from '@playwright/test';
import { apiCall, launchApp, nav, register } from './app';

test('ready-made rooms, copy and paste, and stairs down to another floor', async () => {
  const gm = await launchApp({ hostPort: 4612 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  await apiCall(G, 'POST', '/campaigns', { name: 'Torre', systemId: 'dnd5e-2024' });
  await G.reload();
  await nav(G, 'Campagne');
  await G.getByText('Torre').click();
  await G.getByRole('button', { name: 'Avvia sessione' }).click();
  await expect(G.getByTitle('Aggiungi token')).toBeVisible();
  const box = (await G.locator('.board canvas').boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  // a ready-made cell, put down with one click
  await G.keyboard.press('c');
  const ed = G.getByRole('complementary', { name: 'Editor mappa' });
  await ed.getByRole('listitem', { name: 'Cella' }).click();
  await expect(ed.getByLabel('Anteprima del pezzo da incollare')).toBeVisible();
  await expect(ed).toContainText('Cella · 7 × 6');
  // R turns it
  await G.keyboard.press('r');
  await expect(ed).toContainText('Cella · 6 × 7');
  await G.mouse.move(at(0.3, 0.4).x, at(0.3, 0.4).y);
  await G.mouse.click(at(0.3, 0.4).x, at(0.3, 0.4).y);
  await expect(G.getByRole('button', { name: 'Annulla' })).toHaveAttribute('title', /mappa/);

  // copy that zone, then paste it again elsewhere
  await ed.getByRole('radio', { name: 'Copia una zona' }).click();
  await G.mouse.move(at(0.22, 0.28).x, at(0.22, 0.28).y);
  await G.mouse.down();
  await G.mouse.move(at(0.38, 0.52).x, at(0.38, 0.52).y, { steps: 6 });
  await G.mouse.up();
  await expect(ed).toContainText('Zona copiata');
  await expect(ed.getByRole('radio', { name: 'Incolla' })).toHaveAttribute('aria-checked', 'true');
  await G.mouse.click(at(0.7, 0.4).x, at(0.7, 0.4).y);

  // a cellar, and stairs leading down to it
  await ed.getByRole('button', { name: 'Nuova scena vuota' }).click();
  await ed.getByLabel('Nome della nuova scena').fill('Cantina');
  await ed.getByRole('button', { name: 'Crea e modifica' }).click();
  await ed.getByLabel('Scena da modificare').selectOption({ label: 'Scena 1 · in gioco' });
  await G.keyboard.press('o');
  await ed.getByRole('radio', { name: 'Scale', exact: true }).click();
  const stairs = at(0.5, 0.75);
  await G.mouse.click(stairs.x, stairs.y);
  await G.keyboard.press('v');
  await G.mouse.click(stairs.x, stairs.y);
  await G.locator('.inspector').getByLabel('Porta a').selectOption({ label: 'Cantina' });
  await G.getByRole('button', { name: 'Fine', exact: true }).click();

  // a creature walks onto the stairs and goes down
  await G.getByTitle('Aggiungi token').click();
  await G.keyboard.press('Escape');
  const c = at(0.5, 0.5);
  await G.mouse.move(c.x, c.y);
  await G.mouse.down();
  await G.mouse.move(stairs.x, stairs.y, { steps: 8 });
  await G.mouse.up();
  await expect(G.locator('.log')).toContainText('PNG va su «Cantina»');

  expect(gm.errors, gm.errors.join('\n')).toEqual([]);
  await gm.app.close();
});

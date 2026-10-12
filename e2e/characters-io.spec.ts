import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchApp, nav, register } from './app';

test('a D&D Beyond character comes in from its file, and the sheet prints whole', async () => {
  const gm = await launchApp({ hostPort: 4631 });
  const G = gm.page;
  await register(G, { where: 'host', username: 'master', displayName: 'Marco' });
  const file = join(tmpdir(), `ddb-${Date.now()}.json`);
  writeFileSync(
    file,
    JSON.stringify({
      data: {
        name: 'Tharivol',
        race: { baseRaceName: 'Elf' },
        classes: [{ level: 3, definition: { name: 'Wizard' } }],
        background: { definition: { name: 'Sage' } },
        stats: [1, 2, 3, 4, 5, 6].map((id) => ({ id, value: 12 })),
        baseHitPoints: 17,
        inventory: [{ definition: { name: 'Dagger' }, quantity: 1, equipped: true }],
        classSpells: [{ spells: [{ definition: { name: 'Fire Bolt' } }] }],
      },
    }),
  );
  await nav(G, 'Personaggi');
  await G.getByLabel('Importa personaggi').setInputFiles(file);
  await expect(G.locator('.toast', { hasText: 'Tharivol importato da D&D Beyond' })).toBeVisible();
  await G.locator('.character-card', { hasText: 'Tharivol' }).click();
  // an imported character may still have choices to make: the builder opens on them
  if (await G.getByRole('button', { name: 'Stampa' }).count()) {
    await G.evaluate(() => {
      (window as unknown as { print: () => void }).print = () => {};
    });
    await G.getByRole('button', { name: 'Stampa' }).click();
    await expect(G.locator('.print-root .print-part').first()).toBeAttached();
  }
  expect(gm.errors).toEqual([]);
  await gm.app.close();
});

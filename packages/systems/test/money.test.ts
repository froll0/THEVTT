import { describe, expect, it } from 'vitest';
import { addCoins, addItem, dnd5e, formatCoins, pay, purse, splitCoins, warhammer } from '../src';

describe('money on the sheets', () => {
  it('D&D: loot split with nothing lost, coins added, change made when paying', () => {
    expect(splitCoins('dnd5e-2024', { gp: 10, sp: 1 }, 3)).toEqual({ share: { gp: 3, sp: 3, cp: 6 }, rest: { cp: 2 } });
    let c = addCoins('dnd5e-2024', dnd5e.normalize({}), { gp: 2, sp: 3 });
    expect(purse('dnd5e-2024', c)).toMatchObject({ gp: 2, sp: 3, cp: 0 });
    // 2 gp 3 sp, pays 5 sp: 1 gp 8 sp left
    const paid = pay('dnd5e-2024', c, { sp: 5 });
    expect('data' in paid && purse('dnd5e-2024', paid.data)).toMatchObject({ gp: 1, sp: 8, cp: 0 });
    expect(pay('dnd5e-2024', c, { gp: 5 })).toEqual({ error: 'Non bastano le monete' });
    c = addItem('dnd5e-2024', c, { name: 'Corda', qty: 1 });
    c = addItem('dnd5e-2024', c, { name: 'Corda', qty: 2 });
    expect(dnd5e.normalize(c).inventory.find((i) => i.name === 'Corda')!.qty).toBe(3);
    expect(formatCoins('dnd5e-2024', { gp: 3, cp: 6 })).toBe('3 mo, 6 mr');
  });

  it('Warhammer: coins of the price’s kind are spent; goods go to the gear', () => {
    let c = addCoins('wtow', warhammer.normalize({}), { argento: 2 });
    expect(purse('wtow', c)).toMatchObject({ argento: 2 });
    const paid = pay('wtow', c, { argento: 1 });
    expect('data' in paid && purse('wtow', paid.data)).toMatchObject({ argento: 1 });
    expect(pay('wtow', c, { oro: 1 })).toEqual({ error: 'Non bastano le monete di oro' });
    c = addItem('wtow', c, { name: 'Lanterna', qty: 1 });
    expect(warhammer.normalize(c).gear).toContain('Lanterna');
  });
});

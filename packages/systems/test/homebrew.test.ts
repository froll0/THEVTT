import { afterEach, describe, expect, it } from 'vitest';
import { dnd5e } from '../src';

afterEach(() => dnd5e.applyHomebrew([]));

describe('D&D homebrew', () => {
  it('cleans what it receives and joins the manual’s lists', () => {
    const hb = dnd5e.cleanHomebrew({
      spells: [{ id: 'fulmine-nero', name: 'Fulmine nero', level: 3, school: 'evo', classes: ['wizard', 'nope'], save: 'dex', damage: '8d6', damageType: 'necrotic', description: '<b>x</b>' }],
      feats: [{ name: 'Lama danzante', category: 'general', level: 4, abilityIncrease: ['dex', 'xxx'] }],
      subclasses: [{ classId: 'fighter', subclass: { name: 'Cavaliere della rosa', features: [{ level: 3, name: 'Spina', description: '…' }] } }, { classId: 'nope', subclass: { name: 'X' } }],
      items: [{ name: 'Spada del drago', weight: 3, cost: 5000, magicBonus: 7, description: 'Brucia' }],
    });
    expect(hb.spells[0]).toMatchObject({ id: 'hb-fulmine-nero', classes: ['wizard'], damage: '8d6', damageType: 'necrotic' });
    expect(hb.feats[0]!.abilityIncrease).toEqual(['dex']);
    expect(hb.subclasses).toHaveLength(1);
    expect(hb.items[0]!.magicBonus).toBe(3);

    dnd5e.applyHomebrew([hb]);
    expect(dnd5e.spellById('hb-fulmine-nero')?.name).toBe('Fulmine nero');
    expect(dnd5e.featById(hb.feats[0]!.id)?.name).toBe('Lama danzante');
    expect(dnd5e.classById('fighter')!.subclasses.some((s) => s.name === 'Cavaliere della rosa')).toBe(true);
    expect(dnd5e.homebrewItem(hb.items[0]!.id)?.description).toBe('Brucia');
    // applied again: no doubles; removed: gone
    dnd5e.applyHomebrew([hb, hb]);
    expect(dnd5e.SPELLS.filter((s) => s.id === 'hb-fulmine-nero')).toHaveLength(1);
    dnd5e.applyHomebrew([]);
    expect(dnd5e.spellById('hb-fulmine-nero')).toBeUndefined();
    expect(dnd5e.classById('fighter')!.subclasses.some((s) => s.name === 'Cavaliere della rosa')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { dnd5e } from '../src';

describe('characters from elsewhere', () => {
  it('reads a D&D Beyond character', () => {
    const ddb = {
      data: {
        name: 'Tharivol',
        race: { fullName: 'High Elf', baseRaceName: 'Elf' },
        classes: [{ level: 3, definition: { name: 'Wizard' } }, { level: 1, definition: { name: 'Fighter' } }],
        background: { definition: { name: 'Sage' } },
        stats: [1, 2, 3, 4, 5, 6].map((id) => ({ id, value: 10 + id })),
        bonusStats: [{ id: 4, value: 2 }],
        overrideStats: [],
        baseHitPoints: 24,
        removedHitPoints: 4,
        temporaryHitPoints: 0,
        inventory: [{ definition: { name: 'Dagger' }, quantity: 2, equipped: true }, { definition: { name: 'Lucky Rabbit Foot' }, quantity: 1 }],
        currencies: { gp: 15, sp: 3 },
        classSpells: [{ spells: [{ definition: { name: 'Fire Bolt' } }, { definition: { name: 'Magic Missile' } }] }],
        traits: { ideals: 'Conoscenza' },
      },
    };
    const r = dnd5e.importCharacter(ddb)!;
    expect(r.source).toBe('D&D Beyond');
    const c = r.character;
    expect(c).toMatchObject({ name: 'Tharivol', classId: 'wizard', level: 4, speciesId: 'elf', backgroundId: 'sage', currency: { gp: 15, sp: 3 } });
    expect(c.baseScores).toMatchObject({ str: 11, int: 16, cha: 16 });
    expect(c.hp).toEqual({ current: 20, temp: 0 });
    expect(c.inventory[0]).toMatchObject({ ref: 'dagger', qty: 2, equipped: true });
    expect(c.inventory[1]).toMatchObject({ ref: null, name: 'Lucky Rabbit Foot' });
    expect(c.cantrips).toContain('fireBolt');
    expect(c.spells).toContain('magicMissile');
    expect(c.details.ideals).toBe('Conoscenza');
  });

  it('reads a Foundry VTT dnd5e actor', () => {
    const actor = {
      name: 'Brunilde',
      type: 'character',
      system: {
        abilities: { str: { value: 16 }, dex: { value: 12 }, con: { value: 14 }, int: { value: 8 }, wis: { value: 10 }, cha: { value: 13 } },
        attributes: { hp: { value: 30, max: 32, temp: 2 } },
        details: { alignment: 'Neutrale buona', biography: { value: '<p>Nata tra i monti.</p>' } },
        currency: { gp: 40 },
      },
      items: [
        { type: 'class', name: 'Fighter', system: { levels: 3 } },
        { type: 'race', name: 'Dwarf' },
        { type: 'background', name: 'Soldier' },
        { type: 'weapon', name: 'Longsword', system: { quantity: 1, equipped: true } },
        { type: 'spell', name: 'Shield' },
      ],
    };
    const r = dnd5e.importCharacter(actor)!;
    expect(r.source).toBe('Foundry VTT');
    expect(r.character).toMatchObject({ name: 'Brunilde', classId: 'fighter', level: 3, speciesId: 'dwarf', backgroundId: 'soldier', hp: { current: 30, temp: 2 }, alignment: 'Neutrale buona' });
    expect(r.character.details.backstory).toBe('Nata tra i monti.');
    expect(r.character.inventory[0]).toMatchObject({ ref: 'longsword', equipped: true });
    expect(dnd5e.importCharacter({ hello: 1 })).toBeNull();
  });
});

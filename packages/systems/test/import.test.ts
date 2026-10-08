import { describe, expect, it } from 'vitest';
import { dnd5e } from '../src';

const goblin = {
  name: 'Goblin Warrior',
  size: ['S'],
  type: { type: 'fey', tags: ['goblinoid'] },
  ac: [{ ac: 15, from: ['{@item leather armor|xphb}', '{@item shield|xphb}'] }],
  hp: { average: 10, formula: '3d6' },
  speed: { walk: 30 },
  str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8,
  senses: ['darkvision 60 ft.'],
  cr: '1/4',
  trait: [{ name: 'Nimble Escape', entries: ['The goblin can take the {@action Disengage|XPHB} or {@action Hide|XPHB} action as a {@variantrule Bonus Action|XPHB}.'] }],
  action: [
    { name: 'Scimitar', entries: ['{@atkr m} {@hit 4}, reach 5 ft. {@h}5 ({@damage 1d6 + 2}) Slashing damage, plus 2 ({@damage 1d4}) Slashing damage if the attack roll had Advantage.'] },
    { name: 'Shortbow', entries: ['{@atkr r} {@hit 4}, range 80/320 ft. {@h}5 ({@damage 1d6 + 2}) Piercing damage.'] },
  ],
};

describe('5e.tools import', () => {
  it('turns a creature into a stat block', () => {
    const [m] = dnd5e.importFiveEtools({ monster: [goblin] });
    expect(m).toMatchObject({ name: 'Goblin Warrior', size: 'Piccola', type: 'Folletto', ac: 15, hp: { average: 10, dice: '3d6' }, speed: '9 m', cr: '1/4', xp: 50, senses: 'Scurovisione 18 m' });
    expect(m!.abilities.dex).toBe(15);
    expect(m!.actions[0]).toMatchObject({ name: 'Scimitar', attack: 4, damage: '1d6+2', damageType: 'taglienti', reach: '1,5 m' });
    expect(m!.actions[1]).toMatchObject({ name: 'Shortbow', attack: 4, damage: '1d6+2', damageType: 'perforanti', reach: '24/96 m' });
    expect(m!.traits![0]!.description).toBe('The goblin can take the Disengage or Hide action as a Bonus Action.');
  });

  it('reads saves, and skips what is not a creature', () => {
    const breath = { ...goblin, name: 'Drake', action: [{ name: 'Fire Breath', entries: ['{@actSave dex} {@dc 13}, each creature in a 15-foot Cone. Failure: {@damage 4d6} Fire damage. Dexterity saving throw.'] }] };
    const list = dnd5e.importFiveEtools([breath, { name: 'not a creature' }, 42]);
    expect(list).toHaveLength(1);
    expect(list[0]!.actions[0]).toMatchObject({ damage: '4d6', save: { ability: 'dex', dc: 13 } });
  });
});

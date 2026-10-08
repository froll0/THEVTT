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

describe('5e.tools import: defenses and legendary actions', () => {
  it('reads resistances, saves and legendary actions', () => {
    const dragon = {
      ...goblin,
      name: 'Adult Red Dragon',
      resist: ['cold', { resist: ['bludgeoning', 'piercing'], note: 'from nonmagical attacks' }],
      immune: ['fire'],
      vulnerable: ['cold'],
      save: { dex: '+6', con: '+13' },
      legendaryActions: 3,
      legendary: [
        { name: 'Tail Attack', entries: ['The dragon makes a tail attack. {@atk mw} {@hit 14} to hit, reach 15 ft. {@h}17 ({@damage 2d8 + 8}) bludgeoning damage.'] },
        { name: 'Wing Attack (Costs 2 Actions)', entries: ['Each creature within 10 feet must succeed on a {@dc 22} Dexterity saving throw or take 15 ({@damage 2d6 + 8}) bludgeoning damage.'] },
      ],
    };
    const [m] = dnd5e.importFiveEtools(dragon);
    expect(m).toMatchObject({ resistances: ['freddo', 'contundenti', 'perforanti'], immunities: ['fuoco'], vulnerabilities: ['freddo'], saves: { dex: 6, con: 13 } });
    expect(m!.legendary!.uses).toBe(3);
    expect(m!.legendary!.actions[0]).toMatchObject({ name: 'Tail Attack', attack: 14, damage: '2d8+8' });
    expect(m!.legendary!.actions[1]).toMatchObject({ name: 'Wing Attack', cost: 2, save: { ability: 'dex', dc: 22 }, damage: '2d6+8' });
  });

  it('characters resist what their species does', () => {
    const c = dnd5e.normalize({ speciesId: 'tiefling', speciesChoices: { legacy: 'infernal' }, classId: 'wizard', level: 3 });
    const key = dnd5e.SPECIES.find((s) => s.id === 'tiefling')!.choice!.key;
    expect(dnd5e.damageDefenses({ ...c, speciesChoices: { [key]: 'infernal' } })).toEqual({ resist: ['fuoco'] });
    expect(dnd5e.damageDefenses(dnd5e.normalize({ speciesId: 'dwarf', classId: 'fighter' }))).toEqual({ resist: ['veleno'] });
    const hurt = dnd5e.withHp(dnd5e.normalize({ speciesId: 'dwarf', classId: 'fighter', level: 1, baseScores: { str: 15, dex: 12, con: 14, int: 10, wis: 10, cha: 8 } }), 3);
    expect(hurt.hp.current).toBe(3);
  });
});

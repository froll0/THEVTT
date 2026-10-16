import { roll } from '@thevtt/shared';
import { describe, expect, it } from 'vitest';
import { award, getSystem, nimbleRules as n } from '../src';

function hero(patch: Partial<n.NimbleCharacter> = {}): n.NimbleCharacter {
  return { ...n.createCharacter(), name: 'Grudge', classId: 'berserker', ancestryId: 'dwarf', backgroundId: 'survivalist', stats: { str: 3, dex: 1, int: -1, wil: -1 }, ...patch };
}

describe('Nimble', () => {
  it('a level 1 Berserker dwarf: HP, Hit Dice, Wounds, speed, saves', () => {
    const c = hero();
    expect(n.maxHp(c)).toBe(20);
    expect(n.hitDie(c)).toBe(12);
    // level + Stout (+2) + Survivalist (+1)
    expect(n.maxHitDice(c)).toBe(4);
    expect(n.maxWounds(c)).toBe(7);
    expect(n.speed(c)).toBe(5);
    expect(n.saveKind(c, 'str')).toBe('adv');
    expect(n.saveKind(c, 'int')).toBe('dis');
    expect(n.saveFormula(c, 'str')).toBe('2d20kh1+3');
    expect(n.inventorySlots(c)).toBe(13);
    // unarmoured: Armor = DEX
    expect(n.armorValue(c)).toBe(1);
  });

  it('skills: stat + points + ancestry, never over +12', () => {
    const c = hero({ ancestryId: 'human', skillPoints: { might: 4 } });
    expect(n.skillValue(c, 'might')).toBe(3 + 4 + 1);
    expect(n.skillValue(c, 'lore')).toBe(-1 + 1);
    expect(n.skillValue({ ...c, skillPoints: { might: 20 } }, 'might')).toBe(12);
  });

  it('armour: mail adds DEX up to 2, plate none, a shield on top; the Zephyr uses DEX+STR unarmoured', () => {
    const items = (refs: string[]) => refs.map((ref, i) => ({ id: String(i), ref, name: ref, slots: 1, qty: 1, equipped: true }));
    expect(n.armorValue(hero({ stats: { str: 2, dex: 3, int: 0, wil: 0 }, items: items(['chain-shirt']) }))).toBe(9 + 2);
    expect(n.armorValue(hero({ items: items(['full-plate', 'iron-shield']) }))).toBe(18 + 4);
    expect(n.armorValue(hero({ classId: 'zephyr', stats: { str: 1, dex: 3, int: 0, wil: 0 } }))).toBe(4);
  });

  it('weapon attacks: the Primary Die rules, Vicious, no crit without proficiency', () => {
    const c = hero({ items: [{ id: 'a', ref: 'greataxe', name: 'Ascia bipenne', slots: 2, qty: 1 }, { id: 'b', ref: 'sickle', name: 'Falcetto', slots: 1, qty: 1 }] });
    const list = n.attacks(c);
    expect(list.find((a) => a.name === 'Ascia bipenne')!.formula).toBe('2d6n+3');
    // sickle: a DEX weapon, Vicious, and the Berserker isn't proficient with it
    expect(list.find((a) => a.name === 'Falcetto')!.formula).toBe('1d4nvx+1');
    // the formulas roll
    expect(() => roll(list[0]!.formula)).not.toThrow();
  });

  it('a Mage: mana (INT×3)+LVL from level 2, tiers every 2 levels, cantrips grow every 5', () => {
    const mage = hero({ classId: 'mage', ancestryId: 'elf', stats: { str: -1, dex: 0, int: 3, wil: 1 }, level: 5 });
    expect(n.manaMax(mage)).toBe(14);
    expect(n.highestTier(mage)).toBe(2);
    expect(n.schoolsKnown(mage)).toEqual(['fire', 'ice', 'lightning']);
    const dart = n.attacks(mage).find((a) => a.name === 'Dardo di fiamma')!;
    expect(dart.formula).toBe('1d10n+5');
    expect(n.knownSpells(mage).some((s) => s.id === 'shatter')).toBe(true);
    expect(n.knownSpells(mage).some((s) => s.id === 'cryosleep')).toBe(false);
    expect(n.manaMax({ ...mage, level: 1 })).toBe(0);
  });

  it('initiative: one digit 1 action, two digits 2, 20+ three', () => {
    expect(n.actionsFromInitiative(7)).toBe(1);
    expect(n.actionsFromInitiative(14)).toBe(2);
    expect(n.actionsFromInitiative(21)).toBe(3);
    expect(n.actionsFromInitiative(19, true)).toBe(3);
  });

  it('rests and levels', () => {
    let c = hero({ hp: { current: 1, temp: 0 }, wounds: 2, manaSpent: 3 });
    const field = n.fieldRest(c, [5, 7]);
    expect(field.healed).toBe(5 + 3 + 7 + 3);
    c = n.safeRest(field.character);
    expect(n.currentHp(c)).toBe(20);
    expect(c.wounds).toBe(1);
    expect(c.hitDiceSpent).toBe(0);
    const up = n.levelUp(c, 9);
    expect(up.level).toBe(2);
    expect(n.maxHp(up)).toBe(29);
    expect(n.statIncreaseAt(c, 4)).toEqual({ kind: 'key', stats: ['str', 'dex'] });
  });

  it('every class has its features, choices and subclasses in Italian, and the system is registered', () => {
    expect(n.CLASSES).toHaveLength(11);
    for (const cls of n.CLASSES) {
      expect(cls.subclasses.filter((s) => !s.story).length, cls.id).toBe(2);
      expect(cls.features.some((f) => f.level === 20), cls.id).toBe(true);
    }
    const sys = getSystem('nimble')!;
    expect(sys.validate(hero())).toEqual([]);
    expect(sys.tokenDefaults(hero())).toMatchObject({ hp: { current: 20, max: 20 }, ac: 1 });
  });

  it('monster difficulty: total levels against the heroes’', () => {
    expect(n.encounterDifficulty([2, 2, 2], [2, 2, 2]).label).toBe('Difficile');
    expect(n.encounterDifficulty([2, 2, 2], [1]).label).toBe('Facile');
    expect(n.encounterDifficulty([2, 2], [4, 4]).label).toBe('Molto mortale');
    // every monster has a level and either HP or the minion rules
    for (const m of n.ALL_MONSTERS) expect(m.hp !== null || m.minion, m.id).toBe(true);
  });

  it('levels by milestone: the GM grants it, the level up takes it', () => {
    const out = award('nimble', hero(), { milestone: true });
    const c = out.data as n.NimbleCharacter;
    expect(c.milestone).toBe(true);
    expect(out.note).toBe('può salire al livello 2');
    expect(n.levelUp(c, 6).milestone).toBeUndefined();
  });
});

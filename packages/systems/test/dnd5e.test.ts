import { describe, expect, it } from 'vitest';
import { dnd5e, getSystem } from '../src';

const { createCharacter, validate, maxHp, armorClass, skillBonus, saveBonus, abilityScore, spellcasting } = dnd5e;

function fighter() {
  const c = createCharacter();
  c.name = 'Brunhild';
  c.classId = 'fighter';
  c.speciesId = 'dwarf';
  c.backgroundId = 'soldier';
  c.baseScores = { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 };
  c.backgroundBonus = { str: 2, con: 1 };
  c.classSkills = ['perception', 'survival'];
  c.armorId = 'chainMail';
  c.shield = true;
  return c;
}

describe('D&D 5.5 (2024)', () => {
  it('is registered', () => {
    expect(getSystem('dnd5e-2024')?.shortName).toBe('D&D 5.5');
  });

  it('validates a legal level 1 character', () => {
    expect(validate(fighter())).toEqual([]);
  });

  it('derives stats', () => {
    const c = fighter();
    expect(abilityScore(c, 'str')).toBe(17);
    // d10 + CON(+2) + dwarven toughness(+1)
    expect(maxHp(c)).toBe(13);
    c.level = 5;
    // 13 + 4 * (6 + 2 + 1)
    expect(maxHp(c)).toBe(49);
    expect(armorClass(c)).toBe(18);
    expect(skillBonus(c, 'athletics')).toBe(3 + 3);
    expect(saveBonus(c, 'con')).toBe(2 + 3);
    expect(spellcasting(c)).toBeNull();
  });

  it('applies unarmored defense', () => {
    const c = fighter();
    c.classId = 'barbarian';
    c.armorId = 'none';
    c.shield = false;
    expect(armorClass(c)).toBe(10 + 1 + 2);
  });

  it('rejects illegal choices', () => {
    const c = fighter();
    c.backgroundBonus = { str: 2, int: 1 };
    c.classSkills = ['athletics', 'arcana'];
    c.baseScores.str = 18;
    const errors = validate(c).join('\n');
    expect(errors).toMatch(/serie standard/);
    expect(errors).toMatch(/caratteristiche del background/);
    expect(errors).toMatch(/non disponibile/);
    expect(errors).toMatch(/già data dal background/);
  });

  it('checks point buy budget', () => {
    const c = fighter();
    c.abilityMethod = 'pointbuy';
    c.baseScores = { str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 };
    expect(validate(c)).toEqual([]);
    c.baseScores.int = 9;
    expect(validate(c).join()).toMatch(/27 punti/);
  });

  it('requires species skill choices', () => {
    const c = fighter();
    c.speciesId = 'elf';
    expect(validate(c).join()).toMatch(/specie/);
    c.speciesSkills = ['insight'];
    expect(validate(c)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { dnd5e, getSystem } from '../src';

const {
  createCharacter,
  validate,
  maxHp,
  armorClass,
  skillBonus,
  saveBonus,
  abilityScore,
  spellcasting,
  normalize,
  makeItem,
  attacks,
  applyStartingEquipment,
  levelUp,
  longRest,
  shortRest,
  pending,
  resources,
  speed,
  alwaysPrepared,
  availableSpells,
  CLASSES,
  SPELLS,
  spellById,
  weaponById,
} = dnd5e;

function fighter() {
  const c = createCharacter();
  c.name = 'Brunhild';
  c.classId = 'fighter';
  c.speciesId = 'dwarf';
  c.backgroundId = 'soldier';
  c.baseScores = { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 };
  c.backgroundBonus = { str: 2, con: 1 };
  c.classSkills = ['perception', 'survival'];
  c.inventory = [makeItem('chainMail', 1, true), makeItem('shield', 1, true), makeItem('longsword', 1, true)];
  c.choices = { fightingStyle: ['defense'] };
  c.masteries = ['longsword', 'greatsword', 'longbow'];
  return c;
}

describe('D&D 5.5 (2024) data', () => {
  it('is registered', () => {
    expect(getSystem('dnd5e-2024')?.shortName).toBe('D&D 5.5');
  });

  it('has twelve classes with a subclass and features up to 20', () => {
    expect(CLASSES).toHaveLength(12);
    for (const cls of CLASSES) {
      expect(cls.subclasses.length).toBeGreaterThan(0);
      expect(cls.features.some((f) => f.level === 19)).toBe(true);
      if (cls.spellcasting) expect(cls.spellcasting.prepared).toHaveLength(20);
    }
  });

  it('references only spells that exist', () => {
    const ids = new Set(SPELLS.map((s) => s.id));
    expect(ids.size).toBe(SPELLS.length);
    for (const cls of CLASSES) {
      for (const sub of cls.subclasses) for (const g of sub.spells ?? []) for (const id of g.spells) expect(ids.has(id), `${sub.id}: ${id}`).toBe(true);
    }
    for (const land of ['arid', 'polar', 'temperate', 'tropical']) {
      const c = createCharacter();
      c.classId = 'druid';
      c.subclassId = 'land';
      c.level = 9;
      c.choices = { landType: [land] };
      for (const id of alwaysPrepared(c)) expect(spellById(id), id).toBeTruthy();
    }
  });
});

describe('D&D 5.5 (2024) rules', () => {
  it('validates a legal level 1 character', () => {
    expect(validate(fighter())).toEqual([]);
  });

  it('derives stats from equipment', () => {
    const c = fighter();
    expect(abilityScore(c, 'str')).toBe(17);
    // d10 + CON(+2) + dwarven toughness(+1)
    expect(maxHp(c)).toBe(13);
    // chain mail 16 + shield 2 + defense 1
    expect(armorClass(c)).toBe(19);
    expect(skillBonus(c, 'athletics')).toBe(3 + 2);
    expect(saveBonus(c, 'con')).toBe(2 + 2);
    expect(spellcasting(c)).toBeNull();
    const sword = attacks(c).find((a) => a.name === 'Spada lunga')!;
    expect(sword).toMatchObject({ bonus: 5, damage: '1d8+3', versatile: '1d10+3' });
    expect(sword.mastery?.name).toBe('Fiaccare');
  });

  it('levels up with average or rolled hit points', () => {
    let c = fighter();
    c = levelUp(c, null); // average 6
    c = levelUp(c, 10);
    expect(c.level).toBe(3);
    // 13 + (6+2+1) + (10+2+1)
    expect(maxHp(c)).toBe(13 + 9 + 13);
    expect(pending(c).join()).toMatch(/archetipo marziale/i);
  });

  it('applies ASI advancements and caps at 20', () => {
    const c = fighter();
    c.level = 4;
    c.advancements = [{ level: 4, feat: 'abilityScoreImprovement', asi: { str: 2 } }];
    expect(abilityScore(c, 'str')).toBe(19);
    c.advancements[0]!.asi = { str: 4 };
    expect(abilityScore(c, 'str')).toBe(20);
  });

  it('applies unarmored defense and monk speed', () => {
    const c = fighter();
    c.classId = 'monk';
    c.inventory = [];
    c.level = 6;
    // 10 + DEX(+1) + WIS(+1)
    expect(armorClass(c)).toBe(12);
    // dwarf 9 m + 4.5 m at level 6
    expect(speed(c)).toBe(13.5);
  });

  it('computes spellcasting and cantrip lists', () => {
    const c = createCharacter();
    c.classId = 'wizard';
    c.baseScores = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 };
    c.backgroundBonus = { int: 2, con: 1 };
    c.level = 5;
    const sc = spellcasting(c)!;
    expect(sc).toMatchObject({ saveDc: 8 + 3 + 3, attack: 6, cantripsKnown: 4, prepared: 9, maxSpellLevel: 3, slots: [4, 3, 2] });
    expect(availableSpells(c).some((s) => s.id === 'fireball')).toBe(true);
    expect(availableSpells(c).some((s) => s.id === 'cureWounds')).toBe(false);

    const w = createCharacter();
    w.classId = 'warlock';
    w.level = 5;
    expect(spellcasting(w)!.pact).toEqual({ count: 2, level: 3 });
  });

  it('tracks resources and rests', () => {
    let c = fighter();
    c.level = 4;
    c.resourcesUsed = { secondWind: 3 };
    c.spellSlotsUsed[0] = 1;
    c.hp.current = 5;
    expect(resources(c).find((r) => r.id === 'secondWind')).toMatchObject({ max: 3, used: 3 });
    c = shortRest(c, 1, 7);
    expect(c.resourcesUsed.secondWind).toBe(2);
    expect(c.hitDiceUsed).toBe(1);
    expect(c.hp.current).toBe(12);
    c = longRest(c);
    expect(c.resourcesUsed).toEqual({});
    expect(c.hp.current).toBeNull();
    expect(c.hitDiceUsed).toBe(0);
  });

  it('applies starting equipment and replaces it on a new pick', () => {
    let c = fighter();
    c.inventory = [];
    c.currency.gp = 3;
    c = applyStartingEquipment(c, 0, 'a');
    expect(c.inventory.map((i) => i.ref)).toContain('greatsword');
    expect(c.currency.gp).toBe(3 + 4 + 14);
    expect(c.inventory.find((i) => i.ref === 'arrows')?.qty).toBe(20);
    c = applyStartingEquipment(c, 2, 'b');
    expect(c.inventory.some((i) => i.ref === 'greatsword')).toBe(false);
    expect(c.currency.gp).toBe(3 + 155 + 50);
  });

  it('migrates version 1 characters', () => {
    const old = { ...fighter(), version: undefined, inventory: undefined, armorId: 'plate', shield: true, notes: 'Storia' } as unknown;
    const c = normalize(old);
    expect(c.version).toBe(2);
    expect(c.inventory.map((i) => i.ref)).toEqual(['plate', 'shield']);
    expect(c.details.backstory).toBe('Storia');
    expect(armorClass(c)).toBe(18 + 2 + 1);
  });

  it('rejects illegal choices', () => {
    const c = fighter();
    c.backgroundBonus = { str: 2, int: 1 };
    c.classSkills = ['athletics', 'arcana'];
    c.baseScores.str = 18;
    c.masteries = ['longsword', 'greatsword', 'longbow', 'dagger'];
    const errors = validate(c).join('\n');
    expect(errors).toMatch(/serie standard/);
    expect(errors).toMatch(/caratteristiche del background/);
    expect(errors).toMatch(/non disponibile/);
    expect(errors).toMatch(/già data dal background/);
    expect(errors).toMatch(/maestria/);
  });

  it('requires species choices', () => {
    const c = fighter();
    c.speciesId = 'elf';
    expect(validate(c).join()).toMatch(/lignaggio/);
    c.speciesChoices = { lineage: 'wood' };
    c.speciesSkills = ['insight'];
    expect(validate(c)).toEqual([]);
    expect(speed(c)).toBe(10.5);
  });

  it('knows every weapon mastery', () => {
    expect(weaponById('greataxe')?.mastery).toBe('cleave');
  });
});

describe('bestiary data', () => {
  it('has unique ids and stat blocks consistent with their dice and challenge rating', () => {
    const { MONSTERS, averageOf, xpForCr, CHALLENGE_RATINGS } = dnd5e;
    expect(MONSTERS.length).toBeGreaterThan(100);
    expect(new Set(MONSTERS.map((m) => m.id)).size).toBe(MONSTERS.length);
    const problems: string[] = [];
    for (const m of MONSTERS) {
      if (!CHALLENGE_RATINGS.includes(m.cr)) problems.push(`${m.id}: GS ${m.cr}`);
      if (xpForCr(m.cr) !== m.xp) problems.push(`${m.id}: PE ${m.xp} ≠ ${xpForCr(m.cr)}`);
      if (averageOf(m.hp.dice) !== m.hp.average) problems.push(`${m.id}: PF ${m.hp.average} ≠ ${averageOf(m.hp.dice)} (${m.hp.dice})`);
      for (const a of m.actions) if (a.damage && !/^\d+(d\d+)?([+-]\d+)?$/.test(a.damage)) problems.push(`${m.id}: danni «${a.damage}»`);
    }
    expect(problems).toEqual([]);
  });
});

describe('encounter budget (2024)', () => {
  it('adds each character and grades the monsters', () => {
    expect(dnd5e.partyBudget([3, 3, 3, 3])).toEqual({ low: 600, moderate: 900, high: 1600 });
    expect(dnd5e.encounterDifficulty([3, 3, 3, 3], 200)).toBe('trivial');
    expect(dnd5e.encounterDifficulty([3, 3, 3, 3], 500)).toBe('low');
    expect(dnd5e.encounterDifficulty([3, 3, 3, 3], 900)).toBe('moderate');
    expect(dnd5e.encounterDifficulty([3, 3, 3, 3], 1100)).toBe('high');
    expect(dnd5e.encounterDifficulty([3, 3, 3, 3], 2000)).toBe('deadly');
  });
});

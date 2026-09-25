import { BACKGROUNDS, CUSTOM_BACKGROUND_ID, type BackgroundDef } from './backgrounds';
import { CLASSES, FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_SLOTS, type ClassChoice, type ClassDef, type ResourceDef, type SubclassDef } from './classes';
import { ABILITIES, ABILITY_LABELS, POINT_BUY_BUDGET, POINT_BUY_COST, SKILL_IDS, SKILLS, STANDARD_ARRAY, type Ability, type Skill } from './data';
import { armorById, DAMAGE_TYPES, gearById, itemName, MASTERIES, weaponById, type Kit, type WeaponDef } from './equipment';
import { featById, FIGHTING_STYLES } from './feats';
import { SPECIES, type Size, type SpeciesDef } from './species';
import { spellById, SPELLS, type SpellDef } from './spells';

export type AbilityMethod = 'standard' | 'pointbuy' | 'manual';

export interface InventoryItem {
  uid: string;
  /** weapon, armor or gear id; null for custom items */
  ref: string | null;
  name: string;
  qty: number;
  /** per unit, in lb */
  weight: number;
  equipped: boolean;
  magicBonus?: number;
  notes?: string;
}

/** Ability Score Improvement or feat taken at a class level. */
export interface Advancement {
  level: number;
  feat: string;
  asi: Partial<Record<Ability, number>>;
}

export interface CharacterDetails {
  gender: string;
  age: string;
  height: string;
  weight: string;
  eyes: string;
  hair: string;
  skin: string;
  faith: string;
  traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  backstory: string;
  allies: string;
  notes: string;
}

export interface Dnd5eCharacter {
  version: 2;
  name: string;
  level: number;
  classId: string;
  subclassId: string | null;
  speciesId: string;
  backgroundId: string;
  size: Size;
  /** species options: ancestry / lineage / legacy */
  speciesChoices: Record<string, string>;
  abilityMethod: AbilityMethod;
  baseScores: Record<Ability, number>;
  /** +2/+1 or +1/+1/+1 spread over the background's abilities */
  backgroundBonus: Partial<Record<Ability, number>>;
  customBackground: { abilities: Ability[]; skills: Skill[] };
  classSkills: Skill[];
  speciesSkills: Skill[];
  /** from feats (Skilled), subclasses (Lore) or granted by the GM */
  extraSkills: Skill[];
  expertise: Skill[];
  /** Human "Versatile" origin feat */
  originFeat: string | null;
  /** class and subclass decisions: key → chosen option ids */
  choices: Record<string, string[]>;
  advancements: Advancement[];
  masteries: string[];
  languages: string[];
  cantrips: string[];
  spells: string[];
  hp: { current: number | null; temp: number };
  /** hit die roll for levels 2..n; null means the fixed average */
  hpRolls: (number | null)[];
  hitDiceUsed: number;
  deathSaves: { successes: number; failures: number };
  spellSlotsUsed: number[];
  pactSlotsUsed: number;
  resourcesUsed: Record<string, number>;
  inspiration: boolean;
  exhaustion: number;
  inventory: InventoryItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  /** starting equipment picked in the builder (gold granted, to replace it on a new pick) */
  startingEquipment: { classOption: number | null; backgroundOption: 'a' | 'b' | null; gold: number };
  alignment: string;
  portrait: string | null;
  details: CharacterDetails;
}

const EMPTY_DETAILS: CharacterDetails = {
  gender: '',
  age: '',
  height: '',
  weight: '',
  eyes: '',
  hair: '',
  skin: '',
  faith: '',
  traits: '',
  ideals: '',
  bonds: '',
  flaws: '',
  appearance: '',
  backstory: '',
  allies: '',
  notes: '',
};

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const proficiencyBonus = (level: number) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
/** metres, Italian style: 9 → "9 m", 10.5 → "10,5 m" */
export const fmtMeters = (m: number) => `${String(m).replace('.', ',')} m`;

/** Characters are plain JSON. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let uidSeq = 0;
export const newUid = () => `i${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

export function createCharacter(): Dnd5eCharacter {
  return {
    version: 2,
    name: '',
    level: 1,
    classId: '',
    subclassId: null,
    speciesId: '',
    backgroundId: '',
    size: 'medium',
    speciesChoices: {},
    abilityMethod: 'standard',
    baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    backgroundBonus: {},
    customBackground: { abilities: [], skills: [] },
    classSkills: [],
    speciesSkills: [],
    extraSkills: [],
    expertise: [],
    originFeat: null,
    choices: {},
    advancements: [],
    masteries: [],
    languages: ['Comune'],
    cantrips: [],
    spells: [],
    hp: { current: null, temp: 0 },
    hpRolls: [],
    hitDiceUsed: 0,
    deathSaves: { successes: 0, failures: 0 },
    spellSlotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    pactSlotsUsed: 0,
    resourcesUsed: {},
    inspiration: false,
    exhaustion: 0,
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    startingEquipment: { classOption: null, backgroundOption: null, gold: 0 },
    alignment: '',
    portrait: null,
    details: { ...EMPTY_DETAILS },
  };
}

/**
 * Fills defaults and migrates version-1 characters (armorId/shield/notes).
 * Every read path goes through this, so older saves keep working.
 */
export function normalize(raw: unknown): Dnd5eCharacter {
  const base = createCharacter();
  const c = { ...base, ...((raw ?? {}) as Partial<Dnd5eCharacter>) } as Dnd5eCharacter & { armorId?: string; shield?: boolean; notes?: string };
  c.details = { ...EMPTY_DETAILS, ...(c.details ?? {}) };
  c.currency = { ...base.currency, ...(c.currency ?? {}) };
  c.startingEquipment = { ...base.startingEquipment, ...(c.startingEquipment ?? {}) };
  c.hp = { ...base.hp, ...(c.hp ?? {}) };
  c.deathSaves = { ...base.deathSaves, ...(c.deathSaves ?? {}) };
  const slots = Array.isArray(c.spellSlotsUsed) ? c.spellSlotsUsed : [];
  c.spellSlotsUsed = Array.from({ length: 9 }, (_, i) => Number(slots[i]) || 0);
  for (const key of ['speciesChoices', 'choices', 'resourcesUsed', 'backgroundBonus'] as const) c[key] = { ...((c[key] as object) ?? {}) } as never;
  for (const key of ['classSkills', 'speciesSkills', 'extraSkills', 'expertise', 'advancements', 'masteries', 'languages', 'cantrips', 'spells', 'hpRolls', 'inventory'] as const) {
    if (!Array.isArray(c[key])) (c as unknown as Record<string, unknown>)[key] = [...(base[key] as unknown[])];
  }
  if (c.version !== 2) {
    if (c.armorId && c.armorId !== 'none') c.inventory.push(makeItem(c.armorId, 1, true));
    if (c.shield) c.inventory.push(makeItem('shield', 1, true));
    if (c.notes && !c.details.backstory) c.details.backstory = c.notes;
    delete c.armorId;
    delete c.shield;
    delete c.notes;
    c.version = 2;
  }
  return c;
}

export function makeItem(ref: string, qty = 1, equipped = false): InventoryItem {
  const wpn = weaponById(ref);
  const arm = armorById(ref);
  const gear = gearById(ref);
  return {
    uid: newUid(),
    ref,
    name: itemName(ref),
    qty: gear?.quantity && qty === 1 ? gear.quantity : qty,
    weight: wpn?.weight ?? arm?.weight ?? (gear ? gear.weight / (gear.quantity ?? 1) : 0),
    equipped,
  };
}

// ---------- lookups ----------

export const getClass = (c: Dnd5eCharacter): ClassDef | undefined => CLASSES.find((x) => x.id === c.classId);
export const getSpecies = (c: Dnd5eCharacter): SpeciesDef | undefined => SPECIES.find((x) => x.id === c.speciesId);
export const getSubclass = (c: Dnd5eCharacter): SubclassDef | undefined => getClass(c)?.subclasses.find((s) => s.id === c.subclassId);

export function getBackground(c: Dnd5eCharacter): BackgroundDef | undefined {
  if (c.backgroundId === CUSTOM_BACKGROUND_ID) {
    return {
      id: CUSTOM_BACKGROUND_ID,
      name: 'Personalizzato',
      description: 'Un background concordato con il master.',
      abilities: c.customBackground.abilities,
      skills: c.customBackground.skills,
      feat: c.choices.customBackgroundFeat?.[0] ?? '',
      tool: 'A scelta',
      equipment: { a: [], aGold: 0, bGold: 50 },
    };
  }
  return BACKGROUNDS.find((x) => x.id === c.backgroundId);
}

export const choice = (c: Dnd5eCharacter, key: string): string | undefined => c.choices[key]?.[0];
export const hasChoice = (c: Dnd5eCharacter, key: string, id: string) => !!c.choices[key]?.includes(id);

/** All feats the character has: background, human origin feat, advancements, fighting styles. */
export function featIds(c: Dnd5eCharacter): string[] {
  const out: string[] = [];
  const bg = getBackground(c)?.feat;
  if (bg) out.push(bg);
  if (c.originFeat) out.push(c.originFeat);
  for (const a of c.advancements) if (a.feat && a.level <= c.level) out.push(a.feat);
  for (const fs of c.choices.fightingStyle ?? []) out.push(fs);
  for (const fs of c.choices.additionalFightingStyle ?? []) out.push(fs);
  return out;
}

export const hasFeat = (c: Dnd5eCharacter, id: string) => featIds(c).includes(id);

// ---------- abilities ----------

export function abilityScore(c: Dnd5eCharacter, a: Ability): number {
  let score = (c.baseScores[a] ?? 10) + (c.backgroundBonus[a] ?? 0);
  for (const adv of c.advancements) if (adv.level <= c.level) score += adv.asi[a] ?? 0;
  let cap = 20;
  if (c.level >= 20 && c.classId === 'barbarian' && (a === 'str' || a === 'con')) {
    score += 4;
    cap = 25;
  }
  if (c.level >= 20 && c.classId === 'monk' && (a === 'dex' || a === 'wis')) {
    score += 4;
    cap = 25;
  }
  return Math.min(cap, score);
}

export const abilityMod = (c: Dnd5eCharacter, a: Ability) => mod(abilityScore(c, a));

export function pointBuyCost(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COST[scores[a]] ?? Infinity), 0);
}

// ---------- proficiencies ----------

export function skillProficiencies(c: Dnd5eCharacter): Set<Skill> {
  return new Set<Skill>([...(getBackground(c)?.skills ?? []), ...c.classSkills, ...c.speciesSkills, ...c.extraSkills]);
}

export function skillBonus(c: Dnd5eCharacter, s: Skill): number {
  const pb = proficiencyBonus(c.level);
  const profs = skillProficiencies(c);
  let bonus = abilityMod(c, SKILLS[s].ability);
  if (profs.has(s)) bonus += c.expertise.includes(s) ? pb * 2 : pb;
  else if (c.classId === 'bard' && c.level >= 2) bonus += Math.floor(pb / 2);
  // Thaumaturge / Magician add Wisdom to some Int checks
  if ((hasChoice(c, 'divineOrder', 'thaumaturge') && (s === 'arcana' || s === 'religion')) || (hasChoice(c, 'primalOrder', 'magician') && (s === 'arcana' || s === 'nature'))) {
    bonus += Math.max(1, abilityMod(c, 'wis'));
  }
  return bonus - 2 * c.exhaustion;
}

export function saveProficient(c: Dnd5eCharacter, a: Ability): boolean {
  if (getClass(c)?.saves.includes(a)) return true;
  if (c.classId === 'monk' && c.level >= 14) return true;
  if (c.classId === 'rogue' && c.level >= 15 && (a === 'wis' || a === 'cha')) return true;
  return false;
}

export function saveBonus(c: Dnd5eCharacter, a: Ability): number {
  return abilityMod(c, a) + (saveProficient(c, a) ? proficiencyBonus(c.level) : 0) - 2 * c.exhaustion;
}

export function initiativeBonus(c: Dnd5eCharacter): number {
  return abilityMod(c, 'dex') + (hasFeat(c, 'alert') ? proficiencyBonus(c.level) : 0) - 2 * c.exhaustion;
}

export function passivePerception(c: Dnd5eCharacter): number {
  return 10 + skillBonus(c, 'perception');
}

export function armorTraining(c: Dnd5eCharacter): Set<string> {
  const set = new Set<string>(getClass(c)?.armor ?? []);
  if (hasChoice(c, 'divineOrder', 'protector')) set.add('heavy');
  if (hasChoice(c, 'primalOrder', 'warden')) set.add('medium');
  return set;
}

export function weaponProficient(c: Dnd5eCharacter, w: WeaponDef): boolean {
  if (w.category === 'simple') return true;
  const cls = getClass(c);
  if (!cls) return false;
  if (hasChoice(c, 'divineOrder', 'protector') || hasChoice(c, 'primalOrder', 'warden')) return true;
  if (cls.martial === true) return true;
  if (cls.martial === 'finesseOrLight') return w.properties.includes('finesse') || w.properties.includes('light');
  if (cls.martial === 'light') return w.properties.includes('light');
  return false;
}

export function masteryCount(c: Dnd5eCharacter): number {
  return getClass(c)?.masteries?.[c.level - 1] ?? 0;
}

export function expertiseCount(c: Dnd5eCharacter): number {
  return (getClass(c)?.expertise ?? []).filter((e) => e.level <= c.level).reduce((n, e) => n + e.count, 0);
}

// ---------- defence, speed, hit points ----------

export function equippedArmor(c: Dnd5eCharacter) {
  const item = c.inventory.find((i) => i.equipped && i.ref && armorById(i.ref) && armorById(i.ref)!.category !== 'shield');
  return item ? { item, def: armorById(item.ref!)! } : null;
}

export function equippedShield(c: Dnd5eCharacter) {
  return c.inventory.find((i) => i.equipped && i.ref === 'shield') ?? null;
}

export function armorClass(c: Dnd5eCharacter): number {
  const dex = abilityMod(c, 'dex');
  const armor = equippedArmor(c);
  const shield = equippedShield(c);
  let ac: number;
  if (armor) {
    const d = armor.def;
    ac = d.base + (d.maxDex === null ? dex : Math.min(dex, d.maxDex)) + (armor.item.magicBonus ?? 0);
    if (hasFeat(c, 'defense')) ac += 1;
  } else {
    ac = 10 + dex;
    const cls = getClass(c);
    if (cls?.unarmoredDefense && !(cls.id === 'monk' && shield)) ac = Math.max(ac, 10 + dex + abilityMod(c, cls.unarmoredDefense));
    if (c.subclassId === 'draconic' && c.level >= 3) ac = Math.max(ac, 10 + dex + abilityMod(c, 'cha'));
  }
  if (shield) ac += 2 + (shield.magicBonus ?? 0);
  return ac;
}

export function speed(c: Dnd5eCharacter): number {
  const sp = getSpecies(c);
  let v = sp?.speed ?? 9;
  if (c.speciesId === 'elf' && c.speciesChoices.lineage === 'wood') v = 10.5;
  const armor = equippedArmor(c);
  const cls = getClass(c);
  if (cls?.speedBonus) {
    const unarmored = !armor && !equippedShield(c);
    const noHeavy = armor?.def.category !== 'heavy';
    if ((cls.id === 'monk' && unarmored) || (cls.id !== 'monk' && noHeavy)) v += cls.speedBonus(c.level);
  }
  return Math.max(0, v - 1.5 * c.exhaustion);
}

export function darkvision(c: Dnd5eCharacter): number {
  if (c.speciesId === 'elf' && c.speciesChoices.lineage === 'drow') return 36;
  return getSpecies(c)?.darkvision ?? 0;
}

export const averageHitDie = (die: number) => die / 2 + 1;

export function maxHp(c: Dnd5eCharacter): number {
  const cls = getClass(c);
  if (!cls) return 0;
  const con = abilityMod(c, 'con');
  const perLevelExtra = getSpecies(c)?.hpPerLevel ?? 0;
  let total = Math.max(1, cls.hitDie + con + perLevelExtra);
  for (let lvl = 2; lvl <= c.level; lvl++) {
    const rolled = c.hpRolls[lvl - 2];
    const die = rolled ?? averageHitDie(cls.hitDie);
    total += Math.max(1, die + con + perLevelExtra);
  }
  if (c.subclassId === 'draconic' && c.level >= 3) total += c.level;
  return total;
}

export function currentHp(c: Dnd5eCharacter): number {
  const max = maxHp(c);
  return c.hp.current === null ? max : Math.max(0, Math.min(max, c.hp.current));
}

// ---------- attacks ----------

export interface Attack {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  damageType: string;
  /** alternative two-handed damage */
  versatile?: string;
  range: string;
  notes: string[];
  mastery?: { name: string; description: string };
}

function withMod(dice: string, m: number) {
  return m === 0 ? dice : `${dice}${m > 0 ? '+' : ''}${m}`;
}

export function attacks(c: Dnd5eCharacter): Attack[] {
  const pb = proficiencyBonus(c.level);
  const str = abilityMod(c, 'str');
  const dex = abilityMod(c, 'dex');
  const isMonk = c.classId === 'monk';
  const monkDie = isMonk ? (c.level >= 17 ? '1d12' : c.level >= 11 ? '1d10' : c.level >= 5 ? '1d8' : '1d6') : null;
  const out: Attack[] = [];
  const seen = new Set<string>();
  for (const item of c.inventory) {
    const w = item.ref ? weaponById(item.ref) : undefined;
    if (!w || !item.equipped || seen.has(item.uid)) continue;
    seen.add(item.uid);
    const monkWeapon = isMonk && (w.category === 'simple' || w.properties.includes('light')) && w.kind === 'melee';
    const useDex = w.kind === 'ranged' || ((w.properties.includes('finesse') || monkWeapon) && dex > str);
    const abil = useDex ? dex : str;
    const prof = weaponProficient(c, w);
    const magic = item.magicBonus ?? 0;
    let bonus = abil + (prof ? pb : 0) + magic - 2 * c.exhaustion;
    if (w.kind === 'ranged' && hasFeat(c, 'archery')) bonus += 2;
    const baseDie = monkWeapon && monkDie && diceAvg(monkDie) > diceAvg(w.damage) ? monkDie : w.damage;
    const notes = w.properties.filter((p) => p !== 'versatile').map((p) => p);
    out.push({
      id: item.uid,
      name: item.name,
      bonus,
      damage: withMod(baseDie, abil + magic),
      damageType: DAMAGE_TYPES[w.damageType],
      versatile: w.versatile ? withMod(w.versatile, abil + magic) : undefined,
      range: w.range ? `${fmtMeters(w.range[0])}/${fmtMeters(w.range[1])}` : w.properties.includes('reach') ? '3 m' : '1,5 m',
      notes: [...notes, ...(prof ? [] : ['non competente'])],
      mastery: c.masteries.includes(w.id) && masteryCount(c) > 0 ? MASTERIES[w.mastery] : undefined,
    });
  }
  // unarmed strike
  const unarmedMod = isMonk ? Math.max(str, dex) : str;
  out.push({
    id: 'unarmed',
    name: 'Colpo senz’armi',
    bonus: unarmedMod + pb - 2 * c.exhaustion,
    damage: monkDie ? withMod(monkDie, unarmedMod) : String(Math.max(0, 1 + str)),
    damageType: DAMAGE_TYPES.bludgeoning,
    range: '1,5 m',
    notes: [],
  });
  return out;
}

function diceAvg(d: string) {
  const m = /^(\d*)d(\d+)$/.exec(d);
  if (!m) return Number(d) || 0;
  return (Number(m[1] || 1) * (Number(m[2]) + 1)) / 2;
}

// ---------- spellcasting ----------

export interface Spellcasting {
  ability: Ability;
  saveDc: number;
  attack: number;
  type: 'full' | 'half' | 'pact';
  cantripsKnown: number;
  prepared: number;
  maxSpellLevel: number;
  /** slots per spell level (index 0 = 1st) */
  slots: number[];
  pact: { count: number; level: number } | null;
}

export function spellcasting(c: Dnd5eCharacter): Spellcasting | null {
  const sc = getClass(c)?.spellcasting;
  if (!sc) return null;
  const lvl = Math.max(1, Math.min(20, c.level));
  const pb = proficiencyBonus(lvl);
  const m = abilityMod(c, sc.ability);
  let slots: number[] = [];
  let pact: Spellcasting['pact'] = null;
  if (sc.type === 'full') slots = FULL_CASTER_SLOTS[lvl - 1]!;
  if (sc.type === 'half') slots = HALF_CASTER_SLOTS[lvl - 1]!;
  if (sc.type === 'pact') {
    const [count, level] = PACT_SLOTS[lvl - 1]!;
    pact = { count, level };
  }
  const maxSpellLevel = pact ? pact.level : slots.length;
  let cantripsKnown = sc.cantrips?.[lvl - 1] ?? 0;
  if (hasChoice(c, 'divineOrder', 'thaumaturge') || hasChoice(c, 'primalOrder', 'magician')) cantripsKnown += 1;
  return { ability: sc.ability, saveDc: 8 + pb + m, attack: pb + m, type: sc.type, cantripsKnown, prepared: sc.prepared[lvl - 1] ?? 0, maxSpellLevel, slots, pact };
}

const LAND_SPELLS: Record<string, { level: number; spells: string[] }[]> = {
  arid: [
    { level: 3, spells: ['blur', 'burningHands', 'fireBolt'] },
    { level: 5, spells: ['fireball'] },
    { level: 7, spells: ['blight'] },
    { level: 9, spells: ['wallOfStone'] },
  ],
  polar: [
    { level: 3, spells: ['fogCloud', 'holdPerson', 'rayOfFrost'] },
    { level: 5, spells: ['sleetStorm'] },
    { level: 7, spells: ['iceStorm'] },
    { level: 9, spells: ['coneOfCold'] },
  ],
  temperate: [
    { level: 3, spells: ['mistyStep', 'shockingGrasp', 'sleep'] },
    { level: 5, spells: ['lightningBolt'] },
    { level: 7, spells: ['freedomOfMovement'] },
    { level: 9, spells: ['treeStride'] },
  ],
  tropical: [
    { level: 3, spells: ['acidSplash', 'rayOfSickness', 'web'] },
    { level: 5, spells: ['stinkingCloud'] },
    { level: 7, spells: ['polymorph'] },
    { level: 9, spells: ['insectPlague'] },
  ],
};

/** Spells always prepared from class features and subclass (not counted against the limit). */
export function alwaysPrepared(c: Dnd5eCharacter): string[] {
  const out: string[] = [];
  const sub = getSubclass(c);
  for (const group of sub?.spells ?? []) if (group.level <= c.level) out.push(...group.spells);
  const land = choice(c, 'landType');
  if (c.subclassId === 'land' && land) for (const g of LAND_SPELLS[land] ?? []) if (g.level <= c.level) out.push(...g.spells);
  if (c.classId === 'druid') out.push('speakWithAnimals');
  if (c.classId === 'ranger') out.push('huntersMark');
  if (c.classId === 'paladin' && c.level >= 2) out.push('divineSmite');
  if (c.classId === 'paladin' && c.level >= 5) out.push('findSteed');
  return [...new Set(out)];
}

/** Spells the class can pick from at the current level. */
export function availableSpells(c: Dnd5eCharacter): SpellDef[] {
  const sc = spellcasting(c);
  if (!sc) return [];
  const lists = new Set([c.classId]);
  if (c.classId === 'bard' && c.level >= 10) ['cleric', 'druid', 'wizard'].forEach((l) => lists.add(l));
  return SPELLS.filter((s) => s.level <= sc.maxSpellLevel && s.classes.some((cl) => lists.has(cl)));
}

/** Everything castable: chosen cantrips, prepared spells, always-prepared ones. */
export function knownSpells(c: Dnd5eCharacter): SpellDef[] {
  const ids = new Set([...c.cantrips, ...c.spells, ...alwaysPrepared(c)]);
  return [...ids]
    .map((id) => spellById(id))
    .filter((s): s is SpellDef => !!s)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function cantripDice(c: Dnd5eCharacter, s: SpellDef): string | undefined {
  if (!s.damage) return undefined;
  if (s.level > 0 || !s.cantripScaling) return s.damage;
  const n = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
  const m = /^(\d+)d(\d+)$/.exec(s.damage);
  return m ? `${Number(m[1]) * n}d${m[2]}` : s.damage;
}

// ---------- features & resources ----------

export interface FeatureView {
  name: string;
  level: number;
  description: string;
  source: string;
}

export function features(c: Dnd5eCharacter): FeatureView[] {
  const out: FeatureView[] = [];
  const cls = getClass(c);
  const sub = getSubclass(c);
  const sp = getSpecies(c);
  for (const t of sp?.traits ?? []) if (!t.level || t.level <= c.level) out.push({ name: t.name, level: t.level ?? 1, description: t.description, source: sp!.name });
  const spChoice = sp?.choice && c.speciesChoices[sp.choice.key];
  const opt = sp?.choice?.options.find((o) => o.id === spChoice);
  if (sp?.choice && opt) out.push({ name: `${sp.choice.label}: ${opt.name}`, level: 1, description: opt.description, source: sp.name });
  for (const f of cls?.features ?? []) if (f.level <= c.level) out.push({ ...f, source: cls!.name });
  for (const f of sub?.features ?? []) if (f.level <= c.level) out.push({ ...f, source: sub!.name });
  for (const ch of classChoices(c)) {
    for (const id of c.choices[ch.key] ?? []) {
      const o = ch.options.find((x) => x.id === id);
      if (o) out.push({ name: `${ch.label}: ${o.name}`, level: ch.level, description: o.description, source: cls?.name ?? '' });
    }
  }
  for (const id of featIds(c)) {
    const f = featById(id);
    if (f && f.category !== 'fightingStyle') out.push({ name: f.name, level: 1, description: f.description, source: 'Talento' });
  }
  return out.sort((a, b) => a.level - b.level);
}

export interface ResourceView {
  id: string;
  name: string;
  max: number;
  used: number;
  recharge: 'short' | 'long';
  die?: string;
}

export function resources(c: Dnd5eCharacter): ResourceView[] {
  const cls = getClass(c);
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, abilityMod(c, a)])) as Record<Ability, number>;
  const pb = proficiencyBonus(c.level);
  const list: ResourceView[] = [];
  const push = (r: ResourceDef) => {
    if (r.level > c.level) return;
    const max = r.max(c.level, mods);
    const recharge = r.shortFrom && c.level >= r.shortFrom ? 'short' : r.recharge;
    list.push({ id: r.id, name: r.name, max, used: Math.min(max, c.resourcesUsed[r.id] ?? 0), recharge, die: r.die?.(c.level) });
  };
  for (const r of cls?.resources ?? []) push(r);
  const speciesRes: ResourceDef[] = [];
  if (c.speciesId === 'dragonborn') {
    speciesRes.push({ id: 'breathWeapon', name: 'Arma a soffio', level: 1, recharge: 'long', max: () => pb, die: (l) => `${l >= 17 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1}d10` });
    speciesRes.push({ id: 'draconicFlight', name: 'Volo draconico', level: 5, recharge: 'long', max: () => 1 });
  }
  if (c.speciesId === 'dwarf') speciesRes.push({ id: 'stonecunning', name: 'Sensibilità alla pietra', level: 1, recharge: 'long', max: () => pb });
  if (c.speciesId === 'goliath') {
    speciesRes.push({ id: 'giantAncestry', name: 'Ascendenza gigante', level: 1, recharge: 'long', max: () => pb });
    speciesRes.push({ id: 'largeForm', name: 'Forma grande', level: 5, recharge: 'long', max: () => 1 });
  }
  if (c.speciesId === 'orc') {
    speciesRes.push({ id: 'adrenalineRush', name: 'Scarica di adrenalina', level: 1, recharge: 'short', max: () => pb });
    speciesRes.push({ id: 'relentlessEndurance', name: 'Tenacia implacabile', level: 1, recharge: 'long', max: () => 1 });
  }
  if (hasFeat(c, 'magicInitiate')) speciesRes.push({ id: 'magicInitiate', name: 'Iniziato alla magia (1° livello)', level: 1, recharge: 'long', max: () => 1 });
  for (const r of speciesRes) push(r);
  return list.filter((r) => r.max > 0 || r.die);
}

// ---------- choices ----------

/** Class and subclass choices unlocked at the current level, with fighting styles filled in. */
export function classChoices(c: Dnd5eCharacter): ClassChoice[] {
  const cls = getClass(c);
  const sub = getSubclass(c);
  const list = [...(cls?.choices ?? []), ...(sub?.choices ?? [])].filter((ch) => ch.level <= c.level);
  if (c.subclassId === 'champion' && c.level >= 7) list.push({ key: 'additionalFightingStyle', label: 'Stile di combattimento aggiuntivo', level: 7, options: [] });
  return list.map((ch) =>
    ch.key === 'fightingStyle' || ch.key === 'additionalFightingStyle'
      ? { ...ch, options: FIGHTING_STYLES.map((f) => ({ id: f.id, name: f.name, description: f.description })) }
      : ch,
  );
}

export function choiceCount(c: Dnd5eCharacter, ch: ClassChoice): number {
  return ch.count?.[c.level - 1] ?? 1;
}

/** ASI/feat slots unlocked so far (levels). */
export function asiLevels(c: Dnd5eCharacter): number[] {
  return (getClass(c)?.asiLevels ?? []).filter((l) => l <= c.level);
}

// ---------- rests & level up ----------

export function shortRest(c: Dnd5eCharacter, hitDiceSpent = 0, healed = 0): Dnd5eCharacter {
  const next = clone(c);
  const res = resources(c);
  for (const r of res) {
    const def = [...(getClass(c)?.resources ?? [])].find((x) => x.id === r.id);
    if (def?.shortRestOne) next.resourcesUsed[r.id] = Math.max(0, (next.resourcesUsed[r.id] ?? 0) - 1);
    else if (r.recharge === 'short') next.resourcesUsed[r.id] = 0;
  }
  next.pactSlotsUsed = 0;
  next.hitDiceUsed = Math.min(c.level, c.hitDiceUsed + hitDiceSpent);
  const max = maxHp(c);
  next.hp.current = Math.min(max, currentHp(c) + healed);
  if (next.hp.current >= max) next.hp.current = null;
  return next;
}

export function longRest(c: Dnd5eCharacter): Dnd5eCharacter {
  const next = clone(c);
  next.resourcesUsed = {};
  next.spellSlotsUsed = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  next.pactSlotsUsed = 0;
  next.hitDiceUsed = 0;
  next.hp = { current: null, temp: 0 };
  next.deathSaves = { successes: 0, failures: 0 };
  next.exhaustion = Math.max(0, c.exhaustion - 1);
  if (c.speciesId === 'human') next.inspiration = true;
  return next;
}

export function levelUp(c: Dnd5eCharacter, hpRoll: number | null): Dnd5eCharacter {
  if (c.level >= 20) return c;
  const next = clone(c);
  const before = maxHp(c);
  const wasFull = c.hp.current === null;
  next.hpRolls = [...c.hpRolls.slice(0, c.level - 1), hpRoll];
  next.level = c.level + 1;
  if (!wasFull) next.hp.current = currentHp(c) + (maxHp(next) - before);
  return next;
}

/** Things still to decide at the current level (shown as a to-do, not as errors). */
export function pending(c: Dnd5eCharacter): string[] {
  const out: string[] = [];
  const cls = getClass(c);
  if (!cls) return out;
  if (c.level >= cls.subclassLevel && !c.subclassId) out.push(`Scegli ${cls.subclassLabel.toLowerCase()}`);
  for (const lvl of asiLevels(c)) {
    const adv = c.advancements.find((a) => a.level === lvl);
    if (!adv || (!adv.feat && !Object.keys(adv.asi).length)) out.push(`Aumento di caratteristica o talento del ${lvl}° livello`);
  }
  for (const ch of classChoices(c)) {
    const need = choiceCount(c, ch);
    const have = c.choices[ch.key]?.length ?? 0;
    if (have < need) out.push(`${ch.label}: scegli ${need - have === 1 ? 'un’opzione' : `${need - have} opzioni`}`);
  }
  const mc = masteryCount(c);
  if (c.masteries.length < mc) out.push(`Maestria nelle armi: scegli ${mc - c.masteries.length} ${mc - c.masteries.length === 1 ? 'arma' : 'armi'}`);
  const ex = expertiseCount(c);
  if (c.expertise.length < ex) out.push(`Maestria nelle abilità: scegline ${ex - c.expertise.length}`);
  const sc = spellcasting(c);
  if (sc) {
    if (c.cantrips.length < sc.cantripsKnown) out.push(`Trucchetti: scegline ${sc.cantripsKnown - c.cantrips.length}`);
    if (c.spells.length < sc.prepared) out.push(`Incantesimi preparati: scegline ${sc.prepared - c.spells.length}`);
  }
  if (getSpecies(c)?.originFeat && !c.originFeat) out.push('Talento di origine (Versatile)');
  return out;
}

// ---------- validation ----------

function sameMultiset(a: number[], b: readonly number[]): boolean {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export function validate(raw: Dnd5eCharacter): string[] {
  const c = normalize(raw);
  const errors: string[] = [];
  if (!c.name.trim()) errors.push('Dai un nome al personaggio');
  if (!Number.isInteger(c.level) || c.level < 1 || c.level > 20) errors.push('Il livello deve essere tra 1 e 20');

  const cls = getClass(c);
  const species = getSpecies(c);
  const bg = getBackground(c);
  if (!cls) errors.push('Scegli una classe');
  if (!species) errors.push('Scegli una specie');
  if (!bg) errors.push('Scegli un background');

  const scores = ABILITIES.map((a) => c.baseScores[a]);
  if (c.abilityMethod === 'standard' && !sameMultiset(scores, STANDARD_ARRAY)) {
    errors.push('Assegna ogni valore della serie standard (15, 14, 13, 12, 10, 8) una sola volta');
  } else if (c.abilityMethod === 'pointbuy') {
    if (scores.some((s) => s < 8 || s > 15)) errors.push('Con l’acquisto a punti i valori vanno da 8 a 15');
    else if (pointBuyCost(c.baseScores) > POINT_BUY_BUDGET) errors.push(`Hai superato i ${POINT_BUY_BUDGET} punti disponibili`);
  } else if (c.abilityMethod === 'manual' && scores.some((s) => !Number.isInteger(s) || s < 3 || s > 18)) {
    errors.push('I punteggi tirati vanno da 3 a 18');
  }

  if (bg) {
    if (c.backgroundId === CUSTOM_BACKGROUND_ID) {
      if (new Set(bg.abilities).size !== 3) errors.push('Il background personalizzato richiede 3 caratteristiche diverse');
      if (new Set(bg.skills).size !== 2) errors.push('Il background personalizzato richiede 2 abilità diverse');
    }
    const entries = Object.entries(c.backgroundBonus).filter(([, v]) => v) as [Ability, number][];
    const values = entries.map(([, v]) => v);
    const validSpread = sameMultiset(values, [1, 2]) || sameMultiset(values, [1, 1, 1]);
    if (!validSpread) errors.push('Distribuisci +2/+1 oppure +1/+1/+1 tra le caratteristiche del background');
    else if (entries.some(([a]) => !bg.abilities.includes(a))) errors.push('Gli aumenti devono andare sulle caratteristiche del background');
  }

  if (cls) {
    const list = cls.skillList ?? SKILL_IDS;
    if (new Set(c.classSkills).size !== c.classSkills.length) errors.push('Abilità di classe duplicate');
    if (c.classSkills.length !== cls.skillChoices) errors.push(`Scegli ${cls.skillChoices} abilità di classe`);
    if (c.classSkills.some((s) => !list.includes(s))) errors.push('Abilità non disponibile per la classe');
    if (bg && c.classSkills.some((s) => bg.skills.includes(s))) errors.push('Un’abilità di classe è già data dal background: scegline un’altra');
    if (c.subclassId && !cls.subclasses.some((s) => s.id === c.subclassId)) errors.push('Sottoclasse non valida');
    if (c.subclassId && c.level < cls.subclassLevel) errors.push(`La sottoclasse si sceglie al ${cls.subclassLevel}° livello`);
  }

  if (species) {
    if (!species.sizes.includes(c.size)) errors.push('Taglia non valida per la specie');
    const ch = species.skillChoice;
    const need = ch?.count ?? 0;
    if (c.speciesSkills.length !== need) errors.push(`Scegli ${need} abilità dalla specie`);
    if (ch?.from && c.speciesSkills.some((s) => !ch.from!.includes(s))) errors.push('Abilità di specie non valida');
    const others = new Set<Skill>([...(bg?.skills ?? []), ...c.classSkills]);
    if (c.speciesSkills.some((s) => others.has(s))) errors.push('L’abilità di specie è già posseduta: scegline un’altra');
    if (species.choice && !c.speciesChoices[species.choice.key]) errors.push(`Scegli ${species.choice.label.toLowerCase()}`);
  }

  const profs = skillProficiencies(c);
  if (c.expertise.some((s) => !profs.has(s))) errors.push('La maestria richiede competenza nell’abilità');
  if (c.expertise.length > expertiseCount(c)) errors.push('Troppe abilità con maestria');
  if (c.masteries.length > masteryCount(c)) errors.push('Troppe armi con maestria');
  const sc = spellcasting(c);
  if (sc) {
    if (c.cantrips.length > sc.cantripsKnown) errors.push(`Puoi conoscere ${sc.cantripsKnown} trucchetti`);
    if (c.spells.length > sc.prepared) errors.push(`Puoi preparare ${sc.prepared} incantesimi`);
    const avail = new Set(availableSpells(c).map((s) => s.id));
    if ([...c.cantrips, ...c.spells].some((id) => !avail.has(id))) errors.push('Alcuni incantesimi non sono disponibili al tuo livello o per la tua classe');
  } else if (c.cantrips.length || c.spells.length) {
    errors.push('La classe non lancia incantesimi');
  }
  return errors;
}

// ---------- starting equipment ----------

export function applyStartingEquipment(c: Dnd5eCharacter, classOption: number | null, backgroundOption: 'a' | 'b' | null): Dnd5eCharacter {
  const next = clone(c);
  const cls = getClass(c);
  const bg = getBackground(c);
  // drop items added by a previous pick
  next.inventory = next.inventory.filter((i) => !i.notes?.startsWith('Equipaggiamento iniziale'));
  let gold = 0;
  const add = (kit: Kit, source: string) => {
    for (const k of kit) {
      const item = makeItem(k.item, k.qty ?? 1, false);
      item.notes = `Equipaggiamento iniziale (${source})`;
      const w = weaponById(k.item);
      const a = armorById(k.item);
      item.equipped = !!(w || a);
      next.inventory.push(item);
    }
  };
  if (cls && classOption !== null && cls.equipment[classOption]) {
    add(cls.equipment[classOption]!.kit, cls.name);
    gold += cls.equipment[classOption]!.gold;
  }
  if (bg && backgroundOption) {
    if (backgroundOption === 'a') {
      add(bg.equipment.a, bg.name);
      gold += bg.equipment.aGold;
    } else gold += bg.equipment.bGold;
  }
  // only one body armour equipped
  let armorSeen = false;
  for (const i of next.inventory) {
    const a = i.ref ? armorById(i.ref) : undefined;
    if (a && a.category !== 'shield' && i.equipped) {
      if (armorSeen) i.equipped = false;
      armorSeen = true;
    }
  }
  next.currency = { ...next.currency, gp: Math.max(0, next.currency.gp - c.startingEquipment.gold) + gold };
  next.startingEquipment = { classOption, backgroundOption, gold };
  return next;
}

export function carriedWeight(c: Dnd5eCharacter): number {
  const coins = (c.currency.cp + c.currency.sp + c.currency.ep + c.currency.gp + c.currency.pp) / 50;
  return Math.round((c.inventory.reduce((w, i) => w + i.weight * i.qty, 0) + coins) * 10) / 10;
}

export function carryingCapacity(c: Dnd5eCharacter): number {
  // Strength × 15 lb; Powerful Build counts as one size larger (×2)
  return abilityScore(c, 'str') * 15 * (c.speciesId === 'goliath' ? 2 : 1);
}

export function abilityLine(c: Dnd5eCharacter): string {
  return ABILITIES.map((a) => `${ABILITY_LABELS[a].short} ${abilityScore(c, a)}`).join(' · ');
}

export function headline(c: Dnd5eCharacter): string {
  const parts = [getSpecies(c)?.name, getClass(c)?.name].filter(Boolean);
  return parts.length ? `${parts.join(' ')} ${c.level}` : '';
}

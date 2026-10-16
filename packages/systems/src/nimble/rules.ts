import { ARMORS, GEAR, SHIELDS, UNARMED, WEAPONS, type ArmorDef, type WeaponDef } from './equipment';
import { CLASSES, getClass, type ClassDef } from './classes';
import { SKILL_INFO, SKILLS, STAT_INFO, STATS, type SkillId, type StatId } from './glossary';
import { ANCESTRIES, BACKGROUNDS, type OriginBonus } from './origins';
import { SPELLS, UTILITY_SPELLS, getSpell, type SchoolId, type SpellDef } from './spells';

export interface NimbleItem {
  id: string;
  /** weapon, armour, shield or gear id from the lists */
  ref?: string;
  name: string;
  slots: number;
  qty: number;
  equipped?: boolean;
  notes?: string;
}

export interface NimbleCharacter {
  version: 1;
  name: string;
  portrait?: string | null;
  classId: string | null;
  subclassId: string | null;
  ancestryId: string | null;
  backgroundId: string | null;
  motivation: string;
  level: number;
  /** the four stats, increases included */
  stats: Record<StatId, number>;
  /** which array the stats came from */
  array: 'standard' | 'balanced' | 'minmax' | 'custom';
  /** Fiendkin: the neutral save that becomes advantaged */
  extraSave: StatId | null;
  /** points put into skills beyond their stat */
  skillPoints: Partial<Record<SkillId, number>>;
  hp: { current: number | null; temp: number };
  /** the Hit Die rolled at each level up (index 0 = level 2) */
  hpRolls: number[];
  hitDiceSpent: number;
  wounds: number;
  manaSpent: number;
  /** class resources spent (Fury Dice, Combat Dice…) */
  resources: Record<string, number>;
  /** options picked from the class lists, by list id */
  choices: Record<string, string[]>;
  utilitySpells: string[];
  /** tiered spells or cantrips from other schools (subclasses, boons…) */
  extraSpells: string[];
  /** Songweaver's second school, Sky & Storm's Ice or Radiant */
  extraSchool: SchoolId | null;
  items: NimbleItem[];
  gold: number;
  silver: number;
  languages: string[];
  boons: string[];
  /** hand adjustments for what the sheet doesn't know about */
  bonus: { armor: number; speed: number; initiative: number; hp: number; mana: number; wounds: number };
  notes: string;
  /** levels gained by milestone (for the party's «a level each») */
  milestone?: boolean;
}

export const STAT_ARRAYS: Record<'standard' | 'balanced' | 'minmax', { name: string; values: number[] }> = {
  standard: { name: 'Standard', values: [2, 2, 0, -1] },
  balanced: { name: 'Bilanciata', values: [2, 1, 1, 0] },
  minmax: { name: 'Min–Max', values: [3, 1, -1, -1] },
};

const rid = () => Math.random().toString(36).slice(2, 10);

export function createCharacter(): NimbleCharacter {
  return {
    version: 1,
    name: '',
    classId: null,
    subclassId: null,
    ancestryId: null,
    backgroundId: null,
    motivation: '',
    level: 1,
    stats: { str: 0, dex: 0, int: 0, wil: 0 },
    array: 'standard',
    extraSave: null,
    skillPoints: {},
    hp: { current: null, temp: 0 },
    hpRolls: [],
    hitDiceSpent: 0,
    wounds: 0,
    manaSpent: 0,
    resources: {},
    choices: {},
    utilitySpells: [],
    extraSpells: [],
    extraSchool: null,
    items: [],
    gold: 0,
    silver: 0,
    languages: ['Comune'],
    boons: [],
    bonus: { armor: 0, speed: 0, initiative: 0, hp: 0, mana: 0, wounds: 0 },
    notes: '',
  };
}

/** Old or partial data (an import, an earlier version) made whole. */
export function normalize(raw: unknown): NimbleCharacter {
  const base = createCharacter();
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<NimbleCharacter>;
  return {
    ...base,
    ...c,
    stats: { ...base.stats, ...(c.stats ?? {}) },
    hp: { ...base.hp, ...(c.hp ?? {}) },
    bonus: { ...base.bonus, ...(c.bonus ?? {}) },
    level: Math.max(1, Math.min(20, Math.round(Number(c.level) || 1))),
    skillPoints: { ...(c.skillPoints ?? {}) },
    resources: { ...(c.resources ?? {}) },
    choices: { ...(c.choices ?? {}) },
    items: Array.isArray(c.items) ? c.items : [],
    hpRolls: Array.isArray(c.hpRolls) ? c.hpRolls : [],
    utilitySpells: Array.isArray(c.utilitySpells) ? c.utilitySpells : [],
    extraSpells: Array.isArray(c.extraSpells) ? c.extraSpells : [],
    languages: Array.isArray(c.languages) ? c.languages : base.languages,
    boons: Array.isArray(c.boons) ? c.boons : [],
  };
}

export const classOf = (c: NimbleCharacter): ClassDef | undefined => getClass(c.classId);
export const ancestryOf = (c: NimbleCharacter) => ANCESTRIES.find((a) => a.id === c.ancestryId);
export const backgroundOf = (c: NimbleCharacter) => BACKGROUNDS.find((b) => b.id === c.backgroundId);
export const subclassOf = (c: NimbleCharacter) => classOf(c)?.subclasses.find((s) => s.id === c.subclassId);
const bonuses = (c: NimbleCharacter): OriginBonus[] => [ancestryOf(c)?.bonus, backgroundOf(c)?.bonus].filter((b): b is OriginBonus => !!b);
const has = (c: NimbleCharacter, list: string, option: string) => !!c.choices[list]?.includes(option);

/** The higher of the class's two Key Stats («KEY»). */
export function keyStat(c: NimbleCharacter): number {
  const cls = classOf(c);
  if (!cls) return Math.max(...STATS.map((s) => c.stats[s]));
  return Math.max(c.stats[cls.keyStats[0]], c.stats[cls.keyStats[1]]);
}

export const fmt = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

export type SaveKind = 'adv' | 'dis' | 'neutral';

export function saveKind(c: NimbleCharacter, s: StatId): SaveKind {
  const cls = classOf(c);
  if (!cls) return 'neutral';
  const anc = ancestryOf(c)?.bonus.saves;
  if (s === cls.saves.adv) return 'adv';
  if (s === cls.saves.dis) return anc === 'dis-to-neutral' ? 'neutral' : 'dis';
  if (anc === 'neutral-to-adv' && c.extraSave === s) return 'adv';
  return 'neutral';
}

export function saveFormula(c: NimbleCharacter, s: StatId): string {
  const k = saveKind(c, s);
  const die = k === 'adv' ? '2d20kh1' : k === 'dis' ? '2d20kl1' : '1d20';
  const v = c.stats[s];
  return v === 0 ? die : `${die}${v > 0 ? '+' : '-'}${Math.abs(v)}`;
}

export function skillValue(c: NimbleCharacter, k: SkillId): number {
  let v = c.stats[SKILL_INFO[k].stat] + (c.skillPoints[k] ?? 0);
  for (const b of bonuses(c)) v += (b.allSkills ?? 0) + (b.skills?.[k] ?? 0);
  return Math.min(12, v);
}

/** Skill points to place: 4 at level 1, then 1 each level. */
export const skillPointsTotal = (c: NimbleCharacter) => 4 + (c.level - 1);
export const skillPointsUsed = (c: NimbleCharacter) => SKILLS.reduce((n, k) => n + Math.max(0, c.skillPoints[k] ?? 0), 0);

export function hitDie(c: NimbleCharacter): number {
  const cls = classOf(c);
  let d = cls?.hitDie ?? 8;
  if (c.subclassId === 'wild-heart' && c.level >= 3) d = Math.max(d, 10);
  const steps = [4, 6, 8, 10, 12, 20];
  const step = bonuses(c).reduce((n, b) => n + (b.hitDieStep ?? 0), 0);
  return steps[Math.min(steps.length - 1, Math.max(0, steps.indexOf(d) + step))] ?? d;
}

export function maxHitDice(c: NimbleCharacter): number {
  let n = c.level + bonuses(c).reduce((s, b) => s + (b.hitDice ?? 0), 0);
  if (has(c, 'greater', 'fiendish-boon')) n -= 1;
  return Math.max(1, n);
}

export function maxHp(c: NimbleCharacter): number {
  const cls = classOf(c);
  let hp = (cls?.startHp ?? 10) + c.hpRolls.slice(0, c.level - 1).reduce((a, b) => a + b, 0) + c.bonus.hp;
  if (c.subclassId === 'wild-heart' && c.level >= 3) hp += 5;
  return Math.max(1, hp);
}

export const currentHp = (c: NimbleCharacter) => Math.min(maxHp(c), c.hp.current ?? maxHp(c));

export function maxWounds(c: NimbleCharacter): number {
  let w = 6 + bonuses(c).reduce((s, b) => s + (b.maxWounds ?? 0), 0) + c.bonus.wounds;
  if (has(c, 'savage-arsenal', 'mighty-endurance')) w += 4;
  if (c.subclassId === 'oathbreaker' && c.level >= 3) w += 2;
  return Math.max(1, w);
}

export const inventorySlots = (c: NimbleCharacter) => 10 + c.stats.str;
export const slotsUsed = (c: NimbleCharacter) => c.items.reduce((n, i) => n + i.slots * Math.max(1, i.qty || 1), 0) + Math.floor(c.gold / 500);

export const findArmor = (ref?: string) => ARMORS.find((a) => a.id === ref);
export const findShield = (ref?: string) => SHIELDS.find((a) => a.id === ref);
export const findWeapon = (ref?: string) => WEAPONS.find((w) => w.id === ref);

export function equippedArmor(c: NimbleCharacter): ArmorDef | undefined {
  return c.items.filter((i) => i.equipped).map((i) => findArmor(i.ref)).find((a): a is ArmorDef => !!a);
}
export function equippedShield(c: NimbleCharacter): ArmorDef | undefined {
  return c.items.filter((i) => i.equipped).map((i) => findShield(i.ref)).find((a): a is ArmorDef => !!a);
}

/** Armour: what Defend takes off a hit. */
export function armorValue(c: NimbleCharacter): number {
  const dex = c.stats.dex;
  const a = equippedArmor(c);
  const shield = equippedShield(c);
  let v: number;
  if (!a) {
    v = dex;
    // Zephyr: Iron Defense
    if (c.classId === 'zephyr') v = (dex + c.stats.str) * (c.level >= 13 ? 2 : 1);
  } else {
    v = a.base + (a.dexMax === null ? 0 : Math.min(dex, a.dexMax));
  }
  if (shield) v += shield.base + (c.subclassId === 'refuge' && c.level >= 3 ? c.stats.wil : 0);
  v += bonuses(c).reduce((s, b) => s + (b.armor ?? 0), 0) + c.bonus.armor;
  if (has(c, 'underhanded', 'misdirection')) v += c.stats.int;
  if (has(c, 'chimeric', 'earthwalker')) v += 0; // only in beast form
  if (c.subclassId === 'wild-heart' && c.level >= 15) v += c.stats.wil;
  return v;
}

export function speed(c: NimbleCharacter): number {
  let s = 6 + bonuses(c).reduce((n, b) => n + (b.speed ?? 0), 0) + c.bonus.speed;
  if (c.classId === 'hunter' && c.level >= 4) s += 2;
  if (c.classId === 'zephyr' && !equippedArmor(c)) s += (c.level >= 2 ? 2 : 0) + (c.level >= 9 ? 2 : 0);
  if (has(c, 'decrees', 'unstoppable')) s += 1;
  return Math.max(1, s);
}

export function initiativeBonus(c: NimbleCharacter): number {
  let n = c.stats.dex + bonuses(c).reduce((s, b) => s + (b.initiative ?? 0), 0) + c.bonus.initiative;
  if (c.classId === 'zephyr' && c.level >= 2 && !equippedArmor(c)) n += c.level;
  return n;
}

export function initiativeFormula(c: NimbleCharacter): string {
  const adv = bonuses(c).some((b) => b.initiativeAdvantage) || has(c, 'savage-arsenal', 'eager');
  const n = initiativeBonus(c);
  return `${adv ? '2d20kh1' : '1d20'}${n === 0 ? '' : n > 0 ? `+${n}` : `-${-n}`}`;
}

/** Starting actions from an initiative total: one digit 1, two digits 2, 20+ all 3. */
export const actionsFromInitiative = (total: number, natural20 = false) => (natural20 || total >= 20 ? 3 : total >= 10 ? 2 : 1);

// ---------------- magic ----------------

export function manaMax(c: NimbleCharacter): number {
  const m = classOf(c)?.magic?.mana;
  if (!m || c.level < 2) return c.bonus.mana > 0 ? c.bonus.mana : 0;
  return Math.max(0, c.stats[m.stat] * m.times + c.level + c.bonus.mana);
}
export const manaLeft = (c: NimbleCharacter) => Math.max(0, manaMax(c) - c.manaSpent);

/** the highest tier the character can cast (and upcast to) */
export function highestTier(c: NimbleCharacter): number {
  const magic = classOf(c)?.magic;
  if (!magic) return 0;
  let t = 0;
  for (let i = 1; i < magic.tiers.length; i++) if (magic.tiers[i]! <= c.level) t = i;
  return t;
}

export function schoolsKnown(c: NimbleCharacter): SchoolId[] {
  const magic = classOf(c)?.magic;
  if (!magic) return [];
  const out = new Set<SchoolId>(magic.schools);
  if (c.extraSchool && (magic.extraSchool || c.subclassId === 'sky-storm')) out.add(c.extraSchool);
  if (c.subclassId === 'red-dragon' && c.level >= 3) out.add('fire');
  if (c.subclassId === 'abyssal' && c.level >= 3) out.add('ice');
  return [...out];
}

const OATHBREAKER_LOSES = ['true-strike', 'heal', 'warding-bond'];
const OATHBREAKER_GAINS = ['entice', 'shadow-trap', 'dread-visage'];

/** The spells on the sheet: cantrips and tiered spells of the schools known, class-only ones, extras. */
export function knownSpells(c: NimbleCharacter): SpellDef[] {
  const cls = classOf(c);
  const magic = cls?.magic;
  const tier = highestTier(c);
  const schools = schoolsKnown(c);
  const out: SpellDef[] = [];
  if (magic && c.level >= magic.cantripsAt) {
    for (const s of SPELLS) {
      if (!schools.includes(s.school)) continue;
      if (s.only && s.only !== cls!.id) continue;
      if (s.tier > tier) continue;
      // the Shadowmancer starts with only its Patron's two cantrips
      if (cls!.id === 'shadowmancer' && c.level < 2 && !s.only) continue;
      // the Reaver has lost Shadow Blast
      if (s.id === 'shadow-blast' && c.subclassId === 'reaver') continue;
      out.push(s);
    }
  }
  for (const id of c.extraSpells) {
    const s = getSpell(id);
    if (s && !out.includes(s)) out.push(s);
  }
  if (c.subclassId === 'oathbreaker') {
    const kept = out.filter((s) => !OATHBREAKER_LOSES.includes(s.id));
    for (const id of OATHBREAKER_GAINS) {
      const s = getSpell(id);
      if (s && (s.tier <= tier || s.tier === 0) && !kept.includes(s)) kept.push(s);
    }
    return kept.sort((a, b) => a.tier - b.tier);
  }
  return out.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

export const utilityKnown = (c: NimbleCharacter) => c.utilitySpells.map((id) => UTILITY_SPELLS.find((s) => s.id === id)).filter((s): s is SpellDef => !!s);

/** How many times a cantrip has grown (every 5 levels). */
export const cantripSteps = (c: NimbleCharacter) => Math.floor(c.level / 5);

/** a spell's damage formula for this character, ready to roll (single target: Primary Die rules) */
export function spellFormula(c: NimbleCharacter, s: SpellDef, extraMana = 0): string | null {
  if (!s.damage) return null;
  let f = s.damage.replace(/@key/g, String(keyStat(c))).replace(/@int/g, String(c.stats.int)).replace(/@wil/g, String(c.stats.wil));
  if (s.tier === 0 && s.highDamage) {
    const steps = cantripSteps(c);
    for (let i = 0; i < steps; i++) f += `+${s.highDamage}`;
  }
  // upcasts that add a flat amount or dice
  const up = s.upcast ? /^\+(\d+(?:d\d+)?) (?:danni|damage)\.?$/.exec(s.upcast) : null;
  if (up && extraMana > 0) for (let i = 0; i < extraMana; i++) f += `+${up[1]}`;
  f = f.replace(/\+-/g, '-').replace(/\+0(?!\d|d)/g, '');
  if (s.target === 'single' && s.id !== 'rebuke' && s.id !== 'heal' && s.id !== 'lifebinding-spirit') {
    // the first die term becomes the attack
    f = f.replace(/^(\d*d\d+)/, '$1n');
  }
  return f;
}

// ---------------- weapons ----------------

export function proficient(c: NimbleCharacter, w: WeaponDef): boolean {
  const p = classOf(c)?.weapons;
  if (!p) return true;
  if (w.id === 'unarmed') return true;
  switch (p) {
    case 'martial':
      return true;
    case 'str':
      return w.stat === 'str';
    case 'dex':
      return w.stat === 'dex';
    case 'melee':
      return w.tags.includes('melee');
    case 'blades-staves-wands':
      return w.tags.includes('blade') || w.tags.includes('staff');
    case 'blades-wands':
      return w.tags.includes('blade');
    case 'str-wands':
      return w.stat === 'str';
    case 'dex-wands':
      return w.stat === 'dex';
    case 'staves-wands':
      return w.tags.includes('staff');
  }
}

export interface NimbleAttack {
  id: string;
  name: string;
  formula: string;
  type: string;
  /** what's worth knowing: range, reach, properties */
  detail: string;
  /** an area or many targets: no miss, no crit */
  area?: boolean;
  source: 'weapon' | 'spell' | 'class';
  /** mana cost (tier) */
  mana?: number;
  actions?: number | string;
}

const term = (n: number) => (n === 0 ? '' : n > 0 ? `+${n}` : `-${-n}`);

export function weaponAttack(c: NimbleCharacter, w: WeaponDef): NimbleAttack {
  const prof = proficient(c, w);
  let mod = c.stats[w.stat];
  let dice = w.damage;
  if (w.id === 'unarmed') {
    mod = c.classId === 'zephyr' ? c.stats.str : 1 + c.stats.str;
  }
  if (c.classId === 'zephyr' && c.level >= 5 && w.tags.includes('melee')) mod += c.level;
  if (c.level >= 10 && c.classId === 'hunter' && w.tags.includes('ranged')) mod += c.stats.wil;
  const flags = `${w.vicious ? 'v' : ''}${prof ? '' : 'x'}`;
  const detail = [w.type, ...w.props, prof ? '' : 'senza competenza: niente critici'].filter(Boolean).join(' · ');
  return { id: `w-${w.id}`, name: w.name, formula: `${dice}n${flags}${term(mod)}`, type: w.type, detail, source: 'weapon' };
}

export function attacks(c: NimbleCharacter): NimbleAttack[] {
  const out: NimbleAttack[] = [];
  const seen = new Set<string>();
  for (const it of c.items) {
    const w = findWeapon(it.ref);
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push({ ...weaponAttack(c, w), name: it.name || w.name });
  }
  out.push(weaponAttack(c, UNARMED));
  // Stormshifter: the direbeast forms
  if (c.classId === 'stormshifter') {
    if (c.level >= 2) out.push({ id: 'gore', name: 'Incornata (Bestia temibile)', formula: `1d6n+${c.level}`, type: 'perforante', detail: 'Se colpisci: LIV PF temporanei', source: 'class' });
    if (c.level >= 3) out.push({ id: 'thunderfang', name: 'Zanna di tuono (Bestia del branco)', formula: `1d4n+${c.level}`, type: 'perforante', detail: '+1d4 da fulmine cumulativo per ogni critico o uccisione', source: 'class' });
    if (c.level >= 5) out.push({ id: 'sting', name: 'Pungiglione (Bestia degli incubi)', formula: `1d4n+${3 * c.level}`, type: 'acido', detail: '1/round, Portata 0; sul critico 4×LIV invece di 3×LIV', source: 'class' });
  }
  // Shepherd: Searing Light harms the undead or the Bloodied
  if (c.classId === 'shepherd' && c.stats.wil > 0) out.push({ id: 'searing', name: 'Luce rovente', formula: `${c.stats.wil}d8n`, type: 'radiante', detail: 'Portata 6, contro un non morto o un Sanguinante (o cura VOL d8 a un Morente)', source: 'class' });
  for (const s of knownSpells(c)) {
    const f = spellFormula(c, s);
    if (!f) continue;
    out.push({
      id: `s-${s.id}`,
      name: s.name,
      formula: f,
      type: s.damageType ?? '',
      detail: [s.tier === 0 ? 'Trucchetto' : `Grado ${s.tier}`, s.range ? `Gittata ${s.range}` : '', s.reach ? `Portata ${s.reach}` : '', s.save ? `TS su ${STAT_INFO[s.save].short} CD ${10 + keyStat(c)}` : ''].filter(Boolean).join(' · '),
      area: s.target !== 'single',
      source: 'spell',
      mana: s.tier,
      actions: s.actions,
    });
  }
  return out;
}

/** a d20 roll formula: 1d20+X */
export const d20 = (n: number) => `1d20${term(n)}`;

// ---------------- class features ----------------

export function featuresUpTo(c: NimbleCharacter) {
  const cls = classOf(c);
  const sub = subclassOf(c);
  const generic: { level: number; name: string; text: string }[] = [];
  for (const l of [4, 8, 12, 16]) generic.push({ level: l, name: 'Aumento delle caratteristiche chiave', text: cls ? `+1 a ${STAT_INFO[cls.keyStats[0]].short} o ${STAT_INFO[cls.keyStats[1]].short}.` : '+1 a una caratteristica chiave.' });
  for (const l of [5, 9, 13, 17]) generic.push({ level: l, name: 'Aumento delle caratteristiche secondarie', text: cls ? `+1 a ${STAT_INFO[cls.secondaryStats[0]].short} o ${STAT_INFO[cls.secondaryStats[1]].short}.` : '+1 a una caratteristica secondaria.' });
  generic.push({ level: 19, name: 'Dono epico', text: 'Scegli un Dono epico.' });
  return [...(cls?.features ?? []), ...(sub?.features ?? []), ...generic].filter((f) => f.level <= c.level).sort((a, b) => a.level - b.level);
}

/** how many options of each class list the character should have at its level */
export function choicesDue(c: NimbleCharacter): { id: string; name: string; due: number; picked: number }[] {
  const cls = classOf(c);
  if (!cls) return [];
  return cls.choices.map((ch) => ({ id: ch.id, name: ch.name, due: ch.at.filter((l) => l <= c.level).length, picked: c.choices[ch.id]?.length ?? 0 })).filter((x) => x.due > 0);
}

export function resourcesOf(c: NimbleCharacter) {
  const cls = classOf(c);
  return cls?.resources ? cls.resources(c.level, c.stats) : [];
}

// ---------------- the sheet in a line ----------------

export function headline(c: NimbleCharacter): string {
  const parts = [ancestryOf(c)?.name, classOf(c)?.name, c.level ? String(c.level) : ''].filter(Boolean);
  return parts.join(' ');
}

export function validate(c: NimbleCharacter): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push('Dai un nome all’eroe');
  if (!c.classId) out.push('Scegli una classe');
  if (!c.ancestryId) out.push('Scegli una stirpe');
  if (!c.backgroundId) out.push('Scegli un background');
  if (skillPointsUsed(c) > skillPointsTotal(c)) out.push(`Troppi punti abilità (${skillPointsUsed(c)}/${skillPointsTotal(c)})`);
  if (SKILLS.some((k) => skillValue(c, k) > 12)) out.push('Un’abilità supera +12');
  if (c.level >= 3 && classOf(c) && !c.subclassId) out.push('Scegli una sottoclasse (dal livello 3)');
  if (ancestryOf(c)?.bonus.saves === 'neutral-to-adv' && !c.extraSave) out.push('Infernide: scegli quale TS neutro diventa favorito');
  return out;
}

// ---------------- rests and level up ----------------

/** Safe Rest: all HP, Hit Dice, mana and class resources back; 1 Wound healed. */
export function safeRest(c: NimbleCharacter): NimbleCharacter {
  return { ...c, hp: { current: maxHp(c), temp: 0 }, hitDiceSpent: 0, manaSpent: 0, resources: {}, wounds: Math.max(0, c.wounds - 1) };
}

/** Field Rest: spend Hit Dice; camp = their maximum instead of rolling. */
export function fieldRest(c: NimbleCharacter, rolled: number[], camp = false): { character: NimbleCharacter; healed: number } {
  const die = hitDie(c);
  const left = maxHitDice(c) - c.hitDiceSpent;
  const dice = rolled.slice(0, Math.max(0, left));
  const oozeling = ancestryOf(c)?.bonus.hitDieStep;
  const healed = dice.reduce((s, r) => s + Math.max(0, (camp || oozeling ? die : r) + c.stats.str), 0);
  const hp = Math.min(maxHp(c), currentHp(c) + healed);
  return { character: { ...c, hitDiceSpent: c.hitDiceSpent + dice.length, hp: { ...c.hp, current: hp } }, healed: hp - currentHp(c) };
}

/** Level up: the Hit Die rolled with advantage goes onto max HP. */
export function levelUp(c: NimbleCharacter, hpRoll: number, statUp?: StatId[]): NimbleCharacter {
  if (c.level >= 20) return c;
  const stats = { ...c.stats };
  for (const s of statUp ?? []) stats[s] = Math.min(stats[s] + 1, 6);
  const next = { ...c, level: c.level + 1, hpRolls: [...c.hpRolls.slice(0, c.level - 1), Math.max(1, hpRoll)], stats };
  delete next.milestone;
  return { ...next, hp: { ...next.hp, current: Math.min(maxHp(next), (c.hp.current ?? maxHp(c)) + Math.max(1, hpRoll)) } };
}

/** which stats go up at the next level (key / secondary / two of any at 20) */
export function statIncreaseAt(c: NimbleCharacter, level: number): { kind: 'key' | 'secondary' | 'any2'; stats: StatId[] } | null {
  const cls = classOf(c);
  if (!cls) return null;
  if ([4, 8, 12, 16].includes(level)) return { kind: 'key', stats: [...cls.keyStats] };
  if ([5, 9, 13, 17].includes(level)) return { kind: 'secondary', stats: [...cls.secondaryStats] };
  if (level === 20) return { kind: 'any2', stats: [...STATS] };
  return null;
}

/** The class's starting gear, as items. */
export function startingItems(cls: ClassDef): NimbleItem[] {
  return cls.gear.map((ref) => {
    const w = findWeapon(ref);
    const a = findArmor(ref) ?? findShield(ref);
    const g = GEAR.find((x) => x.id === ref);
    const name = w?.name ?? a?.name ?? g?.name ?? ref;
    const slots = w ? (w.twoHanded ? 2 : 1) : a ? 1 : g?.slots ?? 1;
    return { id: rid(), ref, name, slots, qty: 1, equipped: !!a || undefined };
  });
}

export const allClasses = () => CLASSES;

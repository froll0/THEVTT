import {
  ABILITIES,
  ABILITY_LABELS,
  ARMORS,
  BACKGROUNDS,
  CLASSES,
  CUSTOM_BACKGROUND_ID,
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  SKILL_IDS,
  SKILLS,
  SPECIES,
  STANDARD_ARRAY,
  type Ability,
  type BackgroundDef,
  type Size,
  type Skill,
} from './data';

export type AbilityMethod = 'standard' | 'pointbuy' | 'manual';

export interface Dnd5eCharacter {
  name: string;
  level: number;
  classId: string;
  speciesId: string;
  backgroundId: string;
  size: Size;
  abilityMethod: AbilityMethod;
  baseScores: Record<Ability, number>;
  /** +2/+1 or +1/+1/+1 spread over the background's abilities */
  backgroundBonus: Partial<Record<Ability, number>>;
  /** used when backgroundId === 'custom' */
  customBackground: { abilities: Ability[]; skills: Skill[] };
  classSkills: Skill[];
  speciesSkills: Skill[];
  armorId: string;
  shield: boolean;
  /** current = null means full hit points */
  hp: { current: number | null; temp: number };
  deathSaves: { successes: number; failures: number };
  alignment: string;
  notes: string;
  portrait: string | null;
}

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const proficiencyBonus = (level: number) => 2 + Math.floor((Math.max(1, level) - 1) / 4);

export const getClass = (c: Dnd5eCharacter) => CLASSES.find((x) => x.id === c.classId);
export const getSpecies = (c: Dnd5eCharacter) => SPECIES.find((x) => x.id === c.speciesId);

export function getBackground(c: Dnd5eCharacter): BackgroundDef | undefined {
  if (c.backgroundId === CUSTOM_BACKGROUND_ID) {
    return {
      id: CUSTOM_BACKGROUND_ID,
      name: 'Personalizzato',
      abilities: c.customBackground.abilities,
      skills: c.customBackground.skills,
      feat: 'A scelta del master',
      tool: 'A scelta del master',
    };
  }
  return BACKGROUNDS.find((x) => x.id === c.backgroundId);
}

export function createCharacter(): Dnd5eCharacter {
  return {
    name: '',
    level: 1,
    classId: '',
    speciesId: '',
    backgroundId: '',
    size: 'medium',
    abilityMethod: 'standard',
    baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    backgroundBonus: {},
    customBackground: { abilities: [], skills: [] },
    classSkills: [],
    speciesSkills: [],
    armorId: 'none',
    shield: false,
    hp: { current: null, temp: 0 },
    deathSaves: { successes: 0, failures: 0 },
    alignment: '',
    notes: '',
    portrait: null,
  };
}

export function abilityScore(c: Dnd5eCharacter, a: Ability): number {
  return Math.min(20, (c.baseScores[a] ?? 10) + (c.backgroundBonus[a] ?? 0));
}

export function abilityMod(c: Dnd5eCharacter, a: Ability): number {
  return mod(abilityScore(c, a));
}

export function pointBuyCost(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COST[scores[a]] ?? Infinity), 0);
}

export function skillProficiencies(c: Dnd5eCharacter): Set<Skill> {
  return new Set<Skill>([...(getBackground(c)?.skills ?? []), ...c.classSkills, ...c.speciesSkills]);
}

export function skillBonus(c: Dnd5eCharacter, s: Skill): number {
  const prof = skillProficiencies(c).has(s) ? proficiencyBonus(c.level) : 0;
  return abilityMod(c, SKILLS[s].ability) + prof;
}

export function saveBonus(c: Dnd5eCharacter, a: Ability): number {
  const prof = getClass(c)?.saves.includes(a) ? proficiencyBonus(c.level) : 0;
  return abilityMod(c, a) + prof;
}

export function maxHp(c: Dnd5eCharacter): number {
  const cls = getClass(c);
  if (!cls) return 0;
  const con = abilityMod(c, 'con');
  const extra = getSpecies(c)?.hpPerLevel ?? 0;
  const first = cls.hitDie + con + extra;
  const perLevel = Math.max(1, cls.hitDie / 2 + 1 + con + extra);
  return Math.max(1, first) + (Math.max(1, c.level) - 1) * perLevel;
}

export function armorClass(c: Dnd5eCharacter): number {
  const dex = abilityMod(c, 'dex');
  const armor = ARMORS.find((a) => a.id === c.armorId) ?? ARMORS[0]!;
  const dexPart = armor.maxDex === null ? dex : Math.min(dex, armor.maxDex);
  let ac = armor.base + dexPart;
  const cls = getClass(c);
  if (armor.category === 'none' && cls?.unarmoredDefense) {
    // Monk's Unarmored Defense doesn't work with a shield
    const allowed = cls.id !== 'monk' || !c.shield;
    if (allowed) ac = Math.max(ac, 10 + dex + abilityMod(c, cls.unarmoredDefense));
  }
  return ac + (c.shield ? 2 : 0);
}

export function currentHp(c: Dnd5eCharacter): number {
  const max = maxHp(c);
  return c.hp.current === null ? max : Math.max(0, Math.min(max, c.hp.current));
}

export function initiativeBonus(c: Dnd5eCharacter): number {
  return abilityMod(c, 'dex');
}

export function passivePerception(c: Dnd5eCharacter): number {
  return 10 + skillBonus(c, 'perception');
}

export function spellcasting(c: Dnd5eCharacter): { ability: Ability; saveDc: number; attack: number } | null {
  const ability = getClass(c)?.spellcasting;
  if (!ability) return null;
  const pb = proficiencyBonus(c.level);
  const m = abilityMod(c, ability);
  return { ability, saveDc: 8 + pb + m, attack: pb + m };
}

function sameMultiset(a: number[], b: readonly number[]): boolean {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export function validate(c: Dnd5eCharacter): string[] {
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
    const values = entries.map(([, v]) => v).sort();
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
  }

  if (species) {
    if (!species.sizes.includes(c.size)) errors.push('Taglia non valida per la specie');
    const choice = species.skillChoice;
    const need = choice?.count ?? 0;
    if (c.speciesSkills.length !== need) errors.push(`Scegli ${need} abilità dalla specie`);
    if (choice?.from && c.speciesSkills.some((s) => !choice.from!.includes(s))) errors.push('Abilità di specie non valida');
    const others = new Set<Skill>([...(bg?.skills ?? []), ...c.classSkills]);
    if (c.speciesSkills.some((s) => others.has(s))) errors.push('L’abilità di specie è già posseduta: scegline un’altra');
  }

  if (!ARMORS.some((a) => a.id === c.armorId)) errors.push('Armatura sconosciuta');
  return errors;
}

export function abilityLine(c: Dnd5eCharacter): string {
  return ABILITIES.map((a) => `${ABILITY_LABELS[a].short} ${abilityScore(c, a)}`).join(' · ');
}

import type { GameSystem } from '../types';
import { CONDITION_INFO, CONDITIONS, SKILL_INFO, SKILLS, STAT_INFO, STATS } from './glossary';
import {
  ancestryOf,
  armorValue,
  attacks,
  classOf,
  createCharacter,
  currentHp,
  d20,
  headline,
  initiativeBonus,
  initiativeFormula,
  manaLeft,
  manaMax,
  maxHp,
  maxWounds,
  normalize,
  saveFormula,
  saveKind,
  skillValue,
  speed,
  validate,
  type NimbleCharacter,
} from './rules';

export * from './glossary';
export * from './equipment';
export * from './origins';
export * from './spells';
export * from './classes';
export * from './bestiary';
export * from './rules';

const SIZE_CELLS: Record<string, number> = { Grande: 2 };

export const nimble: GameSystem<NimbleCharacter> = {
  id: 'nimble',
  name: 'Nimble',
  shortName: 'Nimble',
  description: 'Il GdR tattico e veloce di Nimble Co.: 3 azioni per turno, il dado primario decide colpo e critico esplosivo, Difendersi e Interporsi, Ferite.',
  conditions: CONDITIONS,
  conditionInfo: CONDITION_INFO,
  table: 'd20',
  createCharacter,
  validate: (c) => validate(normalize(c)),
  headline: (c) => headline(normalize(c)),
  summary(raw) {
    const c = normalize(raw);
    return [
      { label: 'Classe', value: classOf(c)?.name ?? '—' },
      { label: 'Stirpe', value: ancestryOf(c)?.name ?? '—' },
      { label: 'Livello', value: String(c.level) },
      { label: 'PF', value: `${currentHp(c)}/${maxHp(c)}` },
      { label: 'Armatura', value: String(armorValue(c)) },
      { label: 'Ferite', value: `${c.wounds}/${maxWounds(c)}` },
      { label: 'Iniziativa', value: initiativeBonus(c) >= 0 ? `+${initiativeBonus(c)}` : String(initiativeBonus(c)) },
      { label: 'Velocità', value: String(speed(c)) },
      ...(manaMax(c) ? [{ label: 'Mana', value: `${manaLeft(c)}/${manaMax(c)}` }] : []),
      ...STATS.map((s) => ({ label: STAT_INFO[s].short, value: c.stats[s] >= 0 ? `+${c.stats[s]}` : String(c.stats[s]) })),
    ];
  },
  quickRolls(raw) {
    const c = normalize(raw);
    return [
      { group: 'Iniziativa', label: 'Iniziativa', formula: initiativeFormula(c) },
      ...STATS.map((s) => ({ group: 'Tiri salvezza', label: `TS ${STAT_INFO[s].short}${saveKind(c, s) === 'adv' ? ' (+)' : saveKind(c, s) === 'dis' ? ' (–)' : ''}`, formula: saveFormula(c, s) })),
      ...SKILLS.map((k) => ({ group: 'Abilità', label: SKILL_INFO[k].name, formula: d20(skillValue(c, k)) })),
      ...attacks(c).map((a) => ({ group: 'Attacchi', label: a.name, formula: a.formula })),
    ];
  },
  tokenDefaults(raw) {
    const c = normalize(raw);
    return {
      hp: { current: currentHp(c), max: maxHp(c) },
      ac: armorValue(c),
      size: SIZE_CELLS[ancestryOf(c)?.size ?? ''] ?? 1,
      initiativeModifier: initiativeBonus(c),
      nimble: { wounds: { current: c.wounds, max: maxWounds(c) } },
    };
  },
  withWounds(raw, wounds) {
    const c = normalize(raw);
    return { ...c, wounds: Math.max(0, Math.min(maxWounds(c), wounds)) };
  },
  withHp(raw, current) {
    const c = normalize(raw);
    return { ...c, hp: { ...c.hp, current: Math.max(0, Math.min(maxHp(c), current)) } };
  },
};

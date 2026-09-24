import type { GameSystem } from '../types';
import { ABILITIES, ABILITY_LABELS, CONDITIONS, SKILL_IDS, SKILLS } from './data';
import {
  armorClass,
  createCharacter,
  fmtMod,
  getBackground,
  getClass,
  getSpecies,
  initiativeBonus,
  maxHp,
  passivePerception,
  proficiencyBonus,
  saveBonus,
  skillBonus,
  abilityMod,
  spellcasting,
  validate,
  type Dnd5eCharacter,
} from './rules';

export * from './data';
export * from './rules';

const d20 = (bonus: number) => `1d20${bonus >= 0 ? '+' : ''}${bonus}`;

export const dnd5e2024: GameSystem<Dnd5eCharacter> = {
  id: 'dnd5e-2024',
  name: 'Dungeons & Dragons 5.5 (2024)',
  shortName: 'D&D 5.5',
  description: 'Regole 2024 basate sul System Reference Document 5.2 (CC-BY-4.0).',
  conditions: CONDITIONS,
  createCharacter,
  validate,
  summary(c) {
    const lines = [
      { label: 'Classe', value: `${getClass(c)?.name ?? '—'} ${c.level}` },
      { label: 'Specie', value: getSpecies(c)?.name ?? '—' },
      { label: 'Background', value: getBackground(c)?.name ?? '—' },
      { label: 'PF', value: String(maxHp(c)) },
      { label: 'CA', value: String(armorClass(c)) },
      { label: 'Iniziativa', value: fmtMod(initiativeBonus(c)) },
      { label: 'Velocità', value: `${getSpecies(c)?.speed ?? 30} ft` },
      { label: 'Competenza', value: fmtMod(proficiencyBonus(c.level)) },
      { label: 'Percezione passiva', value: String(passivePerception(c)) },
    ];
    const sc = spellcasting(c);
    if (sc) lines.push({ label: 'CD incantesimi', value: `${sc.saveDc} (${ABILITY_LABELS[sc.ability].short})` });
    return lines;
  },
  quickRolls(c) {
    return [
      { group: 'Generale', label: 'Iniziativa', formula: d20(initiativeBonus(c)) },
      { group: 'Generale', label: 'Tiro salvezza contro morte', formula: '1d20' },
      ...ABILITIES.map((a) => ({ group: 'Caratteristiche', label: ABILITY_LABELS[a].name, formula: d20(abilityMod(c, a)) })),
      ...ABILITIES.map((a) => ({ group: 'Tiri salvezza', label: ABILITY_LABELS[a].name, formula: d20(saveBonus(c, a)) })),
      ...SKILL_IDS.map((s) => ({ group: 'Abilità', label: SKILLS[s].name, formula: d20(skillBonus(c, s)) })),
    ];
  },
  tokenDefaults(c) {
    const max = maxHp(c);
    return {
      hp: { current: c.hp.current > 0 ? Math.min(c.hp.current, max) : max, max },
      ac: armorClass(c),
      size: 1,
      initiativeModifier: initiativeBonus(c),
    };
  },
};

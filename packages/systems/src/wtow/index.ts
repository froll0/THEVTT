import type { GameSystem, TokenDefaults } from '../types';
import { CHAR_INFO, CHARACTERISTICS, SKILL_INFO, SKILLS } from './data';
import { CONDITION_INFO, CONDITIONS, WOUND_TABLE, woundFor } from './catalog';
import {
  characteristic,
  createCharacter,
  fateLeft,
  fateMax,
  getCareer,
  getLineage,
  headline,
  isArmoured,
  mageLevel,
  normalize,
  pool,
  protection,
  resilience,
  statusLabel,
  testFormula,
  untreatedWounds,
  validate,
  type WtowCharacter,
} from './rules';

export * from './data';
export * from './catalog';
export * from './magic';
export * from './bestiary';
export * from './rules';

export function characterPool(c: WtowCharacter): NonNullable<TokenDefaults['pool']> {
  const p = protection(c);
  const shieldDefence = c.shield ? p.defence : p.athletics;
  return {
    type: 'pg',
    resilience: resilience(c),
    toughness: characteristic(c, 'r'),
    armoured: isArmoured(c),
    melee: { dice: p.best.dice, target: p.best.target },
    ranged: { dice: shieldDefence.dice, target: shieldDefence.target },
    wounds: c.wounds.length,
    untreated: untreatedWounds(c),
    hardy: c.talents.some((t) => t.id === 'gagliardo') || undefined,
  };
}

export const wtow: GameSystem<WtowCharacter> = {
  id: 'wtow',
  name: 'Warhammer: the Old World – Gioco di Ruolo',
  shortName: 'Warhammer',
  description: 'Il GdR di Cubicle 7 (edizione italiana Need Games): riserve di d10, Stirpi e Carriere, Zone, Ferite e Fato.',
  conditions: CONDITIONS,
  conditionInfo: CONDITION_INFO,
  table: 'pool',
  createCharacter,
  validate: (c) => validate(normalize(c)),
  headline: (c) => headline(normalize(c)),
  summary(raw) {
    const c = normalize(raw);
    const p = protection(c).best;
    return [
      { label: 'Stirpe', value: getLineage(c)?.name ?? '—' },
      { label: 'Carriera', value: getCareer(c)?.name ?? '—' },
      { label: 'Status', value: statusLabel(c) },
      { label: 'Resilienza', value: String(resilience(c)) },
      { label: 'Protezione', value: `${p.label} ${p.dice}d/${p.target}` },
      { label: 'Fato', value: `${fateLeft(c)}/${fateMax(c)}` },
      { label: 'Velocità', value: c.speed },
      ...(mageLevel(c) ? [{ label: 'Livello da Mago', value: String(mageLevel(c)) }] : []),
      ...CHARACTERISTICS.map((k) => ({ label: CHAR_INFO[k].short, value: String(characteristic(c, k)) })),
    ];
  },
  quickRolls(raw) {
    const c = normalize(raw);
    return SKILLS.map((s) => {
      const p = pool(c, s);
      return { group: CHAR_INFO[SKILL_INFO[s].char].name, label: SKILL_INFO[s].name, formula: testFormula(p.dice, p.target) };
    });
  },
  tokenDefaults(raw) {
    const c = normalize(raw);
    return { hp: null, ac: null, size: 1, initiativeModifier: 0, pool: characterPool(c) };
  },
  withWound(raw, wound) {
    const c = normalize(raw);
    const row = WOUND_TABLE.find((x) => x.name === wound.name);
    return { ...c, wounds: [...c.wounds, { id: Math.random().toString(36).slice(2, 10), name: wound.name, text: wound.text, treated: false, heal: row?.heal }] };
  },
  woundResult(total) {
    const w = woundFor(total);
    return { name: w.name, text: w.text, conditions: w.conditions, dead: w.dead };
  },
};

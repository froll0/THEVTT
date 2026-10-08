import {
  BASE_CHARS,
  CAREERS,
  CHAR_INFO,
  CHARACTERISTICS,
  LINEAGES,
  MAX_CHARS,
  SKILL_INFO,
  SKILLS,
  STATUS_LABEL,
  type Career,
  type CharId,
  type Lineage,
  type LineageId,
  type SkillId,
  type Speed,
  type Status,
} from './data';
import { ARMOURS, SHIELD, TALENTS, WEAPONS, talentByName, type Talent, type Weapon } from './catalog';
import { GODS, SPELLS, type MagicLore } from './magic';

/* --------------------------------------------------------------- Modello */

export interface WtowWeapon {
  /** id del catalogo, o assente per un’arma personalizzata */
  ref?: string;
  name: string;
  note?: string;
}

export interface WtowWound {
  id: string;
  name: string;
  /** testo dell’effetto */
  text?: string;
  /** medicata: non conta più sulla tabella delle Ferite */
  treated: boolean;
  /** Ferita Purulenta (infezione) */
  festering?: boolean;
  /** come guarisce: Riprendere Fiato, Una Notte di Riposo, Riposare e Rimettersi, Operazione… */
  heal?: string;
}

export interface WtowTalentPick {
  id: string;
  /** gradi (Mago, Fede) */
  rank?: number;
  /** dettaglio: il gruppo odiato, il codice d’onore… */
  note?: string;
}

export interface WtowCharacter {
  version: 1;
  name: string;
  lineage: LineageId | null;
  career: string | null;
  /** +1 della creazione (tre diversi; "fato" vale per il Fato) */
  boosts: (CharId | 'fato')[];
  /** aumenti comprati con i PE */
  advances: Partial<Record<CharId, number>>;
  /** abilità portate a 3 dalla Stirpe (per Bretonniani e Imperiali, a scelta) */
  lineageSkills: SkillId[];
  /** +1 della Carriera (quattro tra sei) */
  careerSkills: SkillId[];
  /** tocchi finali: un’abilità 3→4 oppure due 2→3 */
  finishSkills: SkillId[];
  /** quale tocco finale: abilità, un altro Talento o una Risorsa casuale */
  finish: 'skills' | 'talent' | 'resource' | null;
  /** passi della creazione affidati ai dadi (1 PE ciascuno) */
  rolled: string[];
  /** aumenti guadagnati coi fallimenti negli Intermezzi */
  skillAdvances: Partial<Record<SkillId, number>>;
  /** fallimenti segnati negli Intermezzi */
  marks: Partial<Record<SkillId, number>>;
  lore: string[];
  talents: WtowTalentPick[];
  fate: { burned: number; spent: number };
  xp: { total: number; spent: number };
  /** null: quello della Carriera */
  status: Status | null;
  coins: Record<Status, { owned: number; spent: number }>;
  speed: Speed;
  armour: string | null;
  shield: boolean;
  weapons: WtowWeapon[];
  gear: string;
  resources: string;
  contacts: { name: string; bond: string }[];
  wounds: WtowWound[];
  conditions: string[];
  magic: { lores: MagicLore[]; spells: { id: string; memorized: boolean }[]; pool: number; progress: number; effects: string };
  faith: { god: string | null };
  omen: string;
  notes: string;
  others: string;
  extended: string;
  clues: string;
  favours: string;
}

export function createCharacter(): WtowCharacter {
  return {
    version: 1,
    name: '',
    lineage: null,
    career: null,
    boosts: [],
    advances: {},
    lineageSkills: [],
    careerSkills: [],
    finishSkills: [],
    finish: null,
    rolled: [],
    skillAdvances: {},
    marks: {},
    lore: [],
    talents: [],
    fate: { burned: 0, spent: 0 },
    xp: { total: 0, spent: 0 },
    status: null,
    coins: { bronzo: { owned: 3, spent: 0 }, argento: { owned: 0, spent: 0 }, oro: { owned: 0, spent: 0 } },
    speed: 'Normale',
    armour: null,
    shield: false,
    weapons: [],
    gear: '',
    resources: '',
    contacts: [],
    wounds: [],
    conditions: [],
    magic: { lores: [], spells: [], pool: 0, progress: 0, effects: '' },
    faith: { god: null },
    omen: '',
    notes: '',
    others: '',
    extended: '',
    clues: '',
    favours: '',
  };
}

const arr = <T>(v: unknown, f: (x: unknown) => x is T): T[] => (Array.isArray(v) ? v.filter(f) : []);
const isStr = (x: unknown): x is string => typeof x === 'string';
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);

/** Accepts anything (old saves, partial data) and returns a complete character. */
export function normalize(raw: unknown): WtowCharacter {
  const c = createCharacter();
  if (!raw || typeof raw !== 'object') return c;
  const r = raw as Record<string, any>;
  const skillList = (v: unknown) => arr(v, isStr).filter((s): s is SkillId => (SKILLS as readonly string[]).includes(s));
  const charMap = (v: any) =>
    Object.fromEntries(CHARACTERISTICS.filter((k) => num(v?.[k]) > 0).map((k) => [k, Math.floor(num(v[k]))])) as Partial<Record<CharId, number>>;
  const skillMap = (v: unknown) => Object.fromEntries(SKILLS.filter((k) => num((v as any)?.[k]) > 0).map((k) => [k, Math.floor(num((v as any)[k]))])) as Partial<Record<SkillId, number>>;
  return {
    ...c,
    name: str(r.name),
    lineage: LINEAGES.some((l) => l.id === r.lineage) ? r.lineage : null,
    career: CAREERS.some((x) => x.id === r.career) ? r.career : null,
    boosts: arr(r.boosts, isStr).filter((b): b is CharId | 'fato' => b === 'fato' || (CHARACTERISTICS as readonly string[]).includes(b)),
    advances: charMap(r.advances),
    lineageSkills: skillList(r.lineageSkills),
    careerSkills: skillList(r.careerSkills),
    finishSkills: skillList(r.finishSkills),
    finish: r.finish === 'skills' || r.finish === 'talent' || r.finish === 'resource' ? r.finish : null,
    rolled: arr(r.rolled, isStr),
    skillAdvances: skillMap(r.skillAdvances),
    marks: skillMap(r.marks),
    lore: arr(r.lore, isStr),
    talents: arr(r.talents, (x): x is WtowTalentPick => !!x && typeof (x as any).id === 'string'),
    fate: { burned: num(r.fate?.burned), spent: num(r.fate?.spent) },
    xp: { total: num(r.xp?.total), spent: num(r.xp?.spent) },
    status: r.status === 'bronzo' || r.status === 'argento' || r.status === 'oro' ? r.status : null,
    coins: {
      bronzo: { owned: num(r.coins?.bronzo?.owned, 3), spent: num(r.coins?.bronzo?.spent) },
      argento: { owned: num(r.coins?.argento?.owned), spent: num(r.coins?.argento?.spent) },
      oro: { owned: num(r.coins?.oro?.owned), spent: num(r.coins?.oro?.spent) },
    },
    speed: r.speed === 'Lenta' || r.speed === 'Veloce' ? r.speed : 'Normale',
    armour: ARMOURS.some((a) => a.id === r.armour) ? r.armour : null,
    shield: !!r.shield,
    weapons: arr(r.weapons, (x): x is WtowWeapon => !!x && typeof (x as any).name === 'string'),
    gear: str(r.gear),
    resources: str(r.resources),
    contacts: arr(r.contacts, (x): x is { name: string; bond: string } => !!x && typeof (x as any).name === 'string').map((x) => ({ name: x.name, bond: str(x.bond) })),
    wounds: arr(r.wounds, (x): x is WtowWound => !!x && typeof (x as any).name === 'string').map((w) => ({ ...w, id: str(w.id) || Math.random().toString(36).slice(2), treated: !!w.treated })),
    conditions: arr(r.conditions, isStr),
    magic: {
      lores: arr(r.magic?.lores, isStr) as MagicLore[],
      spells: arr(r.magic?.spells, (x): x is { id: string; memorized: boolean } => !!x && typeof (x as any).id === 'string').map((s) => ({ id: s.id, memorized: !!s.memorized })),
      pool: num(r.magic?.pool),
      progress: num(r.magic?.progress),
      effects: str(r.magic?.effects),
    },
    faith: { god: GODS.some((g) => g.id === r.faith?.god) ? r.faith.god : null },
    omen: str(r.omen),
    notes: str(r.notes),
    others: str(r.others),
    extended: str(r.extended),
    clues: str(r.clues),
    favours: str(r.favours),
  };
}

/* -------------------------------------------------------------- Derivati */

export const getLineage = (c: WtowCharacter): Lineage | undefined => LINEAGES.find((l) => l.id === c.lineage);
export const getCareer = (c: WtowCharacter): Career | undefined => CAREERS.find((x) => x.id === c.career);

export function characteristic(c: WtowCharacter, id: CharId): number {
  const l = getLineage(c);
  const base = l ? BASE_CHARS[l.species][id] : 2;
  return base + c.boosts.filter((b) => b === id).length + (c.advances[id] ?? 0);
}

export function maxCharacteristic(c: WtowCharacter, id: CharId): number {
  const l = getLineage(c);
  const grail = c.talents.some((t) => t.id === 'voto-del-graal') ? 2 : 0;
  return (l ? MAX_CHARS[l.species][id] : 6) + grail;
}

/** valore dell’abilità prima degli aumenti di fine creazione */
function creationSkill(c: WtowCharacter, s: SkillId): number {
  const l = getLineage(c);
  let v = 2;
  if (l?.skills.includes(s) || c.lineageSkills.includes(s)) v = 3;
  if (c.careerSkills.includes(s)) v += 1;
  return v;
}

export function skill(c: WtowCharacter, s: SkillId): number {
  let v = creationSkill(c, s);
  const fin = c.finishSkills;
  if (fin.length === 1 && fin[0] === s) v = Math.max(v, 4);
  else if (fin.length === 2 && fin.includes(s)) v = Math.max(v, 3);
  return Math.min(6, v + (c.skillAdvances[s] ?? 0));
}

export const fateMax = (c: WtowCharacter): number => (getLineage(c)?.fate ?? 3) + c.boosts.filter((b) => b === 'fato').length - c.fate.burned;
export const fateLeft = (c: WtowCharacter): number => Math.max(0, fateMax(c) - c.fate.spent);

export const statusOf = (c: WtowCharacter): Status => c.status ?? getCareer(c)?.status ?? 'bronzo';

export const talentRank = (c: WtowCharacter, id: string): number => {
  const t = c.talents.find((x) => x.id === id);
  return t ? Math.max(1, t.rank ?? 1) : 0;
};

/** Livello da Mago: gradi del Talento Mago, compresi quelli dati dalla Carriera */
export function mageLevel(c: WtowCharacter): number {
  const fromCareer = c.career === 'fattucchiere' || c.career === 'mago-arcano' ? 1 : 0;
  return Math.min(4, talentRank(c, 'mago') + fromCareer);
}

export function faithRank(c: WtowCharacter): number {
  return Math.min(3, talentRank(c, 'fede') + (c.career === 'prete' ? 1 : 0));
}

export const armourOf = (c: WtowCharacter) => ARMOURS.find((a) => a.id === c.armour);

/** Resilienza: Resistenza più armatura e scudo */
export function resilience(c: WtowCharacter): number {
  return characteristic(c, 'r') + (armourOf(c)?.bonus ?? 0) + (c.shield ? SHIELD.bonus : 0);
}

export const isArmoured = (c: WtowCharacter): boolean => !!armourOf(c)?.armour || c.shield;

export interface Pool {
  dice: number;
  target: number;
  label: string;
}

/** la riserva per una Prova d’Abilità */
export function pool(c: WtowCharacter, s: SkillId): Pool {
  const info = SKILL_INFO[s];
  let dice = characteristic(c, info.char);
  // l’armatura pesante pesa sull’Agilità
  if (info.char === 'ag' && (c.armour === 'armatura-pesante' || c.armour === 'armatura-piastre')) dice -= 1;
  return { dice, target: skill(c, s), label: info.name };
}

/** la Protezione: Atletica o (armati) Difesa, la migliore */
export function protection(c: WtowCharacter): { athletics: Pool; defence: Pool; best: Pool } {
  const athletics = pool(c, 'atletica');
  const defence = pool(c, 'difesa');
  const score = (p: Pool) => p.dice * Math.min(p.target, 10);
  return { athletics, defence, best: score(defence) > score(athletics) ? defence : athletics };
}

export interface TestOptions {
  /** dadi bonus (+) o penalità (-) */
  mod?: number;
  glorious?: boolean;
  grim?: boolean;
  magic?: boolean;
}

/**
 * La formula per i dadi della VTT: `4d10s3g`. Il bonus non supera il doppio
 * della Caratteristica; sotto 1 dado si tira un dado che riesce solo con 1.
 */
export function testFormula(dice: number, target: number, o: TestOptions = {}): string {
  const base = Math.max(0, dice);
  const n = Math.min(base + (o.mod ?? 0), Math.max(base * 2, base));
  const flags = `${o.glorious ? 'g' : ''}${o.grim ? 't' : ''}${o.magic ? 'm' : ''}`;
  if (n < 1) return `1d10s1${flags}`;
  return `${n}d10s${Math.max(1, Math.min(10, target))}${flags}`;
}

/** Esito di una Prova semplice */
export function outcome(successes: number): string {
  if (successes <= 0) return 'Fallimento';
  if (successes === 1) return 'Successo Marginale';
  if (successes === 2) return 'Successo';
  return 'Successo Totale';
}

/* ------------------------------------------------------------------ Armi */

export const weaponOf = (w: WtowWeapon): Weapon | undefined => WEAPONS.find((x) => x.id === w.ref);

/** "F+2" con Forza 3 → 5 */
export function damageValue(spec: string | null | undefined, strength: number): number | null {
  if (spec == null) return null;
  const m = /^\s*(F)?\s*([+-]\s*\d+)?\s*$/.exec(spec.replace(/–/g, '-'));
  if (m && m[1]) return Math.max(0, strength + Number((m[2] ?? '0').replace(/\s/g, '')));
  const n = Number(spec);
  return Number.isFinite(n) ? n : null;
}

export interface AttackProfile {
  name: string;
  skill: SkillId;
  pool: Pool;
  damage: number | null;
  range: string;
  ignoresArmour: boolean;
  vsArmoured: number;
  traits: string;
  /** colpo a mani nude: infligge Barcollante invece dei Danni */
  staggerOnly: boolean;
}

export function attackProfile(c: WtowCharacter, w: WtowWeapon): AttackProfile {
  const def = weaponOf(w);
  const sk: SkillId = def?.skill ?? (def?.kind === 'distanza' ? 'tiro' : def?.kind === 'lancio' ? 'lancio' : 'mischia');
  const p = pool(c, sk);
  return {
    name: w.name || def?.name || 'Arma',
    skill: sk,
    pool: { ...p, dice: p.dice + (def?.diceMod ?? 0) },
    damage: damageValue(def?.damage ?? null, characteristic(c, 'f')),
    range: def?.range ?? 'Ravvicinata',
    ignoresArmour: !!def?.ignoresArmour,
    vsArmoured: def?.vsArmoured ?? 0,
    traits: def?.traits ?? w.note ?? '',
    staggerOnly: def?.id === 'mani-nude',
  };
}

/* ------------------------------------------------------- Avanzamento (PE) */

export const xpLeft = (c: WtowCharacter): number => c.xp.total - c.xp.spent;

/** costo per portare una Caratteristica al valore successivo */
export function charCost(c: WtowCharacter, id: CharId): number {
  const next = characteristic(c, id) + 1;
  return Math.max(1, next - (getCareer(c)?.primary.includes(id) ? 1 : 0));
}

export function talentCost(c: WtowCharacter, t: Talent): number {
  let cost = t.cost;
  if (t.id === 'mago' && c.talents.some((x) => x.id === 'tocco-dei-venti')) cost -= 1;
  if (t.id === 'fede' && c.career === 'prete') cost -= 1;
  return Math.max(1, cost);
}

/** perché non si può prendere (null: si può) */
export function talentBlocked(c: WtowCharacter, t: Talent): string | null {
  const have = talentRank(c, t.id);
  if (have >= (t.ranks ?? 1)) return 'Già preso';
  for (const [k, v] of Object.entries(t.min ?? {})) if (characteristic(c, k as CharId) < (v as number)) return `Serve ${CHAR_INFO[k as CharId].name} ${v}+`;
  const sp = getLineage(c)?.species;
  if (t.id === 'mago' && (sp === 'Nano' || sp === 'Halfling')) return 'Non per Nani e Halfling';
  if (t.id === 'tocco-dei-venti' && (sp === 'Nano' || sp === 'Halfling')) return 'Non per Nani e Halfling';
  if (t.id === 'stomaco-di-ferro' && sp === 'Elfo') return 'Non per gli Elfi';
  if (t.id === 'fede' && c.lineage !== 'imperiale') return 'Solo per gli Imperiali';
  if (t.id === 'fede' && mageLevel(c) > 0) return 'Chi usa la magia non può avere Fede';
  return null;
}

/** dopo un fallimento in un’Attività: segna e, superato il valore, l’abilità sale */
export function markFailure(c: WtowCharacter, s: SkillId): WtowCharacter {
  const marks = (c.marks[s] ?? 0) + 1;
  if (marks > skill(c, s) && skill(c, s) < 6) {
    return { ...c, marks: { ...c.marks, [s]: 0 }, skillAdvances: { ...c.skillAdvances, [s]: (c.skillAdvances[s] ?? 0) + 1 } };
  }
  return { ...c, marks: { ...c.marks, [s]: marks } };
}

/* ---------------------------------------------------------------- Ferite */

export const untreatedWounds = (c: WtowCharacter): number => c.wounds.filter((w) => !w.treated || w.festering).length;

/** dadi da tirare sulla tabella delle Ferite (Gagliardo: uno in meno) */
export function woundDice(c: WtowCharacter, extra = 0): number {
  const n = 1 + untreatedWounds(c) + extra - (c.talents.some((t) => t.id === 'gagliardo') ? 1 : 0);
  return Math.max(1, n);
}

/* ------------------------------------------------------------- Validazione */

export function validate(c: WtowCharacter): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push('Dai un nome al personaggio');
  const l = getLineage(c);
  if (!l) out.push('Scegli la Stirpe');
  const career = getCareer(c);
  if (!career) out.push('Scegli la Carriera');
  else if (l && career.lineages && !career.lineages.includes(l.id)) out.push(`${career.name} non è aperta ai ${l.plural}`);
  const boosts = c.boosts;
  if (boosts.length !== 3) out.push('Assegna tre +1 alle Caratteristiche (o al Fato)');
  else if (new Set(boosts).size !== 3) out.push('I tre +1 devono andare a Caratteristiche diverse');
  if (l && l.chooseSkills > 0 && c.lineageSkills.filter((s) => !l.skills.includes(s)).length !== l.chooseSkills)
    out.push(`Scegli ${l.chooseSkills} abilità da portare a 3 (Stirpe)`);
  if (career && (c.careerSkills.length !== 4 || c.careerSkills.some((s) => !career.skills.includes(s)))) out.push('Scegli quattro abilità della Carriera');
  if (l) for (const k of CHARACTERISTICS) if (characteristic(c, k) > maxCharacteristic(c, k)) out.push(`${CHAR_INFO[k].name} oltre il massimo della Stirpe`);
  for (const s of SKILLS) if (skill(c, s) > 6) out.push(`${SKILL_INFO[s].name} oltre 6`);
  if (c.finishSkills.length === 1 && creationSkill(c, c.finishSkills[0]!) !== 3) out.push('Tocchi finali: l’abilità da portare a 4 deve essere a 3');
  if (c.finishSkills.length === 2 && c.finishSkills.some((s) => creationSkill(c, s) !== 2)) out.push('Tocchi finali: le due abilità da portare a 3 devono essere a 2');
  if (l && c.talents.length === 0) out.push('Scegli i Talenti della Stirpe');
  if (xpLeft(c) < 0) out.push('Hai speso più PE di quanti ne hai');
  return out;
}

export function headline(c: WtowCharacter): string {
  const l = getLineage(c);
  const career = getCareer(c);
  return [l?.name.replace(' (Umano)', ''), career?.name].filter(Boolean).join(' · ') || 'Personaggio incompleto';
}

export const statusLabel = (c: WtowCharacter): string => STATUS_LABEL[statusOf(c)];

export const knownSpells = (c: WtowCharacter) => c.magic.spells.map((s) => ({ ...s, spell: SPELLS.find((x) => x.id === s.id) })).filter((s) => !!s.spell);

export const talentInfo = (id: string): Talent | undefined => TALENTS.find((t) => t.id === id) ?? talentByName(id);

/** Fine dello scontro: si Riprende Fiato. Tutte le Ferite sono medicate, le più lievi guariscono. */
export function catchBreath(c: WtowCharacter): WtowCharacter {
  return {
    ...c,
    wounds: c.wounds.filter((x) => x.heal !== 'Riprendere Fiato').map((x) => (x.festering ? x : { ...x, treated: true })),
    magic: { ...c.magic, pool: 0, progress: 0 },
    conditions: c.conditions.filter((k) => k !== 'Barcollante' && k !== 'Prono'),
  };
}

/** Una Notte di Riposo: guariscono anche le Ferite di gravità moderata. */
export function nightRest(c: WtowCharacter): WtowCharacter {
  const b = catchBreath(c);
  return { ...b, wounds: b.wounds.filter((x) => x.heal !== 'Una Notte di Riposo'), conditions: b.conditions.filter((k) => k !== 'Esausto') };
}

/** Inizio sessione: il Fato speso torna. */
export const newSession = (c: WtowCharacter): WtowCharacter => ({ ...c, fate: { ...c.fate, spent: 0 } });

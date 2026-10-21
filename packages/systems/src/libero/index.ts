import type { GameSystem, QuickRoll, StatLine } from '../types';

/**
 * Sistema libero: per i giochi che TheVTT non conosce. La scheda è fatta di
 * campi (numeri, testi, tracciati come i punti ferita) e di tiri le cui formule
 * possono usare i campi numerici: «1d20+@forza», «@abilità d6».
 */

export type FieldKind = 'number' | 'text' | 'track' | 'check';

export interface FreeField {
  id: string;
  label: string;
  kind: FieldKind;
  /** number and track: the value; check: 1 ticked, 0 not; text: unused */
  value: number;
  /** track: the maximum */
  max?: number;
  /** track: shown as a row of dots to fill (blood, willpower…) rather than a number */
  dots?: boolean;
  text?: string;
  /** what the table uses it for: the token's hit points or its defence (CA) */
  role?: 'hp' | 'defense' | 'initiative';
  /** a heading the field sits under */
  group?: string;
}

export interface FreeRoll {
  id: string;
  label: string;
  formula: string;
  group?: string;
}

export interface FreeCharacter {
  version: 1;
  name: string;
  /** who the character is, in a line */
  concept: string;
  /** the template the sheet started from */
  template: string;
  fields: FreeField[];
  rolls: FreeRoll[];
  conditions: string[];
  inventory: string;
  notes: string;
}

const rid = () => Math.random().toString(36).slice(2, 10);

/** the name a formula uses for a field: «Forza» → @forza */
export const fieldKey = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const num = (label: string, value: number, extra: Partial<FreeField> = {}): FreeField => ({ id: rid(), label, kind: 'number', value, ...extra });
const track = (label: string, value: number, max: number, extra: Partial<FreeField> = {}): FreeField => ({ id: rid(), label, kind: 'track', value, max, ...extra });
const text = (label: string, t = '', extra: Partial<FreeField> = {}): FreeField => ({ id: rid(), label, kind: 'text', value: 0, text: t, ...extra });
const r = (label: string, formula: string, group?: string): FreeRoll => ({ id: rid(), label, formula, group });

export interface FreeTemplate {
  id: string;
  name: string;
  text: string;
  /** a sheet designed for a campaign: its name */
  campaign?: string;
  make: () => Pick<FreeCharacter, 'fields' | 'rolls'>;
}

export const TEMPLATES: FreeTemplate[] = [
  {
    id: 'd20',
    name: 'Classico d20',
    text: 'Sei caratteristiche con modificatore, punti ferita, classe armatura: per i giochi di stampo OSR e derivati.',
    make: () => ({
      fields: [
        num('Forza', 0, { group: 'Modificatori' }),
        num('Destrezza', 0, { group: 'Modificatori' }),
        num('Costituzione', 0, { group: 'Modificatori' }),
        num('Intelligenza', 0, { group: 'Modificatori' }),
        num('Saggezza', 0, { group: 'Modificatori' }),
        num('Carisma', 0, { group: 'Modificatori' }),
        track('Punti ferita', 10, 10, { role: 'hp', group: 'Combattimento' }),
        num('Classe armatura', 10, { role: 'defense', group: 'Combattimento' }),
        num('Livello', 1, { group: 'Combattimento' }),
      ],
      rolls: [
        r('Attacco in mischia', '1d20+@forza', 'Attacchi'),
        r('Attacco a distanza', '1d20+@destrezza', 'Attacchi'),
        r('Prova di Forza', '1d20+@forza', 'Prove'),
        r('Prova di Destrezza', '1d20+@destrezza', 'Prove'),
        r('Prova di Saggezza', '1d20+@saggezza', 'Prove'),
        r('Iniziativa', '1d20+@destrezza', 'Prove'),
      ],
    }),
  },
  {
    id: 'pool-d6',
    name: 'Riserva di d6',
    text: 'Attributi e abilità sommati in una riserva di d6: ogni 5 o 6 è un successo.',
    make: () => ({
      fields: [
        num('Corpo', 3, { group: 'Attributi' }),
        num('Agilità', 3, { group: 'Attributi' }),
        num('Mente', 3, { group: 'Attributi' }),
        num('Spirito', 3, { group: 'Attributi' }),
        num('Combattere', 2, { group: 'Abilità' }),
        num('Muoversi', 2, { group: 'Abilità' }),
        num('Conoscere', 1, { group: 'Abilità' }),
        num('Convincere', 1, { group: 'Abilità' }),
        track('Salute', 6, 6, { role: 'hp', group: 'Stato' }),
        track('Stress', 0, 6, { group: 'Stato' }),
      ],
      rolls: [
        r('Combattere', '(@corpo+@combattere)d6h5', 'Prove'),
        r('Muoversi', '(@agilita+@muoversi)d6h5', 'Prove'),
        r('Conoscere', '(@mente+@conoscere)d6h5', 'Prove'),
        r('Convincere', '(@spirito+@convincere)d6h5', 'Prove'),
      ],
    }),
  },
  {
    id: 'd100',
    name: 'Percentuale (d100)',
    text: 'Abilità in percentuale da tirare sotto con 1d100: per i giochi d’indagine e d’orrore.',
    make: () => ({
      fields: [
        num('Forza', 50, { group: 'Caratteristiche' }),
        num('Destrezza', 50, { group: 'Caratteristiche' }),
        num('Intelligenza', 50, { group: 'Caratteristiche' }),
        num('Potere', 50, { group: 'Caratteristiche' }),
        num('Ascoltare', 25, { group: 'Abilità' }),
        num('Individuare', 25, { group: 'Abilità' }),
        num('Biblioteca', 20, { group: 'Abilità' }),
        num('Furtività', 20, { group: 'Abilità' }),
        num('Rissa', 25, { group: 'Abilità' }),
        track('Punti ferita', 10, 10, { role: 'hp', group: 'Stato' }),
        track('Sanità', 50, 99, { group: 'Stato' }),
        track('Fortuna', 50, 99, { group: 'Stato' }),
      ],
      rolls: [r('Ascoltare', '1d100', 'Prove'), r('Individuare', '1d100', 'Prove'), r('Rissa', '1d100', 'Prove'), r('Danno a mani nude', '1d3', 'Combattimento')],
    }),
  },
  {
    id: 'fate',
    name: 'Fate (4dF)',
    text: 'Aspetti, abilità da +0 a +4, quattro dadi Fudge: ogni + e − si somma all’abilità.',
    make: () => ({
      fields: [
        text('Concetto', '', { group: 'Aspetti' }),
        text('Guaio', '', { group: 'Aspetti' }),
        text('Altro aspetto', '', { group: 'Aspetti' }),
        num('Combattere', 2, { group: 'Abilità' }),
        num('Atletica', 1, { group: 'Abilità' }),
        num('Notare', 2, { group: 'Abilità' }),
        num('Volontà', 1, { group: 'Abilità' }),
        num('Rapporti', 1, { group: 'Abilità' }),
        num('Furtività', 1, { group: 'Abilità' }),
        track('Stress fisico', 3, 3, { role: 'hp', group: 'Stress' }),
        track('Stress mentale', 3, 3, { group: 'Stress' }),
        track('Punti Fato', 3, 5, { group: 'Stress' }),
      ],
      rolls: [
        r('Combattere', '4dF+@combattere', 'Prove'),
        r('Atletica', '4dF+@atletica', 'Prove'),
        r('Notare', '4dF+@notare', 'Prove'),
        r('Volontà', '4dF+@volonta', 'Prove'),
        r('Rapporti', '4dF+@rapporti', 'Prove'),
        r('Furtività', '4dF+@furtivita', 'Prove'),
      ],
    }),
  },
  {
    id: 'pool-d10',
    name: 'Riserva di d10',
    text: 'Attributo più abilità in d10: ogni 6 o più è un successo. Per i giochi di stampo gotico-moderno.',
    make: () => ({
      fields: [
        num('Forza', 2, { group: 'Attributi' }),
        num('Destrezza', 2, { group: 'Attributi' }),
        num('Prontezza', 2, { group: 'Attributi' }),
        num('Carisma', 2, { group: 'Attributi' }),
        num('Fermezza', 2, { group: 'Attributi' }),
        num('Rissa', 1, { group: 'Abilità' }),
        num('Atletica', 1, { group: 'Abilità' }),
        num('Consapevolezza', 1, { group: 'Abilità' }),
        num('Persuasione', 1, { group: 'Abilità' }),
        track('Salute', 7, 7, { role: 'hp', group: 'Stato' }),
        track('Forza di volontà', 4, 4, { group: 'Stato' }),
        track('Fame', 1, 5, { group: 'Stato' }),
      ],
      rolls: [
        r('Rissa', '(@forza+@rissa)d10h6', 'Prove'),
        r('Atletica', '(@destrezza+@atletica)d10h6', 'Prove'),
        r('Consapevolezza', '(@prontezza+@consapevolezza)d10h6', 'Prove'),
        r('Persuasione', '(@carisma+@persuasione)d10h6', 'Prove'),
        r('Fermezza', '(@fermezza+@fermezza)d10h6', 'Prove'),
      ],
    }),
  },
  {
    id: 'pbta',
    name: 'Mosse (2d6)',
    text: 'Statistiche da −1 a +3 e 2d6: 10+ riesce, 7-9 riesce con un costo, 6- il master fa una mossa.',
    make: () => ({
      fields: [
        num('Freddo', 1, { group: 'Statistiche' }),
        num('Duro', 1, { group: 'Statistiche' }),
        num('Caldo', 0, { group: 'Statistiche' }),
        num('Acuto', 1, { group: 'Statistiche' }),
        num('Strano', -1, { group: 'Statistiche' }),
        track('Danni', 0, 7, { group: 'Stato' }),
        num('Esperienza', 0, { group: 'Stato' }),
      ],
      rolls: [
        r('Agire sotto pressione', '2d6+@freddo', 'Mosse'),
        r('Andare all’attacco', '2d6+@duro', 'Mosse'),
        r('Sedurre o manipolare', '2d6+@caldo', 'Mosse'),
        r('Leggere una situazione', '2d6+@acuto', 'Mosse'),
        r('Usare lo strano', '2d6+@strano', 'Mosse'),
      ],
    }),
  },
  {
    id: 'year-zero',
    name: 'Riserva di d6 (sei)',
    text: 'Attributo, abilità e attrezzatura in d6: conta solo il 6. Per i giochi di sopravvivenza.',
    make: () => ({
      fields: [
        num('Forza', 3, { group: 'Attributi' }),
        num('Agilità', 3, { group: 'Attributi' }),
        num('Ingegno', 3, { group: 'Attributi' }),
        num('Empatia', 3, { group: 'Attributi' }),
        num('Combattimento', 1, { group: 'Abilità' }),
        num('Mobilità', 1, { group: 'Abilità' }),
        num('Osservazione', 1, { group: 'Abilità' }),
        num('Manipolazione', 1, { group: 'Abilità' }),
        num('Attrezzatura', 1, { group: 'Abilità' }),
        track('Salute', 3, 3, { role: 'hp', group: 'Stato' }),
        track('Stress', 0, 10, { group: 'Stato' }),
      ],
      rolls: [
        r('Combattimento', '(@forza+@combattimento+@attrezzatura)d6h6', 'Prove'),
        r('Mobilità', '(@agilita+@mobilita)d6h6', 'Prove'),
        r('Osservazione', '(@ingegno+@osservazione)d6h6', 'Prove'),
        r('Manipolazione', '(@empatia+@manipolazione)d6h6', 'Prove'),
      ],
    }),
  },
  {
    id: 'vuota',
    name: 'Scheda vuota',
    text: 'Solo i punti ferita: il resto lo decide il gruppo.',
    make: () => ({ fields: [track('Punti ferita', 10, 10, { role: 'hp' })], rolls: [] }),
  },
];

export const CONDITIONS = ['Prono', 'Stordito', 'Avvelenato', 'Accecato', 'Spaventato', 'Afferrato', 'Ferito', 'Svenuto', 'Invisibile', 'Nascosto'];

export function createCharacter(template = 'd20'): FreeCharacter {
  const t = TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0]!;
  return { version: 1, name: '', concept: '', template: t.id, ...t.make(), conditions: [], inventory: '', notes: '' };
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function normalize(raw: unknown): FreeCharacter {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const { fields, rolls } = cleanParts(r);
  return {
    version: 1,
    name: str(r.name),
    concept: str(r.concept),
    template: str(r.template, 'vuota'),
    fields,
    rolls,
    conditions: Array.isArray(r.conditions) ? r.conditions.filter((c: unknown): c is string => typeof c === 'string') : [],
    inventory: str(r.inventory),
    notes: str(r.notes),
  };
}

/** fields and rolls from untrusted input (a sheet, a campaign's template, a file) */
function cleanParts(r: Record<string, any>): Pick<FreeCharacter, 'fields' | 'rolls'> {
  const fields: FreeField[] = (Array.isArray(r.fields) ? r.fields : [])
    .filter((f: any) => f && typeof f.label === 'string')
    .slice(0, 80)
    .map((f: any) => ({
      id: str(f.id) || rid(),
      label: f.label.slice(0, 40),
      kind: f.kind === 'text' || f.kind === 'track' || f.kind === 'check' ? f.kind : 'number',
      value: f.kind === 'check' ? (f.value ? 1 : 0) : n(f.value),
      max: f.kind === 'track' ? n(f.max, 10) : undefined,
      ...(f.kind === 'track' && f.dots ? { dots: true } : {}),
      text: typeof f.text === 'string' ? f.text : undefined,
      role: f.role === 'hp' || f.role === 'defense' || f.role === 'initiative' ? f.role : undefined,
      group: typeof f.group === 'string' && f.group.trim() ? f.group.slice(0, 40) : undefined,
    }));
  const rolls: FreeRoll[] = (Array.isArray(r.rolls) ? r.rolls : [])
    .filter((x: any) => x && typeof x.label === 'string' && typeof x.formula === 'string')
    .slice(0, 60)
    .map((x: any) => ({ id: str(x.id) || rid(), label: x.label.slice(0, 50), formula: x.formula.slice(0, 80), group: typeof x.group === 'string' && x.group.trim() ? x.group.slice(0, 40) : undefined }));
  return { fields, rolls };
}

/**
 * A sheet the GM designs for the campaign: the players start their characters
 * from it. Kept in the campaign's homebrew, as data.
 */
export interface SheetDesign {
  id: string;
  name: string;
  text: string;
  fields: FreeField[];
  rolls: FreeRoll[];
}

export interface FreeHomebrew {
  sheets: SheetDesign[];
}

export const CAMPAIGN_TEMPLATE = 'campagna:';

export function cleanFreeHomebrew(raw: unknown): FreeHomebrew {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const sheets = (Array.isArray(r.sheets) ? r.sheets : [])
    .filter((x: any) => x && typeof x === 'object')
    .slice(0, 20)
    .map((x: any): SheetDesign => ({ id: str(x.id).slice(0, 40) || rid(), name: str(x.name).slice(0, 60) || 'Scheda', text: str(x.text).slice(0, 300), ...cleanParts(x) }));
  return { sheets };
}

/** a design from one of the built-in templates, to change from there */
export function designFrom(templateId: string, name?: string): SheetDesign {
  const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0]!;
  return { id: rid(), name: name ?? t.name, text: t.text, ...t.make() };
}

/**
 * The sheets of the user's campaigns join the templates a character starts
 * from, first in the list (and the ones there before go away).
 */
export function applyCampaignSheets(sets: { campaignName: string; homebrew: FreeHomebrew }[]): void {
  for (let i = TEMPLATES.length - 1; i >= 0; i--) if (TEMPLATES[i]!.id.startsWith(CAMPAIGN_TEMPLATE)) TEMPLATES.splice(i, 1);
  const own: FreeTemplate[] = [];
  for (const set of sets)
    for (const d of set.homebrew.sheets)
      own.push({
        id: `${CAMPAIGN_TEMPLATE}${d.id}`,
        name: d.name,
        text: d.text || `La scheda di «${set.campaignName}»`,
        campaign: set.campaignName,
        // fresh ids for every character made from it
        make: () => ({ fields: d.fields.map((f) => ({ ...f, id: rid() })), rolls: d.rolls.map((x) => ({ ...x, id: rid() })) }),
      });
  TEMPLATES.unshift(...own);
}

/** The values a formula can use, by field name (numbers and tracks). */
export function fieldValues(c: FreeCharacter): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of c.fields) if (f.kind !== 'text') out[fieldKey(f.label)] = f.value;
  return out;
}

/**
 * The formula with the fields put in: «1d20+@forza» → «1d20+3»,
 * «(@corpo+@combattere)d6h5» → «5d6h5». Unknown names stay (the dice will say so).
 */
export function resolveFormula(c: FreeCharacter, formula: string): string {
  const v = fieldValues(c);
  let out = formula.replace(/@([a-z0-9àèéìòù]+)/gi, (whole, name: string) => {
    const key = fieldKey(name);
    return key in v ? String(v[key]) : whole;
  });
  // a parenthesised sum in front of a die: (3+2)d6 → 5d6
  out = out.replace(/\(([\d+\-\s]+)\)(?=d)/g, (_, sum: string) => {
    const total = sum
      .replace(/\s/g, '')
      .split(/(?=[+-])/)
      .reduce((a, x) => a + (Number(x) || 0), 0);
    return String(Math.max(0, total));
  });
  return out.replace(/\+\s*-/g, '-').replace(/-\s*-/g, '+');
}

export const hpField = (c: FreeCharacter) => c.fields.find((f) => f.role === 'hp' && f.kind === 'track');
export const defenseField = (c: FreeCharacter) => c.fields.find((f) => f.role === 'defense' && f.kind !== 'text');

export const libero: GameSystem<FreeCharacter> = {
  id: 'libero',
  name: 'Sistema libero',
  shortName: 'Libero',
  description: 'Per qualsiasi altro gioco: campi, tracciati e tiri della scheda li decide il gruppo, partendo da un modello.',
  conditions: CONDITIONS,
  createCharacter: () => createCharacter(),
  validate(raw) {
    const c = normalize(raw);
    const out: string[] = [];
    if (!c.name.trim()) out.push('Dai un nome al personaggio');
    for (const roll of c.rolls) if (/@[a-z]/i.test(resolveFormula(c, roll.formula))) out.push(`«${roll.label}» usa un campo che non esiste`);
    return out;
  },
  headline: (raw) => normalize(raw).concept || 'Sistema libero',
  summary(raw) {
    const c = normalize(raw);
    const lines: StatLine[] = [];
    for (const f of c.fields.slice(0, 12))
      lines.push({ label: f.label, value: f.kind === 'track' ? `${f.value}/${f.max ?? 0}` : f.kind === 'text' ? (f.text ?? '') : f.kind === 'check' ? (f.value ? '✓' : '—') : String(f.value) });
    return lines;
  },
  quickRolls(raw): QuickRoll[] {
    const c = normalize(raw);
    return c.rolls.map((x) => ({ group: x.group ?? 'Tiri', label: x.label, formula: resolveFormula(c, x.formula) }));
  },
  tokenDefaults(raw) {
    const c = normalize(raw);
    const hp = hpField(c);
    const def = defenseField(c);
    const ini = c.fields.find((f) => f.role === 'initiative' && f.kind !== 'text');
    return { hp: hp ? { current: hp.value, max: hp.max ?? hp.value } : null, ac: def ? def.value : null, size: 1, initiativeModifier: ini?.value ?? 0 };
  },
  withHp(raw, current) {
    const c = normalize(raw);
    const hp = hpField(c);
    if (!hp) return c;
    return { ...c, fields: c.fields.map((f) => (f.id === hp.id ? { ...f, value: Math.max(0, Math.min(f.max ?? current, current)) } : f)) };
  },
};

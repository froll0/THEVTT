import type { Ability } from './data';
import type { MonsterAction, MonsterDef } from './monsters';

/**
 * Creatures from the 5e.tools JSON format (one creature, a list, or
 * `{ "monster": [...] }`), turned into stat blocks of our own. Numbers come
 * across exactly; the texts stay in their language.
 */

type Json = Record<string, unknown>;

const SIZES: Record<string, MonsterDef['size']> = { T: 'Minuscola', S: 'Piccola', M: 'Media', L: 'Grande', H: 'Enorme', G: 'Mastodontica' };
const TYPES: Record<string, string> = {
  aberration: 'Aberrazione', beast: 'Bestia', celestial: 'Celestiale', construct: 'Costrutto', dragon: 'Drago', elemental: 'Elementale', fey: 'Folletto',
  fiend: 'Immondo', giant: 'Gigante', humanoid: 'Umanoide', monstrosity: 'Mostruosità', ooze: 'Melma', plant: 'Vegetale', undead: 'Non morto',
};
const DAMAGE: Record<string, string> = {
  acid: 'acido', bludgeoning: 'contundenti', cold: 'freddo', fire: 'fuoco', force: 'forza', lightning: 'fulmine', necrotic: 'necrotici',
  piercing: 'perforanti', poison: 'veleno', psychic: 'psichici', radiant: 'radiosi', slashing: 'taglienti', thunder: 'tuono',
};

/** Damage types of a 5e.tools resist/immune/vulnerable list (nested groups too), in Italian. */
function damageList(v: unknown, key: string): string[] | undefined {
  const out = new Set<string>();
  const walk = (x: unknown) => {
    if (typeof x === 'string') {
      if (DAMAGE[x.toLowerCase()]) out.add(DAMAGE[x.toLowerCase()]!);
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object' && key in (x as Json)) walk((x as Json)[key]);
  };
  walk(v);
  return out.size ? [...out] : undefined;
}
const ABILITY_WORDS: Record<string, Ability> = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
  '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};

/** Feet to metres the way the books do it: 5 ft = 1,5 m. */
const metres = (ft: number) => `${String(Math.round((ft / 5) * 1.5 * 10) / 10).replace('.', ',')} m`;

/** The text of 5e.tools entries without their {@tags}. */
function clean(text: string): string {
  return text
    .replace(/\{@(?:atk|atkr) ([^}]*)\}/g, (_, k: string) => (k.includes('r') && !k.includes('m') ? 'Attacco a distanza:' : 'Attacco in mischia:'))
    .replace(/\{@h\}/g, 'Colpito: ')
    .replace(/\{@hit (-?\d+)\}/g, (_, n: string) => (Number(n) >= 0 ? `+${n}` : n))
    .replace(/\{@dc (\d+)\}/g, 'CD $1')
    .replace(/\{@\w+ ([^}|]*)(?:\|[^}]*)?\}/g, '$1')
    .replace(/(\d+) (?:ft\.|feet)/g, (_, n: string) => metres(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

const entriesText = (entries: unknown): string =>
  (Array.isArray(entries) ? entries : [entries])
    .map((e) => (typeof e === 'string' ? e : e && typeof e === 'object' && 'entries' in (e as Json) ? entriesText((e as Json).entries) : e && typeof e === 'object' && 'items' in (e as Json) ? entriesText((e as Json).items) : ''))
    .filter(Boolean)
    .join(' ');

function action(a: Json): MonsterAction {
  const raw = entriesText(a.entries);
  const out: MonsterAction = { name: clean(String(a.name ?? 'Azione')).replace(/\s*\(Costs (\d+) Actions\)/i, '') };
  const cost = /\(Costs (\d+) Actions\)/i.exec(String(a.name ?? ''));
  if (cost) out.cost = Number(cost[1]);
  const hit = /\{@hit (-?\d+)\}/.exec(raw);
  if (hit) out.attack = Number(hit[1]);
  const dmg = /\{@damage ([^}]+)\}/.exec(raw);
  if (dmg) out.damage = dmg[1]!.replace(/\s+/g, '');
  const type = dmg ? /\}\)?\s*([a-z]+) damage/i.exec(raw.slice(raw.indexOf(dmg[0]))) : null;
  if (type && DAMAGE[type[1]!.toLowerCase()]) out.damageType = DAMAGE[type[1]!.toLowerCase()];
  const reach = /reach (\d+) ft/.exec(raw);
  const range = /range (\d+)(?:\/(\d+))? ft/.exec(raw);
  if (reach) out.reach = metres(Number(reach[1]));
  else if (range) out.reach = range[2] ? `${metres(Number(range[1])).replace(' m', '')}/${metres(Number(range[2]))}` : metres(Number(range[1]));
  const dc = /\{@dc (\d+)\}/.exec(raw);
  const ability = /(strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/i.exec(raw);
  if (dc && ability) out.save = { ability: ABILITY_WORDS[ability[1]!.toLowerCase()]!, dc: Number(dc[1]) };
  if (!hit) out.description = clean(raw);
  return out;
}

function monster(m: Json): MonsterDef | null {
  if (typeof m.name !== 'string' || typeof m.str !== 'number') return null;
  const acRaw = Array.isArray(m.ac) ? m.ac[0] : m.ac;
  const ac = typeof acRaw === 'number' ? acRaw : Number((acRaw as Json | undefined)?.ac ?? 10);
  const hp = (m.hp as Json | undefined) ?? {};
  const speedObj = (m.speed as Json | undefined) ?? {};
  const speedNum = (v: unknown) => (typeof v === 'number' ? v : Number((v as Json | undefined)?.number ?? 0));
  const speedNames: Record<string, string> = { walk: '', fly: 'volo', swim: 'nuoto', climb: 'scalata', burrow: 'scavo' };
  const speed = Object.entries(speedObj)
    .filter(([k, v]) => k in speedNames && speedNum(v) > 0)
    .map(([k, v]) => `${speedNames[k] ? `${speedNames[k]} ` : ''}${metres(speedNum(v))}`)
    .join(', ');
  const typeRaw = typeof m.type === 'string' ? m.type : String((m.type as Json | undefined)?.type ?? '');
  const cr = typeof m.cr === 'string' ? m.cr : String((m.cr as Json | undefined)?.cr ?? '0');
  const senses = (Array.isArray(m.senses) ? m.senses : []).map((s) => clean(String(s)).replace(/darkvision/i, 'Scurovisione').replace(/blindsight/i, 'Vista cieca').replace(/truesight/i, 'Vista pura').replace(/tremorsense/i, 'Percezione tellurica'));
  const size = Array.isArray(m.size) ? String(m.size[0]) : String(m.size ?? 'M');
  const list = (key: string) => (Array.isArray(m[key]) ? (m[key] as Json[]) : []);
  return {
    id: '',
    name: m.name,
    size: SIZES[size] ?? 'Media',
    type: TYPES[typeRaw.toLowerCase()] ?? typeRaw,
    ac,
    hp: { average: Number(hp.average ?? 1), dice: String(hp.formula ?? '1d8').replace(/\s+/g, '') },
    speed: speed || '9 m',
    abilities: { str: Number(m.str), dex: Number(m.dex), con: Number(m.con), int: Number(m.int), wis: Number(m.wis), cha: Number(m.cha) },
    cr,
    xp: XP[cr] ?? 0,
    senses: senses.join(', ') || undefined,
    traits: list('trait').map((t) => ({ name: clean(String(t.name ?? '')), description: clean(entriesText(t.entries)) })),
    resistances: damageList(m.resist, 'resist'),
    immunities: damageList(m.immune, 'immune'),
    vulnerabilities: damageList(m.vulnerable, 'vulnerable'),
    saves: saves((m.save as Json | undefined) ?? {}),
    legendary: list('legendary').length ? { uses: Number(m.legendaryActions ?? 3) || 3, actions: list('legendary').map(action) } : undefined,
    actions: [...list('action'), ...list('bonus').map((b) => ({ ...b, name: `${String(b.name)} (azione bonus)` })), ...list('reaction').map((r) => ({ ...r, name: `${String(r.name)} (reazione)` }))].map(action),
  };
}

/** Saving throw bonuses: `{ dex: "+6" }`. */
function saves(v: Json): MonsterDef['saves'] {
  const out: NonNullable<MonsterDef['saves']> = {};
  for (const a of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
    const n = Number(String(v[a] ?? '').replace(/\s/g, ''));
    if (v[a] !== undefined && Number.isFinite(n)) out[a] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Every creature found in a 5e.tools file. */
export function importFiveEtools(json: unknown): MonsterDef[] {
  const items = Array.isArray(json) ? json : json && typeof json === 'object' && Array.isArray((json as Json).monster) ? ((json as Json).monster as unknown[]) : [json];
  return items.map((m) => (m && typeof m === 'object' ? monster(m as Json) : null)).filter((m): m is MonsterDef => !!m);
}

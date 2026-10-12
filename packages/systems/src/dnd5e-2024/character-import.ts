import { BACKGROUNDS } from './backgrounds';
import { CLASSES } from './classes';
import { ABILITIES, type Ability } from './data';
import { ARMORS, GEAR, WEAPONS } from './equipment';
import { createCharacter, newUid, type Dnd5eCharacter, type InventoryItem } from './rules';
import { SPECIES } from './species';
import { SPELLS } from './spells';

/**
 * Characters made elsewhere, brought to TheVTT: a D&D Beyond character
 * (its JSON) or a Foundry VTT actor (dnd5e system, «Export Data»). Names are
 * matched to the app's own classes, species, backgrounds, spells and items by
 * their English id; what doesn't match is kept as a custom item or left for the
 * builder («Modifica scelte») to finish.
 */

type Json = Record<string, any>;

/** «Fire Bolt» → «firebolt»: for comparing English names with ids. */
const key = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const byKey = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [key(x.id), x]));
const classes = byKey(CLASSES);
const species = byKey(SPECIES);
const backgrounds = byKey(BACKGROUNDS);
const spells = byKey(SPELLS);
const items = new Map<string, { id: string; name: string; weight?: number }>([...WEAPONS, ...ARMORS, ...GEAR].map((x) => [key(x.id), x as { id: string; name: string; weight?: number }]));

/** «High Elf», «Elf (Drow)» → elf; «Human» → human */
function speciesOf(name: string): string {
  const k = key(name);
  if (species.has(k)) return species.get(k)!.id;
  for (const [sk, s] of species) if (k.includes(sk)) return s.id;
  return '';
}

function item(name: string, qty: number, equipped: boolean): InventoryItem {
  const hit = items.get(key(name));
  return { uid: newUid(), ref: hit?.id ?? null, name: hit?.name ?? name, qty: Math.max(1, Math.round(qty) || 1), weight: hit?.weight ?? 0, equipped };
}

function spellIds(names: string[]): { cantrips: string[]; spells: string[] } {
  const out = { cantrips: [] as string[], spells: [] as string[] };
  for (const n of names) {
    const s = spells.get(key(n));
    if (!s) continue;
    const list = s.level === 0 ? out.cantrips : out.spells;
    if (!list.includes(s.id)) list.push(s.id);
  }
  return out;
}

function finish(c: Dnd5eCharacter): Dnd5eCharacter {
  c.name = c.name.trim().slice(0, 80) || 'Senza nome';
  c.level = Math.min(20, Math.max(1, Math.round(c.level) || 1));
  for (const a of ABILITIES) c.baseScores[a] = Math.min(30, Math.max(1, Math.round(c.baseScores[a]) || 10));
  // whatever was rolled or bought elsewhere: the scores as they are
  c.abilityMethod = 'manual';
  return c;
}

/** A D&D Beyond character JSON (the character service's, with or without its `data` wrapper). */
export function fromDndBeyond(raw: unknown): Dnd5eCharacter | null {
  const d: Json = (raw as Json)?.data && typeof (raw as Json).data === 'object' ? (raw as Json).data : (raw as Json);
  if (!d || typeof d !== 'object' || !Array.isArray(d.stats) || !Array.isArray(d.classes)) return null;
  const c = createCharacter();
  c.name = String(d.name ?? '');
  const main = [...d.classes].sort((a: Json, b: Json) => (b.level ?? 0) - (a.level ?? 0))[0] as Json | undefined;
  c.classId = classes.get(key(main?.definition?.name))?.id ?? '';
  c.level = d.classes.reduce((n: number, x: Json) => n + (Number(x.level) || 0), 0);
  c.speciesId = speciesOf(d.race?.baseRaceName ?? d.race?.baseName ?? d.race?.fullName ?? '');
  c.backgroundId = backgrounds.get(key(d.background?.definition?.name))?.id ?? '';
  // stats 1-6 are STR..CHA; bonus and override stats on top
  ABILITIES.forEach((a: Ability, i) => {
    const pick = (list: unknown) => (Array.isArray(list) ? (list as Json[]).find((s) => s.id === i + 1)?.value : null);
    const over = pick(d.overrideStats);
    c.baseScores[a] = over ?? (Number(pick(d.stats)) || 10) + (Number(pick(d.bonusStats)) || 0);
  });
  const maxHp = (Number(d.overrideHitPoints) || Number(d.baseHitPoints) || 0) + (Number(d.bonusHitPoints) || 0);
  if (maxHp) c.hp = { current: Math.max(0, maxHp - (Number(d.removedHitPoints) || 0)), temp: Number(d.temporaryHitPoints) || 0 };
  c.inventory = (Array.isArray(d.inventory) ? d.inventory : []).filter((x: Json) => x?.definition?.name).map((x: Json) => item(x.definition.name, x.quantity ?? 1, !!x.equipped));
  const cur = d.currencies ?? {};
  c.currency = { cp: +cur.cp || 0, sp: +cur.sp || 0, ep: +cur.ep || 0, gp: +cur.gp || 0, pp: +cur.pp || 0 };
  const spellNames: string[] = [];
  for (const group of [...(Array.isArray(d.classSpells) ? d.classSpells : []), ...Object.values(d.spells ?? {})])
    for (const s of (Array.isArray((group as Json)?.spells) ? (group as Json).spells : Array.isArray(group) ? group : []) as Json[]) if (s?.definition?.name) spellNames.push(s.definition.name);
  Object.assign(c, spellIds(spellNames));
  const t = d.traits ?? {};
  c.details = { ...c.details, traits: String(t.personalityTraits ?? ''), ideals: String(t.ideals ?? ''), bonds: String(t.bonds ?? ''), flaws: String(t.flaws ?? ''), backstory: String(d.notes?.backstory ?? '') };
  return finish(c);
}

/** A Foundry VTT actor exported from the dnd5e system («Export Data»). */
export function fromFoundry(raw: unknown): Dnd5eCharacter | null {
  const a = raw as Json;
  const sys: Json | undefined = a?.system ?? a?.data;
  if (!a || typeof a !== 'object' || !sys?.abilities || !Array.isArray(a.items)) return null;
  const c = createCharacter();
  c.name = String(a.name ?? '');
  const of = (type: string) => (a.items as Json[]).filter((i) => i?.type === type);
  const cls = of('class').sort((x, y) => (y.system?.levels ?? 0) - (x.system?.levels ?? 0));
  c.classId = classes.get(key(cls[0]?.name))?.id ?? '';
  c.level = cls.reduce((n, x) => n + (Number(x.system?.levels) || 0), 0) || Number(sys.details?.level) || 1;
  c.speciesId = speciesOf(of('race')[0]?.name ?? of('species')[0]?.name ?? sys.details?.race ?? '');
  c.backgroundId = backgrounds.get(key(of('background')[0]?.name ?? sys.details?.background))?.id ?? '';
  for (const ab of ABILITIES) c.baseScores[ab] = Number(sys.abilities?.[ab]?.value) || 10;
  const hp = sys.attributes?.hp;
  if (hp && Number.isFinite(Number(hp.value))) c.hp = { current: Number(hp.value), temp: Number(hp.temp) || 0 };
  c.inventory = (a.items as Json[])
    .filter((i) => ['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container', 'backpack'].includes(i?.type))
    .map((i) => item(i.name, i.system?.quantity ?? 1, !!i.system?.equipped));
  const cur = sys.currency ?? {};
  c.currency = { cp: +cur.cp || 0, sp: +cur.sp || 0, ep: +cur.ep || 0, gp: +cur.gp || 0, pp: +cur.pp || 0 };
  Object.assign(c, spellIds(of('spell').map((s) => s.name)));
  const d = sys.details ?? {};
  const text = (v: unknown) => String((v as Json)?.value ?? v ?? '').replace(/<[^>]+>/g, '').trim();
  c.details = { ...c.details, traits: text(d.trait), ideals: text(d.ideal), bonds: text(d.bond), flaws: text(d.flaw), backstory: text(d.biography) };
  c.alignment = String(d.alignment ?? '');
  return finish(c);
}

/** Either kind, whichever the file is. */
export function importCharacter(raw: unknown): { character: Dnd5eCharacter; source: 'D&D Beyond' | 'Foundry VTT' } | null {
  const ddb = fromDndBeyond(raw);
  if (ddb) return { character: ddb, source: 'D&D Beyond' };
  const fvtt = fromFoundry(raw);
  return fvtt ? { character: fvtt, source: 'Foundry VTT' } : null;
}

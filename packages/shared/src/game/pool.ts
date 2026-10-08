/**
 * Combat for success-pool systems (Warhammer: the Old World): what a token
 * needs for the host to settle an attack, and the Zones a scene is cut into.
 */

export type PoolCombatant = 'pg' | 'Servitore' | 'Bruto' | 'Campione' | 'Mostruosità';

export interface PoolDice {
  dice: number;
  target: number;
}

export interface PoolStats {
  type: PoolCombatant;
  /** damage above this wounds, at or below it staggers */
  resilience: number;
  /** Resilience without armour (attacks that ignore it) */
  toughness: number;
  armoured: boolean;
  /** opposing melee attacks (Atletica or, armed, Difesa) */
  melee: PoolDice;
  /** opposing shots (Atletica, or Difesa with a shield) */
  ranged: PoolDice;
  wounds: number;
  /** defeated at this many wounds (Servitori 1, Bruti and Mostruosità from their profile; none for PCs and Campioni) */
  maxWounds?: number | null;
  /** Bruti and Mostruosità: what each wound does */
  track?: { at: string; effect: string }[];
  /** wounds not yet treated: one more die each on the wounds table */
  untreated?: number;
  /** one die fewer on the wounds table (Gagliardo) */
  hardy?: boolean;
  /** monsters don't stagger after a failed melee attack */
  monster?: boolean;
}

export const POOL_RANGES = ['Ravvicinata', 'Corta', 'Media', 'Lunga', 'Estrema'] as const;
export type PoolRange = (typeof POOL_RANGES)[number];

/** A region of a scene; distances are counted in zones crossed. Coordinates in cells. */
export interface Zone {
  id: string;
  sceneId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  /** Terreno Difficile */
  difficult?: boolean;
  /** Pericolo (grade), 0 = none */
  hazard?: number;
  /** covering: -1d to shots at those inside */
  cover?: boolean;
}

const num = (v: unknown, min: number, max: number, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

export function cleanPoolStats(v: unknown): PoolStats | undefined {
  const p = v as Partial<PoolStats> | null | undefined;
  if (!p || typeof p !== 'object') return undefined;
  const dice = (d: unknown): PoolDice => ({ dice: num((d as PoolDice)?.dice, 0, 20, 1), target: num((d as PoolDice)?.target, 1, 10, 2) });
  const type: PoolCombatant = (['pg', 'Servitore', 'Bruto', 'Campione', 'Mostruosità'] as const).includes(p.type as PoolCombatant) ? (p.type as PoolCombatant) : 'Servitore';
  const out: PoolStats = {
    type,
    resilience: num(p.resilience, 0, 30, 3),
    toughness: num(p.toughness ?? p.resilience, 0, 30, 3),
    armoured: !!p.armoured,
    melee: dice(p.melee),
    ranged: dice(p.ranged ?? p.melee),
    wounds: num(p.wounds, 0, 99),
  };
  if (p.maxWounds != null) out.maxWounds = num(p.maxWounds, 1, 99, 1);
  if (Array.isArray(p.track)) out.track = p.track.slice(0, 8).map((x) => ({ at: String(x?.at ?? '').slice(0, 20), effect: String(x?.effect ?? '').slice(0, 120) }));
  if (p.untreated != null) out.untreated = num(p.untreated, 0, 20);
  if (p.hardy) out.hardy = true;
  if (p.monster || type === 'Mostruosità') out.monster = true;
  return out;
}

export function cleanZone(v: unknown, sceneId: string, id: string, max: { w: number; h: number }): Zone | null {
  const z = v as Partial<Zone> | null | undefined;
  if (!z || typeof z !== 'object') return null;
  const x = num(z.x, 0, max.w - 1);
  const y = num(z.y, 0, max.h - 1);
  const zone: Zone = {
    id,
    sceneId,
    name: String(z.name ?? 'Zona').trim().slice(0, 40) || 'Zona',
    x,
    y,
    w: num(z.w, 1, max.w - x, 1),
    h: num(z.h, 1, max.h - y, 1),
  };
  if (typeof z.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(z.color)) zone.color = z.color;
  if (z.difficult) zone.difficult = true;
  if (z.cover) zone.cover = true;
  const hazard = num(z.hazard, 0, 9);
  if (hazard) zone.hazard = hazard;
  return zone;
}

/** The zone a point (in cells) lies in; the smallest one when they overlap. */
export function zoneAt(zones: Zone[], x: number, y: number): Zone | undefined {
  return zones
    .filter((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
    .sort((a, b) => a.w * a.h - b.w * b.h)[0];
}

/** Two zones touch (share an edge or overlap). */
export function zonesTouch(a: Zone, b: Zone): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h && !(
    // touching only at a corner does not count
    (a.x + a.w === b.x || b.x + b.w === a.x) && (a.y + a.h === b.y || b.y + b.h === a.y)
  );
}

/** Zones crossed from one zone to another (0 = the same zone, Infinity = unreachable). */
export function zoneHops(zones: Zone[], from: Zone, to: Zone): number {
  if (from.id === to.id) return 0;
  const seen = new Set([from.id]);
  let frontier = [from];
  for (let hops = 1; frontier.length && hops <= zones.length; hops++) {
    const next: Zone[] = [];
    for (const z of frontier) {
      for (const o of zones) {
        if (seen.has(o.id) || !zonesTouch(z, o)) continue;
        if (o.id === to.id) return hops;
        seen.add(o.id);
        next.push(o);
      }
    }
    frontier = next;
  }
  return Infinity;
}

/**
 * The range band between two points (cells, centres). With zones: same zone is
 * Corta (Ravvicinata within a cell and a half), the next one Media, two away
 * Lunga, further Estrema. Without zones the squares stand in for them.
 */
export function rangeBetween(zones: Zone[], a: { x: number; y: number }, b: { x: number; y: number }): PoolRange {
  const cells = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  if (cells <= 1.5) return 'Ravvicinata';
  const za = zoneAt(zones, a.x, a.y);
  const zb = zoneAt(zones, b.x, b.y);
  if (za && zb) {
    const hops = zoneHops(zones, za, zb);
    return hops === 0 ? 'Corta' : hops === 1 ? 'Media' : hops === 2 ? 'Lunga' : 'Estrema';
  }
  return cells <= 6 ? 'Corta' : cells <= 12 ? 'Media' : cells <= 24 ? 'Lunga' : 'Estrema';
}

/** What the wounds of a Bruto or Mostruosità now mean: the row of the track they reached. */
export function trackRow(track: { at: string; effect: string }[] | undefined, wounds: number): { at: string; effect: string } | undefined {
  if (!track) return undefined;
  for (const row of track) {
    const m = /(\d+)(?:\s*-\s*(\d+))?/.exec(row.at);
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : lo;
    if (wounds >= lo && wounds <= hi) return row;
  }
  return undefined;
}

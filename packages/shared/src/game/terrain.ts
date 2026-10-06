/**
 * The painted map of a scene: one character per cell, row by row. The GM
 * paints it at the table; everyone's app draws it the same way. Rock and
 * built floors give walls by themselves (`terrainWalls`).
 */

export type TerrainStyle = 'natural' | 'built' | 'rock';

export interface TerrainKind {
  /** the character stored in the map */
  code: string;
  id: string;
  name: string;
  style: TerrainStyle;
  /** swatch colour, also the base of the painting */
  color: string;
}

export const EMPTY_TERRAIN = '.';

export const TERRAINS: readonly TerrainKind[] = [
  { code: 's', id: 'stone', name: 'Pietra', style: 'built', color: '#7a746b' },
  { code: 'w', id: 'wood', name: 'Legno', style: 'built', color: '#8a6440' },
  { code: 't', id: 'tiles', name: 'Marmo', style: 'built', color: '#b9b4a8' },
  { code: 'c', id: 'cobble', name: 'Selciato', style: 'built', color: '#6f6a62' },
  { code: 'r', id: 'rock', name: 'Roccia', style: 'rock', color: '#2a2420' },
  { code: 'e', id: 'earth', name: 'Terra', style: 'natural', color: '#685a4a' },
  { code: 'd', id: 'dirt', name: 'Sterrato', style: 'natural', color: '#927a56' },
  { code: 'g', id: 'grass', name: 'Erba', style: 'natural', color: '#547a3c' },
  { code: 'a', id: 'sand', name: 'Sabbia', style: 'natural', color: '#c8b07c' },
  { code: 'n', id: 'snow', name: 'Neve', style: 'natural', color: '#e4e9ee' },
  { code: 'q', id: 'water', name: 'Acqua', style: 'natural', color: '#346884' },
  { code: 'p', id: 'deep', name: 'Acqua profonda', style: 'natural', color: '#1f4560' },
  { code: 'l', id: 'lava', name: 'Lava', style: 'natural', color: '#d8501c' },
  { code: 'v', id: 'chasm', name: 'Abisso', style: 'natural', color: '#0c0b0d' },
];

const BY_CODE = new Map(TERRAINS.map((t) => [t.code, t]));
export const terrainKind = (code: string | undefined): TerrainKind | undefined => (code ? BY_CODE.get(code) : undefined);
export const terrainById = (id: string): TerrainKind | undefined => TERRAINS.find((t) => t.id === id);

/** A map from untrusted input: the right length, unknown characters become empty. */
export function cleanTerrain(raw: unknown, w: number, h: number): string | null {
  if (raw === null || raw === undefined || typeof raw !== 'string') return null;
  let out = '';
  for (let i = 0; i < w * h; i++) {
    const ch = raw[i];
    out += ch && BY_CODE.has(ch) ? ch : EMPTY_TERRAIN;
  }
  return /[^.]/.test(out) ? out : null;
}

/** The map after the scene changes size: what was there stays where it was. */
export function resizeTerrain(t: string, oldW: number, oldH: number, w: number, h: number): string | null {
  let out = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out += x < oldW && y < oldH ? (t[y * oldW + x] ?? EMPTY_TERRAIN) : EMPTY_TERRAIN;
  return /[^.]/.test(out) ? out : null;
}

export const emptyTerrain = (w: number, h: number) => EMPTY_TERRAIN.repeat(w * h);

/**
 * Is there a wall between two neighbouring cells? Rock against anything that
 * is not rock (nor empty), and a built floor against nothing: a room painted
 * on an empty scene gets its walls, a pond on a picture doesn't.
 */
export function wallBetween(a: string, b: string): boolean {
  const ka = terrainKind(a);
  const kb = terrainKind(b);
  if (!ka && !kb) return false;
  if (!ka || !kb) return (ka ?? kb)!.style === 'built';
  return (ka.style === 'rock') !== (kb.style === 'rock');
}

type Seg = { x1: number; y1: number; x2: number; y2: number };

/** A wall the GM placed along most of the unit edge from (x, y): that edge needs no wall of the map. */
function covers(w: Seg, x: number, y: number, horizontal: boolean): boolean {
  const [a, b, at, lo, hi] = horizontal ? [w.y1, w.y2, y, Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)] : [w.x1, w.x2, x, Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)];
  if (a !== at || b !== at) return false;
  const from = horizontal ? x : y;
  return Math.min(hi, from + 1) - Math.max(lo, from) > 0.25;
}

/**
 * The walls a painted map implies, merged into long segments. Edges already
 * taken by a wall, door or window the GM placed are left free.
 */
export function terrainWalls(terrain: string, w: number, h: number, placed: Seg[] = []): Seg[] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY_TERRAIN : terrain[y * w + x] ?? EMPTY_TERRAIN);
  const out: Seg[] = [];
  const free = (x: number, y: number, horizontal: boolean) => !placed.some((p) => covers(p, x, y, horizontal));
  for (let y = 0; y <= h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && wallBetween(at(x, y - 1), at(x, y)) && free(x, y, true);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        out.push({ x1: start, y1: y, x2: x, y2: y });
        start = -1;
      }
    }
  }
  for (let x = 0; x <= w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const on = y < h && wallBetween(at(x - 1, y), at(x, y)) && free(x, y, false);
      if (on && start < 0) start = y;
      if (!on && start >= 0) {
        out.push({ x1: x, y1: start, x2: x, y2: y });
        start = -1;
      }
    }
  }
  return out;
}

/** Cells reached by a paint bucket from (x, y): same terrain, side by side. */
export function floodCells(terrain: string, w: number, h: number, x: number, y: number): number[] {
  if (x < 0 || y < 0 || x >= w || y >= h) return [];
  const target = terrain[y * w + x];
  const seen = new Uint8Array(w * h);
  const out: number[] = [];
  const stack = [y * w + x];
  seen[y * w + x] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    out.push(i);
    const cx = i % w;
    const cy = (i - cx) / w;
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (seen[j] || terrain[j] !== target) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  return out;
}

/** The map with some cells painted. */
export function paintCells(terrain: string, cells: Iterable<number>, code: string): string {
  const a = terrain.split('');
  for (const i of cells) if (i >= 0 && i < a.length) a[i] = code;
  return a.join('');
}

/** Cells under a round brush of `size` cells centred on (x, y) in cells. */
export function brushCells(w: number, h: number, x: number, y: number, size: number): number[] {
  const out: number[] = [];
  const r = size / 2;
  const left = Math.round(x - r);
  const top = Math.round(y - r);
  for (let cy = top; cy < top + size; cy++)
    for (let cx = left; cx < left + size; cx++) {
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      // small brushes are squares, bigger ones round
      if (size > 3 && Math.hypot(cx + 0.5 - left - r, cy + 0.5 - top - r) > r) continue;
      out.push(cy * w + cx);
    }
  return out;
}

export function rectCells(w: number, h: number, x0: number, y0: number, x1: number, y1: number): number[] {
  const out: number[] = [];
  for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(h - 1, Math.max(y0, y1)); y++)
    for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(w - 1, Math.max(x0, x1)); x++) out.push(y * w + x);
  return out;
}

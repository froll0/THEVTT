import { seededRng } from './mapgen';

/**
 * A map of the game's world (a region, a continent, a whole planet), made in
 * the map studio. The ground is a height field under a sea level, with the
 * biomes worked out from height, moisture and latitude (or painted by hand);
 * over it go rivers, roads, regions with their borders, symbols for
 * mountains, forests and towns, labels and pins with notes. It is kept to be
 * edited again, and turned into a scene picture to use at the table.
 */

export type WorldStyle = 'atlas' | 'parchment' | 'ink';
export type WorldGridKind = 'none' | 'hex' | 'square';
export type WorldShape = 'continent' | 'pangea' | 'islands' | 'archipelago' | 'coast';
export type RouteKind = 'road' | 'trail' | 'sea';
export type LabelFont = 'serif' | 'script' | 'sans';

export interface WorldPath {
  id: string;
  /** world pixels */
  points: [number, number][];
  /** line width in world pixels */
  width: number;
  /** routes only */
  kind?: RouteKind;
  name?: string;
}

export interface WorldRegion {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
  /** fill opacity, 0 to 1 */
  fill: number;
  border: 'solid' | 'dashed' | 'none';
}

export const SYMBOL_KINDS = [
  { id: 'mountain', name: 'Montagna', group: 'Natura' },
  { id: 'peak', name: 'Vetta innevata', group: 'Natura' },
  { id: 'volcano', name: 'Vulcano', group: 'Natura' },
  { id: 'hill', name: 'Collina', group: 'Natura' },
  { id: 'pine', name: 'Abete', group: 'Natura' },
  { id: 'tree', name: 'Albero', group: 'Natura' },
  { id: 'palm', name: 'Palma', group: 'Natura' },
  { id: 'reeds', name: 'Canneto', group: 'Natura' },
  { id: 'dunes', name: 'Dune', group: 'Natura' },
  { id: 'capital', name: 'Capitale', group: 'Insediamenti' },
  { id: 'city', name: 'Città', group: 'Insediamenti' },
  { id: 'town', name: 'Paese', group: 'Insediamenti' },
  { id: 'village', name: 'Villaggio', group: 'Insediamenti' },
  { id: 'castle', name: 'Castello', group: 'Insediamenti' },
  { id: 'tower', name: 'Torre', group: 'Insediamenti' },
  { id: 'port', name: 'Porto', group: 'Insediamenti' },
  { id: 'temple', name: 'Tempio', group: 'Luoghi' },
  { id: 'ruin', name: 'Rovine', group: 'Luoghi' },
  { id: 'cave', name: 'Caverna', group: 'Luoghi' },
  { id: 'mine', name: 'Miniera', group: 'Luoghi' },
  { id: 'camp', name: 'Accampamento', group: 'Luoghi' },
  { id: 'bridge', name: 'Ponte', group: 'Luoghi' },
  { id: 'battle', name: 'Campo di battaglia', group: 'Luoghi' },
  { id: 'danger', name: 'Pericolo', group: 'Luoghi' },
  { id: 'star', name: 'Luogo notevole', group: 'Luoghi' },
  { id: 'ship', name: 'Nave', group: 'Mare' },
  { id: 'monster', name: 'Mostro marino', group: 'Mare' },
  { id: 'whirlpool', name: 'Gorgo', group: 'Mare' },
] as const;
export type SymbolKind = (typeof SYMBOL_KINDS)[number]['id'];

export interface WorldSymbol {
  id: string;
  kind: SymbolKind;
  x: number;
  y: number;
  /** height in world pixels */
  size: number;
  flip?: boolean;
  /** a name written under it (towns, castles…) */
  name?: string;
}

export interface WorldLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  /** font size in world pixels */
  size: number;
  color: string;
  font: LabelFont;
  /** degrees */
  rotation: number;
  /** bend along an arc: −1 (down) to 1 (up), 0 straight */
  curve: number;
  /** extra space between the letters, in ems */
  spacing: number;
  italic?: boolean;
  caps?: boolean;
}

export interface WorldPin {
  id: string;
  x: number;
  y: number;
  title: string;
  text: string;
  color: string;
  /** a map of the library for this place (the dungeon, the town…) */
  mapId?: string;
}

export interface WorldMap {
  format: 'thevtt-world';
  version: 1;
  id: string;
  name: string;
  /** size of the picture, in world pixels */
  width: number;
  height: number;
  /** world pixels per cell of the height field */
  res: number;
  cols: number;
  rows: number;
  /** moisture and generation */
  seed: number;
  /** 0–1: below it is water */
  seaLevel: number;
  /** the height field, one byte a cell (base64) */
  heights: string;
  /** painted biomes, one byte a cell (0 = worked out by itself) */
  biomes: string;
  style: WorldStyle;
  grid: { kind: WorldGridKind; size: number; color: string; opacity: number };
  rivers: WorldPath[];
  routes: WorldPath[];
  regions: WorldRegion[];
  symbols: WorldSymbol[];
  labels: WorldLabel[];
  pins: WorldPin[];
  compass: { x: number; y: number; size: number } | null;
  scaleBar: { x: number; y: number; px: number; distance: number; unit: string } | null;
  /** the title drawn in a cartouche */
  title: { text: string; x: number; y: number; size: number } | null;
  /** drawn layers (all on unless switched off) */
  hidden?: Partial<Record<WorldLayer, boolean>>;
}

export type WorldLayer = 'terrain' | 'relief' | 'rivers' | 'routes' | 'regions' | 'symbols' | 'labels' | 'pins' | 'grid' | 'decor';

export const WORLD_FILE_EXT = 'thevtt-world';

export const BIOMES = [
  { id: 1, key: 'grass', name: 'Prateria', atlas: '#9cbf6b', parchment: '#e6d6a8' },
  { id: 2, key: 'forest', name: 'Foresta', atlas: '#5f8f4e', parchment: '#d9c995' },
  { id: 3, key: 'jungle', name: 'Giungla', atlas: '#3f7a3a', parchment: '#d3c28c' },
  { id: 4, key: 'desert', name: 'Deserto', atlas: '#e3cf8f', parchment: '#efe0b4' },
  { id: 5, key: 'swamp', name: 'Palude', atlas: '#6f8a5c', parchment: '#d2c59a' },
  { id: 6, key: 'steppe', name: 'Steppa', atlas: '#c2c27d', parchment: '#e9daa9' },
  { id: 7, key: 'tundra', name: 'Tundra', atlas: '#a9b59a', parchment: '#e2d7b6' },
  { id: 8, key: 'snow', name: 'Neve e ghiacci', atlas: '#f3f6f8', parchment: '#ebe0bf' },
  { id: 9, key: 'mountain', name: 'Roccia di montagna', atlas: '#9b8f7f', parchment: '#d6c49a' },
  { id: 10, key: 'beach', name: 'Spiaggia', atlas: '#e9dcae', parchment: '#efe2b8' },
  { id: 11, key: 'badlands', name: 'Terre desolate', atlas: '#b98b62', parchment: '#e0c79a' },
  { id: 12, key: 'volcanic', name: 'Terre vulcaniche', atlas: '#5d5450', parchment: '#c9b58a' },
] as const;
export type BiomeKey = (typeof BIOMES)[number]['key'];
export const biomeById = (id: number) => BIOMES.find((b) => b.id === id);

export const WORLD_SIZES = [
  { id: 'region', name: 'Regione', width: 1400, height: 1000 },
  { id: 'continent', name: 'Continente', width: 2000, height: 1400 },
  { id: 'world', name: 'Mondo intero', width: 2400, height: 1200 },
] as const;

// ---------------------------------------------------------------- fields

/** A height or biome field as text, for saving. */
export function encodeField(f: Uint8Array): string {
  let s = '';
  for (let i = 0; i < f.length; i += 0x8000) s += String.fromCharCode(...f.subarray(i, i + 0x8000));
  return btoa(s);
}

export function decodeField(s: string, n: number): Uint8Array {
  const out = new Uint8Array(n);
  try {
    const bin = atob(s);
    for (let i = 0; i < Math.min(n, bin.length); i++) out[i] = bin.charCodeAt(i);
  } catch {
    // a broken field comes back flat
  }
  return out;
}

// ---------------------------------------------------------------- noise

function hash(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise, 0 to 1. */
export function valueNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);
  const a = hash(seed, x0, y0);
  const b = hash(seed, x0 + 1, y0);
  const c = hash(seed, x0, y0 + 1);
  const d = hash(seed, x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal noise: octaves of value noise, 0 to 1. */
export function fbm(seed: number, x: number, y: number, octaves = 5, persistence = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(seed + o * 1013, x * f, y * f) * amp;
    norm += amp;
    amp *= persistence;
    f *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------- the world

export function createWorld(opts: { id: string; name: string; width: number; height: number; seed?: number; res?: number }): WorldMap {
  const res = opts.res ?? 4;
  const cols = Math.max(8, Math.round(opts.width / res));
  const rows = Math.max(8, Math.round(opts.height / res));
  const heights = new Uint8Array(cols * rows).fill(90);
  return {
    format: 'thevtt-world',
    version: 1,
    id: opts.id,
    name: opts.name,
    width: cols * res,
    height: rows * res,
    res,
    cols,
    rows,
    seed: opts.seed ?? 1,
    seaLevel: 0.5,
    heights: encodeField(heights),
    biomes: encodeField(new Uint8Array(cols * rows)),
    style: 'atlas',
    grid: { kind: 'none', size: 50, color: '#000000', opacity: 0.18 },
    rivers: [],
    routes: [],
    regions: [],
    symbols: [],
    labels: [],
    pins: [],
    compass: null,
    scaleBar: null,
    title: null,
  };
}

/** Is this (from a file, say) a world map we can read? */
export function isWorldMap(v: unknown): v is WorldMap {
  const w = v as Partial<WorldMap> | null;
  return (
    !!w &&
    typeof w === 'object' &&
    w.format === 'thevtt-world' &&
    w.version === 1 &&
    typeof w.heights === 'string' &&
    typeof w.cols === 'number' &&
    typeof w.rows === 'number' &&
    w.cols > 0 &&
    w.rows > 0 &&
    w.cols * w.rows <= 4_000_000
  );
}

/** Older or partial data made whole. */
export function normalizeWorld(w: WorldMap): WorldMap {
  const base = createWorld({ id: w.id, name: w.name, width: w.width, height: w.height, res: w.res, seed: w.seed });
  return {
    ...base,
    ...w,
    grid: { ...base.grid, ...(w.grid ?? {}) },
    rivers: Array.isArray(w.rivers) ? w.rivers : [],
    routes: Array.isArray(w.routes) ? w.routes : [],
    regions: Array.isArray(w.regions) ? w.regions : [],
    symbols: Array.isArray(w.symbols) ? w.symbols : [],
    labels: Array.isArray(w.labels) ? w.labels : [],
    pins: Array.isArray(w.pins) ? w.pins : [],
  };
}

export const worldHeights = (w: WorldMap) => decodeField(w.heights, w.cols * w.rows);
export const worldBiomes = (w: WorldMap) => decodeField(w.biomes, w.cols * w.rows);

export interface WorldGenOptions {
  seed: number;
  shape: WorldShape;
  /** share of the map that is land, 0.1 to 0.8 */
  land: number;
  /** 0 (smooth coasts) to 1 (ragged) */
  roughness: number;
}

/** A new height field: land of the shape asked, sea around it. */
export function generateHeights(cols: number, rows: number, opts: WorldGenOptions): Uint8Array {
  const rng = seededRng(opts.seed);
  const aspect = cols / rows;
  // where the land gathers
  const blobs: { x: number; y: number; r: number }[] = [];
  const add = (n: number, rMin: number, rMax: number, margin: number) => {
    for (let i = 0; i < n; i++) blobs.push({ x: margin + rng() * (1 - 2 * margin), y: margin + rng() * (1 - 2 * margin), r: rMin + rng() * (rMax - rMin) });
  };
  if (opts.shape === 'continent') {
    blobs.push({ x: 0.5, y: 0.5, r: 0.42 });
    add(3, 0.12, 0.22, 0.25);
  } else if (opts.shape === 'pangea') {
    blobs.push({ x: 0.5, y: 0.5, r: 0.6 });
    add(4, 0.2, 0.3, 0.2);
  } else if (opts.shape === 'islands') add(4 + Math.floor(rng() * 3), 0.12, 0.24, 0.15);
  else if (opts.shape === 'archipelago') add(14 + Math.floor(rng() * 8), 0.04, 0.1, 0.08);
  const side = Math.floor(rng() * 4);
  const freq = 2.5 + opts.roughness * 4 + (opts.shape === 'archipelago' ? 3 : 0);
  const raw = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x / cols;
      const ny = y / rows;
      const n = fbm(opts.seed, nx * freq * aspect, ny * freq, 6, 0.45 + opts.roughness * 0.15);
      let mask: number;
      if (opts.shape === 'coast') {
        // land along one side, the coast wandering
        const t = side === 0 ? nx : side === 1 ? 1 - nx : side === 2 ? ny : 1 - ny;
        mask = 1 - t * 1.6 + (fbm(opts.seed + 7, nx * 3, ny * 3, 3) - 0.5) * 0.6;
      } else {
        mask = 0;
        for (const b of blobs) {
          const dx = (nx - b.x) * aspect;
          const dy = ny - b.y;
          mask = Math.max(mask, 1 - (dx * dx + dy * dy) / (b.r * b.r));
        }
        // the edges of the map stay at sea
        const edge = Math.min(nx, 1 - nx, ny, 1 - ny);
        if (edge < 0.06) mask -= (0.06 - edge) * 12;
      }
      raw[y * cols + x] = n * 0.75 + mask * 0.65;
    }
  }
  // the land share asked: the sea level falls where that much is above it
  const sorted = Float32Array.from(raw).sort();
  const share = Math.min(0.85, Math.max(0.05, opts.land));
  const thr = sorted[Math.floor((1 - share) * (sorted.length - 1))]!;
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const out = new Uint8Array(cols * rows);
  // small islands stay low: only big lands raise great mountains
  const relief = opts.shape === 'archipelago' ? 2.1 : opts.shape === 'islands' ? 1.6 : 1.25;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i]!;
    const h = v < thr ? 0.5 * Math.pow((v - min) / Math.max(1e-6, thr - min), 0.8) : 0.5 + 0.5 * Math.pow((v - thr) / Math.max(1e-6, max - thr), relief);
    out[i] = Math.round(Math.max(0, Math.min(1, h)) * 255);
  }
  return out;
}

/** The world with a new ground (painted biomes, rivers and the auto symbols start over). */
export function generateWorld(w: WorldMap, opts: WorldGenOptions): WorldMap {
  const heights = generateHeights(w.cols, w.rows, opts);
  return { ...w, seed: opts.seed, seaLevel: 0.5, heights: encodeField(heights), biomes: encodeField(new Uint8Array(w.cols * w.rows)), rivers: [] };
}

// ---------------------------------------------------------------- brushes

export type HeightBrush = 'raise' | 'lower' | 'smooth' | 'flatten' | 'roughen';

/**
 * Shapes the ground around a point (field cells), with a soft edge.
 * strength 0–1; flatten pulls towards `target` (0–255).
 */
export function brushHeights(f: Uint8Array, cols: number, rows: number, cx: number, cy: number, radius: number, mode: HeightBrush, strength: number, target = 128, seed = 1): void {
  const r = Math.max(0.5, radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(cols - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(rows - 1, Math.ceil(cy + r));
  const src = mode === 'smooth' ? f.slice() : f;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1) continue;
      const k = (1 - d * d) ** 2 * strength;
      const i = y * cols + x;
      let v = f[i]!;
      if (mode === 'raise') v += 24 * k;
      else if (mode === 'lower') v -= 24 * k;
      else if (mode === 'flatten') v += (target - v) * k * 0.6;
      else if (mode === 'roughen') v += (hash(seed, x, y) - 0.5) * 40 * k;
      else {
        let sum = 0;
        let n = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(rows - 1, y + 1); yy++)
          for (let xx = Math.max(0, x - 1); xx <= Math.min(cols - 1, x + 1); xx++) {
            sum += src[yy * cols + xx]!;
            n++;
          }
        v += (sum / n - v) * Math.min(1, k * 1.5);
      }
      f[i] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
}

/** Paints a biome (0 = back to automatic) on the cells within the radius. */
export function paintBiome(b: Uint8Array, cols: number, rows: number, cx: number, cy: number, radius: number, id: number): void {
  const r = Math.max(0.5, radius);
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(rows - 1, Math.ceil(cy + r)); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(cols - 1, Math.ceil(cx + r)); x++) if (Math.hypot(x - cx, y - cy) <= r) b[y * cols + x] = id;
}

// ---------------------------------------------------------------- biomes

/** Moisture of the land, 0 (dry) to 1 (wet). */
export const moistureAt = (seed: number, cols: number, rows: number, x: number, y: number) => fbm(seed + 4242, (x / cols) * 4 * (cols / rows), (y / rows) * 4, 4);

/** How high above the sea a cell is, 0 (the shore) to 1 (the highest peak); negative under water. */
export function elevation(h: number, seaLevel: number): number {
  const v = h / 255;
  return v >= seaLevel ? (v - seaLevel) / Math.max(1e-6, 1 - seaLevel) : (v - seaLevel) / Math.max(1e-6, seaLevel);
}

/** The biome of a land cell, painted or worked out from height, moisture and latitude. */
export function biomeAt(w: WorldMap, heights: Uint8Array, biomes: Uint8Array, x: number, y: number, moisture?: Float32Array): BiomeKey | null {
  const i = y * w.cols + x;
  const e = elevation(heights[i]!, w.seaLevel);
  if (e < 0) return null;
  const painted = biomes[i];
  if (painted) return biomeById(painted)?.key ?? null;
  if (e > 0.82) return 'snow';
  if (e > 0.6) return 'mountain';
  if (e < 0.025) return 'beach';
  const lat = Math.abs(y / w.rows - 0.5) * 2;
  const temp = 1 - lat * 0.9 - e * 0.45;
  const m = moisture ? moisture[i]! : moistureAt(w.seed, w.cols, w.rows, x, y);
  if (temp < 0.18) return 'snow';
  if (temp < 0.32) return 'tundra';
  if (m < 0.36) return temp > 0.62 ? 'desert' : 'steppe';
  if (m > 0.62 && e < 0.12) return 'swamp';
  if (m > 0.52) return temp > 0.72 ? 'jungle' : 'forest';
  return 'grass';
}

/** Moisture of every cell, worked out once (it only depends on the seed and the size). */
export function moistureField(w: Pick<WorldMap, 'seed' | 'cols' | 'rows'>): Float32Array {
  const out = new Float32Array(w.cols * w.rows);
  for (let y = 0; y < w.rows; y++) for (let x = 0; x < w.cols; x++) out[y * w.cols + x] = moistureAt(w.seed, w.cols, w.rows, x, y);
  return out;
}

// ---------------------------------------------------------------- coasts

/**
 * Lines where the field crosses a level (marching squares), as closed loops
 * in cell coordinates (a cell's centre is at x + 0.5). Outside the map counts
 * as below the level, so every coast closes.
 */
export function contours(f: Uint8Array, cols: number, rows: number, level: number): [number, number][][] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? -1 : f[y * cols + x]!);
  const segs: [number, number, number, number][] = [];
  const lerp = (a: number, b: number) => (level - a) / (b - a);
  for (let y = -1; y < rows; y++) {
    for (let x = -1; x < cols; x++) {
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x + 1, y + 1);
      const d = at(x, y + 1);
      const idx = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const cx = x + 0.5;
      const cy = y + 0.5;
      const top: [number, number] = [cx + lerp(a, b), cy];
      const right: [number, number] = [cx + 1, cy + lerp(b, c)];
      const bottom: [number, number] = [cx + lerp(d, c), cy + 1];
      const left: [number, number] = [cx, cy + lerp(a, d)];
      const s = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
      switch (idx) {
        case 1: case 14: s(left, bottom); break;
        case 2: case 13: s(bottom, right); break;
        case 3: case 12: s(left, right); break;
        case 4: case 11: s(top, right); break;
        case 5: s(left, top); s(bottom, right); break;
        case 6: case 9: s(top, bottom); break;
        case 7: case 8: s(left, top); break;
        case 10: s(top, right); s(left, bottom); break;
      }
    }
  }
  // join the pieces into loops
  const key = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((sg, i) => {
    for (const k of [key(sg[0], sg[1]), key(sg[2], sg[3])]) {
      const l = ends.get(k);
      if (l) l.push(i);
      else ends.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const loops: [number, number][][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const sg = segs[i]!;
    const loop: [number, number][] = [[sg[0], sg[1]], [sg[2], sg[3]]];
    for (;;) {
      const [lx, ly] = loop[loop.length - 1]!;
      const next = (ends.get(key(lx, ly)) ?? []).find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const n = segs[next]!;
      loop.push(key(n[0], n[1]) === key(lx, ly) ? [n[2], n[3]] : [n[0], n[1]]);
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

// ---------------------------------------------------------------- rivers

/** A river from a point downhill to the sea (or into a lake), in world pixels. */
export function traceRiver(w: WorldMap, heights: Uint8Array, sx: number, sy: number, maxSteps = 4000): [number, number][] {
  const sea = w.seaLevel * 255;
  let x = Math.max(0, Math.min(w.cols - 1, Math.floor(sx / w.res)));
  let y = Math.max(0, Math.min(w.rows - 1, Math.floor(sy / w.res)));
  const seen = new Set<number>();
  const out: [number, number][] = [];
  for (let step = 0; step < maxSteps; step++) {
    const i = y * w.cols + x;
    seen.add(i);
    out.push([(x + 0.5) * w.res, (y + 0.5) * w.res]);
    if (heights[i]! < sea) break;
    // the lowest neighbour not yet visited (a flat stretch goes on to the lowest anyway)
    let best = -1;
    let bestH = Infinity;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w.cols || ny >= w.rows) continue;
        const j = ny * w.cols + nx;
        if (seen.has(j)) continue;
        const h = heights[j]! + (dx && dy ? 0.4 : 0);
        if (h < bestH) {
          bestH = h;
          best = j;
        }
      }
    if (best < 0 || bestH > heights[i]! + 6) break;
    x = best % w.cols;
    y = Math.floor(best / w.cols);
  }
  return simplify(out, w.res * 0.8);
}

/** Fewer points along a line (Douglas–Peucker). */
export function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let dist = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!;
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > dist) {
        dist = d;
        far = i;
      }
    }
    if (far >= 0 && dist > tolerance) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Rivers from the high ground to the sea. */
export function autoRivers(w: WorldMap, heights: Uint8Array, count: number, seed = w.seed): WorldPath[] {
  const rng = seededRng(seed + 99);
  const out: WorldPath[] = [];
  for (let tries = 0; tries < count * 40 && out.length < count; tries++) {
    const x = Math.floor(rng() * w.cols);
    const y = Math.floor(rng() * w.rows);
    const e = elevation(heights[y * w.cols + x]!, w.seaLevel);
    if (e < 0.35 || e > 0.75) continue;
    const pts = traceRiver(w, heights, (x + 0.5) * w.res, (y + 0.5) * w.res);
    const last = pts[pts.length - 1]!;
    const end = heights[Math.floor(last[1] / w.res) * w.cols + Math.floor(last[0] / w.res)]!;
    const length = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) : 0), 0);
    if (end >= w.seaLevel * 255 || length < w.res * 25) continue;
    // not on top of another one
    if (out.some((r) => r.points.some((p) => Math.hypot(p[0] - pts[0]![0], p[1] - pts[0]![1]) < w.res * 12))) continue;
    out.push({ id: `river-${seed}-${out.length}`, points: pts, width: 1.5 + rng() * 1.5 });
  }
  return out;
}

// ---------------------------------------------------------------- decoration

/** Mountains, hills and forests scattered over the land, by its height and biome. */
export function autoSymbols(w: WorldMap, heights: Uint8Array, biomes: Uint8Array, opts: { mountains?: boolean; forests?: boolean; hills?: boolean } = {}): WorldSymbol[] {
  const rng = seededRng(w.seed + 7);
  const out: WorldSymbol[] = [];
  const scatter = (spacing: number, test: (x: number, y: number, e: number, b: BiomeKey | null) => SymbolKind | null, size: (e: number) => number, chance: number) => {
    for (let py = spacing / 2; py < w.height; py += spacing * 0.8) {
      for (let px = spacing / 2; px < w.width; px += spacing) {
        const x = px + (rng() - 0.5) * spacing * 0.9;
        const y = py + (rng() - 0.5) * spacing * 0.7;
        const cx = Math.floor(x / w.res);
        const cy = Math.floor(y / w.res);
        if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) continue;
        const e = elevation(heights[cy * w.cols + cx]!, w.seaLevel);
        if (e < 0 || rng() > chance) continue;
        const kind = test(cx, cy, e, biomeAt(w, heights, biomes, cx, cy));
        if (kind) out.push({ id: `auto-${out.length}-${Math.round(x)}-${Math.round(y)}`, kind, x, y, size: size(e), flip: rng() < 0.5 });
      }
    }
  };
  if (opts.mountains !== false) scatter(38, (_x, _y, e) => (e > 0.84 ? 'peak' : e > 0.62 ? 'mountain' : null), (e) => 18 + e * 16, 0.75);
  if (opts.hills !== false) scatter(40, (_x, _y, e) => (e > 0.42 && e <= 0.62 ? 'hill' : null), () => 13 + rng() * 5, 0.35);
  if (opts.forests !== false) scatter(18, (_x, _y, e, b) => (e > 0.6 ? null : b === 'forest' || b === 'tundra' ? (b === 'tundra' || rng() < 0.4 ? 'pine' : 'tree') : b === 'jungle' ? 'palm' : b === 'swamp' ? 'reeds' : null), () => 10 + rng() * 5, 0.6);
  return out;
}

/**
 * Towns on good ground (low land, not too far from water), spaced out, each
 * with a made-up name: one capital, a few cities, more towns and villages.
 */
export function autoTowns(w: WorldMap, heights: Uint8Array, count: number, seed = w.seed): WorldSymbol[] {
  const rng = seededRng(seed + 31);
  const sea = w.seaLevel * 255;
  const nearWater = (cx: number, cy: number) => {
    for (let dy = -6; dy <= 6; dy += 2)
      for (let dx = -6; dx <= 6; dx += 2) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < w.cols && y < w.rows && heights[y * w.cols + x]! < sea) return true;
      }
    return false;
  };
  const spacing = Math.sqrt((w.width * w.height) / Math.max(1, count)) * 0.55;
  const out: WorldSymbol[] = [];
  for (let tries = 0; tries < count * 60 && out.length < count; tries++) {
    const x = rng() * w.width;
    const y = rng() * w.height;
    const cx = Math.floor(x / w.res);
    const cy = Math.floor(y / w.res);
    const e = elevation(heights[cy * w.cols + cx]!, w.seaLevel);
    if (e < 0.02 || e > 0.4) continue;
    if (!nearWater(cx, cy) && rng() < 0.6) continue;
    if (out.some((s) => Math.hypot(s.x - x, s.y - y) < spacing)) continue;
    const n = out.length;
    const kind: SymbolKind = n === 0 ? 'capital' : n < 3 ? 'city' : n < Math.ceil(count * 0.5) ? 'town' : 'village';
    out.push({ id: `town-${seed}-${n}`, kind, x, y, size: kind === 'capital' ? 26 : kind === 'city' ? 22 : kind === 'town' ? 18 : 14, name: placeName(rng) });
  }
  return out;
}

// ---------------------------------------------------------------- names

const NAME_START = ['Al', 'Bel', 'Cor', 'Dar', 'El', 'Fal', 'Gal', 'Is', 'Lor', 'Mar', 'Nor', 'Or', 'Pel', 'Rav', 'Sel', 'Tar', 'Ul', 'Val', 'Ver', 'Zar', 'Ast', 'Bran', 'Cal', 'Dun', 'Ester', 'Gor', 'Mir', 'Os', 'Tor', 'Vel'];
const NAME_MID = ['a', 'e', 'i', 'o', 'an', 'en', 'ar', 'or', 'il', 'ur', 'ia', 'el'];
const NAME_END = ['dor', 'mar', 'via', 'gard', 'ena', 'ia', 'ost', 'ano', 'eria', 'ona', 'ince', 'ora', 'esse', 'ino', 'ane', 'ath', 'ium', 'ar'];

/** A made-up place name; kind adds the right words around it. */
export function placeName(rng: () => number, kind: 'city' | 'region' | 'sea' | 'mountains' | 'forest' | 'river' = 'city'): string {
  const pick = <T>(a: readonly T[]) => a[Math.floor(rng() * a.length)]!;
  const base = pick(NAME_START) + (rng() < 0.5 ? pick(NAME_MID) : '') + pick(NAME_END);
  switch (kind) {
    case 'region':
      return `${pick(['Regno di', 'Terre di', 'Marca di', 'Principato di', 'Ducato di', 'Libere città di'])} ${base}`;
    case 'sea':
      return `${pick(['Mare di', 'Golfo di', 'Baia di', 'Stretto di', 'Oceano di'])} ${base}`;
    case 'mountains':
      return `${pick(['Monti di', 'Picchi di', 'Catena di', 'Alture di'])} ${base}`;
    case 'forest':
      return `${pick(['Bosco di', 'Selva di', 'Foresta di'])} ${base}`;
    case 'river':
      return `${pick(['Fiume', 'Rio', 'Torrente'])} ${base}`;
    default:
      return base;
  }
}

// ---------------------------------------------------------------- at the table

/** The squares (or hexes) of the scene a world map becomes. */
export function worldSceneCells(w: WorldMap): { widthCells: number; heightCells: number; cellPx: number } {
  const cellPx = w.grid.kind === 'none' ? 50 : Math.max(10, w.grid.size);
  return { widthCells: Math.max(1, Math.round(w.width / cellPx)), heightCells: Math.max(1, Math.round(w.height / cellPx)), cellPx };
}

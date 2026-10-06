/**
 * Procedural maps for the table: a grid of terrain plus the walls, doors and
 * scenery that go with it, so a generated scene works with dynamic vision
 * straight away. Deterministic: the same seed gives the same map.
 */

export type MapKind = 'dungeon' | 'cave' | 'wilderness';

/** terrain of one cell */
export const T = { void: 0, floor: 1, corridor: 2, water: 3, path: 4, grass: 5 } as const;
export type Terrain = (typeof T)[keyof typeof T];

export interface MapGenOptions {
  kind: MapKind;
  width: number;
  height: number;
  seed: number;
  /** 0..1: how many rooms, trees, rocks… */
  density?: number;
  doors?: boolean;
  lights?: boolean;
  furniture?: boolean;
}

export interface MapRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GeneratedMap {
  kind: MapKind;
  width: number;
  height: number;
  seed: number;
  /** row-major, one Terrain per cell */
  cells: number[];
  rooms: MapRoom[];
  walls: { x1: number; y1: number; x2: number; y2: number; kind: 'wall' | 'door' }[];
  /** scenery by prop kind id, top-left in cells */
  props: { kind: string; x: number; y: number }[];
  /** a good place for the party to start */
  start: { x: number; y: number };
}

/** mulberry32: small, fast, good enough for maps */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const walkable = (t: number) => t === T.floor || t === T.corridor || t === T.path || t === T.grass;

class Grid {
  cells: number[];
  constructor(
    readonly w: number,
    readonly h: number,
    fill: number,
  ) {
    this.cells = new Array(w * h).fill(fill);
  }
  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number) {
    return this.in(x, y) ? this.cells[y * this.w + x]! : T.void;
  }
  set(x: number, y: number, t: number) {
    if (this.in(x, y)) this.cells[y * this.w + x] = t;
  }
}

/** Walls on every grid edge between walkable and solid ground, merged into long runs. */
export function extractWalls(grid: { w: number; h: number; get(x: number, y: number): number }, solid: (t: number) => boolean = (t) => !walkable(t)) {
  const out: { x1: number; y1: number; x2: number; y2: number; kind: 'wall' }[] = [];
  const edge = (a: number, b: number) => solid(a) !== solid(b);
  // horizontal edges: between (x, y-1) and (x, y)
  for (let y = 0; y <= grid.h; y++) {
    let start = -1;
    for (let x = 0; x <= grid.w; x++) {
      const on = x < grid.w && edge(grid.get(x, y - 1), grid.get(x, y));
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        out.push({ x1: start, y1: y, x2: x, y2: y, kind: 'wall' });
        start = -1;
      }
    }
  }
  // vertical edges: between (x-1, y) and (x, y)
  for (let x = 0; x <= grid.w; x++) {
    let start = -1;
    for (let y = 0; y <= grid.h; y++) {
      const on = y < grid.h && edge(grid.get(x - 1, y), grid.get(x, y));
      if (on && start < 0) start = y;
      if (!on && start >= 0) {
        out.push({ x1: x, y1: start, x2: x, y2: y, kind: 'wall' });
        start = -1;
      }
    }
  }
  return out;
}

const roomCenter = (r: MapRoom) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
const inRoom = (r: MapRoom, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

function dungeon(o: Required<MapGenOptions>, rnd: () => number): GeneratedMap {
  const g = new Grid(o.width, o.height, T.void);
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const rooms: MapRoom[] = [];
  const target = Math.max(3, Math.round(((o.width * o.height) / 90) * (0.5 + o.density)));
  for (let tries = 0; tries < target * 30 && rooms.length < target; tries++) {
    const w = int(4, 9);
    const h = int(4, 8);
    const r = { x: int(1, o.width - w - 1), y: int(1, o.height - h - 1), w, h };
    if (r.x < 1 || r.y < 1) continue;
    // a cell of rock between rooms, for walls and doors
    if (rooms.some((q) => r.x < q.x + q.w + 2 && q.x < r.x + r.w + 2 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2)) continue;
    rooms.push(r);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g.set(x, y, T.floor);
  }
  // corridors: each room to the nearest already connected one (a spanning tree), plus a loop or two
  const carve = (x: number, y: number) => {
    if (g.get(x, y) === T.void) g.set(x, y, T.corridor);
  };
  const link = (a: MapRoom, b: MapRoom) => {
    const p = roomCenter(a);
    const q = roomCenter(b);
    const horizontalFirst = rnd() < 0.5;
    if (horizontalFirst) {
      for (let x = Math.min(p.x, q.x); x <= Math.max(p.x, q.x); x++) carve(x, p.y);
      for (let y = Math.min(p.y, q.y); y <= Math.max(p.y, q.y); y++) carve(q.x, y);
    } else {
      for (let y = Math.min(p.y, q.y); y <= Math.max(p.y, q.y); y++) carve(p.x, y);
      for (let x = Math.min(p.x, q.x); x <= Math.max(p.x, q.x); x++) carve(x, q.y);
    }
  };
  const dist = (a: MapRoom, b: MapRoom) => Math.abs(roomCenter(a).x - roomCenter(b).x) + Math.abs(roomCenter(a).y - roomCenter(b).y);
  const linked = [rooms[0]!];
  const rest = rooms.slice(1);
  while (rest.length) {
    let best = { i: 0, j: 0, d: Infinity };
    rest.forEach((r, i) =>
      linked.forEach((l, j) => {
        const d = dist(r, l);
        if (d < best.d) best = { i, j, d };
      }),
    );
    const r = rest.splice(best.i, 1)[0]!;
    link(linked[best.j]!, r);
    linked.push(r);
  }
  for (let k = 0; k < Math.floor(rooms.length / 4); k++) link(rooms[int(0, rooms.length - 1)]!, rooms[int(0, rooms.length - 1)]!);

  const walls: GeneratedMap['walls'] = extractWalls(g);
  // doors where a corridor meets a room: across the corridor, on the room's edge
  if (o.doors) {
    const seen = new Set<string>();
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (g.get(x, y) !== T.corridor) continue;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          if (g.get(x + dx, y + dy) !== T.floor) continue;
          // only a real doorway: rock on both sides of the corridor cell
          const side = dx !== 0 ? [g.get(x, y - 1), g.get(x, y + 1)] : [g.get(x - 1, y), g.get(x + 1, y)];
          if (side.some((t) => walkable(t))) continue;
          const d =
            dx !== 0
              ? { x1: x + (dx > 0 ? 1 : 0), y1: y, x2: x + (dx > 0 ? 1 : 0), y2: y + 1 }
              : { x1: x, y1: y + (dy > 0 ? 1 : 0), x2: x + 1, y2: y + (dy > 0 ? 1 : 0) };
          const key = `${d.x1},${d.y1},${d.x2},${d.y2}`;
          if (seen.has(key) || rnd() < 0.15) continue;
          seen.add(key);
          walls.push({ ...d, kind: 'door' });
        }
      }
  }

  const props: GeneratedMap['props'] = [];
  const free = (x: number, y: number) => g.get(x, y) === T.floor && !props.some((p) => p.x === x && p.y === y);
  rooms.forEach((r, i) => {
    // a torch against the top wall of most rooms
    if (o.lights && (i === 0 || rnd() < 0.75)) {
      const x = r.x + int(1, r.w - 2);
      if (free(x, r.y)) props.push({ kind: 'torch', x, y: r.y });
    }
    if (!o.furniture) return;
    const pick = rnd();
    const corner = () => {
      const cx = rnd() < 0.5 ? r.x : r.x + r.w - 1;
      const cy = rnd() < 0.5 ? r.y + r.h - 1 : r.y + 1;
      return { x: cx, y: cy };
    };
    if (pick < 0.25) {
      const c = corner();
      if (free(c.x, c.y)) props.push({ kind: 'chest', x: c.x, y: c.y });
    } else if (pick < 0.5) {
      for (let n = 0; n < int(1, 3); n++) {
        const c = corner();
        if (free(c.x, c.y)) props.push({ kind: rnd() < 0.5 ? 'barrel' : 'crate', x: c.x, y: c.y });
      }
    } else if (pick < 0.65 && r.w >= 6 && r.h >= 6) {
      // columns in a hall
      for (const [px, py] of [
        [r.x + 1, r.y + 1],
        [r.x + r.w - 2, r.y + 1],
        [r.x + 1, r.y + r.h - 2],
        [r.x + r.w - 2, r.y + r.h - 2],
      ] as const)
        if (free(px, py)) props.push({ kind: 'pillar', x: px, y: py });
    } else if (pick < 0.75) {
      const c = roomCenter(r);
      if (free(c.x, c.y)) props.push({ kind: 'altar', x: c.x, y: c.y });
    } else if (pick < 0.85) {
      const c = roomCenter(r);
      if (free(c.x, c.y)) props.push({ kind: 'table', x: c.x, y: c.y });
    }
  });
  const s = roomCenter(rooms[0]!);
  return { kind: 'dungeon', width: o.width, height: o.height, seed: o.seed, cells: g.cells, rooms, walls, props, start: s };
}

function cave(o: Required<MapGenOptions>, rnd: () => number): GeneratedMap {
  let g = new Grid(o.width, o.height, T.void);
  const fill = 0.47 - o.density * 0.08;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.set(x, y, x === 0 || y === 0 || x === g.w - 1 || y === g.h - 1 || rnd() < fill ? T.void : T.floor);
  // cellular automaton: rock grows where rock is
  for (let step = 0; step < 5; step++) {
    const next = new Grid(g.w, g.h, T.void);
    for (let y = 1; y < g.h - 1; y++)
      for (let x = 1; x < g.w - 1; x++) {
        let rock = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && g.get(x + dx, y + dy) === T.void) rock++;
        next.set(x, y, rock >= 5 || (step < 2 && rock === 0) ? T.void : T.floor);
      }
    g = next;
  }
  // keep the biggest cave only: everything must be reachable
  const region = new Int32Array(g.w * g.h).fill(-1);
  let best = { id: -1, size: 0 };
  let id = 0;
  for (let i = 0; i < g.cells.length; i++) {
    if (g.cells[i] !== T.floor || region[i]! >= 0) continue;
    const stack = [i];
    region[i] = id;
    let size = 0;
    while (stack.length) {
      const c = stack.pop()!;
      size++;
      const x = c % g.w;
      const y = Math.floor(c / g.w);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const) {
        const n = ny * g.w + nx;
        if (g.get(nx, ny) === T.floor && region[n]! < 0) {
          region[n] = id;
          stack.push(n);
        }
      }
    }
    if (size > best.size) best = { id, size };
    id++;
  }
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === T.floor && region[i] !== best.id) g.cells[i] = T.void;
  // an underground pool or two
  const floors = g.cells.map((t, i) => (t === T.floor ? i : -1)).filter((i) => i >= 0);
  const pick = () => floors[Math.floor(rnd() * floors.length)]!;
  for (let k = 0; k < (rnd() < 0.6 ? 1 : 2); k++) {
    const c = pick();
    const cx = c % g.w;
    const cy = Math.floor(c / g.w);
    const r = 1 + rnd() * 1.6;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (g.get(x, y) === T.floor && Math.hypot(x - cx, y - cy) <= r) g.set(x, y, T.water);
  }
  const walls = extractWalls(g, (t) => t === T.void);
  const props: GeneratedMap['props'] = [];
  const free = (x: number, y: number) => g.get(x, y) === T.floor && !props.some((p) => Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2);
  const count = Math.round((floors.length / 40) * (0.5 + o.density));
  for (let k = 0; k < count * 3 && props.length < count; k++) {
    const c = pick();
    const x = c % g.w;
    const y = Math.floor(c / g.w);
    if (!free(x, y)) continue;
    const r = rnd();
    if (r < 0.55) props.push({ kind: 'rock', x, y });
    else if (o.furniture && r < 0.7) props.push({ kind: 'chest', x, y });
    else if (o.furniture && r < 0.85) props.push({ kind: 'barrel', x, y });
    else if (o.lights) props.push({ kind: 'campfire', x, y });
  }
  const startCell = pick();
  return { kind: 'cave', width: o.width, height: o.height, seed: o.seed, cells: g.cells, rooms: [], walls, props, start: { x: startCell % g.w, y: Math.floor(startCell / g.w) } };
}

function wilderness(o: Required<MapGenOptions>, rnd: () => number): GeneratedMap {
  const g = new Grid(o.width, o.height, T.grass);
  // a path winding from one side to the other
  let y = Math.floor(g.h * (0.3 + rnd() * 0.4));
  for (let x = 0; x < g.w; x++) {
    g.set(x, y, T.path);
    if (rnd() < 0.5) g.set(x, y + 1, T.path);
    if (rnd() < 0.3) y = Math.max(2, Math.min(g.h - 3, y + (rnd() < 0.5 ? -1 : 1)));
  }
  // a pond
  const px = Math.floor(g.w * (0.15 + rnd() * 0.7));
  const py = rnd() < 0.5 ? Math.floor(g.h * 0.2) : Math.floor(g.h * 0.78);
  const pr = 2 + rnd() * 2;
  for (let yy = Math.floor(py - pr); yy <= py + pr; yy++)
    for (let xx = Math.floor(px - pr * 1.4); xx <= px + pr * 1.4; xx++) {
      const d = Math.hypot((xx - px) / 1.4, yy - py) + rnd() * 0.6;
      if (d <= pr && g.get(xx, yy) === T.grass) g.set(xx, yy, T.water);
    }
  const props: GeneratedMap['props'] = [];
  const free = (x: number, yy: number, gap = 1) => g.get(x, yy) === T.grass && !props.some((p) => Math.abs(p.x - x) <= gap && Math.abs(p.y - yy) <= gap);
  // woods in clumps, thinner near the path
  const clumps = Math.round(((g.w * g.h) / 120) * (0.5 + o.density));
  for (let c = 0; c < clumps; c++) {
    const cx = Math.floor(rnd() * g.w);
    const cy = Math.floor(rnd() * g.h);
    for (let k = 0; k < 6; k++) {
      const x = Math.round(cx + (rnd() - 0.5) * 6);
      const yy = Math.round(cy + (rnd() - 0.5) * 6);
      if (x < 0 || yy < 0 || x > g.w - 2 || yy > g.h - 2 || !free(x, yy) || !free(x + 1, yy + 1)) continue;
      props.push({ kind: rnd() < 0.8 ? 'tree' : 'bush', x, y: yy });
    }
  }
  for (let k = 0; k < Math.round(clumps * 1.2); k++) {
    const x = Math.floor(rnd() * g.w);
    const yy = Math.floor(rnd() * g.h);
    if (free(x, yy)) props.push({ kind: rnd() < 0.6 ? 'rock' : 'bush', x, y: yy });
  }
  // a camp by the path
  let start = { x: Math.floor(g.w / 2), y };
  for (let x = 2; x < g.w - 2; x++) {
    const sx = Math.floor(g.w / 2) + (x % 2 ? x / 2 : -x / 2);
    const col = Array.from({ length: g.h }, (_, yy) => yy).find((yy) => g.get(Math.floor(sx), yy) === T.path);
    if (col !== undefined && free(Math.floor(sx), col - 2, 0)) {
      start = { x: Math.floor(sx), y: col };
      if (o.lights) props.push({ kind: 'campfire', x: Math.floor(sx), y: col - 2 });
      break;
    }
  }
  return { kind: 'wilderness', width: o.width, height: o.height, seed: o.seed, cells: g.cells, rooms: [], walls: [], props, start };
}

export function generateMap(options: MapGenOptions): GeneratedMap {
  const o: Required<MapGenOptions> = {
    density: 0.5,
    doors: true,
    lights: true,
    furniture: true,
    ...options,
    width: Math.max(12, Math.min(80, Math.round(options.width))),
    height: Math.max(10, Math.min(80, Math.round(options.height))),
  };
  const rnd = seededRng(o.seed);
  if (o.kind === 'cave') return cave(o, rnd);
  if (o.kind === 'wilderness') return wilderness(o, rnd);
  return dungeon(o, rnd);
}

/**
 * The generated map as a painted map (terrain.ts), so the GM can keep editing
 * it at the table. Its walls then come from the terrain; only the doors are
 * placed walls.
 */
export function mapToTerrain(m: GeneratedMap): string {
  const code = (t: number): string => {
    if (m.kind === 'dungeon') return t === T.void ? 'r' : t === T.water ? 'q' : 's';
    if (m.kind === 'cave') return t === T.void ? 'r' : t === T.water ? 'q' : 'e';
    return t === T.water ? 'q' : t === T.path ? 'd' : 'g';
  };
  return m.cells.map(code).join('');
}

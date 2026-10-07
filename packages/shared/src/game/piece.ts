import type { GameAction } from './actions';
import type { GameState, Light } from './state';
import { EMPTY_TERRAIN } from './terrain';

/**
 * A piece of map, to copy from one place and put down in another (or a
 * ready-made room): its ground, the walls and doors placed by hand, the
 * scenery and the labels, all relative to its top-left corner.
 * Empty ground ('.') leaves what is already there.
 */
export interface MapPiece {
  name?: string;
  w: number;
  h: number;
  terrain: string;
  walls: { x1: number; y1: number; x2: number; y2: number; kind: 'wall' | 'door' | 'window'; open?: boolean; locked?: boolean }[];
  props: { kind: string; x: number; y: number; w: number; h: number; rotation?: number; light?: Light | null; blocksVision?: boolean; hidden?: boolean; image?: string | null; label?: string }[];
  labels: { x: number; y: number; text: string; color: string; width: number }[];
}

const inside = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 - 1e-6 && y >= y0 - 1e-6 && x <= x1 + 1e-6 && y <= y1 + 1e-6;

/** The cells (x0, y0)–(x1, y1), corners included, of a scene as a piece. */
export function copyPiece(state: GameState, sceneId: string, x0: number, y0: number, x1: number, y1: number): MapPiece | null {
  const scene = state.scenes[sceneId];
  if (!scene) return null;
  const ax = Math.max(0, Math.min(x0, x1));
  const ay = Math.max(0, Math.min(y0, y1));
  const bx = Math.min(scene.widthCells - 1, Math.max(x0, x1));
  const by = Math.min(scene.heightCells - 1, Math.max(y0, y1));
  if (bx < ax || by < ay) return null;
  const w = bx - ax + 1;
  const h = by - ay + 1;
  let terrain = '';
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) terrain += scene.terrain?.[y * scene.widthCells + x] ?? EMPTY_TERRAIN;
  // the box in grid lines: walls on its border belong to it
  const [gx0, gy0, gx1, gy1] = [ax, ay, bx + 1, by + 1];
  return {
    w,
    h,
    terrain,
    walls: Object.values(state.walls ?? {})
      .filter((wl) => wl.sceneId === sceneId && !wl.auto && inside(wl.x1, wl.y1, gx0, gy0, gx1, gy1) && inside(wl.x2, wl.y2, gx0, gy0, gx1, gy1))
      .map((wl) => ({ x1: wl.x1 - ax, y1: wl.y1 - ay, x2: wl.x2 - ax, y2: wl.y2 - ay, kind: wl.kind, ...(wl.open ? { open: true } : {}), ...(wl.locked ? { locked: true } : {}) })),
    props: Object.values(state.props ?? {})
      .filter((p) => p.sceneId === sceneId && inside(p.x + p.w / 2, p.y + p.h / 2, gx0, gy0, gx1, gy1))
      .map((p) => ({ kind: p.kind, x: p.x - ax, y: p.y - ay, w: p.w, h: p.h, rotation: p.rotation, light: p.light, blocksVision: p.blocksVision, hidden: p.hidden, image: p.image, label: p.label })),
    labels: Object.values(state.drawings ?? {})
      .filter((d) => d.sceneId === sceneId && !!d.text && inside(d.points[0]!, d.points[1]!, gx0, gy0, gx1, gy1))
      .map((d) => ({ x: d.points[0]! - ax, y: d.points[1]! - ay, text: d.text!, color: d.color, width: d.width })),
  };
}

/** The piece turned a quarter to the right. */
export function rotatePiece(p: MapPiece): MapPiece {
  const { w, h } = p;
  // cell (x, y) goes to (h - 1 - y, x); points (x, y) on the grid lines to (h - y, x)
  const cells = new Array<string>(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells[x * h + (h - 1 - y)] = p.terrain[y * w + x] ?? EMPTY_TERRAIN;
  const pt = (x: number, y: number) => ({ x: h - y, y: x });
  return {
    ...p,
    w: h,
    h: w,
    terrain: cells.join(''),
    walls: p.walls.map((wl) => {
      const a = pt(wl.x1, wl.y1);
      const b = pt(wl.x2, wl.y2);
      return { ...wl, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
    props: p.props.map((pr) => {
      // the centre turns; the box keeps its size and the drawing turns a quarter
      const c = pt(pr.x + pr.w / 2, pr.y + pr.h / 2);
      return { ...pr, x: c.x - pr.w / 2, y: c.y - pr.h / 2, rotation: ((pr.rotation ?? 0) + 90) % 360 };
    }),
    labels: p.labels.map((l) => ({ ...l, ...pt(l.x, l.y) })),
  };
}

/** What putting a piece down at cell (x, y) of a scene does, as one batch (one undo). */
export function pasteActions(state: GameState, sceneId: string, piece: MapPiece, x: number, y: number): GameAction[] {
  const scene = state.scenes[sceneId];
  if (!scene) return [];
  const W = scene.widthCells;
  const H = scene.heightCells;
  const actions: GameAction[] = [];
  if (/[^.]/.test(piece.terrain)) {
    const ground = (scene.terrain ?? EMPTY_TERRAIN.repeat(W * H)).split('');
    for (let py = 0; py < piece.h; py++)
      for (let px = 0; px < piece.w; px++) {
        const code = piece.terrain[py * piece.w + px];
        const tx = x + px;
        const ty = y + py;
        if (!code || code === EMPTY_TERRAIN || tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        ground[ty * W + tx] = code;
      }
    actions.push({ type: 'terrain.set', sceneId, terrain: ground.join('') });
  }
  if (piece.walls.length) actions.push({ type: 'wall.create', sceneId, walls: piece.walls.map((wl) => ({ ...wl, x1: wl.x1 + x, y1: wl.y1 + y, x2: wl.x2 + x, y2: wl.y2 + y })) });
  for (const p of piece.props) actions.push({ type: 'prop.create', sceneId, prop: { ...p, x: p.x + x, y: p.y + y, image: p.image ?? null } });
  for (const l of piece.labels) actions.push({ type: 'drawing.create', sceneId, points: [l.x + x, l.y + y], color: l.color, width: l.width, text: l.text });
  return actions;
}

/** A piece from rows of ground codes (the ready-made rooms are written this way). */
export function pieceFromRows(name: string, rows: string[], rest: Partial<Pick<MapPiece, 'walls' | 'props' | 'labels'>> = {}): MapPiece {
  const w = Math.max(...rows.map((r) => r.length));
  return { name, w, h: rows.length, terrain: rows.map((r) => r.padEnd(w, EMPTY_TERRAIN)).join(''), walls: rest.walls ?? [], props: rest.props ?? [], labels: rest.labels ?? [] };
}

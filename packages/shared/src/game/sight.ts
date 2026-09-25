import type { GameState, Light, Prop, Token } from './state';
import { lineOfSight, type Pt, type Segment } from './vision';

/** Segments that block sight on a scene: walls, closed doors, solid props. */
export function blockingSegments(state: GameState, sceneId: string): Segment[] {
  const out: Segment[] = [];
  for (const w of Object.values(state.walls ?? {})) {
    if (w.sceneId !== sceneId || w.kind === 'window' || (w.kind === 'door' && w.open)) continue;
    out.push({ a: { x: w.x1, y: w.y1 }, b: { x: w.x2, y: w.y2 } });
  }
  for (const p of Object.values(state.props ?? {})) {
    if (p.sceneId !== sceneId || !p.blocksVision) continue;
    const c = propCorners(p);
    for (let i = 0; i < 4; i++) out.push({ a: c[i]!, b: c[(i + 1) % 4]! });
  }
  return out;
}

/** Corners of a (rotated) prop, in cells. */
export function propCorners(p: Pick<Prop, 'x' | 'y' | 'w' | 'h' | 'rotation'>): Pt[] {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const r = ((p.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    [-p.w / 2, -p.h / 2],
    [p.w / 2, -p.h / 2],
    [p.w / 2, p.h / 2],
    [-p.w / 2, p.h / 2],
  ].map(([dx, dy]) => ({ x: cx + dx! * cos - dy! * sin, y: cy + dx! * sin + dy! * cos }));
}

export interface LightSource extends Light {
  x: number;
  y: number;
}

export function lightSources(state: GameState, sceneId: string): LightSource[] {
  const out: LightSource[] = [];
  for (const t of Object.values(state.tokens)) {
    if (t.sceneId === sceneId && t.light && t.light.dim > 0) out.push({ ...t.light, x: t.x + t.size / 2, y: t.y + t.size / 2 });
  }
  for (const p of Object.values(state.props ?? {})) {
    if (p.sceneId === sceneId && p.light && p.light.dim > 0) out.push({ ...p.light, x: p.x + p.w / 2, y: p.y + p.h / 2 });
  }
  return out;
}

/** Points of a token checked for visibility: centre and a bit inside each corner. */
export function tokenPoints(t: Pick<Token, 'x' | 'y' | 'size'>): Pt[] {
  const c = { x: t.x + t.size / 2, y: t.y + t.size / 2 };
  const i = 0.2;
  return [c, { x: t.x + i, y: t.y + i }, { x: t.x + t.size - i, y: t.y + i }, { x: t.x + i, y: t.y + t.size - i }, { x: t.x + t.size - i, y: t.y + t.size - i }];
}

export interface Viewer {
  x: number;
  y: number;
  darkvision: number;
}

/** What a user sees on the active scene (dynamic vision): computed once per state sync. */
export function sightFor(state: GameState, userId: string) {
  const scene = state.scenes[state.activeSceneId];
  const segments = scene?.vision ? blockingSegments(state, scene.id) : [];
  const viewers: Viewer[] = Object.values(state.tokens)
    .filter((t) => t.sceneId === state.activeSceneId && t.ownerIds.includes(userId))
    .map((t) => ({ x: t.x + t.size / 2, y: t.y + t.size / 2, darkvision: t.darkvision ?? 0 }));
  const lights = scene?.vision ? lightSources(state, scene.id) : [];
  const ambient = scene?.ambient ?? 'bright';
  const lit = (p: Pt) => ambient !== 'dark' || lights.some((l) => Math.hypot(l.x - p.x, l.y - p.y) <= l.dim && lineOfSight(l, p, segments));
  const seenBy = (v: Viewer, p: Pt) => lineOfSight(v, p, segments) && (Math.hypot(v.x - p.x, v.y - p.y) <= v.darkvision || lit(p));
  return {
    viewers,
    segments,
    lights,
    ambient,
    /** some point is seen by one of the user's tokens */
    canSee: (points: Pt[]) => points.some((p) => viewers.some((v) => seenBy(v, p))),
  };
}

/**
 * Line of sight on the grid. Everything here is in cells: walls run between
 * grid points, tokens and lights sit at cell centres.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Segment {
  a: Pt;
  b: Pt;
}

const EPS = 1e-9;

/** Where the ray from `o` along angle `ang` first meets a segment (distance), or Infinity. */
function rayHit(o: Pt, dx: number, dy: number, s: Segment): number {
  const ex = s.b.x - s.a.x;
  const ey = s.b.y - s.a.y;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < EPS) return Infinity;
  const t = ((s.a.x - o.x) * ey - (s.a.y - o.y) * ex) / den;
  const u = ((s.a.x - o.x) * dy - (s.a.y - o.y) * dx) / den;
  return t > EPS && u >= -EPS && u <= 1 + EPS ? t : Infinity;
}

/**
 * The area visible from `origin`: a polygon (points in angle order) bounded by
 * the blocking segments and the map edges. Classic angular sweep: one ray at
 * each segment end, plus two slightly to its sides to see past corners.
 */
export function visibilityPolygon(origin: Pt, segments: Segment[], bounds: { w: number; h: number }): Pt[] {
  const edges: Segment[] = [
    { a: { x: 0, y: 0 }, b: { x: bounds.w, y: 0 } },
    { a: { x: bounds.w, y: 0 }, b: { x: bounds.w, y: bounds.h } },
    { a: { x: bounds.w, y: bounds.h }, b: { x: 0, y: bounds.h } },
    { a: { x: 0, y: bounds.h }, b: { x: 0, y: 0 } },
  ];
  const all = [...segments, ...edges];
  const angles: number[] = [];
  for (const s of all) {
    for (const p of [s.a, s.b]) {
      const a = Math.atan2(p.y - origin.y, p.x - origin.x);
      angles.push(a - 1e-5, a, a + 1e-5);
    }
  }
  angles.sort((a, b) => a - b);
  const out: Pt[] = [];
  let last = NaN;
  for (const ang of angles) {
    if (Math.abs(ang - last) < 1e-12) continue;
    last = ang;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let best = Infinity;
    for (const s of all) {
      const t = rayHit(origin, dx, dy, s);
      if (t < best) best = t;
    }
    if (best < Infinity) out.push({ x: origin.x + dx * best, y: origin.y + dy * best });
  }
  return out;
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** True when nothing blocks the straight line between two points. */
export function lineOfSight(a: Pt, b: Pt, segments: Segment[]): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return true;
  for (const s of segments) {
    const t = rayHit(a, dx / len, dy / len, s);
    if (t < len - 1e-6) return false;
  }
  return true;
}

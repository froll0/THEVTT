import { visibilityPolygon, type Ambient, type LightSource, type Pt, type Segment, type Viewer } from '@thevtt/shared';

/**
 * Darkness drawn over the board: black where nothing is seen, dimmed in
 * shadow, clear where lit. Built on an offscreen canvas by cutting holes
 * (destination-out) through each viewer's line of sight, then laid on top.
 */

interface LightingInput {
  cell: number;
  /** areas seen before (1 px per cell), shown dim */
  explored?: HTMLCanvasElement | null;
  bounds: { w: number; h: number };
  segments: Segment[];
  viewers: Viewer[];
  lights: LightSource[];
  ambient: Ambient;
}

/** how dark the shadow stays, per ambient light (1 = black) */
const AMBIENT_DARKNESS: Record<Ambient, number> = { bright: 0, dim: 0.45, dark: 1 };
const DARKVISION_LEFT = 0.35;
const DIM_LEFT = 0.4;

/** Visibility polygons are expensive: cache them per wall layout and position. */
const cache = new Map<string, Pt[]>();
let cacheWalls = '';

function polygon(origin: Pt, segments: Segment[], bounds: { w: number; h: number }, wallsKey: string): Pt[] {
  if (wallsKey !== cacheWalls) {
    cache.clear();
    cacheWalls = wallsKey;
  }
  const key = `${origin.x.toFixed(2)},${origin.y.toFixed(2)}`;
  let poly = cache.get(key);
  if (!poly) {
    poly = visibilityPolygon(origin, segments, bounds);
    if (cache.size > 400) cache.clear();
    cache.set(key, poly);
  }
  return poly;
}

export const wallsKey = (segments: Segment[], bounds: { w: number; h: number }) =>
  `${bounds.w}x${bounds.h}:` + segments.map((s) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y}`).join(';');

function path(c: CanvasRenderingContext2D, poly: Pt[], cell: number) {
  c.beginPath();
  poly.forEach((p, i) => (i ? c.lineTo(p.x * cell, p.y * cell) : c.moveTo(p.x * cell, p.y * cell)));
  c.closePath();
}

/** Cuts light into the darkness: fully clear up to `bright`, fading to shadow at `dim`. */
function cutLight(c: CanvasRenderingContext2D, l: LightSource, cell: number, baseLeft: number) {
  const x = l.x * cell;
  const y = l.y * cell;
  const outer = Math.max(l.dim, l.bright, 0.01) * cell;
  const inner = Math.min(l.bright * cell, outer);
  const g = c.createRadialGradient(x, y, 0, x, y, outer);
  // alpha here is how much darkness is removed
  const dimCut = 1 - DIM_LEFT / Math.max(baseLeft, DIM_LEFT);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(Math.max(0, inner / outer - 0.02), 'rgba(0,0,0,1)');
  g.addColorStop(Math.min(1, inner / outer + 0.02), `rgba(0,0,0,${dimCut})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, outer, 0, Math.PI * 2);
  c.fill();
}

let overlay: HTMLCanvasElement | null = null;

/**
 * Draws the lighting over the main canvas. `transform` is the world→screen
 * transform of the board (already including devicePixelRatio). `strength`
 * lets the GM preview it without losing sight of the map.
 */
export function drawLighting(main: CanvasRenderingContext2D, input: LightingInput, transform: DOMMatrix, strength: number) {
  const { width, height } = main.canvas;
  overlay ??= document.createElement('canvas');
  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width;
    overlay.height = height;
  }
  const c = overlay.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, width, height);
  c.fillStyle = 'rgb(6, 7, 10)';
  c.fillRect(0, 0, width, height);
  c.setTransform(transform);
  c.globalCompositeOperation = 'destination-out';

  const { cell, bounds, segments, viewers, lights, ambient, explored } = input;
  if (explored) {
    // remembered places: the map shows through, dark
    c.save();
    c.globalAlpha = 0.28;
    // crisp cells: smoothing would bleed past the walls
    c.imageSmoothingEnabled = false;
    c.drawImage(explored, 0, 0, bounds.w * cell, bounds.h * cell);
    c.restore();
  }
  const key = wallsKey(segments, bounds);
  const base = AMBIENT_DARKNESS[ambient];
  const litPolys = lights.map((l) => ({ l, poly: polygon(l, segments, bounds, key) }));

  for (const v of viewers) {
    const poly = polygon(v, segments, bounds, key);
    c.save();
    path(c, poly, cell);
    c.clip();
    // ambient light inside the line of sight
    if (base < 1) {
      c.fillStyle = `rgba(0,0,0,${1 - base})`;
      c.fillRect(0, 0, bounds.w * cell, bounds.h * cell);
    }
    // darkvision: see in the dark as in dim light, without colours
    if (v.darkvision > 0 && base > DARKVISION_LEFT) {
      const g = c.createRadialGradient(v.x * cell, v.y * cell, 0, v.x * cell, v.y * cell, v.darkvision * cell);
      const cut = 1 - DARKVISION_LEFT / base;
      g.addColorStop(0, `rgba(0,0,0,${cut})`);
      g.addColorStop(0.92, `rgba(0,0,0,${cut})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(v.x * cell, v.y * cell, v.darkvision * cell, 0, Math.PI * 2);
      c.fill();
    }
    // lights, each within its own line of sight too
    if (base > 0) {
      for (const { l, poly: lp } of litPolys) {
        c.save();
        path(c, lp, cell);
        c.clip();
        cutLight(c, l, cell, base);
        c.restore();
      }
    }
    c.restore();
  }

  main.save();
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.globalAlpha = strength;
  main.drawImage(overlay, 0, 0);
  main.restore();

  // warm glow of coloured lights, where they reach and only where someone sees
  if (lights.some((l) => l.color) && strength > 0 && viewers.length) {
    main.save();
    main.beginPath();
    for (const v of viewers) {
      const poly = polygon(v, segments, bounds, key);
      poly.forEach((p, i) => (i ? main.lineTo(p.x * cell, p.y * cell) : main.moveTo(p.x * cell, p.y * cell)));
      main.closePath();
    }
    main.clip();
    main.globalCompositeOperation = 'soft-light';
    main.globalAlpha = 0.35 * Math.min(1, strength + 0.3);
    for (const { l, poly } of litPolys) {
      if (!l.color) continue;
      main.save();
      path(main, poly, cell);
      main.clip();
      const r = Math.max(l.dim, 0.01) * cell;
      const g = main.createRadialGradient(l.x * cell, l.y * cell, 0, l.x * cell, l.y * cell, r);
      g.addColorStop(0, l.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      main.fillStyle = g;
      main.beginPath();
      main.arc(l.x * cell, l.y * cell, r, 0, Math.PI * 2);
      main.fill();
      main.restore();
    }
    main.restore();
  }
}

import {
  biomeAt,
  BIOMES,
  contours,
  elevation,
  hexCorners,
  hexesIn,
  moistureField,
  worldBiomes,
  worldHeights,
  type BiomeKey,
  type LabelFont,
  type WorldLabel,
  type WorldLayer,
  type WorldMap,
  type WorldPath,
  type WorldStyle,
  type WorldSymbol,
} from '@thevtt/shared';

/**
 * Drawing a world map on a canvas, in world pixels (the caller sets the
 * transform). The ground (a picture as big as the height field) and the coast
 * lines are worked out once per change of the ground and kept.
 */

export interface Palette {
  sea: string;
  deep: string;
  shallow: string;
  ink: string;
  coast: string;
  river: string;
  road: string;
  paper: string;
  halo: string;
  label: string;
}

export const PALETTES: Record<WorldStyle, Palette> = {
  atlas: { sea: '#5d8fbf', deep: '#2c5786', shallow: '#8dbbe0', ink: '#3b3328', coast: '#2b3a44', river: '#3f7fc0', road: '#7a4b2a', paper: '#f4efe1', halo: 'rgba(255,255,255,0.85)', label: '#2b2620' },
  parchment: { sea: '#d6c7a0', deep: '#c9b98f', shallow: '#e0d3ae', ink: '#4a3520', coast: '#4a3520', river: '#5b7286', road: '#6b4a2c', paper: '#ead9b0', halo: 'rgba(240,226,190,0.9)', label: '#3d2b18' },
  ink: { sea: '#ffffff', deep: '#ffffff', shallow: '#ffffff', ink: '#1d1d1f', coast: '#1d1d1f', river: '#1d1d1f', road: '#1d1d1f', paper: '#ffffff', halo: 'rgba(255,255,255,0.9)', label: '#1d1d1f' },
};

export const FONTS: Record<LabelFont, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  script: '"Segoe Script", "Brush Script MT", "Apple Chancery", cursive',
  sans: 'Inter, "Segoe UI", system-ui, sans-serif',
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const BIOME_RGB = Object.fromEntries((['atlas', 'parchment', 'ink'] as const).map((st) => [st, Object.fromEntries(BIOMES.map((b) => [b.key, hexToRgb(st === 'ink' ? '#fbfaf6' : b[st])]))])) as Record<WorldStyle, Record<BiomeKey, [number, number, number]>>;

export interface GroundCache {
  key: string;
  /** cols × rows picture of the ground (sea included) */
  picture: HTMLCanvasElement;
  /** the coasts, in world pixels */
  coast: Path2D;
  loops: [number, number][][];
  /** moisture of every cell: it changes only with the seed and the size */
  moisture: Float32Array;
  moistureKey: string;
}

/** The ground's picture and coasts, redone only when the ground changes. */
export function groundFor(w: WorldMap, prev: GroundCache | null, override?: { heights: Uint8Array; biomes: Uint8Array; version: number }): GroundCache {
  const key = `${w.cols}x${w.rows}|${w.seaLevel}|${w.style}|${w.seed}|${override ? `v${override.version}` : `${w.heights.length}:${w.heights.slice(0, 64)}:${w.heights.slice(-64)}:${hashString(w.heights)}:${hashString(w.biomes)}`}|${w.hidden?.relief ? 0 : 1}`;
  if (prev && prev.key === key) return prev;
  const heights = override?.heights ?? worldHeights(w);
  const biomes = override?.biomes ?? worldBiomes(w);
  const picture = prev?.picture.width === w.cols && prev.picture.height === w.rows ? prev.picture : document.createElement('canvas');
  picture.width = w.cols;
  picture.height = w.rows;
  const ctx = picture.getContext('2d')!;
  const img = ctx.createImageData(w.cols, w.rows);
  const pal = PALETTES[w.style];
  const deep = hexToRgb(pal.deep);
  const shallow = hexToRgb(pal.shallow);
  const relief = !w.hidden?.relief;
  const rgb = BIOME_RGB[w.style];
  const moistureKey = `${w.seed}|${w.cols}x${w.rows}`;
  const moisture = prev?.moistureKey === moistureKey ? prev.moisture : moistureField(w);
  for (let y = 0; y < w.rows; y++) {
    for (let x = 0; x < w.cols; x++) {
      const i = y * w.cols + x;
      const h = heights[i]!;
      const e = elevation(h, w.seaLevel);
      let r: number;
      let g: number;
      let b: number;
      if (e < 0) {
        const t = Math.min(1, -e * 1.6);
        r = shallow[0] + (deep[0] - shallow[0]) * t;
        g = shallow[1] + (deep[1] - shallow[1]) * t;
        b = shallow[2] + (deep[2] - shallow[2]) * t;
      } else {
        const c = rgb[biomeAt(w, heights, biomes, x, y, moisture) ?? 'grass'];
        [r, g, b] = c;
        if (relief) {
          // light from the north-west
          const hl = heights[i - (x > 0 ? 1 : 0)]!;
          const hr = heights[i + (x < w.cols - 1 ? 1 : 0)]!;
          const hu = heights[i - (y > 0 ? w.cols : 0)]!;
          const hd = heights[i + (y < w.rows - 1 ? w.cols : 0)]!;
          const lim = w.style === 'atlas' ? 0.35 : 0.18;
          const shade = Math.max(-lim, Math.min(lim, (hl - hr + (hu - hd)) * (w.style === 'atlas' ? 0.03 : 0.014)));
          const k = 1 + shade - (w.style === 'atlas' ? e * 0.12 : 0);
          r *= k;
          g *= k;
          b *= k;
        }
      }
      const o = i * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const loops = contours(heights, w.cols, w.rows, w.seaLevel * 255).map((l) => l.map(([x, y]) => [x * w.res, y * w.res] as [number, number]));
  const coast = new Path2D();
  for (const l of loops) addSmooth(coast, l, true);
  return { key, picture, coast, loops, moisture, moistureKey };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 7) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A line through the points, rounded at the corners. */
export function addSmooth(p: Path2D | CanvasRenderingContext2D, pts: [number, number][], closed: boolean) {
  if (pts.length < 2) return;
  if (pts.length < 3) {
    p.moveTo(pts[0]![0], pts[0]![1]);
    p.lineTo(pts[1]![0], pts[1]![1]);
    return;
  }
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  if (closed) {
    const m0 = mid(pts[pts.length - 1]!, pts[0]!);
    p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < pts.length; i++) {
      const m = mid(pts[i]!, pts[(i + 1) % pts.length]!);
      p.quadraticCurveTo(pts[i]![0], pts[i]![1], m[0], m[1]);
    }
    p.closePath();
  } else {
    p.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const m = mid(pts[i]!, pts[i + 1]!);
      p.quadraticCurveTo(pts[i]![0], pts[i]![1], m[0], m[1]);
    }
    p.lineTo(pts[pts.length - 1]![0], pts[pts.length - 1]![1]);
  }
}

export interface DrawOptions {
  /** world pixels to canvas pixels (for line widths that stay readable) */
  zoom: number;
  /** leave out the grid (the table draws its own) */
  noGrid?: boolean;
  /** what's selected, outlined */
  selected?: string | null;
  /** a line or region being drawn */
  drawing?: { kind: 'river' | 'route' | 'region'; points: [number, number][]; cursor?: [number, number] | null } | null;
}

const on = (w: WorldMap, layer: WorldLayer) => !w.hidden?.[layer];

/** The whole map, in world pixels. */
export function drawWorld(ctx: CanvasRenderingContext2D, w: WorldMap, ground: GroundCache, opts: DrawOptions) {
  const pal = PALETTES[w.style];
  const z = Math.max(0.05, opts.zoom);
  ctx.save();
  // the sea
  ctx.fillStyle = pal.sea;
  ctx.fillRect(0, 0, w.width, w.height);
  if (on(w, 'terrain')) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (w.style === 'atlas') ctx.drawImage(ground.picture, 0, 0, w.width, w.height);
    else {
      // ripples along the coast
      ctx.strokeStyle = pal.coast;
      for (let k = 4; k >= 1; k--) {
        ctx.globalAlpha = w.style === 'ink' ? 0.5 / k : 0.18;
        ctx.lineWidth = k * 7;
        ctx.stroke(ground.coast);
        ctx.globalAlpha = 1;
        ctx.lineWidth = k * 7 - 2.2;
        ctx.strokeStyle = pal.sea;
        ctx.stroke(ground.coast);
        ctx.strokeStyle = pal.coast;
      }
    }
    // the land, cut along the coast
    ctx.save();
    ctx.clip(ground.coast, 'evenodd');
    ctx.drawImage(ground.picture, 0, 0, w.width, w.height);
    if (w.style !== 'atlas') paperGrain(ctx, w);
    ctx.restore();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.coast;
    ctx.lineWidth = Math.max(1.1, 1.4 / Math.sqrt(z));
    ctx.stroke(ground.coast);
  }
  if (on(w, 'regions')) for (const r of w.regions) drawRegion(ctx, r, z, opts.selected === r.id);
  if (on(w, 'rivers')) for (const r of w.rivers) drawPath(ctx, r, 'river', pal, z, opts.selected === r.id);
  if (on(w, 'routes')) for (const r of w.routes) drawPath(ctx, r, 'route', pal, z, opts.selected === r.id);
  if (on(w, 'grid') && !opts.noGrid && w.grid.kind !== 'none') drawGrid(ctx, w);
  if (on(w, 'symbols')) {
    // the ones further down stand in front
    const syms = [...w.symbols].sort((a, b) => a.y - b.y);
    for (const s of syms) drawSymbol(ctx, s, pal, w.style, opts.selected === s.id);
  }
  if (on(w, 'labels')) for (const l of w.labels) drawLabel(ctx, l, pal, opts.selected === l.id);
  if (on(w, 'decor')) {
    if (w.compass) drawCompass(ctx, w.compass.x, w.compass.y, w.compass.size, pal, opts.selected === 'compass');
    if (w.scaleBar) drawScaleBar(ctx, w.scaleBar, pal, opts.selected === 'scale');
    if (w.title) drawTitle(ctx, w.title, pal, w.style, opts.selected === 'title');
  }
  if (on(w, 'pins')) for (const p of w.pins) drawPin(ctx, p.x, p.y, p.color, z, opts.selected === p.id);
  // the points of the selected line, to drag
  const sel = opts.selected ? [...w.rivers, ...w.routes, ...w.regions].find((x) => x.id === opts.selected) : undefined;
  if (sel && sel.points.length <= 600) {
    ctx.save();
    ctx.lineWidth = 1.5 / z;
    ctx.strokeStyle = '#ff7a1a';
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of sel.points) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  if (opts.drawing) {
    const d = opts.drawing;
    const pts = d.cursor ? [...d.points, d.cursor] : d.points;
    ctx.setLineDash([6 / z, 4 / z]);
    ctx.strokeStyle = d.kind === 'river' ? pal.river : d.kind === 'route' ? pal.road : '#e05d3c';
    ctx.lineWidth = 2 / z;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (d.kind === 'region' && pts.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of d.points) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A faint texture on paper styles. */
function paperGrain(ctx: CanvasRenderingContext2D, w: WorldMap) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = PALETTES[w.style].ink;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let y = 0; y < w.height; y += 9) {
    ctx.moveTo(0, y);
    ctx.lineTo(w.width, y + 3);
  }
  ctx.stroke();
  ctx.restore();
}

function outline(ctx: CanvasRenderingContext2D, z: number) {
  ctx.save();
  ctx.setLineDash([5 / z, 3 / z]);
  ctx.strokeStyle = '#ff7a1a';
  ctx.lineWidth = 2 / z;
  ctx.stroke();
  ctx.restore();
}

function drawRegion(ctx: CanvasRenderingContext2D, r: WorldMap['regions'][number], z: number, selected: boolean) {
  if (r.points.length < 3) return;
  ctx.save();
  ctx.beginPath();
  addSmooth(ctx, r.points, true);
  ctx.globalAlpha = Math.max(0, Math.min(1, r.fill));
  ctx.fillStyle = r.color;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (r.border !== 'none') {
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(r.border === 'dashed' ? [10, 6] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (selected) outline(ctx, z);
  ctx.restore();
}

function drawPath(ctx: CanvasRenderingContext2D, p: WorldPath, kind: 'river' | 'route', pal: Palette, z: number, selected: boolean) {
  if (p.points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  addSmooth(ctx, p.points, false);
  if (kind === 'river') {
    ctx.strokeStyle = pal.river;
    // rivers widen towards the mouth: drawn in pieces getting wider
    const n = p.points.length;
    for (let i = 1; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(p.points[i - 1]![0], p.points[i - 1]![1]);
      ctx.lineTo(p.points[i]![0], p.points[i]![1]);
      ctx.lineWidth = p.width * (0.45 + (i / n) * 0.9);
      ctx.stroke();
    }
    ctx.beginPath();
    addSmooth(ctx, p.points, false);
  } else {
    const k = p.kind ?? 'road';
    ctx.strokeStyle = k === 'sea' ? pal.ink : pal.road;
    ctx.globalAlpha = k === 'sea' ? 0.55 : 0.9;
    ctx.lineWidth = p.width;
    ctx.setLineDash(k === 'trail' ? [p.width * 3, p.width * 2.5] : k === 'sea' ? [p.width * 0.5, p.width * 3] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (selected) outline(ctx, z);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: WorldMap) {
  const g = w.grid;
  ctx.save();
  ctx.globalAlpha = g.opacity;
  ctx.strokeStyle = g.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (g.kind === 'square') {
    for (let x = 0; x <= w.width; x += g.size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, w.height);
    }
    for (let y = 0; y <= w.height; y += g.size) {
      ctx.moveTo(0, y);
      ctx.lineTo(w.width, y);
    }
  } else {
    // the table's own hexes: one cell wide, pointy top
    for (const h of hexesIn(Math.ceil(w.width / g.size), Math.ceil(w.height / g.size))) {
      const c = hexCorners(h);
      ctx.moveTo(c[0]!.x * g.size, c[0]!.y * g.size);
      for (let i = 1; i < 6; i++) ctx.lineTo(c[i]!.x * g.size, c[i]!.y * g.size);
      ctx.closePath();
    }
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- symbols

/** A symbol at its place; `s.size` is its height. */
export function drawSymbol(ctx: CanvasRenderingContext2D, s: Pick<WorldSymbol, 'kind' | 'x' | 'y' | 'size' | 'flip' | 'name'>, pal: Palette, style: WorldStyle, selected = false) {
  const k = s.size;
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.flip) ctx.scale(-1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = Math.max(0.8, k / 18);
  const light = style === 'atlas' ? '#f3ecdc' : style === 'parchment' ? '#efe2bd' : '#ffffff';
  const shade = style === 'atlas' ? '#8f8270' : style === 'parchment' ? '#b9a173' : '#1d1d1f';
  const green = style === 'atlas' ? '#4f7f3f' : style === 'parchment' ? '#9c9a63' : '#ffffff';
  const darkGreen = style === 'atlas' ? '#2f5a2a' : style === 'parchment' ? '#6f6c3f' : '#1d1d1f';
  const red = style === 'ink' ? '#1d1d1f' : '#a8382b';
  const fill = (c: string) => {
    ctx.fillStyle = c;
    ctx.fill();
  };
  const path = (pts: [number, number][], close = true) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    if (close) ctx.closePath();
  };
  switch (s.kind) {
    case 'mountain':
    case 'peak':
    case 'volcano': {
      const top: [number, number] = s.kind === 'volcano' ? [0.12, -0.85] : [0, -1];
      path(s.kind === 'volcano' ? [[-0.75, 0], [-0.12, -0.85], [0.12, -0.85], [0.75, 0]] : [[-0.75, 0], top, [0.75, 0]]);
      fill(light);
      // the shaded side
      path([top, [0.75, 0], [0.05, 0], [0.18, -0.35], [-0.02, -0.55]]);
      fill(shade);
      path(s.kind === 'volcano' ? [[-0.75, 0], [-0.12, -0.85], [0.12, -0.85], [0.75, 0]] : [[-0.75, 0], top, [0.75, 0]], false);
      ctx.stroke();
      if (s.kind === 'peak') {
        path([[-0.24, -0.68], [0, -1], [0.24, -0.68], [0.1, -0.74], [0, -0.66], [-0.1, -0.74]]);
        fill('#ffffff');
        ctx.stroke();
      }
      if (s.kind === 'volcano') {
        ctx.beginPath();
        ctx.moveTo(0, -0.9 * k);
        ctx.bezierCurveTo(-0.25 * k, -1.15 * k, 0.25 * k, -1.25 * k, 0.05 * k, -1.5 * k);
        ctx.strokeStyle = red;
        ctx.stroke();
      }
      break;
    }
    case 'hill':
      ctx.beginPath();
      ctx.moveTo(-0.8 * k, 0);
      ctx.quadraticCurveTo(0, -1.1 * k, 0.8 * k, 0);
      fill(light);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.15 * k, -0.45 * k);
      ctx.quadraticCurveTo(0.4 * k, -0.3 * k, 0.5 * k, -0.08 * k);
      ctx.stroke();
      break;
    case 'pine':
      path([[0, -1], [0.38, -0.3], [0.15, -0.3], [0.45, 0.05], [-0.45, 0.05], [-0.15, -0.3], [-0.38, -0.3]]);
      fill(darkGreen);
      ctx.stroke();
      break;
    case 'tree':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -0.35 * k);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.62 * k, 0.36 * k, 0, Math.PI * 2);
      fill(green);
      ctx.stroke();
      break;
    case 'palm':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0.15 * k, -0.5 * k, 0.05 * k, -0.85 * k);
      ctx.stroke();
      for (const a of [-2.6, -1.9, -1.2, -0.5]) {
        ctx.beginPath();
        ctx.moveTo(0.05 * k, -0.85 * k);
        ctx.quadraticCurveTo(0.05 * k + Math.cos(a) * 0.3 * k, -0.85 * k + Math.sin(a) * 0.3 * k - 0.1 * k, 0.05 * k + Math.cos(a) * 0.5 * k, -0.85 * k + Math.sin(a) * 0.2 * k + 0.15 * k);
        ctx.strokeStyle = darkGreen;
        ctx.stroke();
      }
      break;
    case 'reeds':
      for (const dx of [-0.3, -0.1, 0.1, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(dx * k, 0);
        ctx.quadraticCurveTo((dx + 0.05) * k, -0.4 * k, (dx + 0.12) * k, -0.75 * k);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-0.5 * k, 0);
      ctx.lineTo(0.5 * k, 0);
      ctx.stroke();
      break;
    case 'dunes':
      for (const [dx, dy] of [[-0.35, 0], [0.3, -0.3]] as const) {
        ctx.beginPath();
        ctx.moveTo((dx - 0.4) * k, dy * k);
        ctx.quadraticCurveTo(dx * k, (dy - 0.45) * k, (dx + 0.4) * k, dy * k);
        ctx.stroke();
      }
      break;
    case 'capital':
    case 'city':
    case 'town':
    case 'village': {
      const r = { capital: 0.42, city: 0.36, town: 0.28, village: 0.18 }[s.kind] * k;
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      fill(s.kind === 'village' ? pal.ink : '#ffffff');
      ctx.stroke();
      if (s.kind !== 'village') {
        ctx.beginPath();
        ctx.arc(0, -r, r * (s.kind === 'town' ? 0.45 : 0.55), 0, Math.PI * 2);
        fill(s.kind === 'capital' ? red : pal.ink);
      }
      if (s.kind === 'capital') star(ctx, 0, -r * 2.6, r * 0.7, red, pal.ink);
      break;
    }
    case 'castle':
      path([[-0.45, 0], [-0.45, -0.6], [-0.3, -0.6], [-0.3, -0.75], [-0.15, -0.75], [-0.15, -0.6], [0.15, -0.6], [0.15, -0.75], [0.3, -0.75], [0.3, -0.6], [0.45, -0.6], [0.45, 0]]);
      fill(light);
      ctx.stroke();
      path([[-0.1, 0], [-0.1, -0.25], [0.1, -0.25], [0.1, 0]], false);
      ctx.stroke();
      break;
    case 'tower':
      path([[-0.18, 0], [-0.18, -0.8], [-0.26, -0.8], [0, -1.05], [0.26, -0.8], [0.18, -0.8], [0.18, 0]]);
      fill(light);
      ctx.stroke();
      break;
    case 'port':
      ctx.beginPath();
      ctx.moveTo(0, -0.9 * k);
      ctx.lineTo(0, -0.1 * k);
      ctx.moveTo(-0.3 * k, -0.65 * k);
      ctx.lineTo(0.3 * k, -0.65 * k);
      ctx.moveTo(-0.4 * k, -0.35 * k);
      ctx.quadraticCurveTo(0, 0.15 * k, 0.4 * k, -0.35 * k);
      ctx.lineWidth = Math.max(1, k / 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.95 * k, 0.08 * k, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'temple':
      path([[-0.5, -0.55], [0, -0.9], [0.5, -0.55]]);
      fill(light);
      ctx.stroke();
      for (const dx of [-0.35, -0.12, 0.12, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(dx * k, -0.55 * k);
        ctx.lineTo(dx * k, -0.05 * k);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-0.5 * k, 0);
      ctx.lineTo(0.5 * k, 0);
      ctx.stroke();
      break;
    case 'ruin':
      for (const [dx, hgt] of [[-0.35, 0.7], [-0.05, 0.45], [0.28, 0.6]] as const) {
        path([[dx - 0.08, 0], [dx - 0.08, -hgt], [dx + 0.02, -hgt + 0.08], [dx + 0.08, -hgt], [dx + 0.08, 0]]);
        fill(light);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-0.55 * k, 0);
      ctx.lineTo(0.55 * k, 0);
      ctx.stroke();
      break;
    case 'cave':
      ctx.beginPath();
      ctx.moveTo(-0.6 * k, 0);
      ctx.quadraticCurveTo(-0.5 * k, -0.9 * k, 0, -0.85 * k);
      ctx.quadraticCurveTo(0.5 * k, -0.9 * k, 0.6 * k, 0);
      ctx.closePath();
      fill(shade);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.25 * k, 0);
      ctx.quadraticCurveTo(0, -0.7 * k, 0.25 * k, 0);
      fill(pal.ink);
      break;
    case 'mine':
      ctx.lineWidth = Math.max(1, k / 9);
      ctx.beginPath();
      ctx.moveTo(-0.4 * k, -0.05 * k);
      ctx.lineTo(0.4 * k, -0.85 * k);
      ctx.moveTo(0.4 * k, -0.05 * k);
      ctx.lineTo(-0.4 * k, -0.85 * k);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.2 * k, -0.95 * k);
      ctx.quadraticCurveTo(0.55 * k, -0.85 * k, 0.55 * k, -0.6 * k);
      ctx.moveTo(-0.2 * k, -0.95 * k);
      ctx.quadraticCurveTo(-0.55 * k, -0.85 * k, -0.55 * k, -0.6 * k);
      ctx.stroke();
      break;
    case 'camp':
      path([[-0.5, 0], [0, -0.8], [0.5, 0]]);
      fill(light);
      ctx.stroke();
      path([[0, -0.8], [-0.1, 0], [0.1, 0]], false);
      ctx.stroke();
      break;
    case 'bridge':
      ctx.beginPath();
      ctx.moveTo(-0.6 * k, -0.2 * k);
      ctx.quadraticCurveTo(0, -0.75 * k, 0.6 * k, -0.2 * k);
      ctx.moveTo(-0.6 * k, 0);
      ctx.quadraticCurveTo(0, -0.55 * k, 0.6 * k, 0);
      ctx.stroke();
      break;
    case 'battle':
      ctx.lineWidth = Math.max(1, k / 10);
      ctx.strokeStyle = red;
      ctx.beginPath();
      ctx.moveTo(-0.4 * k, -0.05 * k);
      ctx.lineTo(0.4 * k, -0.85 * k);
      ctx.moveTo(0.4 * k, -0.05 * k);
      ctx.lineTo(-0.4 * k, -0.85 * k);
      ctx.moveTo(-0.3 * k, -0.6 * k);
      ctx.lineTo(-0.1 * k, -0.4 * k);
      ctx.moveTo(0.3 * k, -0.6 * k);
      ctx.lineTo(0.1 * k, -0.4 * k);
      ctx.stroke();
      break;
    case 'danger':
      ctx.beginPath();
      ctx.arc(0, -0.55 * k, 0.32 * k, 0, Math.PI * 2);
      fill(light);
      ctx.stroke();
      ctx.fillStyle = pal.ink;
      for (const dx of [-0.12, 0.12]) {
        ctx.beginPath();
        ctx.arc(dx * k, -0.58 * k, 0.07 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(-0.12 * k, -0.25 * k, 0.24 * k, 0.12 * k);
      break;
    case 'star':
      star(ctx, 0, -0.5 * k, 0.45 * k, style === 'ink' ? '#ffffff' : '#e8b93c', pal.ink);
      break;
    case 'ship':
      path([[-0.55, -0.25], [0.55, -0.25], [0.35, 0], [-0.35, 0]]);
      fill(shade);
      ctx.stroke();
      path([[0, -0.25], [0, -1], [0.45, -0.35]]);
      fill('#ffffff');
      ctx.stroke();
      break;
    case 'monster':
      ctx.lineWidth = Math.max(1.2, k / 9);
      ctx.strokeStyle = style === 'ink' ? pal.ink : '#2e6a5c';
      ctx.beginPath();
      ctx.moveTo(-0.7 * k, 0);
      ctx.bezierCurveTo(-0.5 * k, -0.6 * k, -0.25 * k, -0.6 * k, -0.15 * k, 0);
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0.1 * k, -0.6 * k, 0.35 * k, -0.6 * k, 0.45 * k, 0);
      ctx.moveTo(0.55 * k, -0.1 * k);
      ctx.bezierCurveTo(0.6 * k, -0.7 * k, 0.9 * k, -0.8 * k, 0.85 * k, -0.45 * k);
      ctx.stroke();
      break;
    case 'whirlpool':
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 5; t += 0.2) {
        const rr = (t / (Math.PI * 5)) * 0.5 * k;
        const x = Math.cos(t) * rr;
        const y = -0.5 * k + Math.sin(t) * rr * 0.6;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
  }
  ctx.restore();
  if (s.name) {
    ctx.save();
    ctx.font = `600 ${Math.max(9, k * 0.42)}px ${FONTS.serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = pal.halo;
    ctx.strokeText(s.name, s.x, s.y + 3);
    ctx.fillStyle = pal.label;
    ctx.fillText(s.name, s.x, s.y + 3);
    ctx.restore();
  }
  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x - k * 0.8, s.y - k * 1.1, k * 1.6, k * 1.25);
    outline(ctx, 1);
    ctx.restore();
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fillColor: string, ink: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
}

// ---------------------------------------------------------------- text and the rest

export function labelFont(l: Pick<WorldLabel, 'size' | 'font' | 'italic'>) {
  return `${l.italic ? 'italic ' : ''}${l.font === 'sans' ? 600 : 500} ${l.size}px ${FONTS[l.font]}`;
}

/** The label's letters, laid out (straight or on an arc), relative to its centre. */
export function layoutLabel(ctx: CanvasRenderingContext2D, l: WorldLabel): { ch: string; x: number; y: number; a: number }[] {
  ctx.font = labelFont(l);
  const text = l.caps ? l.text.toUpperCase() : l.text;
  const chars = [...text];
  const gap = l.spacing * l.size;
  const widths = chars.map((c) => ctx.measureText(c).width + gap);
  const total = widths.reduce((a, b) => a + b, 0) - gap;
  const out: { ch: string; x: number; y: number; a: number }[] = [];
  const bend = Math.max(-1, Math.min(1, l.curve)) * 1.4;
  let s = -total / 2;
  if (Math.abs(bend) < 0.02) {
    chars.forEach((ch, i) => {
      out.push({ ch, x: s + widths[i]! / 2 - gap / 2, y: 0, a: 0 });
      s += widths[i]!;
    });
    return out;
  }
  // on an arc: the radius that bends the whole text by `bend` radians
  const radius = total / Math.abs(bend);
  const sign = Math.sign(bend);
  chars.forEach((ch, i) => {
    const mid = s + widths[i]! / 2 - gap / 2;
    const t = mid / radius;
    out.push({ ch, x: Math.sin(t) * radius, y: sign * (radius - Math.cos(t) * radius), a: sign * t });
    s += widths[i]!;
  });
  return out;
}

export function drawLabel(ctx: CanvasRenderingContext2D, l: WorldLabel, pal: Palette, selected = false) {
  if (!l.text) return;
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate((l.rotation * Math.PI) / 180);
  const letters = layoutLabel(ctx, l);
  ctx.font = labelFont(l);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const pass of ['halo', 'ink'] as const) {
    for (const g of letters) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.a);
      if (pass === 'halo') {
        ctx.lineWidth = Math.max(2, l.size / 6);
        ctx.strokeStyle = pal.halo;
        ctx.strokeText(g.ch, 0, 0);
      } else {
        ctx.fillStyle = l.color;
        ctx.fillText(g.ch, 0, 0);
      }
      ctx.restore();
    }
  }
  if (selected) {
    const xs = letters.map((g) => g.x);
    const ys = letters.map((g) => g.y);
    ctx.beginPath();
    ctx.rect(Math.min(...xs) - l.size * 0.6, Math.min(...ys) - l.size * 0.7, Math.max(...xs) - Math.min(...xs) + l.size * 1.2, Math.max(...ys) - Math.min(...ys) + l.size * 1.4);
    outline(ctx, 1);
  }
  ctx.restore();
}

export function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, z: number, selected = false) {
  const k = 16 / Math.min(2, Math.max(0.5, z));
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-k * 0.6, -k * 0.55, -k * 0.55, -k * 1.15, 0, -k * 1.15);
  ctx.bezierCurveTo(k * 0.55, -k * 1.15, k * 0.6, -k * 0.55, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#1d1d1f';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -k * 0.75, k * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  if (selected) {
    ctx.beginPath();
    ctx.arc(0, -k * 0.6, k * 0.9, 0, Math.PI * 2);
    outline(ctx, 1);
  }
  ctx.restore();
}

function drawCompass(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pal: Palette, selected: boolean) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = i % 2 === 0;
    const len = long ? r : r * 0.6;
    const side = (long ? r * 0.16 : r * 0.1);
    const tip: [number, number] = [Math.cos(a) * len, Math.sin(a) * len];
    const l: [number, number] = [Math.cos(a - Math.PI / 2) * side, Math.sin(a - Math.PI / 2) * side];
    const rr: [number, number] = [Math.cos(a + Math.PI / 2) * side, Math.sin(a + Math.PI / 2) * side];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(...l);
    ctx.lineTo(...tip);
    ctx.closePath();
    ctx.fillStyle = pal.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(...rr);
    ctx.lineTo(...tip);
    ctx.closePath();
    ctx.fillStyle = pal.paper;
    ctx.fill();
    ctx.stroke();
  }
  ctx.font = `700 ${r * 0.34}px ${FONTS.serif}`;
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -r - 2);
  if (selected) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    outline(ctx, 1);
  }
  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D, s: NonNullable<WorldMap['scaleBar']>, pal: Palette, selected: boolean) {
  ctx.save();
  ctx.translate(s.x, s.y);
  const parts = 4;
  const h = 7;
  for (let i = 0; i < parts; i++) {
    ctx.fillStyle = i % 2 ? pal.paper : pal.ink;
    ctx.fillRect((s.px / parts) * i, 0, s.px / parts, h);
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, s.px, h);
  ctx.font = `600 12px ${FONTS.serif}`;
  ctx.fillStyle = pal.ink;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('0', -3, h + 3);
  ctx.textAlign = 'right';
  ctx.fillText(`${s.distance} ${s.unit}`, s.px + 3, h + 3);
  if (selected) {
    ctx.beginPath();
    ctx.rect(-8, -8, s.px + 16, h + 28);
    outline(ctx, 1);
  }
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, t: NonNullable<WorldMap['title']>, pal: Palette, style: WorldStyle, selected: boolean) {
  if (!t.text) return;
  ctx.save();
  ctx.font = `600 ${t.size}px ${FONTS.serif}`;
  const w = ctx.measureText(t.text).width + t.size * 1.6;
  const h = t.size * 1.8;
  ctx.translate(t.x, t.y);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.25);
  ctx.fillStyle = style === 'atlas' ? 'rgba(244,239,225,0.92)' : pal.paper;
  ctx.fill();
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, h * 0.2);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = pal.label;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.text, 0, 1);
  if (selected) {
    ctx.beginPath();
    ctx.rect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
    outline(ctx, 1);
  }
  ctx.restore();
}

/** The map as a picture, at `scale` × its world size. */
export function renderWorldImage(w: WorldMap, scale = 1, opts: { noGrid?: boolean } = {}): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(w.width * scale);
  c.height = Math.round(w.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  drawWorld(ctx, w, groundFor(w, null), { zoom: scale, noGrid: opts.noGrid });
  return c;
}

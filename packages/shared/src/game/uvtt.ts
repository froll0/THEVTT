import type { MapPackage } from './library';
import type { Ambient, Prop, Wall } from './state';

/**
 * Universal VTT files (.dd2vtt, .uvtt, .df2vtt), written by Dungeondraft,
 * Dungeon Alchemist and other map makers: the picture, its grid, walls,
 * doors and lights, all measured in grid squares.
 */
interface UvttPoint {
  x: number;
  y: number;
}

interface UvttFile {
  format?: number;
  resolution?: { map_origin?: UvttPoint; map_size?: UvttPoint; pixels_per_grid?: number };
  line_of_sight?: UvttPoint[][];
  objects_line_of_sight?: UvttPoint[][];
  portals?: { position?: UvttPoint; bounds?: UvttPoint[]; closed?: boolean; freestanding?: boolean }[];
  lights?: { position?: UvttPoint; range?: number; intensity?: number; color?: string; shadows?: boolean }[];
  environment?: { baked_lighting?: boolean; ambient_light?: string };
  image?: string;
}

export const UVTT_EXTENSIONS = ['dd2vtt', 'uvtt', 'df2vtt'];

export function isUniversalVtt(v: unknown): v is UvttFile {
  const f = v as UvttFile | null;
  return !!f && typeof f === 'object' && !!f.resolution && typeof f.resolution.pixels_per_grid === 'number' && !!f.resolution.map_size;
}

/** "ffRRGGBB" (alpha first) or "RRGGBB" → "#rrggbb" */
function colour(argb: string | undefined): string | undefined {
  const hex = String(argb ?? '').replace(/^#/, '');
  if (/^[0-9a-f]{8}$/i.test(hex)) return `#${hex.slice(2).toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
  return undefined;
}

function ambientOf(env: UvttFile['environment']): Ambient {
  const c = colour(env?.ambient_light);
  if (!c) return 'bright';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.7 ? 'bright' : lum > 0.3 ? 'dim' : 'dark';
}

/** Picture type from the first bytes of the base64 data. */
function imageUrl(b64: string): string | null {
  const data = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!data) return null;
  const type = data.startsWith('iVBOR') ? 'png' : data.startsWith('/9j/') ? 'jpeg' : data.startsWith('UklGR') ? 'webp' : 'png';
  return `data:image/${type};base64,${data}`;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** A Universal VTT map as a map of ours, ready for the library or a new scene. */
export function fromUniversalVtt(file: UvttFile, name: string): MapPackage {
  const res = file.resolution!;
  const origin = res.map_origin ?? { x: 0, y: 0 };
  const w = Math.max(1, Math.round(res.map_size!.x));
  const h = Math.max(1, Math.round(res.map_size!.y));
  const at = (p: UvttPoint) => ({ x: round(p.x - origin.x), y: round(p.y - origin.y) });

  const walls: Omit<Wall, 'id' | 'sceneId'>[] = [];
  for (const line of [...(file.line_of_sight ?? []), ...(file.objects_line_of_sight ?? [])]) {
    if (!Array.isArray(line)) continue;
    for (let i = 1; i < line.length; i++) {
      const a = at(line[i - 1]!);
      const b = at(line[i]!);
      if (a.x === b.x && a.y === b.y) continue;
      walls.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'wall' });
    }
  }
  for (const p of file.portals ?? []) {
    const [a, b] = p.bounds ?? [];
    if (!a || !b) continue;
    const pa = at(a);
    const pb = at(b);
    walls.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, kind: 'door', ...(p.closed === false ? { open: true } : {}) });
  }

  const props: Omit<Prop, 'id' | 'sceneId'>[] = [];
  for (const l of file.lights ?? []) {
    if (!l.position) continue;
    const p = at(l.position);
    const range = Math.max(0.5, Number(l.range) || 4);
    props.push({
      kind: 'light',
      image: null,
      x: round(p.x - 0.25),
      y: round(p.y - 0.25),
      w: 0.5,
      h: 0.5,
      rotation: 0,
      light: { bright: round(range / 2), dim: round(range), color: colour(l.color) },
      blocksVision: false,
      hidden: false,
    });
  }

  const background = file.image ? imageUrl(file.image) : null;
  const hasWalls = walls.length > 0;
  return {
    format: 'thevtt-map',
    version: 1,
    name,
    scene: {
      name,
      background: background ? 'map' : null,
      widthCells: w,
      heightCells: h,
      cellDistance: 1.5,
      unit: 'm',
      showGrid: false,
      bgCellPx: res.pixels_per_grid ?? null,
      bgOffsetX: 0,
      bgOffsetY: 0,
      vision: hasWalls,
      // light baked in the picture: the map's own ambient light
      ambient: ambientOf(file.environment),
      autoWalls: false,
    },
    walls,
    props,
    drawings: [],
    tokens: [],
    assets: background ? { map: background } : {},
  };
}

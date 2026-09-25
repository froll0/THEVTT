import type { Light, Prop } from '@thevtt/shared';

/**
 * Built-in scenery, drawn with a few flat shapes so it matches any map style.
 * Sizes in cells; lights in metres (converted to cells with the scene's scale when placed).
 */
export interface PropKind {
  id: string;
  name: string;
  w: number;
  h: number;
  light?: Light;
  blocksVision?: boolean;
  /** draws in a unit box centred on 0,0 (from -0.5 to 0.5 on both axes) */
  draw?: (c: CanvasRenderingContext2D, t: number) => void;
}

const WOOD = '#8a5a34';
const WOOD_DARK = '#5e3b21';
const STONE = '#8d8f96';
const STONE_DARK = '#5c5e65';
const LEAF = '#3f7d4a';
const LEAF_DARK = '#2a5a34';

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};
const outline = (c: CanvasRenderingContext2D) => {
  c.lineWidth = 0.05;
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.stroke();
};
const flame = (c: CanvasRenderingContext2D, t: number, s = 1) => {
  const flick = 1 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04;
  c.save();
  c.scale(s, s * flick);
  const g = c.createRadialGradient(0, 0.05, 0, 0, 0, 0.32);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.45, '#ffb13b');
  g.addColorStop(1, 'rgba(230,80,20,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -0.34);
  c.quadraticCurveTo(0.26, 0.02, 0, 0.26);
  c.quadraticCurveTo(-0.26, 0.02, 0, -0.34);
  c.fill();
  c.restore();
};

export const PROP_KINDS: PropKind[] = [
  {
    id: 'crate',
    name: 'Cassa',
    w: 1,
    h: 1,
    draw: (c) => {
      rr(c, -0.42, -0.42, 0.84, 0.84, 0.05);
      c.fillStyle = WOOD;
      c.fill();
      outline(c);
      c.strokeStyle = WOOD_DARK;
      c.lineWidth = 0.06;
      c.beginPath();
      c.moveTo(-0.42, -0.42);
      c.lineTo(0.42, 0.42);
      c.moveTo(0.42, -0.42);
      c.lineTo(-0.42, 0.42);
      c.stroke();
    },
  },
  {
    id: 'barrel',
    name: 'Barile',
    w: 1,
    h: 1,
    draw: (c) => {
      c.beginPath();
      c.arc(0, 0, 0.4, 0, Math.PI * 2);
      c.fillStyle = WOOD;
      c.fill();
      outline(c);
      c.strokeStyle = '#3b3b40';
      c.lineWidth = 0.05;
      for (const r of [0.28, 0.14]) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
    },
  },
  {
    id: 'chest',
    name: 'Forziere',
    w: 1,
    h: 0.75,
    draw: (c) => {
      rr(c, -0.45, -0.45, 0.9, 0.9, 0.08);
      c.fillStyle = WOOD;
      c.fill();
      outline(c);
      c.fillStyle = '#c9a227';
      c.fillRect(-0.45, -0.08, 0.9, 0.12);
      c.fillRect(-0.06, -0.16, 0.12, 0.26);
    },
  },
  {
    id: 'table',
    name: 'Tavolo',
    w: 2,
    h: 1,
    draw: (c) => {
      rr(c, -0.46, -0.44, 0.92, 0.88, 0.06);
      c.fillStyle = '#9b6a3f';
      c.fill();
      outline(c);
      c.strokeStyle = WOOD_DARK;
      c.lineWidth = 0.02;
      for (const y of [-0.2, 0, 0.2]) {
        c.beginPath();
        c.moveTo(-0.44, y);
        c.lineTo(0.44, y);
        c.stroke();
      }
    },
  },
  {
    id: 'chair',
    name: 'Sedia',
    w: 0.75,
    h: 0.75,
    draw: (c) => {
      rr(c, -0.36, -0.3, 0.72, 0.7, 0.08);
      c.fillStyle = WOOD;
      c.fill();
      outline(c);
      rr(c, -0.4, -0.46, 0.8, 0.18, 0.05);
      c.fillStyle = WOOD_DARK;
      c.fill();
    },
  },
  {
    id: 'bed',
    name: 'Letto',
    w: 1,
    h: 2,
    draw: (c) => {
      rr(c, -0.45, -0.47, 0.9, 0.94, 0.05);
      c.fillStyle = WOOD_DARK;
      c.fill();
      outline(c);
      rr(c, -0.4, -0.3, 0.8, 0.74, 0.04);
      c.fillStyle = '#7d3b3b';
      c.fill();
      rr(c, -0.34, -0.43, 0.68, 0.12, 0.04);
      c.fillStyle = '#e8e2d4';
      c.fill();
    },
  },
  {
    id: 'bookshelf',
    name: 'Libreria',
    w: 2,
    h: 0.5,
    blocksVision: true,
    draw: (c) => {
      rr(c, -0.48, -0.45, 0.96, 0.9, 0.04);
      c.fillStyle = WOOD_DARK;
      c.fill();
      outline(c);
      const colors = ['#7d3b3b', '#3b5a7d', '#4f7d3b', '#c9a227', '#6b4a7d'];
      for (let i = 0; i < 12; i++) {
        c.fillStyle = colors[i % colors.length]!;
        c.fillRect(-0.44 + i * 0.074, -0.3, 0.06, 0.6);
      }
    },
  },
  {
    id: 'rug',
    name: 'Tappeto',
    w: 3,
    h: 2,
    draw: (c) => {
      rr(c, -0.48, -0.46, 0.96, 0.92, 0.03);
      c.fillStyle = '#7a2e2e';
      c.fill();
      c.strokeStyle = '#c9a227';
      c.lineWidth = 0.03;
      rr(c, -0.4, -0.36, 0.8, 0.72, 0.02);
      c.stroke();
    },
  },
  {
    id: 'altar',
    name: 'Altare',
    w: 2,
    h: 1,
    draw: (c) => {
      rr(c, -0.46, -0.42, 0.92, 0.84, 0.04);
      c.fillStyle = '#b9b4a8';
      c.fill();
      outline(c);
      c.fillStyle = '#7d3b3b';
      c.fillRect(-0.3, -0.42, 0.6, 0.84);
    },
  },
  {
    id: 'campfire',
    name: 'Falò',
    w: 1,
    h: 1,
    light: { bright: 6, dim: 12, color: '#ffb35c' },
    draw: (c, t) => {
      c.fillStyle = STONE_DARK;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.arc(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.09, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = WOOD_DARK;
      c.lineWidth = 0.09;
      c.beginPath();
      c.moveTo(-0.22, -0.12);
      c.lineTo(0.22, 0.12);
      c.moveTo(-0.22, 0.12);
      c.lineTo(0.22, -0.12);
      c.stroke();
      flame(c, t, 1);
    },
  },
  {
    id: 'torch',
    name: 'Torcia a muro',
    w: 0.5,
    h: 0.5,
    light: { bright: 6, dim: 12, color: '#ffb35c' },
    draw: (c, t) => {
      c.fillStyle = WOOD_DARK;
      c.fillRect(-0.08, -0.1, 0.16, 0.5);
      flame(c, t, 0.9);
    },
  },
  {
    id: 'brazier',
    name: 'Braciere',
    w: 1,
    h: 1,
    light: { bright: 3, dim: 6, color: '#ff9e45' },
    draw: (c, t) => {
      c.beginPath();
      c.arc(0, 0, 0.38, 0, Math.PI * 2);
      c.fillStyle = '#3b3b40';
      c.fill();
      outline(c);
      flame(c, t, 1.1);
    },
  },
  {
    id: 'light',
    name: 'Fonte di luce',
    w: 0.5,
    h: 0.5,
    light: { bright: 6, dim: 12 },
  },
  {
    id: 'pillar',
    name: 'Colonna',
    w: 1,
    h: 1,
    blocksVision: true,
    draw: (c) => {
      c.beginPath();
      c.arc(0, 0, 0.44, 0, Math.PI * 2);
      c.fillStyle = STONE;
      c.fill();
      outline(c);
      c.beginPath();
      c.arc(0, 0, 0.3, 0, Math.PI * 2);
      c.strokeStyle = STONE_DARK;
      c.lineWidth = 0.04;
      c.stroke();
    },
  },
  {
    id: 'statue',
    name: 'Statua',
    w: 1,
    h: 1,
    blocksVision: true,
    draw: (c) => {
      rr(c, -0.44, -0.44, 0.88, 0.88, 0.06);
      c.fillStyle = STONE_DARK;
      c.fill();
      outline(c);
      c.beginPath();
      c.arc(0, -0.05, 0.24, 0, Math.PI * 2);
      c.fillStyle = STONE;
      c.fill();
      c.beginPath();
      c.arc(0, -0.05, 0.1, 0, Math.PI * 2);
      c.fillStyle = '#b1b3ba';
      c.fill();
    },
  },
  {
    id: 'tree',
    name: 'Albero',
    w: 2,
    h: 2,
    draw: (c) => {
      for (const [x, y, r, col] of [
        [0.08, 0.08, 0.42, LEAF_DARK],
        [-0.1, -0.06, 0.34, LEAF],
        [0.14, -0.12, 0.24, '#4d9459'],
      ] as const) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = col;
        c.fill();
      }
      c.beginPath();
      c.arc(0.08, 0.08, 0.42, 0, Math.PI * 2);
      outline(c);
    },
  },
  {
    id: 'bush',
    name: 'Cespuglio',
    w: 1,
    h: 1,
    draw: (c) => {
      for (const [x, y, r] of [
        [-0.15, 0.05, 0.25],
        [0.15, 0.08, 0.24],
        [0, -0.14, 0.26],
      ] as const) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = LEAF;
        c.fill();
      }
    },
  },
  {
    id: 'rock',
    name: 'Masso',
    w: 1,
    h: 1,
    blocksVision: true,
    draw: (c) => {
      c.beginPath();
      c.moveTo(-0.4, 0.1);
      c.lineTo(-0.25, -0.35);
      c.lineTo(0.2, -0.42);
      c.lineTo(0.43, -0.05);
      c.lineTo(0.3, 0.38);
      c.lineTo(-0.2, 0.42);
      c.closePath();
      c.fillStyle = STONE;
      c.fill();
      outline(c);
    },
  },
  {
    id: 'well',
    name: 'Pozzo',
    w: 1.5,
    h: 1.5,
    draw: (c) => {
      c.beginPath();
      c.arc(0, 0, 0.45, 0, Math.PI * 2);
      c.fillStyle = STONE;
      c.fill();
      outline(c);
      c.beginPath();
      c.arc(0, 0, 0.3, 0, Math.PI * 2);
      c.fillStyle = '#1d2a36';
      c.fill();
    },
  },
];

export const propKind = (id: string) => PROP_KINDS.find((k) => k.id === id);

/** Draws a prop in world pixels (cell size `cell`). Images fill the prop's box. */
export function drawProp(c: CanvasRenderingContext2D, p: Prop, cell: number, img: HTMLImageElement | null, t: number, gm: boolean) {
  const cx = (p.x + p.w / 2) * cell;
  const cy = (p.y + p.h / 2) * cell;
  const w = p.w * cell;
  const h = p.h * cell;
  c.save();
  c.translate(cx, cy);
  c.rotate(((p.rotation || 0) * Math.PI) / 180);
  if (p.hidden) c.globalAlpha = 0.45;
  if (img) {
    c.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    const kind = propKind(p.kind);
    if (kind?.draw) {
      c.scale(w, h);
      kind.draw(c, t);
    } else if (gm) {
      // invisible light source: a small marker for the GM only
      c.beginPath();
      c.arc(0, 0, Math.min(w, h) * 0.3, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255, 214, 102, 0.85)';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.stroke();
    }
  }
  c.restore();
}

/** Props with a flame keep animating. */
export const animatedProp = (p: Prop) => !p.image && ['campfire', 'torch', 'brazier'].includes(p.kind);

/** Light presets in metres (converted to cells with the scene's scale). */
export const LIGHT_PRESETS: { id: string; name: string; bright: number; dim: number; color?: string }[] = [
  { id: 'none', name: 'Nessuna', bright: 0, dim: 0 },
  { id: 'candle', name: 'Candela (1,5 m + 1,5 m)', bright: 1.5, dim: 3, color: '#ffc46b' },
  { id: 'torch', name: 'Torcia (6 m + 6 m)', bright: 6, dim: 12, color: '#ffb35c' },
  { id: 'lamp', name: 'Lampada (4,5 m + 9 m)', bright: 4.5, dim: 13.5, color: '#ffd28a' },
  { id: 'lantern', name: 'Lanterna schermabile (9 m + 9 m)', bright: 9, dim: 18, color: '#ffd28a' },
  { id: 'bullseye', name: 'Lanterna a occhio di bue (18 m + 18 m)', bright: 18, dim: 36, color: '#ffd28a' },
  { id: 'light', name: 'Incantesimo Luce (6 m + 6 m)', bright: 6, dim: 12, color: '#f4f1ff' },
  { id: 'daylight', name: 'Luce diurna (18 m + 18 m)', bright: 18, dim: 36, color: '#fffbe6' },
];

/** Metres to cells on a scene (scenes in feet use 0,3 m per foot). */
export function metresToCells(scene: { cellDistance: number; unit?: 'm' | 'ft' }, m: number): number {
  const perCell = scene.unit === 'ft' ? scene.cellDistance * 0.3048 : scene.cellDistance;
  return Math.round((m / (perCell || 1.5)) * 100) / 100;
}
export const cellsToMetres = (scene: { cellDistance: number; unit?: 'm' | 'ft' }, cells: number) =>
  Math.round(cells * (scene.unit === 'ft' ? scene.cellDistance * 0.3048 : scene.cellDistance) * 10) / 10;

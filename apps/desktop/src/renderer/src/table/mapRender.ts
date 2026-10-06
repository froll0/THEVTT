import { seededRng, T, type GeneratedMap } from '@thevtt/shared';

/**
 * Paints a generated map: stone floors and rock for dungeons and caves,
 * grass, paths and water outdoors. Walls, doors and scenery are not painted
 * here: they are real walls and props on the table.
 */

type Rgb = [number, number, number];
const hex = (c: Rgb, d = 0) => `rgb(${Math.max(0, Math.min(255, c[0] + d))},${Math.max(0, Math.min(255, c[1] + d))},${Math.max(0, Math.min(255, c[2] + d))})`;

const PALETTE: Record<GeneratedMap['kind'], { void: Rgb; floor: Rgb; corridor: Rgb; water: Rgb; path: Rgb; grass: Rgb; edge: string }> = {
  dungeon: { void: [24, 22, 21], floor: [118, 112, 104], corridor: [104, 99, 92], water: [46, 86, 110], path: [118, 112, 104], grass: [86, 110, 62], edge: '#141210' },
  cave: { void: [30, 25, 21], floor: [104, 90, 74], corridor: [104, 90, 74], water: [38, 78, 96], path: [104, 90, 74], grass: [86, 110, 62], edge: '#1d1713' },
  wilderness: { void: [60, 82, 44], floor: [140, 120, 90], corridor: [140, 120, 90], water: [52, 104, 132], path: [146, 122, 86], grass: [84, 122, 60], edge: '#2c3b22' },
};

export function renderMap(m: GeneratedMap, cellPx: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = m.width * cellPx;
  canvas.height = m.height * cellPx;
  const c = canvas.getContext('2d')!;
  const rnd = seededRng(m.seed ^ 0x5eed);
  const pal = PALETTE[m.kind];
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= m.width || y >= m.height ? T.void : m.cells[y * m.width + x]!);
  const S = cellPx;

  // ground, cell by cell, with a little variation
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) {
      const t = at(x, y);
      const base = t === T.floor ? pal.floor : t === T.corridor ? pal.corridor : t === T.water ? pal.water : t === T.path ? pal.path : t === T.grass ? pal.grass : pal.void;
      c.fillStyle = hex(base, m.kind === 'dungeon' ? Math.round((rnd() - 0.5) * 14) : 0);
      c.fillRect(x * S, y * S, S + 1, S + 1);
    }

  // soft, large variations of light and colour instead of a cell-by-cell checkerboard
  if (m.kind !== 'dungeon') {
    const blobs = Math.round(m.width * m.height * 0.6);
    for (let k = 0; k < blobs; k++) {
      const x = rnd() * m.width * S;
      const y = rnd() * m.height * S;
      const r = S * (0.8 + rnd() * 2.2);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const light = rnd() < 0.5;
      g.addColorStop(0, light ? 'rgba(255,245,220,0.07)' : 'rgba(10,8,4,0.09)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // rounded shapes for what nature makes: paths, ponds, cave rock
  const blob = (t: number, radius: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        if (at(x, y) !== t) continue;
        const r = S * radius * (0.92 + rnd() * 0.16);
        c.moveTo(x * S + S / 2 + r, y * S + S / 2);
        c.arc(x * S + S / 2, y * S + S / 2, r, 0, Math.PI * 2);
      }
    c.fill();
  };
  // a light blur melts the circles into one smooth shape
  const soft = (fn: () => void) => {
    c.save();
    c.filter = `blur(${Math.max(1, S * 0.12)}px)`;
    fn();
    c.restore();
  };
  if (m.kind === 'wilderness') {
    soft(() => blob(T.path, 0.8, hex(pal.path, -14)));
    soft(() => blob(T.path, 0.7, hex(pal.path)));
  }
  if (m.kind !== 'dungeon') {
    soft(() => blob(T.water, 0.84, 'rgba(150,180,160,0.8)'));
    soft(() => blob(T.water, 0.76, hex(pal.water)));
  }

  if (m.kind === 'dungeon') {
    // flagstones: each cell split in slabs, with seams and wear
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        const t = at(x, y);
        if (t !== T.floor && t !== T.corridor) continue;
        const half = rnd() < 0.5;
        c.strokeStyle = 'rgba(30,28,26,0.55)';
        c.lineWidth = Math.max(1, S / 28);
        c.strokeRect(x * S + 0.5, y * S + 0.5, S - 1, S - 1);
        if (half) {
          c.beginPath();
          c.moveTo(x * S + S / 2, y * S);
          c.lineTo(x * S + S / 2, y * S + S);
          c.stroke();
        }
        for (let k = 0; k < 3; k++) {
          c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`;
          c.beginPath();
          c.arc(x * S + rnd() * S, y * S + rnd() * S, S * (0.05 + rnd() * 0.18), 0, Math.PI * 2);
          c.fill();
        }
      }
    // rock: hatching, like an old map
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = Math.max(1, S / 24);
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        if (at(x, y) !== T.void) continue;
        const near = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((t) => t !== T.void);
        if (!near && rnd() < 0.6) continue;
        for (let k = 0; k < 3; k++) {
          const ox = x * S + rnd() * S;
          const oy = y * S + rnd() * S;
          c.beginPath();
          c.moveTo(ox, oy);
          c.lineTo(ox + S * 0.3, oy - S * 0.18);
          c.stroke();
        }
      }
  }

  if (m.kind === 'cave') {
    // the rock: rounded masses casting a soft shadow on the floor
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.7)';
    c.shadowBlur = S * 0.5;
    blob(T.void, 0.78, hex(pal.void));
    c.restore();
    blob(T.void, 0.7, hex(pal.void, 6));
    // earth and pebbles
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        if (at(x, y) !== T.floor) continue;
        for (let k = 0; k < 4; k++) {
          c.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,220' : '20,12,6'},${0.04 + rnd() * 0.07})`;
          c.beginPath();
          c.ellipse(x * S + rnd() * S, y * S + rnd() * S, S * (0.04 + rnd() * 0.14), S * (0.03 + rnd() * 0.1), rnd() * Math.PI, 0, Math.PI * 2);
          c.fill();
        }
      }
  }

  if (m.kind === 'wilderness') {
    // tufts of grass and soft patches
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        const t = at(x, y);
        if (t === T.grass) {
          for (let k = 0; k < 5; k++) {
            const ox = x * S + rnd() * S;
            const oy = y * S + rnd() * S;
            c.strokeStyle = `rgba(${rnd() < 0.5 ? '160,200,110' : '40,70,30'},0.35)`;
            c.lineWidth = Math.max(1, S / 32);
            c.beginPath();
            c.moveTo(ox, oy);
            c.lineTo(ox + (rnd() - 0.5) * S * 0.15, oy - S * 0.18);
            c.stroke();
          }
        }
        if (t === T.path) {
          for (let k = 0; k < 3; k++) {
            c.fillStyle = `rgba(${rnd() < 0.5 ? '200,180,140' : '90,70,40'},0.18)`;
            c.beginPath();
            c.arc(x * S + rnd() * S, y * S + rnd() * S, S * (0.05 + rnd() * 0.12), 0, Math.PI * 2);
            c.fill();
          }
        }
      }
  }

  // water: ripples (the rim comes from the rounded shapes)
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) {
      if (at(x, y) !== T.water) continue;
      c.strokeStyle = 'rgba(200,230,255,0.18)';
      c.lineWidth = Math.max(1, S / 30);
      for (let k = 0; k < 2; k++) {
        const ox = x * S + rnd() * S;
        const oy = y * S + rnd() * S;
        c.beginPath();
        c.arc(ox, oy, S * 0.18, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
    }

  // a soft shadow at the foot of the walls, then the wall line itself
  if (m.kind === 'dungeon') {
    c.save();
    c.lineCap = 'round';
    c.shadowColor = 'rgba(0,0,0,0.65)';
    c.shadowBlur = S * 0.35;
    c.strokeStyle = pal.edge;
    c.lineWidth = S * 0.16;
    c.beginPath();
    for (const w of m.walls) {
      if (w.kind === 'door') continue;
      c.moveTo(w.x1 * S, w.y1 * S);
      c.lineTo(w.x2 * S, w.y2 * S);
    }
    c.stroke();
    c.restore();
  }
  return canvas;
}

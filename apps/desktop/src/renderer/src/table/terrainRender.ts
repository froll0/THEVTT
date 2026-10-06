import { EMPTY_TERRAIN, seededRng, terrainKind, wallBetween } from '@thevtt/shared';

/**
 * Paints the map the GM paints at the table. Everyone's app draws the same
 * picture: every random choice comes from the cell and the scene, never from
 * the order of drawing. The board keeps it in chunks, so a brush stroke only
 * repaints the few chunks it touched.
 */

/** cells of the neighbours read around a region: rounded shapes and shadows cross cell borders */
const MARGIN = 2;
const CHUNK = 8;

/** natural ground, bottom to top: what is higher spills a little over what is lower */
const LAYERS = ['g', 'a', 'n', 'd', 'e', 'q', 'p', 'l', 'v', 'r'];

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const css = (c: Rgb, d = 0, a = 1) => `rgba(${c.map((v) => Math.max(0, Math.min(255, Math.round(v + d)))).join(',')},${a})`;

function hash(x: number, y: number, seed: number, salt: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}
const cellRng = (x: number, y: number, seed: number, salt: number) => seededRng(hash(x, y, seed, salt));

/** A seed from a scene id: the same picture on every computer. */
export function terrainSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** pixels per cell: sharp on normal maps, still light on huge ones */
export function terrainCellPx(w: number, h: number): number {
  return Math.max(24, Math.min(64, Math.floor(4200 / Math.max(w, h))));
}

interface MapRef {
  terrain: string;
  w: number;
  h: number;
  seed: number;
}

/**
 * Paints cells [x0, x1) × [y0, y1) into ctx, whose origin is the map's (0, 0),
 * at P pixels per cell. Anything outside the canvas is simply clipped.
 */
function paintRegion(c: CanvasRenderingContext2D, m: MapRef, P: number, x0: number, y0: number, x1: number, y1: number) {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? EMPTY_TERRAIN : m.terrain[y * m.w + x] ?? EMPTY_TERRAIN);
  const ax = x0 - MARGIN;
  const ay = y0 - MARGIN;
  const bx = x1 + MARGIN;
  const by = y1 + MARGIN;
  const cells = (fn: (x: number, y: number, code: string) => void) => {
    for (let y = ay; y < by; y++)
      for (let x = ax; x < bx; x++) {
        const code = at(x, y);
        if (code !== EMPTY_TERRAIN) fn(x, y, code);
      }
  };
  const isBuilt = (code: string) => terrainKind(code)?.style === 'built';

  // 1. flat ground
  cells((x, y, code) => {
    c.fillStyle = terrainKind(code)!.color;
    c.fillRect(x * P, y * P, P + 0.5, P + 0.5);
  });

  // 2. natural ground as rounded shapes, lowest first
  const blob = (code: string, radius: number, fill: string, blur = 0.12) => {
    c.save();
    c.filter = `blur(${Math.max(1, P * blur)}px)`;
    c.fillStyle = fill;
    c.beginPath();
    for (let y = ay; y < by; y++)
      for (let x = ax; x < bx; x++) {
        if (at(x, y) !== code) continue;
        const r = P * radius * (0.94 + cellRng(x, y, m.seed, 1)() * 0.12);
        c.moveTo(x * P + P / 2 + r, y * P + P / 2);
        c.arc(x * P + P / 2, y * P + P / 2, r, 0, Math.PI * 2);
      }
    c.fill();
    c.restore();
  };
  const present = new Set<string>();
  cells((_x, _y, code) => present.add(code));
  for (const code of LAYERS) {
    if (!present.has(code)) continue;
    const base = rgb(terrainKind(code)!.color);
    if (code === 'q') {
      blob(code, 0.86, 'rgba(150,180,160,0.8)');
      blob(code, 0.76, css(base));
    } else if (code === 'l') {
      blob(code, 0.88, 'rgba(40,20,14,0.95)');
      c.save();
      c.shadowColor = 'rgba(255,140,40,0.8)';
      c.shadowBlur = P * 0.5;
      blob(code, 0.72, css(base));
      c.restore();
    } else if (code === 'v') {
      blob(code, 0.9, 'rgba(0,0,0,0.55)', 0.25);
      blob(code, 0.74, css(base));
    } else if (code === 'r') {
      // rock: rounded masses with a soft shadow on the ground
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.7)';
      c.shadowBlur = P * 0.5;
      blob(code, 0.8, css(base));
      c.restore();
      blob(code, 0.7, css(base, 5));
    } else {
      blob(code, 0.8, css(base, -10));
      blob(code, 0.7, css(base));
    }
  }

  // 3. large soft variations of light, so natural ground isn't flat
  cells((x, y, code) => {
    const k = terrainKind(code)!;
    if (k.style === 'built') return;
    const rnd = cellRng(x, y, m.seed, 2);
    if (rnd() < 0.35) return;
    const cx = (x + rnd()) * P;
    const cy = (y + rnd()) * P;
    const r = P * (0.8 + rnd() * 1.6);
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    const light = rnd() < 0.5;
    g.addColorStop(0, light ? 'rgba(255,245,220,0.07)' : 'rgba(10,8,4,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
  });

  // 4. built floors: crisp, on top of whatever spilled over them
  cells((x, y, code) => {
    if (!isBuilt(code)) return;
    const rnd = cellRng(x, y, m.seed, 3);
    const base = rgb(terrainKind(code)!.color);
    const X = x * P;
    const Y = y * P;
    c.save();
    c.beginPath();
    c.rect(X, Y, P, P);
    c.clip();
    c.fillStyle = css(base, (rnd() - 0.5) * 14);
    c.fillRect(X, Y, P, P);
    const seam = Math.max(1, P / 28);
    if (code === 's') {
      c.strokeStyle = 'rgba(30,28,26,0.55)';
      c.lineWidth = seam;
      c.strokeRect(X + 0.5, Y + 0.5, P - 1, P - 1);
      if (rnd() < 0.5) {
        c.beginPath();
        c.moveTo(X + P / 2, Y);
        c.lineTo(X + P / 2, Y + P);
        c.stroke();
      }
      for (let k = 0; k < 3; k++) {
        c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`;
        c.beginPath();
        c.arc(X + rnd() * P, Y + rnd() * P, P * (0.05 + rnd() * 0.18), 0, Math.PI * 2);
        c.fill();
      }
    } else if (code === 'w') {
      // planks running across, joints staggered by row
      const planks = 3;
      const ph = P / planks;
      for (let i = 0; i < planks; i++) {
        const prow = cellRng(0, y * planks + i, m.seed, 4);
        c.fillStyle = css(base, (prow() - 0.5) * 22);
        c.fillRect(X, Y + i * ph, P, ph);
        c.strokeStyle = 'rgba(40,24,10,0.6)';
        c.lineWidth = seam;
        c.beginPath();
        c.moveTo(X, Y + i * ph);
        c.lineTo(X + P, Y + i * ph);
        c.stroke();
        // a joint every few cells, at a place that depends on the row
        const jx = (x + i * 2 + Math.floor(prow() * 3)) % 3 === 0 ? X + prow() * P : -1;
        if (jx >= 0) {
          c.beginPath();
          c.moveTo(jx, Y + i * ph);
          c.lineTo(jx, Y + (i + 1) * ph);
          c.stroke();
        }
        c.strokeStyle = 'rgba(60,36,16,0.18)';
        c.lineWidth = Math.max(0.5, P / 60);
        for (let k = 0; k < 2; k++) {
          const gy = Y + i * ph + ph * (0.25 + rnd() * 0.5);
          c.beginPath();
          c.moveTo(X, gy);
          c.bezierCurveTo(X + P * 0.3, gy + (rnd() - 0.5) * 3, X + P * 0.7, gy + (rnd() - 0.5) * 3, X + P, gy);
          c.stroke();
        }
      }
    } else if (code === 't') {
      // marble squares, two by two, light and dark like a chessboard
      const half = P / 2;
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) {
          const dark = (x * 2 + i + y * 2 + j) % 2 === 1;
          c.fillStyle = css(base, dark ? -38 : 10 + (rnd() - 0.5) * 8);
          c.fillRect(X + i * half, Y + j * half, half, half);
        }
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      c.lineWidth = Math.max(0.5, P / 70);
      c.beginPath();
      const vx = X + rnd() * P;
      c.moveTo(vx, Y);
      c.bezierCurveTo(vx + (rnd() - 0.5) * P, Y + P * 0.3, vx + (rnd() - 0.5) * P, Y + P * 0.7, vx + (rnd() - 0.5) * P * 0.6, Y + P);
      c.stroke();
      c.strokeStyle = 'rgba(40,36,30,0.35)';
      c.lineWidth = seam;
      c.strokeRect(X + 0.5, Y + 0.5, half, half);
      c.strokeRect(X + half + 0.5, Y + half + 0.5, half, half);
    } else if (code === 'c') {
      // cobbles in dark grout
      c.fillStyle = css(base, -40);
      c.fillRect(X, Y, P, P);
      const n = 3;
      const s = P / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const off = j % 2 ? s / 2 : 0;
          c.fillStyle = css(base, (rnd() - 0.5) * 30);
          c.beginPath();
          c.ellipse(X + i * s + s / 2 + off - s / 4, Y + j * s + s / 2, s * (0.4 + rnd() * 0.08), s * (0.36 + rnd() * 0.08), rnd() * Math.PI, 0, Math.PI * 2);
          c.fill();
        }
    }
    c.restore();
  });

  // 5. details on natural ground
  cells((x, y, code) => {
    if (isBuilt(code)) return;
    const rnd = cellRng(x, y, m.seed, 5);
    const X = x * P;
    const Y = y * P;
    const lw = Math.max(1, P / 32);
    if (code === 'g') {
      c.lineWidth = lw;
      for (let k = 0; k < 5; k++) {
        const ox = X + rnd() * P;
        const oy = Y + rnd() * P;
        c.strokeStyle = `rgba(${rnd() < 0.5 ? '160,200,110' : '40,70,30'},0.35)`;
        c.beginPath();
        c.moveTo(ox, oy);
        c.lineTo(ox + (rnd() - 0.5) * P * 0.15, oy - P * 0.18);
        c.stroke();
      }
      if (rnd() < 0.06) {
        c.fillStyle = rnd() < 0.5 ? 'rgba(250,240,140,0.8)' : 'rgba(240,200,230,0.8)';
        c.beginPath();
        c.arc(X + rnd() * P, Y + rnd() * P, P * 0.04, 0, Math.PI * 2);
        c.fill();
      }
    } else if (code === 'd' || code === 'e') {
      for (let k = 0; k < (code === 'e' ? 4 : 3); k++) {
        c.fillStyle = `rgba(${rnd() < 0.5 ? '230,210,170' : '30,20,10'},${0.06 + rnd() * 0.1})`;
        c.beginPath();
        c.ellipse(X + rnd() * P, Y + rnd() * P, P * (0.04 + rnd() * 0.12), P * (0.03 + rnd() * 0.09), rnd() * Math.PI, 0, Math.PI * 2);
        c.fill();
      }
    } else if (code === 'a') {
      c.fillStyle = 'rgba(120,96,50,0.25)';
      for (let k = 0; k < 8; k++) c.fillRect(X + rnd() * P, Y + rnd() * P, Math.max(1, P / 40), Math.max(1, P / 40));
      c.strokeStyle = 'rgba(255,240,200,0.2)';
      c.lineWidth = lw;
      c.beginPath();
      const wy = Y + rnd() * P;
      c.moveTo(X, wy);
      c.quadraticCurveTo(X + P / 2, wy - P * 0.12, X + P, wy);
      c.stroke();
    } else if (code === 'n') {
      // drifts: soft blue hollows and a few glints
      for (let k = 0; k < 2; k++) {
        const ex = X + rnd() * P;
        const ey = Y + rnd() * P;
        const r = P * (0.3 + rnd() * 0.3);
        const g = c.createRadialGradient(ex, ey, 0, ex, ey, r);
        g.addColorStop(0, rnd() < 0.5 ? 'rgba(140,165,200,0.16)' : 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(ex - r, ey - r, r * 2, r * 2);
      }
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let k = 0; k < 2; k++) c.fillRect(X + rnd() * P, Y + rnd() * P, Math.max(1, P / 36), Math.max(1, P / 36));
    } else if (code === 'q' || code === 'p') {
      c.strokeStyle = code === 'q' ? 'rgba(200,230,255,0.18)' : 'rgba(170,210,240,0.1)';
      c.lineWidth = Math.max(1, P / 30);
      for (let k = 0; k < 2; k++) {
        c.beginPath();
        c.arc(X + rnd() * P, Y + rnd() * P, P * 0.18, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
    } else if (code === 'l') {
      c.strokeStyle = 'rgba(60,20,10,0.55)';
      c.lineWidth = Math.max(1, P / 22);
      c.beginPath();
      let px = X + rnd() * P;
      let py = Y + rnd() * P;
      c.moveTo(px, py);
      for (let k = 0; k < 3; k++) {
        px += (rnd() - 0.5) * P * 0.6;
        py += (rnd() - 0.5) * P * 0.6;
        c.lineTo(px, py);
      }
      c.stroke();
      c.fillStyle = 'rgba(255,220,120,0.5)';
      c.beginPath();
      c.arc(X + rnd() * P, Y + rnd() * P, P * 0.06, 0, Math.PI * 2);
      c.fill();
    } else if (code === 'r') {
      // hatching along the rock's face, like an old map
      const near = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((t) => t !== 'r' && t !== EMPTY_TERRAIN);
      if (!near && rnd() < 0.7) return;
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = Math.max(1, P / 24);
      for (let k = 0; k < 3; k++) {
        const ox = X + rnd() * P;
        const oy = Y + rnd() * P;
        c.beginPath();
        c.moveTo(ox, oy);
        c.lineTo(ox + P * 0.3, oy - P * 0.18);
        c.stroke();
      }
    }
  });

  // 6. the faces of rooms: a dark line where a built floor meets rock or nothing, with its shadow
  c.save();
  c.lineCap = 'round';
  c.shadowColor = 'rgba(0,0,0,0.65)';
  c.shadowBlur = P * 0.35;
  c.strokeStyle = '#141210';
  c.lineWidth = P * 0.16;
  c.beginPath();
  for (let y = ay; y <= by; y++)
    for (let x = ax; x <= bx; x++) {
      const here = at(x, y);
      const left = at(x - 1, y);
      const up = at(x, y - 1);
      if ((isBuilt(here) || isBuilt(left)) && wallBetween(left, here)) {
        c.moveTo(x * P, y * P);
        c.lineTo(x * P, (y + 1) * P);
      }
      if ((isBuilt(here) || isBuilt(up)) && wallBetween(up, here)) {
        c.moveTo(x * P, y * P);
        c.lineTo((x + 1) * P, y * P);
      }
    }
  c.stroke();
  c.restore();
}

/** The whole map as one picture (previews, export). */
export function renderTerrain(terrain: string, w: number, h: number, seed: number, P: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w * P;
  canvas.height = h * P;
  paintRegion(canvas.getContext('2d')!, { terrain, w, h, seed }, P, 0, 0, w, h);
  return canvas;
}

/** The painted map on the board, in chunks repainted only when they (or their borders) change. */
export class TerrainLayer {
  private chunks = new Map<number, { key: string; canvas: HTMLCanvasElement | null }>();
  private sig = '';
  private map: MapRef | null = null;
  private P = 32;

  update(terrain: string | null | undefined, w: number, h: number, seed: number): void {
    if (!terrain) {
      this.map = null;
      return;
    }
    const sig = `${w}x${h}:${seed}`;
    if (sig !== this.sig) {
      this.sig = sig;
      this.chunks.clear();
      this.P = terrainCellPx(w, h);
    }
    this.map = { terrain, w, h, seed };
    const cw = Math.ceil(w / CHUNK);
    const ch = Math.ceil(h / CHUNK);
    for (let cy = 0; cy < ch; cy++)
      for (let cx = 0; cx < cw; cx++) {
        const x0 = cx * CHUNK;
        const y0 = cy * CHUNK;
        // what this chunk shows depends on its cells and a border of neighbours
        let key = '';
        const ka = Math.max(0, x0 - MARGIN);
        const kb = Math.min(w, x0 + CHUNK + MARGIN);
        for (let y = Math.max(0, y0 - MARGIN); y < Math.min(h, y0 + CHUNK + MARGIN); y++) key += terrain.slice(y * w + ka, y * w + kb) + '|';
        const id = cy * cw + cx;
        const cur = this.chunks.get(id);
        if (cur && cur.key === key) continue;
        const blank = !/[^.|]/.test(key);
        let canvas: HTMLCanvasElement | null = null;
        if (!blank) {
          canvas = cur?.canvas ?? document.createElement('canvas');
          const cwPx = Math.min(CHUNK, w - x0) * this.P;
          const chPx = Math.min(CHUNK, h - y0) * this.P;
          canvas.width = cwPx;
          canvas.height = chPx;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, cwPx, chPx);
          ctx.save();
          ctx.translate(-x0 * this.P, -y0 * this.P);
          paintRegion(ctx, this.map, this.P, x0, y0, Math.min(w, x0 + CHUNK), Math.min(h, y0 + CHUNK));
          ctx.restore();
        }
        this.chunks.set(id, { key, canvas });
      }
  }

  /** Draws on a context in world units of `cell` pixels per cell. */
  draw(ctx: CanvasRenderingContext2D, cell: number): void {
    const m = this.map;
    if (!m) return;
    const cw = Math.ceil(m.w / CHUNK);
    for (const [id, ch] of this.chunks) {
      if (!ch.canvas) continue;
      const cx = id % cw;
      const cy = (id - cx) / cw;
      const dw = (ch.canvas.width / this.P) * cell;
      const dh = (ch.canvas.height / this.P) * cell;
      // a hair of overlap hides the seams between chunks
      ctx.drawImage(ch.canvas, cx * CHUNK * cell, cy * CHUNK * cell, dw + 0.6, dh + 0.6);
    }
  }
}

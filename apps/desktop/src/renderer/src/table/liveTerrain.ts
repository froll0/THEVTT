/**
 * Ground that moves: ripples running over water, a slow glow and drifting
 * sparks on lava. Drawn over the painted terrain, only for the cells in view,
 * and not at all when the user asked for less motion.
 */

const WATER = new Set(['q', 'p']);
const LAVA = 'l';

export interface LiveCells {
  water: number[];
  lava: number[];
}

let cachedFor: string | null = null;
let cached: LiveCells = { water: [], lava: [] };

/** the moving cells of a terrain (computed once per terrain) */
export function liveCells(terrain: string | null | undefined): LiveCells {
  if (!terrain) return { water: [], lava: [] };
  if (terrain === cachedFor) return cached;
  const water: number[] = [];
  const lava: number[] = [];
  for (let i = 0; i < terrain.length; i++) {
    const c = terrain[i]!;
    if (WATER.has(c)) water.push(i);
    else if (c === LAVA) lava.push(i);
  }
  cachedFor = terrain;
  cached = { water, lava };
  return cached;
}

/** a cell's own phase, so neighbours don't pulse in step */
const phase = (i: number) => ((i * 2654435761) % 1000) / 1000;

export function drawLiveTerrain(
  ctx: CanvasRenderingContext2D,
  cells: LiveCells,
  w: number,
  cell: number,
  view: { x0: number; y0: number; x1: number; y1: number },
  now: number,
): void {
  const t = now / 1000;
  const inView = (i: number) => {
    const x = (i % w) * cell;
    const y = Math.floor(i / w) * cell;
    return x + cell >= view.x0 && x <= view.x1 && y + cell >= view.y0 && y <= view.y1;
  };
  ctx.save();
  if (cells.water.length) {
    // two thin light ripples per cell, sliding diagonally
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.16)';
    ctx.lineWidth = cell * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const i of cells.water) {
      if (!inView(i)) continue;
      const x = (i % w) * cell;
      const y = Math.floor(i / w) * cell;
      const p = phase(i);
      for (let k = 0; k < 2; k++) {
        const off = ((t * 0.18 + p + k * 0.5) % 1) * cell;
        const yy = y + off;
        const amp = cell * 0.05;
        ctx.moveTo(x + cell * 0.12, yy);
        ctx.quadraticCurveTo(x + cell * 0.3, yy - amp * Math.sin(t * 1.3 + p * 6), x + cell * 0.5, yy);
        ctx.quadraticCurveTo(x + cell * 0.7, yy + amp * Math.sin(t * 1.3 + p * 6), x + cell * 0.88, yy);
      }
    }
    ctx.stroke();
  }
  if (cells.lava.length) {
    for (const i of cells.lava) {
      if (!inView(i)) continue;
      const x = (i % w) * cell;
      const y = Math.floor(i / w) * cell;
      const p = phase(i);
      // a breathing glow
      const glow = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.6 + p * 6.28));
      ctx.fillStyle = `rgba(255, 196, 64, ${glow.toFixed(3)})`;
      ctx.fillRect(x, y, cell, cell);
      // a spark rising now and then
      const life = (t * 0.35 + p) % 1;
      if (life < 0.5) {
        const a = 1 - life * 2;
        ctx.fillStyle = `rgba(255, 236, 160, ${(a * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + cell * (0.2 + 0.6 * phase(i + 7)), y + cell * (0.8 - life), cell * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

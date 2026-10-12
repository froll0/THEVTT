/**
 * A hex grid over the map, in the map's own cell units: pointy-top hexes one
 * cell wide, odd rows shifted half a hex. The map underneath (fog, terrain,
 * walls) stays square; hexes are where tokens stand and how distance counts.
 */
export const HEX_SIZE = 1 / Math.sqrt(3);
/** distance between two rows of hexes */
export const HEX_ROW = 1.5 * HEX_SIZE;

export interface Hex {
  q: number;
  r: number;
}

/** The centre of a hex, in cells. */
export function hexCenter(h: Hex): { x: number; y: number } {
  return { x: Math.sqrt(3) * HEX_SIZE * (h.q + h.r / 2) + 0.5, y: HEX_ROW * h.r + HEX_SIZE };
}

/** The hex a point (in cells) falls in. */
export function hexAt(x: number, y: number): Hex {
  const px = x - 0.5;
  const py = y - HEX_SIZE;
  const fq = ((Math.sqrt(3) / 3) * px - py / 3) / HEX_SIZE;
  const fr = ((2 / 3) * py) / HEX_SIZE;
  // cube rounding
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 };
}

/** Steps between two hexes. */
export function hexDistance(a: Hex, b: Hex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

/** The six corners of a hex, in cells (for drawing). */
export function hexCorners(h: Hex): { x: number; y: number }[] {
  const c = hexCenter(h);
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: c.x + HEX_SIZE * Math.cos(a), y: c.y + HEX_SIZE * Math.sin(a) };
  });
}

/** Every hex whose centre lies on a map of w × h cells. */
export function hexesIn(w: number, h: number): Hex[] {
  const out: Hex[] = [];
  const rows = Math.ceil(h / HEX_ROW) + 1;
  for (let r = 0; r < rows; r++) {
    const shift = -Math.floor(r / 2);
    for (let q = shift - 1; q < shift + w + 1; q++) {
      const c = hexCenter({ q, r });
      if (c.x > -0.5 && c.x < w + 0.5 && c.y > -0.5 && c.y < h + 0.5) out.push({ q, r });
    }
  }
  return out;
}

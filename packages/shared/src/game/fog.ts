/**
 * Fog of war mask: one character per cell ('1' revealed, '0' hidden), row-major.
 * Compact enough for 200 × 200 maps and trivially resizable.
 */

export interface Fog {
  enabled: boolean;
  revealed: string;
}

export function emptyMask(w: number, h: number, revealed = false): string {
  return (revealed ? '1' : '0').repeat(w * h);
}

export function isRevealed(fog: Fog | undefined, w: number, x: number, y: number): boolean {
  if (!fog?.enabled) return true;
  return fog.revealed[y * w + x] === '1';
}

export function paintRect(mask: string, w: number, h: number, rect: { x: number; y: number; w: number; h: number }, reveal: boolean): string {
  const chars = mask.split('');
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(w, Math.floor(rect.x + rect.w));
  const y1 = Math.min(h, Math.floor(rect.y + rect.h));
  const v = reveal ? '1' : '0';
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) chars[y * w + x] = v;
  return chars.join('');
}

/** A round brush dragged along the points (cell units): every cell whose centre it touches. */
export function paintStroke(mask: string, w: number, h: number, points: { x: number; y: number }[], radius: number, reveal: boolean): string {
  const chars = mask.split('');
  const v = reveal ? '1' : '0';
  const r2 = radius * radius;
  const segs = points.length === 1 ? [[points[0]!, points[0]!]] : points.slice(1).map((p, i) => [points[i]!, p]);
  for (const [a, b] of segs) {
    const x0 = Math.max(0, Math.floor(Math.min(a!.x, b!.x) - radius));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(a!.x, b!.x) + radius));
    const y0 = Math.max(0, Math.floor(Math.min(a!.y, b!.y) - radius));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(a!.y, b!.y) + radius));
    const dx = b!.x - a!.x;
    const dy = b!.y - a!.y;
    const len2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        const t = len2 ? Math.max(0, Math.min(1, ((cx - a!.x) * dx + (cy - a!.y) * dy) / len2)) : 0;
        const ex = a!.x + t * dx - cx;
        const ey = a!.y + t * dy - cy;
        if (ex * ex + ey * ey <= r2) chars[y * w + x] = v;
      }
  }
  return chars.join('');
}

/** Every cell whose centre falls inside the shape (cell units). */
export function paintPolygon(mask: string, w: number, h: number, points: { x: number; y: number }[], reveal: boolean): string {
  if (points.length < 3) return mask;
  const chars = mask.split('');
  const v = reveal ? '1' : '0';
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      // even-odd rule
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const pi = points[i]!;
        const pj = points[j]!;
        if (pi.y > cy !== pj.y > cy && cx < ((pj.x - pi.x) * (cy - pi.y)) / (pj.y - pi.y) + pi.x) inside = !inside;
      }
      if (inside) chars[y * w + x] = v;
    }
  return chars.join('');
}

/** Keeps the overlapping part when a scene is resized. */
export function resizeMask(mask: string, oldW: number, oldH: number, w: number, h: number): string {
  let out = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out += x < oldW && y < oldH ? (mask[y * oldW + x] ?? '0') : '0';
  }
  return out;
}

/** A token is visible to players if any of its cells is revealed. */
export function tokenVisible(fog: Fog | undefined, w: number, t: { x: number; y: number; size: number }): boolean {
  if (!fog?.enabled) return true;
  // tokens can sit between cells: check every cell they overlap
  const x0 = Math.floor(t.x + 0.01);
  const y0 = Math.floor(t.y + 0.01);
  const x1 = Math.ceil(t.x + t.size - 0.01);
  const y1 = Math.ceil(t.y + t.size - 0.01);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x >= 0 && x < w && isRevealed(fog, w, x, y)) return true;
  return false;
}

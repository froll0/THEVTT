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
  for (let dy = 0; dy < t.size; dy++) for (let dx = 0; dx < t.size; dx++) if (isRevealed(fog, w, t.x + dx, t.y + dy)) return true;
  return false;
}

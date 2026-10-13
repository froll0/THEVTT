/**
 * Lines the map's own grid up with the table's by pointing at it: two
 * opposite corners of a square (or of a block of squares), clicked on the
 * picture. Gives the pixels per square and the shift.
 */
export function calibrate(a: { x: number; y: number }, b: { x: number; y: number }, squares: number) {
  const n = Math.max(1, squares);
  const dx = Math.abs(b.x - a.x) / n;
  const dy = Math.abs(b.y - a.y) / n;
  // both sides when the user drew a square, the longer one when they drew a line
  const px = dx > 0 && dy > 0 && Math.abs(dx - dy) / Math.max(dx, dy) < 0.25 ? (dx + dy) / 2 : Math.max(dx, dy);
  if (px < 4) return null;
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  // the corner clicked falls on one of our grid lines
  const shift = (v: number) => {
    const f = (v / px) % 1;
    return Math.round((f > 0.5 ? 1 - f : -f) * 100) / 100;
  };
  return { px: Math.round(px * 100) / 100, offsetX: shift(left), offsetY: shift(top) };
}

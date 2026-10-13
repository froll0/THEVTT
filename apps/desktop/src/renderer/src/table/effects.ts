import type { AreaTemplate } from '@thevtt/shared';

/**
 * A spell's area as it lands: a flash of its colour that fills the shape,
 * sparks flying out, then gone. Everyone at the table sees it the moment the
 * area appears on the map.
 */
export interface Burst {
  t: Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle' | 'color'>;
  at: number;
}

export const BURST_MS = 1300;

const CONE_HALF = Math.atan(0.5);

function rgba(hex: string, a: number): string {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1] ?? 'ffb35c';
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

/** Sparks: the same ones for a burst, from its position. */
function sparks(b: Burst, count: number) {
  const out: { a: number; d: number; s: number }[] = [];
  let seed = Math.floor(b.t.x * 997 + b.t.y * 113 + b.at) % 2147483647 || 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) out.push({ a: rnd(), d: 0.4 + rnd() * 0.6, s: 0.5 + rnd() });
  return out;
}

/** Draws a burst in world space (cells × `cell`); false once it's over. */
export function drawBurst(ctx: CanvasRenderingContext2D, b: Burst, cell: number, now: number): boolean {
  const p = (now - b.at) / BURST_MS;
  if (p >= 1 || p < 0) return false;
  const { shape, x, y, size, angle, color } = b.t;
  const grow = 1 - Math.pow(1 - Math.min(1, p * 2.2), 3);
  const fade = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cx = x * cell;
  const cy = y * cell;
  const r = size * cell;
  if (shape === 'circle' || shape === 'square') {
    const rr = shape === 'circle' ? r * grow : (r / 2) * Math.SQRT2 * grow;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rr));
    g.addColorStop(0, rgba('#ffffff', 0.55 * fade));
    g.addColorStop(0.35, rgba(color, 0.55 * fade));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    else ctx.rect(cx - (r / 2) * grow, cy - (r / 2) * grow, r * grow, r * grow);
    ctx.fill();
    // the shock wave
    ctx.strokeStyle = rgba(color, 0.8 * fade);
    ctx.lineWidth = Math.max(2, cell * 0.12 * (1 - p));
    ctx.beginPath();
    ctx.arc(cx, cy, (shape === 'circle' ? r : r / 2) * Math.min(1, p * 1.6), 0, Math.PI * 2);
    ctx.stroke();
    for (const s of sparks(b, 28)) {
      const a = s.a * Math.PI * 2;
      const d = (shape === 'circle' ? r : r / 2) * s.d * grow;
      ctx.fillStyle = rgba(s.s > 1.2 ? '#ffffff' : color, fade);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1.5, cell * 0.05 * s.s * (1 - p * 0.6)), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === 'cone') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r * grow));
    g.addColorStop(0, rgba('#ffffff', 0.5 * fade));
    g.addColorStop(0.4, rgba(color, 0.5 * fade));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * grow, angle - CONE_HALF, angle + CONE_HALF);
    ctx.closePath();
    ctx.fill();
    for (const s of sparks(b, 22)) {
      const a = angle + (s.a - 0.5) * 2 * CONE_HALF;
      const d = r * s.d * grow;
      ctx.fillStyle = rgba(color, fade);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1.5, cell * 0.05 * s.s), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // a line: a bolt racing from the caster to its end
    const len = r * grow;
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    ctx.lineCap = 'round';
    for (const [w, a, col] of [
      [cell * 0.5, 0.35, color],
      [cell * 0.22, 0.7, color],
      [cell * 0.07, 0.9, '#ffffff'],
    ] as const) {
      ctx.strokeStyle = rgba(col, a * fade);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // a little zig-zag, like lightning
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        const jitter = i === steps ? 0 : (((i * 7919 + Math.floor(b.at)) % 13) / 13 - 0.5) * cell * 0.35;
        ctx.lineTo(cx + Math.cos(angle) * len * f - Math.sin(angle) * jitter, cy + Math.sin(angle) * len * f + Math.cos(angle) * jitter);
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#ffffff', 0.6 * fade);
    ctx.beginPath();
    ctx.arc(ex, ey, cell * 0.25 * (1 - p), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

import type { AreaTemplate, SpellElement } from '@thevtt/shared';

/**
 * A spell's area as it lands: a flash of its colour that fills the shape,
 * sparks flying out, then gone. Everyone at the table sees it the moment the
 * area appears on the map.
 */
export interface Burst {
  t: Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle' | 'color' | 'element'>;
  at: number;
}

export const BURST_MS = 1300;
/** a spell with an element lingers a little longer: embers rise, frost settles */
const ELEMENT_MS = 2100;

/** the colour of each element, for the area on the map too */
export const ELEMENT_COLOR: Record<SpellElement, string> = {
  fire: '#ff7a2a',
  cold: '#8fd8ff',
  lightning: '#a9c8ff',
  thunder: '#c4b5ff',
  acid: '#8fe04a',
  poison: '#6fbf3f',
  necrotic: '#8a5cc2',
  radiant: '#ffe28a',
  force: '#7d8cff',
  psychic: '#ff7ad9',
};

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
  const life = b.t.element ? ELEMENT_MS : BURST_MS;
  const p = (now - b.at) / life;
  if (p >= 1 || p < 0) return false;
  if (b.t.element) {
    // the flash itself is quicker than the particles that follow it
    const q = (now - b.at) / BURST_MS;
    if (q < 1) drawFlash(ctx, b, cell, q);
    drawElement(ctx, b, cell, p, now);
    return true;
  }
  drawFlash(ctx, b, cell, p);
  return true;
}

function drawFlash(ctx: CanvasRenderingContext2D, b: Burst, cell: number, p: number) {
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
}

/** a point inside the area, in pixels from its origin, from two numbers in 0..1 */
function inside(b: Burst, cell: number, u: number, v: number): [number, number] {
  const { shape, size, angle } = b.t;
  const r = size * cell;
  if (shape === 'circle') {
    const a = u * Math.PI * 2;
    const d = Math.sqrt(v) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }
  if (shape === 'square') return [(u - 0.5) * r, (v - 0.5) * r];
  if (shape === 'cone') {
    const a = angle + (u - 0.5) * 2 * CONE_HALF;
    const d = Math.sqrt(v) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }
  // a line, a cell wide
  const along = v * r;
  const across = (u - 0.5) * cell;
  return [Math.cos(angle) * along - Math.sin(angle) * across, Math.sin(angle) * along + Math.cos(angle) * across];
}

/** the same particles every frame of a burst */
function particles(b: Burst, count: number) {
  let seed = Math.floor(b.t.x * 7919 + b.t.y * 104729 + b.at * 13) % 2147483647 || 7;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({ u: rnd(), v: rnd(), w: rnd(), z: rnd() }));
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * Math.PI) / 3;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
}

function bolt(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, jag: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
  const steps = 7;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    const j = rnd() * jag;
    ctx.lineTo(x0 + (x1 - x0) * f + (nx / len) * j, y0 + (y1 - y0) * f + (ny / len) * j);
  }
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** What follows the flash: a different matter for each element. */
function drawElement(ctx: CanvasRenderingContext2D, b: Burst, cell: number, p: number, now: number) {
  const el = b.t.element!;
  const col = ELEMENT_COLOR[el];
  const cx = b.t.x * cell;
  const cy = b.t.y * cell;
  const fade = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
  const t = (now - b.at) / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  switch (el) {
    case 'fire': {
      // embers rising and flickering, yellow at first, red as they cool
      for (const k of particles(b, 70)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        const rise = t * cell * (0.6 + k.w * 1.2);
        const sway = Math.sin(t * 6 + k.z * 10) * cell * 0.12;
        const heat = Math.max(0, 1 - p * 1.4 - k.w * 0.2);
        const flick = 0.6 + 0.4 * Math.sin(now / 45 + k.z * 30);
        ctx.fillStyle = rgba(heat > 0.5 ? '#ffd66b' : heat > 0.2 ? '#ff8a2a' : '#c8381c', fade * flick);
        ctx.beginPath();
        ctx.arc(cx + dx + sway, cy + dy - rise, Math.max(1, cell * (0.035 + k.z * 0.05) * (1 - p * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cold': {
      // frost crystals drifting down and turning, a rime on the ground
      ctx.lineCap = 'round';
      for (const k of particles(b, 46)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        ctx.strokeStyle = rgba(k.w > 0.6 ? '#ffffff' : col, fade * 0.9);
        ctx.lineWidth = Math.max(1, cell * 0.02);
        star(ctx, cx + dx + Math.sin(t * 2 + k.z * 9) * cell * 0.1, cy + dy + t * cell * 0.25 * k.w, cell * (0.05 + k.z * 0.08), t * (k.w - 0.5) * 2);
      }
      break;
    }
    case 'lightning': {
      // bolts that strike, flash and strike again somewhere else
      const strikes = 5;
      ctx.lineCap = 'round';
      for (let i = 0; i < strikes; i++) {
        const k = particles(b, strikes * 2)[i]!;
        const when = (i / strikes) * 0.7;
        const life = p - when;
        if (life < 0 || life > 0.18) continue;
        const [dx, dy] = inside(b, cell, k.u, k.v);
        const [ex, ey] = inside(b, cell, k.w, k.z);
        const a = 1 - life / 0.18;
        for (const [w, alpha, c] of [
          [cell * 0.16, 0.35, col],
          [cell * 0.05, 0.95, '#ffffff'],
        ] as const) {
          ctx.strokeStyle = rgba(c, a * alpha);
          ctx.lineWidth = w;
          bolt(ctx, cx + dx, cy + dy, cx + ex, cy + ey, cell * 0.6, Math.floor(b.at + i * 977) || 1);
        }
      }
      break;
    }
    case 'thunder': {
      // three shock waves, one after the other, wider than the area
      const r = b.t.shape === 'circle' ? b.t.size * cell : (b.t.size * cell) / 2;
      for (let i = 0; i < 3; i++) {
        const q = p * 1.6 - i * 0.22;
        if (q <= 0 || q >= 1) continue;
        ctx.strokeStyle = rgba(col, (1 - q) * 0.8);
        ctx.lineWidth = Math.max(2, cell * 0.2 * (1 - q));
        ctx.beginPath();
        const [ox, oy] = b.t.shape === 'cone' || b.t.shape === 'line' ? [Math.cos(b.t.angle) * r * 0.5, Math.sin(b.t.angle) * r * 0.5] : [0, 0];
        ctx.arc(cx + ox, cy + oy, r * (0.2 + q * 1.1), 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'acid':
    case 'poison': {
      // acid bubbles that swell and burst; poison as clouds that spread
      for (const k of particles(b, el === 'acid' ? 40 : 22)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        const born = k.w * 0.5;
        const q = (p - born) / 0.5;
        if (q <= 0 || q >= 1) continue;
        if (el === 'acid') {
          ctx.strokeStyle = rgba(q > 0.85 ? '#ffffff' : col, (1 - q) * 0.95);
          ctx.lineWidth = Math.max(1, cell * 0.025);
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy - q * cell * 0.2, cell * (0.04 + q * 0.12 * (0.5 + k.z)), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const rr = cell * (0.3 + q * 0.9) * (0.6 + k.z * 0.6);
          const g = ctx.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, rr);
          g.addColorStop(0, rgba(k.z > 0.6 ? '#b07ad8' : col, 0.28 * (1 - q)));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx + dx + t * cell * 0.15 * (k.u - 0.5), cy + dy - t * cell * 0.08, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'necrotic': {
      // dark wisps drawn in, spiralling to the centre of the area
      ctx.globalCompositeOperation = 'source-over';
      const [mx, my] = inside(b, cell, 0.5, b.t.shape === 'circle' ? 0 : 0.5);
      for (const k of particles(b, 40)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        const pull = Math.min(1, p * (1 + k.w));
        const spin = pull * (2 + k.z * 2);
        const x = dx + (mx - dx) * pull;
        const y = dy + (my - dy) * pull;
        const rx = x * Math.cos(spin * 0.3) - y * Math.sin(spin * 0.3);
        const ry = x * Math.sin(spin * 0.3) + y * Math.cos(spin * 0.3);
        ctx.fillStyle = rgba(k.w > 0.5 ? '#1a0b24' : col, fade * 0.7);
        ctx.beginPath();
        ctx.arc(cx + rx, cy + ry, Math.max(1.5, cell * (0.05 + k.z * 0.07) * (1 - pull * 0.6)), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'radiant': {
      // rays from the heart of the area, motes of light floating up
      const [mx, my] = inside(b, cell, 0.5, b.t.shape === 'circle' ? 0 : 0.5);
      const reach = b.t.size * cell * (b.t.shape === 'circle' ? 1.1 : 0.7);
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.4;
        const l = reach * (0.5 + 0.5 * Math.sin(i * 2.3 + t * 3)) * Math.min(1, p * 3);
        ctx.strokeStyle = rgba(i % 2 ? '#ffffff' : col, fade * 0.45);
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        ctx.moveTo(cx + mx, cy + my);
        ctx.lineTo(cx + mx + Math.cos(a) * l, cy + my + Math.sin(a) * l);
        ctx.stroke();
      }
      for (const k of particles(b, 36)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        ctx.fillStyle = rgba(k.w > 0.5 ? '#ffffff' : col, fade * (0.5 + 0.5 * Math.sin(now / 90 + k.z * 20)));
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy - t * cell * 0.4 * k.w, Math.max(1, cell * 0.04 * (0.5 + k.z)), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'force':
    case 'psychic': {
      // force: shards flung outwards from rings of runes; psychic: thoughts spiralling
      const [mx, my] = inside(b, cell, 0.5, b.t.shape === 'circle' ? 0 : 0.5);
      for (const k of particles(b, 34)) {
        const [dx, dy] = inside(b, cell, k.u, k.v);
        let x = dx;
        let y = dy;
        if (el === 'psychic') {
          const a = Math.atan2(dy - my, dx - mx) + t * (1.5 + k.w * 2);
          const d = Math.hypot(dx - mx, dy - my) * (1 - p * 0.5);
          x = mx + Math.cos(a) * d;
          y = my + Math.sin(a) * d;
        } else {
          x = mx + (dx - mx) * (0.3 + p * 0.9);
          y = my + (dy - my) * (0.3 + p * 0.9);
        }
        ctx.fillStyle = rgba(k.z > 0.65 ? '#ffffff' : col, fade * 0.9);
        ctx.save();
        ctx.translate(cx + x, cy + y);
        ctx.rotate(k.w * 6 + t * 3);
        const sz = Math.max(1.5, cell * (0.04 + k.z * 0.06));
        ctx.beginPath();
        if (el === 'force') {
          ctx.moveTo(0, -sz * 1.6);
          ctx.lineTo(sz * 0.6, 0);
          ctx.lineTo(0, sz * 1.6);
          ctx.lineTo(-sz * 0.6, 0);
        } else ctx.arc(0, 0, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}

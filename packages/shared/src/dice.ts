/**
 * Dice notation: `1d20+5`, `2d20kh1` (advantage), `4d6dl1`, `d%`, `3d8-1d4+2`.
 * Supported modifiers: kh/kl (keep highest/lowest), dh/dl (drop highest/lowest), k = kh.
 *
 * Success pools (Warhammer: the Old World): `4d10s3` rolls four d10 and counts
 * those showing 3 or less; the term is worth its successes. Flags after the
 * target: `g` Gloriosa (failures rerolled once), `t` Tetra (successes rerolled
 * once; both together cancel out), `m` a magic test (nines are never rerolled).
 * `5d6h5` counts those showing 5 or more instead.
 *
 * Fudge dice (Fate): `4dF` rolls four dice showing −1, 0 or +1.
 *
 * Nimble attacks: `2d6n+3` rolls the damage, and the leftmost die is the
 * Primary Die: a 1 misses (the whole attack is worth nothing), its maximum is a
 * crit and it explodes (rolled again and added, again on the maximum). Flags
 * after `n`: `a2` advantage 2 (two more dice, the two lowest dropped), `d1`
 * disadvantage 1 (the highest dropped; ties drop from the left), `v` Vicious
 * (one more die every time crit damage is rolled), `x` can't crit.
 * `dd6` is a d66 (two d6: tens and ones; `dd6a1` with advantage), never misses
 * or crits; likewise `dd4` and `dd8`.
 */

export type Rng = (sides: number) => number;

export const cryptoRng: Rng = (sides) => {
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / sides) * sides;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    v = buf[0]!;
  } while (v >= limit);
  return (v % sides) + 1;
};

export interface DieRoll {
  value: number;
  dropped: boolean;
  /** in a success pool: whether this die counts */
  success?: boolean;
  /** the first result, when the die was rolled again (Gloriosa / Tetra) */
  was?: number;
  /** Nimble: a die added by an exploding crit or by Vicious */
  extra?: 'crit' | 'vicious';
}

export type RollPart =
  | {
      type: 'dice';
      sign: 1 | -1;
      count: number;
      sides: number;
      modifier?: string;
      rolls: DieRoll[];
      subtotal: number;
      /** a success pool: dice at or under this count */
      target?: number;
      /** Gloriosa or Tetra (after they cancel out) */
      pool?: 'glorious' | 'grim';
      /** nines rolled (the rule of nine in magic tests) */
      nines?: number;
      /** Fudge dice: values are −1, 0, +1 */
      fudge?: boolean;
      /** Nimble attack: the Primary Die's first result, missed or crit (how many explosions) */
      nimble?: { primary: number; miss: boolean; crits: number };
      /** d44/d66/d88: the dice read as tens and ones */
      tens?: boolean;
    }
  | { type: 'const'; sign: 1 | -1; value: number };

export interface RollResult {
  formula: string;
  total: number;
  parts: RollPart[];
  /** Nimble: the Primary Die came up 1, the attack does nothing */
  miss?: boolean;
  /** Nimble: the Primary Die came up its maximum */
  crit?: boolean;
}

const NIMBLE = /^(\d*)d(\d+)n((?:[ad]\d+|v|x)*)$/i;
const TENS = /^dd(4|6|8)(?:a(\d+))?$/i;

/** n extra dice, the lowest (or highest) dropped; ties drop from the left */
function dropExtra(rolls: DieRoll[], n: number, highest: boolean): void {
  for (let k = 0; k < n; k++) {
    let at = -1;
    rolls.forEach((r, i) => {
      if (r.dropped) return;
      if (at < 0 || (highest ? r.value > rolls[at]!.value : r.value < rolls[at]!.value)) at = i;
    });
    if (at >= 0) rolls[at]!.dropped = true;
  }
}

export class DiceError extends Error {}

const MAX_DICE = 100;
const MAX_SIDES = 1000;
const TERM = /^(\d*)d(\d+|%)(?:(kh|kl|dh|dl|k)(\d+))?$|^(\d+)$|^(\d*)d(\d+)([sh])(\d+)([gtm]*)$/i;

export function roll(formula: string, rng: Rng = cryptoRng): RollResult {
  const clean = formula.replace(/\s+/g, '').toLowerCase();
  if (!clean) throw new DiceError('Formula vuota');
  const tokens = clean.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== clean) throw new DiceError(`Formula non valida: ${formula}`);

  const parts: RollPart[] = [];
  let total = 0;
  for (const raw of tokens) {
    const sign: 1 | -1 = raw.startsWith('-') ? -1 : 1;
    const body = raw.replace(/^[+-]/, '');
    const f = /^(\d*)df$/i.exec(body);
    if (f) {
      const count = f[1] ? Number(f[1]) : 1;
      if (count < 1 || count > MAX_DICE) throw new DiceError(`Numero di dadi fuori limite (1-${MAX_DICE})`);
      const rolls: DieRoll[] = Array.from({ length: count }, () => ({ value: rng(3) - 2, dropped: false }));
      const subtotal = rolls.reduce((s, r) => s + r.value, 0);
      parts.push({ type: 'dice', sign, count, sides: 3, modifier: 'F', rolls, subtotal, fudge: true });
      total += sign * subtotal;
      continue;
    }
    const nb = NIMBLE.exec(body);
    if (nb) {
      const count = nb[1] ? Number(nb[1]) : 1;
      const sides = Number(nb[2]);
      if (count < 1 || count > MAX_DICE) throw new DiceError(`Numero di dadi fuori limite (1-${MAX_DICE})`);
      if (sides < 2 || sides > MAX_SIDES) throw new DiceError(`Facce fuori limite (2-${MAX_SIDES})`);
      const flags = nb[3]!.toLowerCase();
      const adv = [...flags.matchAll(/a(\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
      const dis = [...flags.matchAll(/d(\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
      // each advantage cancels a disadvantage
      const net = Math.max(-20, Math.min(20, adv - dis));
      const vicious = flags.includes('v');
      const noCrit = flags.includes('x');
      const rolls: DieRoll[] = Array.from({ length: count + Math.abs(net) }, () => ({ value: rng(sides), dropped: false }));
      dropExtra(rolls, Math.abs(net), net < 0);
      const primary = rolls.find((r) => !r.dropped)!;
      const miss = primary.value === 1;
      let crits = 0;
      if (!miss && !noCrit && primary.value === sides) {
        // exploding: again on every maximum, a Vicious die each time
        let last = sides;
        while (last === sides && crits < 50) {
          crits++;
          last = rng(sides);
          rolls.push({ value: last, dropped: false, extra: 'crit' });
          if (vicious) rolls.push({ value: rng(sides), dropped: false, extra: 'vicious' });
        }
      }
      const subtotal = rolls.reduce((t, r) => t + (r.dropped ? 0 : r.value), 0);
      parts.push({ type: 'dice', sign, count, sides, modifier: `n${flags}`, rolls, subtotal, nimble: { primary: primary.value, miss, crits } });
      total += sign * subtotal;
      continue;
    }
    const td = TENS.exec(body);
    if (td) {
      const sides = Number(td[1]);
      const adv = Number(td[2] ?? 0);
      const rolls: DieRoll[] = Array.from({ length: 2 + Math.min(adv, 10) }, () => ({ value: rng(sides), dropped: false }));
      dropExtra(rolls, Math.min(adv, 10), false);
      const kept = rolls.filter((r) => !r.dropped);
      const subtotal = kept[0]!.value * 10 + kept[1]!.value;
      parts.push({ type: 'dice', sign, count: 2, sides, modifier: `dd${sides}`, rolls, subtotal, tens: true });
      total += sign * subtotal;
      continue;
    }
    const m = TERM.exec(body);
    if (!m) throw new DiceError(`Termine non valido: ${body}`);

    if (m[5] !== undefined) {
      const value = Number(m[5]);
      parts.push({ type: 'const', sign, value });
      total += sign * value;
      continue;
    }

    if (m[9] !== undefined) {
      const count = m[6] ? Number(m[6]) : 1;
      const sides = Number(m[7]);
      // s: a success at or under the target; h: at or over it
      const high = m[8]!.toLowerCase() === 'h';
      const target = Number(m[9]);
      const hit = (v: number) => (high ? v >= target : v <= target);
      if (count < 1 || count > MAX_DICE) throw new DiceError(`Numero di dadi fuori limite (1-${MAX_DICE})`);
      if (sides < 2 || sides > MAX_SIDES) throw new DiceError(`Facce fuori limite (2-${MAX_SIDES})`);
      const flags = (m[10] ?? '').toLowerCase();
      const g = flags.includes('g');
      const t = flags.includes('t');
      const magic = flags.includes('m');
      const pool = g && !t ? 'glorious' : t && !g ? 'grim' : undefined;
      const rolls: DieRoll[] = Array.from({ length: count }, () => {
        const value = rng(sides);
        return { value, dropped: false, success: hit(value) };
      });
      if (pool) {
        for (const d of rolls) {
          // in magic tests a nine stays where it fell
          if (magic && d.value === 9) continue;
          if ((pool === 'glorious' && !d.success) || (pool === 'grim' && d.success)) {
            d.was = d.value;
            d.value = rng(sides);
            d.success = hit(d.value);
          }
        }
      }
      const subtotal = rolls.filter((d) => d.success).length;
      const nines = sides === 10 ? rolls.filter((d) => d.value === 9).length : undefined;
      parts.push({ type: 'dice', sign, count, sides, modifier: `${high ? 'h' : 's'}${target}${flags}`, rolls, subtotal, target, pool, nines });
      total += sign * subtotal;
      continue;
    }

    const count = m[1] ? Number(m[1]) : 1;
    const sides = m[2] === '%' ? 100 : Number(m[2]);
    if (count < 1 || count > MAX_DICE) throw new DiceError(`Numero di dadi fuori limite (1-${MAX_DICE})`);
    if (sides < 2 || sides > MAX_SIDES) throw new DiceError(`Facce fuori limite (2-${MAX_SIDES})`);

    const rolls: DieRoll[] = Array.from({ length: count }, () => ({ value: rng(sides), dropped: false }));
    const op = m[3]?.toLowerCase();
    if (op) {
      const n = Number(m[4]);
      if (n < 1 || n > count) throw new DiceError(`Modificatore ${op}${n} non valido per ${count} dadi`);
      const order = rolls.map((r, i) => ({ v: r.value, i })).sort((a, b) => a.v - b.v || a.i - b.i);
      let drop: { i: number }[];
      if (op === 'kh' || op === 'k') drop = order.slice(0, count - n);
      else if (op === 'kl') drop = order.slice(n);
      else if (op === 'dh') drop = order.slice(count - n);
      else drop = order.slice(0, n);
      for (const d of drop) rolls[d.i]!.dropped = true;
    }
    const subtotal = rolls.reduce((s, r) => s + (r.dropped ? 0 : r.value), 0);
    parts.push({ type: 'dice', sign, count, sides, modifier: op ? `${op}${m[4]}` : undefined, rolls, subtotal });
    total += sign * subtotal;
  }
  // a Nimble attack: the Primary Die (of the first attack term) decides
  const first = parts.find((p) => p.type === 'dice' && p.nimble);
  if (first && first.type === 'dice' && first.nimble) {
    if (first.nimble.miss) return { formula: clean, total: 0, parts, miss: true };
    return { formula: clean, total: Math.max(0, total), parts, crit: first.nimble.crits > 0 };
  }
  return { formula: clean, total, parts };
}

/** Human readable breakdown, e.g. `[17, ~~4~~] + 5`. */
export function describeRoll(r: RollResult): string {
  return r.parts
    .map((p, idx) => {
      const sign = p.sign < 0 ? '- ' : idx > 0 ? '+ ' : '';
      if (p.type === 'const') return `${sign}${p.value}`;
      if (p.fudge) return `${sign}[${p.rolls.map((d) => (d.value > 0 ? '+' : d.value < 0 ? '−' : '0')).join(' ')}]`;
      if (p.target !== undefined) return `${sign}[${p.rolls.map((d) => `${d.was !== undefined ? `${d.was}→` : ''}${d.value}${d.success ? '✓' : ''}`).join(', ')}]`;
      if (p.tens) return `${sign}[${p.rolls.map((d) => (d.dropped ? `~${d.value}~` : String(d.value))).join('')}]`;
      return `${sign}[${p.rolls.map((d) => (d.dropped ? `~${d.value}~` : d.extra === 'crit' ? `💥${d.value}` : d.extra === 'vicious' ? `+${d.value}` : String(d.value))).join(', ')}]`;
    })
    .join(' ');
}

export function isNat(r: RollResult, value: number): boolean {
  const d20 = r.parts.find((p) => p.type === 'dice' && p.sides === 20);
  if (!d20 || d20.type !== 'dice') return false;
  return d20.rolls.some((x) => !x.dropped && x.value === value);
}

/** Successes of the pools in a roll (constants count as automatic successes). */
export function successes(r: RollResult): number | null {
  return r.parts.some((p) => p.type === 'dice' && p.target !== undefined) ? r.total : null;
}

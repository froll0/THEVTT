/**
 * Dice notation: `1d20+5`, `2d20kh1` (advantage), `4d6dl1`, `d%`, `3d8-1d4+2`.
 * Supported modifiers: kh/kl (keep highest/lowest), dh/dl (drop highest/lowest), k = kh.
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
}

export type RollPart =
  | { type: 'dice'; sign: 1 | -1; count: number; sides: number; modifier?: string; rolls: DieRoll[]; subtotal: number }
  | { type: 'const'; sign: 1 | -1; value: number };

export interface RollResult {
  formula: string;
  total: number;
  parts: RollPart[];
}

export class DiceError extends Error {}

const MAX_DICE = 100;
const MAX_SIDES = 1000;
const TERM = /^(\d*)d(\d+|%)(?:(kh|kl|dh|dl|k)(\d+))?$|^(\d+)$/i;

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
    const m = TERM.exec(body);
    if (!m) throw new DiceError(`Termine non valido: ${body}`);

    if (m[5] !== undefined) {
      const value = Number(m[5]);
      parts.push({ type: 'const', sign, value });
      total += sign * value;
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
  return { formula: clean, total, parts };
}

/** Human readable breakdown, e.g. `[17, ~~4~~] + 5`. */
export function describeRoll(r: RollResult): string {
  return r.parts
    .map((p, idx) => {
      const sign = p.sign < 0 ? '- ' : idx > 0 ? '+ ' : '';
      if (p.type === 'const') return `${sign}${p.value}`;
      return `${sign}[${p.rolls.map((d) => (d.dropped ? `~${d.value}~` : String(d.value))).join(', ')}]`;
    })
    .join(' ');
}

export function isNat(r: RollResult, value: number): boolean {
  const d20 = r.parts.find((p) => p.type === 'dice' && p.sides === 20);
  if (!d20 || d20.type !== 'dice') return false;
  return d20.rolls.some((x) => !x.dropped && x.value === value);
}

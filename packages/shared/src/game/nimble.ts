import type { RollResult } from '../dice';

/**
 * Nimble at the table: monster armour on a damage roll, the rushed-attack
 * disadvantage, a token's actions and Wounds.
 */
export interface NimbleToken {
  /** monsters: Medium (dice only) or Heavy (half the dice) armour */
  armor?: 'M' | 'H' | null;
  /** any damage kills it */
  minion?: boolean;
  /** heroes: Wounds taken and how many kill */
  wounds?: { current: number; max: number } | null;
  /** heroes: actions left this turn (3 back at the end of the turn) */
  actions?: number;
  /** attacks made this turn (each one after the first is rushed) */
  attacks?: number;
}

/** The sum of the dice of a roll, without the modifiers. */
export function diceOnly(r: RollResult): { dice: number; mods: number } {
  const dice = r.parts.reduce((s, p) => s + (p.type === 'dice' ? p.sign * p.subtotal : 0), 0);
  return { dice, mods: r.total - dice };
}

/**
 * Damage against a monster's armour: Medium takes the dice only (negative
 * modifiers still count), Heavy half the dice rounded up. Crits, save spells
 * and vulnerabilities ignore the armour.
 */
export function damageVsArmor(r: RollResult, armor: 'M' | 'H' | null | undefined, ignore = false): number {
  if (r.miss) return 0;
  if (!armor || ignore || r.crit) return Math.max(0, r.total);
  const { dice, mods } = diceOnly(r);
  const base = armor === 'H' ? Math.ceil(dice / 2) : dice;
  return Math.max(0, base + Math.min(0, mods));
}

/** n more disadvantage on the attack term of a Nimble formula. */
export function addDisadvantage(formula: string, n: number): string {
  if (n <= 0) return formula;
  return formula.replace(/^(\d*d\d+n)/i, `$1d${n}`);
}

/** Starting actions from an initiative roll: one digit 1, two digits 2, 20+ (or a natural 20) all 3. */
export function actionsFromInitiative(total: number, natural20 = false): number {
  return natural20 || total >= 20 ? 3 : total >= 10 ? 2 : 1;
}

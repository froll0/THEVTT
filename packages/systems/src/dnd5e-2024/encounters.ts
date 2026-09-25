/**
 * Encounter difficulty as in the 2024 rules: each character adds an XP
 * budget for its level; the monsters' XP (no multipliers) is compared with
 * the party's Low, Moderate and High budgets.
 */

/** XP budget per character, by level: [low, moderate, high] */
export const XP_BUDGET: Record<number, [number, number, number]> = {
  1: [50, 75, 100],
  2: [100, 150, 200],
  3: [150, 225, 400],
  4: [250, 375, 500],
  5: [500, 750, 1100],
  6: [600, 1000, 1400],
  7: [750, 1300, 1700],
  8: [1000, 1700, 2100],
  9: [1300, 2000, 2600],
  10: [1600, 2300, 3100],
  11: [1900, 2900, 4100],
  12: [2200, 3700, 4700],
  13: [2600, 4200, 5400],
  14: [2900, 4900, 6200],
  15: [3300, 5400, 7800],
  16: [3800, 6100, 9800],
  17: [4500, 7200, 11700],
  18: [5000, 8700, 14200],
  19: [5500, 10700, 17200],
  20: [6400, 13200, 22000],
};

export type EncounterDifficulty = 'trivial' | 'low' | 'moderate' | 'high' | 'deadly';

export const DIFFICULTY_LABELS: Record<EncounterDifficulty, string> = {
  trivial: 'Banale',
  low: 'Bassa',
  moderate: 'Moderata',
  high: 'Alta',
  deadly: 'Oltre il limite',
};

export function partyBudget(levels: number[]): { low: number; moderate: number; high: number } {
  const out = { low: 0, moderate: 0, high: 0 };
  for (const l of levels) {
    const b = XP_BUDGET[Math.max(1, Math.min(20, Math.round(l)))]!;
    out.low += b[0];
    out.moderate += b[1];
    out.high += b[2];
  }
  return out;
}

/** Where an encounter worth `xp` sits for this party. */
export function encounterDifficulty(levels: number[], xp: number): EncounterDifficulty {
  if (!levels.length) return 'trivial';
  const b = partyBudget(levels);
  if (xp > b.high) return 'deadly';
  if (xp > b.moderate) return 'high';
  if (xp > b.low) return 'moderate';
  if (xp >= b.low * 0.5) return 'low';
  return 'trivial';
}

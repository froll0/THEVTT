import { describe, expect, it } from 'vitest';
import { DiceError, describeRoll, roll, type Rng } from '../src/dice';

const seq = (...values: number[]): Rng => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('roll', () => {
  it('sums dice and constants', () => {
    const r = roll('2d6 + 3', seq(4, 5));
    expect(r.total).toBe(12);
    expect(describeRoll(r)).toBe('[4, 5] + 3');
  });

  it('handles advantage (kh1) and disadvantage (kl1)', () => {
    expect(roll('2d20kh1', seq(7, 15)).total).toBe(15);
    expect(roll('2d20kl1', seq(7, 15)).total).toBe(7);
  });

  it('drops lowest for 4d6dl1', () => {
    const r = roll('4d6dl1', seq(1, 6, 3, 1));
    expect(r.total).toBe(10);
    const dice = r.parts[0];
    expect(dice?.type === 'dice' && dice.rolls.filter((d) => d.dropped).length).toBe(1);
  });

  it('supports subtraction, bare d and d%', () => {
    expect(roll('d20-1d4-2', seq(10, 3)).total).toBe(5);
    expect(roll('d%', seq(42)).total).toBe(42);
  });

  it('rejects invalid formulas', () => {
    expect(() => roll('')).toThrow(DiceError);
    expect(() => roll('2x6')).toThrow(DiceError);
    expect(() => roll('1000d6')).toThrow(DiceError);
    expect(() => roll('2d20kh3')).toThrow(DiceError);
  });

  it('crypto rng stays within bounds', () => {
    for (let i = 0; i < 500; i++) {
      const v = roll('1d6').total;
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

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

describe('success pools', () => {
  it('counts dice at or under the target', () => {
    const r = roll('4d10s3', seq(2, 7, 3, 10));
    expect(r.total).toBe(2);
    expect(describeRoll(r)).toBe('[2✓, 7, 3✓, 10]');
  });

  it('Gloriosa rerolls the failures once, Tetra the successes', () => {
    expect(roll('3d10s4g', seq(1, 8, 9, 2, 6)).total).toBe(2);
    expect(roll('3d10s4t', seq(1, 8, 2, 9, 3)).total).toBe(1);
    // both at once cancel out: no rerolls
    expect(roll('2d10s4gt', seq(1, 8, 2, 2)).total).toBe(1);
  });

  it('keeps nines in magic tests and counts them', () => {
    const r = roll('3d10s5gm', seq(9, 7, 2, 1));
    const p = r.parts[0]!;
    expect(p.type === 'dice' && p.nines).toBe(1);
    expect(p.type === 'dice' && p.rolls[0]!.was).toBeUndefined();
    // 9 stays, 7 becomes a 1, 2 already succeeded
    expect(r.total).toBe(2);
  });

  it('adds constants as automatic successes', () => {
    expect(roll('2d10s5+1', seq(1, 9)).total).toBe(2);
  });
});

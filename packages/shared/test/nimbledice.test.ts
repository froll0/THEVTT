import { describe, expect, it } from 'vitest';
import { roll, type Rng } from '../src';

/** dice coming up in this order */
const seq = (...v: number[]): Rng => {
  let i = 0;
  return () => v[i++ % v.length]!;
};

describe('Nimble attacks', () => {
  it('a 1 on the Primary Die misses: the attack is worth nothing', () => {
    const r = roll('2d6n+3', seq(1, 6));
    expect(r.miss).toBe(true);
    expect(r.total).toBe(0);
  });
  it('the maximum explodes, again and again', () => {
    const r = roll('1d8n+2', seq(8, 8, 3));
    expect(r.crit).toBe(true);
    expect(r.total).toBe(8 + 8 + 3 + 2);
  });
  it('Vicious: one more die each time crit damage is rolled', () => {
    const r = roll('1d6nv', seq(6, 2, 4));
    expect(r.total).toBe(6 + 2 + 4);
  });
  it('advantage drops the lowest, disadvantage the highest; the leftmost kept die is primary', () => {
    // Greataxe with advantage: 1, 5, 4 → the 1 goes, primary 5
    const a = roll('2d6na1', seq(1, 5, 4));
    expect(a.miss).toBeFalsy();
    expect(a.total).toBe(9);
    // disadvantage 2 on 2d6: 6, 1, 6, 3 → both sixes go (from the left), primary 1: miss
    const d = roll('2d6nd2', seq(6, 1, 6, 3));
    expect(d.miss).toBe(true);
    // one advantage cancels one disadvantage
    expect(roll('1d8na1d1', seq(5)).total).toBe(5);
  });
  it('can’t crit: the maximum is just damage', () => {
    expect(roll('1d6nx', seq(6, 6)).total).toBe(6);
  });
  it('d66: tens and ones, never misses', () => {
    expect(roll('dd6', seq(1, 5)).total).toBe(15);
    expect(roll('dd6a1', seq(2, 3, 4)).total).toBe(34);
  });
});

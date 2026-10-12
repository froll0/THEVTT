import { describe, expect, it } from 'vitest';
import { hexAt, hexCenter, hexDistance, hexesIn } from '../src';

describe('hex grid', () => {
  it('a hex centre falls back in its own hex', () => {
    for (let q = -3; q < 6; q++) for (let r = 0; r < 6; r++) expect(hexAt(hexCenter({ q, r }).x, hexCenter({ q, r }).y)).toEqual({ q, r });
  });

  it('counts steps between hexes', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 3 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(hexDistance({ q: 1, r: 1 }, { q: 1, r: 1 })).toBe(0);
  });

  it('covers the whole map', () => {
    const all = hexesIn(10, 8);
    expect(all.length).toBeGreaterThan(80);
    for (const [x, y] of [
      [0.2, 0.2],
      [9.8, 7.8],
      [5, 4],
    ] as const) {
      const h = hexAt(x, y);
      expect(all.some((a) => a.q === h.q && a.r === h.r)).toBe(true);
    }
  });
});

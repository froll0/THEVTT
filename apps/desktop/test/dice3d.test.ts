import { describe, expect, it } from 'vitest';
import { diceFor, labelsFor, shape, simulate, upIndex, type DieKind } from '../src/renderer/src/lib/dice3d';

const KINDS: DieKind[] = [4, 6, 8, 10, 12, 20];

describe('3D dice', () => {
  it('builds every die with the right number of faces', () => {
    const faces = KINDS.map((k) => shape(k).faces.length);
    expect(faces).toEqual([4, 6, 8, 10, 12, 20]);
    // d10 kites are planar quadrilaterals
    expect(shape(10).faces.every((f) => f.length === 4)).toBe(true);
    expect(shape(12).faces.every((f) => f.length === 5)).toBe(true);
  });

  it('lands on a face and relabels it with the forced value', () => {
    for (const k of KINDS) {
      const frames = simulate([k], { x0: -6, x1: 6, z0: -4, z1: 4 });
      const last = frames[0]!.at(-1)!;
      const up = upIndex(k, { x: last.q[0], y: last.q[1], z: last.q[2], w: last.q[3] });
      const value = k === 10 ? 7 : k;
      const labels = labelsFor(k, up, value);
      expect(labels[up]).toBe(value);
      // still a permutation of all the faces
      expect(new Set(labels).size).toBe(labels.length);
      // the dice stay on the table
      expect(Math.abs(last.p[0])).toBeLessThan(6);
      expect(last.p[1]).toBeGreaterThan(0);
      expect(last.p[1]).toBeLessThan(1.5);
    }
  });

  it('turns roll parts into dice, d100 as two d10', () => {
    const dice = diceFor([
      { type: 'dice', sides: 20, rolls: [{ value: 17, dropped: false }, { value: 3, dropped: true }] },
      { type: 'const' },
      { type: 'dice', sides: 100, rolls: [{ value: 100, dropped: false }] },
      { type: 'dice', sides: 3, rolls: [{ value: 2, dropped: false }] },
    ]);
    expect(dice).toEqual([
      { sides: 20, value: 17, dim: false },
      { sides: 20, value: 3, dim: true },
      { sides: 10, value: 100, labels: 'tens', dim: false },
      { sides: 10, value: 0, dim: false },
    ]);
  });
});

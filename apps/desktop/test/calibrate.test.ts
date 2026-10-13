import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/renderer/src/lib/calibrate';

describe('grid calibration', () => {
  it('one square: pixels per square and the shift that puts its corner on our grid', () => {
    // squares of 100 px starting 30 px in
    expect(calibrate({ x: 130, y: 230 }, { x: 230, y: 330 }, 1)).toEqual({ px: 100, offsetX: -0.3, offsetY: -0.3 });
    // a block of 5 × 5, clicked the other way round
    expect(calibrate({ x: 580, y: 590 }, { x: 80, y: 90 }, 5)).toEqual({ px: 100, offsetX: 0.2, offsetY: 0.1 });
  });
  it('points too close: nothing', () => {
    expect(calibrate({ x: 10, y: 10 }, { x: 12, y: 11 }, 1)).toBeNull();
  });
});

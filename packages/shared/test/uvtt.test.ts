import { describe, expect, it } from 'vitest';
import { describePackage, fromUniversalVtt, isMapPackage, isUniversalVtt } from '../src';

const dd2vtt = {
  format: 0.3,
  resolution: { map_origin: { x: 1, y: 1 }, map_size: { x: 10, y: 8 }, pixels_per_grid: 256 },
  line_of_sight: [
    [
      { x: 1, y: 1 },
      { x: 11, y: 1 },
      { x: 11, y: 9 },
    ],
  ],
  objects_line_of_sight: [],
  portals: [{ position: { x: 4, y: 1 }, bounds: [{ x: 3.5, y: 1 }, { x: 4.5, y: 1 }], rotation: 0, closed: true, freestanding: false }],
  lights: [{ position: { x: 6, y: 5 }, range: 6, intensity: 1, color: 'ffff9900', shadows: true }],
  environment: { baked_lighting: true, ambient_light: 'ff202020' },
  image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
};

describe('Universal VTT maps (Dungeondraft, Dungeon Alchemist…)', () => {
  it('become a map of ours: picture at its grid, walls, doors and lights', () => {
    expect(isUniversalVtt(dd2vtt)).toBe(true);
    expect(isUniversalVtt({ format: 'thevtt-map' })).toBe(false);
    const pkg = fromUniversalVtt(dd2vtt, 'Cripta');
    expect(isMapPackage(pkg)).toBe(true);
    expect(pkg.scene).toMatchObject({ widthCells: 10, heightCells: 8, bgCellPx: 256, vision: true, ambient: 'dark', background: 'map' });
    expect(pkg.assets.map).toMatch(/^data:image\/png;base64,iVBOR/);
    // the origin is taken away: walls start at 0
    expect(pkg.walls.filter((w) => w.kind === 'wall')).toEqual([
      { x1: 0, y1: 0, x2: 10, y2: 0, kind: 'wall' },
      { x1: 10, y1: 0, x2: 10, y2: 8, kind: 'wall' },
    ]);
    expect(pkg.walls.find((w) => w.kind === 'door')).toMatchObject({ x1: 2.5, x2: 3.5, y1: 0, y2: 0 });
    expect(pkg.props[0]).toMatchObject({ kind: 'light', x: 4.75, y: 3.75, light: { bright: 3, dim: 6, color: '#ff9900' } });
    expect(describePackage(pkg)).toMatchObject({ walls: 3, doors: 1, picture: true });
  });
});

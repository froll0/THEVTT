import { describe, expect, it } from 'vitest';
import {
  autoRivers,
  autoSymbols,
  autoTowns,
  biomeAt,
  brushHeights,
  contours,
  createWorld,
  decodeField,
  elevation,
  encodeField,
  generateWorld,
  isWorldMap,
  normalizeWorld,
  paintBiome,
  placeName,
  seededRng,
  simplify,
  traceRiver,
  worldBiomes,
  worldHeights,
  worldSceneCells,
} from '../src';

const world = (shape: 'continent' | 'islands' | 'archipelago' | 'coast' | 'pangea' = 'continent', seed = 42) =>
  generateWorld(createWorld({ id: 'w', name: 'Prova', width: 800, height: 560 }), { seed, shape, land: 0.4, roughness: 0.5 });

const landShare = (w: ReturnType<typeof world>) => {
  const h = worldHeights(w);
  return h.reduce((n, v) => n + (v >= w.seaLevel * 255 ? 1 : 0), 0) / h.length;
};

describe('world maps', () => {
  it('fields go to text and back', () => {
    const f = new Uint8Array([0, 1, 127, 128, 255, 42]);
    expect([...decodeField(encodeField(f), 6)]).toEqual([...f]);
    // a broken field comes back flat, not as an error
    expect([...decodeField('%%%', 3)]).toEqual([0, 0, 0]);
  });

  it('the generator is repeatable and gives the land share asked', () => {
    const a = world();
    const b = world();
    expect(a.heights).toBe(b.heights);
    expect(world('continent', 7).heights).not.toBe(a.heights);
    for (const shape of ['continent', 'islands', 'archipelago', 'coast', 'pangea'] as const) expect(Math.abs(landShare(world(shape)) - 0.4), shape).toBeLessThan(0.03);
    // a continent keeps its edges at sea
    const h = worldHeights(a);
    expect(h[0]! < a.seaLevel * 255).toBe(true);
    expect(isWorldMap(a)).toBe(true);
    expect(isWorldMap({ format: 'thevtt-world' })).toBe(false);
  });

  it('coasts are closed loops around the land', () => {
    const w = world('islands');
    const loops = contours(worldHeights(w), w.cols, w.rows, w.seaLevel * 255);
    expect(loops.length).toBeGreaterThan(1);
    for (const l of loops) {
      const [fx, fy] = l[0]!;
      const [lx, ly] = l[l.length - 1]!;
      expect(Math.hypot(fx - lx, fy - ly)).toBeLessThan(0.01);
    }
    // a single raised cell on a flat sea: one small loop around it
    const f = new Uint8Array(25);
    f[12] = 255;
    const one = contours(f, 5, 5, 128);
    expect(one).toHaveLength(1);
    for (const [x, y] of one[0]!) expect(Math.hypot(x - 2.5, y - 2.5)).toBeLessThanOrEqual(0.51);
  });

  it('brushes raise, lower, smooth and flatten the ground', () => {
    const cols = 20;
    const f = new Uint8Array(cols * cols).fill(100);
    brushHeights(f, cols, cols, 10, 10, 4, 'raise', 1);
    expect(f[10 * cols + 10]).toBeGreaterThan(120);
    expect(f[0]).toBe(100);
    const peak = f[10 * cols + 10]!;
    brushHeights(f, cols, cols, 10, 10, 4, 'smooth', 1);
    expect(f[10 * cols + 10]).toBeLessThan(peak);
    brushHeights(f, cols, cols, 10, 10, 6, 'flatten', 1, 100);
    brushHeights(f, cols, cols, 10, 10, 6, 'flatten', 1, 100);
    expect(Math.abs(f[10 * cols + 10]! - 100)).toBeLessThan(6);
    brushHeights(f, cols, cols, 10, 10, 4, 'lower', 1);
    expect(f[10 * cols + 10]).toBeLessThan(100);
  });

  it('biomes: from height and climate, or painted', () => {
    const w = world();
    const h = worldHeights(w);
    const b = worldBiomes(w);
    let land = -1;
    let sea = -1;
    for (let i = 0; i < h.length && (land < 0 || sea < 0); i++) {
      if (elevation(h[i]!, w.seaLevel) > 0.1 && elevation(h[i]!, w.seaLevel) < 0.4) land = i;
      if (h[i]! < 60) sea = i;
    }
    const at = (i: number) => biomeAt(w, h, b, i % w.cols, Math.floor(i / w.cols));
    expect(at(sea)).toBeNull();
    expect(at(land)).not.toBeNull();
    paintBiome(b, w.cols, w.rows, land % w.cols, Math.floor(land / w.cols), 1, 4);
    expect(at(land)).toBe('desert');
  });

  it('rivers run downhill to the sea', () => {
    const w = world();
    const h = worldHeights(w);
    const rivers = autoRivers(w, h, 4);
    expect(rivers.length).toBeGreaterThan(0);
    for (const r of rivers) {
      const [x, y] = r.points[r.points.length - 1]!;
      expect(h[Math.floor(y / w.res) * w.cols + Math.floor(x / w.res)]!).toBeLessThan(w.seaLevel * 255);
    }
    // a river from the sea is just its spring
    expect(traceRiver(w, h, 1, 1)).toHaveLength(1);
  });

  it('symbols follow the land: mountains high, nothing at sea', () => {
    const w = world('continent', 3);
    const h = worldHeights(w);
    const syms = autoSymbols(w, h, worldBiomes(w));
    expect(syms.some((s) => s.kind === 'mountain' || s.kind === 'peak')).toBe(true);
    for (const s of syms) expect(h[Math.floor(s.y / w.res) * w.cols + Math.floor(s.x / w.res)]!).toBeGreaterThanOrEqual(w.seaLevel * 255);
  });

  it('towns go on low land, spaced out, with a capital first and names', () => {
    const w = world('continent', 11);
    const h = worldHeights(w);
    const towns = autoTowns(w, h, 8);
    expect(towns.length).toBeGreaterThan(4);
    expect(towns[0]!.kind).toBe('capital');
    for (const t of towns) {
      expect(t.name).toMatch(/^[A-Z][a-z]+$/);
      expect(h[Math.floor(t.y / w.res) * w.cols + Math.floor(t.x / w.res)]!).toBeGreaterThanOrEqual(w.seaLevel * 255);
    }
  });

  it('names, simplified lines and the scene a world becomes', () => {
    const rng = seededRng(5);
    expect(placeName(rng, 'region')).toMatch(/^(Regno|Terre|Marca|Principato|Ducato|Libere città) di [A-Z]/);
    expect(simplify([[0, 0], [1, 0.01], [2, 0], [3, 0]], 0.1)).toEqual([[0, 0], [3, 0]]);
    const w = normalizeWorld({ ...createWorld({ id: 'w', name: 'X', width: 1000, height: 600 }), grid: { kind: 'hex', size: 40, color: '#000', opacity: 0.2 } });
    expect(worldSceneCells(w)).toEqual({ widthCells: 25, heightCells: 15, cellPx: 40 });
  });
});

import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, generateMap, mapToTerrain, T } from '../src';

const walkable = (t: number) => t === T.floor || t === T.corridor || t === T.path || t === T.grass;

/** every walkable cell reached from the start, without crossing walls */
function reachable(m: ReturnType<typeof generateMap>) {
  const seen = new Set<number>();
  const stack = [m.start.y * m.width + m.start.x];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    const x = c % m.width;
    const y = Math.floor(c / m.width);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
      const n = ny * m.width + nx;
      if (walkable(m.cells[n]!) && !seen.has(n)) stack.push(n);
    }
  }
  return seen;
}

describe('map generator', () => {
  it('makes the same map from the same seed, another from another', () => {
    const a = generateMap({ kind: 'dungeon', width: 32, height: 24, seed: 42 });
    const b = generateMap({ kind: 'dungeon', width: 32, height: 24, seed: 42 });
    const c = generateMap({ kind: 'dungeon', width: 32, height: 24, seed: 43 });
    expect(a).toEqual(b);
    expect(a.cells).not.toEqual(c.cells);
  });

  for (const kind of ['dungeon', 'cave', 'wilderness'] as const) {
    it(`builds a ${kind} where every floor can be reached`, () => {
      for (const seed of [1, 7, 99, 2026]) {
        const m = generateMap({ kind, width: 36, height: 26, seed });
        expect(m.cells).toHaveLength(36 * 26);
        expect(walkable(m.cells[m.start.y * m.width + m.start.x]!)).toBe(true);
        const floor = m.cells.filter(walkable).length;
        expect(floor).toBeGreaterThan(80);
        expect(reachable(m).size).toBe(floor);
        for (const w of m.walls) expect(w.x1 === w.x2 || w.y1 === w.y2).toBe(true);
        for (const p of m.props) expect(p.x >= 0 && p.y >= 0 && p.x < m.width && p.y < m.height).toBe(true);
      }
    });
  }

  it('closes dungeon rooms with walls and doors', () => {
    const m = generateMap({ kind: 'dungeon', width: 40, height: 30, seed: 5 });
    expect(m.rooms.length).toBeGreaterThanOrEqual(4);
    expect(m.walls.filter((w) => w.kind === 'door').length).toBeGreaterThan(0);
    expect(m.props.some((p) => p.kind === 'torch')).toBe(true);
    const plain = generateMap({ kind: 'dungeon', width: 40, height: 30, seed: 5, doors: false, lights: false, furniture: false });
    expect(plain.walls.some((w) => w.kind === 'door')).toBe(false);
    expect(plain.props).toEqual([]);
  });

  it('becomes a new scene with its walls in one batch', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    const host = new GameHost({ state, send: () => {}, rng: () => 0.5, now: () => 0 });
    const m = generateMap({ kind: 'dungeon', width: 30, height: 20, seed: 3 });
    const res = host.dispatch('gm', {
      type: 'batch',
      actions: [
        { type: 'scene.create', name: 'Cripta', id: 'gen-abc123' },
        { type: 'scene.activate', sceneId: 'gen-abc123' },
        { type: 'scene.update', sceneId: 'gen-abc123', patch: { widthCells: 30, heightCells: 20, vision: true, ambient: 'dark' } },
        { type: 'terrain.set', sceneId: 'gen-abc123', terrain: mapToTerrain(m) },
        { type: 'wall.create', walls: m.walls.filter((w) => w.kind === 'door') },
      ],
    });
    expect(res.ok).toBe(true);
    expect(host.state.activeSceneId).toBe('gen-abc123');
    // the painted map gives the same walls the generator drew
    const key = (w: { x1: number; y1: number; x2: number; y2: number }) => `${w.x1},${w.y1},${w.x2},${w.y2}`;
    const walls = Object.values(host.state.walls!).filter((w) => w.sceneId === 'gen-abc123');
    expect(walls.filter((w) => w.auto).map(key).sort()).toEqual(m.walls.filter((w) => w.kind === 'wall').map(key).sort());
    expect(walls.filter((w) => w.kind === 'door')).toHaveLength(m.walls.filter((w) => w.kind === 'door').length);
    // undone in one step: the scene goes, the table is back on the first one
    host.dispatch('gm', { type: 'game.undo' });
    expect(host.state.scenes['gen-abc123']).toBeUndefined();
    expect(host.state.activeSceneId).toBe('s1');
    expect(Object.values(host.state.walls!).filter((w) => w.sceneId === 'gen-abc123')).toHaveLength(0);
  });
});

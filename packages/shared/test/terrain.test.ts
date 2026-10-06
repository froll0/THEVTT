import { describe, expect, it } from 'vitest';
import { brushCells, cleanTerrain, createInitialState, floodCells, GameHost, paintCells, rectCells, resizeTerrain, terrainWalls, type Wall } from '../src';

const key = (w: { x1: number; y1: number; x2: number; y2: number }) => `${w.x1},${w.y1},${w.x2},${w.y2}`;

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  const host = new GameHost({ state, send: () => {}, rng: () => 0.5, now: () => 0 });
  host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { widthCells: 6, heightCells: 4 } });
  return host;
}
const sceneWalls = (host: GameHost): Wall[] => Object.values(host.state.walls ?? {}).filter((w) => w.sceneId === 's1');

describe('painted map', () => {
  it('keeps only known terrain, at the size of the scene', () => {
    expect(cleanTerrain('ss?x', 2, 2)).toBe('ss..');
    expect(cleanTerrain('....', 2, 2)).toBeNull();
    expect(cleanTerrain(42, 2, 2)).toBeNull();
    expect(resizeTerrain('ab'.replace('a', 's').replace('b', 'g') + 'rr', 2, 2, 3, 1)).toBe('sg.');
  });

  it('walls a room painted on nothing, and rock against any floor', () => {
    // a 2×1 room of stone on an empty 4×3 scene
    const room = '.....ss.....';
    expect(terrainWalls(room, 4, 3).map(key).sort()).toEqual(['1,1,3,1', '1,2,3,2', '1,1,1,2', '3,1,3,2'].sort());
    // grass on nothing: no walls; earth in rock: walls
    expect(terrainWalls('.g..', 2, 2)).toEqual([]);
    expect(terrainWalls('rrrrerrrr', 3, 3).map(key).sort()).toEqual(['1,1,2,1', '1,2,2,2', '1,1,1,2', '2,1,2,2'].sort());
  });

  it('leaves the edges taken by a door', () => {
    const room = '.....ss.....';
    const walls = terrainWalls(room, 4, 3, [{ x1: 1, y1: 1, x2: 2, y2: 1 }]);
    expect(walls.map(key)).not.toContain('1,1,3,1');
    expect(walls.map(key)).toContain('2,1,3,1');
  });

  it('paints with brush, rectangle and bucket', () => {
    expect(brushCells(10, 10, 3.4, 3.6, 1)).toEqual([33]);
    expect(brushCells(10, 10, 3, 3, 2).sort((a, b) => a - b)).toEqual([22, 23, 32, 33]);
    expect(brushCells(10, 10, 5, 5, 5)).toHaveLength(21);
    expect(rectCells(4, 4, 2, 2, 0, 1)).toEqual([4, 5, 6, 8, 9, 10]);
    const map = 'gggqqgggg';
    expect(floodCells(map, 3, 3, 0, 0).sort()).toEqual([0, 1, 2, 5, 6, 7, 8]);
    expect(paintCells(map, [3, 4], 'g')).toBe('ggggggggg');
  });

  it('the GM paints, the walls follow, one undo takes it back', () => {
    const host = table();
    const empty = '.'.repeat(24);
    const t = paintCells(empty, rectCells(6, 4, 1, 1, 3, 2), 's');
    expect(host.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain: t }).ok).toBe(true);
    expect(host.state.scenes.s1!.terrain).toBe(t);
    expect(sceneWalls(host).every((w) => w.auto)).toBe(true);
    expect(sceneWalls(host).map(key).sort()).toEqual(terrainWalls(t, 6, 4).map(key).sort());
    expect(host.state.scenes.s1!.vision).toBe(true);
    // a door in the top wall: the map's wall opens around it
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 2, y1: 1, x2: 3, y2: 1, kind: 'door' }] });
    const top = sceneWalls(host).filter((w) => w.auto && w.y1 === 1 && w.y2 === 1);
    expect(top.map(key).sort()).toEqual(['1,1,2,1', '3,1,4,1']);
    // map walls can't be erased one by one
    expect(host.dispatch('gm', { type: 'wall.delete', wallId: top[0]!.id }).ok).toBe(false);
    // clearing walls keeps the map's
    host.dispatch('gm', { type: 'wall.clear' });
    expect(sceneWalls(host).some((w) => w.kind === 'door')).toBe(false);
    expect(sceneWalls(host).map(key).sort()).toEqual(terrainWalls(t, 6, 4).map(key).sort());
    // walls off: they go; on again: they're back
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { autoWalls: false } });
    expect(sceneWalls(host)).toHaveLength(0);
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { autoWalls: true } });
    expect(sceneWalls(host).length).toBeGreaterThan(0);
    // painting it all away and undoing
    host.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain: null });
    expect(host.state.scenes.s1!.terrain).toBeNull();
    expect(sceneWalls(host)).toHaveLength(0);
    host.dispatch('gm', { type: 'game.undo' });
    expect(host.state.scenes.s1!.terrain).toBe(t);
    expect(sceneWalls(host).map(key).sort()).toEqual(terrainWalls(t, 6, 4).map(key).sort());
  });

  it('follows the scene when it grows or shrinks', () => {
    const host = table();
    host.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain: 'r'.repeat(24) });
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { widthCells: 3, heightCells: 2 } });
    expect(host.state.scenes.s1!.terrain).toBe('rrrrrr');
  });

  it('players cannot paint', () => {
    const host = table();
    expect(host.dispatch('p1', { type: 'terrain.set', sceneId: 's1', terrain: 's'.repeat(24) }).ok).toBe(false);
  });
});

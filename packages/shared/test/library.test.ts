import { describe, expect, it } from 'vitest';
import { createInitialState, describePackage, GameHost, isMapPackage, packScene } from '../src';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function table(campaignId: string) {
  const state = createInitialState({ campaignId, campaignName: campaignId, systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, rng: () => 0.5, now: () => 0 });
}

describe('map library', () => {
  it('packs a scene in one campaign and brings it whole into another', () => {
    const a = table('camp-a');
    a.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { name: 'Cripta', widthCells: 8, heightCells: 6, ambient: 'dark' } });
    a.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain: 'r'.repeat(8) + ('r' + 's'.repeat(6) + 'r').repeat(4) + 'r'.repeat(8) });
    a.dispatch('gm', { type: 'wall.create', walls: [{ x1: 3, y1: 1, x2: 4, y2: 1, kind: 'door', locked: true }] });
    a.dispatch('gm', { type: 'asset.add', dataUrl: PNG, attachTo: { sceneId: 's1' } });
    a.dispatch('gm', { type: 'prop.create', prop: { kind: 'chest', x: 2, y: 2 } });
    a.dispatch('gm', { type: 'drawing.create', points: [1, 1], color: '#fff', width: 0.5, text: 'Altare' });
    a.dispatch('gm', { type: 'token.create', token: { name: 'Scheletro', x: 4, y: 3, hp: { current: 13, max: 13 }, ac: 13 } });
    a.dispatch('gm', { type: 'token.create', token: { name: 'Giulia', x: 1, y: 1, ownerIds: ['p1'] } });

    const pkg = JSON.parse(JSON.stringify(packScene(a.state, 's1', { ...a.assetStore }, { tokens: true })));
    expect(isMapPackage(pkg)).toBe(true);
    expect(describePackage(pkg)).toMatchObject({ width: 8, height: 6, doors: 1, props: 1, tokens: 1, painted: true, picture: true });
    // the map's own walls are not in the package: they come back with the painting
    expect(pkg.walls).toHaveLength(1);
    // the players' tokens stay home
    expect(pkg.tokens.map((t: { name: string }) => t.name)).toEqual(['Scheletro']);
    expect(Object.values(pkg.assets)).toEqual([PNG]);

    const b = table('camp-b');
    expect(b.dispatch('gm', { type: 'scene.import', pkg, id: 'lib-crypt-1' }).ok).toBe(true);
    const sc = b.state.scenes['lib-crypt-1']!;
    expect(sc).toMatchObject({ name: 'Cripta', widthCells: 8, heightCells: 6, ambient: 'dark', vision: true });
    expect(sc.terrain).toBe(a.state.scenes.s1!.terrain);
    expect(b.assetStore[sc.background!]).toBe(PNG);
    const on = (x: { sceneId: string }) => x.sceneId === 'lib-crypt-1';
    const walls = Object.values(b.state.walls!).filter(on);
    expect(walls.find((w) => w.kind === 'door')).toMatchObject({ locked: true });
    expect(walls.filter((w) => w.auto).length).toBe(Object.values(a.state.walls!).filter((w) => w.auto).length);
    expect(Object.values(b.state.props!).filter(on)).toHaveLength(1);
    expect(Object.values(b.state.drawings!).filter(on)[0]).toMatchObject({ text: 'Altare', authorId: 'gm' });
    expect(Object.values(b.state.tokens).filter(on).map((t) => t.name)).toEqual(['Scheletro']);
    // the players stay on their scene
    expect(b.state.activeSceneId).toBe('s1');

    // one undo takes it all back
    b.dispatch('gm', { type: 'game.undo' });
    expect(b.state.scenes['lib-crypt-1']).toBeUndefined();
    expect(Object.values(b.state.walls!).filter(on)).toHaveLength(0);
    expect(Object.values(b.state.tokens).filter(on)).toHaveLength(0);
  });

  it('refuses what is not a map, and players', () => {
    const b = table('camp-b');
    expect(b.dispatch('gm', { type: 'scene.import', pkg: { format: 'other' } as never }).ok).toBe(false);
    const pkg = packScene(b.state, 's1', {});
    expect(b.dispatch('p1', { type: 'scene.import', pkg }).ok).toBe(false);
  });
});

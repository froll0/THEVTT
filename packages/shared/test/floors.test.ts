import { describe, expect, it } from 'vitest';
import { copyPiece, createInitialState, GameHost, pasteActions, pieceFromRows, rotatePiece } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  state.players.p2 = { id: 'p2', displayName: 'Luca', color: '#f00', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, rng: () => 1, now: () => 0 });
}

describe('floors', () => {
  it('stairs take tokens to the floor below, next to the stairs back up; the table follows the party', () => {
    const host = table();
    host.dispatch('gm', { type: 'scene.create', name: 'Cantina', id: 'cellar1' });
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'stairs', x: 10, y: 5, w: 1, h: 2, link: 'cellar1' } });
    host.dispatch('gm', { type: 'prop.create', sceneId: 'cellar1', prop: { kind: 'stairs', x: 3, y: 3, w: 1, h: 2, link: 's1' } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Lia', x: 8, y: 5, ownerIds: ['p1'] } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Bram', x: 8, y: 7, ownerIds: ['p2'] } });
    const [lia, bram] = Object.values(host.state.tokens);
    expect(host.dispatch('p1', { type: 'token.move', tokenId: lia!.id, x: 10, y: 5 }).ok).toBe(true);
    expect(host.state.tokens[lia!.id]).toMatchObject({ sceneId: 'cellar1', x: 4, y: 3 });
    expect(host.state.log.at(-1)!.text).toBe('Lia va su «Cantina»');
    // one still upstairs: the table stays
    expect(host.state.activeSceneId).toBe('s1');
    host.dispatch('p2', { type: 'token.move', tokenId: bram!.id, x: 10, y: 6 });
    expect(host.state.tokens[bram!.id]!.sceneId).toBe('cellar1');
    expect(host.state.activeSceneId).toBe('cellar1');
    // a link to nowhere (or to its own scene) isn't kept
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'ladder', x: 1, y: 1, w: 0.5, h: 1, link: 'nope' } });
    expect(Object.values(host.state.props!).find((p) => p.kind === 'ladder')!.link).toBeNull();
  });
});

describe('copy, paste, stamps', () => {
  it('copies a room with its door and chest, and puts it down elsewhere in one step', () => {
    const host = table();
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { widthCells: 12, heightCells: 8 } });
    const ground = 'r'.repeat(96).split('');
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) ground[y * 12 + x] = 's';
    host.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain: ground.join('') });
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 2, y1: 4, x2: 3, y2: 4, kind: 'door', locked: true }] });
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'chest', x: 2, y: 2, w: 1, h: 0.75 } });
    host.dispatch('gm', { type: 'drawing.create', points: [1.2, 1.5], color: '#fff', width: 0.5, text: 'Cella' });
    const piece = copyPiece(host.state, 's1', 1, 1, 3, 3)!;
    expect(piece).toMatchObject({ w: 3, h: 3, terrain: 'sssssssss' });
    expect(piece.walls).toEqual([{ x1: 1, y1: 3, x2: 2, y2: 3, kind: 'door', locked: true }]);
    expect(piece.props).toHaveLength(1);
    expect(piece.labels[0]).toMatchObject({ text: 'Cella' });

    host.dispatch('gm', { type: 'batch', actions: pasteActions(host.state, 's1', piece, 7, 2) });
    expect(host.state.scenes.s1!.terrain!.slice(2 * 12 + 7, 2 * 12 + 10)).toBe('sss');
    expect(Object.values(host.state.walls!).some((w) => w.kind === 'door' && w.x1 === 8 && w.y1 === 5)).toBe(true);
    expect(Object.values(host.state.props!)).toHaveLength(2);
    expect(Object.values(host.state.drawings!)).toHaveLength(2);
    // one undo takes the whole piece back
    host.dispatch('gm', { type: 'game.undo' });
    expect(Object.values(host.state.props!)).toHaveLength(1);
    expect(Object.values(host.state.drawings!)).toHaveLength(1);
    expect(host.state.scenes.s1!.terrain!.slice(2 * 12 + 7, 2 * 12 + 10)).toBe('rrr');
  });

  it('turns a piece a quarter to the right', () => {
    const p = pieceFromRows('L', ['ab', 'cd', 'ef'], { walls: [{ x1: 0, y1: 0, x2: 2, y2: 0, kind: 'wall' }], props: [{ kind: 'chest', x: 0, y: 0, w: 1, h: 1 }] });
    const r = rotatePiece(p);
    expect(r).toMatchObject({ w: 3, h: 2, terrain: 'ecafdb' });
    expect(r.walls[0]).toMatchObject({ x1: 3, y1: 0, x2: 3, y2: 2 });
    expect(r.props[0]).toMatchObject({ x: 2, y: 0, rotation: 90 });
    // four turns: back where it started
    expect(rotatePiece(rotatePiece(rotatePiece(r))).terrain).toBe(p.terrain);
  });
});

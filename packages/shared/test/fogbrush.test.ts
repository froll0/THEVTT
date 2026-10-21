import { describe, expect, it } from 'vitest';
import { createInitialState, emptyMask, GameHost, paintPolygon, paintStroke } from '../src';

const at = (mask: string, w: number, x: number, y: number) => mask[y * w + x];

describe('fog painted by hand', () => {
  it('a brush reveals the cells along its way, round at the ends', () => {
    const m = paintStroke(emptyMask(10, 10), 10, 10, [{ x: 1.5, y: 1.5 }, { x: 7.5, y: 1.5 }], 1, true);
    for (let x = 1; x <= 7; x++) expect(at(m, 10, x, 1)).toBe('1');
    expect(at(m, 10, 1, 2)).toBe('1');
    expect(at(m, 10, 1, 3)).toBe('0');
    expect(at(m, 10, 9, 1)).toBe('0');
    // a single dab
    const dab = paintStroke(emptyMask(10, 10), 10, 10, [{ x: 5, y: 5 }], 1.5, true);
    expect([...dab].filter((c) => c === '1').length).toBeGreaterThanOrEqual(4);
  });

  it('a lasso reveals what is inside it', () => {
    const tri = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 8 }];
    const m = paintPolygon(emptyMask(10, 10), 10, 10, tri, true);
    expect(at(m, 10, 1, 1)).toBe('1');
    expect(at(m, 10, 6, 6)).toBe('0');
    expect(paintPolygon(m, 10, 10, [{ x: 0, y: 0 }, { x: 3, y: 3 }], false)).toBe(m);
  });

  it('the host: only the GM, a scene with fog, and an undo step', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'C', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    host.upsertPlayer({ id: 'gm', displayName: 'GM', color: '#fff', characterId: null });
    host.upsertPlayer({ id: 'p', displayName: 'P', color: '#fff', characterId: null });
    expect(host.dispatch('gm', { type: 'fog.stroke', sceneId: 's1', points: [{ x: 2, y: 2 }], radius: 1, reveal: true }).ok).toBe(false);
    host.dispatch('gm', { type: 'fog.enable', sceneId: 's1', enabled: true });
    expect(host.dispatch('p', { type: 'fog.lasso', sceneId: 's1', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }], reveal: true }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'fog.lasso', sceneId: 's1', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }], reveal: true }).ok).toBe(true);
    const w = host.state.scenes.s1!.widthCells;
    expect(at(host.state.scenes.s1!.fog!.revealed, w, 1, 1)).toBe('1');
    expect(host.state.history?.undo[0]).toBe('nebbia');
  });
});

describe('the way a token went in its turn', () => {
  it('is kept while it fights, and starts again with its next turn', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'C', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Ari', x: 1, y: 1 } });
    const id = Object.keys(host.state.tokens)[0]!;
    host.dispatch('gm', { type: 'token.move', tokenId: id, x: 3, y: 1 });
    expect(host.state.tokens[id]!.trail).toBeUndefined();
    host.dispatch('gm', { type: 'initiative.add', name: 'Ari', tokenId: id, value: 10 });
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('gm', { type: 'token.move', tokenId: id, x: 5, y: 1 });
    host.dispatch('gm', { type: 'token.move', tokenId: id, x: 5, y: 4 });
    expect(host.state.tokens[id]!.trail).toEqual([{ x: 3, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }]);
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.tokens[id]!.trail).toBeUndefined();
  });
});

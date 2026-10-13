import { describe, expect, it } from 'vitest';
import { createInitialState, distance3d, GameHost, tokensInAura, type Token } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, now: () => 0 });
}

describe('the map, alive', () => {
  it('a video in a loop as a scene’s background, for the GM only', () => {
    const host = table();
    const webm = 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15';
    expect(host.dispatch('p1', { type: 'asset.add', dataUrl: webm, attachTo: { sceneId: 's1' } }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'asset.add', dataUrl: webm, attachTo: { track: 'x' } }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'asset.add', dataUrl: webm, attachTo: { sceneId: 's1' } }).ok).toBe(true);
    expect(host.assetStore[host.state.scenes.s1!.background!]).toBe(webm);
  });

  it('flames tremble; tokens fly, and the height counts in distances', () => {
    const host = table();
    host.dispatch('gm', { type: 'token.create', token: { name: 'Arpia', x: 1, y: 1, light: { bright: 2, dim: 4, flicker: true } as never, elevation: 9 } as never });
    const t = Object.values(host.state.tokens)[0]!;
    expect(t.light).toMatchObject({ flicker: true });
    expect(t.elevation).toBe(9);
    host.dispatch('gm', { type: 'token.update', tokenId: t.id, patch: { elevation: 0 } });
    expect(host.state.tokens[t.id]!.elevation).toBeUndefined();
    // 2 squares away, 9 m up (1,5 m squares): 6 squares
    expect(distance3d({ cellDistance: 1.5 }, 2, 9, 0)).toBe(6);
    expect(distance3d({ cellDistance: 1.5 }, 8, 3, 0)).toBe(8);
  });

  it('an aura says who is inside it, edge to edge and in height', () => {
    const tok = (id: string, x: number, y: number, extra: Partial<Token> = {}) => ({ id, sceneId: 's1', name: id, x, y, size: 1, color: '#fff', image: null, ownerIds: [], characterId: null, hp: null, ac: null, hidden: false, conditions: [], ...extra }) as Token;
    const paladin = tok('paladino', 5, 5, { aura: { radius: 2, color: '#ffd700' } });
    const all = [paladin, tok('vicino', 7, 5), tok('lontano', 9, 5), tok('in volo', 6, 5, { elevation: 6 }), tok('altra scena', 6, 5, { sceneId: 's2' })];
    expect(tokensInAura(paladin, all).map((t) => t.name)).toEqual(['vicino']);
    expect(tokensInAura({ ...paladin, aura: null }, all)).toEqual([]);
  });
});

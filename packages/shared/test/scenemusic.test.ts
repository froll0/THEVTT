import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  state.music!.tracks.push({ id: 't1', name: 'Taverna', asset: 'a1' }, { id: 't2', name: 'Battaglia', asset: 'a2' });
  return new GameHost({ state, send: () => {}, now: () => 1000 });
}

describe('scene music and dice', () => {
  it('a scene starts its own track when it goes live', () => {
    const host = table();
    host.dispatch('gm', { type: 'scene.create', name: 'Arena' });
    const arena = Object.values(host.state.scenes).find((s) => s.name === 'Arena')!;
    expect(host.dispatch('gm', { type: 'scene.update', sceneId: arena.id, patch: { music: 'nope' } }).ok).toBe(false);
    host.dispatch('gm', { type: 'scene.update', sceneId: arena.id, patch: { music: 't2' } });
    host.dispatch('gm', { type: 'scene.activate', sceneId: arena.id });
    expect(host.state.music).toMatchObject({ current: 't2', playing: true, position: 0 });
    // the track goes away from the playlist: the scene forgets it
    host.dispatch('gm', { type: 'music.remove', trackId: 't2' });
    expect(host.state.scenes[arena.id]!.music).toBeNull();
  });

  it('everyone picks their own dice', () => {
    const host = table();
    expect(host.dispatch('p1', { type: 'dice.skin', skin: { color: '#112233', ink: '#ffffff', finish: 'metallo' } }).ok).toBe(true);
    expect(host.state.dice?.p1).toEqual({ color: '#112233', ink: '#ffffff', finish: 'metallo' });
    expect(host.dispatch('p1', { type: 'dice.skin', skin: { color: 'red', ink: '#fff', finish: 'metallo' } }).ok).toBe(false);
    host.dispatch('p1', { type: 'dice.skin', skin: null });
    expect(host.state.dice?.p1).toBeUndefined();
  });
});

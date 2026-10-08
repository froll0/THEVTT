import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, viewFor, worldTime } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  const host = new GameHost({ state, send: () => {}, now: () => 0 });
  return { host };
}

describe('world clock', () => {
  it('tells the day, the hour and the light', () => {
    expect(worldTime(8 * 60)).toMatchObject({ day: 1, clock: '08:00', light: 'bright', part: 'mattina' });
    expect(worldTime(1440 + 19 * 60 + 5)).toMatchObject({ day: 2, clock: '19:05', light: 'dim', part: 'sera' });
    expect(worldTime(23 * 60).light).toBe('dark');
  });

  it('moves on, and outdoor scenes take the light of the hour', () => {
    const { host } = table();
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { daylight: true } });
    expect(host.state.scenes.s1!.ambient).toBe('bright');
    expect(host.dispatch('p1', { type: 'time.advance', minutes: 60 }).ok).toBe(false);
    host.dispatch('gm', { type: 'time.advance', minutes: 14 * 60 });
    expect(host.state.world!.minutes).toBe(22 * 60);
    expect(host.state.scenes.s1!.ambient).toBe('dark');
    expect(host.state.scenes.s1!.vision).toBe(true);
    expect(host.state.log.at(-1)!.text).toBe('Giorno 1, ore 22:00: notte');
    host.dispatch('gm', { type: 'time.set', minutes: 1440 + 10 * 60 });
    expect(host.state.scenes.s1!.ambient).toBe('bright');
    expect(host.state.log.at(-1)!.text).toBe('Giorno 2, ore 10:00: mattina');
  });
});

describe('quests', () => {
  it('the GM writes them; players see only the visible ones', () => {
    const { host } = table();
    host.dispatch('gm', { type: 'quest.save', quest: { title: 'Il drago', objectives: [{ id: 'o1', text: 'Trova la tana', done: false }] } });
    const id = Object.keys(host.state.quests!)[0]!;
    expect(Object.keys(viewFor(host.state, 'p1').quests!)).toHaveLength(0);
    expect(host.dispatch('p1', { type: 'quest.save', quest: { id, title: 'X' } }).ok).toBe(false);
    host.dispatch('gm', { type: 'quest.save', quest: { id, title: 'Il drago', visible: true } });
    expect(host.state.log.at(-1)!.text).toBe('Nuova missione: Il drago');
    expect(viewFor(host.state, 'p1').quests![id]!.objectives).toHaveLength(1);
    host.dispatch('gm', { type: 'quest.save', quest: { id, title: 'Il drago', status: 'done' } });
    expect(host.state.log.at(-1)!.text).toBe('Missione compiuta: Il drago');
    host.dispatch('gm', { type: 'quest.delete', questId: id });
    expect(host.state.quests![id]).toBeUndefined();
  });
});

describe('table macros', () => {
  it('only the GM sets them, cleaned up', () => {
    const { host } = table();
    expect(host.dispatch('p1', { type: 'macros.set', macros: [] }).ok).toBe(false);
    host.dispatch('gm', { type: 'macros.set', macros: [{ id: 'm1', name: 'Palla di fuoco', color: 'red; x', body: '/r 8d6' }] });
    expect(host.state.macros).toEqual([{ id: 'm1', name: 'Palla di fuoco', color: '#8e8e93', body: '/r 8d6' }]);
    expect(viewFor(host.state, 'p1').macros).toHaveLength(1);
  });
});

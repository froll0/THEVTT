import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, spectatorView } from '../src';

describe('the audience', () => {
  it('sees what the players see together, nothing of the GM’s', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Elara', x: 1, y: 1, ownerIds: ['p1'] } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Spia', x: 3, y: 3, hidden: true } });
    host.dispatch('gm', { type: 'note.create', note: { title: 'Segreto' } });
    host.dispatch('gm', { type: 'note.create', note: { title: 'Mappa del tesoro', shared: 'all' } });
    host.dispatch('gm', { type: 'roll', formula: '1d20', private: true, label: 'Tiro nascosto' });
    host.dispatch('p1', { type: 'chat', text: 'Ciao a tutti' });
    const v = spectatorView(host.state);
    expect(Object.values(v.tokens).map((t) => t.name)).toEqual(['Elara']);
    expect(Object.values(v.notes!).map((n) => n.title)).toEqual(['Mappa del tesoro']);
    expect(v.log.map((l) => l.text)).toEqual(['Ciao a tutti']);
    expect(v.characters).toEqual({});
    expect(v.encounters).toBeUndefined();
  });
});

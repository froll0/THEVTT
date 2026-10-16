import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, spectatorView, viewFor } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  state.players.p2 = { id: 'p2', displayName: 'Luca', color: '#fff', online: true, characterId: null };
  state.players.p3 = { id: 'p3', displayName: 'Sara', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, now: () => 0 });
}

describe('voices and whispers', () => {
  it('the GM speaks as an NPC; a player only as their own token', () => {
    const host = table();
    host.dispatch('gm', { type: 'token.create', token: { name: 'Oste Brando', x: 1, y: 1 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Elara', x: 2, y: 1, ownerIds: ['p1'] } });
    const [oste, elara] = Object.values(host.state.tokens);
    host.dispatch('gm', { type: 'chat', text: 'Benvenuti!', as: oste!.id });
    expect(host.state.log.at(-1)).toMatchObject({ text: 'Benvenuti!', speaker: { name: 'Oste Brando', image: null } });
    expect(host.dispatch('p1', { type: 'chat', text: 'x', as: oste!.id }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'chat', text: 'Una birra', as: elara!.id }).ok).toBe(true);
  });

  it('a whisper reaches only who it’s for (and the GM)', () => {
    const host = table();
    host.dispatch('p1', { type: 'chat', text: 'Fidati di me', to: ['p2'] });
    expect(viewFor(host.state, 'p2').log.map((l) => l.text)).toEqual(['Fidati di me']);
    expect(viewFor(host.state, 'p1').log.map((l) => l.text)).toEqual(['Fidati di me']);
    expect(viewFor(host.state, 'gm').log.map((l) => l.text)).toEqual(['Fidati di me']);
    expect(viewFor(host.state, 'p3').log).toEqual([]);
    expect(spectatorView(host.state).log).toEqual([]);
    expect(host.dispatch('p1', { type: 'chat', text: 'x', to: ['nessuno'] }).ok).toBe(false);
  });
});

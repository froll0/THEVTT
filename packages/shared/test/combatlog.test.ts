import { describe, expect, it } from 'vitest';
import { combatSummary, createInitialState, GameHost, viewFor } from '../src';

describe('the fight’s log', () => {
  it('writes down every hit point lost or gained during the rounds, for the GM', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
    const host = new GameHost({ state, send: () => {}, now: () => 0, rng: (n) => n });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Elara', x: 1, y: 1, hp: { current: 20, max: 20 }, ownerIds: ['p1'], ac: 10 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Orco', x: 2, y: 1, hp: { current: 30, max: 30 }, ac: 10 } });
    const [elara, orc] = Object.values(host.state.tokens);
    // outside a fight: nothing
    host.dispatch('gm', { type: 'token.update', tokenId: orc!.id, patch: { hp: { current: 29, max: 30 } } });
    host.dispatch('gm', { type: 'initiative.add', name: 'Elara', tokenId: elara!.id, value: 15 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', tokenId: orc!.id, value: 10 });
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.initiative.round).toBe(1);
    host.dispatch('p1', { type: 'attack', attackerId: elara!.id, targetIds: [orc!.id], name: 'Spada lunga', bonus: 5, damage: '1d8+3' });
    host.dispatch('gm', { type: 'token.update', tokenId: elara!.id, patch: { hp: { current: 12, max: 20 } } });
    const log = host.state.combat!;
    expect(log.events[0]).toMatchObject({ round: 1, by: 'Elara', what: 'Spada lunga', target: 'Orco', pc: false });
    expect(log.events[0]!.amount).toBeLessThan(0);
    expect(log.events[1]).toMatchObject({ by: 'Il master', what: 'a mano', target: 'Elara', amount: -8, pc: true });
    const sum = combatSummary(log);
    expect(sum.dealt[0]![0]).toBe('Elara');
    expect(viewFor(host.state, 'p1').combat).toBeUndefined();
  });
});

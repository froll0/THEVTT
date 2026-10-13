import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, relationLayout, standingLabel, viewFor } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, now: () => 0 });
}

describe('who’s who', () => {
  it('people, factions and ties; players see the visible ones; standing announced', () => {
    const host = table();
    host.dispatch('gm', { type: 'relation.node', node: { id: 'duca', name: 'Duca Varos', kind: 'png', visible: true } });
    host.dispatch('gm', { type: 'relation.node', node: { id: 'gilda', name: 'Gilda dei ladri', kind: 'fazione', standing: -1 } });
    host.dispatch('gm', { type: 'relation.link', link: { from: 'duca', to: 'gilda', label: 'paga in segreto' } });
    expect(host.dispatch('p1', { type: 'relation.node', node: { name: 'X' } }).ok).toBe(false);
    let v = viewFor(host.state, 'p1').relations!;
    expect(Object.values(v.nodes).map((n) => n.name)).toEqual(['Duca Varos']);
    expect(v.links).toEqual({});
    // the guild comes to light, its tie too
    host.dispatch('gm', { type: 'relation.node', node: { id: 'gilda', name: 'Gilda dei ladri', visible: true } });
    const link = Object.keys(host.state.relations!.links)[0]!;
    host.dispatch('gm', { type: 'relation.link', link: { id: link, from: 'duca', to: 'gilda', visible: true } });
    v = viewFor(host.state, 'p1').relations!;
    expect(Object.values(v.links)[0]).toMatchObject({ label: 'paga in segreto' });
    host.dispatch('gm', { type: 'relation.node', node: { id: 'gilda', name: 'Gilda dei ladri', standing: 2 } });
    expect(host.state.log.at(-1)!.text).toBe('Gilda dei ladri: ora alleati verso il gruppo');
    expect(standingLabel(-5)).toBe('Nemici giurati');
    // removing someone removes their ties
    host.dispatch('gm', { type: 'relation.delete', id: 'duca' });
    expect(host.state.relations!.links).toEqual({});
  });

  it('lays factions inside and people around', () => {
    const at = relationLayout(
      [
        { id: 'a', name: 'A', kind: 'fazione', note: '', color: '#fff', visible: true },
        { id: 'b', name: 'B', kind: 'png', note: '', color: '#fff', visible: true },
        { id: 'c', name: 'C', kind: 'png', note: '', color: '#fff', visible: true },
      ],
      400,
      400,
    );
    const d = (id: string) => Math.hypot(at[id]!.x - 200, at[id]!.y - 200);
    expect(d('a')).toBeLessThan(d('b'));
    expect(Math.round(d('b'))).toBe(Math.round(d('c')));
  });
});

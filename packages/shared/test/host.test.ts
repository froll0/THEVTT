import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, type HostToPlayer } from '../src';

function setup() {
  const outbox: { to: string; msg: HostToPlayer }[] = [];
  const state = createInitialState({ campaignId: 'c1', campaignName: 'Test', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  const host = new GameHost({ state, send: (to, msg) => outbox.push({ to, msg }), rng: () => 10, now: () => 0 });
  host.upsertPlayer({ id: 'p1', displayName: 'Alice', color: '#f00', characterId: 'ch1' });
  host.upsertPlayer({ id: 'p2', displayName: 'Bob', color: '#0f0', characterId: null });
  host.upsertCharacter({ id: 'ch1', ownerId: 'p1', name: 'Lia', systemId: 'dnd5e-2024', data: {} });
  host.connect('gm');
  host.connect('p1');
  host.connect('p2');
  const lastState = (to: string) => {
    const m = [...outbox].reverse().find((o) => o.to === to && o.msg.k === 'state');
    if (!m || m.msg.k !== 'state') throw new Error('no state');
    return m.msg.state;
  };
  return { host, outbox, lastState };
}

describe('GameHost', () => {
  it('lets only the GM manage scenes', () => {
    const { host } = setup();
    expect(host.dispatch('p1', { type: 'scene.create', name: 'Dungeon' }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'scene.create', name: 'Dungeon' }).ok).toBe(true);
    expect(Object.keys(host.state.scenes)).toHaveLength(2);
  });

  it('lets players place and move only their own character', () => {
    const { host } = setup();
    expect(host.dispatch('p2', { type: 'token.create', token: { name: 'X', characterId: 'ch1' } }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1', x: 3, y: 4 } }).ok).toBe(true);
    const tok = Object.values(host.state.tokens)[0]!;
    expect(tok.ownerIds).toEqual(['p1']);
    expect(host.dispatch('p2', { type: 'token.move', tokenId: tok.id, x: 1, y: 1 }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'token.move', tokenId: tok.id, x: 999, y: 2 }).ok).toBe(true);
    expect(host.state.tokens[tok.id]!.x).toBe(29);
    expect(host.dispatch('p1', { type: 'token.update', tokenId: tok.id, patch: { hidden: true } }).ok).toBe(false);
  });

  it('hides hidden tokens, private rolls and GM notes from players', () => {
    const { host, lastState } = setup();
    host.dispatch('gm', { type: 'token.create', token: { name: 'Goblin', hidden: true } });
    host.dispatch('gm', { type: 'roll', formula: '1d20', private: true });
    host.dispatch('gm', { type: 'notes.update', text: 'segreto' });
    const view = lastState('p1');
    expect(Object.keys(view.tokens)).toHaveLength(0);
    expect(view.log.some((l) => l.kind === 'roll')).toBe(false);
    expect(view.gmNotes).toBe('');
    expect(Object.keys(lastState('gm').tokens)).toHaveLength(1);
  });

  it('resolves rolls on the host', () => {
    const { host } = setup();
    expect(host.dispatch('p1', { type: 'roll', formula: '1d20+3', label: 'Attacco' }).ok).toBe(true);
    const entry = host.state.log.at(-1)!;
    expect(entry.roll?.total).toBe(13);
    expect(entry.authorName).toBe('Alice');
    expect(host.dispatch('p1', { type: 'roll', formula: 'nope' }).ok).toBe(false);
  });

  it('runs initiative order and turns', () => {
    const { host } = setup();
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', value: 5 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Drago', value: 20 });
    expect(host.state.initiative.entries.map((e) => e.name)).toEqual(['Drago', 'Orco']);
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.initiative).toMatchObject({ round: 1, turn: 0 });
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.initiative).toMatchObject({ round: 2, turn: 0 });
  });

  it('sends assets once per peer before the state that uses them', () => {
    const { host, outbox } = setup();
    outbox.length = 0;
    host.dispatch('gm', { type: 'asset.add', dataUrl: 'data:image/png;base64,AAAA', attachTo: { sceneId: 's1' } });
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { name: 'Taverna' } });
    const toP1 = outbox.filter((o) => o.to === 'p1').map((o) => o.msg.k);
    expect(toP1).toEqual(['asset', 'state', 'state']);
  });

  it('rejects actions from strangers', () => {
    const { host } = setup();
    expect(host.dispatch('intruder', { type: 'chat', text: 'hi' }).ok).toBe(false);
  });
});

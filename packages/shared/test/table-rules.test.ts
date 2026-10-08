import { describe, expect, it } from 'vitest';
import { createInitialState, damageAfter, GameHost, type Rng } from '../src';

/** dice that always land on `face` (or their highest face, if smaller) */
const always = (face: number): Rng => (sides: number) => Math.min(face, sides);

function table(rng: Rng = always(10), extra: Partial<ConstructorParameters<typeof GameHost>[0]> = {}) {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  const host = new GameHost({ state, send: () => {}, rng, now: () => 0, saveBonus: (t) => (t.name === 'Orco' ? 2 : 0), ...extra });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Lia', x: 1, y: 1, hp: { current: 30, max: 30 }, ac: 15, ownerIds: ['p1'] } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Orco', x: 5, y: 1, hp: { current: 40, max: 40 }, ac: 13, defenses: { resist: ['Fuoco'] } } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Drago', x: 8, y: 1, hp: { current: 100, max: 100 }, ac: 18, legendary: { max: 3, left: 3 }, lair: ['Magma', 'Tremore'], defenses: { immune: ['fuoco'] } } });
  const byName = (n: string) => Object.values(host.state.tokens).find((t) => t.name === n)!;
  return { host, lia: byName('Lia'), orc: byName('Orco'), dragon: byName('Drago') };
}

describe('damage defenses', () => {
  it('halves, ignores or doubles', () => {
    expect(damageAfter({ resist: ['fuoco'] }, 9, 'Fuoco')).toEqual({ amount: 4, note: 'resistente' });
    expect(damageAfter({ immune: ['veleno'] }, 9, 'veleno')).toEqual({ amount: 0, note: 'immune' });
    expect(damageAfter({ vulnerable: ['contundenti'] }, 9, 'contundenti')).toEqual({ amount: 18, note: 'vulnerabile' });
    expect(damageAfter({ resist: ['fuoco'] }, 9, 'freddo')).toEqual({ amount: 9 });
  });

  it('apply to attacks and to damage rolled on tokens', () => {
    const { host, lia, orc, dragon } = table(always(15));
    host.dispatch('p1', { type: 'attack', attackerId: lia.id, targetIds: [orc.id], name: 'Dardo', bonus: 5, damage: '10', damageType: 'fuoco' });
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(35);
    expect(host.state.log.at(-1)!.label).toBe('Dardo · danni fuoco → Orco (resistente: 5)');
    host.dispatch('gm', { type: 'hp.roll', formula: '12', tokenIds: [orc.id, dragon.id], damageType: 'fuoco', label: 'Lava' });
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(29);
    expect(host.state.tokens[dragon.id]!.hp!.current).toBe(100);
    expect(host.state.log.at(-1)!.label).toBe('Lava fuoco → Orco (resistente: 6), Drago (immune: 0)');
  });
});

describe('group saving throws', () => {
  it('rolls once for the damage, each target saves; half on a success', () => {
    // d20s land on 10: Orco 12 vs DC 12 succeeds, Lia 10 fails
    const { host, lia, orc } = table(always(10));
    expect(host.dispatch('gm', { type: 'save.group', tokenIds: [lia.id, orc.id], ability: 'dex', dc: 12, label: 'Palla di fuoco', damage: '8d6', damageType: 'fuoco', half: true }).ok).toBe(true);
    // 8d6 of sixes = 48
    expect(host.state.tokens[lia.id]!.hp!.current).toBe(0);
    // half (24), then resistance: 12
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(28);
    const card = host.state.log.at(-1)!;
    expect(card.card).toMatchObject({ title: 'Palla di fuoco', subtitle: 'Tiro salvezza su Destrezza, CD 12' });
    expect(card.card!.body).toBe('Lia: 10 — fallito, 48 danni\nOrco: 12 — riuscito, 12 danni (metà) (resistente)');
  });

  it('a player casts only from their own token', () => {
    const { host, orc, lia } = table();
    expect(host.dispatch('p1', { type: 'save.group', casterId: orc.id, tokenIds: [lia.id], ability: 'dex', dc: 12, label: 'X' }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'save.group', casterId: lia.id, tokenIds: [orc.id], ability: 'wis', dc: 12, label: 'Paura' }).ok).toBe(true);
  });
});

describe('turns', () => {
  it('action, bonus action and reaction come back at the start of the turn, with a reminder of conditions', () => {
    const { host, lia, orc } = table();
    host.dispatch('gm', { type: 'initiative.add', name: 'Lia', tokenId: lia.id, value: 15 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', tokenId: orc.id, value: 10 });
    host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { used: { action: true, reaction: true }, conditions: ['Avvelenato'] } });
    expect(host.state.tokens[lia.id]!.used).toEqual({ action: true, bonus: false, reaction: true });
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.tokens[lia.id]!.used).toBeUndefined();
    expect(host.state.log.at(-1)!.text).toBe('Lia ricorda: Avvelenato');
  });

  it('legendary actions refill on the creature’s turn; lairs act on 20', () => {
    const { host, lia, dragon } = table();
    host.dispatch('gm', { type: 'initiative.add', name: 'Drago', tokenId: dragon.id, value: 22 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Lia', tokenId: lia.id, value: 12 });
    host.dispatch('gm', { type: 'token.update', tokenId: dragon.id, patch: { legendary: { max: 3, left: 1 } } });
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.tokens[dragon.id]!.legendary).toEqual({ max: 3, left: 3 });
    host.dispatch('gm', { type: 'initiative.next' });
    const lair = host.state.log.find((l) => l.text === 'Azioni di tana')!;
    expect(lair).toMatchObject({ private: true, card: { body: 'Drago: Magma, Tremore' } });
  });
});

describe('rests', () => {
  it('the GM calls a rest: the clock moves on and the table hears of it', () => {
    const { host } = table();
    expect(host.dispatch('p1', { type: 'rest', kind: 'long' }).ok).toBe(false);
    host.dispatch('gm', { type: 'rest', kind: 'short' });
    expect(host.state.world!.minutes).toBe(9 * 60);
    expect(host.state.rest!.kind).toBe('short');
    host.dispatch('gm', { type: 'rest', kind: 'long' });
    expect(host.state.world!.minutes).toBe(17 * 60);
    expect(host.state.log.at(-1)!.text).toMatch(/^Riposo lungo/);
  });

  it('a character’s sheet follows the hit points of its token', () => {
    const changed: unknown[] = [];
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: 'ch1' };
    state.characters.ch1 = { id: 'ch1', ownerId: 'p1', name: 'Elara', systemId: 'dnd5e-2024', data: { hp: { current: null } } };
    const host = new GameHost({ state, send: () => {}, now: () => 0, withHp: (ch, current) => ({ ...(ch.data as object), hp: { current } }), onCharacterChange: (ch) => changed.push(ch.data) });
    host.dispatch('p1', { type: 'token.create', token: { name: 'Elara', x: 1, y: 1, characterId: 'ch1', hp: { current: 20, max: 20 } } });
    const t = Object.values(host.state.tokens)[0]!;
    host.dispatch('gm', { type: 'hp.roll', formula: '7', tokenIds: [t.id] });
    expect(host.state.characters.ch1!.data).toEqual({ hp: { current: 13 } });
    expect(changed).toHaveLength(1);
  });
});

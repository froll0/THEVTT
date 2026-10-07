import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, moveCost, type Rng } from '../src';

function table(rng: Rng = always(10)) {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  const host = new GameHost({ state, send: () => {}, rng, now: () => 0, saveBonus: () => 3 });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Lia', x: 1, y: 1, hp: { current: 20, max: 20 }, ac: 15, ownerIds: ['p1'] } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Orco', x: 5, y: 1, hp: { current: 15, max: 15 }, ac: 13 } });
  const byName = (n: string) => Object.values(host.state.tokens).find((t) => t.name === n)!;
  return { host, lia: byName('Lia'), orc: byName('Orco') };
}

/** dice that always land on `face` (or their highest face, if smaller) */
const always = (face: number): Rng => (sides: number) => Math.min(face, sides);

describe('combat', () => {
  it('an attack hits against the AC and the damage lands', () => {
    const { host, lia, orc } = table(always(15));
    expect(host.dispatch('p1', { type: 'attack', attackerId: lia.id, targetIds: [orc.id], name: 'Spada lunga', bonus: 5, damage: '1d8+3', damageType: 'taglienti' }).ok).toBe(true);
    const log = host.state.log.slice(-2);
    expect(log[0]).toMatchObject({ label: 'Spada lunga → Orco: colpito', text: '20' });
    expect(log[1]!.label).toBe('Spada lunga · danni taglienti → Orco');
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(15 - Number(log[1]!.text));
  });

  it('misses below the AC, and a natural 1 always misses', () => {
    const { host, lia, orc } = table(always(1));
    host.dispatch('p1', { type: 'attack', attackerId: lia.id, targetIds: [orc.id], name: 'Pugno', bonus: 20, damage: '1' });
    expect(host.state.log.at(-1)!.label).toBe('Pugno → Orco: 1 naturale, mancato');
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(15);
  });

  it('a natural 20 is a critical: double dice', () => {
    const { host, lia, orc } = table(always(20));
    host.dispatch('p1', { type: 'attack', attackerId: lia.id, targetIds: [orc.id], name: 'Ascia', bonus: 0, damage: '1d6+1' });
    const dmg = host.state.log.at(-1)!;
    expect(host.state.log.at(-2)!.label).toBe('Ascia → Orco: colpo critico!');
    expect(dmg.roll!.formula.replace(/\s/g, '')).toBe('2d6+1');
  });

  it('a player attacks only with their own token', () => {
    const { host, orc, lia } = table();
    expect(host.dispatch('p1', { type: 'attack', attackerId: orc.id, targetIds: [lia.id], name: 'X', bonus: 0, damage: '1' }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'attack', attackerId: lia.id, targetIds: [], name: 'X', bonus: 0, damage: '1' }).ok).toBe(false);
  });

  it('damage on someone concentrating asks for a Constitution save', () => {
    const { host, lia } = table();
    host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { conditions: ['Concentrazione'] } });
    host.dispatch('gm', { type: 'hp.roll', formula: '24', tokenIds: [lia.id] });
    expect(host.state.log.at(-1)).toMatchObject({ kind: 'card', card: { title: 'Concentrazione · Lia', subtitle: 'Tiro salvezza su Costituzione, CD 12', rolls: [{ formula: '1d20+3' }] } });
    // by hand from the inspector too
    host.dispatch('gm', { type: 'token.update', tokenId: lia.id, patch: { hp: { current: 20, max: 20 } } });
    host.dispatch('gm', { type: 'token.update', tokenId: lia.id, patch: { hp: { current: 0, max: 20 } } });
    expect(host.state.log.at(-1)!.card!.subtitle).toBe('Tiro salvezza su Costituzione, CD 10');
  });

  it('timed conditions tick at the start of the token’s turns and end by themselves', () => {
    const { host, lia, orc } = table();
    host.dispatch('gm', { type: 'token.update', tokenId: orc.id, patch: { conditions: ['Avvelenato', 'Prono'], conditionRounds: { Avvelenato: 2 } } });
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', tokenId: orc.id, value: 15 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Lia', tokenId: lia.id, value: 10 });
    host.dispatch('gm', { type: 'initiative.next' }); // round 1, orc's turn: 2 → 1
    expect(host.state.tokens[orc.id]!.conditionRounds).toEqual({ Avvelenato: 1 });
    host.dispatch('gm', { type: 'initiative.next' }); // Lia
    host.dispatch('gm', { type: 'initiative.next' }); // round 2, orc: it ends
    const o = host.state.tokens[orc.id]!;
    expect(o.conditions).toEqual(['Prono']);
    expect(o.conditionRounds).toEqual({});
    expect(host.state.log.some((l) => l.text === 'Orco: finisce «Avvelenato»')).toBe(true);
  });

  it('counts the movement of the turn, difficult ground double, fresh each turn', () => {
    const { host, lia, orc } = table();
    // a strip of snow in the middle of the scene
    const w = 30;
    const terrain = Array.from({ length: 20 * w }, (_, i) => (i % w === 3 ? 'n' : 'g')).join('');
    host.dispatch('gm', { type: 'terrain.set', sceneId: 's1', terrain });
    expect(moveCost(terrain, w, 20, { x: 1, y: 1 }, { x: 5, y: 1 })).toBe(5);
    host.dispatch('gm', { type: 'initiative.add', name: 'Lia', tokenId: lia.id, value: 18 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', tokenId: orc.id, value: 3 });
    // outside combat nothing is counted
    host.dispatch('p1', { type: 'token.move', tokenId: lia.id, x: 2, y: 1 });
    expect(host.state.tokens[lia.id]!.moved).toBeUndefined();
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('p1', { type: 'token.move', tokenId: lia.id, x: 4, y: 3 });
    expect(host.state.tokens[lia.id]!.moved).toBe(3);
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('gm', { type: 'initiative.next' }); // Lia again
    expect(host.state.tokens[lia.id]!.moved).toBe(0);
    host.dispatch('gm', { type: 'initiative.clear' });
    expect(host.state.tokens[lia.id]!.moved).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { createInitialState, damageVsArmor, GameHost, roll, type Rng } from '../src';

const seq = (...v: number[]): Rng => {
  let i = 0;
  return () => v[i++ % v.length]!;
};

function table(rng: Rng) {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'nimble', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: 'ch1' };
  state.characters.ch1 = { id: 'ch1', ownerId: 'p1', name: 'Grudge', systemId: 'nimble', data: {} };
  const host = new GameHost({ state, send: () => {}, now: () => 0, rng });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Grudge', characterId: 'ch1', ownerIds: ['p1'], x: 1, y: 1, hp: { current: 20, max: 20 }, ac: 4, nimble: { wounds: { current: 0, max: 6 } } } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Bugbear', x: 3, y: 1, hp: { current: 30, max: 30 }, nimble: { armor: 'M' } } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Goblin gregario', x: 5, y: 1, hp: { current: 1, max: 1 }, nimble: { minion: true } } });
  const [hero, bugbear, minion] = Object.values(host.state.tokens);
  return { host, hero: hero!, bugbear: bugbear!, minion: minion! };
}

describe('Nimble at the table', () => {
  it('armour: medium takes the dice only, heavy half the dice, crits ignore it', () => {
    const r = roll('2d6n+4', seq(3, 5));
    expect(damageVsArmor(r, null)).toBe(12);
    expect(damageVsArmor(r, 'M')).toBe(8);
    expect(damageVsArmor(r, 'H')).toBe(4);
    const crit = roll('1d6n+4', seq(6, 2));
    expect(damageVsArmor(crit, 'H')).toBe(12);
  });

  it('a hero hits a monster with armour, a minion falls to anything', () => {
    const { host, bugbear, minion } = table(seq(4, 3, 1, 2));
    host.dispatch('p1', { type: 'nimble.attack', attackerId: Object.values(host.state.tokens)[0]!.id, targetIds: [bugbear.id], name: 'Ascia bipenne', formula: '2d6n+3' });
    // 4+3 dice only: medium armour
    expect(host.state.tokens[bugbear.id]!.hp!.current).toBe(30 - 7);
    host.dispatch('gm', { type: 'nimble.attack', targetIds: [minion.id], name: 'Scossa', formula: '1d4n' });
    // 1: a miss, the minion stays
    expect(host.state.tokens[minion.id]!.hp!.current).toBe(1);
    host.dispatch('gm', { type: 'nimble.attack', targetIds: [minion.id], name: 'Scossa', formula: '1d4n' });
    expect(host.state.tokens[minion.id]!.hp!.current).toBe(0);
  });

  it('a monster hits a hero: the player Defends; at 0 HP a Wound and Dying; hurt while Dying, 2 more', () => {
    const { host, hero } = table(seq(5, 5, 5));
    host.dispatch('gm', { type: 'nimble.attack', targetIds: [hero.id], name: 'Fendente', formula: '2d6n+4' });
    const pending = host.state.log.find((e) => e.pending)!;
    expect(pending.pending).toMatchObject({ amount: 14, armor: 4 });
    // nothing taken yet
    expect(host.state.tokens[hero.id]!.hp!.current).toBe(20);
    expect(host.dispatch('p1', { type: 'nimble.take', entryId: pending.id, defend: true }).ok).toBe(true);
    expect(host.state.tokens[hero.id]!.hp!.current).toBe(10);
    expect(host.dispatch('p1', { type: 'nimble.take', entryId: pending.id, defend: true }).ok).toBe(false);
    host.dispatch('gm', { type: 'token.update', tokenId: hero.id, patch: { hp: { current: 0, max: 20 } } });
    let t = host.state.tokens[hero.id]!;
    expect(t.conditions).toContain('Morente');
    expect(t.nimble!.wounds!.current).toBe(1);
    host.dispatch('gm', { type: 'nimble.attack', targetIds: [hero.id], name: 'Fendente', formula: '2d6n+4' });
    const again = host.state.log.filter((e) => e.pending).at(-1)!;
    host.dispatch('p1', { type: 'nimble.take', entryId: again.id, defend: false });
    t = host.state.tokens[hero.id]!;
    expect(t.nimble!.wounds!.current).toBe(3);
  });

  it('initiative: heroes get their actions from the roll, monsters act last; attacks after the first are rushed', () => {
    const { host, hero, bugbear } = table(seq(12, 4, 4));
    host.dispatch('p1', { type: 'initiative.add', name: 'Grudge', tokenId: hero.id, modifier: 1 });
    expect(host.state.tokens[hero.id]!.nimble!.actions).toBe(2);
    host.dispatch('gm', { type: 'initiative.add', name: 'Bugbear', tokenId: bugbear.id, modifier: 3 });
    expect(host.state.initiative.entries.map((e) => e.name)).toEqual(['Grudge', 'Bugbear']);
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('p1', { type: 'nimble.attack', attackerId: hero.id, targetIds: [bugbear.id], name: 'Ascia', formula: '1d8n' });
    host.dispatch('p1', { type: 'nimble.attack', attackerId: hero.id, targetIds: [bugbear.id], name: 'Ascia', formula: '1d8n' });
    expect(host.state.log.some((e) => e.label?.includes('affrettato'))).toBe(true);
    host.dispatch('p1', { type: 'initiative.next' });
    // the end of the turn gives all 3 actions back
    expect(host.state.tokens[hero.id]!.nimble!.actions).toBe(3);
  });
});

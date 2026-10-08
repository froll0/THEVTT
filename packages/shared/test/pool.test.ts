import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, rangeBetween, trackRow, zoneHops, type PoolStats, type Rng, type Zone } from '../src';

/** dice from a list, in order, then the last one forever */
const seq = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
};

const pc: PoolStats = { type: 'pg', resilience: 4, toughness: 3, armoured: true, melee: { dice: 3, target: 3 }, ranged: { dice: 3, target: 3 }, wounds: 0 };
const minion: PoolStats = { type: 'Servitore', resilience: 3, toughness: 3, armoured: false, melee: { dice: 2, target: 2 }, ranged: { dice: 2, target: 2 }, wounds: 0, maxWounds: 1 };
const brute: PoolStats = {
  type: 'Bruto', resilience: 5, toughness: 4, armoured: true, melee: { dice: 2, target: 3 }, ranged: { dice: 2, target: 3 }, wounds: 0, maxWounds: 2,
  track: [{ at: '0 Ferite', effect: '—' }, { at: '1 Ferita', effect: 'Diventa Esausto' }, { at: '2 Ferite', effect: 'Sconfitto' }],
};

function table(rng: Rng, target: PoolStats = minion) {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'wtow', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  const host = new GameHost({
    state, send: () => {}, rng, now: () => 0,
    woundResult: (total) => ({ name: total >= 24 ? 'Morte' : 'Costola Incrinata', text: 'ahi', conditions: ['Esausto'], dead: total >= 24 }),
  });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Gunter', x: 1, y: 1, ownerIds: ['p1'], pool: pc } });
  host.dispatch('gm', { type: 'token.create', token: { name: 'Gor', x: 2, y: 1, pool: target } });
  const byName = (n: string) => Object.values(host.state.tokens).find((t) => t.name === n)!;
  return { host, gunter: byName('Gunter'), gor: byName('Gor') };
}

describe('success-pool combat', () => {
  it('a hit with damage over Resilienza defeats a Servitore', () => {
    // attack 3d10≤4: 1,2,3 → 3 successes; defence 2d10≤2: 9,9 → 0
    const { host, gunter, gor } = table(seq(1, 2, 3, 9, 9));
    expect(host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Spada', dice: 3, target: 4, damage: 3 }).ok).toBe(true);
    const g = host.state.tokens[gor.id]!;
    expect(g.pool!.wounds).toBe(1);
    expect(g.conditions).toContain('Sconfitto');
    const cards = host.state.log.filter((e) => e.kind === 'card').map((e) => e.card!.body).join('\n');
    expect(cards).toContain('Danni 6 contro Resilienza 3');
  });

  it('damage up to Resilienza staggers; ties go to the attacker', () => {
    // 1 success each: the attacker wins, damage 2 + 0 ≤ 3
    const { host, gunter, gor } = table(seq(1, 9, 1, 9));
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Pugnale', dice: 2, target: 3, damage: 2 });
    const g = host.state.tokens[gor.id]!;
    expect(g.pool!.wounds).toBe(0);
    expect(g.conditions).toEqual(['Barcollante']);
  });

  it('a parried melee blow staggers the attacker', () => {
    // attack 0 successes, defence 1
    const { host, gunter, gor } = table(seq(9, 9, 1, 9));
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Spada', dice: 2, target: 3, damage: 3 });
    expect(host.state.tokens[gunter.id]!.conditions).toEqual(['Barcollante']);
    expect(host.state.tokens[gor.id]!.conditions).toEqual([]);
  });

  it('Bruti follow their wound track and show it as a bar', () => {
    // 3 successes unopposed: 4 + 3 = 7 > 5
    const { host, gunter, gor } = table(seq(1), brute);
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Ascia', dice: 3, target: 4, damage: 4, unopposed: true });
    const g = host.state.tokens[gor.id]!;
    expect(g.pool!.wounds).toBe(1);
    expect(g.hp).toEqual({ current: 1, max: 2 });
    expect(host.state.log.at(-1)!.card!.body).toContain('Diventa Esausto');
  });

  it('characters roll on the wounds table, one more die per untreated wound', () => {
    const { host, gunter } = table(seq(5, 5, 5, 5));
    host.dispatch('gm', { type: 'pool.wound', tokenId: gunter.id });
    const t = host.state.tokens[gunter.id]!;
    expect(t.pool!.untreated).toBe(1);
    expect(t.conditions).toContain('Esausto');
    host.dispatch('gm', { type: 'pool.wound', tokenId: gunter.id });
    const rolls = host.state.log.filter((e) => e.label?.startsWith('Tabella delle Ferite'));
    expect(rolls.map((r) => r.roll!.formula)).toEqual(['1d10', '2d10']);
  });

  it('armour-piercing attacks use the toughness', () => {
    // 1 success unopposed: 3 + 1 = 4 > toughness 3 (but not Resilienza 4)
    const { host, gunter, gor } = table(seq(1, 9), { ...minion, resilience: 4, toughness: 3 });
    host.dispatch('gm', { type: 'pool.attack', attackerId: gor.id, targetIds: [gunter.id], name: 'Pistola', dice: 1, target: 3, damage: 3, ignoresArmour: true, unopposed: true, ranged: true });
    expect(host.state.tokens[gunter.id]!.pool!.wounds).toBe(1);
  });
});

describe('zones', () => {
  const z = (id: string, x: number, y: number, w: number, h: number): Zone => ({ id, sceneId: 's', name: id, x, y, w, h });
  const zones = [z('a', 0, 0, 5, 5), z('b', 5, 0, 5, 5), z('c', 10, 0, 5, 5), z('d', 15, 0, 5, 5)];

  it('counts zones crossed', () => {
    expect(zoneHops(zones, zones[0]!, zones[0]!)).toBe(0);
    expect(zoneHops(zones, zones[0]!, zones[2]!)).toBe(2);
    expect(zoneHops([zones[0]!, zones[2]!], zones[0]!, zones[2]!)).toBe(Infinity);
  });

  it('turns them into range bands', () => {
    expect(rangeBetween(zones, { x: 1, y: 1 }, { x: 2, y: 1 })).toBe('Ravvicinata');
    expect(rangeBetween(zones, { x: 0.5, y: 0.5 }, { x: 4.5, y: 4.5 })).toBe('Corta');
    expect(rangeBetween(zones, { x: 1, y: 1 }, { x: 7, y: 1 })).toBe('Media');
    expect(rangeBetween(zones, { x: 1, y: 1 }, { x: 12, y: 1 })).toBe('Lunga');
    expect(rangeBetween(zones, { x: 1, y: 1 }, { x: 17, y: 1 })).toBe('Estrema');
  });

  it('the GM draws, edits and removes zones', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'wtow', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'G', color: '#fff', online: true, characterId: null };
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    expect(host.dispatch('p1', { type: 'zone.create', zone: { name: 'Piazza', x: 0, y: 0, w: 4, h: 4 } }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'zone.create', zone: { name: 'Piazza', x: 0, y: 0, w: 4, h: 4, difficult: true } }).ok).toBe(true);
    const zone = Object.values(host.state.zones!)[0]!;
    expect(zone).toMatchObject({ name: 'Piazza', difficult: true, sceneId: 's1' });
    host.dispatch('gm', { type: 'zone.update', zoneId: zone.id, patch: { name: 'Mercato', w: 6 } });
    expect(host.state.zones![zone.id]).toMatchObject({ name: 'Mercato', w: 6 });
    host.dispatch('gm', { type: 'game.undo' });
    expect(host.state.zones![zone.id]!.name).toBe('Piazza');
    host.dispatch('gm', { type: 'zone.delete', zoneId: zone.id });
    expect(host.state.zones![zone.id]).toBeUndefined();
  });

  it('reads the track row for a number of wounds', () => {
    expect(trackRow(brute.track, 1)?.effect).toBe('Diventa Esausto');
    expect(trackRow([{ at: '1-2 Ferite', effect: 'x' }], 2)?.effect).toBe('x');
  });

  it('a whole side takes its turn together', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'wtow', gmId: 'gm', sceneId: 's1' });
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Gor', side: 'enemies' });
    host.dispatch('gm', { type: 'initiative.add', name: 'Gunter', side: 'players' });
    expect(host.state.initiative.entries.map((e) => [e.name, e.value])).toEqual([['Gunter', 2], ['Gor', 1]]);
  });
});

describe('success-pool table rules', () => {
  const zone = (host: GameHost, z: Partial<Zone>) => host.dispatch('gm', { type: 'zone.create', zone: z });
  const fight = (host: GameHost, ...ids: string[]) => {
    for (const id of ids) host.dispatch('gm', { type: 'initiative.add', name: id, tokenId: id, side: 'players' });
    host.dispatch('gm', { type: 'initiative.next' });
  };

  it('charging, outnumbering and the high ground add dice by themselves', () => {
    const { host, gunter, gor } = table(seq(1));
    host.dispatch('gm', { type: 'token.create', token: { name: 'Lina', x: 2, y: 2, ownerIds: ['p1'], pool: pc } });
    zone(host, { name: 'Collina', x: 0, y: 0, w: 2, h: 5, high: true });
    zone(host, { name: 'Prato', x: 2, y: 0, w: 5, h: 5 });
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Spada', dice: 3, target: 4, damage: 3, charge: true });
    const atk = host.state.log.find((e) => e.label === 'Spada → Gor')!;
    expect(atk.roll!.formula).toBe('6d10s4');
    const card = host.state.log.filter((e) => e.kind === 'card').at(0)!.card!.body!;
    expect(card).toContain('+1d Carica');
    expect(card).toContain('+1d posizione sopraelevata');
    // Lina beside the Gor, and Gunter attacking: two against one
    expect(card).toContain('+1d superiorità numerica (2 contro 1)');
  });

  it('shots lose a die for cover and beyond the optimal range', () => {
    const { host, gunter, gor } = table(seq(9));
    zone(host, { name: 'Bosco', x: 2, y: 0, w: 3, h: 3, cover: true });
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Arco', dice: 4, target: 3, damage: 4, ranged: true, optimal: 'Media – Lunga' });
    expect(host.state.log.find((e) => e.label === 'Arco → Gor')!.roll!.formula).toBe('2d10s3');
  });

  it('a hazard zone tests whoever walks in during a fight', () => {
    // Tempra 2d/2: 9, 9 → no successes against Pericolo (2): a wound with 2 dice
    const { host, gunter } = table(seq(9, 9, 5, 5));
    zone(host, { name: 'Strada', x: 0, y: 0, w: 2, h: 5 });
    zone(host, { name: 'Casa in fiamme', x: 2, y: 0, w: 3, h: 5, hazard: 2, hazardCondition: 'In Fiamme' });
    fight(host, gunter.id);
    host.dispatch('p1', { type: 'token.move', tokenId: gunter.id, x: 3, y: 1 });
    const t = host.state.tokens[gunter.id]!;
    expect(t.conditions).toContain('In Fiamme');
    expect(t.zonesMoved).toBe(1);
    expect(host.state.log.find((e) => e.label?.startsWith('Tabella delle Ferite'))!.roll!.formula).toBe('2d10');
  });

  it('bleeding out at the end of the turn: Indifeso, then dead', () => {
    const { host, gunter } = table(seq(9));
    host.dispatch('gm', { type: 'token.update', tokenId: gunter.id, patch: { conditions: ['Ferito Gravemente'] } });
    fight(host, gunter.id);
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.tokens[gunter.id]!.conditions).toContain('Indifeso');
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.tokens[gunter.id]!.conditions).toContain('Morto');
  });

  it('a Mostruosità chooses between the wound and its Reaction', () => {
    const monster: PoolStats = { ...brute, type: 'Mostruosità', monster: true, reaction: 'Arretra volando.' };
    const { host, gunter, gor } = table(seq(1), monster);
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Ascia', dice: 3, target: 4, damage: 4, unopposed: true });
    expect(host.state.tokens[gor.id]!.pool!.pending).toBe('wound');
    expect(host.state.tokens[gor.id]!.pool!.wounds).toBe(0);
    host.dispatch('p1', { type: 'pool.react', tokenId: gor.id, choice: 'reaction' });
    expect(host.state.tokens[gor.id]!.pool!.pending).toBeUndefined();
    expect(host.state.log.at(-1)!.card!.body).toBe('Arretra volando.');
  });

  it('vehicles take breakdowns, not wounds', () => {
    const cart: PoolStats = { type: 'Bruto', resilience: 5, toughness: 5, armoured: false, melee: { dice: 0, target: 1 }, ranged: { dice: 0, target: 1 }, wounds: 0, maxWounds: 3, vehicle: true };
    const { host, gunter, gor } = table(seq(1, 1, 1, 4), cart);
    host.dispatch('p1', { type: 'pool.attack', attackerId: gunter.id, targetIds: [gor.id], name: 'Ascia', dice: 3, target: 4, damage: 4 });
    expect(host.state.tokens[gor.id]!.pool!.wounds).toBe(1);
    expect(host.state.log.at(-1)!.card!.body).toContain('Tratto Movimentato');
  });

  it('a retreat: those who fail Atletica roll on Si Salvi Chi Può!', () => {
    const { host, gunter } = table(seq(9, 9, 8));
    host.dispatch('gm', { type: 'pool.retreat', tokenIds: [gunter.id] });
    expect(host.state.log.at(-1)!.card!.body).toContain('Debitori (8)');
  });

  it('the end of the day: infections for the wounded, Volontà for those exposed', () => {
    const { host, gunter } = table(seq(3, 9, 9));
    host.dispatch('gm', { type: 'pool.wound', tokenId: gunter.id });
    host.dispatch('gm', { type: 'token.update', tokenId: gunter.id, patch: { pool: { ...host.state.tokens[gunter.id]!.pool!, exposure: 4 } } });
    host.dispatch('gm', { type: 'pool.dayEnd' });
    const t = host.state.tokens[gunter.id]!;
    expect(t.pool!.untreated).toBe(2);
    expect(t.pool!.woundsToday).toBeUndefined();
    const text = host.state.log.filter((e) => e.kind === 'card').map((e) => e.card!.body).join('\n');
    expect(text).toContain('Ferita Purulenta');
    expect(text).toContain('Vulnerabile');
  });

  it('extended tests add up the successes of everyone at the table', () => {
    const { host } = table(seq(1, 1, 9));
    host.dispatch('p1', { type: 'extended.save', test: { name: 'Forzare il portone', need: 4 } });
    const id = Object.keys(host.state.extended!)[0]!;
    host.dispatch('p1', { type: 'extended.roll', testId: id, formula: '3d10s3' });
    expect(host.state.extended![id]!.have).toBe(2);
    expect(host.dispatch('p1', { type: 'extended.delete', testId: id }).ok).toBe(false);
  });
});

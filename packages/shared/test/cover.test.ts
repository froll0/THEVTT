import { describe, expect, it } from 'vitest';
import { coverBetween, createInitialState, GameHost } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  const host = new GameHost({ state, send: () => {}, now: () => 0, rng: (sides) => Math.ceil(sides / 2) });
  const add = (name: string, x: number, y: number, ac = 12) => {
    host.dispatch('gm', { type: 'token.create', token: { name, x, y, ac, hp: { current: 20, max: 20 } } });
    return Object.values(host.state.tokens).find((t) => t.name === name)!;
  };
  return { host, add };
}

describe('cover', () => {
  it('in the open: none; behind a low wall cutting part of the lines: half; behind a full wall: total', () => {
    const { host, add } = table();
    const archer = add('Arciere', 2, 5);
    const orc = add('Orco', 8, 5);
    expect(coverBetween(host.state, archer, orc)).toBe('none');
    // a wall in front of the orc's upper half
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 7, y1: 4, x2: 7, y2: 5.5, kind: 'wall' }] });
    expect(['half', 'three-quarters']).toContain(coverBetween(host.state, archer, orc));
    host.dispatch('gm', { type: 'wall.clear' });
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 7, y1: 3, x2: 7, y2: 8, kind: 'wall' }] });
    expect(coverBetween(host.state, archer, orc)).toBe('total');
  });

  it('another creature in the way gives half cover, and the attack counts it', () => {
    const { host, add } = table();
    const archer = add('Arciere', 2, 5);
    const orc = add('Orco', 8, 5, 10);
    add('Goblin', 5, 5);
    expect(coverBetween(host.state, archer, orc)).toBe('half');
    host.dispatch('gm', { type: 'attack', attackerId: archer.id, targetIds: [orc.id], name: 'Arco', bonus: 0, damage: '1d6' });
    expect(host.state.log.find((l) => l.label?.startsWith('Arco → Orco'))!.label).toContain('mezza copertura, +2 CA');
  });

  it('total cover: the attack can’t be made', () => {
    const { host, add } = table();
    const archer = add('Arciere', 2, 5);
    const orc = add('Orco', 8, 5);
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 7, y1: 0, x2: 7, y2: 12, kind: 'wall' }] });
    host.dispatch('gm', { type: 'attack', attackerId: archer.id, targetIds: [orc.id], name: 'Arco', bonus: 5, damage: '1d6' });
    expect(host.state.log.at(-1)!.text).toBe('Arco → Orco: copertura totale, non si può colpire');
    expect(host.state.tokens[orc.id]!.hp!.current).toBe(20);
  });
});

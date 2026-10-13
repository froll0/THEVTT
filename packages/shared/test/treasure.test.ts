import { describe, expect, it } from 'vitest';
import { createInitialState, entryFor, GameHost, parseTable, tableText, viewFor } from '../src';

function table() {
  const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, now: () => 0, rng: (sides) => sides });
}

describe('random tables', () => {
  it('read from text, numbered or not', () => {
    expect(parseTable('1-3 Goblin\n4–5: Lupi\n6 Un drago')).toEqual({
      formula: '1d6',
      entries: [
        { min: 1, max: 3, text: 'Goblin' },
        { min: 4, max: 5, text: 'Lupi' },
        { min: 6, max: 6, text: 'Un drago' },
      ],
    });
    expect(parseTable('Pioggia\nSole\n\nNebbia').formula).toBe('1d3');
    expect(parseTable('2-6 Nulla\n7-12 Briganti').formula).toBe('2d6');
    const t = parseTable('01-50 Rame\n51-99 Argento\n00 Oro');
    expect(t.formula).toBe('1d100');
    expect(entryFor(t, 100)!.text).toBe('Oro');
    expect(tableText(t)).toBe('1-50 Rame\n51-99 Argento\n100 Oro');
  });

  it('the GM rolls on them; players only on the shared ones', () => {
    const host = table();
    const { formula, entries } = parseTable('1-3 Goblin\n4-6 Lupi');
    host.dispatch('gm', { type: 'table.save', table: { name: 'Incontri nel bosco', formula, entries } });
    const id = Object.keys(host.state.tables!)[0]!;
    expect(Object.keys(viewFor(host.state, 'p1').tables!)).toEqual([]);
    expect(host.dispatch('p1', { type: 'table.roll', tableId: id }).ok).toBe(false);
    host.dispatch('gm', { type: 'table.roll', tableId: id });
    expect(host.state.log.at(-1)!.card).toMatchObject({ title: 'Incontri nel bosco', subtitle: '1d6: 6', body: 'Lupi' });
    host.dispatch('gm', { type: 'table.save', table: { id, name: 'Incontri nel bosco', shared: true } });
    expect(host.dispatch('p1', { type: 'table.roll', tableId: id, private: true }).ok).toBe(true);
    expect(host.state.log.at(-1)!.private).toBe(true);
  });
});

describe('loot and shops', () => {
  it('the party’s loot: the GM fills it, a player takes an item', () => {
    const host = table();
    host.dispatch('gm', { type: 'loot.set', loot: { coins: { gp: 30, sp: 5 }, items: [{ id: 'i1', name: 'Pozione di guarigione', qty: 2 }] } });
    expect(viewFor(host.state, 'p1').loot!.coins).toEqual({ gp: 30, sp: 5 });
    expect(host.dispatch('p1', { type: 'loot.set', loot: { coins: {}, items: [] } }).ok).toBe(false);
    host.dispatch('p1', { type: 'loot.take', itemId: 'i1', qty: 1 });
    expect(host.state.loot!.items[0]!.qty).toBe(1);
    expect(host.state.log.at(-1)!.text).toBe('Giulia prende Pozione di guarigione dal bottino');
    host.dispatch('p1', { type: 'loot.take', itemId: 'i1' });
    expect(host.state.loot!.items).toEqual([]);
    expect(host.dispatch('p1', { type: 'loot.take', itemId: 'i1' }).ok).toBe(false);
  });

  it('a shop: hidden until open, stock counted', () => {
    const host = table();
    host.dispatch('gm', { type: 'shop.save', shop: { name: 'Bottega di Ilda', items: [{ id: 'a', name: 'Corda', price: { gp: 1 }, stock: 1 }, { id: 'b', name: 'Torcia', price: { cp: 1 }, stock: null }] } });
    const id = Object.keys(host.state.shops!)[0]!;
    expect(Object.keys(viewFor(host.state, 'p1').shops!)).toEqual([]);
    expect(host.dispatch('p1', { type: 'shop.buy', shopId: id, itemId: 'a' }).ok).toBe(false);
    host.dispatch('gm', { type: 'shop.save', shop: { id, name: 'Bottega di Ilda', open: true } });
    expect(host.state.log.at(-1)!.text).toBe('Aperto: Bottega di Ilda');
    expect(host.dispatch('p1', { type: 'shop.buy', shopId: id, itemId: 'a' }).ok).toBe(true);
    expect(host.state.log.at(-1)!.text).toBe('Giulia compra Corda da Bottega di Ilda (1 gp)');
    expect(host.dispatch('p1', { type: 'shop.buy', shopId: id, itemId: 'a' })).toMatchObject({ ok: false, reason: 'Non ce n’è abbastanza' });
    expect(host.dispatch('p1', { type: 'shop.buy', shopId: id, itemId: 'b', qty: 5 }).ok).toBe(true);
  });
});

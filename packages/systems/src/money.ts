import * as dnd from './dnd5e-2024/rules';
import * as free from './libero';
import * as wtow from './wtow/rules';

/**
 * Coins and goods on a character sheet, the same way for every game: the
 * party's loot is shared out, an item taken goes into the inventory, a
 * purchase in a shop takes its price from the purse.
 */

export interface Coin {
  key: string;
  /** short, on the buttons: «mo» */
  short: string;
  name: string;
}

export type Coins = Record<string, number>;

const DND: Coin[] = [
  { key: 'pp', short: 'mp', name: 'Monete di platino' },
  { key: 'gp', short: 'mo', name: 'Monete d’oro' },
  { key: 'ep', short: 'me', name: 'Monete di electrum' },
  { key: 'sp', short: 'ma', name: 'Monete d’argento' },
  { key: 'cp', short: 'mr', name: 'Monete di rame' },
];
/** value in copper */
const DND_CP: Record<string, number> = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };

const WTOW: Coin[] = [
  { key: 'oro', short: 'oro', name: 'Corone d’oro' },
  { key: 'argento', short: 'arg', name: 'Scellini d’argento' },
  { key: 'bronzo', short: 'brz', name: 'Penny di bronzo' },
];

const FREE: Coin[] = [{ key: 'monete', short: 'monete', name: 'Monete' }];

export function coinsOf(systemId: string): Coin[] {
  return systemId === 'dnd5e-2024' ? DND : systemId === 'wtow' ? WTOW : FREE;
}

export function formatCoins(systemId: string, coins: Coins): string {
  const parts = coinsOf(systemId)
    .filter((c) => (coins[c.key] ?? 0) > 0)
    .map((c) => `${coins[c.key]} ${c.short}`);
  return parts.join(', ') || 'niente';
}

/** Coins shared out among `n`: each one's share, and what's left over (to the party). */
export function splitCoins(systemId: string, coins: Coins, n: number): { share: Coins; rest: Coins } {
  const share: Coins = {};
  const rest: Coins = {};
  if (n < 1) return { share, rest: { ...coins } };
  if (systemId === 'dnd5e-2024') {
    // in copper first, then back into the biggest coins: no coin is lost
    const total = Object.entries(coins).reduce((t, [k, v]) => t + (DND_CP[k] ?? 0) * Math.max(0, v), 0);
    const each = Math.floor(total / n);
    let left = each;
    for (const k of ['gp', 'sp', 'cp']) {
      share[k] = Math.floor(left / DND_CP[k]!);
      left -= share[k]! * DND_CP[k]!;
    }
    let r = total - each * n;
    for (const k of ['gp', 'sp', 'cp']) {
      rest[k] = Math.floor(r / DND_CP[k]!);
      r -= rest[k]! * DND_CP[k]!;
    }
  } else {
    for (const c of coinsOf(systemId)) {
      const v = Math.max(0, coins[c.key] ?? 0);
      share[c.key] = Math.floor(v / n);
      rest[c.key] = v - share[c.key]! * n;
    }
  }
  const clean = (x: Coins) => Object.fromEntries(Object.entries(x).filter(([, v]) => v > 0));
  return { share: clean(share), rest: clean(rest) };
}

/** The sheet with these coins added. */
export function addCoins(systemId: string, data: unknown, coins: Coins): unknown {
  if (systemId === 'dnd5e-2024') {
    const c = dnd.normalize(data);
    for (const k of Object.keys(c.currency) as (keyof typeof c.currency)[]) c.currency[k] += Math.max(0, coins[k] ?? 0);
    return c;
  }
  if (systemId === 'wtow') {
    const c = wtow.normalize(data);
    for (const k of ['bronzo', 'argento', 'oro'] as const) c.coins[k].owned += Math.max(0, coins[k] ?? 0);
    return c;
  }
  const c = free.normalize(data);
  const n = Math.max(0, coins.monete ?? 0);
  if (n) c.inventory = `${c.inventory}${c.inventory ? '\n' : ''}${n} monete`;
  return c;
}

/** The sheet with an item added to what the character carries. */
export function addItem(systemId: string, data: unknown, item: { name: string; qty: number; note?: string }): unknown {
  const qty = Math.max(1, Math.round(item.qty) || 1);
  if (systemId === 'dnd5e-2024') {
    const c = dnd.normalize(data);
    const same = c.inventory.find((i) => i.name.toLowerCase() === item.name.toLowerCase() && !i.ref);
    if (same) same.qty += qty;
    else c.inventory.push({ uid: Math.random().toString(36).slice(2, 10), ref: null, name: item.name, qty, weight: 0, equipped: false, ...(item.note ? { notes: item.note } : {}) });
    return c;
  }
  const line = `${qty > 1 ? `${qty} × ` : ''}${item.name}${item.note ? ` (${item.note})` : ''}`;
  if (systemId === 'wtow') {
    const c = wtow.normalize(data);
    c.gear = `${c.gear}${c.gear ? '\n' : ''}${line}`;
    return c;
  }
  const c = free.normalize(data);
  c.inventory = `${c.inventory}${c.inventory ? '\n' : ''}${line}`;
  return c;
}

/** What the character can spend. */
export function purse(systemId: string, data: unknown): Coins {
  if (systemId === 'dnd5e-2024') return { ...dnd.normalize(data).currency };
  if (systemId === 'wtow') {
    const c = wtow.normalize(data);
    return { oro: c.coins.oro.owned - c.coins.oro.spent, argento: c.coins.argento.owned - c.coins.argento.spent, bronzo: c.coins.bronzo.owned - c.coins.bronzo.spent };
  }
  return {};
}

/**
 * The sheet after paying `price`, or the reason it can't. D&D makes change
 * (a gold coin for 5 silver); Warhammer spends coins of the price's own kind.
 * The free system doesn't count money: the price is noted, nothing taken.
 */
export function pay(systemId: string, data: unknown, price: Coins): { data: unknown } | { error: string } {
  if (systemId === 'dnd5e-2024') {
    const c = dnd.normalize(data);
    const cost = Object.entries(price).reduce((t, [k, v]) => t + (DND_CP[k] ?? 0) * Math.max(0, v), 0);
    const have = Object.entries(c.currency).reduce((t, [k, v]) => t + (DND_CP[k] ?? 0) * v, 0);
    if (cost > have) return { error: 'Non bastano le monete' };
    // gold, silver and copper pay first; platinum and electrum are broken only if needed
    const small = c.currency.gp * 100 + c.currency.sp * 10 + c.currency.cp;
    let left = small >= cost ? small - cost : have - cost;
    if (small < cost) c.currency.pp = c.currency.ep = 0;
    for (const k of ['gp', 'sp', 'cp'] as const) {
      c.currency[k] = Math.floor(left / DND_CP[k]!);
      left -= c.currency[k] * DND_CP[k]!;
    }
    return { data: c };
  }
  if (systemId === 'wtow') {
    const c = wtow.normalize(data);
    for (const k of ['oro', 'argento', 'bronzo'] as const) {
      const need = Math.max(0, price[k] ?? 0);
      if (need > c.coins[k].owned - c.coins[k].spent) return { error: `Non bastano le monete di ${k}` };
    }
    for (const k of ['oro', 'argento', 'bronzo'] as const) c.coins[k].spent += Math.max(0, price[k] ?? 0);
    return { data: c };
  }
  return { data: free.normalize(data) };
}

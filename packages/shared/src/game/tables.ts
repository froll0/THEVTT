/**
 * The GM's random tables: encounters on the road, loot, names, rumours…
 * Written one entry per line, with the numbers that pick it or without
 * (then each line is one number, rolled on 1dN).
 */
export interface TableEntry {
  min: number;
  max: number;
  text: string;
}

export interface RollTable {
  id: string;
  name: string;
  /** the dice rolled: 1d6, 1d20, 2d6, 1d100… */
  formula: string;
  entries: TableEntry[];
  /** players see it and can roll on it */
  shared: boolean;
}

/** "1-3 Goblin", "4: Orco", "5–6 Lupi", "00 Drago" or plain lines. */
export function parseTable(text: string): { formula: string; entries: TableEntry[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 200);
  const numbered = lines.map((l) => /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*[:.)]?\s+(.+)$/.exec(l));
  if (lines.length && numbered.every(Boolean)) {
    const entries = numbered.map((m) => {
      // "00" on a d100 table is 100
      const a = m![1] === '00' ? 100 : Number(m![1]);
      const b = m![2] === undefined ? a : m![2] === '00' ? 100 : Number(m![2]);
      return { min: Math.min(a, b), max: Math.max(a, b), text: m![3]!.slice(0, 500) };
    });
    const lo = Math.min(...entries.map((e) => e.min));
    const hi = Math.max(...entries.map((e) => e.max));
    // 2-12: two dice; 1-100: a d100; otherwise one die as big as the last number
    const formula = lo === 2 && hi === 12 ? '2d6' : lo === 3 && hi === 18 ? '3d6' : `1d${hi}`;
    return { formula, entries };
  }
  const entries = lines.map((l, i) => ({ min: i + 1, max: i + 1, text: l.slice(0, 500) }));
  return { formula: `1d${Math.max(1, entries.length)}`, entries };
}

/** The table as text to edit again. */
export function tableText(t: Pick<RollTable, 'entries'>): string {
  return t.entries.map((e) => `${e.min === e.max ? e.min : `${e.min}-${e.max}`} ${e.text}`).join('\n');
}

export function entryFor(t: Pick<RollTable, 'entries'>, total: number): TableEntry | undefined {
  return t.entries.find((e) => total >= e.min && total <= e.max);
}

/** The party's loot, waiting to be shared out. */
export interface LootItem {
  id: string;
  name: string;
  qty: number;
  note?: string;
}

export interface PartyLoot {
  /** by the game's coin keys (gp, sp… or oro, argento…) */
  coins: Record<string, number>;
  items: LootItem[];
}

/** A shop the GM opens to the players. Prices in the game's coins. */
export interface ShopItem {
  id: string;
  name: string;
  price: Record<string, number>;
  /** null: as many as wanted */
  stock: number | null;
  note?: string;
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  /** the players see it and can buy */
  open: boolean;
  items: ShopItem[];
}

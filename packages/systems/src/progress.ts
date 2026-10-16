import * as dnd from './dnd5e-2024/rules';
import * as free from './libero';
import * as wtow from './wtow/rules';

/** Experience points needed for each level (2024 rules): index = level. */
export const DND_XP_LEVELS = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/** The level these points are worth (D&D). */
export const levelForXp = (xp: number) => {
  let l = 1;
  while (l < 20 && xp >= DND_XP_LEVELS[l + 1]!) l++;
  return l;
};

/** D&D: is there a level to take (enough points, or a milestone granted)? */
export function canLevelUp(data: unknown): boolean {
  const c = dnd.normalize(data);
  if (c.level >= 20) return false;
  return !!c.milestone || levelForXp(c.xp ?? 0) > c.level;
}

/**
 * The GM rewards the party: points of experience (or, in D&D, a milestone:
 * one more level). Returns the sheet and a line for the chat.
 */
export function award(systemId: string, data: unknown, reward: { xp?: number; milestone?: boolean }): { data: unknown; note: string } {
  const xp = Math.max(0, Math.round(reward.xp ?? 0));
  if (systemId === 'dnd5e-2024') {
    const c = dnd.normalize(data);
    if (reward.milestone) {
      c.milestone = c.level < 20;
      return { data: c, note: c.level < 20 ? `può salire al livello ${c.level + 1}` : 'è già al livello massimo' };
    }
    c.xp = (c.xp ?? 0) + xp;
    const reach = levelForXp(c.xp);
    return { data: c, note: `+${xp} PE (${c.xp})${reach > c.level ? ` · può salire al livello ${c.level + 1}` : ''}` };
  }
  if (systemId === 'wtow') {
    const c = wtow.normalize(data);
    c.xp.total += xp;
    return { data: c, note: `+${xp} PE (${c.xp.total - c.xp.spent} da spendere)` };
  }
  const c = free.normalize(data);
  c.notes = `${c.notes}${c.notes ? '\n' : ''}Esperienza: +${xp}`;
  return { data: c, note: `+${xp} esperienza` };
}

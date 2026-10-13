import { blockingSegments } from './sight';
import type { GameState, Token } from './state';
import { lineOfSight, type Pt } from './vision';

export type Cover = 'none' | 'half' | 'three-quarters' | 'total';

/** AC bonus of each degree of cover (D&D). */
export const COVER_AC: Record<Exclude<Cover, 'total'>, number> = { none: 0, half: 2, 'three-quarters': 5 };

export const COVER_LABEL: Record<Cover, string> = { none: '', half: 'mezza copertura', 'three-quarters': 'copertura di tre quarti', total: 'copertura totale' };

const corners = (t: Pick<Token, 'x' | 'y' | 'size'>, inset: number): Pt[] => [
  { x: t.x + inset, y: t.y + inset },
  { x: t.x + t.size - inset, y: t.y + inset },
  { x: t.x + inset, y: t.y + t.size - inset },
  { x: t.x + t.size - inset, y: t.y + t.size - inset },
];

/** Does the segment a→b cross the square of a token? */
function crosses(a: Pt, b: Pt, t: Pick<Token, 'x' | 'y' | 'size'>): boolean {
  // a few points along the line are enough at grid scale
  const n = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
  for (let i = 1; i < n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n;
    const y = a.y + ((b.y - a.y) * i) / n;
    if (x > t.x + 0.1 && x < t.x + t.size - 0.1 && y > t.y + 0.1 && y < t.y + t.size - 0.1) return true;
  }
  return false;
}

/**
 * The cover a target has against an attacker (the rule of the corners): from
 * the attacker's best corner, lines to the four corners of the target; walls
 * and solid scenery that cut 1-2 of them give half cover, 3 three quarters,
 * all 4 total. Another creature in the way gives at least half cover.
 */
export function coverBetween(state: GameState, attacker: Token, target: Token): Cover {
  if (attacker.sceneId !== target.sceneId) return 'none';
  const segments = blockingSegments(state, target.sceneId);
  const to = corners(target, 0.05);
  let best = 4;
  for (const from of corners(attacker, 0.05)) {
    const blocked = to.filter((p) => !lineOfSight(from, p, segments)).length;
    best = Math.min(best, blocked);
    if (!best) break;
  }
  let cover: Cover = best === 0 ? 'none' : best <= 2 ? 'half' : best === 3 ? 'three-quarters' : 'total';
  if (cover === 'none') {
    const a = { x: attacker.x + attacker.size / 2, y: attacker.y + attacker.size / 2 };
    const b = { x: target.x + target.size / 2, y: target.y + target.size / 2 };
    const inTheWay = Object.values(state.tokens).some((t) => t.id !== attacker.id && t.id !== target.id && t.sceneId === target.sceneId && !t.hidden && crosses(a, b, t));
    if (inTheWay) cover = 'half';
  }
  return cover;
}

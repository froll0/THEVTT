import type { Ability, GameState, Token } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { useHomebrew } from '../store/homebrew';

/** The stat block of a creature: SRD or one of the GM's own. */
export function findMonster(id: string | null | undefined): dnd5e.MonsterDef | undefined {
  if (!id) return undefined;
  const own = useHomebrew.getState().monsters.find((m) => m.id === id);
  return own ? ({ ...(own.data as dnd5e.MonsterDef), id: own.id } as dnd5e.MonsterDef) : dnd5e.MONSTERS.find((m) => m.id === id);
}

function sheetOf(state: GameState, t: Token) {
  const ch = t.characterId ? state.characters[t.characterId] : undefined;
  return ch && ch.systemId === 'dnd5e-2024' ? dnd5e.normalize(ch.data) : undefined;
}

/** How far a token walks in a turn, in metres (null: not known). */
export function tokenSpeed(state: GameState, t: Token): number | null {
  const c = sheetOf(state, t);
  if (c) return dnd5e.speed(c);
  const m = findMonster(t.monsterId);
  const n = m ? /(\d+(?:,\d+)?)\s*m/.exec(m.speed) : null;
  return n ? Number(n[1]!.replace(',', '.')) : null;
}

/** A token's saving throw bonus, from its sheet or its stat block. */
export function tokenSave(state: GameState, t: Token, ability: Ability): number | null {
  const c = sheetOf(state, t);
  if (c) return dnd5e.saveBonus(c, ability);
  const m = findMonster(t.monsterId);
  return m ? (m.saves?.[ability] ?? dnd5e.mod(m.abilities[ability])) : null;
}

/** What a creature brings to the map besides its numbers: defenses, legendary and lair actions. */
export function monsterTokenExtras(m: dnd5e.MonsterDef): Pick<Token, 'defenses' | 'legendary' | 'lair'> {
  const defenses = { resist: m.resistances, immune: m.immunities, vulnerable: m.vulnerabilities };
  return {
    defenses: defenses.resist || defenses.immune || defenses.vulnerable ? defenses : undefined,
    legendary: m.legendary?.actions.length ? { max: m.legendary.uses || 3, left: m.legendary.uses || 3 } : undefined,
    lair: m.lair?.length ? m.lair.map((a) => a.name) : undefined,
  };
}

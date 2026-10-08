/**
 * A game system plugin. The VTT core (tabletop, dice, initiative, social)
 * knows nothing about specific rules: everything rule-related goes through here.
 * The desktop app pairs each system with its own UI module (builder + sheet).
 */

export interface StatLine {
  label: string;
  value: string;
}

export interface QuickRoll {
  group: string;
  label: string;
  formula: string;
}

export interface TokenDefaults {
  hp: { current: number; max: number } | null;
  ac: number | null;
  size: number;
  /** modifier used by the initiative tracker */
  initiativeModifier: number;
  /** darkvision range in metres (0 = none) */
  darkvision?: number;
  /** damage types it resists, ignores or suffers double from */
  defenses?: { resist?: string[]; immune?: string[]; vulnerable?: string[] };
  /** success-pool systems: Resilienza, Protezione and wounds for the host (PoolStats in @thevtt/shared) */
  pool?: {
    type: 'pg' | 'Servitore' | 'Bruto' | 'Campione' | 'Mostruosità';
    resilience: number;
    toughness: number;
    armoured: boolean;
    melee: { dice: number; target: number };
    ranged: { dice: number; target: number };
    wounds: number;
    maxWounds?: number | null;
    track?: { at: string; effect: string }[];
    untreated?: number;
    hardy?: boolean;
    monster?: boolean;
  };
}

export interface GameSystem<TCharacter = unknown> {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** a blank character, ready for the creation wizard */
  createCharacter(): TCharacter;
  /** list of problems; empty means the character is complete and legal */
  validate(character: TCharacter): string[];
  /** one line, e.g. "Nano Guerriero 3" */
  headline?(character: TCharacter): string;
  /** compact summary shown in lists and on the table */
  summary(character: TCharacter): StatLine[];
  /** rolls offered as one-click buttons on the sheet */
  quickRolls(character: TCharacter): QuickRoll[];
  tokenDefaults(character: TCharacter): TokenDefaults;
  /** the character with its hit points as the token on the map has them */
  withHp?(character: TCharacter, current: number): TCharacter;
  /** conditions offered by the token menu */
  conditions: string[];
  /** what each condition does, for tooltips */
  conditionInfo?: Record<string, string>;
  /** the character with a wound from the table written on it (success-pool systems) */
  withWound?(character: TCharacter, wound: { name: string; text: string }): TCharacter;
  /** what a total on the wounds table means (success-pool systems) */
  woundResult?(total: number): { name: string; text: string; conditions?: string[]; dead?: boolean };
  /** how the table plays: d20 and squares, or success pools, sides and zones */
  table?: 'd20' | 'pool';
}

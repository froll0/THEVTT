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
  /** conditions offered by the token menu */
  conditions: string[];
}

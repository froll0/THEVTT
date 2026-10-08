import type { Ability, ChatCard, RollResult, Token } from '@thevtt/shared';
import type { FC, ReactNode } from 'react';
import { Dnd5eBestiary, dnd5eMonsterInitiative, Dnd5eStatBlock } from './dnd5e-2024/Bestiary';
import { Dnd5eBuilder } from './dnd5e-2024/Builder';
import { dnd5eCompendium } from './dnd5e-2024/Compendium';
import { Dnd5eSheet } from './dnd5e-2024/Sheet';
import { WtowBestiary, WtowStatBlock } from './wtow/Bestiary';
import { WtowBuilder } from './wtow/Builder';
import { wtowCompendium } from './wtow/Compendium';
import { WtowSheet } from './wtow/Sheet';

export interface BuilderProps<T = any> {
  value: T;
  onChange: (next: T) => void;
}

export interface SheetProps<T = any> {
  data: T;
  editable: boolean;
  /** narrow layout (table dock) */
  compact?: boolean;
  onChange: (next: T) => void;
  onRoll: (formula: string, label: string) => void;
  /** at the table: post a spell, feature or attack to the chat */
  onShare?: (card: ChatCard) => void;
  /** at the table: what the sheet can do on the map */
  table?: SheetTable;
}

/** The sheet's hooks into the table: attacks against a target, areas, concentration. */
/** A saving throw for several creatures at once, with the damage of failing it. */
export interface GroupSave {
  ability: Ability;
  dc: number;
  damage?: string;
  damageType?: string;
  /** half the damage on a success (otherwise none) */
  half?: boolean;
}

export interface SheetTable {
  /** an attack against the selected target; false when nobody is targeted (then it's a plain roll) */
  attack(a: { name: string; bonus: number; damage: string; damageType?: string; mode?: 'normal' | 'adv' | 'dis' }): boolean;
  /** start placing the area of a spell on the map; with a save, those inside roll it once it's down */
  area(a: { shape: 'circle' | 'cone' | 'line' | 'square'; metres: number; label: string; save?: GroupSave }): void;
  /** the marked (or selected) tokens roll a saving throw; false when nobody is targeted */
  save(a: GroupSave & { label: string }): boolean;
  /** the caster now keeps a spell up */
  concentrate(): void;
  /** success-pool attack against the marked (or selected) tokens; false when nobody is targeted */
  poolAttack?(a: PoolAttack): boolean;
  /** roll in the chat and read the result back (null if it doesn't come back in time) */
  rollFor?(formula: string, label: string): Promise<RollResult | null>;
  /** the character's token on the current map: its conditions live there during play */
  token?: { conditions: string[]; setConditions(conditions: string[]): void; woundRoll(): void } | null;
}

export interface PoolAttack {
  name: string;
  dice: number;
  target: number;
  damage: number | null;
  ranged?: boolean;
  ignoresArmour?: boolean;
  vsArmoured?: number;
  glorious?: boolean;
  grim?: boolean;
  unopposed?: boolean;
  condition?: string;
  woundDice?: number;
}

export interface BestiaryProps {
  /** at the table: put the creature on the map (darkvision in metres here). Absent in the compendium. */
  onAdd?: (token: Partial<Omit<Token, 'id'>> & { name: string }, index?: number) => void;
  /** levels of the characters at the table, to weigh encounters */
  partyLevels?: number[];
  onRoll: (formula: string, label: string) => void;
}

export interface StatBlockProps {
  monsterId: string;
  onRoll: (formula: string, label: string) => void;
  /** success-pool systems: the creature attacks the marked tokens (false: nobody marked) */
  onAttack?: (a: PoolAttack) => boolean;
}

/** One page of the rules compendium. */
export interface CompendiumEntry {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  /** everything the search should find it by */
  text: string;
  render: (ctx: { onRoll?: (formula: string, label: string) => void }) => ReactNode;
  /** chat card when shared at the table */
  card?: () => ChatCard;
}

/** UI half of a game system plugin (rules live in @thevtt/systems). */
export interface SystemUi {
  Builder: FC<BuilderProps>;
  Sheet: FC<SheetProps>;
  Bestiary?: FC<BestiaryProps>;
  StatBlock?: FC<StatBlockProps>;
  monsterInitiative?: (monsterId: string) => number;
  /** the rules compendium: categories in display order, and a builder for the entries */
  compendium?: { categories: string[]; entries: (homebrew: { id: string; data: unknown }[]) => CompendiumEntry[] };
}

const uis: Record<string, SystemUi> = {
  'dnd5e-2024': {
    Builder: Dnd5eBuilder,
    Sheet: Dnd5eSheet,
    Bestiary: Dnd5eBestiary,
    StatBlock: Dnd5eStatBlock,
    monsterInitiative: dnd5eMonsterInitiative,
    compendium: dnd5eCompendium,
  },
  wtow: {
    Builder: WtowBuilder,
    Sheet: WtowSheet,
    Bestiary: WtowBestiary,
    StatBlock: WtowStatBlock,
    // sides, not initiative rolls
    monsterInitiative: () => 0,
    compendium: wtowCompendium,
  },
};

export const getSystemUi = (id: string): SystemUi | undefined => uis[id];

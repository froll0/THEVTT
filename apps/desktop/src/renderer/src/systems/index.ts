import type { ChatCard, Token } from '@thevtt/shared';
import type { FC, ReactNode } from 'react';
import { Dnd5eBestiary, dnd5eMonsterInitiative, Dnd5eStatBlock } from './dnd5e-2024/Bestiary';
import { Dnd5eBuilder } from './dnd5e-2024/Builder';
import { dnd5eCompendium } from './dnd5e-2024/Compendium';
import { Dnd5eSheet } from './dnd5e-2024/Sheet';

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
}

export interface BestiaryProps {
  /** at the table: put the creature on the map. Absent in the compendium. */
  onAdd?: (token: Partial<Omit<Token, 'id'>> & { name: string }) => void;
  onRoll: (formula: string, label: string) => void;
}

export interface StatBlockProps {
  monsterId: string;
  onRoll: (formula: string, label: string) => void;
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
};

export const getSystemUi = (id: string): SystemUi | undefined => uis[id];

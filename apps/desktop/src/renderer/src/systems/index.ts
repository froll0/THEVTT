import type { Token } from '@thevtt/shared';
import type { FC } from 'react';
import { Dnd5eBestiary, dnd5eMonsterInitiative, Dnd5eStatBlock } from './dnd5e-2024/Bestiary';
import { Dnd5eBuilder } from './dnd5e-2024/Builder';
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
}

export interface BestiaryProps {
  onAdd: (token: Partial<Omit<Token, 'id'>> & { name: string }) => void;
  onRoll: (formula: string, label: string) => void;
}

export interface StatBlockProps {
  monsterId: string;
  onRoll: (formula: string, label: string) => void;
}

/** UI half of a game system plugin (rules live in @thevtt/systems). */
export interface SystemUi {
  Builder: FC<BuilderProps>;
  Sheet: FC<SheetProps>;
  Bestiary?: FC<BestiaryProps>;
  StatBlock?: FC<StatBlockProps>;
  monsterInitiative?: (monsterId: string) => number;
}

const uis: Record<string, SystemUi> = {
  'dnd5e-2024': { Builder: Dnd5eBuilder, Sheet: Dnd5eSheet, Bestiary: Dnd5eBestiary, StatBlock: Dnd5eStatBlock, monsterInitiative: dnd5eMonsterInitiative },
};

export const getSystemUi = (id: string): SystemUi | undefined => uis[id];

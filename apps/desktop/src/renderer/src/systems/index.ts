import type { FC } from 'react';
import { Dnd5eBuilder } from './dnd5e-2024/Builder';
import { Dnd5eSheet } from './dnd5e-2024/Sheet';

export interface BuilderProps<T = any> {
  value: T;
  onChange: (next: T) => void;
}

export interface SheetProps<T = any> {
  data: T;
  editable: boolean;
  onChange: (next: T) => void;
  onRoll: (formula: string, label: string) => void;
}

/** UI half of a game system plugin (rules live in @thevtt/systems). */
export interface SystemUi {
  Builder: FC<BuilderProps>;
  Sheet: FC<SheetProps>;
}

const uis: Record<string, SystemUi> = {
  'dnd5e-2024': { Builder: Dnd5eBuilder, Sheet: Dnd5eSheet },
};

export const getSystemUi = (id: string): SystemUi | undefined => uis[id];

import type { Ability, Skill } from './data';
import type { Kit } from './equipment';

export interface Feature {
  level: number;
  name: string;
  description: string;
}

export interface ChoiceOption {
  id: string;
  name: string;
  description: string;
  /** minimum class level to pick it */
  level?: number;
}

/** A class (or subclass) decision, stored in character.choices[key]. */
export interface ClassChoice {
  key: string;
  label: string;
  level: number;
  /** how many options at each class level (index = level - 1); default 1 */
  count?: number[];
  options: ChoiceOption[];
}

export interface ResourceDef {
  id: string;
  name: string;
  /** max uses at a given class level with the character's ability modifiers */
  max: (level: number, mods: Record<Ability, number>) => number;
  /** 'short' recovers on short and long rests */
  recharge: 'short' | 'long';
  /** short rest recovers a single use (e.g. Channel Divinity) */
  shortRestOne?: boolean;
  /** from this class level it recharges on short rests too */
  shortFrom?: number;
  level: number;
  /** die shown next to the counter */
  die?: (level: number) => string;
}

export interface SubclassDef {
  id: string;
  name: string;
  description: string;
  features: Feature[];
  /** spells always prepared, by class level */
  spells?: { level: number; spells: string[] }[];
  choices?: ClassChoice[];
}

export type CasterType = 'full' | 'half' | 'pact';

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primary: Ability[];
  saves: [Ability, Ability];
  skillChoices: number;
  /** null = any skill */
  skillList: Skill[] | null;
  armor: ('light' | 'medium' | 'heavy' | 'shield')[];
  /** 'finesseOrLight' / 'light': martial weapons with those properties */
  martial: boolean | 'finesseOrLight' | 'light';
  tools?: string;
  spellcasting?: {
    ability: Ability;
    type: CasterType;
    /** cantrips known per level (index = level - 1) */
    cantrips?: number[];
    /** spells prepared per level */
    prepared: number[];
  };
  /** weapon masteries per level */
  masteries?: number[];
  /** skill expertise gained: level → count */
  expertise?: { level: number; count: number; from?: Skill[] }[];
  unarmoredDefense?: Ability;
  /** metres added to speed while unarmored, by level */
  speedBonus?: (level: number) => number;
  features: Feature[];
  choices?: ClassChoice[];
  resources?: ResourceDef[];
  subclassLevel: number;
  subclassLabel: string;
  subclasses: SubclassDef[];
  asiLevels: number[];
  equipment: { label: string; kit: Kit; gold: number }[];
}

export const STANDARD_ASI = [4, 8, 12, 16, 19];

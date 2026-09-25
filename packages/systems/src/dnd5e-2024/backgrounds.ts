/** Backgrounds from SRD 5.2. */

import type { Ability, Skill } from './data';
import type { Kit } from './equipment';

export interface BackgroundDef {
  id: string;
  name: string;
  description: string;
  abilities: Ability[];
  skills: Skill[];
  feat: string;
  /** Magic Initiate list, when the feat is Magic Initiate */
  featOption?: string;
  tool: string;
  equipment: { a: Kit; aGold: number; bGold: number };
}

export const CUSTOM_BACKGROUND_ID = 'custom';

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'acolyte',
    name: 'Accolito',
    description: 'Hai servito in un tempio, tra riti, preghiere e testi sacri.',
    abilities: ['int', 'wis', 'cha'],
    skills: ['insight', 'religion'],
    feat: 'magicInitiate',
    featOption: 'cleric',
    tool: 'Strumenti da calligrafo',
    equipment: {
      a: [{ item: 'calligraphersSupplies' }, { item: 'book' }, { item: 'holySymbol' }, { item: 'parchment', qty: 10 }, { item: 'robe' }],
      aGold: 8,
      bGold: 50,
    },
  },
  {
    id: 'criminal',
    name: 'Criminale',
    description: 'Vivevi di espedienti nei vicoli: borseggi, scassi, contrabbando.',
    abilities: ['dex', 'con', 'int'],
    skills: ['sleightOfHand', 'stealth'],
    feat: 'alert',
    tool: 'Arnesi da scasso',
    equipment: {
      a: [{ item: 'dagger', qty: 2 }, { item: 'thievesTools' }, { item: 'crowbar' }, { item: 'pouch', qty: 2 }, { item: 'travelersClothes' }],
      aGold: 16,
      bGold: 50,
    },
  },
  {
    id: 'sage',
    name: 'Sapiente',
    description: 'Hai passato gli anni tra biblioteche e maestri, in cerca di conoscenza.',
    abilities: ['con', 'int', 'wis'],
    skills: ['arcana', 'history'],
    feat: 'magicInitiate',
    featOption: 'wizard',
    tool: 'Strumenti da calligrafo',
    equipment: {
      a: [{ item: 'quarterstaff' }, { item: 'calligraphersSupplies' }, { item: 'book' }, { item: 'parchment', qty: 8 }, { item: 'robe' }],
      aGold: 8,
      bGold: 50,
    },
  },
  {
    id: 'soldier',
    name: 'Soldato',
    description: 'Hai combattuto in un esercito o una compagnia di ventura.',
    abilities: ['str', 'dex', 'con'],
    skills: ['athletics', 'intimidation'],
    feat: 'savageAttacker',
    tool: 'Set da gioco',
    equipment: {
      a: [
        { item: 'spear' },
        { item: 'shortbow' },
        { item: 'arrows' },
        { item: 'gamingSet' },
        { item: 'healersKit' },
        { item: 'quiver' },
        { item: 'travelersClothes' },
      ],
      aGold: 14,
      bGold: 50,
    },
  },
];

export const backgroundById = (id: string) => BACKGROUNDS.find((b) => b.id === id);

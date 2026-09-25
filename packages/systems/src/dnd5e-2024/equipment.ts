/** Equipment from SRD 5.2 (2024 rules). Weights in lb, costs in gp. */

export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export const DAMAGE_TYPES: Record<DamageType, string> = {
  acid: 'acido',
  bludgeoning: 'contundenti',
  cold: 'freddo',
  fire: 'fuoco',
  force: 'forza',
  lightning: 'fulmine',
  necrotic: 'necrotici',
  piercing: 'perforanti',
  poison: 'veleno',
  psychic: 'psichici',
  radiant: 'radiosi',
  slashing: 'taglienti',
  thunder: 'tuono',
};

export type WeaponProperty = 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'range' | 'reach' | 'thrown' | 'twoHanded' | 'versatile';
export type Mastery = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';

export const PROPERTY_LABELS: Record<WeaponProperty, string> = {
  ammunition: 'Munizioni',
  finesse: 'Accurata',
  heavy: 'Pesante',
  light: 'Leggera',
  loading: 'Ricarica',
  range: 'Gittata',
  reach: 'Portata',
  thrown: 'Da lancio',
  twoHanded: 'A due mani',
  versatile: 'Versatile',
};

export const MASTERIES: Record<Mastery, { name: string; description: string }> = {
  cleave: {
    name: 'Fendere',
    description: 'Se colpisci, puoi attaccare un’altra creatura entro 1,5 m dal bersaglio e alla tua portata: aggiungi il danno dell’arma senza modificatore (una volta per turno).',
  },
  graze: { name: 'Sfiorare', description: 'Se manchi, infliggi comunque danni pari al modificatore di caratteristica usato per l’attacco.' },
  nick: { name: 'Intaccare', description: 'L’attacco extra della proprietà Leggera fa parte dell’azione di Attacco invece di richiedere l’azione bonus (una volta per turno).' },
  push: { name: 'Spingere', description: 'Se colpisci, puoi spingere il bersaglio (Grande o più piccolo) di 3 m lontano da te.' },
  sap: { name: 'Fiaccare', description: 'Se colpisci, il bersaglio ha Svantaggio al suo prossimo tiro per colpire prima del tuo prossimo turno.' },
  slow: { name: 'Rallentare', description: 'Se colpisci e infliggi danni, la Velocità del bersaglio diminuisce di 3 m fino all’inizio del tuo prossimo turno.' },
  topple: { name: 'Rovesciare', description: 'Se colpisci, il bersaglio fa un TS su Costituzione (CD 8 + mod + competenza) o cade Prono.' },
  vex: { name: 'Irritare', description: 'Se colpisci e infliggi danni, hai Vantaggio al tuo prossimo tiro per colpire quel bersaglio prima della fine del tuo prossimo turno.' },
};

export interface WeaponDef {
  id: string;
  name: string;
  category: 'simple' | 'martial';
  kind: 'melee' | 'ranged';
  damage: string;
  damageType: DamageType;
  versatile?: string;
  properties: WeaponProperty[];
  range?: [number, number];
  mastery: Mastery;
  weight: number;
  cost: number;
}

const w = (
  id: string,
  name: string,
  category: WeaponDef['category'],
  kind: WeaponDef['kind'],
  damage: string,
  damageType: DamageType,
  properties: WeaponProperty[],
  mastery: Mastery,
  weight: number,
  cost: number,
  extra: Partial<WeaponDef> = {},
): WeaponDef => ({ id, name, category, kind, damage, damageType, properties, mastery, weight, cost, ...extra });

export const WEAPONS: WeaponDef[] = [
  // simple melee
  w('club', 'Randello', 'simple', 'melee', '1d4', 'bludgeoning', ['light'], 'slow', 2, 0.1),
  w('dagger', 'Pugnale', 'simple', 'melee', '1d4', 'piercing', ['finesse', 'light', 'thrown'], 'nick', 1, 2, { range: [6, 18] }),
  w('greatclub', 'Randello pesante', 'simple', 'melee', '1d8', 'bludgeoning', ['twoHanded'], 'push', 10, 0.2),
  w('handaxe', 'Ascia', 'simple', 'melee', '1d6', 'slashing', ['light', 'thrown'], 'vex', 2, 5, { range: [6, 18] }),
  w('javelin', 'Giavellotto', 'simple', 'melee', '1d6', 'piercing', ['thrown'], 'slow', 2, 0.5, { range: [9, 36] }),
  w('lightHammer', 'Martello leggero', 'simple', 'melee', '1d4', 'bludgeoning', ['light', 'thrown'], 'nick', 2, 2, { range: [6, 18] }),
  w('mace', 'Mazza', 'simple', 'melee', '1d6', 'bludgeoning', [], 'sap', 4, 5),
  w('quarterstaff', 'Bastone ferrato', 'simple', 'melee', '1d6', 'bludgeoning', ['versatile'], 'topple', 4, 0.2, { versatile: '1d8' }),
  w('sickle', 'Falcetto', 'simple', 'melee', '1d4', 'slashing', ['light'], 'nick', 2, 1),
  w('spear', 'Lancia', 'simple', 'melee', '1d6', 'piercing', ['thrown', 'versatile'], 'sap', 3, 1, { range: [6, 18], versatile: '1d8' }),
  // simple ranged
  w('dart', 'Dardo', 'simple', 'ranged', '1d4', 'piercing', ['finesse', 'thrown'], 'vex', 0.25, 0.05, { range: [6, 18] }),
  w('lightCrossbow', 'Balestra leggera', 'simple', 'ranged', '1d8', 'piercing', ['ammunition', 'loading', 'twoHanded'], 'slow', 5, 25, { range: [24, 96] }),
  w('shortbow', 'Arco corto', 'simple', 'ranged', '1d6', 'piercing', ['ammunition', 'twoHanded'], 'vex', 2, 25, { range: [24, 96] }),
  w('sling', 'Fionda', 'simple', 'ranged', '1d4', 'bludgeoning', ['ammunition'], 'slow', 0, 0.1, { range: [9, 36] }),
  // martial melee
  w('battleaxe', 'Ascia da battaglia', 'martial', 'melee', '1d8', 'slashing', ['versatile'], 'topple', 4, 10, { versatile: '1d10' }),
  w('flail', 'Mazzafrusto', 'martial', 'melee', '1d8', 'bludgeoning', [], 'sap', 2, 10),
  w('glaive', 'Falcione', 'martial', 'melee', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'graze', 6, 20),
  w('greataxe', 'Ascia bipenne', 'martial', 'melee', '1d12', 'slashing', ['heavy', 'twoHanded'], 'cleave', 7, 30),
  w('greatsword', 'Spadone', 'martial', 'melee', '2d6', 'slashing', ['heavy', 'twoHanded'], 'graze', 6, 50),
  w('halberd', 'Alabarda', 'martial', 'melee', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'cleave', 6, 20),
  w('lance', 'Lancia da cavaliere', 'martial', 'melee', '1d10', 'piercing', ['heavy', 'reach', 'twoHanded'], 'topple', 6, 10),
  w('longsword', 'Spada lunga', 'martial', 'melee', '1d8', 'slashing', ['versatile'], 'sap', 3, 15, { versatile: '1d10' }),
  w('maul', 'Maglio', 'martial', 'melee', '2d6', 'bludgeoning', ['heavy', 'twoHanded'], 'topple', 10, 10),
  w('morningstar', 'Morning star', 'martial', 'melee', '1d8', 'piercing', [], 'sap', 4, 15),
  w('pike', 'Picca', 'martial', 'melee', '1d10', 'piercing', ['heavy', 'reach', 'twoHanded'], 'push', 18, 5),
  w('rapier', 'Stocco', 'martial', 'melee', '1d8', 'piercing', ['finesse'], 'vex', 2, 25),
  w('scimitar', 'Scimitarra', 'martial', 'melee', '1d6', 'slashing', ['finesse', 'light'], 'nick', 3, 25),
  w('shortsword', 'Spada corta', 'martial', 'melee', '1d6', 'piercing', ['finesse', 'light'], 'vex', 2, 10),
  w('trident', 'Tridente', 'martial', 'melee', '1d8', 'piercing', ['thrown', 'versatile'], 'topple', 4, 5, { range: [6, 18], versatile: '1d10' }),
  w('warhammer', 'Martello da guerra', 'martial', 'melee', '1d8', 'bludgeoning', ['versatile'], 'push', 5, 15, { versatile: '1d10' }),
  w('warPick', 'Piccone da guerra', 'martial', 'melee', '1d8', 'piercing', ['versatile'], 'sap', 2, 5, { versatile: '1d10' }),
  w('whip', 'Frusta', 'martial', 'melee', '1d4', 'slashing', ['finesse', 'reach'], 'slow', 3, 2),
  // martial ranged
  w('blowgun', 'Cerbottana', 'martial', 'ranged', '1', 'piercing', ['ammunition', 'loading'], 'vex', 1, 10, { range: [7.5, 30] }),
  w('handCrossbow', 'Balestra a mano', 'martial', 'ranged', '1d6', 'piercing', ['ammunition', 'light', 'loading'], 'vex', 3, 75, { range: [9, 36] }),
  w('heavyCrossbow', 'Balestra pesante', 'martial', 'ranged', '1d10', 'piercing', ['ammunition', 'heavy', 'loading', 'twoHanded'], 'push', 18, 50, { range: [30, 120] }),
  w('longbow', 'Arco lungo', 'martial', 'ranged', '1d8', 'piercing', ['ammunition', 'heavy', 'twoHanded'], 'slow', 2, 50, { range: [45, 180] }),
  w('musket', 'Moschetto', 'martial', 'ranged', '1d12', 'piercing', ['ammunition', 'loading', 'twoHanded'], 'slow', 10, 500, { range: [12, 36] }),
  w('pistol', 'Pistola', 'martial', 'ranged', '1d10', 'piercing', ['ammunition', 'loading'], 'vex', 3, 250, { range: [9, 27] }),
];

export interface ArmorDef {
  id: string;
  name: string;
  category: 'none' | 'light' | 'medium' | 'heavy' | 'shield';
  base: number;
  /** max DEX bonus; null = unlimited, 0 = none */
  maxDex: number | null;
  strength?: number;
  stealthDisadvantage?: boolean;
  weight: number;
  cost: number;
}

export const ARMORS: ArmorDef[] = [
  { id: 'padded', name: 'Armatura imbottita', category: 'light', base: 11, maxDex: null, stealthDisadvantage: true, weight: 8, cost: 5 },
  { id: 'leather', name: 'Armatura di cuoio', category: 'light', base: 11, maxDex: null, weight: 10, cost: 10 },
  { id: 'studded', name: 'Cuoio borchiato', category: 'light', base: 12, maxDex: null, weight: 13, cost: 45 },
  { id: 'hide', name: 'Armatura di pelle', category: 'medium', base: 12, maxDex: 2, weight: 12, cost: 10 },
  { id: 'chainShirt', name: 'Giaco di maglia', category: 'medium', base: 13, maxDex: 2, weight: 20, cost: 50 },
  { id: 'scale', name: 'Corazza a scaglie', category: 'medium', base: 14, maxDex: 2, stealthDisadvantage: true, weight: 45, cost: 50 },
  { id: 'breastplate', name: 'Corazza di piastre', category: 'medium', base: 14, maxDex: 2, weight: 20, cost: 400 },
  { id: 'halfPlate', name: 'Mezza armatura', category: 'medium', base: 15, maxDex: 2, stealthDisadvantage: true, weight: 40, cost: 750 },
  { id: 'ringMail', name: 'Cotta ad anelli', category: 'heavy', base: 14, maxDex: 0, stealthDisadvantage: true, weight: 40, cost: 30 },
  { id: 'chainMail', name: 'Cotta di maglia', category: 'heavy', base: 16, maxDex: 0, strength: 13, stealthDisadvantage: true, weight: 55, cost: 75 },
  { id: 'splint', name: 'Armatura a strisce', category: 'heavy', base: 17, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 60, cost: 200 },
  { id: 'plate', name: 'Armatura completa', category: 'heavy', base: 18, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 65, cost: 1500 },
  { id: 'shield', name: 'Scudo', category: 'shield', base: 2, maxDex: null, weight: 6, cost: 10 },
];

export interface GearDef {
  id: string;
  name: string;
  weight: number;
  cost: number;
  /** focus for spellcasting */
  focus?: 'arcane' | 'druidic' | 'holy';
  /** ammunition bundles count as many pieces */
  quantity?: number;
}

export const GEAR: GearDef[] = [
  { id: 'arrows', name: 'Frecce', weight: 1, cost: 1, quantity: 20 },
  { id: 'bolts', name: 'Quadrelli', weight: 1.5, cost: 1, quantity: 20 },
  { id: 'quiver', name: 'Faretra', weight: 1, cost: 1 },
  { id: 'backpack', name: 'Zaino', weight: 5, cost: 2 },
  { id: 'bedroll', name: 'Giaciglio', weight: 7, cost: 1 },
  { id: 'book', name: 'Libro', weight: 5, cost: 25 },
  { id: 'spellbook', name: 'Libro degli incantesimi', weight: 3, cost: 50 },
  { id: 'candle', name: 'Candela', weight: 0, cost: 0.01 },
  { id: 'crowbar', name: 'Piede di porco', weight: 5, cost: 2 },
  { id: 'healersKit', name: 'Kit da guaritore', weight: 3, cost: 5 },
  { id: 'holySymbol', name: 'Simbolo sacro', weight: 1, cost: 5, focus: 'holy' },
  { id: 'arcaneFocus', name: 'Focus arcano', weight: 1, cost: 10, focus: 'arcane' },
  { id: 'druidicFocus', name: 'Focus druidico', weight: 0, cost: 1, focus: 'druidic' },
  { id: 'lantern', name: 'Lanterna schermabile', weight: 2, cost: 5 },
  { id: 'oil', name: 'Olio (ampolla)', weight: 1, cost: 0.1 },
  { id: 'parchment', name: 'Pergamena (foglio)', weight: 0, cost: 0.1 },
  { id: 'potionHealing', name: 'Pozione di guarigione', weight: 0.5, cost: 50 },
  { id: 'pouch', name: 'Borsa', weight: 1, cost: 0.5 },
  { id: 'rations', name: 'Razioni (1 giorno)', weight: 2, cost: 0.5 },
  { id: 'robe', name: 'Veste', weight: 4, cost: 1 },
  { id: 'rope', name: 'Corda (15 m)', weight: 5, cost: 1 },
  { id: 'tinderbox', name: 'Acciarino', weight: 1, cost: 0.5 },
  { id: 'torch', name: 'Torcia', weight: 1, cost: 0.01 },
  { id: 'travelersClothes', name: 'Abiti da viaggiatore', weight: 4, cost: 2 },
  { id: 'waterskin', name: 'Otre', weight: 5, cost: 0.2 },
  // tools
  { id: 'calligraphersSupplies', name: 'Strumenti da calligrafo', weight: 5, cost: 10 },
  { id: 'thievesTools', name: 'Arnesi da scasso', weight: 1, cost: 25 },
  { id: 'herbalismKit', name: 'Borsa da erborista', weight: 3, cost: 5 },
  { id: 'gamingSet', name: 'Set da gioco', weight: 0, cost: 1 },
  { id: 'musicalInstrument', name: 'Strumento musicale', weight: 3, cost: 20 },
  { id: 'artisansTools', name: 'Strumenti da artigiano', weight: 5, cost: 10 },
  // packs
  { id: 'burglarsPack', name: 'Dotazione da scassinatore', weight: 42, cost: 16 },
  { id: 'dungeoneersPack', name: 'Dotazione da esploratore di dungeon', weight: 55, cost: 12 },
  { id: 'entertainersPack', name: 'Dotazione da intrattenitore', weight: 58, cost: 40 },
  { id: 'explorersPack', name: 'Dotazione da esploratore', weight: 55, cost: 10 },
  { id: 'priestsPack', name: 'Dotazione da sacerdote', weight: 29, cost: 33 },
  { id: 'scholarsPack', name: 'Dotazione da studioso', weight: 22, cost: 40 },
];

export const weaponById = (id: string) => WEAPONS.find((x) => x.id === id);
export const armorById = (id: string) => ARMORS.find((x) => x.id === id);
export const gearById = (id: string) => GEAR.find((x) => x.id === id);

/** A starting-equipment entry: an item reference and a quantity. */
export type Kit = { item: string; qty?: number }[];

export function itemName(id: string): string {
  return weaponById(id)?.name ?? armorById(id)?.name ?? gearById(id)?.name ?? id;
}

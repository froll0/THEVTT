/**
 * D&D 5.5 (2024) reference data, limited to the System Reference Document 5.2
 * (CC-BY-4.0, © Wizards of the Coast). Labels are Italian; ids are stable English keys.
 */

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_LABELS: Record<Ability, { short: string; name: string }> = {
  str: { short: 'FOR', name: 'Forza' },
  dex: { short: 'DES', name: 'Destrezza' },
  con: { short: 'COS', name: 'Costituzione' },
  int: { short: 'INT', name: 'Intelligenza' },
  wis: { short: 'SAG', name: 'Saggezza' },
  cha: { short: 'CAR', name: 'Carisma' },
};

export const SKILLS = {
  acrobatics: { name: 'Acrobazia', ability: 'dex' },
  animalHandling: { name: 'Addestrare Animali', ability: 'wis' },
  arcana: { name: 'Arcano', ability: 'int' },
  athletics: { name: 'Atletica', ability: 'str' },
  deception: { name: 'Inganno', ability: 'cha' },
  history: { name: 'Storia', ability: 'int' },
  insight: { name: 'Intuizione', ability: 'wis' },
  intimidation: { name: 'Intimidire', ability: 'cha' },
  investigation: { name: 'Indagare', ability: 'int' },
  medicine: { name: 'Medicina', ability: 'wis' },
  nature: { name: 'Natura', ability: 'int' },
  perception: { name: 'Percezione', ability: 'wis' },
  performance: { name: 'Intrattenere', ability: 'cha' },
  persuasion: { name: 'Persuasione', ability: 'cha' },
  religion: { name: 'Religione', ability: 'int' },
  sleightOfHand: { name: 'Rapidità di Mano', ability: 'dex' },
  stealth: { name: 'Furtività', ability: 'dex' },
  survival: { name: 'Sopravvivenza', ability: 'wis' },
} as const satisfies Record<string, { name: string; ability: Ability }>;
export type Skill = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as Skill[];

export interface ClassDef {
  id: string;
  name: string;
  hitDie: number;
  primary: Ability[];
  saves: [Ability, Ability];
  skillChoices: number;
  /** null = any skill */
  skillList: Skill[] | null;
  spellcasting: Ability | null;
  unarmoredDefense?: Ability;
  description: string;
}

export const CLASSES: ClassDef[] = [
  { id: 'barbarian', name: 'Barbaro', hitDie: 12, primary: ['str'], saves: ['str', 'con'], skillChoices: 2,
    skillList: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'], spellcasting: null,
    unarmoredDefense: 'con', description: 'Guerriero primordiale alimentato dalla furia.' },
  { id: 'bard', name: 'Bardo', hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'], skillChoices: 3, skillList: null,
    spellcasting: 'cha', description: 'Artista ispiratore la cui magia risuona nella musica.' },
  { id: 'cleric', name: 'Chierico', hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], skillChoices: 2,
    skillList: ['history', 'insight', 'medicine', 'persuasion', 'religion'], spellcasting: 'wis',
    description: 'Campione sacerdotale che incanala il potere divino.' },
  { id: 'druid', name: 'Druido', hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], skillChoices: 2,
    skillList: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    spellcasting: 'wis', description: 'Sacerdote della natura che attinge alla magia primordiale.' },
  { id: 'fighter', name: 'Guerriero', hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'], skillChoices: 2,
    skillList: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'],
    spellcasting: null, description: 'Maestro di armi e tattiche marziali.' },
  { id: 'monk', name: 'Monaco', hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], skillChoices: 2,
    skillList: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'], spellcasting: null,
    unarmoredDefense: 'wis', description: 'Artista marziale che canalizza l’energia interiore.' },
  { id: 'paladin', name: 'Paladino', hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], skillChoices: 2,
    skillList: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'], spellcasting: 'cha',
    description: 'Guerriero devoto legato a un giuramento sacro.' },
  { id: 'ranger', name: 'Ranger', hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], skillChoices: 3,
    skillList: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    spellcasting: 'wis', description: 'Vagabondo delle terre selvagge, cacciatore implacabile.' },
  { id: 'rogue', name: 'Ladro', hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], skillChoices: 4,
    skillList: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'],
    spellcasting: null, description: 'Esperto furtivo che colpisce i punti deboli.' },
  { id: 'sorcerer', name: 'Stregone', hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], skillChoices: 2,
    skillList: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'], spellcasting: 'cha',
    description: 'Incantatore con una magia innata nel sangue.' },
  { id: 'warlock', name: 'Warlock', hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], skillChoices: 2,
    skillList: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    spellcasting: 'cha', description: 'Occultista legato a un patrono ultraterreno.' },
  { id: 'wizard', name: 'Mago', hitDie: 6, primary: ['int'], saves: ['int', 'wis'], skillChoices: 2,
    skillList: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'], spellcasting: 'int',
    description: 'Studioso della magia arcana.' },
];

export type Size = 'small' | 'medium';

export interface SpeciesDef {
  id: string;
  name: string;
  sizes: Size[];
  speed: number;
  darkvision: number;
  traits: string[];
  /** extra skill proficiency granted by the species */
  skillChoice?: { count: number; from: Skill[] | null };
  hpPerLevel?: number;
}

export const SPECIES: SpeciesDef[] = [
  { id: 'dragonborn', name: 'Dragonide', sizes: ['medium'], speed: 30, darkvision: 60,
    traits: ['Ascendenza draconica', 'Arma a soffio', 'Resistenza ai danni', 'Volo draconico (5° livello)'] },
  { id: 'dwarf', name: 'Nano', sizes: ['medium'], speed: 30, darkvision: 120, hpPerLevel: 1,
    traits: ['Resilienza nanica', 'Robustezza nanica', 'Sensibilità alla pietra'] },
  { id: 'elf', name: 'Elfo', sizes: ['medium'], speed: 30, darkvision: 60,
    skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] },
    traits: ['Lignaggio elfico', 'Ascendenza fatata', 'Sensi acuti', 'Trance'] },
  { id: 'gnome', name: 'Gnomo', sizes: ['small'], speed: 30, darkvision: 60,
    traits: ['Astuzia gnomesca', 'Lignaggio gnomesco'] },
  { id: 'goliath', name: 'Goliath', sizes: ['medium'], speed: 35, darkvision: 0,
    traits: ['Ascendenza gigante', 'Forma grande (5° livello)', 'Corporatura possente'] },
  { id: 'halfling', name: 'Halfling', sizes: ['small'], speed: 30, darkvision: 0,
    traits: ['Coraggioso', 'Agilità halfling', 'Fortunato', 'Furtività innata'] },
  { id: 'human', name: 'Umano', sizes: ['medium', 'small'], speed: 30, darkvision: 0,
    skillChoice: { count: 1, from: null },
    traits: ['Intraprendente (Ispirazione eroica)', 'Abile', 'Versatile (talento di origine)'] },
  { id: 'orc', name: 'Orco', sizes: ['medium'], speed: 30, darkvision: 120,
    traits: ['Scarica di adrenalina', 'Tenacia implacabile'] },
  { id: 'tiefling', name: 'Tiefling', sizes: ['medium', 'small'], speed: 30, darkvision: 60,
    traits: ['Eredità immonda', 'Presenza ultraterrena'] },
];

export interface BackgroundDef {
  id: string;
  name: string;
  abilities: Ability[];
  skills: Skill[];
  feat: string;
  tool: string;
}

export const CUSTOM_BACKGROUND_ID = 'custom';

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'acolyte', name: 'Accolito', abilities: ['int', 'wis', 'cha'], skills: ['insight', 'religion'],
    feat: 'Iniziato alla magia (Chierico)', tool: 'Strumenti da calligrafo' },
  { id: 'criminal', name: 'Criminale', abilities: ['dex', 'con', 'int'], skills: ['sleightOfHand', 'stealth'],
    feat: 'Allerta', tool: 'Arnesi da scasso' },
  { id: 'sage', name: 'Sapiente', abilities: ['con', 'int', 'wis'], skills: ['arcana', 'history'],
    feat: 'Iniziato alla magia (Mago)', tool: 'Strumenti da calligrafo' },
  { id: 'soldier', name: 'Soldato', abilities: ['str', 'dex', 'con'], skills: ['athletics', 'intimidation'],
    feat: 'Attaccante selvaggio', tool: 'Set da gioco' },
];

export interface ArmorDef {
  id: string;
  name: string;
  category: 'none' | 'light' | 'medium' | 'heavy';
  base: number;
  /** max DEX bonus; null = unlimited, 0 = none */
  maxDex: number | null;
}

export const ARMORS: ArmorDef[] = [
  { id: 'none', name: 'Nessuna armatura', category: 'none', base: 10, maxDex: null },
  { id: 'padded', name: 'Imbottita', category: 'light', base: 11, maxDex: null },
  { id: 'leather', name: 'Cuoio', category: 'light', base: 11, maxDex: null },
  { id: 'studded', name: 'Cuoio borchiato', category: 'light', base: 12, maxDex: null },
  { id: 'hide', name: 'Pelle', category: 'medium', base: 12, maxDex: 2 },
  { id: 'chainShirt', name: 'Giaco di maglia', category: 'medium', base: 13, maxDex: 2 },
  { id: 'scale', name: 'Corazza a scaglie', category: 'medium', base: 14, maxDex: 2 },
  { id: 'breastplate', name: 'Corazza di piastre', category: 'medium', base: 14, maxDex: 2 },
  { id: 'halfPlate', name: 'Mezza armatura', category: 'medium', base: 15, maxDex: 2 },
  { id: 'ringMail', name: 'Cotta ad anelli', category: 'heavy', base: 14, maxDex: 0 },
  { id: 'chainMail', name: 'Cotta di maglia', category: 'heavy', base: 16, maxDex: 0 },
  { id: 'splint', name: 'Armatura a strisce', category: 'heavy', base: 17, maxDex: 0 },
  { id: 'plate', name: 'Armatura completa', category: 'heavy', base: 18, maxDex: 0 },
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const CONDITIONS = [
  'Accecato', 'Affascinato', 'Assordato', 'Afferrato', 'Avvelenato', 'Incapacitato', 'Invisibile',
  'Paralizzato', 'Pietrificato', 'Prono', 'Spaventato', 'Stordito', 'Privo di sensi', 'Trattenuto',
  'Indebolimento', 'Concentrazione',
];

export const ALIGNMENTS = [
  'Legale buono', 'Neutrale buono', 'Caotico buono', 'Legale neutrale', 'Neutrale',
  'Caotico neutrale', 'Legale malvagio', 'Neutrale malvagio', 'Caotico malvagio',
];

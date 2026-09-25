/**
 * D&D 5.5 (2024) core reference data, limited to the System Reference
 * Document 5.2 (CC-BY-4.0, © Wizards of the Coast). Italian labels, stable English ids.
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

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const LANGUAGES = {
  standard: ['Comune', 'Comune dei segni', 'Draconico', 'Elfico', 'Gigante', 'Gnomesco', 'Goblin', 'Halfling', 'Nanico', 'Orchesco'],
  rare: ['Abissale', 'Celestiale', 'Gergo dei druidi', 'Gergo ladresco', 'Infernale', 'Primordiale', 'Silvano', 'Sottocomune', 'Linguaggio delle profondità'],
};

export const ALIGNMENTS = [
  'Legale buono',
  'Neutrale buono',
  'Caotico buono',
  'Legale neutrale',
  'Neutrale',
  'Caotico neutrale',
  'Legale malvagio',
  'Neutrale malvagio',
  'Caotico malvagio',
];

export const CONDITION_INFO: Record<string, string> = {
  Accecato: 'Non vedi; fallisci le prove che richiedono la vista. I tuoi attacchi hanno Svantaggio, quelli contro di te Vantaggio.',
  Affascinato: 'Non puoi attaccare chi ti ha affascinato; lui ha Vantaggio alle prove per interagire socialmente con te.',
  Assordato: 'Non senti; fallisci le prove che richiedono l’udito.',
  Afferrato: 'Velocità 0; Svantaggio agli attacchi contro chiunque non sia chi ti afferra, che può trascinarti.',
  Avvelenato: 'Svantaggio ai tiri per colpire e alle prove di caratteristica.',
  Incapacitato: 'Niente azioni, azioni bonus né reazioni; la concentrazione si interrompe; Svantaggio all’iniziativa.',
  Invisibile: 'Non puoi essere visto: Vantaggio ai tuoi attacchi, Svantaggio a quelli contro di te.',
  Paralizzato: 'Incapacitato, Velocità 0, fallisci i TS su Forza e Destrezza; i colpi entro 1,5 m sono critici.',
  Pietrificato: 'Trasformato in sostanza inanimata: Incapacitato, resistenza a tutti i danni, immune al veleno.',
  Prono: 'Puoi solo strisciare; Svantaggio ai tuoi attacchi; attacchi entro 1,5 m contro di te con Vantaggio, più lontani con Svantaggio.',
  Spaventato: 'Svantaggio a prove e attacchi mentre vedi la fonte della paura; non puoi avvicinarti a essa.',
  Stordito: 'Incapacitato, fallisci i TS su Forza e Destrezza; gli attacchi contro di te hanno Vantaggio.',
  'Privo di sensi': 'Incapacitato e Prono, lasci cadere ciò che tieni; fallisci i TS su Forza e Destrezza; colpi entro 1,5 m critici.',
  Trattenuto: 'Velocità 0; Svantaggio ai tuoi attacchi e ai TS su Destrezza; attacchi contro di te con Vantaggio.',
  Indebolimento: 'Livelli 1-6: −2 per livello a ogni prova d20 e −1,5 m di Velocità per livello. Al 6° livello muori.',
  Concentrazione: 'Stai mantenendo un incantesimo: se subisci danni fai un TS su Costituzione (CD 10 o metà dei danni).',
};

export const CONDITIONS = Object.keys(CONDITION_INFO);

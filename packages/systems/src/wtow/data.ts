/**
 * Warhammer: the Old World – Roleplaying Game (Cubicle 7, edizione italiana Need Games).
 * Dati di gioco strutturati; le descrizioni sono riassunti brevi, il testo completo è nei manuali.
 */

export const CHARACTERISTICS = ['ac', 'ab', 'f', 'r', 'i', 'ag', 'ra', 'soc'] as const;
export type CharId = (typeof CHARACTERISTICS)[number];

export const CHAR_INFO: Record<CharId, { short: string; name: string }> = {
  ac: { short: 'AC', name: 'Abilità di Combattimento' },
  ab: { short: 'AB', name: 'Abilità Balistica' },
  f: { short: 'F', name: 'Forza' },
  r: { short: 'R', name: 'Resistenza' },
  i: { short: 'I', name: 'Iniziativa' },
  ag: { short: 'Ag', name: 'Agilità' },
  ra: { short: 'Ra', name: 'Ragione' },
  soc: { short: 'Soc', name: 'Socialità' },
};

export const SKILLS = [
  'mischia', 'difesa', 'tiro', 'lancio', 'muscoli', 'lavoro', 'sopravvivenza', 'tempra',
  'percezione', 'destrezza', 'atletica', 'furtivita', 'volonta', 'memoria', 'comando', 'fascino',
] as const;
export type SkillId = (typeof SKILLS)[number];

export const SKILL_INFO: Record<SkillId, { name: string; char: CharId; text: string }> = {
  mischia: { name: 'Mischia', char: 'ac', text: 'Attaccare in corpo a corpo con armi da mischia.' },
  difesa: { name: 'Difesa', char: 'ac', text: 'Parare e opporsi agli attacchi in mischia (con uno scudo anche al Tiro).' },
  tiro: { name: 'Tiro', char: 'ab', text: 'Attaccare con archi, balestre e armi da fuoco.' },
  lancio: { name: 'Lancio', char: 'ab', text: 'Scagliare armi e oggetti con precisione.' },
  muscoli: { name: 'Muscoli', char: 'f', text: 'Forza bruta: sollevare, spingere, lottare, colpire a mani nude.' },
  lavoro: { name: 'Lavoro', char: 'f', text: 'Fatica fisica e mestieri manuali.' },
  sopravvivenza: { name: 'Sopravvivenza', char: 'r', text: 'Orientarsi, cacciare e resistere nelle terre selvagge.' },
  tempra: { name: 'Tempra', char: 'r', text: 'Resistere a dolore, veleni, malattie, infezioni.' },
  percezione: { name: 'Percezione', char: 'i', text: 'Notare dettagli, pericoli e indizi.' },
  destrezza: { name: 'Destrezza', char: 'i', text: 'Lavori di precisione, ricaricare, scassinare, borseggiare.' },
  atletica: { name: 'Atletica', char: 'ag', text: 'Correre, saltare, arrampicarsi, schivare gli attacchi.' },
  furtivita: { name: 'Furtività', char: 'ag', text: 'Muoversi senza farsi notare e nascondersi.' },
  volonta: { name: 'Volontà', char: 'ra', text: 'Forza d’animo, resistere alla paura; la Prova di Magia.' },
  memoria: { name: 'Memoria', char: 'ra', text: 'Ricordare ciò che si conosce, studiare.' },
  comando: { name: 'Comando', char: 'soc', text: 'Dare ordini, intimidire, rimuovere Atterrito dagli alleati.' },
  fascino: { name: 'Fascino', char: 'soc', text: 'Persuadere, ingannare, mercanteggiare, intrattenere.' },
};

export type Status = 'bronzo' | 'argento' | 'oro';
export const STATUS_LABEL: Record<Status, string> = { bronzo: 'Bronzo', argento: 'Argento', oro: 'Oro' };

export type Speed = 'Lenta' | 'Normale' | 'Veloce';

/* ------------------------------------------------------------------ Stirpi */

export type LineageId = 'alto-elfo' | 'bretonniano' | 'elfo-silvano' | 'halfling' | 'imperiale' | 'nano';
export type Species = 'Elfo' | 'Halfling' | 'Nano' | 'Umano';

export interface Lineage {
  id: LineageId;
  name: string;
  /** plurale, come nelle tabelle */
  plural: string;
  species: Species;
  fate: number;
  /** abilità portate a 3 senza scelta */
  skills: SkillId[];
  /** abilità a scelta da portare a 3 */
  chooseSkills: number;
  /** saperi iniziali; le stringhe con " o " sono scelte */
  lore: string[];
  /** quanti tiri sulla tabella dei talenti */
  talentRolls: number;
  talentTable: string[];
  /** nota sui talenti (sostituzioni obbligatorie o facoltative) */
  talentNote?: string;
  /** talenti assegnati comunque */
  fixedTalents?: string[];
  names?: string;
}

export const BASE_CHARS: Record<Species, Record<CharId, number>> = {
  Elfo: { ac: 3, ab: 3, f: 3, r: 2, i: 3, ag: 3, ra: 3, soc: 3 },
  Halfling: { ac: 2, ab: 3, f: 2, r: 2, i: 3, ag: 3, ra: 2, soc: 3 },
  Nano: { ac: 3, ab: 2, f: 3, r: 4, i: 2, ag: 2, ra: 3, soc: 2 },
  Umano: { ac: 2, ab: 2, f: 3, r: 3, i: 3, ag: 3, ra: 2, soc: 2 },
};

export const MAX_CHARS: Record<Species, Record<CharId, number>> = {
  Elfo: { ac: 7, ab: 7, f: 6, r: 4, i: 7, ag: 7, ra: 7, soc: 6 },
  Halfling: { ac: 5, ab: 6, f: 4, r: 4, i: 6, ag: 7, ra: 6, soc: 7 },
  Nano: { ac: 7, ab: 6, f: 6, r: 7, i: 5, ag: 5, ra: 6, soc: 5 },
  Umano: { ac: 6, ab: 6, f: 6, r: 6, i: 6, ag: 6, ra: 6, soc: 6 },
};

export const LINEAGES: Lineage[] = [
  {
    id: 'alto-elfo', name: 'Alto Elfo', plural: 'Alti Elfi', species: 'Elfo', fate: 1,
    skills: ['percezione', 'atletica', 'volonta', 'memoria'], chooseSkills: 0,
    lore: ['Regni degli Alti Elfi', 'Leggere e Scrivere', 'un Sapere Accademico a scelta'],
    talentRolls: 2,
    talentTable: ['Acrobatico', 'Poliedrico', 'Ranghi Serrati', 'Resistere e Tirare', 'Lignaggio Segreto', 'Tocco dei Venti', 'Udito Eccezionale', 'Ugola d’Oro', 'Valore delle Ere', 'Vista Acuta'],
    talentNote: 'Uno dei due talenti va sostituito con Riflessi Fulminei.',
    fixedTalents: ['Riflessi Fulminei'],
  },
  {
    id: 'bretonniano', name: 'Bretonniano', plural: 'Bretonniani', species: 'Umano', fate: 3,
    skills: ['mischia', 'lavoro'], chooseSkills: 2,
    lore: ['Regno di Bretonnia', 'Alta Società o Agricoltura'],
    talentRolls: 2,
    talentTable: ['Attacco Irruento', 'Avanguardia', 'Conducente Provetto', 'Fratelli d’Arme', 'Gagliardo', 'Lignaggio Segreto', 'Postura Difensiva', 'Resistente alla Corruzione', 'Stomaco di Ferro', 'Ugola d’Oro'],
    talentNote: 'Puoi scambiare uno dei talenti con Codice d’Onore.',
  },
  {
    id: 'elfo-silvano', name: 'Elfo Silvano', plural: 'Elfi Silvani', species: 'Elfo', fate: 1,
    skills: ['sopravvivenza', 'percezione', 'atletica', 'furtivita'], chooseSkills: 0,
    lore: ['Regni degli Elfi Silvani', 'Boschi', 'Regno di Bretonnia o Branchi Bercianti'],
    talentRolls: 2,
    talentTable: ['Acrobatico', 'Avanguardia', 'Fuga Simulata', 'Malevolista', 'Mira Accurata', 'Ranghi Serrati', 'Tocco dei Venti', 'Udito Eccezionale', 'Ugola d’Oro', 'Vista Acuta'],
    talentNote: 'Uno dei due talenti va sostituito con Riflessi Fulminei.',
    fixedTalents: ['Riflessi Fulminei'],
  },
  {
    id: 'halfling', name: 'Halfling', plural: 'Halfling', species: 'Halfling', fate: 3,
    skills: ['tiro', 'furtivita', 'destrezza', 'fascino'], chooseSkills: 0,
    lore: ['Provincia (Contrada)', 'Cucina'],
    talentRolls: 1,
    talentTable: ['Avanguardia', 'Fortunato', 'Fratelli d’Arme', 'Fuga Simulata', 'Mira Accurata', 'Postura Difensiva', 'Provocatore', 'Riflessi Fulminei', 'Stomaco di Ferro', 'Vista Acuta'],
    fixedTalents: ['Minuto', 'Resistente alla Corruzione'],
  },
  {
    id: 'imperiale', name: 'Imperiale (Umano)', plural: 'Imperiali (Umani)', species: 'Umano', fate: 3,
    skills: [], chooseSkills: 3,
    lore: ['Impero', 'una Città o una Provincia a scelta'],
    talentRolls: 2,
    talentTable: ['Codice d’Onore', 'Conducente Provetto', 'Fede', 'Gagliardo', 'Mantenere la Posizione!', 'Provocatore', 'Ricarica Rapida', 'Sete di Conoscenza', 'Tocco dei Venti', 'Udito Eccezionale'],
  },
  {
    id: 'nano', name: 'Nano', plural: 'Nani', species: 'Nano', fate: 2,
    skills: ['mischia', 'lavoro', 'tempra', 'volonta'], chooseSkills: 0,
    lore: ['Karak Naniche', 'Leggere e Scrivere', 'Impero o Sottosuolo'],
    talentRolls: 2,
    talentTable: ['Analisi Attenta', 'Barbalunga', 'Codice d’Onore', 'Determinato', 'Flagello delle Armature', 'Gagliardo', 'Odio', 'Ricarica Rapida', 'Stomaco di Ferro', 'Vista Notturna'],
    talentNote: 'Puoi scambiare uno dei talenti con Resistenza Magica.',
  },
];

/** d10 per la Stirpe casuale */
export const RANDOM_LINEAGE: [number, number, LineageId][] = [
  [1, 1, 'alto-elfo'], [2, 2, 'bretonniano'], [3, 3, 'elfo-silvano'], [4, 4, 'halfling'], [5, 8, 'imperiale'], [9, 10, 'nano'],
];

/** d10 per i modificatori di caratteristica: 9 = Fato, 10 = a scelta */
export const CHAR_MOD_TABLE: (CharId | 'fato' | 'scelta')[] = ['ac', 'ab', 'f', 'r', 'i', 'ag', 'ra', 'soc', 'fato', 'scelta'];

/* ----------------------------------------------------------------- Carriere */

export type CareerId = string;

export interface Career {
  id: CareerId;
  name: string;
  status: Status;
  /** null = tutte */
  lineages: LineageId[] | null;
  primary: CharId[];
  /** +1 a quattro di queste sei */
  skills: SkillId[];
  lore: string;
  gear: string;
  resources: string;
  contacts: string;
  talent: { name: string; text: string };
  /** d100 per Stirpe: [min, max] */
  random: Partial<Record<LineageId, [number, number]>>;
}

const ALL: LineageId[] | null = null;

export const CAREERS: Career[] = [
  {
    id: 'acchiappatopi', name: 'Acchiappatopi', status: 'bronzo', lineages: ['bretonniano', 'nano', 'halfling', 'imperiale'],
    primary: ['ac', 'i', 'ag'], skills: ['mischia', 'tiro', 'sopravvivenza', 'destrezza', 'furtivita', 'volonta'],
    lore: 'Città (a scelta), Sottosuolo',
    gear: 'Lancia da fante o frombola, pugnale, abiti da popolano, fonte di luce, set da caccia',
    resources: 'Cane piccolo ma feroce o bancarella al mercato o mappa del sottosuolo',
    contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Piazzare Trappole', text: 'Con una Notte di Riposo puoi fare una Prova di Destrezza e minare tante Zone quanti i successi: Pericolo (1) se letali, altrimenti Prono e Ostacolato. Chi è avvertito o supera Percezione le evita.' },
    random: { bretonniano: [1, 5], halfling: [1, 5], imperiale: [1, 5], nano: [1, 3] },
  },
  {
    id: 'apotecario', name: 'Apotecario', status: 'bronzo', lineages: ALL,
    primary: ['f', 'i', 'ra'], skills: ['difesa', 'sopravvivenza', 'percezione', 'destrezza', 'furtivita', 'memoria'],
    lore: 'Misture, più Anatomia o Zoologia o un Sapere Ambientale',
    gear: 'Frombola o arco corto, pugnale, abiti da viaggio, abiti da lavoro in cuoio, set per misture',
    resources: 'Laboratorio o birrificio o negozio', contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Ricetta Personale', text: 'Fuori dagli Intermezzi, con una Notte di Riposo puoi preparare una mistura come con l’Attività Creare Avere; scade prima del prossimo Intermezzo.' },
    random: { 'alto-elfo': [1, 5], bretonniano: [6, 10], 'elfo-silvano': [1, 8], halfling: [6, 15], imperiale: [6, 10], nano: [4, 8] },
  },
  {
    id: 'artigiano', name: 'Artigiano', status: 'argento', lineages: ALL,
    primary: ['f', 'r', 'i'], skills: ['mischia', 'muscoli', 'lavoro', 'tempra', 'percezione', 'destrezza'],
    lore: 'Forgiatura o Arte o Tessitura o un Sapere Professionale personalizzato',
    gear: 'Martello da guerra o spada, abbigliamento da cittadino, abiti da lavoro in cuoio, ferri del mestiere del proprio Sapere',
    resources: 'Bottega o armeria o negozio', contacts: 'Compagni d’Arme, il Popolino',
    talent: { name: 'Strumenti Fidati', text: 'Le Prove con averi fatti da te non hanno Complicazioni; con un’arma di tua fattura la prima Prova di Attacco di ogni scontro ha +1d.' },
    random: { 'alto-elfo': [6, 10], bretonniano: [11, 15], 'elfo-silvano': [9, 13], halfling: [16, 20], imperiale: [11, 18], nano: [9, 18] },
  },
  {
    id: 'barcaiolo', name: 'Barcaiolo', status: 'bronzo', lineages: ALL,
    primary: ['ab', 'f', 'r'], skills: ['tiro', 'lavoro', 'sopravvivenza', 'tempra', 'destrezza', 'atletica'],
    lore: 'Corsi d’Acqua o Mari, Musica o Armi da Fuoco',
    gear: 'Ascia o spada, arco da guerra o pistola, abiti da viaggio, armatura leggera o set da caccia o set per armi da fuoco',
    resources: 'Barca a remi o barcone fluviale o passaggio via nave', contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Piede Marino', text: 'Quando qualcosa ti farebbe cadere Prono puoi subire invece Ostacolato, che togli rinunciando al movimento gratuito (non se sei già Ostacolato).' },
    random: { 'alto-elfo': [11, 20], bretonniano: [16, 20], 'elfo-silvano': [14, 15], halfling: [21, 23], imperiale: [19, 23], nano: [19, 20] },
  },
  {
    id: 'brigante', name: 'Brigante', status: 'bronzo', lineages: ALL,
    primary: ['ab', 'f', 'ag'], skills: ['mischia', 'tiro', 'muscoli', 'percezione', 'furtivita', 'comando'],
    lore: 'Provincia (a scelta), Mondo Criminale o Armi da Fuoco',
    gear: 'Ascia o spada, ascia o scudo, balestra o pistola o trombone, armatura leggera, set da gioco d’azzardo, zaino da viaggiatore o set per armi da fuoco',
    resources: 'Nascondiglio segreto o cavallo e stalla o onorificenza', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Vessare i Deboli', text: 'Per intimidire con Comando puoi usare Forza al posto di Socialità (il bersaglio usa Resistenza invece di Ragione); in mischia o Muscoli contro chi è in inferiorità numerica ottieni +2d invece di +1d.' },
    random: { 'alto-elfo': [21, 22], bretonniano: [21, 23], 'elfo-silvano': [16, 23], halfling: [24, 28], imperiale: [24, 26], nano: [21, 22] },
  },
  {
    id: 'cacciatore-di-taglie', name: 'Cacciatore di Taglie', status: 'argento', lineages: ALL,
    primary: ['f', 'i', 'ag'], skills: ['mischia', 'tiro', 'lancio', 'percezione', 'atletica', 'comando'],
    lore: 'Provincia o Culto (a scelta), Mondo Criminale o Ammazzamostri (a scelta)',
    gear: 'Arco da guerra o balestra, ascia o spada, rete con pesi, armatura leggera, set da caccia o arsenale da ammazzamostri',
    resources: 'Cavallo e stalla o tempio o nascondiglio segreto', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Nel Mirino', text: 'Una volta per sessione indichi una preda: +1d per rintracciarla, inseguirla e attaccarla, ma sei Distratto (-1d) in tutto il resto.' },
    random: { 'alto-elfo': [23, 25], bretonniano: [24, 26], 'elfo-silvano': [24, 31], halfling: [29, 33], imperiale: [27, 29], nano: [23, 25] },
  },
  {
    id: 'cavaliere', name: 'Cavaliere', status: 'oro', lineages: ['bretonniano', 'alto-elfo', 'imperiale', 'elfo-silvano'],
    primary: ['ac', 'f', 'ag'], skills: ['mischia', 'difesa', 'muscoli', 'atletica', 'volonta', 'comando'],
    lore: 'Alta Società, Esercito, Leggere e Scrivere',
    gear: 'Lancia da cavaliere o martello a due mani o ascia a due mani o spadone, spada, scudo, armatura pesante',
    resources: 'Cavallo e stalla o casa capitolare o armatura di piastre completa', contacts: 'I Grandi e i Potenti, Compagni d’Arme',
    talent: { name: 'In Prima Linea', text: 'In ogni scontro la prima Prova di Attacco fatta caricando è Gloriosa.' },
    random: { 'alto-elfo': [26, 28], bretonniano: [27, 34], 'elfo-silvano': [32, 33], imperiale: [30, 31] },
  },
  {
    id: 'cavaliere-in-esilio', name: 'Cavaliere in Esilio', status: 'argento', lineages: ['bretonniano'],
    primary: ['ac', 'r', 'ag'], skills: ['mischia', 'difesa', 'tempra', 'atletica', 'volonta', 'comando'],
    lore: 'Leggere e Scrivere, Esercito o Mondo Criminale',
    gear: 'Lancia da cavaliere o martello a due mani o ascia a due mani o spadone, spada, scudo, armatura pesante',
    resources: 'Cavallo e stalla o passaggio via nave o onorificenza', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Voto dell’Esiliato', text: 'Quando sconfiggi un Campione o una Mostruosità in mischia, le tue Prove di Attacco sono Gloriose per il resto dello scontro.' },
    random: { bretonniano: [35, 39] },
  },
  {
    id: 'ciarlatano', name: 'Ciarlatano', status: 'bronzo', lineages: ALL,
    primary: ['r', 'i', 'soc'], skills: ['mischia', 'percezione', 'destrezza', 'memoria', 'comando', 'fascino'],
    lore: 'Mondo Criminale, Alta Società o Culto (a scelta)',
    gear: 'Pugnale, abiti da popolano, abbigliamento da cittadino, vesti signorili, abiti occultanti, set da gioco d’azzardo, set per la cura personale o strumenti da ladro',
    resources: 'Nascondiglio segreto o identità segreta o simbolo di autorità (falso)', contacts: 'I Grandi e i Potenti, Fannulloni e Vagabondi',
    talent: { name: 'Esperto Manipolatore', text: 'Raddoppi i dadi bonus quando ti conformi alle aspettative del tuo Status apparente; chi scopre il tuo tradimento diventa Distratto e Barcollante.' },
    random: { 'alto-elfo': [29, 30], bretonniano: [40, 41], 'elfo-silvano': [34, 35], halfling: [34, 38], imperiale: [32, 34], nano: [26, 27] },
  },
  {
    id: 'cortigiano', name: 'Cortigiano', status: 'oro', lineages: ALL,
    primary: ['ag', 'ra', 'soc'], skills: ['difesa', 'percezione', 'furtivita', 'memoria', 'comando', 'fascino'],
    lore: 'Alta Società, Leggere e Scrivere, un Sapere Accademico a scelta',
    gear: 'Spada o ascia, armatura leggera o vesti signorili, set per la cura personale, occorrente per scrivere',
    resources: 'Appartamento sfarzoso o simbolo di autorità o cavallo e stalla', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'Scheletri nell’Armadio', text: 'Dopo aver Analizzato con successo un PNG la prossima Prova tua o di un alleato contro di lui ha +1d; oppure chiedi cosa nasconde e il GM ti indica almeno un punto debole.' },
    random: { 'alto-elfo': [31, 35], bretonniano: [42, 46], 'elfo-silvano': [36, 38], halfling: [39, 41], imperiale: [35, 37], nano: [28, 30] },
  },
  {
    id: 'fattucchiere', name: 'Fattucchiere', status: 'bronzo', lineages: ['bretonniano', 'imperiale', 'elfo-silvano'],
    primary: ['r', 'i', 'ra'], skills: ['mischia', 'sopravvivenza', 'percezione', 'furtivita', 'volonta', 'memoria'],
    lore: 'Misture, un Sapere Magico a scelta',
    gear: 'Bastone, pugnale, abiti da popolano, abiti occultanti, strumenti arcani, set per misture',
    resources: 'Nascondiglio segreto o identità segreta o santuario religioso', contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Saggezza del Fattucchiere', text: 'Ottieni un grado del Talento Mago (Livello 1 se non lo avevi) e 3 incantesimi memorizzati del tuo Sapere Magico; niente grimorio, ma +1d a Memorizzare Incantesimo.' },
    random: { bretonniano: [47, 48], 'elfo-silvano': [39, 43], imperiale: [38, 40] },
  },
  {
    id: 'guardabirra', name: 'Guardabirra', status: 'argento', lineages: ['nano'],
    primary: ['f', 'ra', 'soc'], skills: ['mischia', 'muscoli', 'tempra', 'volonta', 'comando', 'fascino'],
    lore: 'Provincia (a scelta), Cucina o Contabilità',
    gear: 'Ascia o martello da guerra, balestra, armatura leggera, zaino da viaggiatore o set da cucina',
    resources: 'Taverna o birrificio o mappa del sottosuolo', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'I Piantagrane, Fuori!', text: 'Capisci chi regge l’alcol e chi sta per creare guai; quando costringi un nemico ad Arretrare, subito dopo cade Prono.' },
    random: { nano: [31, 35] },
  },
  {
    id: 'guardastrada', name: 'Guardastrada', status: 'argento', lineages: ALL,
    primary: ['ab', 'ag', 'soc'], skills: ['tiro', 'sopravvivenza', 'percezione', 'atletica', 'memoria', 'comando'],
    lore: 'Provincia (a scelta), Esercito o Armi da Fuoco o Boschi',
    gear: 'Arco lungo o balestra o due pistole, lancia da sella o armatura pesante, spada, abiti da viaggio, zaino da viaggiatore, set da caccia o set per armi da fuoco',
    resources: 'Cavallo e stalla o carrozza o simbolo di autorità', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Ultimo Avvertimento', text: 'Se in combattimento ordini con Comando di gettare le armi o andarsene, contro chi rifiuta hai +1d agli attacchi per il resto dello scontro.' },
    random: { 'alto-elfo': [36, 37], bretonniano: [49, 53], 'elfo-silvano': [44, 46], halfling: [42, 43], imperiale: [41, 43], nano: [36, 37] },
  },
  {
    id: 'guardavia', name: 'Guardavia', status: 'bronzo', lineages: ['elfo-silvano'],
    primary: ['ab', 'r', 'ag'], skills: ['tiro', 'sopravvivenza', 'percezione', 'atletica', 'furtivita', 'volonta'],
    lore: 'Esercito',
    gear: 'Arco lungo, spada, abiti da viaggio, zaino da viaggiatore, set da caccia',
    resources: 'Nascondiglio segreto o frecce incantate o mappa delle Radici del Mondo', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Colpire dal Nulla', text: 'Una volta per battaglia, un attacco di Tiro riuscito e non contrapposto rende il bersaglio Atterrito; se lo uccide, diventa Atterrito l’alleato più vicino che lo ha visto.' },
    random: { 'elfo-silvano': [47, 51] },
  },
  {
    id: 'guardia-cittadina', name: 'Guardia Cittadina', status: 'bronzo', lineages: ALL,
    primary: ['ac', 'i', 'soc'], skills: ['mischia', 'muscoli', 'tempra', 'percezione', 'atletica', 'comando'],
    lore: 'Città o Provincia (a scelta)',
    gear: 'Arma da mischia Bronzo o Argento, pugnale, armatura leggera, uniforme, fonte di luce',
    resources: 'Armeria o simbolo di autorità o onorificenza', contacts: 'Compagni d’Arme, il Popolino',
    talent: { name: 'Fare Luce', text: 'Vieni presto a sapere di omicidi, incendi e incidenti nella tua Città o Provincia e hai +1d per scoprire Indizi in merito.' },
    random: { 'alto-elfo': [38, 40], bretonniano: [54, 58], 'elfo-silvano': [52, 56], halfling: [44, 48], imperiale: [44, 51], nano: [38, 42] },
  },
  {
    id: 'guardia-del-mare', name: 'Guardia del Mare di Lothern', status: 'argento', lineages: ['alto-elfo'],
    primary: ['ac', 'ab', 'ra'], skills: ['mischia', 'difesa', 'tiro', 'atletica', 'volonta', 'comando'],
    lore: 'Esercito, Mari',
    gear: 'Lancia da fante, arco da guerra, scudo, armatura leggera, uniforme',
    resources: 'Passaggio via nave o armeria o onorificenza', contacts: 'Compagni d’Arme, il Popolino',
    talent: { name: 'Disciplina Navale', text: 'La Portata Ottimale del tuo arco da guerra è Corta–Lunga; +1d agli attacchi in mischia e a distanza contro bersagli entro Distanza Corta.' },
    random: { 'alto-elfo': [41, 45] },
  },
  {
    id: 'guerriero-ombra', name: 'Guerriero Ombra', status: 'bronzo', lineages: ['alto-elfo'],
    primary: ['ab', 'i', 'ag'], skills: ['tiro', 'sopravvivenza', 'percezione', 'atletica', 'furtivita', 'comando'],
    lore: 'Esercito, Storia',
    gear: 'Arco lungo, spada, uniforme, armatura leggera, zaino da viaggiatore',
    resources: 'Nascondiglio segreto o passaggio via nave o onorificenza', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Spietatezza', text: '+1 Danno con Tiro contro bersagli Barcollanti; quando ferisci con un attacco non contrapposto, il bersaglio tira +1d sulla tabella delle Ferite.' },
    random: { 'alto-elfo': [46, 50] },
  },
  {
    id: 'ingegnere', name: 'Ingegnere', status: 'argento', lineages: ['bretonniano', 'nano', 'halfling', 'imperiale'],
    primary: ['ab', 'i', 'ra'], skills: ['tiro', 'lancio', 'lavoro', 'destrezza', 'atletica', 'memoria'],
    lore: 'Ingegneria, Forgiatura, Armi da Fuoco, Leggere e Scrivere',
    gear: 'Spada o martello da guerra, pistola o archibugio, abbigliamento da cittadino, abiti da lavoro in cuoio, set da ingegneria, set per armi da fuoco, occorrente per scrivere',
    resources: 'Bottega o armeria o cavallo e stalla', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Modifiche Extra', text: 'Dopo una ricarica riuscita puoi modificare l’arma: il prossimo attacco ha +2d, ma la ricarica successiva è Tetra.' },
    random: { bretonniano: [59, 60], halfling: [49, 50], imperiale: [52, 53], nano: [43, 47] },
  },
  {
    id: 'intrattenitore', name: 'Intrattenitore', status: 'bronzo', lineages: ALL,
    primary: ['f', 'ag', 'soc'], skills: ['lancio', 'muscoli', 'percezione', 'destrezza', 'atletica', 'fascino'],
    lore: 'Città o Provincia (a scelta), Musica o Leggere e Scrivere',
    gear: 'Pugnale, coltelli da lancio, costume di scena, set per la cura personale, attrezzatura da musicista o occorrente per scrivere',
    resources: 'Teatro o palco itinerante o identità segreta', contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Conquistare il Pubblico', text: 'Distrarre non ha penalità per la folla; finché continui il diversivo tu e gli alleati avete +1d contro le creature Distratte.' },
    random: { 'alto-elfo': [51, 53], bretonniano: [61, 65], 'elfo-silvano': [57, 59], halfling: [51, 58], imperiale: [54, 56], nano: [48, 50] },
  },
  {
    id: 'ladro', name: 'Ladro', status: 'bronzo', lineages: ALL,
    primary: ['i', 'ag', 'ra'], skills: ['mischia', 'lancio', 'percezione', 'destrezza', 'atletica', 'furtivita'],
    lore: 'Mondo Criminale, Città (a scelta)',
    gear: 'Pugnale, coltelli da lancio, abiti da popolano, abiti occultanti, strumenti da ladro',
    resources: 'Nascondiglio segreto o identità segreta o mappa del sottosuolo', contacts: 'Il Popolino, Fannulloni e Vagabondi',
    talent: { name: 'Ombra nella Notte', text: 'Di notte o al riparo puoi opporti agli attacchi con Furtività; capisci a colpo d’occhio quali sono gli oggetti più preziosi nei dintorni.' },
    random: { 'alto-elfo': [54, 55], bretonniano: [66, 68], 'elfo-silvano': [60, 62], halfling: [59, 66], imperiale: [57, 61], nano: [51, 52] },
  },
  {
    id: 'mago-arcano', name: 'Mago Arcano', status: 'argento', lineages: ['bretonniano', 'alto-elfo', 'imperiale'],
    primary: ['i', 'ra', 'soc'], skills: ['difesa', 'percezione', 'volonta', 'memoria', 'comando', 'fascino'],
    lore: 'Un Sapere Magico a scelta, Leggere e Scrivere, Alta Società o Culto (a scelta)',
    gear: 'Bastone, pugnale, abbigliamento da cittadino, strumenti arcani, occorrente per scrivere',
    resources: 'Biblioteca o membro di società segreta o cimelio', contacts: 'I Grandi e i Potenti, Fannulloni e Vagabondi',
    talent: { name: 'Studio Arcano', text: 'Ottieni un grado del Talento Mago (Livello 1 se non lo avevi), un grimorio con 3 incantesimi del tuo Sapere Magico e +1d a Formalizzare Incantesimo.' },
    random: { 'alto-elfo': [56, 60], bretonniano: [69, 70], imperiale: [62, 62] },
  },
  {
    id: 'manovale', name: 'Manovale', status: 'bronzo', lineages: ALL,
    primary: ['f', 'r', 'ag'], skills: ['mischia', 'muscoli', 'lavoro', 'tempra', 'atletica', 'furtivita'],
    lore: 'Città o Provincia (a scelta), Agricoltura o Cucina o Corsi d’Acqua',
    gear: 'Ascia o pugnale, abiti da popolano, abiti da lavoro in cuoio o abiti da viaggio, set da caccia o ferri del mestiere',
    resources: 'Fattoria e animali o bancarella al mercato o carretto a mano', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'Io Faccio la Mia Parte', text: 'Quando Aiuti con successo l’alleato ha +1d in più; quando Recuperi da Barcollante o Prono puoi togliere le stesse Condizioni a un alleato a Distanza Ravvicinata.' },
    random: { 'alto-elfo': [61, 70], bretonniano: [71, 80], 'elfo-silvano': [63, 70], halfling: [67, 76], imperiale: [63, 72], nano: [53, 62] },
  },
  {
    id: 'mercante', name: 'Mercante', status: 'argento', lineages: ALL,
    primary: ['i', 'ag', 'soc'], skills: ['difesa', 'percezione', 'destrezza', 'atletica', 'memoria', 'fascino'],
    lore: 'Città o Provincia (a scelta), Leggere e Scrivere o Contabilità',
    gear: 'Pugnale, armatura leggera o abbigliamento da cittadino, occorrente per scrivere o set per la cura personale',
    resources: 'Negozio o banchiere fidato o carro da mercante', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'Negoziatore Tenace', text: 'In un centro di commercio, una volta per Intermezzo, una Prova di Fascino ti fa recuperare una Moneta per successo, fino a quante ne avevi a inizio avventura.' },
    random: { 'alto-elfo': [71, 80], bretonniano: [81, 85], 'elfo-silvano': [71, 75], halfling: [77, 84], imperiale: [73, 77], nano: [63, 72] },
  },
  {
    id: 'nobile', name: 'Nobile', status: 'oro', lineages: ALL,
    primary: ['ac', 'i', 'soc'], skills: ['difesa', 'tiro', 'volonta', 'memoria', 'comando', 'fascino'],
    lore: 'Alta Società, Leggere e Scrivere',
    gear: 'Spada o ascia, arco lungo o balestra, armatura leggera, vesti signorili, set per la cura personale',
    resources: 'Tenuta nobiliare o carrozza o cimelio', contacts: 'I Grandi e i Potenti, Compagni d’Arme',
    talent: { name: 'Presenza Autorevole', text: 'I PNG Bronzo e Argento si aspettano che tu comandi (+1d sociale se ti conformi); chi convinci con Comando resta Distratto per un po’.' },
    random: { 'alto-elfo': [81, 85], bretonniano: [86, 87], 'elfo-silvano': [76, 77], halfling: [85, 86], imperiale: [78, 79], nano: [73, 74] },
  },
  {
    id: 'prete', name: 'Prete', status: 'argento', lineages: ['imperiale'],
    primary: ['r', 'ra', 'soc'], skills: ['mischia', 'lavoro', 'tempra', 'volonta', 'comando', 'fascino'],
    lore: 'Culto (del tuo dio), Leggere e Scrivere, il Sapere Preferito del tuo dio',
    gear: 'Un’arma Argento a scelta, pugnale, abiti da viaggio o armatura leggera, zaino da viaggiatore o occorrente per scrivere',
    resources: 'Santuario religioso o tempio o simbolo di autorità', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'Vera Fede', text: 'Ottieni un grado del Talento Fede (il Favore del tuo dio, se non lo avevi) e riacquistarlo costa 1 PE in meno.' },
    random: { imperiale: [80, 84] },
  },
  {
    id: 'ranger', name: 'Ranger di Bosco Selvaggio', status: 'bronzo', lineages: ['elfo-silvano'],
    primary: ['ac', 'f', 'i'], skills: ['mischia', 'difesa', 'sopravvivenza', 'percezione', 'atletica', 'volonta'],
    lore: 'Esercito, Ammazzamostri (Ammazzamalevoli)',
    gear: 'Falcione da ranger, pugnale, armatura leggera, uniforme, set da caccia, scudo o arsenale da ammazzamostri',
    resources: 'Nascondiglio segreto o onorificenza o mappa delle Radici del Mondo', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Guardiano del Bosco Selvaggio', text: 'In ogni scontro la tua prima Prova per opporti a un attacco è Gloriosa; +1d in mischia contro creature Spaventose o Terrificanti.' },
    random: { 'elfo-silvano': [78, 82] },
  },
  {
    id: 'soldato', name: 'Soldato', status: 'argento', lineages: ALL,
    primary: ['ac', 'r', 'ra'], skills: ['mischia', 'difesa', 'tempra', 'atletica', 'volonta', 'comando'],
    lore: 'Esercito, Tessitura o Musica o Leggere e Scrivere o Armi da Fuoco',
    gear: 'Un’arma da mischia Argento, pugnale, scudo, armatura leggera, uniforme, set da cucito o attrezzatura da musicista o set da gioco d’azzardo o set per armi da fuoco',
    resources: 'Caserma o armeria o onorificenza', contacts: 'Compagni d’Arme, il Popolino',
    talent: { name: 'Spalla a Spalla', text: 'Quando sei a Distanza Ravvicinata da un alleato, entrambi avete +1d alle Prove di Difesa.' },
    random: { 'alto-elfo': [86, 90], bretonniano: [88, 92], 'elfo-silvano': [83, 87], halfling: [87, 89], imperiale: [85, 92], nano: [75, 84] },
  },
  {
    id: 'studioso', name: 'Studioso', status: 'argento', lineages: ALL,
    primary: ['i', 'ag', 'ra'], skills: ['mischia', 'sopravvivenza', 'percezione', 'atletica', 'volonta', 'memoria'],
    lore: 'Leggere e Scrivere, più Alta Società o un Sapere Accademico o un Sapere Nemico',
    gear: 'Pugnale, occorrente per scrivere, abbigliamento da cittadino, armatura leggera o set da cerusico',
    resources: 'Biblioteca o torchio tipografico o membro di società segreta', contacts: 'I Grandi e i Potenti, il Popolino',
    talent: { name: 'Cultura Generale', text: 'I Saperi Accademici ti danno un dado bonus in più; una volta per sessione usi un Sapere Accademico, Culturale o Nemico che non conosci come se lo avessi.' },
    random: { 'alto-elfo': [91, 95], bretonniano: [93, 95], 'elfo-silvano': [88, 90], halfling: [90, 92], imperiale: [93, 95], nano: [85, 87] },
  },
  {
    id: 'sventratore', name: 'Sventratore', status: 'bronzo', lineages: ['nano'],
    primary: ['ac', 'f', 'r'], skills: ['mischia', 'muscoli', 'sopravvivenza', 'tempra', 'atletica', 'volonta'],
    lore: 'Ammazzatroll o un altro Sapere Ammazzamostri, Montagne o un altro Sapere Ambientale',
    gear: 'Ascia, ascia a due mani o una seconda ascia',
    resources: 'Santuario religioso o mappa del sottosuolo o cimelio di guerra', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Morto che Cammina', text: 'Con 2+ successi in più del difensore infliggi sempre una Ferita; contro le Mostruosità in mischia una Ferita in più; se vieni ucciso fai un ultimo attacco Glorioso.' },
    random: { nano: [88, 92] },
  },
  {
    id: 'tiratore-scelto', name: 'Tiratore Scelto', status: 'bronzo', lineages: ALL,
    primary: ['ab', 'r', 'i'], skills: ['tiro', 'sopravvivenza', 'percezione', 'destrezza', 'atletica', 'furtivita'],
    lore: 'Esercito, Boschi o Armi da Fuoco o Musica',
    gear: 'Arco lungo o balestra o archibugio, pugnale, abiti da viaggio, zaino da viaggiatore, set da caccia o set per armi da fuoco',
    resources: 'Armeria o nascondiglio segreto o onorificenza', contacts: 'Compagni d’Arme, Fannulloni e Vagabondi',
    talent: { name: 'Tiro Annunciato', text: 'Quando tiri con i dadi bonus di Mirare ignori le penalità di difficoltà.' },
    random: { 'alto-elfo': [96, 100], bretonniano: [96, 100], 'elfo-silvano': [91, 100], halfling: [93, 100], imperiale: [96, 100], nano: [93, 100] },
  },
];

export const CONTACT_GROUPS = ['I Grandi e i Potenti', 'Compagni d’Arme', 'Il Popolino', 'Fannulloni e Vagabondi'];

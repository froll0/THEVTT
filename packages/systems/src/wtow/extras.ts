import type { SkillId, Status } from './data';

/**
 * Le regole e i contenuti oltre la creazione del personaggio: Risorse
 * casuali, Attività dell'Intermezzo, Pericoli, cavalcature e veicoli
 * (Guida del Giocatore); oggetti magici, Corruzione e Talagaad (Guida del
 * Gamemaster).
 */

/* --------------------------------------------------------- Risorse Casuali */

/** Tabella delle Risorse Casuali (Guida del Giocatore p.102), per Status. */
export const RANDOM_RESOURCES: { min: number; max: number; bronzo: string; argento: string; oro: string }[] = [
  { min: 1, max: 15, bronzo: 'Carretto a Mano', argento: 'Carro da Mercante', oro: 'Carrozza' },
  { min: 16, max: 25, bronzo: 'Carro da Mercante', argento: 'Barcone Fluviale', oro: 'Passaggio via Nave' },
  { min: 26, max: 35, bronzo: 'Barca a Remi', argento: 'Bancarella', oro: 'Casa Capitolare' },
  { min: 36, max: 45, bronzo: 'Passaggio via Nave', argento: 'Negozio', oro: 'Caserma' },
  { min: 46, max: 55, bronzo: 'Santuario', argento: 'Taverna', oro: 'Teatro' },
  { min: 56, max: 65, bronzo: 'Nascondiglio', argento: 'Laboratorio', oro: 'Biblioteca' },
  { min: 66, max: 75, bronzo: 'Bottega', argento: 'Birrificio', oro: 'Appartamento Sfarzoso' },
  { min: 76, max: 85, bronzo: 'Armeria', argento: 'Tempio', oro: 'Tenuta Nobiliare' },
  { min: 86, max: 95, bronzo: 'Onorificenza', argento: 'Torchio Tipografico', oro: 'Simbolo di Autorità' },
  { min: 96, max: 100, bronzo: 'Identità Segreta', argento: 'Membro di Società Segreta', oro: 'Cimelio' },
];

export function resourceFor(status: Status, d100: number): string {
  const row = RANDOM_RESOURCES.find((r) => d100 >= r.min && d100 <= r.max) ?? RANDOM_RESOURCES[0]!;
  return row[status];
}

/** Uno Status più in alto (spendendo 1 PE). */
export function statusAbove(status: Status): Status {
  return status === 'bronzo' ? 'argento' : 'oro';
}

/* ------------------------------------------------------------- Intermezzo */

export interface Activity {
  id: string;
  name: string;
  /** Abilità suggerite (vuoto: qualsiasi) */
  skills: SkillId[];
  text: string;
  /** Prova Prolungata: successi necessari */
  extended?: number;
  /** cosa fa la scheda quando riesce */
  effect?: 'train' | 'overtime' | 'bank' | 'heal' | 'fate' | 'lore' | 'invest';
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'allenare',
    name: 'Allenare Abilità',
    skills: [],
    effect: 'train',
    text: 'Una Prova dell’Abilità scelta: si segnano i fallimenti come al solito, più uno per aver compiuto questa Attività.',
  },
  {
    id: 'assistere-contatto',
    name: 'Assistere Contatto',
    skills: [],
    text: 'Una Prova dell’Abilità indicata dal GM (spesso quella primaria del Contatto): riuscendo, si guadagna un favore dal Contatto o se ne ripaga uno. Aggiungere un nuovo PNG ai Contatti è una Prova Prolungata da 4 successi.',
  },
  {
    id: 'cambiare-carriera',
    name: 'Cambiare Carriera',
    skills: [],
    text: 'Servono i Saperi e gli averi fondamentali della nuova Carriera e il consenso del GM. Superando la Prova (Abilità scelta dal GM) si spendono 3 PE: Caratteristiche Primarie, Talento e una Risorsa della nuova Carriera, Status nuovo; si tengono Talenti, Saperi, averi e Contatti.',
  },
  {
    id: 'creare-avere',
    name: 'Creare Avere',
    skills: ['destrezza', 'lavoro'],
    text: 'Serve il Sapere Professionale e i ferri del mestiere. Prova Prolungata: Bronzo 2 successi; Argento 4 successi e una spesa Bronzo a Prova; Oro 8 successi e una spesa Argento a Prova. Una bottega o un laboratorio dà +1d. Le pozioni magiche (Sapere Misture) chiedono 8 successi e una Moneta Oro di ingredienti a Prova.',
  },
  {
    id: 'prova-di-forza',
    name: 'Dare Prova di Forza',
    skills: ['mischia', 'muscoli', 'atletica', 'tiro', 'lancio'],
    text: 'Una gara contro l’avversario principale del GM (Prova Contrapposta). Vincendo, nella prossima avventura si può rendere Gloriosa una Prova di Socialità verso chi ha visto l’impresa.',
  },
  {
    id: 'esplorare',
    name: 'Esplorare le Terre Selvagge',
    skills: ['sopravvivenza'],
    text: 'Riuscendo si apprende, per la prossima avventura, il Sapere Ambientale o Provincia dell’area; chi lo ha già ottiene +1d alle Prove in cui lo usa.',
  },
  {
    id: 'straordinari',
    name: 'Fare gli Straordinari',
    skills: [],
    effect: 'overtime',
    text: 'Una Prova di un’Abilità del proprio mestiere: riuscendo si comincia la prossima avventura con +2 Monete del proprio Status, fallendo con +1.',
  },
  {
    id: 'formalizzare',
    name: 'Formalizzare Incantesimo',
    skills: ['memoria'],
    extended: 4,
    text: 'Serve il Talento Mago e il Sapere Leggere e Scrivere. Prova Prolungata da 4 successi: l’incantesimo finisce nel grimorio (un incantesimo improvvisato dimezza il suo Valore Magico).',
  },
  {
    id: 'investire',
    name: 'Investire Denaro',
    skills: ['destrezza', 'fascino'],
    effect: 'invest',
    text: 'Si puntano 3 Monete rimaste: riuscendo si ottiene un avere o un servizio di uno Status sopra la Moneta più bassa investita; fallendo il denaro è perso. Per una nuova Risorsa: Prova Prolungata, 3 Monete e un’Attività a Prova.',
  },
  {
    id: 'memorizzare',
    name: 'Memorizzare Incantesimo',
    skills: ['memoria'],
    extended: 8,
    text: 'Serve il Talento Mago. Prova Prolungata da 8 successi (4 se è già nel grimorio): l’incantesimo si lancia come formalizzato senza aprire il libro.',
  },
  {
    id: 'propiziare-fato',
    name: 'Propiziare il Fato',
    skills: [],
    extended: 4,
    effect: 'fate',
    text: 'Solo se il Fato è sotto il valore di partenza (e non a 0). Prova Prolungata da 4 successi, spendendo Fato a ogni Prova: riuscendo il Fato massimo torna su di 1.',
  },
  {
    id: 'raccogliere-informazioni',
    name: 'Raccogliere Informazioni',
    skills: ['memoria', 'percezione', 'comando'],
    text: 'Su una persona, una fazione, un luogo o un oggetto: riuscendo, il GM rivela qualcosa di utile e, se nella prossima avventura si trova una Traccia collegata, ne dà gli Indizi senza Prove.',
  },
  {
    id: 'riposare',
    name: 'Riposare e Rimettersi',
    skills: ['tempra'],
    effect: 'heal',
    text: 'Una Prova di Tempra: riuscendo guarisce una Ferita e tutte le Ferite Purulente. Molte Ferite vanno prima operate.',
  },
  {
    id: 'studiare',
    name: 'Studiare Sapere',
    skills: ['memoria'],
    extended: 4,
    effect: 'lore',
    text: 'Prova Prolungata da 4 successi (Memoria, o l’Abilità adatta) per imparare un Sapere; per un Sapere Magico servono 4 successi in più per ogni altro Sapere Magico conosciuto.',
  },
  {
    id: 'supportare',
    name: 'Supportare Alleato',
    skills: [],
    text: 'Ogni successo dà +1d alla Prova di Attività di un alleato (fino al solito massimo).',
  },
  {
    id: 'basso-profilo',
    name: 'Tenere un Basso Profilo',
    skills: ['percezione', 'furtivita'],
    text: 'Riuscendo si resta un passo avanti a creditori, guardie e altri nemici. Un nascondiglio segreto dà +1d.',
  },
  {
    id: 'banca',
    name: 'Visitare la Banca',
    skills: ['fascino'],
    effect: 'bank',
    text: 'Ogni successo deposita una Moneta del proprio Status (con 3 successi anche una di Status superiore); il resto se ne va in commissioni. Ritirare non richiede Prove.',
  },
];

/* ---------------------------------------------------------------- Pericoli */

export interface HazardExample {
  group: string;
  name: string;
  skill: 'Atletica' | 'Percezione' | 'Tempra' | 'Sopravvivenza' | 'Volontà';
  frequency: string;
  grade: number;
  /** la condizione del fallimento */
  condition?: string;
  /** il fallimento non dà Ferite */
  noWound?: boolean;
}

/** Esempi di Pericolo (Guida del Giocatore p.116). */
export const HAZARDS: HazardExample[] = [
  { group: 'Cadute', name: 'Salto da un veicolo in corsa', skill: 'Atletica', frequency: 'Singola', grade: 1, condition: 'Prono' },
  { group: 'Cadute', name: 'Caduta da una finestra al secondo piano', skill: 'Atletica', frequency: 'Singola', grade: 2, condition: 'Prono' },
  { group: 'Trappole', name: 'Tagliola', skill: 'Percezione', frequency: 'Singola', grade: 1, condition: 'Ostacolato' },
  { group: 'Trappole', name: 'Laccio', skill: 'Percezione', frequency: 'Singola', grade: 1, condition: 'Indifeso', noWound: true },
  { group: 'Pericoli Naturali', name: 'Edificio in Fiamme', skill: 'Tempra', frequency: 'Ogni turno', grade: 2, condition: 'In Fiamme' },
  { group: 'Pericoli Naturali', name: 'Annegamento', skill: 'Tempra', frequency: 'Ogni turno', grade: 2, condition: 'Esausto' },
  { group: 'Malattia e Tossine', name: 'Birra Forte', skill: 'Tempra', frequency: 'Ogni bevuta', grade: 2, condition: 'Ostacolato', noWound: true },
  { group: 'Malattia e Tossine', name: 'Vaiolo Palustre', skill: 'Tempra', frequency: 'Ogni esposizione', grade: 2, condition: 'Distratto', noWound: true },
  { group: 'Pericoli di Viaggio', name: 'Giornata di Marcia Estenuante', skill: 'Sopravvivenza', frequency: 'Ogni giorno', grade: 1, condition: 'Esausto', noWound: true },
  { group: 'Pericoli di Viaggio', name: 'Viaggio in Clima Estremo', skill: 'Sopravvivenza', frequency: 'Ogni giorno', grade: 2, condition: 'Esausto' },
];

/* ------------------------------------------------------ Cavalcature e veicoli */

export interface Mount {
  id: string;
  name: string;
  /** Resilienza in più per chi cavalca */
  resilience: number;
  speed: 'Normale' | 'Veloce';
  text: string;
}

/** Cavalcature (Guida del Giocatore p.124): cavallo e cavaliere sono una sola entità. */
export const MOUNTS: Mount[] = [
  {
    id: 'cavallo',
    name: 'Cavallo',
    resilience: 1,
    speed: 'Veloce',
    text: 'Nobile Destriero: +1 Resilienza, Velocità Veloce; una Carica riuscita contro chi non è una Mostruosità lo getta Prono prima che possa Arretrare.',
  },
  {
    id: 'cavallo-bretonniano',
    name: 'Cavallo da Guerra Bretonniano',
    resilience: 1,
    speed: 'Veloce',
    text: 'Come il Cavallo; nelle Prove per controllarlo e per Opporsi agli attacchi si ignorano le penalità all’Agilità di armatura pesante e bardatura.',
  },
  {
    id: 'destriero-elfico',
    name: 'Destriero Elfico',
    resilience: 1,
    speed: 'Veloce',
    text: 'Come il Cavallo; +1d ad Atletica per controllarlo e per Opporsi agli attacchi.',
  },
];

export interface Vehicle {
  id: string;
  name: string;
  kind: 'Carro' | 'Imbarcazione';
  speed: 'Lento' | 'Normale' | 'Veloce';
  /** testo della Velocità (remi, vele…) */
  speedText?: string;
  resilience: number;
  armoured?: boolean;
  /** Guasti prima di essere distrutto */
  breakdowns: number;
  /** Danno dello Speronamento (null: non sperona) */
  ram: number | null;
  crew: string;
  text: string;
}

/** Carri e imbarcazioni comuni (Guida del Giocatore p.126-127). */
export const VEHICLES: Vehicle[] = [
  { id: 'carro-mercante', name: 'Carro da Mercante', kind: 'Carro', speed: 'Normale', resilience: 5, breakdowns: 3, ram: 3, crew: '1 animale, 6 occupanti', text: 'Per il trasporto di cibo, birra, materiale minerario.' },
  { id: 'biga', name: 'Biga', kind: 'Carro', speed: 'Veloce', resilience: 6, armoured: true, breakdowns: 4, ram: 4, crew: '2 animali, 2 occupanti', text: 'Usata in guerra da Alti Elfi, Re dei Sepolcri e Goblin.' },
  { id: 'cocchio', name: 'Cocchio', kind: 'Carro', speed: 'Veloce', resilience: 7, armoured: true, breakdowns: 5, ram: 5, crew: '2+ animali, 3 occupanti', text: 'Usato in guerra da Alti Elfi, Uominibestia e Orchi.' },
  { id: 'carrozza', name: 'Carrozza Privata', kind: 'Carro', speed: 'Veloce', resilience: 5, breakdowns: 4, ram: 4, crew: '2 animali, 6 occupanti', text: 'Per il trasporto di nobili facoltosi in giro per la città. Chiusa: protegge i passeggeri dai tiri finché ha un Guasto da subire.' },
  { id: 'diligenza', name: 'Diligenza', kind: 'Carro', speed: 'Veloce', resilience: 6, breakdowns: 4, ram: 5, crew: '2+ animali, 8 occupanti', text: 'Per il trasporto di clienti da una città all’altra.' },
  { id: 'palco', name: 'Palco Itinerante', kind: 'Carro', speed: 'Normale', resilience: 5, breakdowns: 5, ram: 3, crew: '2 animali, 6 occupanti', text: 'Per il trasporto di troupe di intrattenitori.' },
  { id: 'vettovaglie', name: 'Carro di Vettovaglie', kind: 'Carro', speed: 'Normale', resilience: 5, breakdowns: 6, ram: 3, crew: '2+ animali, 8 occupanti', text: 'Rifornisce eserciti e carovane commerciali.' },
  { id: 'barca-remi', name: 'Barca a Remi', kind: 'Imbarcazione', speed: 'Lento', speedText: 'Lenta (remi)', resilience: 6, breakdowns: 2, ram: null, crew: '3 occupanti, 1 rematore', text: 'Barca da pesca o scialuppa di salvataggio.' },
  { id: 'traghetto', name: 'Traghetto Fluviale', kind: 'Imbarcazione', speed: 'Lento', speedText: 'Lenta (remi)', resilience: 6, breakdowns: 3, ram: 3, crew: '12 occupanti, 2 rematori', text: 'Per attraversare i fiumi o come mercato galleggiante.' },
  { id: 'barcone', name: 'Barcone Fluviale', kind: 'Imbarcazione', speed: 'Lento', speedText: 'Lenta (remi o vele)', resilience: 6, breakdowns: 4, ram: 4, crew: '8 occupanti, 4 rematori, 3 marinai', text: 'Per il trasporto di carichi via fiume.' },
  { id: 'vedetta', name: 'Nave Vedetta', kind: 'Imbarcazione', speed: 'Normale', speedText: 'Normale (remi o vele)', resilience: 9, armoured: true, breakdowns: 5, ram: 5, crew: '15 occupanti, 12 rematori, 4 marinai', text: 'Nave da guerra pirata o della guardia fluviale.' },
  { id: 'nave-lunga', name: 'Nave Lunga', kind: 'Imbarcazione', speed: 'Veloce', speedText: 'Veloce (remi), Normale (vele)', resilience: 7, armoured: true, breakdowns: 5, ram: 6, crew: '32 occupanti, 30 rematori, 4 marinai', text: 'Per fulminee razzie marittime.' },
  { id: 'cocca', name: 'Cocca Mercantile', kind: 'Imbarcazione', speed: 'Veloce', speedText: 'Veloce (vele)', resilience: 8, breakdowns: 6, ram: 5, crew: '15 occupanti, 8 marinai', text: 'Mercantile d’altura.' },
];

/** Conduzione dei Veicoli: l'Abilità più adatta. */
export const VEHICLE_HANDLING: { vehicle: string; situation: string; skill: string }[] = [
  { vehicle: 'Carro', situation: 'Tirare le redini per evitare ostacoli', skill: 'Destrezza' },
  { vehicle: 'Carro', situation: 'Calmare animali imbizzarriti', skill: 'Comando' },
  { vehicle: 'Barca a Remi', situation: 'Remare', skill: 'Lavoro (o Sapere Corsi d’Acqua/Mari)' },
  { vehicle: 'Barca a Remi', situation: 'Dare il tempo ai rematori', skill: 'Comando (o Sapere Corsi d’Acqua/Mari)' },
  { vehicle: 'Barca a Vela', situation: 'Tracciare una rotta', skill: 'Memoria (o Sapere Corsi d’Acqua/Mari)' },
  { vehicle: 'Barca a Vela', situation: 'Adattarsi alle condizioni atmosferiche', skill: 'Percezione (o Sapere Corsi d’Acqua/Mari)' },
];

/* ---------------------------------------------------------- Oggetti magici */

export type MagicItemKind = 'Arma' | 'Armatura' | 'Talismano' | 'Oggetto Arcano' | 'Oggetto Incantato';

export interface MagicItem {
  id: string;
  name: string;
  kind: MagicItemKind;
  /** armi: portata, Danno, mani */
  weapon?: { range: string; damage: string; hands: 1 | 2; ranged?: boolean };
  /** armature: Resilienza ("R+2", "+1") */
  resilience?: string;
  /** Resilienza in più rispetto alla Resistenza (armature) */
  bonus?: number;
  /** cariche o usi (Coltello Scarabeo, Pietra della Fortuna…) */
  charges?: number;
  /** si consuma all'uso */
  consumable?: boolean;
  traits: string;
  text: string;
}

/** Oggetti magici (Guida del Gamemaster p.81-90). */
export const MAGIC_ITEMS: MagicItem[] = [
  {
    id: 'arco-del-drago', name: 'Arco del Drago', kind: 'Arma', weapon: { range: 'Media – Estrema', damage: '6', hands: 2, ranged: true },
    traits: 'Non subisce mai penalità agli attacchi. Una volta per battaglia, un attacco riuscito infligge In Fiamme.',
    text: 'Gli attacchi non subiscono mai penalità ai dadi né diventano Tetri (ma non si tira a chi non è in vista). Una volta per battaglia si incocca una freccia di luce stellare che incendia il bersaglio colpito.',
  },
  {
    id: 'ascia-del-boia', name: 'Ascia del Boia', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+3', hands: 2 },
    traits: 'Contro nemici Proni, Prova Tetra per decapitarli con un attacco riuscito.',
    text: 'Contro un nemico Prono si può rendere Tetra la Prova: se l’attacco infligge una Ferita, è automaticamente Decapitazione.',
  },
  {
    id: 'coltello-scarabeo', name: 'Coltello Scarabeo', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+1', hands: 2 }, charges: 0,
    traits: 'Gli attacchi riusciti infliggono Esausto, le Ferite caricano il coltello, tre cariche guariscono una Ferita.',
    text: 'Ogni Ferita inflitta dà una carica di energia necromantica; spendendone tre si guarisce una Ferita (la carne ricresce insensibile).',
  },
  {
    id: 'lama-ingannatrice', name: 'Lama Ingannatrice', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+1', hands: 1 },
    traits: '+1d a Difesa quando non Barcollante.',
    text: 'Su un sussurro assume l’aspetto di un avere comune di forma simile a una spada: una stampella, un bastone, il manico di un remo.',
  },
  {
    id: 'lame-del-duellante', name: 'Lame del Duellante', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+2', hands: 2 },
    traits: '+2d a Difesa quando non Barcollante, attacca due volte in un turno, può rendere un attacco Tetro e l’altro Glorioso.',
    text: 'Dopo un’Azione di Attacco si può Attaccare di nuovo come seconda Azione; attaccando due volte, uno dei due attacchi può essere Tetro e l’altro Glorioso.',
  },
  {
    id: 'lancia-irremovibile', name: 'Lancia Irremovibile', kind: 'Arma', weapon: { range: 'Corta', damage: 'F+1', hands: 2 },
    traits: 'I bersagli non possono Arretrare; attacchi Gloriosi se il bersaglio è Arretrato questo round.',
    text: 'Chi viene colpito non può Arretrare: subisce una Ferita o cade Prono. Spezzata, ricresce durante l’Intermezzo (bruciata, è distrutta).',
  },
  {
    id: 'martello-di-grotargg', name: 'Martello di Grotargg', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+3', hands: 2 },
    traits: 'Glorioso quando attacca da posizione sopraelevata; se manca rimane bloccato.',
    text: 'Gli attacchi da posizione sopraelevata sono Gloriosi, ma se mancano il martello si pianta a terra: serve una Prova Ardua (-2d) di Muscoli per estrarlo.',
  },
  {
    id: 'mazzafrusto-di-fracasse', name: 'Mazzafrusto di Fracasse', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+3', hands: 1 },
    traits: '-1d a Mischia se Barcollante; gli attacchi riusciti disarmano gli avversari con armi magiche.',
    text: 'Colpendo chi impugna un’arma magica, la catena gliela strappa di mano finché non la raccoglie con l’Azione Recuperare.',
  },
  {
    id: 'spada-della-giustizia', name: 'Spada della Giustizia', kind: 'Arma', weapon: { range: 'Ravvicinata', damage: 'F+1', hands: 1 },
    traits: '+1d sulla tabella delle Ferite; i duelli contro i Campioni sono Gloriosi.',
    text: 'L’arma del campione dell’Imperatore: le Ferite inflitte tirano +1d sulla tabella; gli attacchi in duello contro un Campione nemico o un PG sono Gloriosi.',
  },
  {
    id: 'armatura-di-agilulf', name: 'Armatura di Agilulf', kind: 'Armatura', resilience: 'R+2', bonus: 2,
    traits: 'Abilità di Combattimento, Mischia e Difesa del portatore diventano fisse a 5.',
    text: 'Si parla e si capisce il Bretonniano. Non si può violare il Codice Cavalleresco: l’armatura blocca il corpo e, se si insiste, se ne va da sola.',
  },
  {
    id: 'armatura-ferro-meteoritico', name: 'Armatura di Ferro Meteoritico', kind: 'Armatura', resilience: 'R+3', bonus: 3,
    traits: 'Annulla i normali effetti che ignorano l’armatura o infliggono danni bonus contro bersagli corazzati.',
    text: 'Le armi non magiche che ignorano l’armatura o fanno danni bonus ai corazzati perdono quell’effetto contro chi la indossa.',
  },
  {
    id: 'elmo-della-caccia', name: 'Elmo della Caccia', kind: 'Armatura', resilience: '+1', bonus: 1,
    traits: 'Gli attacchi in Carica e le prove per inseguire sono Gloriosi, ma non si può bruciare Fato per un Colpo di Striscio.',
    text: 'Si indossa sopra un normale abito (+1 Resilienza). Le Prove per seguire le tracce o inseguire un nemico sono Gloriose.',
  },
  {
    id: 'mantello-di-ithilmar', name: 'Mantello di Ithilmar', kind: 'Armatura', resilience: 'R+3', bonus: 3,
    traits: '+1d alle Prove per evitare Pericoli ambientali e Condizioni; si possono lanciare incantesimi in armatura.',
    text: 'Maglia d’argento stellare di Ulthuan, quasi senza peso. Chi la possiede senza esserne degno può aspettarsi i Guerrieri Ombra.',
  },
  {
    id: 'scudo-di-rovi', name: 'Scudo di Rovi', kind: 'Armatura', resilience: '+1', bonus: 1,
    traits: 'Portato, non indossato; usa Difesa contro i Tiri; superando una Prova di Difesa contro la Mischia l’attaccante è Ostacolato e non può allontanarsi con la sua arma.',
    text: 'Finché la Condizione resta o il portatore non si sposta, l’attaccante non può andare oltre Distanza Ravvicinata (né Arretrare) senza lasciare l’arma.',
  },
  {
    id: 'calamita-di-ossidiana', name: 'Calamita di Ossidiana', kind: 'Talismano',
    traits: 'La Potenza degli incantesimi che influenzano il portatore cala di 1.',
    text: 'Se la Potenza scende a 0, l’incantesimo non ha effetto. Un solo Talismano alla volta.',
  },
  {
    id: 'passe-partout-runico', name: 'Passe-partout Runico', kind: 'Talismano',
    traits: 'Nessuna penalità dal Terreno Difficile; le Prove di Muscoli contro ostacoli inanimati sono Gloriose.',
    text: 'Runa del Passaggio dei Ranger Nanici: un non Nano trovato con questo oggetto rischia un interrogatorio, o un’ascia.',
  },
  {
    id: 'pietra-della-fortuna', name: 'Pietra della Fortuna', kind: 'Talismano', charges: 3,
    traits: 'Tre dadi fortunati al giorno da aggiungere alle Prove; se uno fa 10, tutti gli altri dadi falliscono.',
    text: 'A ogni alba tornano tre dadi da aggiungere prima o dopo il tiro, quanti se ne vuole, finché il GM non ha descritto l’esito.',
  },
  {
    id: 'talismano-di-protezione', name: 'Talismano di Protezione', kind: 'Talismano',
    traits: 'Quando si subisce una Ferita, con 1 su un d10 la si evita.',
    text: 'Glifi, ossa di campioni o pietre intagliate: protegge da una Ferita di qualsiasi fonte con un 1 sul d10.',
  },
  {
    id: 'tessimalie', name: 'Tessimalie', kind: 'Talismano',
    traits: 'Chi attacca il portatore diventa Accecato (poi è immune fino all’alba); le Prove di Furtività del portatore sono Tetre.',
    text: 'Fermaglio degli Elfi Silvani dai motivi ipnotici, doloroso da guardare ma impossibile da ignorare.',
  },
  {
    id: 'bastone-del-potere', name: 'Bastone del Potere', kind: 'Oggetto Arcano',
    traits: 'Gli incantesimi lanciati impugnandolo hanno +1 Potenza.',
    text: 'Solo per chi ha Livelli da Mago. Si usa anche come un normale bastone.',
  },
  {
    id: 'libro-di-ashur', name: 'Libro di Ashur', kind: 'Oggetto Arcano',
    traits: 'Si improvvisa come se l’incantesimo fosse nel grimorio (VM dimezzato), ma anche i 10 aggiungono dadi Incidente.',
    text: 'Novecentonovantanove pagine di annotazioni, spesso tradotte male: tutti i 10 della Prova di Magia vanno nella Riserva degli Incidenti Magici come i 9.',
  },
  {
    id: 'malapietra', name: 'Malapietra', kind: 'Oggetto Arcano', consumable: true,
    traits: 'Consumata in una Prova di Magia: 2 successi gratuiti e altrettanti dadi alla Riserva degli Incidenti Magici. Usarla espone alla corruzione.',
    text: 'Minerale nero e verde dal potere instabile: dà dipendenza, mutazioni e follia. Pezzi più grossi danno più dadi o servono per più Prove.',
  },
  {
    id: 'pergamena-di-dispersione', name: 'Pergamena di Dispersione', kind: 'Oggetto Arcano', consumable: true,
    traits: 'Un uso del Talento Controincantesimo (Glorioso per chi lo ha già, senza ritirare i 9). Si distrugge.',
    text: 'Contromaledizioni e sigilli di scioglimento: recitarli disintegra la pergamena.',
  },
  {
    id: 'sfera-di-cristallo', name: 'Sfera di Cristallo', kind: 'Oggetto Arcano',
    traits: 'Percezione come Azione: riuscendo, un attacco nemico contro di sé o un alleato entro Distanza Media prima del prossimo turno diventa Tetro.',
    text: 'I Venti della Magia intrappolati nella sfera rivelano segreti e futuri imminenti.',
  },
  {
    id: 'anello-di-taal', name: 'Anello di Taal', kind: 'Oggetto Incantato',
    traits: 'Lancia Scudo di Quercia come memorizzato (Livello da Mago 2, Ragione 4, Volontà 4); gli Incidenti colpiscono il portatore.',
    text: 'Chi viola un precetto di Taal non può usarlo finché non fa ammenda.',
  },
  {
    id: 'boccale-del-clan', name: 'Boccale del Clan', kind: 'Oggetto Incantato',
    traits: 'Ogni liquido potabile versato dentro diventa birra.',
    text: 'Birra mediocre per un Nano, più che sufficiente per Umani e Halfling. Versata altrove torna com’era.',
  },
  {
    id: 'corno-d-argento', name: 'Corno d’Argento', kind: 'Oggetto Incantato',
    traits: 'Come Azione, con il Sapere Musica: Prova di Comando; ogni successo toglie Atterrito o fa muovere di una Zona verso il nemico un alleato che lo sente.',
    text: 'Concesso dal Culto di Taal a chi è impegnato in una degna caccia.',
  },
  {
    id: 'freccia-salva-fatale', name: 'Freccia della Salva Fatale', kind: 'Oggetto Incantato', consumable: true,
    traits: 'Da un arco da guerra o lungo: se colpisce infligge 6 Danni a ogni creatura nella Zona bersaglio; non ci si può Opporre.',
    text: 'Le spine della freccia si separano in un diluvio di punte.',
  },
  {
    id: 'guanto-del-duello', name: 'Guanto del Duello', kind: 'Oggetto Incantato',
    traits: 'Sfida un Campione a Distanza Ravvicinata: attacchi reciproci Gloriosi, nessuno dei due può allontanarsi; chi interferisce ha Prove Tetre.',
    text: 'Il duello dura finché uno dei due non è sconfitto. Il guanto si raccoglie con l’Azione Recuperare.',
  },
  {
    id: 'piatto-della-pace', name: 'Piatto della Pace', kind: 'Oggetto Incantato',
    traits: 'Finché c’è cibo sul piatto nessuno può fare violenza a chi divide la tavola.',
    text: 'Gli attacchi falliscono, non si lanciano magie ostili, nessuno ferisce un commensale nemmeno per sbaglio.',
  },
  {
    id: 'pozione-di-guarigione', name: 'Pozione di Guarigione', kind: 'Oggetto Incantato', consumable: true,
    traits: 'Con l’Azione Recuperare guarisce subito una Ferita e i suoi effetti; si beve anche da Indifesi.',
    text: 'Da Indifesi la si può bere, ma in quel turno non si fa altro. Si prepara con Creare Avere (Sapere Misture, 8 successi, una Moneta Oro a Prova).',
  },
  {
    id: 'pozione-incantatrice', name: 'Pozione Incantatrice', kind: 'Oggetto Incantato', consumable: true,
    traits: 'Con l’Azione Recuperare: +1 a una Caratteristica fino al tramonto.',
    text: 'Ogni Caratteristica ha il suo colore: rosse di Forza, ambrate di Resistenza…',
  },
  {
    id: 'sussurro-dell-annegato', name: 'Sussurro dell’Annegato', kind: 'Oggetto Incantato', consumable: true,
    traits: 'Non si respira finché non si esala (per esempio per parlare); intanto si è Esausti.',
    text: 'L’ultimo respiro rubato a un marinaio annegato.',
  },
  {
    id: 'tappeto-volante', name: 'Tappeto Volante', kind: 'Oggetto Incantato',
    traits: 'Si diventa Veloci e si vola attraverso Zone verticali; non si decolla se a inizio movimento un nemico a terra è a Distanza Ravvicinata.',
    text: 'Porta un passeggero; fuori dal combattimento può sorvolare il Granducato in un giorno.',
  },
];

export const MAGIC_ITEM_KINDS: MagicItemKind[] = ['Arma', 'Armatura', 'Talismano', 'Oggetto Arcano', 'Oggetto Incantato'];

export const magicItem = (id: string | undefined) => MAGIC_ITEMS.find((i) => i.id === id);

/* --------------------------------------------------------------- Corruzione */

export type CorruptionStage = 'puro' | 'vulnerabile' | 'offuscato' | 'macchiato' | 'dannato';

export const CORRUPTION_STAGES: { id: CorruptionStage; name: string; text: string }[] = [
  { id: 'puro', name: 'Integro', text: 'Nessuna traccia di corruzione.' },
  {
    id: 'vulnerabile',
    name: 'Vulnerabile',
    text: 'Toccato dalla corruzione ma non l’ha abbracciata. Il GM lo tenta una sola volta con un piccolo dono: accettando diventa Offuscato, rifiutando non è più Vulnerabile (fino alla prossima Prova fallita).',
  },
  {
    id: 'offuscato',
    name: 'Offuscato',
    text: 'Ha goduto di un dono minore. Ogni due o tre sessioni il GM gli offre un dono permanente in cambio di un sacrificio: accettando diventa Macchiato. Una Prova di Percezione Ardua (-2d) può far capire agli altri che c’è qualcosa che non va.',
  },
  {
    id: 'macchiato',
    name: 'Macchiato',
    text: 'Marchiato per sempre: vigore, acume o letalità innaturali, con svantaggi subdoli. Chi percepisce i Venti della Magia lo scopre con una normale Prova di Percezione.',
  },
  {
    id: 'dannato',
    name: 'Dannato',
    text: 'Ha sacrificato tutto. Si gioca per un’ultima sessione, poi diventa un PNG del GM. Basta guardarlo negli occhi per capire cosa è diventato.',
  },
];

export interface CorruptionPath {
  id: string;
  name: string;
  /** vittime favorite */
  victims: string;
  vulnerabile: string;
  offuscato: string;
  /** doni tra cui scegliere */
  gifts: { name: string; text: string }[];
  macchiato: string;
  dannato: string;
}

/** Sentieri verso la Corruzione (Guida del Gamemaster p.74-80). */
export const CORRUPTION_PATHS: CorruptionPath[] = [
  {
    id: 'figlio-della-foresta',
    name: 'Figlio della Foresta',
    victims: 'Umani, cacciatori, ranger, domatori di animali',
    vulnerabile: 'Liberando la bestia interiore mentre caccia, insegue o uccide, ottiene un successo sanguinario qualunque sia il tiro. Diventa Offuscato.',
    offuscato: 'Se lascia che la natura consumi una Risorsa, trascura un dovere o volta le spalle alla civiltà, ottiene una mutazione occultabile e diventa Macchiato.',
    gifts: [
      { name: 'Artigli Retrattili', text: 'Gli attacchi disarmati infliggono F+2 Danni invece di Barcollante.' },
      { name: 'Pelle Corazzata', text: '+1 Resilienza, che si somma all’armatura.' },
      { name: 'Sguardo Bestiale', text: 'Vede al buio come se fosse giorno.' },
    ],
    macchiato: 'Mutazioni sempre più difficili da nascondere, bestie corrotte che lo seguono, sacrifici di sangue per dormire; può dimenticare Leggere e Scrivere. Un atto indicibile lo rende Dannato.',
    dannato: 'Per l’ultima sessione: le Capacità di un Uomobestia a scelta e +2 a Forza, Resistenza e Resilienza; un ultimo atto contro la civiltà, poi si ritira nelle foreste.',
  },
  {
    id: 'il-sangue-deve-scorrere',
    name: 'Il Sangue deve Scorrere',
    victims: 'Guerrieri, aguzzini, vendicatori',
    vulnerabile: 'Un attacco bonus di Mischia gratuito, brutalmente efficace qualunque sia il tiro, che chiude lo scontro. Diventa Offuscato.',
    offuscato: 'Il prezzo è il teschio di un degno avversario; in cambio un dono permanente, e diventa Macchiato.',
    gifts: [
      { name: 'Alacrità Innaturale', text: 'Ogni turno un attacco di Mischia in più come seconda Azione.' },
      { name: 'Colpi Crudeli', text: '+1d sulla tabella delle Ferite per le Ferite inflitte in Mischia.' },
      { name: 'Muscoli Possenti', text: '+2 Forza.' },
    ],
    macchiato: 'Sempre più attacchi di Mischia Gloriosi e Prove non di battaglia Tetre; per rinfoderare l’arma serve una Prova Tetra di Volontà. Prima o poi uccide qualcuno che amava: diventa Dannato.',
    dannato: 'Per un’ultima sessione ogni colpo fa Danno doppio contro un avversario meritevole.',
  },
  {
    id: 'segreti-della-stregoneria',
    name: 'I Segreti della Stregoneria',
    victims: 'Umani, Elfi, Maghi, studiosi',
    vulnerabile: 'Lancia un incantesimo qualsiasi a Potenza 9, ma scatena subito un Incidente Magico da 3d su un altro personaggio vicino. Diventa Offuscato.',
    offuscato: 'In cambio di un attacco contro chi perseguita la magia, un Livello da Mago in più o nuovi incantesimi; diventa Macchiato.',
    gifts: [
      { name: 'Livello da Mago', text: 'Un Livello da Mago in più.' },
      { name: 'Grimorio Proibito', text: 'Nuovi incantesimi da un grimorio apparso in casa.' },
    ],
    macchiato: 'Distratto se non lancia incantesimi per un po’; tutte le Prove di Magia sono Gloriose, ma ogni 9 dà due dadi Incidente. Un corvo dai nove occhi gli offre gli ultimi segreti: accettando diventa Dannato; al nono rifiuto le sue Prove di Magia restano Tetre per sempre.',
    dannato: 'Un ultimo rituale di ascensione arcana capace di qualunque cosa, poi corpo e anima scompaiono nei Reami del Caos.',
  },
  {
    id: 'sopportare-l-insopportabile',
    name: 'Sopportare l’Insopportabile',
    victims: 'I malati e gli oppressi, infermieri, dottori',
    vulnerabile: 'Accettando che la sofferenza è inevitabile, ignora una singola Ferita grave, la malattia o la fame. Diventa Offuscato.',
    offuscato: '-1d a molte Prove di Fascino; nell’Intermezzo ogni Ferita guarisce con una Notte di Riposo ma lascia cicatrici. Trasmessa la sua filosofia a un ex amico, diventa Macchiato.',
    gifts: [
      { name: 'Pelle Intorpidita', text: '+1 Resilienza (se era ferito).' },
      { name: 'Immune al Morbo', text: 'Nessuna malattia lo colpisce (se era malato).' },
    ],
    macchiato: 'Le Ferite minori non hanno effetto; Esausto, Accecato e Assordato non lo toccano più. Muore solo fatto a pezzi o bruciato. Contamina chi gli sta vicino.',
    dannato: 'Quasi immortale per un ultimo atto di eroismo; il suo fetore espone alla corruzione e infetta chi non lo brucia entro la giornata.',
  },
  {
    id: 'oscura-ossessione',
    name: 'Oscura Ossessione',
    victims: 'Elfi, artisti, duellanti, nobili',
    vulnerabile: 'Un Successo Assoluto, una Risorsa temporanea o il rispetto dei superiori in cambio di un momento di esaltazione. Diventa Offuscato.',
    offuscato: 'Almeno una volta a sessione è Distratto. Uno straniero dagli occhi scuri offre ciò che desidera (Prove Gloriose in un’Abilità, uno Status più alto, una Risorsa) in cambio di un atto crudele: diventa Macchiato.',
    gifts: [
      { name: 'Eccellenza', text: 'Ogni Prova di un’Abilità è Gloriosa.' },
      { name: 'Ascesa', text: 'Lo Status sale.' },
      { name: 'Ricchezza', text: 'Qualunque Risorsa possa nominare.' },
    ],
    macchiato: 'A ogni Intermezzo un’Abilità estranea all’ossessione cala di 1 (minimo 1). Per ogni parte di sé che abbandona: +2 a un’Abilità, fascino innaturale (Distratto a chi vuole), una Risorsa Oro, una persona ossessionata da lui o un Talento a scelta.',
    dannato: 'Un palcoscenico per il suo capolavoro: ogni Prova è un Successo Assoluto. Poi viene trascinato nei Reami del Caos.',
  },
];

export const EXPOSURES: { name: string; penalty: string; examples: string }[] = [
  { name: 'Lieve', penalty: '—', examples: 'Toccare brevemente della malapietra raffinata, combattere Uominibestia o mutanti, ascoltare i vaneggiamenti di un veneratore del Caos.' },
  { name: 'Profana', penalty: '-1d', examples: 'Fallire un incantesimo, maneggiare malapietra grezza, assistere a un rituale del Caos o vedere un demone minore, apprendere la vera natura del Caos.' },
  { name: 'Perniciosa', penalty: '-2d', examples: 'Lanciare un incantesimo profano, leggere un passaggio del Liber Chaotica, combattere un demone.' },
  { name: 'Strazia Anima', penalty: 'Fallimento automatico', examples: 'Camminare nel Reame del Caos, essere posseduti da un demone, offrire sinceramente l’anima ai poteri del Caos.' },
];

/* ------------------------------------------------------------- Ambientazione */

export const SETTING: { name: string; group: string; text: string }[] = [
  {
    group: 'Talagaad',
    name: 'Il porto di Talagaad',
    text: 'Un agglomerato fatiscente di templi pericolanti, magazzini, negozi e catapecchie sul fiume Talabec, chiuso da un cupo muro fortificato. L’unica opera degna di nota è il Viadotto del Mago, un antico ponte di fattura Nanica che unisce le due metà del porto. È l’unico accesso fluviale di Talabheim: povertà e crimine dilagano, ma chi è audace e spietato può arricchirsi.',
  },
  {
    group: 'Talagaad',
    name: 'Cuore del commercio',
    text: 'Il Talabec porta merci e notizie dal Kislev e scende fino ad Altdorf e al Reik; la Vecchia Strada della Foresta attraversa la città da sud verso Middenheim. Solo parte della ricchezza resta in città: i nobili di Talabheim la tengono soggiogata con tasse e gabelle.',
  },
  {
    group: 'Talagaad',
    name: 'L’Occhio e il Duca',
    text: 'In teoria governa un Magistrato scelto da famiglie nobili e consorterie di Talabheim, con un consiglio di quattro cittadini. In pratica Talagaad è uno dei campi di battaglia tra il Duca Ludwig XII e la nobiltà di Talabheim. Il Magistrato attuale, Anselm Ragguser, promette poco e fa meno: è segretamente al soldo del Duca.',
  },
  {
    group: 'Talagaad',
    name: 'Il crimine e la legge',
    text: 'Poche leggi, quasi tutte sulle tasse. Multe o percosse per i reati comuni, gogna o lavori forzati per quelli seri; omicidio, intralcio al traffico fluviale e sedizione contro Talabheim vanno davanti a un giudice, fino all’impiccagione.',
  },
  {
    group: 'Talagaad',
    name: 'Origini',
    text: 'Quando i Taleuteni scoprirono il cratere del Taalbaston, il ponte era già lì. Attorno nacque un villaggio di pescatori fedeli a Taal, cresciuto per rifornire Talabheim e più volte distrutto da alluvioni, incendi e rivolte. Un inverno terribile portò molti rifugiati Kisleviti, e le loro famiglie sono ancora qui.',
  },
  {
    group: 'Talagaad',
    name: 'La religione a Talagaad',
    text: 'Quasi tutti gli dei sono tollerati, ma Taal e Rhya godono della massima considerazione e il culto di Ulric resta forte. Il culto di Sigmar è praticamente vietato: i suoi fanatici dell’Ordine del Martello d’Argento hanno mandato al rogo più di un prete di Taal.',
  },
  {
    group: 'Il Granducato del Talabec',
    name: 'Il Granducato del Talabec',
    text: 'Governato dal Duca Ludwig XII, erede degli Imperatori Ottiliani e, come rivendica, legittimo sovrano dell’Impero. Cavalieri e Truppe Provinciali tengono a bada banditi e incursioni del Reikland, ma molti nobili esercitano con fierezza la loro indipendenza.',
  },
  {
    group: 'Il Granducato del Talabec',
    name: 'Talabheim e il Taalbaston',
    text: 'La capitale sorge dentro il Grande Cratere del Taalbaston, l’«Occhio della Foresta», un baluardo naturale che Talagaad non ha. Un tempo centro del culto di Ulric, oggi i suoi nobili hanno bisogno del porto più di quanto il porto abbia bisogno di loro.',
  },
  {
    group: 'Fazioni',
    name: 'I Feuerbach di Talabheim',
    text: 'Un’antica casata del Talabecland che dice di discendere dall’avanguardia dei Taleuteni. Tiene il potere da oltre mille anni e nessuno osa sfidarla apertamente.',
  },
  {
    group: 'Fazioni',
    name: 'Lungosguardo e Carogne',
    text: 'I Lungosguardo sono le Truppe Provinciali di Talagaad: bracconieri, briganti e cacciatori, molti cecchini, pochi uomini, male armati e sottopagati. L’11° Talabheim, le «Carogne» del Lord Cacciatore van Obelmann, è arrivato dopo l’assassinio di alcuni dignitari dell’Osterlund: la gente li detesta quanto loro detestano l’incarico.',
  },
  {
    group: 'Fazioni',
    name: 'I Cavalieri Ottiliani',
    text: 'L’ordine che non riuscì a salvare l’ultimo Imperatore Ottiliano. Portano fusciacche scure in ricordo del fallimento; a Talagaad tutti ricordano la brutalità con cui spazzarono via un accampamento di fanatici Sigmariti.',
  },
  {
    group: 'Fazioni',
    name: 'L’Hexenguilde',
    text: 'La gilda dei Maghi del Talabec, che opera col tacito consenso del Duca e offre i suoi servizi ai nobili per essere risparmiata dalla persecuzione. Si dice che il Magistrato abbia un accordo con loro contro streghe e individui pericolosi.',
  },
  {
    group: 'Fazioni',
    name: 'I Mastini di Taal',
    text: 'Una setta sempre più numerosa di adoratori di Taal con maschere da mastino, che si radunano nelle radure per sermoni, danze e riti segreti nei boschi.',
  },
  {
    group: 'Fazioni',
    name: 'La Fratellanza di Serac',
    text: 'Elfi girovaghi a Talagaad. Si dice che i doni che fanno agli stranieri spiino chi li porta, sussurrando segreti ai loro padroni.',
  },
];

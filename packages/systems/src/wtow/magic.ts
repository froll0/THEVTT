/* ------------------------------------------------------------- Incantesimi */

export type MagicLore = 'Magia da Battaglia' | 'Elementalismo' | 'Illusione' | 'Necromanzia';
export const MAGIC_LORES: MagicLore[] = ['Magia da Battaglia', 'Elementalismo', 'Illusione', 'Necromanzia'];

export interface Spell {
  id: string;
  name: string;
  lore: MagicLore;
  /** Valore Magico: successi da accumulare con le Prove di Magia */
  vm: number;
  target: string;
  range: string;
  duration: string;
  text: string;
  /** danni base (+Potenza) per gli incantesimi offensivi */
  damage?: number;
  ignoresArmour?: boolean;
}

const s = (lore: MagicLore, name: string, vm: number, target: string, range: string, duration: string, text: string, extra: Partial<Spell> = {}): Spell => ({
  id: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name, lore, vm, target, range, duration, text, ...extra,
});

export const SPELLS: Spell[] = [
  // Magia da Battaglia
  s('Magia da Battaglia', 'Abisso di Disperazione', 4, 'Zona', 'Lunga', 'Variabile', 'La terra si apre: chi è nella Zona fa una Prova di Atletica con tanti successi quanta la Potenza; chi fallisce resta sepolto fino alle spalle (va dissotterrato con Muscoli), gli altri cadono Proni.'),
  s('Magia da Battaglia', 'Maledizione della Vigliaccheria', 3, 'Zona', 'Lunga', 'Istantanea', 'I nemici nella Zona Arretrano e, se con Volontà non eguagliano la Potenza, diventano Atterriti.'),
  s('Magia da Battaglia', 'Missili Incendiari', 2, 'Una manciata di frecce o dardi', 'Ravvicinata', 'Potenza turni', 'I proiettili prendono fuoco: +1 Danno e In Fiamme a chi feriscono o fanno Barcollare.'),
  s('Magia da Battaglia', 'Palla di Fuoco', 3, 'Creatura', 'Lunga', 'Istantanea', 'Il bersaglio e chi gli è a Distanza Ravvicinata subiscono 5+Potenza Danni; i non-Mostruosità cadono Proni.', { damage: 5 }),
  s('Magia da Battaglia', 'Piè Veloce', 2, 'Zona', 'Lunga', 'Potenza turni', 'Fino a Potenza creature nella Zona diventano Veloci.'),
  s('Magia da Battaglia', 'Pugni Martellanti', 1, 'Se Stesso', 'Se Stesso', 'Potenza turni', 'I tuoi pugni contano come magici e infliggono F+Potenza Danni invece di Barcollante.'),
  s('Magia da Battaglia', 'Rincuorare', 2, 'Zona', 'Lunga', 'Potenza turni', 'Potenza creature nella Zona possono provare a togliersi Atterrito con Volontà, anche in Zone con nemici.'),
  s('Magia da Battaglia', 'Schianto', 1, 'Oggetto', 'Ravvicinata', 'Istantanea', 'Rompi un oggetto non più grande di te (o una sua parte); la Potenza dice quanto. Chi lo impugna può opporsi con Atletica.'),
  s('Magia da Battaglia', 'Scudo di Quercia', 3, 'Se Stesso', 'Corta', 'Combattimento', 'Tu e Potenza alleati entro Distanza Corta ottenete +2 Resilienza (+1 se già corazzati); non ostacola la magia.'),
  s('Magia da Battaglia', 'Tamponare Ferite', 2, 'Creatura', 'Lunga', 'Istantanea', 'Medichi subito una Ferita del bersaglio; con Potenza superiore alle sue Ferite ne guarisci una che non richiede operazione.'),
  // Elementalismo
  s('Elementalismo', 'Combustione Spontanea', 2, 'Creatura', 'Media', 'Istantanea', 'Il bersaglio prende fuoco: In Fiamme con Pericolo pari alla Potenza. Su un oggetto, la Potenza dice quanto grande può essere.'),
  s('Elementalismo', 'Creare Sorgente', 1, 'Zona', 'Corta', 'Fino all’alba', 'Fai sgorgare acqua potabile; a Potenza 3 basta per un villaggio.'),
  s('Elementalismo', 'Egida Ardente', 1, 'Creatura', 'Ravvicinata', 'Combattimento', 'Immunità al fuoco naturale; i Danni da fuoco magico calano della Potenza.'),
  s('Elementalismo', 'Evocare Spirito della Terra', 5, 'Zona', 'Lunga', 'Combattimento', 'Uno spirito rende la Zona Terreno Difficile, fornisce copertura o la trasforma in Pericolo (Potenza, Atletica); lo guidi con Comando.'),
  s('Elementalismo', 'Fulmine', 2, 'Creatura', 'Lunga', 'Istantanea', 'Il bersaglio subisce 4+Potenza Danni, 5+Potenza se corazzato.', { damage: 4 }),
  s('Elementalismo', 'Occhio del Ciclone', 2, 'Potenza Zone', 'Media', 'Fino all’alba', 'Calma il maltempo; chi è dentro ha copertura contro gli attacchi a distanza dall’esterno.'),
  s('Elementalismo', 'Piaga della Ruggine', 2, 'Zona', 'Lunga', 'Permanente', 'Potenza oggetti non magici invecchiano: armi -1 Danno, armature -1 Resilienza, meccanismi inceppati.'),
  s('Elementalismo', 'Raffica di Vento', 3, 'Zona', 'Lunga', 'Istantanea', 'Fino a Potenza Zone adiacenti: chi non è protetto cade Prono.'),
  s('Elementalismo', 'Respiro Infuocato', 2, 'Zona', 'Media', 'Istantanea', 'Potenza nemici nella Zona subiscono 3 Danni (4 se non corazzati).', { damage: 3 }),
  s('Elementalismo', 'Spada Fiammeggiante', 2, 'Oggetto', 'Corta', 'Potenza turni', 'Un’arma prende fuoco: chi viene fatto Barcollare o Ferito diventa In Fiamme.'),
  s('Elementalismo', 'Temperatura Ottimale', 1, 'Potenza Zone', 'Media', 'Fino all’alba o al tramonto', 'Le Zone diventano piacevolmente calde (o fastidiosamente fredde).'),
  // Illusione
  s('Illusione', 'Bilocazione', 5, 'Se Stesso', 'Ravvicinata', 'Combattimento', 'Crei un tuo doppio: entrambi agiscono ma uno solo interagisce fisicamente per turno; il primo ferito si rivela la copia.'),
  s('Illusione', 'Colonna di Cristallo', 2, 'Se Stesso', 'Ravvicinata', 'Potenza turni', 'Una barriera illusoria blocca la vista tra due Zone; sembra invalicabile a chi non ne sospetta la natura.'),
  s('Illusione', 'Manto Scintillante', 1, 'Se Stesso', 'Ravvicinata', 'Potenza turni', 'Vinci i pareggi nelle Prove per evitare gli attacchi, ma fallisci la Furtività.'),
  s('Illusione', 'Oro degli Stolti', 1, 'Oggetto', 'Ravvicinata', 'Combattimento', 'Un oggetto sembra più prezioso; per accorgersene serve Percezione con successi pari alla Potenza.'),
  s('Illusione', 'Proiettare Voce', 1, 'Zona', 'Media', 'Istantanea', 'La tua voce sembra provenire dalla Zona scelta.'),
  s('Illusione', 'Rasoio Mentale', 2, 'Creatura', 'Lunga', 'Istantanea', '3+Potenza Danni che ignorano l’armatura; il bersaglio supera Volontà o diventa Atterrito.', { damage: 3, ignoresArmour: true }),
  s('Illusione', 'Velo', 2, 'Creatura', 'Corta', 'Combattimento', 'Il bersaglio sembra più (o meno) attraente: fino a Potenza dadi di bonus o penalità sociali; può sembrare di uno Status diverso.'),
  s('Illusione', 'Visione di Morr', 3, 'Creatura', 'Corta', 'Variabile', 'Il bersaglio si crede ferito a morte: i PNG reagiscono di conseguenza, i PG tirano 3d10 sulla tabella delle Ferite e si comportano come se l’avessero subita.'),
  s('Illusione', 'Volto Amichevole', 3, 'Creatura', 'Ravvicinata', 'Permanente', 'Toccandolo, il bersaglio è convinto di conoscerti e accetta ogni spiegazione plausibile.'),
  // Necromanzia
  s('Necromanzia', 'Abitanti del Sottosuolo', 1, 'Zona', 'Lunga', 'Potenza turni', 'Mani scheletriche: la Zona è Terreno Difficile e chi cade Prono non si rialza finché dura.'),
  s('Necromanzia', 'Atto Finale', 2, 'Cadavere', 'Ravvicinata', 'Istantanea', 'Il cadavere rivive in silenzio i suoi ultimi istanti.'),
  s('Necromanzia', 'Danza Macabra di Vanhel', 2, 'Potenza nonmorti', 'Lunga', 'Combattimento', 'Zombi e Scheletri salgono di un grado di Velocità e hanno +1d in mischia.'),
  s('Necromanzia', 'Destriero Spettrale', 2, 'Oggetto', 'Ravvicinata', 'Fino all’alba', 'Evochi fino a Potenza cavalcature spettrali: chi le monta ha +1 Resilienza ed è Veloce.'),
  s('Necromanzia', 'Distruggere Nonmorti', 3, 'Potenza nonmorti', 'Corta', 'Combattimento', 'I nonmorti senza mente tornano cadaveri; gli altri subiscono 8+Potenza Danni.', { damage: 8 }),
  s('Necromanzia', 'Maledizione degli Anni', 3, 'Creatura', 'Corta', 'Istantanea', 'Il bersaglio invecchia di Potenza d10 anni ed è Esausto fino a fine battaglia.'),
  s('Necromanzia', 'Resuscitare i Morti', 3, 'Potenza cadaveri', 'Ravvicinata', 'Potenza giorni', 'Crei Scheletri Guerrieri che obbediscono a ordini semplici; ne controlli quanti il tuo Livello da Mago.'),
  s('Necromanzia', 'Sangue Rinvigorente', 3, 'Ampolla di sangue', 'Ravvicinata', 'Potenza giorni', 'Bevendo il sangue di un cadavere della tua specie togli Esausto e Ostacolato e medichi le Ferite (rischio di Corruzione).'),
  s('Necromanzia', 'Seduta Spiritica della Voce Rubata', 3, 'Uno spirito di cui conosci il nome', '—', 'Istantanea', 'Lo spirito parla con la tua voce e risponde a Potenza domande.'),
  s('Necromanzia', 'Teschio Urlante', 3, 'Potenza teschi', 'Ravvicinata', 'Combattimento', 'Teschi infuocati: uno per turno attacca (Lunga, 3d/3, Danno 6, In Fiamme) e se colpisce si distrugge.'),
  s('Necromanzia', 'Volto della Morte', 2, 'Se Stesso', 'Se Stesso', 'Combattimento', 'Chi Arretra per i tuoi attacchi di Mischia o Muscoli diventa Atterrito (Volontà pari alla Potenza per toglierlo).'),
];

/** VM degli incantesimi improvvisati */
export const IMPROVISED: { level: string; vm: string; req: string; damage: string }[] = [
  { level: 'Minore', vm: '2', req: 'Mago 1 o Tocco dei Venti', damage: '4+Potenza a un bersaglio, o una Condizione' },
  { level: 'Base', vm: '4', req: 'Mago 2', damage: '5+Potenza a un bersaglio, o 3+Potenza a lui e ai vicini' },
  { level: 'Avanzato', vm: '8', req: 'Mago 3', damage: '6+Potenza a un bersaglio, o 4+Potenza a una Zona' },
  { level: 'Magistrale', vm: '12+', req: 'Mago 4', damage: '8+Potenza, o 6+Potenza a una Zona' },
];

export const IMPROVISED_MODS = [
  '+1: Portata Media o una Condizione minore',
  '+2: Portata Lunga, un Pericolo o una Condizione grave',
  '+3: l’effetto copre una Zona',
  'raddoppia: qualcosa di straordinario',
];

/* ------------------------------------------------------------------- Dei */

export interface God {
  id: string;
  name: string;
  domain: string;
  lore: string;
  precepts: string[];
  favour: string;
  prayers: { name: string; text: string }[];
  miracle: string;
}

export const GODS: God[] = [
  {
    id: 'ulric', name: 'Ulric', domain: 'Guerra, inverno e lupi', lore: 'Montagne',
    precepts: ['Obbedisci ai superiori', 'Difendi l’onore e non rifiutare sfide', 'Niente inganni se non nelle imboscate', 'Indossa solo pelli di lupi che hai ucciso', 'Niente polvere nera, elmi, balestre e tecnologia'],
    favour: 'Il freddo non ti penalizza e i lupi ti rispettano. Quando subisci una Ferita in battaglia il tuo prossimo attacco in mischia è Glorioso.',
    prayers: [
      { name: 'Brina Gelida', text: 'Fino a fine combattimento chi fai Barcollare supera Volontà o diventa Atterrito.' },
      { name: 'Morso dell’Inverno', text: 'La tua ascia infligge +1 Danno e conta come magica fino a fine combattimento.' },
      { name: 'Ululato del Lupo', text: 'Un lupo bianco spettrale combatte al tuo fianco fino a fine scontro.' },
    ],
    miracle: 'Tempeste invernali, branchi di lupi o il sangue di un nemico che gela nelle vene.',
  },
  {
    id: 'taal', name: 'Taal', domain: 'Natura e luoghi selvaggi', lore: 'Boschi',
    precepts: ['Prega a ogni animale abbattuto', 'Una settimana l’anno in solitudine nella natura', 'Niente armature di metallo', 'Niente polvere da sparo e tecnologia', 'Non ferire animali se non per difesa, cibo o sacrificio'],
    favour: 'Le Prove per cacciare, seguire tracce o muoverti furtivo nelle terre selvagge sono Gloriose; sai sempre se qualcuno ti segue.',
    prayers: [
      { name: 'Avviluppare', text: 'Una Zona con vegetazione entro Distanza Lunga diventa Terreno Difficile per chi non ha il favore di Taal.' },
      { name: 'Balzo del Cervo', text: 'Diventi Veloce e salti l’altezza di una capanna.' },
      { name: 'Signore delle Selve', text: 'Con Volontà domini una bestia, entro i limiti della sua natura.' },
    ],
    miracle: 'Sparire nella foresta e riapparire lontano, evocare una grande bestia, cancellare i sentieri.',
  },
  {
    id: 'rhya', name: 'Rhya', domain: 'Estate, raccolto e fertilità', lore: 'Agricoltura o Cucina',
    precepts: ['Proteggi famiglie, bambini e raccolti', 'Non vergognarti del tuo corpo', 'La vita è sacra: ferisci solo per salvarne un’altra', 'Condividi il raccolto se ne hai abbastanza'],
    favour: 'Ti basta un pasto misero al giorno; in un insediamento sai quale casa vi accoglierà meglio.',
    prayers: [
      { name: 'Figli di Rhya', text: 'Percepisci i viventi entro Distanza Corta (con Volontà l’area si allarga di una Zona per successo).' },
      { name: 'Raccolto di Rhya', text: 'Dal terreno spunta cibo per te e qualche compagno.' },
      { name: 'Rifugio di Rhya', text: 'Nelle terre selvagge trovi subito un riparo e il necessario per il fuoco.' },
    ],
    miracle: 'Frutti in inverno, un raccolto improvviso, un lago che si scongela.',
  },
  {
    id: 'sigmar', name: 'Sigmar', domain: 'Patrono dell’Impero', lore: 'Storia o Tribù di Orchi e Goblin',
    precepts: ['Obbedisci agli ordini', 'Aiuta i Nani e non far loro del male', 'Promuovi l’unità dell’Impero', 'Sii fedele al trono', 'Nessuna pietà per Pelleverde, adoratori oscuri e streghe'],
    favour: 'Una volta per battaglia ti togli Barcollante senza Azione; i martelli che impugni fanno +1 Danno.',
    prayers: [
      { name: 'Faro di Giusta Virtù', text: 'Tu e gli alleati entro Distanza Corta perdete Atterrito; con Volontà togli Barcollante a uno per successo.' },
      { name: 'Martello di Sigmar', text: 'Il tuo martello arde: conta come magico e il primo nemico colpito prende fuoco.' },
      { name: 'Non Ascoltare la Strega', text: 'Le Prove di Magia degli incantesimi su di te e sugli alleati vicini sono Tetre.' },
    ],
    miracle: 'Una cometa a due code, un martello con l’eco di Ghal Maraz.',
  },
  {
    id: 'manann', name: 'Manann', domain: 'Mare e tempeste', lore: 'Corsi d’Acqua o Mari',
    precepts: ['Non fischiare né imprecare in mare', 'Non ferire gli albatri', 'Il primo pescato è suo', 'Offerte a ogni suo tempio', 'Dai la caccia ai servi di Stromfels'],
    favour: 'Niente mal di mare, non anneghi in mare aperto e le correnti ti riportano a riva; peschi a mani nude.',
    prayers: [
      { name: 'Camminare sulle Acque', text: 'Cammini sull’acqua come su terra.' },
      { name: 'Dominio dei Venti', text: 'Venti favorevoli a una nave, o bonaccia per quelle che vedi.' },
      { name: 'Volto dell’Annegato', text: 'Volontà contro Resistenza di un nemico entro Distanza Lunga: se vinci è Barcollante e non può Arretrare.' },
    ],
    miracle: 'Onde anomale, diluvi, navi incagliate, fiumi gonfi o calmi.',
  },
  {
    id: 'morr', name: 'Morr', domain: 'Morte e sogni', lore: 'Nonmorti',
    precepts: ['Rispetta i morti', 'Non ferire i corvi', 'Caccia necromanti e nonmorti', 'Ascolta i tuoi sogni', 'Non interrompere né rifiutare un funerale', 'Non resuscitare i morti'],
    favour: 'Sai se chi ti parla è vicino alla morte e da quanto è morto un cadavere; +1 Danno contro i nonmorti.',
    prayers: [
      { name: 'Estrema Unzione', text: 'Un Servitore nonmorto a Distanza Ravvicinata è distrutto; gli altri nonmorti subiscono una Ferita.' },
      { name: 'Fermare la Mano di Morr', text: 'Finché lo tocchi e resti cosciente, chi tocchi non può morire.' },
      { name: 'Soglia del Portale', text: 'Una linea che i nonmorti senza mente non passano; gli altri devono vincerti in Volontà e restano Esausti.' },
    ],
    miracle: 'Interrogare l’ombra di un defunto o riportare un alleato a un’ultima battaglia.',
  },
  {
    id: 'ranald', name: 'Ranald', domain: 'Ladri e imbroglioni', lore: 'Mondo Criminale',
    precepts: ['Una moneta su dieci a Ranald', 'Mai fare la spia', 'Violenza solo per difesa', 'Meglio morire liberi', 'Tra Ranaldiani c’è onore'],
    favour: 'Trovi sempre una bisca; dimezzi il Pericolo delle cadute; i testimoni non concordano mai sulla tua descrizione.',
    prayers: [
      { name: 'Fortuna di Ranald', text: 'A inizio sessione un gioco d’azzardo col GM: se vinci hai 1 Fato temporaneo.' },
      { name: 'Ricco, Povero, Mendicante, Ladro', text: 'Sembri appartenere a qualunque ambiente; con Volontà includi un alleato per successo.' },
      { name: 'Un Invito', text: 'Un nodo, una serratura o un catenaccio entro Distanza Corta si apre.' },
    ],
    miracle: 'Coincidenze incredibili: sparire nelle fogne e riemergere in un’altra città.',
  },
  {
    id: 'verena', name: 'Verena', domain: 'Saggezza, verità e giustizia', lore: 'Giurisprudenza',
    precepts: ['Media sempre le dispute', 'Di’ la verità', 'Preserva la conoscenza', 'Violenza come ultima risorsa', 'Non servire l’iniquità'],
    favour: 'Quando dici la verità vieni creduto; nelle biblioteche trovi sempre ciò che cerchi.',
    prayers: [
      { name: 'Catene della Verità', text: 'Finché lo fissi, il bersaglio non può mentire.' },
      { name: 'La Verità Verrà Rivelata', text: 'Ti accorgi di ogni inganno vicino, illusioni comprese.' },
      { name: 'Spada della Giustizia', text: 'La tua spada ignora l’armatura; i criminali che ferisce sono sconfitti o Indifesi.' },
    ],
    miracle: 'Conoscenze perdute, la verità in un groviglio di menzogne, una sentenza su un criminale.',
  },
  {
    id: 'myrmidia', name: 'Myrmidia', domain: 'Guerra onorevole e strategia', lore: 'Esercito',
    precepts: ['Agisci con dignità', 'Rispetta i prigionieri, non uccidere chi si arrende', 'Nessuna pietà per i nemici dell’umanità', 'Obbedisci agli ordini onorevoli', 'Proteggi i deboli dalla guerra'],
    favour: 'Con uno scudo non sei mai in inferiorità numerica; +1 Danno con le lance.',
    prayers: [
      { name: 'Occhio dell’Aquila', text: 'Vedi con gli occhi di un’aquila spettrale fino a 1,5 km.' },
      { name: 'Scudo di Myrmidia', text: 'Tu e gli alleati entro Distanza Corta avete +1 Resilienza fino a fine scontro.' },
      { name: 'Sole Splendente', text: 'Tutti gli altri nella tua Zona sono Accecati fino alla fine del tuo prossimo turno.' },
    ],
    miracle: 'La tua voce che arriva a tutto l’esercito, un’armata nascosta ai nemici.',
  },
  {
    id: 'shallya', name: 'Shallya', domain: 'Guarigione e pietà', lore: 'Anatomia o Misture',
    precepts: ['Aiuta chiunque senza giudicare', 'Non uccidere se non per difesa', 'Combatti chi adora la decomposizione', 'Il lavoro non finisce mai', 'Non portare armi: basta un bastone'],
    favour: 'Gli aggressori Umani preferiscono altri bersagli; le Prove per curare malattie e ferite sono Gloriose.',
    prayers: [
      { name: 'Amara Catarsi', text: 'Con Tempra curi una malattia o un veleno per successo (con una Complicazione ne soffri tu).' },
      { name: 'Lacrime di Shallya', text: 'Volontà su un Ferito vicino: 1 successo guarisce al prossimo Intermezzo, 2 dopo una notte, 3+ subito.' },
      { name: 'Martire', text: 'Fino a fine scontro tiri tu sulla tabella delle Ferite al posto di un alleato.' },
    ],
    miracle: 'Guarire ogni ferita, far ricrescere arti, proteggere una città dalla pestilenza (mai resuscitare).',
  },
];

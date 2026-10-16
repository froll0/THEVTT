import type { SkillId } from './glossary';

/** What an ancestry or background changes on the sheet (the rest is in its text). */
export interface OriginBonus {
  /** +n to every skill */
  allSkills?: number;
  skills?: Partial<Record<SkillId, number>>;
  initiative?: number;
  initiativeAdvantage?: boolean;
  speed?: number;
  maxWounds?: number;
  hitDice?: number;
  armor?: number;
  /** Fiendkin: a neutral save becomes advantaged; Celestial: the disadvantaged one becomes neutral */
  saves?: 'neutral-to-adv' | 'dis-to-neutral';
  language?: string;
  /** hit dice one step bigger, always healing the max (Oozeling) */
  hitDieStep?: number;
}

export interface AncestryDef {
  id: string;
  name: string;
  en: string;
  size: string;
  exotic?: boolean;
  text: string;
  trait: { name: string; text: string };
  bonus: OriginBonus;
}

export const ANCESTRIES: AncestryDef[] = [
  { id: 'human', name: 'Umano', en: 'Human', size: 'Media', text: 'In ogni terra e clima: curiosità e ambizione li spingono in ogni angolo del mondo.', trait: { name: 'Tenace', text: '+1 a tutte le abilità e all’Iniziativa.' }, bonus: { allSkills: 1, initiative: 1 } },
  { id: 'dwarf', name: 'Nano', en: 'Dwarf', size: 'Media', text: '«Nano», nella lingua antica, vuol dire «pietra». Robusto, saldo, tarchiato: anche sfinito non vacilla.', trait: { name: 'Robusto', text: '+2 Dadi Vita massimi, +1 Ferite massime, −1 velocità. Conosci il Nanico se la tua INT non è negativa.' }, bonus: { hitDice: 2, maxWounds: 1, speed: -1, language: 'Nanico' } },
  { id: 'elf', name: 'Elfo', en: 'Elf', size: 'Media', text: 'Rapidità e grazia: gli elfi colpiscono per primi, spesso evitando il peggio.', trait: { name: 'Snello', text: 'Vantaggio all’Iniziativa, +1 velocità. Conosci l’Elfico se la tua INT non è negativa.' }, bonus: { initiativeAdvantage: true, speed: 1, language: 'Elfico' } },
  { id: 'halfling', name: 'Halfling', en: 'Halfling', size: 'Piccola', text: 'Come un umano, ma più piccolo (piedi a parte). E la fortuna da dove viene? Dai piedi, ovvio.', trait: { name: 'Sfuggente', text: '+1 a Furtività. Se fallisci un TS puoi riuscire invece, 1/Riposo sicuro.' }, bonus: { skills: { stealth: 1 } } },
  { id: 'gnome', name: 'Gnomo', en: 'Gnome', size: 'Piccola', text: 'Eccentrici, curiosi e sempre ottimisti: molto più allegri dei loro cugini nani.', trait: { name: 'Ottimista', text: 'Permetti a un alleato entro Portata 6 di ritirare un singolo dado; si ricarica quando torni ai PF massimi. −1 velocità. Conosci il Nanico (lo chiami Gnomesco) se la tua INT non è negativa.' }, bonus: { speed: -1, language: 'Nanico' } },
  { id: 'bunbun', name: 'Bunbun', en: 'Bunbun', size: 'Piccola', exotic: true, text: 'Agili e imprevedibili, saltano lontanissimo con le loro zampe potenti.', trait: { name: 'Zampe da coniglio', text: 'Prima di Interporti o dopo esserti Difeso (dopo i danni), salta fino alla tua velocità in qualsiasi direzione, gratis, 1/scontro.' }, bonus: {} },
  { id: 'dragonborn', name: 'Draconide', en: 'Dragonborn', size: 'Media', exotic: true, text: 'L’anima di un drago arde in te e le tue scaglie sono acciaio forgiato.', trait: { name: 'Retaggio draconico', text: '+1 Armatura. Quando attacchi: infliggi LIV+CHIAVE danni in più (ignorando l’armatura) divisi come vuoi tra i bersagli; si ricarica con un Riposo sicuro o quando prendi una Ferita. Conosci il Draconico se la tua INT non è negativa.' }, bonus: { armor: 1, language: 'Draconico' } },
  { id: 'fiendkin', name: 'Infernide', en: 'Fiendkin', size: 'Media', exotic: true, text: 'Nati, si dice, dall’unione tra un mortale e un immondo, o da una stirpe maledetta: emarginati ma tenaci.', trait: { name: 'Nato dalla fiamma', text: 'Uno dei tuoi TS neutri diventa favorito. Conosci l’Infernale se la tua INT non è negativa.' }, bonus: { saves: 'neutral-to-adv', language: 'Infernale' } },
  { id: 'goblin', name: 'Goblin', en: 'Goblin', size: 'Piccola', exotic: true, text: 'Verdi, astuti e sempre malvisti: sparire nell’ombra per un goblin non è un’abilità, è un’identità.', trait: { name: 'Svignarsela', text: 'Quando diventi bersaglio di un attacco o di un effetto negativo puoi muoverti di 2 caselle gratis (dopo i danni, ignorando il terreno difficile). Conosci il Goblin se la tua INT non è negativa.' }, bonus: { language: 'Goblin' } },
  { id: 'kobold', name: 'Coboldo', en: 'Kobold', size: 'Piccola', exotic: true, text: 'Piccoli, spesso maniacali e ossessionati dai draghi: anche i più minuti possono avere un grande potere.', trait: { name: 'Scaltro', text: 'Costringi un nemico a ritirare un attacco non critico contro di te, 1/scontro. +3 a Influenza con i personaggi amichevoli. Vantaggio alle prove che riguardano i draghi. Conosci il Draconico se la tua INT non è negativa.' }, bonus: { language: 'Draconico' } },
  { id: 'orc', name: 'Orco', en: 'Orc', size: 'Media', exotic: true, text: 'Quando credi di aver battuto un orco, l’hai solo fatto arrabbiare.', trait: { name: 'Implacabile', text: 'Quando scenderesti a 0 PF puoi invece portarli al tuo LIV, 1/Riposo sicuro. +1 a Potenza. Conosci il Goblin (lo chiami Orchesco) se la tua INT non è negativa.' }, bonus: { skills: { might: 1 }, language: 'Goblin' } },
  { id: 'birdfolk', name: 'Volatile', en: 'Birdfolk', size: 'Piccola o Media', exotic: true, text: 'Il rifugio dei volatili è il cielo; il prezzo del volo sono ossa cave e fragili.', trait: { name: 'Ossa cave', text: 'Hai velocità di volo finché l’armatura non è più pesante del Cuoio. I critici contro di te sono Brutali (l’attaccante tira un dado in più). Gli spostamenti forzati ti spostano del doppio.' }, bonus: {} },
  { id: 'celestial', name: 'Celestiale', en: 'Celestial', size: 'Media', exotic: true, text: 'Discendenti di esseri divini, nobili e aggraziati, resistono alla sventura.', trait: { name: 'Altolocato', text: 'Il tuo TS sfavorito diventa neutro. Conosci il Celestiale se la tua INT non è negativa.' }, bonus: { saves: 'dis-to-neutral', language: 'Celestiale' } },
  { id: 'changeling', name: 'Mutaforma', en: 'Changeling', size: 'Media', exotic: true, text: 'Cacciati per il loro sangue d’argento, sopravvivono cambiando identità. Chi cambia troppo spesso rischia di dimenticare chi era.', trait: { name: 'Nuovo posto, nuova faccia', text: '+2 punti abilità mutevoli. Puoi assumere l’aspetto di qualsiasi stirpe; quando lo fai puoi mettere i 2 punti mutevoli in una sola abilità. 1/giorno.' }, bonus: {} },
  { id: 'crystalborn', name: 'Cristallide', en: 'Crystalborn', size: 'Media', exotic: true, text: 'Fatti di cristallo vivente, di bellezza abbagliante e durezza ultraterrena.', trait: { name: 'Aura riflettente', text: 'Quando ti Difendi ottieni CHIAVE Armatura e infliggi CHIAVE danni all’attaccante. 1/scontro.' }, bonus: {} },
  { id: 'dryad', name: 'Driade/Fungoide', en: 'Dryad/Shroomling', size: 'Piccola o Media', exotic: true, text: 'Legati al mondo naturale, quando vengono feriti liberano spore tossiche.', trait: { name: 'Polline/spore pericolosi', text: 'Quando un nemico ti causa una o più Ferite, emani spore soporifere: tutti i nemici adiacenti sono Frastornati. Conosci l’Elfico se la tua INT non è negativa.' }, bonus: { language: 'Elfico' } },
  { id: 'half-giant', name: 'Mezzogigante', en: 'Half-Giant', size: 'Grande', exotic: true, text: 'Imponenti e incrollabili come le montagne da cui vengono.', trait: { name: 'Forza della roccia', text: 'Costringi un nemico a ritirare un critico contro di te, 1/scontro. +2 a Potenza. Conosci il Nanico se la tua INT non è negativa.' }, bonus: { skills: { might: 2 }, language: 'Nanico' } },
  { id: 'beastfolk', name: 'Minotauro/Bestiale', en: 'Minotaur/Beastfolk', size: 'Media', exotic: true, text: 'Un legame primordiale con le Terre Selvagge: forza e agilità per caricare o aggirare.', trait: { name: 'Carica', text: 'Se ti muovi di almeno 4 caselle puoi spingere una creatura sul tuo percorso: Media di 1 casella, Piccola/Minuscola fino a 2. 1/turno.' }, bonus: {} },
  { id: 'oozeling', name: 'Melmoide/Costrutto', en: 'Oozeling/Construct', size: 'Piccola o Media', exotic: true, text: 'Che importa se nel petto hai olio invece di sangue, o niente cuore? Se ti infili un paio di pantaloni sei «gEnTe» anche tu!', trait: { name: 'Costituzione strana', text: 'I tuoi Dadi Vita salgono di un passo (d6 » d8 » d10 » d12 » d20) e ti curano sempre del massimo. Le cure magiche ti curano sempre del minimo.' }, bonus: { hitDieStep: 1 } },
  { id: 'planar', name: 'Planare', en: 'Planarbeing', size: 'Media', exotic: true, text: 'Non sei di questo piano: la tua anima ci è legata poco, ma puoi scivolare altrove nel momento del bisogno.', trait: { name: 'Spostamento planare', text: 'Quando ti Difendi puoi prendere 1 Ferita per uscire dal piano materiale e ignorare i danni. −2 Ferite massime.' }, bonus: { maxWounds: -2 } },
  { id: 'ratfolk', name: 'Rattide', en: 'Ratfolk', size: 'Piccola', exotic: true, text: 'Sopravvissuti all’ombra della società, agili, pieni di risorse e fedeli ai loro.', trait: { name: 'Sgattaiolare', text: '+2 Armatura se ti sei mosso nel tuo ultimo turno.' }, bonus: {} },
  { id: 'stoatling', name: 'Ermellide', en: 'Stoatling', size: 'Piccola', exotic: true, text: 'Piccoli ma tutt’altro che deboli: abbattono nemici molto più grossi.', trait: { name: 'Piccolo ma feroce', text: 'Quando attacchi un singolo bersaglio più grande di te, tira 1d6 in più per ogni taglia di differenza. Lui fa lo stesso contro di te.' }, bonus: {} },
  { id: 'turtlefolk', name: 'Tartarughide', en: 'Turtlefolk', size: 'Piccola o Media', exotic: true, text: 'Pazienti, robusti, lenti all’ira: il guscio li protegge, ma li rallenta.', trait: { name: 'Piano e costante', text: '+4 Armatura, −2 velocità.' }, bonus: { armor: 4, speed: -2 } },
  { id: 'wyrdling', name: 'Stramboide', en: 'Wyrdling', size: 'Piccola', exotic: true, text: 'Imprevedibili e caotici, frutto di una magia andata storta.', trait: { name: 'Ondata caotica', text: 'Quando tu o un alleato consenziente entro Portata 6 lanciate un incantesimo di grado, puoi fargli tirare sulla Tabella del Caos. 1/scontro.' }, bonus: {} },
];

export interface BackgroundDef {
  id: string;
  name: string;
  en: string;
  text: string;
  /** a requirement at creation, shown on the choice */
  req?: string;
  bonus: OriginBonus;
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'retired', name: 'Tornato dalla pensione', en: 'Back Out of Retirement', text: 'Hai dimenticato più cose di quante ne sappiano gli avventurieri di oggi. Vediamo se mi ricordo come si fa…: puoi prendere 1 Ferita per usare un’abilità o lanciare un incantesimo come se fossi di 1 livello più alto. Queste vecchie ossa: −1 Ferite massime.', bonus: { maxWounds: -1 } },
  { id: 'protector', name: 'Protettore devoto', en: 'Devoted Protector', text: 'Scegli un alleato del gruppo: sopporti +3 Ferite massime finché è vicino. Quando lui prende una Ferita, la prendi anche tu.', bonus: {} },
  { id: 'dropout', name: 'Fuggito dall’accademia', en: 'Academy Dropout', text: 'La scuola non fa per tutti: impari dall’esperienza. Conosci 1 incantesimo di utilità a scelta.', bonus: {} },
  { id: 'bad-choice', name: 'Scelta SBAGLIATA', en: 'Made a BAD Choice', text: 'Inizi con 500 o 1.000 mo in più, o un oggetto magico non comune/raro (se il master lo permette). In cambio una maledizione o un nemico altrettanto potente lo rivuole. Il master può permetterti un secondo background.', bonus: {} },
  { id: 'haunted', name: 'Passato tormentato', en: 'Haunted Past', text: 'Voci ti danno ogni tanto consigli criptici: a volte utilissimi, a volte vogliono solo vederti soffrire. Vantaggio contro la paura.', bonus: {} },
  { id: 'ear', name: 'Orecchio a terra', en: 'Ear to the Ground', text: 'Vantaggio alle prove per sapere o scoprire pettegolezzi su fatti che accadranno presto o accaduti da meno di un anno.', bonus: {} },
  { id: 'been-around', name: 'Eh, ne ho viste', en: 'What? I’ve Been Around', text: '1 volta per luogo (o a discrezione del master) conosci PROPRIO la persona che ha l’informazione che cerchi o può tirarti fuori dai guai. Tira 1d20: 1–5 ti vuole MORTO; 6–12 gli devi dei soldi; 13–19 si può convincere ad aiutarti; 20 è il tuo più grande fan / innamorato perso di te.', bonus: {} },
  { id: 'acrobat', name: 'Acrobata', en: 'Acrobat', text: 'Un alleato più grande può lanciarti MOLTO lontano. Metà danni da cadute e spostamenti forzati.', bonus: {} },
  { id: 'wild-one', name: 'Creatura selvatica', en: 'Wild One', text: 'Le creature selvatiche ti temono meno e ti aiutano volentieri. +1 a Natura. Nei Riposi sul campo nelle terre selvagge tiri i Dadi Vita con vantaggio.', bonus: { skills: { naturecraft: 1 } } },
  { id: 'fey-touched', name: 'Tocco fatato', en: 'Fey Touched', text: 'Subisci metà danni da tutti gli effetti magici, il doppio dalle armi di metallo (prima dell’armatura).', bonus: {} },
  { id: 'survivalist', name: 'Sopravvissuto', en: 'Survivalist', text: 'Non resti mai senza razioni: tutto è cibo, se ci provi. Vantaggio ai TS contro il veleno. +1 Dadi Vita massimi.', bonus: { hitDice: 1 } },
  { id: 'sea', name: 'Di casa sul mare', en: 'Home at Sea', text: 'Recuperi il doppio di Ferite e PF riposando su una nave o vicino all’acqua. All’occorrenza fai da primo ufficiale o capitano. Vantaggio alle prove legate all’acqua.', bonus: {} },
  { id: 'underground', name: 'Di casa sottoterra', en: 'At Home Underground', text: 'Scavi due volte più in fretta degli altri. I luoghi di Riposo sicuro sottoterra per te contano come alloggio Lussuoso. Fai fatica a riposare (TS su INT) quando piove. «Acqua… dal CIELO?!»', bonus: {} },
  { id: 'goblins', name: 'Cresciuto dai goblin', en: 'Raised by Goblins', text: 'Parli il Goblin da madrelingua. Noti ed eviti le trappole rozze e hai vantaggio a notare e disinnescare quelle più raffinate. (Puoi scegliere un’altra stirpe che ti ha cresciuto: ne parli la lingua e ne prendi una capacità tipica.)', bonus: { language: 'Goblin' } },
  { id: 'history-buff', name: 'Appassionato di storia', en: 'History Buff', text: 'Vantaggio alle prove di Cultura su oggetti, fatti o eventi di più di 100 anni fa.', bonus: {} },
  { id: 'con-artist', name: '(Ex) truffatore', en: '(Former) Con Artist', text: 'Falsifichi quasi ogni documento e imiti le voci alla perfezione. Hai un contatto criminale in quasi ogni grande città. Ma la tua fama ti precede, finché non dimostri di essere affidabile.', bonus: {} },
  { id: 'undead', name: '(Segretamente) non morto', en: '(Secretly) Undead', text: 'Resistenza innaturale: sei immune alle malattie e non devi mangiare, bere né respirare. Bambini, animali e Celestiali sono a disagio con te; molti resteranno inorriditi scoprendo cosa sei.', bonus: {} },
  { id: 'finer-things', name: 'Gusto per le cose raffinate', en: 'Taste for the Finer Things', text: 'Conosci sempre usi e abiti dell’alta società e magari molti dei suoi segreti. Vantaggio a Influenza con le classi alte.', bonus: {} },
  { id: 'fearless', name: 'Impavido', en: 'Fearless', text: 'Sei immune alla condizione Spaventato. +1 Iniziativa. −1 Armatura.', bonus: { initiative: 1, armor: -1 } },
  { id: 'dumb-smart', name: 'Così stupido che a volte sono un genio', en: 'So Dumb I’m Smart Sometimes', req: 'INT 0 o negativa alla creazione', text: 'Ritira una prova legata all’INT, 1/giorno. Ritira un TS su INT fallito con vantaggio, 1/Riposo sicuro.', bonus: {} },
  { id: 'underdog', name: 'Sfavorito scaltro', en: 'Wily Underdog', req: 'FOR 0 o negativa alla creazione', text: 'Ritira un tiro di FOR fallito (attacco, TS, Potenza) usando un’altra caratteristica, 1/giorno.', bonus: {} },
  { id: 'bumblewise', name: 'Saggio per sbaglio', en: 'Bumblewise', req: 'VOL 0 o negativa alla creazione', text: 'Un risultato di 1 o meno a un tiro di VOL (TS, Natura, Percezione, Influenza, Intuito) conta come un 20 naturale.', bonus: {} },
  { id: 'accidental-acrobat', name: 'Acrobata per caso', en: 'Accidental Acrobat', req: 'DES 0 o negativa alla creazione', text: 'Quando fallisci un tiro di DES (attacco, TS, Furtività, Finezza) puoi ritirare. Se fallisci ancora, le conseguenze sono BRUTTE.', bonus: {} },
  { id: 'tradesman', name: 'Artigiano', en: 'Tradesman/Artisan', text: 'Scegli un mestiere (fornaio/cuoco, fabbro, scalpellino, tessitore, conciatore…): le prove legate al mestiere hanno vantaggio, e ne conosci i segreti.', bonus: {} },
];

export const MOTIVATIONS = [
  'Ho un debito di vita con qualcuno del gruppo.',
  'Devo un SACCO di soldi a gente molto pericolosa.',
  'Devo diventare più forte per sconfiggere chi mi ha fatto un torto.',
  'Cerco un modo per riportare in vita una persona cara (o una che odio).',
  'Sto cercando di tornare a casa.',
  'Cerco chi mi ha rubato qualcosa di prezioso.',
  'Un mago mi ha trasformato in un’altra creatura.',
  'Il dovere chiama: sono vincolato dall’onore a servire.',
  'Ero il migliore amico di… (e mi ha tradito).',
  'Mi sono perso (fisicamente? emotivamente? spiritualmente?).',
  'Voglia di viaggiare / pellegrinaggio.',
  'Il mio paese è in pericolo.',
  'Curiosità! Voglio scoprire i segreti PROFONDI.',
  'Devo dimostrare quanto valgo.',
  'Seguo una profezia.',
];

export const LANGUAGES: { name: string; who: string }[] = [
  { name: 'Comune', who: 'la maggior parte delle creature intelligenti' },
  { name: 'Nanico', who: 'nani, gnomi e giganti' },
  { name: 'Elfico', who: 'elfi, fatati e silvani' },
  { name: 'Goblin', who: 'goblin e orchi' },
  { name: 'Infernale', who: 'immondi e cultisti' },
  { name: 'Gergo dei ladri', who: 'furfanti e canaglie' },
  { name: 'Celestiale', who: 'celestiali e sacerdoti' },
  { name: 'Draconico', who: 'draghi, draconidi e coboldi' },
  { name: 'Primordiale', who: 'elementali ed esseri antichi' },
  { name: 'Lingua del profondo', who: 'chi vive nel sottosuolo' },
];

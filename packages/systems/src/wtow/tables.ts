/**
 * Tabelle della Guida del Giocatore (Contatti di Talagaad, p.56-60) e della
 * Guida del Gamemaster (Eventi di Talagaad, p.68-69).
 */

export interface ContactRow {
  min: number;
  max: number;
  text: string;
}

export interface Contact {
  name: string;
  role: string;
  archetype: string;
  rows: ContactRow[];
}

export interface ContactGroup {
  name: string;
  contacts: Contact[];
}

export const CONTACTS: ContactGroup[] = [
  {
    name: 'I Grandi e i Potenti',
    contacts: [
      {
        name: 'Karoline von Kassel',
        role: 'Baronessa di Hermsdorf, responsabile degli interessi mercantili di Talagaad',
        archetype: 'Lord',
        rows: [
          { min: 1, max: 5, text: 'Se ti dimostri degno del suo favore, potresti ereditare parte dei suoi domini' },
          { min: 6, max: 10, text: 'Avete bevuto qualcosa insieme alla vigilia di Mittherbst o in un’altra occasione e si aspetta che la tradizione continui' },
          { min: 11, max: 15, text: 'In quanto suo agente segreto, realizzi il suo volere da lontano e ti ha confidato cose che nessun altro può sapere' },
          { min: 16, max: 20, text: 'Un tempo frequentavi la sua corte ed eri un suo fidato consigliere, ma ti sei ritirato dopo uno scandalo pubblico' },
        ],
      },
      {
        name: 'Giselbert Almayda',
        role: 'Mago erudito, membro critico della Hexenguilde',
        archetype: 'Arcanista',
        rows: [
          { min: 21, max: 25, text: 'Sostiene che tu abbia un qualche collegamento mistico con gli Otto Venti, quindi ti tiene d’occhio' },
          { min: 26, max: 30, text: 'Lo hai presentato a un facoltoso finanziatore affinché potesse praticare la magia senza essere perseguitato' },
          { min: 31, max: 35, text: 'Lo aiuti a reperire oggetti arcani per approfondire la sua comprensione della magia' },
          { min: 36, max: 40, text: 'La sua magia ti ha salvato da un destino orribile durante una Geheimnisnacht o in un’altra occasione simile' },
        ],
      },
      {
        name: 'Ambrosia Alacera',
        role: 'Bibliotecaria Halfling affascinata dai saperi proibiti',
        archetype: 'Custode delle Tradizioni',
        rows: [
          { min: 41, max: 45, text: 'Ti paga per portarle informazioni, che si tratti di pettegolezzi o pergamene della Grande Biblioteca di Altdorf' },
          { min: 46, max: 50, text: 'Ti sta lentamente insegnando tutto ciò che sa affinché tu raccolga la sua eredità' },
          { min: 51, max: 55, text: 'Vi scambiate informazioni per costruire i vostri rispettivi archivi di conoscenze' },
          { min: 56, max: 60, text: 'Vi piace discutere delle più fini sottigliezze su curiosità di nicchia che sconcertano chiunque altro' },
        ],
      },
      {
        name: 'Eascylla Sereth',
        role: 'Sovrintendente dell’ambasciata degli Alti Elfi a Talagaad e subdola capospia',
        archetype: 'Cospiratore',
        rows: [
          { min: 61, max: 65, text: 'Sei in qualche modo rimasto invischiato nei suoi piani, che si tratti di praticare culti proibiti o di tramare per sostituire il Graf di Middenheim' },
          { min: 66, max: 70, text: 'Sei una sua fidata spia e vieni generosamente ricompensato per i segreti che scopri' },
          { min: 71, max: 75, text: 'Quando eri disperato, sei stato salvato dalle sue macchinazioni e quindi sei in debito con lei, cosa che ti rende utile' },
          { min: 76, max: 80, text: 'Ti sta ricattando per sostenere la sua agenda politica e, se non collabori, sarai rovinato' },
        ],
      },
      {
        name: 'Horst von Schmettoch',
        role: 'Nobile rampollo esiliato da Talabheim, canaglia e fannullone',
        archetype: 'Nobile in Disgrazia',
        rows: [
          { min: 81, max: 85, text: 'Sei uno dei pochi amici che gli restano a corte e gli serve il tuo aiuto per tornare nell’alta società' },
          { min: 86, max: 90, text: 'È un vecchio amico e metti a rischio la tua reputazione per mangiare con lui ogni Festag o in altre occasioni' },
          { min: 91, max: 95, text: 'L’hai conosciuto dopo la sua caduta in disgrazia e l’hai aiutato a rialzarsi quando ha toccato il fondo' },
          { min: 96, max: 100, text: 'Il suo disonore ti ha coinvolto per via del vostro legame e ora sei politicamente ai margini anche tu' },
        ],
      },
    ],
  },
  {
    name: 'Compagni d’Arme',
    contacts: [
      {
        name: 'Leonard Van Obelmann',
        role: 'Comandante dell’11º Reggimento di Talabheim stanziato a Talagaad',
        archetype: 'Generale',
        rows: [
          { min: 1, max: 5, text: 'Ignorare un tuo consiglio gli ha fatto perdere una battaglia cruciale, cosa che gli ricordi sempre' },
          { min: 6, max: 10, text: 'Pensa che tu sia un leader nato e spera di farti raggiungere una posizione di comando' },
          { min: 11, max: 15, text: 'Eravate avversari sul campo di battaglia, finché non ti ha offerto di cambiare schieramento' },
          { min: 16, max: 20, text: 'Hai rifiutato di eseguire i suoi ordini, ma ti ha salvato dalla forca' },
        ],
      },
      {
        name: 'Danya Klossner',
        role: 'Tenente dei Lungosguardo di Talagaad',
        archetype: 'Ufficiale',
        rows: [
          { min: 21, max: 25, text: 'Sei il suo fido vice, gli offri consiglio ed esegui i suoi ordini' },
          { min: 26, max: 30, text: 'Gli hai salvato la vita in battaglia e ti ha promesso di ripagare il debito' },
          { min: 31, max: 35, text: 'Avete passato insieme molte serate, mettendo da parte i gradi, magari davanti a un’ottima Bugman o alla Talabec più scadente' },
          { min: 36, max: 40, text: 'Sfidi costantemente la sua autorità, ma ti rispetta' },
        ],
      },
      {
        name: 'Manfreda Skovgaard',
        role: 'Sacerdotessa Guerriera di Ulric, disertrice di Middenheim',
        archetype: 'Veterano',
        rows: [
          { min: 41, max: 45, text: 'Avete collaborato per sconfiggere un nemico comune' },
          { min: 46, max: 50, text: 'Pensa che tu abbia il potenziale di seguire le sue orme' },
          { min: 51, max: 55, text: 'Avete legato grazie a un comune disprezzo per le regole inutili e la pignoleria di ufficiali codardi' },
          { min: 56, max: 60, text: 'Vi scambiate storie di successi vecchi e nuovi, cercando sempre di superarvi a vicenda' },
        ],
      },
      {
        name: 'Cox Contafrottole',
        role: 'Allegra canaglia Halfling, una leggenda locale con conoscenze nella criminalità',
        archetype: 'Esploratore',
        rows: [
          { min: 61, max: 65, text: 'Ti sei cacciato e cavato fuori dai guai insieme a lui una miriade di volte' },
          { min: 66, max: 70, text: 'Ti ha salvato, magari dal fitto della Drakwald o dalle spettrali Colline Brulle, e te lo ricorda continuamente' },
          { min: 71, max: 75, text: 'Ti racconta storie affascinanti sul mondo fuori da Talagaad e alcune sono perfino vere' },
          { min: 76, max: 80, text: 'Ti ha visto fare qualcosa di compromettente, ma finora ha tenuto la bocca chiusa' },
        ],
      },
      {
        name: 'Rosamunde Nemevich',
        role: 'Disertrice impoverita, in precedenza arruolata nelle Libere Compagnie',
        archetype: 'Vecchio Soldato',
        rows: [
          { min: 81, max: 85, text: 'Ti racconta strazianti storie della guerra che ha combattuto ed è felice della tua compagnia' },
          { min: 86, max: 90, text: 'Rispetti le sue imprese e lei in cambio rispetta te, aiutandoti quando può' },
          { min: 91, max: 95, text: 'Avete legato affrontando lo stesso nemico (Orchi, Predoni del Caos o soldati provinciali nemici)' },
          { min: 96, max: 100, text: 'Hai detto qualcosa che l’ha offesa e stai cercando di rimediare' },
        ],
      },
    ],
  },
  {
    name: 'Il Popolino',
    contacts: [
      {
        name: 'Yury Kagan',
        role: 'Autorevole anziano Kislevita, rispettato da molti',
        archetype: 'Anziano',
        rows: [
          { min: 1, max: 5, text: 'Ogni Backertag (o in altre occasioni) gli porti una pagnotta fresca e vi scambiate storie e pettegolezzi prima di salutarvi' },
          { min: 6, max: 10, text: 'La sua saggezza ti aiuta a rispondere a domande che non ti eri mai nemmeno posto' },
          { min: 11, max: 15, text: 'Ti osserva da quando hai memoria e non sei sicuro del motivo' },
          { min: 16, max: 20, text: 'Tollera la tua sfacciataggine perché rivede in te se stesso da giovane' },
        ],
      },
      {
        name: 'Amelinda Hertwier',
        role: 'Sacerdotessa di Taal intenta a unire Talagaad contro il nemico più grande',
        archetype: 'Predicatore',
        rows: [
          { min: 21, max: 25, text: 'Le hai confessato i tuoi peccati più turpi e ti ha assolto' },
          { min: 26, max: 30, text: 'Prima che trovasse la fede, avete compiuto insieme bravate di ogni tipo' },
          { min: 31, max: 35, text: 'Siete spesso in disaccordo su questioni spirituali, ma trovate le vostre discussioni stimolanti' },
          { min: 36, max: 40, text: 'Ha benedetto te o la tua casa durante Geheimnisnacht o in altre occasioni infauste' },
        ],
      },
      {
        name: 'Tordi Trondottir',
        role: 'Mastra artigiana Nana Imperiale, sempre attenta a ogni vicenda sospetta',
        archetype: 'Fabbro',
        rows: [
          { min: 41, max: 45, text: 'Ha realizzato qualcosa per te (una lama robusta, un anello squisito, ecc.) e sei ancora in debito con lei' },
          { min: 46, max: 50, text: 'Le vendi abitualmente qualcosa, che si tratti di ferro di qualità, brandy di Kemperbad o del tuo lavoro' },
          { min: 51, max: 55, text: 'Ti ha preso come apprendista. Non ha funzionato, ma vi siete lasciati in buoni rapporti' },
          { min: 56, max: 60, text: 'Hai involontariamente screditato il suo lavoro e stai cercando di farti perdonare' },
        ],
      },
      {
        name: 'Lotti Babkina',
        role: 'Socievole e accogliente proprietaria della locanda “Il Letto del Fiume”',
        archetype: 'Proprietario',
        rows: [
          { min: 61, max: 65, text: 'Hai salvato la sua locanda da un’incursione di Goblin o da un incendio e ti accoglie sempre a braccia aperte' },
          { min: 66, max: 70, text: 'Una volta sei rimasto bloccato nella sua locanda, magari a causa del maltempo o di un assalto degli Uominibestia' },
          { min: 71, max: 75, text: 'Ha bisogno del tuo aiuto per tenere a galla la sua attività, altrimenti fallirà' },
          { min: 76, max: 80, text: 'Sei in debito con lei per i problemi che hai causato durante la tua ultima visita' },
        ],
      },
      {
        name: 'Olena Genezzo',
        role: 'Apotecaria con poteri al di là della sua comprensione',
        archetype: 'Guaritore',
        rows: [
          { min: 81, max: 85, text: 'Qualunque cosa ti abbia somministrato, forse una dose di schlafenktraut o un pizzico di tarrabeth, ti ha salvato la vita' },
          { min: 86, max: 90, text: 'Ti procura un trattamento efficace per un disturbo cronico' },
          { min: 91, max: 95, text: 'Non è riuscita a salvare un tuo caro, ma sai che ha fatto del suo meglio' },
          { min: 96, max: 100, text: 'Ti ha diagnosticato un male incurabile che, in teoria, un giorno ti ucciderà' },
        ],
      },
    ],
  },
  {
    name: 'Fannulloni e Vagabondi',
    contacts: [
      {
        name: 'Jaime de Sabatin',
        role: 'Tombarolo, antiquario e spadaccino Bretonniano',
        archetype: 'Girovago',
        rows: [
          { min: 1, max: 5, text: 'Segui la sua carriera da qualche tempo e trai ispirazione dalle sue peripezie' },
          { min: 6, max: 10, text: 'Vi scambiate informazioni su dove trovare opportunità eccitanti' },
          { min: 11, max: 15, text: 'La vostra precedente collaborazione è culminata in un tradimento, ma non l’avete presa sul personale' },
          { min: 16, max: 20, text: 'Magari a tua insaputa, ma l’hai aiutato a rubare qualcosa di prezioso, come delle pergamene Khemriane o l’anello con il sigillo del Duca' },
        ],
      },
      {
        name: 'Wyldaroc Passosvelto',
        role: 'Spensierato bardo Elfo Silvano, che disdegna il proprio dovere',
        archetype: 'Cantastorie',
        rows: [
          { min: 21, max: 25, text: 'Le sue notizie ti tengono in contatto con una persona amata lontana' },
          { min: 26, max: 30, text: 'Sei la prima persona a cui racconta fatti scandalosi appena li viene a sapere' },
          { min: 31, max: 35, text: 'Ripete ogni tua parola in lungo e in largo, cosa che sai di poter usare a tuo vantaggio' },
          { min: 36, max: 40, text: 'Ha scoperto qualcosa di imbarazzante su di te e non ha aperto bocca' },
        ],
      },
      {
        name: 'Malko Matasca',
        role: 'Rinomato druido tormentato da visioni di oscuri futuri',
        archetype: 'Mistico',
        rows: [
          { min: 41, max: 45, text: 'Quando ti senti perso, ti offre la sua guida e ti mette sulla strada giusta' },
          { min: 46, max: 50, text: 'Ogni Geheimisnacht ha una visione su di te e sta cercando di capire cosa significhi' },
          { min: 51, max: 55, text: 'Eravate amici fin da prima che iniziassi a comprendere i suoi poteri' },
          { min: 56, max: 60, text: 'Hai combattuto al suo fianco e hai visto cosa accade quando perde le staffe' },
        ],
      },
      {
        name: 'Gruginn Dokrilson',
        role: 'Intraprendente Nano Imperiale che commercia beni di dubbia provenienza',
        archetype: 'Contrabbandiere',
        rows: [
          { min: 61, max: 65, text: 'Ha girato il Vecchio Mondo (lungo il Talabec od oltre i Monti Grigi) per trovare ciò che ti serve, ma a un certo prezzo, ovviamente' },
          { min: 66, max: 70, text: 'Gli fai delle soffiate su dove trovare della “merce” in cambio di qualche favore' },
          { min: 71, max: 75, text: 'Gli hai sgraffignato qualcosa che ti aveva rubato… e alla fine avete raggiunto un compromesso' },
          { min: 76, max: 80, text: 'Una volta facevate colpi insieme' },
        ],
      },
      {
        name: 'Valda Kracht',
        role: 'Devota di Sigmar che diffonde clandestinamente la sua fede proibita',
        archetype: 'Eretico',
        rows: [
          { min: 81, max: 85, text: 'Condividi la sua fede eretica più di quanto ammetteresti pubblicamente' },
          { min: 86, max: 90, text: 'La sua fede ti sembra strana, ma non pensi che meriti di morire per essa, quindi le offri rifugio quando puoi' },
          { min: 91, max: 95, text: 'Non importa che siano fanatici di Sigmar, Ahalt il Bevitore o dei ancora più strani, pensi comunque di poterli salvare tutti' },
          { min: 96, max: 100, text: 'Ti aiuta perché è convinta che un giorno ti unirai a lei… o morirai' },
        ],
      },
    ],
  },
];

/** d100 on a group's table: the contact and how you know them. */
export function contactFor(group: ContactGroup, d100: number): { contact: Contact; row: ContactRow } {
  for (const contact of group.contacts) for (const row of contact.rows) if (d100 >= row.min && d100 <= row.max) return { contact, row };
  const contact = group.contacts.at(-1)!;
  return { contact, row: contact.rows.at(-1)! };
}

export interface TalagaadEvent {
  min: number;
  max: number;
  text: string;
  /** i Contatti coinvolti */
  contacts: string[];
}

export const TALAGAAD_EVENTS: TalagaadEvent[] = [
  { min: 1, max: 4, contacts: ['Yury', 'Gruginn'], text: 'Il Pedaggio per passare dal Viadotto del Mago è aumentato ancora, presumibilmente per mantenere il millenario ponte Nanico. I Nani si offendono nel sentire sminuita la grande opera dei loro antenati, i mercanti si lamentano che la tassa serva solo ad arricchire le tasche dei nobili e la gente comune parla di rivolta. Yury, che chiede esenzioni per i residenti locali, e Gruginn, che accoglie con favore l’aumento del contrabbando che ne deriva.' },
  { min: 5, max: 8, contacts: ['Ambrosia', 'Rosamunde'], text: 'Carovane mercantili che trasportano acciaio, cibo e altre merci sono state attaccate lungo la Vecchia Strada della Foresta. Alcuni parlano di banditi, ma a Talagaad circolano voci di Uominibestia sul piede di guerra. I mercanti stanno assoldando scorte tra chiunque sappia impugnare una spada. Ambrosia vuole partire per dissezionare un Uomobestia, mentre Rosamunde, a corto di soldi, valuta di riprendere in mano la spada.' },
  { min: 9, max: 13, contacts: ['Karoline', 'Amelinda'], text: 'Viene dichiarato il Taalentag, una festa in onore di Taal senza data fissa, che si sposta nel calendario con l’agilità di uno dei cervi di Taal. Molte attività si interrompono, mentre le strade di Talagaad si riempiono di gente festante e la guardia cittadina è occupata a mantenere l’ordine. Karoline dona birra e cibo per ottenere supporto. Amelinda conduce una solenne cerimonia nel mezzo dei festeggiamenti.' },
  { min: 14, max: 18, contacts: ['Yury', 'Manfreda'], text: 'Diplomatici da Middenheim, guidati dall’Ambasciatore Gunnar Brugal, fanno visita a Talabheim in veste ufficiale. Il suo seguito di sottoposti lo attende a Talagaad, dove lasciano offerte sia a Taal che al santuario di Ulric a Wolfenstag, attirando l’attenzione di molti. Yury non si fida di questi “diplomatici” insolitamente bene armati, mentre Manfreda riconosce un vecchio nemico e cerca di saldare un debito.' },
  { min: 19, max: 23, contacts: ['Olena', 'Wyldaroc'], text: 'Il Vaiolo del Conciatore dilaga per Talagaad, lasciando quasi una persona su quattro troppo malata per continuare a lavorare. I sani (o chi riesce a nascondere i bubboni) racimolano qualche penny in più, ma molti temono di contrarre la malattia e un velo di paura scende sulla città. Olena rischia il contagio per assistere i malati. Wyldaroc attira sospetti, poiché gli Elfi Silvani ne sembrano invece immuni.' },
  { min: 24, max: 27, contacts: ['Gruginn', 'Danya'], text: 'Una partita di ottime armi da fuoco da Nuln è sparita da uno dei magazzini del porto. I manifesti di carico sembrano manomessi, suggerendo un furto. Le armi erano destinate all’11° Talabheim, ora furioso per la perdita. Gruginn cerca prove della sua innocenza, mentre Danya ispeziona i soliti sospetti, prima che i soldati diventino violenti.' },
  { min: 28, max: 31, contacts: ['Ambrosia', 'Jaime'], text: 'Un assassino viene impiccato pubblicamente, ma pende per diversi minuti, urlando in una lingua sconosciuta finché non viene silenziato dall’alabarda di una guardia. Gli abitanti, che di solito apprezzano una bella esecuzione, sono sconvolti dall’esperienza. Ambrosia è certa di aver già sentito quella lingua, mentre Jaime si chiede perché il morto indossasse un amuleto Khemriano.' },
  { min: 32, max: 35, contacts: ['Malko', 'Manfreda'], text: 'Un prete è giunto dal Tempio di Ulric a Middenheim per fare proseliti tra la gente comune. Molti fedeli trovano i suoi ardenti sermoni entusiasmanti e la piazza è spesso piena di gente. Malko trova un lupo morto con i resti di un corvo tra le fauci, sicuramente un cattivo presagio, mentre Manfreda guarda il prete con sospetto.' },
  { min: 36, max: 39, contacts: ['Tordi', 'Valda'], text: 'Piogge torrenziali causano un drastico innalzamento del livello del Talabec, che minaccia di inondare la città se supera le sponde e gli argini. Non è un evento insolito, ma disturba comunque la vita di Talagaad, dato che i ricchi si ritirano nelle zone più alte e i poveri lottano per rimanere asciutti. Tordi parla del bisogno di un argine per prevenire le inondazioni. Valda è preoccupata che Sigmar stia dando voce al suo malcontento e pianifichi qualcosa di estremo per redimere la città.' },
  { min: 40, max: 43, contacts: ['Lotti', 'Jaime'], text: 'Un incendio illumina le strade notturne di Talagaad, radendo al suolo metà della locanda Letto del Fiume. Diversi rimangono feriti nel tentativo di spegnere le fiamme o di razziare le scorte di birra e liquori dell’edificio. Si dice che l’incendio sia stato un tentativo di uccidere uno degli ospiti. Lotti è devastata ma determinata a ricostruire tutto, mentre Jaime crede di essere il bersaglio dell’incendio.' },
  { min: 44, max: 47, contacts: ['Yury', 'Tordi'], text: 'Un Nano e un Ogre hanno formato una strana amicizia, iniziando a frequentare ogni sera una locanda diversa, dove il Nano prosciuga le riserve di birra e l’Ogre svuota le dispense. Molti li lasciano in pace, ma i due accolgono chiunque voglia unirsi a loro. Yury tiene d’occhio la coppia, perché si dice siano famosi fuorilegge, mentre Tordi cerca di bere più del Nano.' },
  { min: 48, max: 51, contacts: ['Olena', 'Valda'], text: 'Il corpo bruciato di una sospetta strega viene trovato legato a un palo fuori da Talagaad. Nessuno sa chi sia il responsabile, ma la gente è veloce a trovare un colpevole, additando alcuni fanatici Sigmariti nascosti e altre streghe. Olena teme di essere la prossima a finire sulla pira. Valda festeggia, ma si chiede se la vittima fosse davvero una strega.' },
  { min: 52, max: 55, contacts: ['Eascylla', 'Van Obelmann'], text: 'Un dignitario degli Alti Elfi di Ulthuan appena giunto subisce un tentativo di omicidio nel momento in cui mette piede sul molo. Il corpo dell’assassino viene portato via dal Talabec, con una lama di acciaio Elfico piantata nel cuore, ma il porto deve ancora placarsi. Eascylla teme che i suoi superiori vedano l’evento come una sua mancanza, mentre Van Obelmann richiede controlli più rigidi, sotto il suo controllo.' },
  { min: 56, max: 60, contacts: ['Horst', 'Giselbert'], text: 'Un amato porcaro muore di vecchiaia nella sua misera fattoria fuori da Talagaad. Mezza città partecipa al funerale, durante il quale alcuni lontani familiari litigano su chi debba ereditare la terra, trasformando il solenne evento in una rissa fangosa di cui si parla per settimane. Horst si offre da mediatore per la disputa, spingendo molti a credere che abbia altri motivi. Giselbert si offre di comprare la fattoria, ma la gente è preoccupata di cosa farebbe un Mago con tutti quei maiali.' },
  { min: 61, max: 65, contacts: ['Cox', 'Amelinda'], text: 'Barche da pesca sul Talabec catturano il doppio delle solite prede, ritrovandosi con le reti piene fino a scoppiare. La gente è contenta, ma nessuno sa spiegare questa improvvisa abbondanza. Vengono fatte offerte a Taal e Rhya in ringraziamento. Altri lanciano sale nel fiume per Manann, una vista rara a Talagaad. Cox viaggia fino a Küsel, dove trova del pesce che marcisce sulle sponde del fiume, mentre Amelinda incoraggia le offerte agli dei.' },
  { min: 66, max: 70, contacts: ['Valda', 'Karoline'], text: 'Un vecchio prete di Morr occupa la piazza centrale, vomitando furiose condanne verso tutti i passanti, dopo aver trovato dei cadaveri scaricati fuori città senza una degna sepoltura. Avvisa che la negligenza verso i morti porta gravi conseguenze, ma i più lo ignorano. Valda pensa che nessuno dovrebbe essere così noncurante verso un uomo di fede, anche se non è un Sigmarita. Karoline vuole che il prete se ne vada.' },
  { min: 71, max: 75, contacts: ['Wyldaroc', 'Tordi'], text: 'Il conflitto tra i Feuerbach di Talabheim e il Duca Ludwig XII porta alla chiusura della Via del Mago per un giorno intero e ogni attività ai moli è vietata. L\'aria di festa si diffonde verso l’intera città, dove gran parte della gente smette di lavorare fino a sera. Wyldaroc allieta una folla rapita con racconti dei suoi viaggi. Tordi continua a lavorare, lamentandosi della “pigrizia degli ometti” con chiunque.' },
  { min: 76, max: 80, contacts: ['Rosamunde', 'Cox'], text: 'Dei rifugiati arrivano a Talagaad in fuga da razziatori Orchi e Goblin della Tribù Okki Rotzi. Qualcuno è preoccupato che i Pelleverde attacchino la città, mentre altri pensano che i racconti siano esagerati e ridono all’idea che un qualsiasi Goblin possa scalare le mura di Talagaad. Rosamunde spaventa una locanda con racconti di battaglie contro gli Orchi. Cox ascolta i rifugiati. Per i giorni successivi, è di umore piuttosto cupo.' },
  { min: 81, max: 85, contacts: ['Horst', 'Karoline'], text: 'I mercanti locali si dividono in fazioni rivali. Una vuole accordarsi per obbligare i nobili di Talabheim ad abbassare le tasse lungo la Via del Mago, mentre l\'altra cerca di fare pressione al Duca affinché riduca le tariffe applicate ai suoi moli a Sponda Fredda. Ben poco viene deciso. Horst cerca di limitare i mercanti per ottenere il favore di Talabheim. Karoline preferirebbe imporre le proprie tasse.' },
  { min: 86, max: 89, contacts: ['Lotti', 'Giselbert'], text: 'In città scoppia un incendio, che danneggia o distrugge molti edifici prima di essere spento. La causa è sconosciuta, ma brucia con insolita ferocia. Le fiamme ardono di strani colori ed emettono un fetore nauseante. Lotti offre le stanze della sua locanda come rifugio e la sua ospitalità fa sì che venga derubata. Giselbert sospetta un suo collega membro dell’Hexenguilde.' },
  { min: 90, max: 94, contacts: ['Gruginn', 'Danya'], text: 'Talabheim assegna un nuovo magistrato, Wolfea Swartzbert, a vigilare sulle leggi di Talagaad. Alcuni sono favorevoli al cambiamento, mentre altri credono che ciò minacci la già scarsa autonomia della città. Swartzbert sembra rigida e praticamente incorruttibile, una stranezza a Talagaad. Gruginn cerca nuove vie di contrabbando per ingannare il nuovo magistrato. Danya teme che Swartzbert sconvolgerà l’attuale distensione dei rapporti con i piccoli criminali della città.' },
  { min: 95, max: 99, contacts: ['Eascylla', 'Malko'], text: 'Un piccolo contingente di nobili da Talabheim cavalca per le strade di Talagaad distribuendo cibo e vestiti ai poveri. Seppur bene accetti, c’è chi si fa domande sulle loro motivazioni e chi è trovato a indossare quegli abiti dagli strani colori viene etichettato come “arraffastoffa”. Eascylla è sospettosa dei nobili. Malko evita Talagaad finché questi se ne vanno, insistendo di aver avuto visioni rovinose su di loro.' },
  { min: 100, max: 100, contacts: ['Danya', 'Van Obelmann'], text: 'L\'indignazione raggiunge il culmine quando l\'11° Talabheim va oltre la propria autorità mentre seda i disordini pubblici. Un’altra rivolta è imminente e lo spargimento di sangue è assicurato. È solo questione di dove e quando scoppierà. Danya cerca di alleggerire la tensione tra i gruppi. Van Obelmann crede che una dimostrazione di forza sistemerà le cose.' },
];

export const eventFor = (d100: number): TalagaadEvent => TALAGAAD_EVENTS.find((e) => d100 >= e.min && d100 <= e.max) ?? TALAGAAD_EVENTS[0]!;


import type { CharId, Status } from './data';

/* ------------------------------------------------------------------ Talenti */

export interface Talent {
  id: string;
  name: string;
  cost: number;
  /** requisiti in breve */
  req: string;
  /** caratteristica minima richiesta, per il controllo automatico */
  min?: Partial<Record<CharId, number>>;
  text: string;
  /** si può prendere più volte (Mago, Fede) */
  ranks?: number;
  /** solo alla creazione */
  creationOnly?: boolean;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const t = (name: string, cost: number, req: string, text: string, extra: Partial<Talent> = {}): Talent => ({ id: slug(name), name, cost, req, text, ...extra });

export const TALENTS: Talent[] = [
  t('Acrobatico', 3, 'Agilità 4+', 'I nemici non ti bloccano il movimento, nemmeno quando Arretri; dimezzi il grado di Pericolo delle cadute.', { min: { ag: 4 } }),
  t('Analisi Attenta', 3, 'Iniziativa 4+', 'Analizzando qualcuno puoi chiedere se dice la verità, cosa prova, cosa desidera o teme, da chi prende o a chi dà ordini.', { min: { i: 4 } }),
  t('Attacco Irruento', 3, 'Forza 4+', 'Se non sei Barcollante puoi rendere Gloriosa la prossima Prova di Mischia, diventando Barcollante prima di tirare.', { min: { f: 4 } }),
  t('Avanguardia', 3, 'Agilità 4+', 'Quando ti Muovi Silenziosamente o con Cautela puoi anche spostarti in una Zona adiacente.', { min: { ag: 4 } }),
  t('Barbalunga', 3, 'Nano, solo alla creazione', '+1d per rimuovere una Condizione da te o da un alleato; i Nani si aspettano da te saggezza e tradizione (modificatori come per lo Status).', { creationOnly: true }),
  t('Benedizione della Dama', 3, 'Bretonniano, Alta Società, Codice d’Onore', 'Pregando a inizio scontro, una volta puoi trasformare una Ferita in Colpo di Striscio; la perdi se diventi Atterrito o violi il Codice.'),
  t('Braccatore', 4, 'Agilità 5+', 'Una volta per round, se un nemico Arretra entrando o uscendo dalla tua Zona, lo raggiungi e lo attacchi in mischia (non se Barcollante o già ingaggiato).', { min: { ag: 5 } }),
  t('Chirurgo da Campo', 3, 'Sapere Anatomia', 'Medicando una Ferita con effetto persistente, una Prova di Memoria lo annulla per la battaglia; puoi operare ovunque (Destrezza prolungata, 8 successi).'),
  t('Codice d’Onore', 3, 'Nessuno', 'Una volta per sessione rendi Gloriosa una Prova per onorare il tuo giuramento, o spendi Fato (invece di bruciarlo) per un Successo Assoluto.'),
  t('Colpo Ampio', 4, 'Forza 5+', 'Quando ferisci con un’arma a due mani, gli altri nemici a Distanza Ravvicinata diventano Barcollanti.', { min: { f: 5 } }),
  t('Colpo Sbilanciante', 4, 'Forza 5+', 'Quando infliggi Barcollante con Muscoli puoi fare subito un attacco di mischia gratuito sullo stesso bersaglio.', { min: { f: 5 } }),
  t('Conducente Provetto', 3, 'Nessuno', 'Manovrando, una Prova di Atletica o Conduzione riuscita toglie Barcollante a chi è in sella o a bordo.'),
  t('Contrattacco', 4, 'Abilità di Combattimento 5+', 'Una volta per round, se ti opponi con successo in Difesa a un attacco di mischia, l’attaccante sceglie: Arretrare, Prono o una Ferita.', { min: { ac: 5 } }),
  t('Controincantesimo', 3, 'Talento Mago', 'Una volta per round ti opponi con Volontà a una Prova di Magia entro Distanza Lunga: ogni successo toglie un successo al nemico. Puoi anche dissolvere incantesimi attivi.'),
  t('Determinato', 3, 'Ragione 4+', 'Quando Arretri puoi fermarti entro Distanza Corta; Arretrando tra i nemici diventi Atterrito solo se finisci a Distanza Ravvicinata da uno di loro.', { min: { ra: 4 } }),
  t('Famiglio', 3, 'Talento Mago', 'Hai un famiglio magico che resta entro Distanza Lunga e parla solo con te.'),
  t('Fede', 4, 'Imperiale (Umano)', 'Primo grado: Favore del dio; secondo: Preghiere; terzo: un Miracolo. Ogni grado richiede una prova di devozione.', { ranks: 3 }),
  t('Flagello delle Armature', 3, 'Nessuno', 'Con armi che ignorano l’armatura o hanno danno bonus contro i corazzati, ogni colpo riduce di 1 la Resilienza del bersaglio (non sotto la Resistenza).'),
  t('Fortunato', 4, 'Nessuno', 'La prima spesa di Fato di ogni sessione è gratuita, anche a Fato 0; i giochi di fortuna sono Gloriosi.'),
  t('Forza Poderosa', 3, 'Forza 4+', 'Con un’arma a due mani ignori le sue penalità alla Mischia.', { min: { f: 4 } }),
  t('Fratelli d’Arme', 3, 'Socialità 4+', 'Quando Aiuti un alleato, uno di voi due rimuove Barcollante.', { min: { soc: 4 } }),
  t('Fuga Simulata', 2, 'Nessuno', 'Quando ti opponi con successo a un attacco puoi scegliere di Arretrare.'),
  t('Gagliardo', 3, 'Resistenza 4+', 'Tiri un dado in meno sulla tabella delle Ferite (minimo 1).', { min: { r: 4 } }),
  t('Garante', 3, 'Status Argento o Oro, Socialità 4+', 'Presentando un alleato, il PNG lo giudica secondo il tuo Status (e le sue azioni ricadono su di te).', { min: { soc: 4 } }),
  t('Guarigione Rapida', 4, 'Resistenza 5+', 'Riprendendo Fiato guarisci una Ferita che richiederebbe una Notte di Riposo; una volta per Intermezzo.', { min: { r: 5 } }),
  t('Incantatore di Serpenti', 3, 'Nessuno', 'Una creatura che hai Distratto la contrasti con la stessa Abilità usata; contro bestie e mostri la Prova è Gloriosa.'),
  t('Incrollabile', 3, 'Talento Determinato', 'Sei immune ad Atterrito.'),
  t('Lancio Fulmineo', 4, 'AC 4+, AB 4+', 'Caricando puoi attaccare con un’arma da lancio e poi, come seconda Azione, in mischia.', { min: { ac: 4, ab: 4 } }),
  t('Lignaggio Segreto', 3, 'Solo alla creazione', 'Hai un’origine segreta: rivelarla crea aspettative (positive o negative) nelle Interazioni Sociali.', { creationOnly: true }),
  t('Malevolista', 3, 'Elfo Silvano', 'Percepisci i Malevoli entro Distanza Media e puoi convincerli ad aiutarti, a caro prezzo.'),
  t('Mago', 4, 'Non Nano né Halfling, un Sapere Magico', 'Lanci incantesimi improvvisati, memorizzati o formalizzati. Fino a 4 gradi: il grado è il Livello da Mago.', { ranks: 4 }),
  t('Mantenere la Posizione!', 3, 'Socialità 4+', 'Recuperando, con una Prova di Comando togli Barcollante a un alleato per successo entro Distanza Media.', { min: { soc: 4 } }),
  t('Minuto', 2, 'Solo alla creazione', 'Vinci i pareggi in Prove di Agilità contrapposte ma li perdi in quelle di Forza; ti infili ovunque e ti nascondi tra le gambe della gente; un’arma a due mani ti rende Ostacolato.', { creationOnly: true }),
  t('Mira Accurata', 3, 'Ragione 4+', 'Quando completi l’Azione Mirare puoi togliere Barcollante.', { min: { ra: 4 } }),
  t('Musico da Battaglia', 3, 'Attrezzatura da musicista', 'Suonando con Comando ispiri un alleato per successo entro Distanza Media: vince i pareggi in difesa fino al tuo prossimo turno.'),
  t('Odio', 3, 'Nessuno', 'Scegli un gruppo: +1d in mischia contro di loro, ma quando li vedi sei Distratto.'),
  t('Poliedrico', 2, 'Ragione 4+', 'Se più Saperi ti darebbero dadi bonus, puoi rinunciarvi per rendere la Prova Gloriosa.', { min: { ra: 4 } }),
  t('Postura Difensiva', 2, 'Abilità di Combattimento 3+', 'Quando respingi in Difesa un attacco di mischia puoi toglierti Barcollante invece di infliggerlo.', { min: { ac: 3 } }),
  t('Provocatore', 4, 'Nessuno', 'Un nemico che hai Distratto, se attacca qualcun altro, fa una Prova Tetra.'),
  t('Ranghi Serrati', 2, 'Nessuno', 'Con una lancia o un’arma da Distanza Corta, gli alleati nella tua Zona caricati hanno +1d a opporsi.'),
  t('Resistente alla Corruzione', 4, 'Nessuno', 'Le Prove di Volontà contro il Caos sono Gloriose.'),
  t('Resistenza Magica', 3, 'Nessuno', 'Gli incantesimi che ti colpiscono hanno Potenza -1 (a 0 non hanno effetto).'),
  t('Resistere e Tirare', 3, 'Iniziativa 4+', 'Se ti carica un nemico che hai Mirato, puoi colpirlo per primo con Tiro usando i dadi di Mirare.', { min: { i: 4 } }),
  t('Ricarica Rapida', 3, 'Abilità Balistica 4+', 'Dopo una ricarica riuscita puoi Mirare o Attaccare come seconda Azione (non se Barcollante o se ti sei mosso).', { min: { ab: 4 } }),
  t('Riflessi Fulminei', 3, 'Iniziativa 5+', 'Puoi sempre opporti con Atletica se non sei Indifeso; in battaglia agisci prima dei nemici, anche in un’imboscata.', { min: { i: 5 } }),
  t('Risalire in Sella', 2, 'Agilità 4+', 'Disarcionato, la cavalcatura resta vicina e ti rialzi e rimonti con una sola Azione.', { min: { ag: 4 } }),
  t('Sete di Conoscenza', 2, 'Ragione 4+', 'Ignori le penalità di Esausto e Distratto per scoprire Indizi; trovando una Traccia le rimuovi.', { min: { ra: 4 } }),
  t('Sincronia Totale', 3, 'Nessuno', 'Attaccando in sella, la cavalcatura può fare un secondo attacco su un altro bersaglio.'),
  t('Spaventoso', 4, 'Nessuno', 'Chi fai Arretrare con Mischia o Muscoli diventa Atterrito.'),
  t('Stomaco di Ferro', 2, 'Non Elfo', 'Non ti ammali per cibo e acqua cattivi; le Prove contro veleni ingeriti e alcol sono Gloriose.'),
  t('Tocco dei Venti', 2, 'Non Nano né Halfling', 'Percepisci la magia e identifichi oggetti magici al tocco; lanci incantesimi improvvisati Minori di un Sapere Magico; Mago costa 1 PE in meno.'),
  t('Travestimento Rapido', 3, 'Set per la cura personale', 'Con una Prova di Destrezza e un minuto diventi irriconoscibile e ti spacci per un altro Status.'),
  t('Udito Eccezionale', 2, 'Iniziativa 4+', 'Senti sussurri e suoni nascosti; da Accecato non hai penalità in mischia o a difenderti.', { min: { i: 4 } }),
  t('Ugola d’Oro', 2, 'Socialità 4+', 'Imiti qualsiasi suono o voce; pratichi Musica senza strumenti.', { min: { soc: 4 } }),
  t('Valore delle Ere', 3, 'Alto Elfo', 'Arretrando tra i nemici dove c’è un alleato non diventi Atterrito; da Atterrito puoi Recuperare in una Zona nemica con un alleato.'),
  t('Vista Acuta', 2, 'Iniziativa 4+', 'Noti minacce lontane, dettagli minuti e falsi; leggi le labbra.', { min: { i: 4 } }),
  t('Vista Notturna', 2, 'Nessuno', 'Vedi al buio fino a Distanza Lunga; al buio contro chi non ti vede +1d e chi ferisci o fai Arretrare diventa Atterrito.'),
  t('Voto del Graal', 4, 'Voto della Cerca', 'Immune ad Atterrito, attacchi magici, Benedizione della Dama sempre attiva, caratteristiche massime +2.'),
  t('Voto della Cerca', 3, 'Benedizione della Dama', 'Immune a Distratto; puoi togliere Atterrito spendendo Fato o con Codice d’Onore.'),
];

export const talentByName = (name: string): Talent | undefined => {
  const id = slug(name.replace(/^Resisti e Tira$/, 'Resistere e Tirare'));
  return TALENTS.find((x) => x.id === id);
};

/* ------------------------------------------------------------------- Saperi */

export interface LoreGroup {
  id: string;
  name: string;
  text: string;
  items: string[];
}

export const LORE_GROUPS: LoreGroup[] = [
  { id: 'accademici', name: 'Accademici', text: 'Si studiano sui libri, meglio con un mentore.', items: ['Anatomia', 'Contabilità', 'Giurisprudenza', 'Leggere e Scrivere', 'Storia', 'Zoologia'] },
  { id: 'ambientali', name: 'Ambientali', text: 'Sopravvivere e muoversi in un tipo di ambiente, ovunque si trovi.', items: ['Boschi', 'Corsi d’Acqua', 'Mari', 'Montagne', 'Sottosuolo'] },
  {
    id: 'culturali', name: 'Culturali', text: 'Usanze, lingua e persone di un luogo o di un gruppo.',
    items: ['Alta Società', 'Città (…)', 'Culto (…)', 'Esercito', 'Impero', 'Karak Naniche', 'Mondo Criminale', 'Provincia (…)', 'Regni degli Alti Elfi', 'Regni degli Elfi Silvani', 'Regno di Bretonnia'],
  },
  { id: 'magici', name: 'Magici', text: 'Servono per il Talento Mago; impararne uno nuovo costa 4 successi in più per ogni altro Sapere Magico già noto.', items: ['Magia da Battaglia', 'Elementalismo', 'Illusione', 'Necromanzia'] },
  {
    id: 'nemici', name: 'Nemici', text: 'Conoscere un nemico; i Saperi Ammazzamostri danno +1d agli attacchi contro quel mostro.',
    items: ['Ammazzamostri (…)', 'Branchi Bercianti', 'Guerrieri del Caos', 'Nonmorti', 'Tribù di Orchi e Goblin'],
  },
  { id: 'professionali', name: 'Professionali', text: 'Un mestiere: servono i ferri del mestiere adatti.', items: ['Agricoltura', 'Armi da Fuoco', 'Arte', 'Cucina', 'Forgiatura', 'Ingegneria', 'Misture', 'Musica', 'Tessitura'] },
];

export const ALL_LORE = LORE_GROUPS.flatMap((g) => g.items);

/* ---------------------------------------------------------------- Equipaggiamento */

export type WeaponKind = 'mischia' | 'distanza' | 'lancio';

export interface Weapon {
  id: string;
  name: string;
  kind: WeaponKind;
  status: Status | null;
  /** portata massima (mischia) o ottimale (distanza, lancio) */
  range: string;
  /** "F", "F+2", "F-1", "4" … oppure null se non fa danni */
  damage: string | null;
  hands: 1 | 2;
  traits: string;
  ignoresArmour?: boolean;
  /** successi per ricaricare */
  reload?: number;
  /** abilità con cui si attacca (Mani Nude e Tirapugni: Muscoli) */
  skill?: 'mischia' | 'muscoli' | 'tiro' | 'lancio';
  /** dadi aggiunti o tolti all’attacco */
  diceMod?: number;
  /** danno extra contro i corazzati */
  vsArmoured?: number;
}

const w = (id: string, name: string, kind: WeaponKind, status: Status | null, range: string, damage: string | null, hands: 1 | 2, traits: string, extra: Partial<Weapon> = {}): Weapon => ({
  id, name, kind, status, range, damage, hands, traits, ...extra,
});

export const WEAPONS: Weapon[] = [
  w('mani-nude', 'Mani Nude', 'mischia', null, 'Ravvicinata', null, 1, 'Si attacca con Muscoli; il colpo infligge Barcollante invece dei Danni.', { skill: 'muscoli' }),
  w('tirapugni', 'Tirapugni', 'mischia', 'bronzo', 'Ravvicinata', 'F-1', 1, '+1d a Furtività per nasconderlo. Si attacca con Muscoli.', { skill: 'muscoli' }),
  w('pugnale', 'Pugnale', 'mischia', 'bronzo', 'Ravvicinata', 'F-1', 1, '+1d a Furtività per nasconderlo.'),
  w('bastone', 'Bastone', 'mischia', 'bronzo', 'Ravvicinata', 'F', 1, '+1d ad Atletica su Terreno Difficile.'),
  w('lancia-da-fante', 'Lancia da Fante', 'mischia', 'bronzo', 'Corta', 'F', 1, '+1d a Difesa contro le cariche; +1 Danno a due mani.'),
  w('lancia-da-sella', 'Lancia da Sella', 'mischia', 'bronzo', 'Corta', 'F', 1, '+1d a Mischia caricando in sella.'),
  w('ascia', 'Ascia', 'mischia', 'bronzo', 'Ravvicinata', 'F', 1, '+1 Danno contro i corazzati.', { vsArmoured: 1 }),
  w('piccone', 'Piccone', 'mischia', 'bronzo', 'Ravvicinata', 'F+1', 2, '+1d a Lavoro per estrarre risorse.'),
  w('spada', 'Spada', 'mischia', 'argento', 'Ravvicinata', 'F', 1, '+1d a Difesa se non sei Barcollante.'),
  w('martello-da-guerra', 'Martello da Guerra', 'mischia', 'argento', 'Ravvicinata', 'F', 1, '+1d a Mischia contro i Barcollanti.'),
  w('mazzafrusto', 'Mazzafrusto', 'mischia', 'argento', 'Ravvicinata', 'F+1', 1, '-1d a Mischia da Barcollante. Se ne usa uno solo.'),
  w('arma-inastata', 'Arma Inastata', 'mischia', 'argento', 'Corta', 'F', 1, '+2 Danni a due mani.'),
  w('flagello', 'Flagello', 'mischia', 'argento', 'Ravvicinata', 'F+3', 2, '-2d a Mischia da Barcollante.'),
  w('roncone', 'Roncone', 'mischia', 'argento', 'Ravvicinata', 'F+2', 2, '+1d a Mischia contro nemici in sella.'),
  w('alabarda', 'Alabarda', 'mischia', 'argento', 'Ravvicinata', 'F+2', 2, '+1 Danno contro i corazzati.', { vsArmoured: 1 }),
  w('falcione', 'Falcione', 'mischia', 'argento', 'Ravvicinata', 'F+2', 2, '+1d a Difesa se non sei Barcollante.'),
  w('ascia-a-due-mani', 'Ascia a Due Mani', 'mischia', 'argento', 'Ravvicinata', 'F+3', 2, '-1d a Mischia; +1 Danno contro i corazzati.', { diceMod: -1, vsArmoured: 1 }),
  w('spadone', 'Spadone', 'mischia', 'oro', 'Ravvicinata', 'F+3', 2, '-1d a Mischia; +1d a Difesa se non sei Barcollante.', { diceMod: -1 }),
  w('martello-a-due-mani', 'Martello a Due Mani', 'mischia', 'oro', 'Ravvicinata', 'F+3', 2, '-1d a Mischia; +1d a Mischia contro i Barcollanti.', { diceMod: -1 }),
  w('lancia-da-cavaliere', 'Lancia da Cavaliere', 'mischia', 'oro', 'Ravvicinata', 'F+1', 1, '+1d e +1 Danno caricando in sella. Se ne usa una sola.'),
  w('frombola', 'Frombola', 'distanza', 'bronzo', 'Media', 'F', 1, ''),
  w('arco-corto', 'Arco Corto', 'distanza', 'bronzo', 'Corta – Media', '3', 2, '+1d a Tiro entro Distanza Corta.'),
  w('arco-da-guerra', 'Arco da Guerra', 'distanza', 'bronzo', 'Media – Lunga', '3', 2, ''),
  w('arco-lungo', 'Arco Lungo', 'distanza', 'argento', 'Media – Lunga', '4', 2, ''),
  w('balestra', 'Balestra', 'distanza', 'argento', 'Corta – Lunga', '4', 2, '+1 Danno contro i corazzati. Ricarica 2.', { reload: 2, vsArmoured: 1 }),
  w('pistola', 'Pistola', 'distanza', 'argento', 'Ravvicinata – Corta', '5', 1, 'Ignora l’armatura. Ricarica 3.', { reload: 3, ignoresArmour: true }),
  w('archibugio', 'Archibugio', 'distanza', 'argento', 'Media – Lunga', '5', 2, 'Ignora l’armatura. Ricarica 3.', { reload: 3, ignoresArmour: true }),
  w('trombone', 'Trombone', 'distanza', 'argento', 'Corta', '4', 2, 'Gittata massima Media; +2d entro Distanza Corta; Barcollante a chi è vicino al bersaglio. Ricarica 3.', { reload: 3 }),
  w('moschetto-hochland', 'Moschetto Lungo dell’Hochland', 'distanza', 'oro', 'Media – Estrema', '6', 2, 'Va Mirato prima. Ignora l’armatura; +1d sulla tabella delle Ferite. Ricarica 4.', { reload: 4, ignoresArmour: true }),
  w('balestrino-ripetizione', 'Balestrino a Ripetizione', 'distanza', 'oro', 'Ravvicinata – Corta', '4', 1, '+1d a un tiro, poi ricarica 3.'),
  w('balestra-ripetizione', 'Balestra a Ripetizione', 'distanza', 'oro', 'Corta – Media', '4', 2, '+1d a un tiro, poi ricarica 3.'),
  w('pistola-ripetizione', 'Pistola a Ripetizione', 'distanza', 'oro', 'Ravvicinata – Corta', '5', 1, 'Ignora l’armatura; +2d a un tiro, poi ricarica 3.', { ignoresArmour: true }),
  w('archibugio-ripetizione', 'Archibugio a Ripetizione', 'distanza', 'oro', 'Corta – Lunga', '5', 2, 'Ignora l’armatura; +3d a un tiro, poi ricarica 5.', { ignoresArmour: true }),
  w('sasso', 'Sasso', 'lancio', null, 'Corta – Media', null, 1, 'Non ferisce (solo Barcollante a chi lo è già).'),
  w('giavellotto', 'Giavellotto', 'lancio', 'bronzo', 'Ravvicinata – Media', 'F', 1, ''),
  w('ascia-da-lancio', 'Ascia da Lancio', 'lancio', 'bronzo', 'Corta', 'F+1', 1, '+1 Danno contro i corazzati.', { vsArmoured: 1 }),
  w('rete-con-pesi', 'Rete con Pesi', 'lancio', 'bronzo', 'Ravvicinata – Corta', null, 2, 'Il colpo infligge Ostacolato invece dei Danni.'),
  w('coltelli-da-lancio', 'Coltelli da Lancio', 'lancio', 'argento', 'Corta', 'F', 1, 'Bastano per uno scontro.'),
  w('fiaschetta-olio', 'Fiaschetta d’Olio', 'lancio', 'argento', 'Corta – Media', null, 1, 'In Fiamme al bersaglio e a chi gli è vicino.'),
  w('carica-esplosiva', 'Carica Esplosiva', 'lancio', 'oro', 'Corta – Media', null, 1, 'Pericolo (3) a tutta la Zona (Tempra); se manca esplode nella tua.'),
];

export interface Armour {
  id: string;
  name: string;
  status: Status;
  /** bonus alla Resilienza oltre la Resistenza */
  bonus: number;
  traits: string;
  shield?: boolean;
  /** armatura vera (rende "corazzati") */
  armour?: boolean;
}

export const ARMOURS: Armour[] = [
  { id: 'abiti-popolano', name: 'Abiti da Popolano', status: 'bronzo', bonus: 0, traits: '+1d a Fascino per apparire innocui.' },
  { id: 'abiti-cittadino', name: 'Abbigliamento da Cittadino', status: 'argento', bonus: 0, traits: '+1d a Fascino per mercanteggiare con gli Argento.' },
  { id: 'vesti-signorili', name: 'Vesti Signorili', status: 'oro', bonus: 0, traits: '+1d a Comando verso Bronzo e Argento.' },
  { id: 'uniforme', name: 'Uniforme', status: 'bronzo', bonus: 0, traits: '+1d a Comando verso i civili; si porta sopra l’armatura.' },
  { id: 'abiti-cuoio', name: 'Abiti da Lavoro in Cuoio', status: 'bronzo', bonus: 0, traits: '+1d per evitare Pericoli fisici.' },
  { id: 'abiti-viaggio', name: 'Abiti da Viaggio', status: 'bronzo', bonus: 0, traits: '+1d contro Condizioni e Pericoli ambientali.' },
  { id: 'abiti-occultanti', name: 'Abiti Occultanti', status: 'bronzo', bonus: 0, traits: '+1d a Furtività in un ambiente a scelta.' },
  { id: 'costume', name: 'Costume di Scena', status: 'bronzo', bonus: 0, traits: '+1d per attirare l’attenzione.' },
  { id: 'armatura-leggera', name: 'Armatura Leggera', status: 'argento', bonus: 1, traits: '', armour: true },
  { id: 'armatura-pesante', name: 'Armatura Pesante', status: 'oro', bonus: 2, traits: '-1d alle Prove di Agilità; Ostacolato con Forza sotto 3.', armour: true },
  { id: 'armatura-piastre', name: 'Armatura di Piastre Completa', status: 'oro', bonus: 3, traits: 'È una Risorsa. -1d alle Prove di Agilità.', armour: true },
];

export const SHIELD: Armour = { id: 'scudo', name: 'Scudo', status: 'argento', bonus: 1, traits: 'Permette di opporsi al Tiro con Difesa.', shield: true, armour: true };

/* ---------------------------------------------------------------- Condizioni */

export const CONDITIONS = [
  'Accecato', 'Assordato', 'Atterrito', 'Barcollante', 'Distratto', 'Esausto', 'Ferito Gravemente', 'In Fiamme', 'Indifeso', 'Ostacolato', 'Prono',
];

export const CONDITION_INFO: Record<string, string> = {
  Accecato: 'Le Prove con una componente visiva (attaccare, opporsi, muoversi, Percezione) sono Tetre; quelle che dipendono dalla vista falliscono. Si toglie con Percezione.',
  Assordato: 'Non senti nulla: niente Aiutare, fallisci le Prove basate sull’udito. Si toglie con Percezione.',
  Atterrito: 'Devi raggiungere al più presto una Zona senza nemici; lì puoi Recuperare con Volontà. Un alleato può rimetterti in riga con Comando.',
  Barcollante: 'Da sola non fa nulla; se la subisci di nuovo scegli: Arretrare (una volta per round), cadere Prono o subire una Ferita. Si toglie Recuperando o subendo una Ferita.',
  Distratto: '-1d a tutte le Prove contro ciò che non ti distrae. In battaglia si toglie con Volontà.',
  Esausto: 'Niente dadi bonus; le Prove non sono Gloriose a meno di spendere Fato. Si toglie con Tempra (fatica passeggera) o riposando.',
  'Ferito Gravemente': 'A fine turno Prova di Tempra: se fallisci diventi Indifeso, se lo eri già muori. Si toglie medicando la Ferita (Memoria).',
  'In Fiamme': 'A fine turno Tempra contro un Pericolo (2) da fuoco. Si toglie con Atletica (rotolarsi) o gettandosi in acqua.',
  Indifeso: 'Non ti muovi, non agisci, non ti opponi; ogni attacco che ti colpisce ti Ferisce.',
  Ostacolato: 'Non puoi Manovrare. Si toglie con Muscoli o alleggerendo il carico.',
  Prono: 'Gli attacchi in mischia contro di te hanno +1d, quelli a distanza -1d; non puoi lasciare la Zona. Ti rialzi Recuperando o col movimento gratuito se nessun nemico è a Distanza Ravvicinata.',
};

/* -------------------------------------------------------- Tabella delle Ferite */

export interface WoundResult {
  min: number;
  max: number;
  name: string;
  text: string;
  heal: string;
  /** condizioni che infligge subito */
  conditions?: string[];
  dead?: boolean;
}

export const WOUND_TABLE: WoundResult[] = [
  { min: 1, max: 3, name: 'Escoriazione', text: 'Un graffio o un brutto livido: nessuna penalità oltre a quella delle Ferite non medicate.', heal: 'Riprendere Fiato' },
  { min: 4, max: 4, name: 'Botta al Braccio', text: 'Prova di Tempra o lasci cadere ciò che hai in una mano a caso.', heal: 'Riprendere Fiato' },
  { min: 5, max: 5, name: 'Trauma alla Gamba', text: 'Prova di Tempra o cadi Prono; ti rialzi col movimento gratuito o con Recuperare.', heal: 'Riprendere Fiato' },
  { min: 6, max: 6, name: 'Colpo al Diaframma', text: 'Sei Esausto fino alla fine del tuo prossimo turno.', heal: 'Riprendere Fiato', conditions: ['Esausto'] },
  { min: 7, max: 7, name: 'Fronte Sanguinante', text: 'Prova di Tempra o il sangue ti rende Accecato fino alla fine del tuo prossimo turno.', heal: 'Riprendere Fiato' },
  { min: 8, max: 8, name: 'Presa Debole', text: 'Lasci cadere ciò che hai in una mano a caso; non puoi Mirare finché non la medichi.', heal: 'Una Notte di Riposo' },
  { min: 9, max: 9, name: 'Crampo alla Gamba', text: 'Cadi Prono (ti rialzi col movimento gratuito o con Recuperare); finché non la medichi ti muovi come su Terreno Difficile.', heal: 'Una Notte di Riposo', conditions: ['Prono'] },
  { min: 10, max: 10, name: 'Costola Incrinata', text: 'La tua prossima Prova è Tetra; sei Esausto finché non la medichi.', heal: 'Una Notte di Riposo', conditions: ['Esausto'] },
  { min: 11, max: 11, name: 'Fischio alle Orecchie', text: 'Prova di Tempra o perdi 1d10 denti; sei Assordato finché non la medichi.', heal: 'Una Notte di Riposo', conditions: ['Assordato'] },
  { min: 12, max: 12, name: 'Mano Spappolata', text: 'Lasci cadere ciò che hai in una mano a caso; Prova di Tempra o perdi un dito. Usare quella mano prima di medicarla ti rende Ferito Gravemente.', heal: 'Una Notte di Riposo' },
  { min: 13, max: 13, name: 'Squarcio alla Gamba', text: 'Cadi Prono; puoi rialzarti col movimento gratuito o con Recuperare, ma se lo fai prima di medicarla diventi Ferito Gravemente.', heal: 'Una Notte di Riposo', conditions: ['Prono'] },
  { min: 14, max: 14, name: 'Ferita Interna', text: 'Sei Esausto finché non la medichi; un’Azione diversa da Recuperare prima di allora ti rende Ferito Gravemente.', heal: 'Una Notte di Riposo', conditions: ['Esausto'] },
  { min: 15, max: 15, name: 'Sfregio', text: 'Finché non è medicata, un’azione che non sia cadere Prono o lasciare ciò che hai in mano per coprirti il volto ti rende Ferito Gravemente; sei Barcollante finché non guarisce. Ti resterà la cicatrice.', heal: 'Una Notte di Riposo', conditions: ['Barcollante'] },
  { min: 16, max: 16, name: 'Avambraccio Dilaniato', text: 'Un braccio a caso: sei Ferito Gravemente finché non la medichi e non puoi usarlo finché non guarisce.', heal: 'Riposare e Rimettersi', conditions: ['Ferito Gravemente'] },
  { min: 17, max: 17, name: 'Ginocchio Distrutto', text: 'Sei Prono e Ferito Gravemente finché non la medichi, Ostacolato finché non guarisce.', heal: 'Riposare e Rimettersi', conditions: ['Prono', 'Ferito Gravemente', 'Ostacolato'] },
  { min: 18, max: 18, name: 'Sbudellamento', text: 'Se non lasci cadere ciò che hai in mano per reggerti le interiora svieni (Indifeso); Ferito Gravemente finché non la medichi; Ostacolato ed Esausto finché non guarisce.', heal: 'Riposare e Rimettersi', conditions: ['Ferito Gravemente', 'Ostacolato', 'Esausto'] },
  { min: 19, max: 19, name: 'Commozione Cerebrale', text: 'Prova di Tempra o perdi un occhio a caso; Accecato e Ferito Gravemente finché non la medichi; Barcollante finché non guarisce.', heal: 'Riposare e Rimettersi', conditions: ['Accecato', 'Ferito Gravemente', 'Barcollante'] },
  { min: 20, max: 20, name: 'Braccio Mozzato', text: 'Un braccio a caso è perso; Indifeso e Ferito Gravemente finché non la medichi. Con una protesi, da guarito, ne recuperi un po’ l’uso.', heal: 'Operazione, Riposare e Rimettersi', conditions: ['Indifeso', 'Ferito Gravemente'] },
  { min: 21, max: 21, name: 'Gamba Mozzata', text: 'Una gamba a caso è persa e la Velocità diventa Lenta; Indifeso e Ferito Gravemente finché non la medichi. Con una protesi, da guarito, puoi tentare alcune Manovre con una penalità.', heal: 'Operazione, Riposare e Rimettersi', conditions: ['Indifeso', 'Ferito Gravemente'] },
  { min: 22, max: 22, name: 'Organo Perforato', text: 'Indifeso e Ferito Gravemente finché non la medichi. Da ora ogni attacco fisico che ti rende Barcollante ti Ferisce invece; guarita la Ferita, una Prova di Tempra ti libera da questo effetto.', heal: 'Operazione, Riposare e Rimettersi', conditions: ['Indifeso', 'Ferito Gravemente'] },
  { min: 23, max: 23, name: 'Trauma Oculare', text: 'Indifeso e Ferito Gravemente finché non la medichi; Accecato per sempre (guarito, col tempo ti adatti e le penalità contano meno spesso).', heal: 'Operazione, Riposare e Rimettersi', conditions: ['Indifeso', 'Ferito Gravemente', 'Accecato'] },
  { min: 24, max: 24, name: 'Mutilazione Devastante', text: 'Un arto spappolato, un altro strappato via: muori pochi istanti dopo.', heal: '—', dead: true },
  { min: 25, max: 25, name: 'Tranciato a Metà', text: 'Tagliato a metà: muori prima ancora di toccare terra.', heal: '—', dead: true },
  { min: 26, max: 26, name: 'Cuore Trafitto', text: 'Puoi pronunciare 1d10 ultime parole, poi muori.', heal: '—', dead: true },
  { min: 27, max: 999, name: 'Decapitazione', text: 'La testa vola via (chi ti ha ucciso, a Distanza Ravvicinata e con una mano libera, può afferrarla come trofeo). Sei morto.', heal: '—', dead: true },
];

export const woundFor = (total: number): WoundResult => WOUND_TABLE.find((r) => total >= r.min && total <= r.max) ?? WOUND_TABLE[0]!;

/* ------------------------------------------------------ Incidenti Magici */

export const MISCAST_TABLE: { min: number; max: number; text: string }[] = [
  { min: 1, max: 2, text: 'Chi è entro Distanza Media prova un inspiegabile senso di perdita.' },
  { min: 3, max: 4, text: 'Un’ondata di magia nauseante: nausea per chi è entro Distanza Corta.' },
  { min: 5, max: 6, text: '1d10 piccoli oggetti vicini diventano creaturine che scappano.' },
  { min: 7, max: 8, text: 'Uno stridio inquietante ti segue fino alla prossima Mannslieb piena.' },
  { min: 9, max: 10, text: 'Il cibo fresco entro Distanza Lunga marcisce.' },
  { min: 11, max: 12, text: 'Sei Barcollante e si manifesta un piccolo effetto di un tuo Sapere.' },
  { min: 13, max: 14, text: 'Puzzi: chi è vicino Arretra o ha -1d; Socialità Tetra finché non ti lavi.' },
  { min: 15, max: 16, text: 'Il tempo atmosferico cambia all’improvviso.' },
  { min: 17, max: 18, text: 'Vieni trasportato in una Zona a caso entro Distanza Media.' },
  { min: 19, max: 20, text: 'Vedi solo con luce artificiale fino al prossimo Intermezzo.' },
  { min: 21, max: 22, text: 'Un vento innaturale getta Prono chiunque entro Distanza Corta (tranne le Mostruosità).' },
  { min: 23, max: 24, text: 'Un tuo incantesimo recente si ripete con Potenza 1 su un bersaglio scelto dal GM.' },
  { min: 25, max: 26, text: 'Non puoi mentire fino al prossimo Intermezzo.' },
  { min: 27, max: 28, text: 'Vedi solo i Venti della Magia fino al plenilunio di Morrslieb (Percezione Tetra).' },
  { min: 29, max: 30, text: 'Appari come il nemico che più temi per qualche minuto.' },
  { min: 31, max: 32, text: 'Subisci una Ferita: tira sulla tabella delle Ferite.' },
  { min: 33, max: 34, text: 'La tua Zona diventa un Pericolo pari ai dadi tirati (Tempra o Atletica).' },
  { min: 35, max: 36, text: 'Un grido innaturale: tutti entro Distanza Corta subiscono la Ferita «Fischio alle Orecchie».' },
  { min: 37, max: 37, text: 'Si apre uno squarcio: emerge un Demone ostile.' },
  { min: 38, max: 38, text: 'Si apre un portale sul Reame del Caos entro Distanza Lunga: chi lo vede deve resistere (Volontà -1d) o esserne attratto.' },
  { min: 39, max: 999, text: 'La magia ti fa a pezzi. Sei morto.' },
];

export const miscastFor = (total: number) => MISCAST_TABLE.find((r) => total >= r.min && total <= r.max) ?? MISCAST_TABLE[0]!;

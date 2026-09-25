/**
 * Spells from SRD 5.2 (2024 rules), Italian names, short descriptions.
 * Ranges in metres. Class codes: B bardo, C chierico, D druido, P paladino,
 * R ranger, S stregone, K warlock, W mago.
 */

import type { Ability } from './data';
import type { DamageType } from './equipment';

export type SpellSchool = 'abj' | 'con' | 'div' | 'enc' | 'evo' | 'ill' | 'nec' | 'tra';

export const SCHOOLS: Record<SpellSchool, string> = {
  abj: 'Abiurazione',
  con: 'Evocazione',
  div: 'Divinazione',
  enc: 'Ammaliamento',
  evo: 'Invocazione',
  ill: 'Illusione',
  nec: 'Necromanzia',
  tra: 'Trasmutazione',
};

export interface SpellDef {
  id: string;
  name: string;
  level: number;
  school: SpellSchool;
  classes: string[];
  time: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  /** spell attack roll */
  attack?: boolean;
  save?: Ability;
  damage?: string;
  damageType?: DamageType;
  heal?: string;
  /** extra dice per slot above the base level */
  upcast?: string;
  /** cantrip: damage grows at levels 5, 11, 17 */
  cantripScaling?: boolean;
  /** add the spellcasting modifier to damage/healing */
  addMod?: boolean;
}

const CLS: Record<string, string> = { B: 'bard', C: 'cleric', D: 'druid', P: 'paladin', R: 'ranger', S: 'sorcerer', K: 'warlock', W: 'wizard' };

type Extra = Partial<Pick<SpellDef, 'attack' | 'save' | 'damage' | 'damageType' | 'heal' | 'upcast' | 'cantripScaling' | 'addMod'>>;

function s(
  id: string,
  name: string,
  level: number,
  school: SpellSchool,
  classes: string,
  time: string,
  range: string,
  components: string,
  duration: string,
  flags: string,
  description: string,
  extra: Extra = {},
): SpellDef {
  return {
    id,
    name,
    level,
    school,
    classes: classes.split('').map((c) => CLS[c]!),
    time,
    range,
    components,
    duration,
    concentration: flags.includes('c'),
    ritual: flags.includes('r'),
    description,
    ...extra,
  };
}

const A = 'Azione';
const BA = 'Azione bonus';
const R = 'Reazione';
const I = 'Istantanea';

export const SPELLS: SpellDef[] = [
  // ---------- cantrips ----------
  s('acidSplash', 'Fiotto acido', 0, 'evo', 'SW', A, '18 m', 'V, S', I, '', 'Sfera di 1,5 m di raggio: TS su Destrezza o 1d6 danni da acido.', { save: 'dex', damage: '1d6', damageType: 'acid', cantripScaling: true }),
  s('chillTouch', 'Tocco gelido', 0, 'nec', 'SKW', A, 'Contatto', 'V, S', I, '', 'Attacco in mischia con incantesimo: 1d10 danni necrotici e il bersaglio non recupera PF fino alla fine del tuo prossimo turno.', { attack: true, damage: '1d10', damageType: 'necrotic', cantripScaling: true }),
  s('dancingLights', 'Luci danzanti', 0, 'ill', 'BSW', A, '36 m', 'V, S, M', '1 minuto', 'c', 'Fino a quattro luci fluttuanti che illuminano un raggio di 3 m e si muovono a comando.'),
  s('druidcraft', 'Arte druidica', 0, 'tra', 'D', A, '9 m', 'V, S', I, '', 'Piccoli effetti naturali: prevedere il tempo, far sbocciare un fiore, accendere o spegnere una candela.'),
  s('eldritchBlast', 'Deflagrazione occulta', 0, 'evo', 'K', A, '36 m', 'V, S', I, '', 'Un raggio di energia: attacco con incantesimo, 1d10 danni da forza. Due raggi al 5°, tre all’11°, quattro al 17°.', { attack: true, damage: '1d10', damageType: 'force' }),
  s('fireBolt', 'Dardo di fuoco', 0, 'evo', 'SW', A, '36 m', 'V, S', I, '', 'Attacco a distanza con incantesimo: 1d10 danni da fuoco; incendia oggetti infiammabili non indossati.', { attack: true, damage: '1d10', damageType: 'fire', cantripScaling: true }),
  s('guidance', 'Guida', 0, 'div', 'CD', A, 'Contatto', 'V, S', '1 minuto', 'c', 'Scegli un’abilità: la creatura aggiunge 1d4 alle prove di quell’abilità.'),
  s('light', 'Luce', 0, 'evo', 'BCSW', A, 'Contatto', 'V, M', '1 ora', '', 'Un oggetto emette luce intensa per 6 m e fioca per altri 6 m.'),
  s('mageHand', 'Mano magica', 0, 'con', 'BSKW', A, '9 m', 'V, S', '1 minuto', '', 'Una mano spettrale manipola oggetti fino a 5 kg.'),
  s('mending', 'Aggiustare', 0, 'tra', 'BCDSW', '1 minuto', 'Contatto', 'V, S, M', I, '', 'Ripara una singola rottura o strappo in un oggetto.'),
  s('message', 'Messaggio', 0, 'tra', 'BDSW', A, '36 m', 'S, M', '1 round', '', 'Sussurri un messaggio a una creatura, che può rispondere in un sussurro.'),
  s('minorIllusion', 'Illusione minore', 0, 'ill', 'BSKW', A, '9 m', 'S, M', '1 minuto', '', 'Crei un suono o l’immagine di un oggetto in un cubo di 1,5 m.'),
  s('poisonSpray', 'Spruzzo velenoso', 0, 'nec', 'DSKW', A, '9 m', 'V, S', I, '', 'Attacco a distanza con incantesimo: 1d12 danni da veleno.', { attack: true, damage: '1d12', damageType: 'poison', cantripScaling: true }),
  s('prestidigitation', 'Prestidigitazione', 0, 'tra', 'BSKW', A, '3 m', 'V, S', 'Fino a 1 ora', '', 'Piccoli trucchi magici: scintille, pulire, scaldare, marchiare, piccole illusioni.'),
  s('produceFlame', 'Produrre fiamma', 0, 'con', 'D', BA, 'Sé', 'V, S', '10 minuti', '', 'Una fiamma in mano fa luce; puoi scagliarla (attacco con incantesimo, 18 m) per 1d8 danni da fuoco.', { attack: true, damage: '1d8', damageType: 'fire', cantripScaling: true }),
  s('rayOfFrost', 'Raggio di gelo', 0, 'evo', 'SW', A, '18 m', 'V, S', I, '', 'Attacco a distanza con incantesimo: 1d8 danni da freddo e −3 m di Velocità fino al tuo prossimo turno.', { attack: true, damage: '1d8', damageType: 'cold', cantripScaling: true }),
  s('resistance', 'Resistenza', 0, 'abj', 'CD', A, 'Contatto', 'V, S', '1 minuto', 'c', 'Scegli un tipo di danno: una volta per turno la creatura riduce di 1d4 i danni di quel tipo.'),
  s('sacredFlame', 'Fiamma sacra', 0, 'evo', 'C', A, '18 m', 'V, S', I, '', 'Fiamme radiose: TS su Destrezza o 1d8 danni radiosi. Nessun beneficio dalla copertura.', { save: 'dex', damage: '1d8', damageType: 'radiant', cantripScaling: true }),
  s('shillelagh', 'Randello incantato', 0, 'tra', 'D', BA, 'Sé', 'V, S, M', '1 minuto', '', 'Il tuo randello o bastone usa la caratteristica da incantatore e infligge 1d8 (d10 al 5°, d12 all’11°, 2d6 al 17°).'),
  s('shockingGrasp', 'Stretta folgorante', 0, 'evo', 'SW', A, 'Contatto', 'V, S', I, '', 'Attacco in mischia con incantesimo: 1d8 danni da fulmine e il bersaglio non può fare attacchi di opportunità.', { attack: true, damage: '1d8', damageType: 'lightning', cantripScaling: true }),
  s('spareTheDying', 'Salvare i morenti', 0, 'nec', 'CD', A, '4,5 m', 'V, S', I, '', 'Una creatura a 0 PF diventa stabile. La gittata raddoppia al 5°, 11° e 17° livello.'),
  s('thaumaturgy', 'Taumaturgia', 0, 'tra', 'C', A, '9 m', 'V', 'Fino a 1 minuto', '', 'Piccoli prodigi: voce tonante, fiamme che tremano, tremori, occhi che cambiano.'),
  s('trueStrike', 'Colpo accurato', 0, 'div', 'BSKW', A, 'Sé', 'S, M', I, '', 'Attacchi con un’arma usando la caratteristica da incantatore; dal 5° livello +1d6 danni radiosi (2d6 all’11°, 3d6 al 17°).'),
  s('viciousMockery', 'Beffa crudele', 0, 'enc', 'B', A, '18 m', 'V', I, '', 'Insulti magici: TS su Saggezza o 1d6 danni psichici e Svantaggio al prossimo tiro per colpire.', { save: 'wis', damage: '1d6', damageType: 'psychic', cantripScaling: true }),

  // ---------- 1st level ----------
  s('alarm', 'Allarme', 1, 'abj', 'RW', '1 minuto', '9 m', 'V, S, M', '8 ore', 'r', 'Un allarme mentale o udibile scatta quando una creatura entra nell’area protetta.'),
  s('animalFriendship', 'Amicizia con gli animali', 1, 'enc', 'BDR', A, '9 m', 'V, S, M', '24 ore', '', 'Una bestia fa un TS su Saggezza o è Affascinata da te.', { save: 'wis' }),
  s('bane', 'Anatema', 1, 'enc', 'BC', A, '9 m', 'V, S, M', '1 minuto', 'c', 'Fino a tre creature fanno TS su Carisma o sottraggono 1d4 a tiri per colpire e TS.', { save: 'cha' }),
  s('bless', 'Benedizione', 1, 'enc', 'CP', A, '9 m', 'V, S, M', '1 minuto', 'c', 'Fino a tre creature aggiungono 1d4 ai tiri per colpire e ai TS.'),
  s('burningHands', 'Mani brucianti', 1, 'evo', 'SW', A, 'Sé (cono 4,5 m)', 'V, S', I, '', 'Cono di fiamme: TS su Destrezza, 3d6 danni da fuoco (metà se superato).', { save: 'dex', damage: '3d6', damageType: 'fire', upcast: '1d6' }),
  s('charmPerson', 'Charme su persone', 1, 'enc', 'BDSKW', A, '9 m', 'V, S', '1 ora', '', 'Un umanoide fa un TS su Saggezza (con Vantaggio se lo combatti) o ti considera un amico.', { save: 'wis' }),
  s('chromaticOrb', 'Globo cromatico', 1, 'evo', 'SW', A, '27 m', 'V, S, M', I, '', 'Attacco a distanza con incantesimo: 3d8 danni del tipo scelto (acido, freddo, fuoco, fulmine, veleno, tuono).', { attack: true, damage: '3d8', upcast: '1d8' }),
  s('colorSpray', 'Spruzzo colorato', 1, 'ill', 'BSW', A, 'Sé (cono 4,5 m)', 'V, S, M', '1 round', '', 'Le creature nel cono fanno un TS su Costituzione o sono Accecate fino alla fine del tuo prossimo turno.', { save: 'con' }),
  s('command', 'Comando', 1, 'enc', 'BCP', A, '18 m', 'V', I, '', 'Un ordine di una parola (Avvicinati, Lascia, Fuggi, A terra, Fermo): TS su Saggezza o obbedisce.', { save: 'wis' }),
  s('comprehendLanguages', 'Comprensione dei linguaggi', 1, 'div', 'BSKW', A, 'Sé', 'V, S, M', '1 ora', 'r', 'Capisci il significato letterale di ogni lingua che senti o leggi toccandola.'),
  s('createOrDestroyWater', 'Creare o distruggere acqua', 1, 'tra', 'CD', A, '9 m', 'V, S, M', I, '', 'Crei o distruggi fino a 40 litri d’acqua, o nebbia.'),
  s('cureWounds', 'Cura ferite', 1, 'abj', 'BCDPR', A, 'Contatto', 'V, S', I, '', 'Una creatura recupera 2d8 + modificatore PF.', { heal: '2d8', upcast: '2d8', addMod: true }),
  s('detectEvilAndGood', 'Individuazione del bene e del male', 1, 'div', 'CP', A, 'Sé', 'V, S', '10 minuti', 'c', 'Percepisci aberrazioni, celestiali, elementali, folletti, immondi e non morti entro 9 m.'),
  s('detectMagic', 'Individuazione del magico', 1, 'div', 'BCDPRSKW', A, 'Sé', 'V, S', '10 minuti', 'cr', 'Percepisci la magia entro 9 m e la sua scuola.'),
  s('detectPoisonAndDisease', 'Individuazione di veleni e malattie', 1, 'div', 'CDPR', A, 'Sé', 'V, S, M', '10 minuti', 'cr', 'Percepisci veleni, creature velenose e malattie entro 9 m.'),
  s('disguiseSelf', 'Camuffare se stesso', 1, 'ill', 'BSW', A, 'Sé', 'V, S', '1 ora', '', 'Cambi aspetto, abiti ed equipaggiamento in modo illusorio.'),
  s('divineFavor', 'Favore divino', 1, 'tra', 'P', BA, 'Sé', 'V, S', '1 minuto', '', 'I tuoi attacchi con armi infliggono 1d4 danni radiosi extra.'),
  s('divineSmite', 'Punizione divina', 1, 'evo', 'P', 'Azione bonus (dopo aver colpito)', 'Sé', 'V', I, '', 'Il colpo infligge 2d8 danni radiosi extra (+1d8 contro immondi e non morti).', { damage: '2d8', damageType: 'radiant', upcast: '1d8' }),
  s('entangle', 'Intralciare', 1, 'con', 'D', A, '27 m', 'V, S', '1 minuto', 'c', 'Piante in un quadrato di 6 m: terreno difficile e TS su Forza o Trattenuto.', { save: 'str' }),
  s('expeditiousRetreat', 'Ritirata rapida', 1, 'tra', 'SKW', BA, 'Sé', 'V, S', '10 minuti', 'c', 'Scatto subito e poi come azione bonus a ogni turno.'),
  s('faerieFire', 'Luminescenza', 1, 'evo', 'BD', A, '18 m', 'V', '1 minuto', 'c', 'Cubo di 6 m: TS su Destrezza o le creature brillano, niente Invisibilità e attacchi con Vantaggio contro di loro.', { save: 'dex' }),
  s('falseLife', 'Vita falsata', 1, 'nec', 'SW', A, 'Sé', 'V, S, M', I, '', 'Ottieni 2d4 + 4 punti ferita temporanei (+5 per slot superiore).'),
  s('featherFall', 'Caduta morbida', 1, 'tra', 'BSW', 'Reazione (mentre cadi)', '18 m', 'V, M', '1 minuto', '', 'Fino a cinque creature cadono lentamente e non subiscono danni.'),
  s('findFamiliar', 'Trovare famiglio', 1, 'con', 'W', '1 ora', '3 m', 'V, S, M', I, 'r', 'Ottieni un famiglio spirito in forma di piccolo animale che ti aiuta e ti fa da occhi.'),
  s('fogCloud', 'Nube di nebbia', 1, 'con', 'DRSW', A, '36 m', 'V, S', '1 ora', 'c', 'Sfera di nebbia di 6 m di raggio che oscura pesantemente l’area.'),
  s('goodberry', 'Bacche benefiche', 1, 'con', 'DR', A, 'Sé', 'V, S, M', '24 ore', '', 'Dieci bacche: ognuna cura 1 PF e sfama per un giorno.'),
  s('grease', 'Unto', 1, 'con', 'SW', A, '18 m', 'V, S, M', '1 minuto', '', 'Quadrato di 3 m scivoloso: TS su Destrezza o Prono.', { save: 'dex' }),
  s('guidingBolt', 'Dardo guida', 1, 'evo', 'C', A, '36 m', 'V, S', '1 round', '', 'Attacco con incantesimo: 4d6 danni radiosi e il prossimo attacco contro il bersaglio ha Vantaggio.', { attack: true, damage: '4d6', damageType: 'radiant', upcast: '1d6' }),
  s('healingWord', 'Parola guaritrice', 1, 'abj', 'BCD', BA, '18 m', 'V', I, '', 'Una creatura recupera 2d4 + modificatore PF.', { heal: '2d4', upcast: '2d4', addMod: true }),
  s('hellishRebuke', 'Intimorire infernale', 1, 'evo', 'K', 'Reazione (quando subisci danni)', '18 m', 'V, S', I, '', 'Chi ti ha ferito fa un TS su Destrezza: 2d10 danni da fuoco (metà se superato).', { save: 'dex', damage: '2d10', damageType: 'fire', upcast: '1d10' }),
  s('heroism', 'Eroismo', 1, 'enc', 'BP', A, 'Contatto', 'V, S', '1 minuto', 'c', 'Immunità a Spaventato e PF temporanei pari al modificatore all’inizio di ogni turno.'),
  s('hideousLaughter', 'Risata incontenibile', 1, 'enc', 'BW', A, '9 m', 'V, S, M', '1 minuto', 'c', 'TS su Saggezza o il bersaglio cade Prono e Incapacitato dalle risate.', { save: 'wis' }),
  s('huntersMark', 'Marchio del cacciatore', 1, 'div', 'R', BA, '27 m', 'V', '1 ora', 'c', 'Marchi una creatura: +1d6 danni da forza quando la colpisci e Vantaggio a Percezione e Sopravvivenza per trovarla.', { damage: '1d6', damageType: 'force' }),
  s('identify', 'Identificare', 1, 'div', 'BW', '1 minuto', 'Contatto', 'V, S, M', I, 'r', 'Scopri le proprietà di un oggetto magico o gli incantesimi che agiscono su una creatura.'),
  s('illusoryScript', 'Scrittura illusoria', 1, 'ill', 'BKW', '1 minuto', 'Contatto', 'S, M', '10 giorni', 'r', 'Uno scritto leggibile solo da chi scegli.'),
  s('inflictWounds', 'Infliggi ferite', 1, 'nec', 'C', A, 'Contatto', 'V, S', I, '', 'TS su Costituzione: 2d10 danni necrotici (metà se superato).', { save: 'con', damage: '2d10', damageType: 'necrotic', upcast: '1d10' }),
  s('jump', 'Saltare', 1, 'tra', 'DRSW', BA, 'Contatto', 'V, S, M', '1 minuto', '', 'Una volta per turno la creatura salta fino a 9 m spendendo 3 m di movimento.'),
  s('longstrider', 'Passo veloce', 1, 'tra', 'BDRW', A, 'Contatto', 'V, S, M', '1 ora', '', '+3 m di Velocità.'),
  s('mageArmor', 'Armatura magica', 1, 'abj', 'SW', A, 'Contatto', 'V, S, M', '8 ore', '', 'Senza armatura, la CA diventa 13 + Destrezza.'),
  s('magicMissile', 'Dardo incantato', 1, 'evo', 'SW', A, '36 m', 'V, S', I, '', 'Tre dardi che colpiscono sempre: 1d4 + 1 danni da forza ciascuno (+1 dardo per slot superiore).', { damage: '3d4+3', damageType: 'force' }),
  s('protectionFromEvilAndGood', 'Protezione dal bene e dal male', 1, 'abj', 'CPKW', A, 'Contatto', 'V, S, M', '10 minuti', 'c', 'Aberrazioni, celestiali, elementali, folletti, immondi e non morti hanno Svantaggio ad attaccare il bersaglio.'),
  s('purifyFoodAndDrink', 'Purificare cibo e bevande', 1, 'tra', 'CDP', A, '3 m', 'V, S', I, 'r', 'Rimuove veleni e malattie da cibo e bevande.'),
  s('rayOfSickness', 'Raggio di infermità', 1, 'nec', 'SW', A, '18 m', 'V, S', I, '', 'Attacco con incantesimo: 2d8 danni da veleno e Avvelenato fino alla fine del tuo prossimo turno.', { attack: true, damage: '2d8', damageType: 'poison', upcast: '1d8' }),
  s('sanctuary', 'Santuario', 1, 'abj', 'C', BA, '9 m', 'V, S, M', '1 minuto', '', 'Chi vuole attaccare la creatura protetta deve superare un TS su Saggezza.'),
  s('shield', 'Scudo', 1, 'abj', 'SW', 'Reazione (quando vieni colpito)', 'Sé', 'V, S', '1 round', '', '+5 alla CA fino al tuo prossimo turno e nessun danno da Dardo incantato.'),
  s('shieldOfFaith', 'Scudo della fede', 1, 'abj', 'CP', BA, '18 m', 'V, S, M', '10 minuti', 'c', '+2 alla CA di una creatura.'),
  s('silentImage', 'Immagine silenziosa', 1, 'ill', 'BSW', A, '18 m', 'V, S, M', '10 minuti', 'c', 'Immagine visiva di un oggetto o creatura in un cubo di 4,5 m.'),
  s('sleep', 'Sonno', 1, 'enc', 'BSW', A, '18 m', 'V, S, M', '1 minuto', 'c', 'Sfera di 1,5 m: TS su Saggezza o Incapacitati, poi Privi di sensi se falliscono di nuovo.', { save: 'wis' }),
  s('speakWithAnimals', 'Parlare con gli animali', 1, 'div', 'BDR', A, 'Sé', 'V, S', '10 minuti', 'r', 'Comprendi e comunichi con le bestie.'),
  s('thunderwave', 'Onda tonante', 1, 'evo', 'BDSW', A, 'Sé (cubo 4,5 m)', 'V, S', I, '', 'TS su Costituzione: 2d8 danni da tuono e spinta di 3 m (metà danni e nessuna spinta se superato).', { save: 'con', damage: '2d8', damageType: 'thunder', upcast: '1d8' }),
  s('unseenServant', 'Servitore inosservato', 1, 'con', 'BKW', A, '18 m', 'V, S, M', '1 ora', 'r', 'Una forza invisibile esegue semplici compiti.'),

  // ---------- 2nd level ----------
  s('acidArrow', 'Freccia acida', 2, 'evo', 'W', A, '27 m', 'V, S, M', I, '', 'Attacco con incantesimo: 4d4 danni da acido e 2d4 alla fine del prossimo turno del bersaglio (metà se mancato).', { attack: true, damage: '4d4', damageType: 'acid', upcast: '1d4' }),
  s('aid', 'Aiuto', 2, 'abj', 'BCDPR', A, '9 m', 'V, S, M', '8 ore', '', 'Fino a tre creature ottengono +5 PF massimi e attuali (+5 per slot superiore).'),
  s('alterSelf', 'Alterare se stesso', 2, 'tra', 'SW', A, 'Sé', 'V, S', '1 ora', 'c', 'Adattamento acquatico, cambio d’aspetto o armi naturali.'),
  s('animalMessenger', 'Messaggero animale', 2, 'enc', 'BDR', A, '9 m', 'V, S, M', '24 ore', 'r', 'Un piccolo animale porta un messaggio in un luogo che conosci.'),
  s('arcaneLock', 'Serratura arcana', 2, 'abj', 'W', A, 'Contatto', 'V, S, M', 'Finché non dissolto', '', 'Chiudi magicamente una porta o un contenitore.'),
  s('augury', 'Presagio', 2, 'div', 'CDW', '1 minuto', 'Sé', 'V, S, M', I, 'r', 'Ricevi un presagio (bene, male, entrambi, nulla) su un’azione nei prossimi 30 minuti.'),
  s('barkskin', 'Pelle di corteccia', 2, 'tra', 'DR', BA, 'Contatto', 'V, S, M', '1 ora', '', 'La CA della creatura non può essere inferiore a 17.'),
  s('blindnessDeafness', 'Cecità/Sordità', 2, 'tra', 'BCSW', A, '36 m', 'V', '1 minuto', '', 'TS su Costituzione o il bersaglio è Accecato o Assordato.', { save: 'con' }),
  s('blur', 'Sfocatura', 2, 'ill', 'SW', A, 'Sé', 'V', '1 minuto', 'c', 'Gli attacchi contro di te hanno Svantaggio.'),
  s('calmEmotions', 'Calmare emozioni', 2, 'enc', 'BC', A, '18 m', 'V, S', '1 minuto', 'c', 'Sfera di 6 m: TS su Carisma o sopprimi Affascinato/Spaventato, o l’ostilità.', { save: 'cha' }),
  s('continualFlame', 'Fiamma perenne', 2, 'evo', 'CW', A, 'Contatto', 'V, S, M', 'Finché non dissolto', '', 'Una fiamma che non scalda né consuma, come una torcia.'),
  s('darkness', 'Oscurità', 2, 'evo', 'SKW', A, '18 m', 'V, M', '10 minuti', 'c', 'Sfera di oscurità magica di 4,5 m di raggio.'),
  s('darkvision', 'Scurovisione', 2, 'tra', 'DRSW', A, 'Contatto', 'V, S, M', '8 ore', '', 'La creatura ottiene Scurovisione 45 m.'),
  s('detectThoughts', 'Individuazione dei pensieri', 2, 'div', 'BSKW', A, 'Sé', 'V, S, M', '1 minuto', 'c', 'Leggi i pensieri superficiali; puoi sondare più a fondo (TS su Saggezza).'),
  s('dragonsBreath', 'Soffio del drago', 2, 'tra', 'SW', BA, 'Contatto', 'V, S, M', '1 minuto', 'c', 'La creatura può esalare un cono di 4,5 m: TS su Destrezza, 3d6 danni del tipo scelto.', { save: 'dex', damage: '3d6', upcast: '1d6' }),
  s('enhanceAbility', 'Potenziare caratteristica', 2, 'tra', 'BCDRSW', A, 'Contatto', 'V, S, M', '1 ora', 'c', 'Vantaggio alle prove di una caratteristica scelta.'),
  s('enlargeReduce', 'Ingrandire/Ridurre', 2, 'tra', 'BDSW', A, '9 m', 'V, S, M', '1 minuto', 'c', 'Il bersaglio cresce (+1d4 danni) o si rimpicciolisce (−1d4 danni) di una taglia.', { save: 'con' }),
  s('findSteed', 'Trovare destriero', 2, 'con', 'P', A, '9 m', 'V, S', I, '', 'Evochi uno spirito leale in forma di cavalcatura.'),
  s('findTraps', 'Trovare trappole', 2, 'div', 'CDR', A, '36 m', 'V, S', I, '', 'Percepisci la presenza di trappole in vista.'),
  s('flamingSphere', 'Sfera infuocata', 2, 'con', 'DW', A, '18 m', 'V, S, M', '1 minuto', 'c', 'Una sfera di fuoco di 1,5 m: TS su Destrezza, 2d6 danni da fuoco; la muovi con un’azione bonus.', { save: 'dex', damage: '2d6', damageType: 'fire', upcast: '1d6' }),
  s('gentleRepose', 'Riposo inviolato', 2, 'nec', 'CPW', A, 'Contatto', 'V, S, M', '10 giorni', 'r', 'Un cadavere non si decompone né può diventare non morto.'),
  s('heatMetal', 'Riscaldare il metallo', 2, 'tra', 'BD', A, '18 m', 'V, S, M', '1 minuto', 'c', 'Un oggetto di metallo arroventato: 2d8 danni da fuoco a chi lo tocca, ripetibile con azione bonus.', { damage: '2d8', damageType: 'fire', upcast: '1d8' }),
  s('holdPerson', 'Blocca persone', 2, 'enc', 'BCDSKW', A, '18 m', 'V, S, M', '1 minuto', 'c', 'TS su Saggezza o l’umanoide è Paralizzato (ripete il TS a fine turno).', { save: 'wis' }),
  s('invisibility', 'Invisibilità', 2, 'ill', 'BSKW', A, 'Contatto', 'V, S, M', '1 ora', 'c', 'La creatura è Invisibile finché non attacca, infligge danni o lancia un incantesimo.'),
  s('knock', 'Scassinare', 2, 'tra', 'BSW', A, '18 m', 'V', I, '', 'Apre una serratura, un lucchetto o una chiusura magica (con un forte rumore).'),
  s('lesserRestoration', 'Ristorare inferiore', 2, 'abj', 'BCDPR', BA, 'Contatto', 'V, S', I, '', 'Rimuove Accecato, Assordato, Paralizzato o Avvelenato.'),
  s('levitate', 'Levitazione', 2, 'tra', 'SW', A, '18 m', 'V, S, M', '10 minuti', 'c', 'Una creatura o oggetto sale fino a 6 m (TS su Costituzione se non consenziente).', { save: 'con' }),
  s('locateObject', 'Localizzare oggetti', 2, 'div', 'BCDPRW', A, 'Sé', 'V, S, M', '10 minuti', 'c', 'Percepisci la direzione di un oggetto noto entro 300 m.'),
  s('magicMouth', 'Bocca magica', 2, 'ill', 'BW', '1 minuto', '9 m', 'V, S, M', 'Finché non dissolto', 'r', 'Un oggetto pronuncia un messaggio quando si verifica una condizione.'),
  s('magicWeapon', 'Arma magica', 2, 'tra', 'PRSW', BA, 'Contatto', 'V, S', '1 ora', '', 'Un’arma non magica diventa +1 (+2 con slot di 3°, +3 di 6°).'),
  s('mirrorImage', 'Immagine speculare', 2, 'ill', 'BSKW', A, 'Sé', 'V, S', '1 minuto', '', 'Tre duplicati illusori che possono deviare gli attacchi.'),
  s('mistyStep', 'Passo velato', 2, 'con', 'SKW', BA, 'Sé', 'V', I, '', 'Ti teletrasporti fino a 9 m in uno spazio libero che vedi.'),
  s('moonbeam', 'Raggio lunare', 2, 'evo', 'D', A, '36 m', 'V, S, M', '1 minuto', 'c', 'Cilindro di luce: TS su Costituzione, 2d10 danni radiosi; lo sposti di 18 m con un’azione bonus.', { save: 'con', damage: '2d10', damageType: 'radiant', upcast: '1d10' }),
  s('passWithoutTrace', 'Passare senza tracce', 2, 'abj', 'DR', A, 'Sé', 'V, S, M', '1 ora', 'c', 'Tu e gli alleati entro 9 m avete +10 a Furtività e non lasciate tracce.'),
  s('prayerOfHealing', 'Preghiera di guarigione', 2, 'abj', 'CP', '10 minuti', '9 m', 'V', I, '', 'Fino a cinque creature recuperano 2d8 + modificatore PF.', { heal: '2d8', upcast: '1d8', addMod: true }),
  s('protectionFromPoison', 'Protezione dal veleno', 2, 'abj', 'CDPR', A, 'Contatto', 'V, S', '1 ora', '', 'Termina Avvelenato; Vantaggio ai TS contro il veleno e resistenza ai danni da veleno.'),
  s('rayOfEnfeeblement', 'Raggio di indebolimento', 2, 'nec', 'KW', A, '18 m', 'V, S', '1 minuto', 'c', 'TS su Costituzione o il bersaglio ha Svantaggio alle prove di Forza e infligge 1d8 danni in meno.', { save: 'con' }),
  s('scorchingRay', 'Raggio rovente', 2, 'evo', 'SW', A, '36 m', 'V, S', I, '', 'Tre raggi di fuoco: attacco con incantesimo, 2d6 danni da fuoco ciascuno (+1 raggio per slot superiore).', { attack: true, damage: '2d6', damageType: 'fire' }),
  s('seeInvisibility', 'Vedere invisibilità', 2, 'div', 'BSW', A, 'Sé', 'V, S, M', '1 ora', '', 'Vedi creature e oggetti Invisibili e nel Piano Etereo.'),
  s('shatter', 'Frantumare', 2, 'evo', 'BSKW', A, '18 m', 'V, S, M', I, '', 'Sfera di 3 m: TS su Costituzione, 3d8 danni da tuono (metà se superato).', { save: 'con', damage: '3d8', damageType: 'thunder', upcast: '1d8' }),
  s('silence', 'Silenzio', 2, 'ill', 'BCR', A, '36 m', 'V, S', '10 minuti', 'cr', 'Sfera di 6 m in cui non si produce suono.'),
  s('spiderClimb', 'Movimento del ragno', 2, 'tra', 'SKW', A, 'Contatto', 'V, S, M', '1 ora', 'c', 'La creatura cammina su pareti e soffitti; Velocità di scalare pari alla Velocità.'),
  s('spiritualWeapon', 'Arma spirituale', 2, 'evo', 'C', BA, '18 m', 'V, S', '1 minuto', 'c', 'Un’arma spettrale: attacco con incantesimo, 1d8 + modificatore danni da forza; la muovi e attacchi con un’azione bonus.', { attack: true, damage: '1d8', damageType: 'force', upcast: '1d8', addMod: true }),
  s('suggestion', 'Suggestione', 2, 'enc', 'BSKW', A, '9 m', 'V, M', '8 ore', 'c', 'TS su Saggezza o il bersaglio segue un suggerimento ragionevole.', { save: 'wis' }),
  s('web', 'Ragnatela', 2, 'con', 'SW', A, '18 m', 'V, S, M', '1 ora', 'c', 'Cubo di 6 m di ragnatele: terreno difficile, TS su Destrezza o Trattenuto.', { save: 'dex' }),
  s('zoneOfTruth', 'Zona di verità', 2, 'enc', 'BCP', A, '18 m', 'V, S', '10 minuti', '', 'Sfera di 4,5 m: chi fallisce un TS su Carisma non può mentire deliberatamente.', { save: 'cha' }),

  // ---------- 3rd level ----------
  s('animateDead', 'Animare morti', 3, 'nec', 'CW', '1 minuto', '3 m', 'V, S, M', I, '', 'Crei uno scheletro o uno zombi che obbedisce ai tuoi comandi per 24 ore.'),
  s('beaconOfHope', 'Faro di speranza', 3, 'abj', 'C', A, '9 m', 'V, S', '1 minuto', 'c', 'Creature scelte hanno Vantaggio ai TS su Saggezza e contro morte e recuperano il massimo dalle cure.'),
  s('bestowCurse', 'Scagliare maledizione', 3, 'nec', 'BCW', A, 'Contatto', 'V, S', '1 minuto', 'c', 'TS su Saggezza o il bersaglio subisce una maledizione a tua scelta.', { save: 'wis' }),
  s('blink', 'Intermittenza', 3, 'tra', 'SW', A, 'Sé', 'V, S', '1 minuto', '', 'A fine turno tiri un d6: con 4-6 svanisci nel Piano Etereo fino al tuo prossimo turno.'),
  s('callLightning', 'Invocare il fulmine', 3, 'con', 'D', A, '36 m', 'V, S', '10 minuti', 'c', 'Una nube tempestosa: a ogni turno un fulmine, TS su Destrezza, 3d10 danni da fulmine.', { save: 'dex', damage: '3d10', damageType: 'lightning', upcast: '1d10' }),
  s('clairvoyance', 'Chiaroveggenza', 3, 'div', 'BCSW', '10 minuti', '1,5 km', 'V, S, M', '10 minuti', 'c', 'Un sensore invisibile ti permette di vedere o sentire in un luogo che conosci.'),
  s('conjureAnimals', 'Evocare animali', 3, 'con', 'DR', A, '18 m', 'V, S', '10 minuti', 'c', 'Un branco spettrale vicino a te: chi ci entra o inizia il turno lì fa TS su Destrezza, 3d10 danni taglienti.', { save: 'dex', damage: '3d10', damageType: 'slashing', upcast: '1d10' }),
  s('counterspell', 'Controincantesimo', 3, 'abj', 'SKW', 'Reazione', '18 m', 'S', I, '', 'Chi sta lanciando un incantesimo fa un TS su Costituzione: se fallisce, l’incantesimo svanisce senza effetto.', { save: 'con' }),
  s('createFoodAndWater', 'Creare cibo e acqua', 3, 'con', 'CP', A, '9 m', 'V, S', I, '', 'Cibo e acqua per quindici creature per un giorno.'),
  s('daylight', 'Luce diurna', 3, 'evo', 'CDPRS', A, '18 m', 'V, S', '1 ora', '', 'Sfera di luce solare di 18 m di raggio che dissolve l’oscurità magica.'),
  s('dispelMagic', 'Dissolvi magie', 3, 'abj', 'BCDPRSKW', A, '36 m', 'V, S', I, '', 'Termina gli incantesimi di 3° livello o inferiore su un bersaglio; per quelli superiori prova di caratteristica.'),
  s('elementalWeapon', 'Arma elementale', 3, 'tra', 'DPRSW', A, 'Contatto', 'V, S', '1 ora', 'c', 'Un’arma diventa +1 e infligge 1d4 danni extra del tipo scelto.'),
  s('fear', 'Paura', 3, 'ill', 'BSKW', A, 'Sé (cono 9 m)', 'V, S, M', '1 minuto', 'c', 'TS su Saggezza o le creature lasciano cadere ciò che tengono e fuggono Spaventate.', { save: 'wis' }),
  s('fireball', 'Palla di fuoco', 3, 'evo', 'SW', A, '45 m', 'V, S, M', I, '', 'Esplosione in una sfera di 6 m: TS su Destrezza, 8d6 danni da fuoco (metà se superato).', { save: 'dex', damage: '8d6', damageType: 'fire', upcast: '1d6' }),
  s('fly', 'Volare', 3, 'tra', 'SKW', A, 'Contatto', 'V, S, M', '10 minuti', 'c', 'La creatura ottiene Velocità di volare 18 m.'),
  s('gaseousForm', 'Forma gassosa', 3, 'tra', 'SKW', A, 'Contatto', 'V, S, M', '1 ora', 'c', 'La creatura diventa una nube: vola a 3 m, resistenza ai danni non magici, passa per le fessure.'),
  s('glyphOfWarding', 'Glifo di interdizione', 3, 'abj', 'BCW', '1 ora', 'Contatto', 'V, S, M', 'Finché non dissolto', '', 'Un glifo invisibile che esplode (5d8) o scatena un incantesimo quando viene attivato.'),
  s('haste', 'Velocità', 3, 'tra', 'SW', A, '9 m', 'V, S, M', '1 minuto', 'c', 'Velocità raddoppiata, +2 CA, Vantaggio ai TS su Destrezza e un’azione extra limitata. Alla fine, un turno di letargia.'),
  s('hypnoticPattern', 'Trama ipnotica', 3, 'ill', 'BSKW', A, '36 m', 'S, M', '1 minuto', 'c', 'Cubo di 9 m: TS su Saggezza o Affascinati e Incapacitati.', { save: 'wis' }),
  s('lightningBolt', 'Fulmine', 3, 'evo', 'SW', A, 'Sé (linea 30 m)', 'V, S, M', I, '', 'Linea di 30 m: TS su Destrezza, 8d6 danni da fulmine (metà se superato).', { save: 'dex', damage: '8d6', damageType: 'lightning', upcast: '1d6' }),
  s('magicCircle', 'Cerchio magico', 3, 'abj', 'CPKW', '1 minuto', '3 m', 'V, S, M', '1 ora', '', 'Un cilindro che ostacola celestiali, elementali, folletti, immondi o non morti.'),
  s('majorImage', 'Immagine maggiore', 3, 'ill', 'BSKW', A, '36 m', 'V, S, M', '10 minuti', 'c', 'Illusione con suoni, odori e temperatura in un cubo di 6 m.'),
  s('massHealingWord', 'Parola guaritrice di massa', 3, 'abj', 'BC', BA, '18 m', 'V', I, '', 'Fino a sei creature recuperano 2d4 + modificatore PF.', { heal: '2d4', upcast: '1d4', addMod: true }),
  s('meldIntoStone', 'Fondersi nella pietra', 3, 'tra', 'CD', A, 'Contatto', 'V, S', '8 ore', 'r', 'Entri in un blocco di pietra abbastanza grande da contenerti.'),
  s('nondetection', 'Anti-individuazione', 3, 'abj', 'BRW', A, 'Contatto', 'V, S, M', '8 ore', '', 'Il bersaglio non può essere individuato dalla divinazione.'),
  s('plantGrowth', 'Crescita vegetale', 3, 'tra', 'BDR', 'Azione o 8 ore', '45 m', 'V, S', I, '', 'Le piante crescono rigogliose: terreno molto difficile, o raccolti doppi per un anno.'),
  s('protectionFromEnergy', 'Protezione dall’energia', 3, 'abj', 'CDRSW', A, 'Contatto', 'V, S', '1 ora', 'c', 'Resistenza a un tipo di danno tra acido, freddo, fuoco, fulmine e tuono.'),
  s('removeCurse', 'Rimuovi maledizione', 3, 'abj', 'CPKW', A, 'Contatto', 'V, S', I, '', 'Termina tutte le maledizioni su una creatura o un oggetto.'),
  s('revivify', 'Rianimare', 3, 'nec', 'CDPR', A, 'Contatto', 'V, S, M', I, '', 'Una creatura morta da meno di un minuto torna in vita con 1 PF (diamante da 300 mo).'),
  s('sending', 'Inviare', 3, 'div', 'BCW', A, 'Illimitata', 'V, S, M', I, '', 'Un messaggio di 25 parole a una creatura che conosci, che può rispondere.'),
  s('sleetStorm', 'Tempesta di nevischio', 3, 'con', 'DSW', A, '45 m', 'V, S, M', '1 minuto', 'c', 'Cilindro di 12 m: terreno difficile, TS su Destrezza o Prono, e la concentrazione vacilla.', { save: 'dex' }),
  s('slow', 'Lentezza', 3, 'tra', 'BSW', A, '36 m', 'V, S, M', '1 minuto', 'c', 'Fino a sei creature: TS su Saggezza o Velocità dimezzata, −2 CA e TS su Destrezza, niente reazioni.', { save: 'wis' }),
  s('speakWithDead', 'Parlare con i morti', 3, 'nec', 'BCW', A, '3 m', 'V, S, M', '10 minuti', '', 'Un cadavere risponde a cinque domande.'),
  s('speakWithPlants', 'Parlare con i vegetali', 3, 'tra', 'BDR', A, 'Sé', 'V, S', '10 minuti', '', 'Comunichi con le piante e le fai muovere.'),
  s('spiritGuardians', 'Guardiani spirituali', 3, 'con', 'C', A, 'Sé', 'V, S, M', '10 minuti', 'c', 'Spiriti ti circondano per 4,5 m: i nemici hanno Velocità dimezzata e subiscono 3d8 danni radiosi o necrotici (TS su Saggezza per metà).', { save: 'wis', damage: '3d8', damageType: 'radiant', upcast: '1d8' }),
  s('stinkingCloud', 'Nube maleodorante', 3, 'con', 'BSW', A, '27 m', 'V, S, M', '1 minuto', 'c', 'Sfera di 6 m: TS su Costituzione o Avvelenati e senza azioni.', { save: 'con' }),
  s('tongues', 'Linguaggi', 3, 'div', 'BCSKW', A, 'Contatto', 'V, M', '1 ora', '', 'La creatura capisce e si fa capire in qualsiasi lingua.'),
  s('vampiricTouch', 'Tocco del vampiro', 3, 'nec', 'SKW', A, 'Sé', 'V, S', '1 minuto', 'c', 'Attacco in mischia con incantesimo: 3d6 danni necrotici e recuperi metà dei danni inflitti; ripetibile a ogni turno.', { attack: true, damage: '3d6', damageType: 'necrotic', upcast: '1d6' }),
  s('waterBreathing', 'Respirare sott’acqua', 3, 'tra', 'DRSW', A, '9 m', 'V, S, M', '24 ore', 'r', 'Fino a dieci creature respirano sott’acqua.'),
  s('waterWalk', 'Camminare sull’acqua', 3, 'tra', 'CDRS', A, '9 m', 'V, S, M', '1 ora', 'r', 'Fino a dieci creature camminano su superfici liquide.'),
  s('windWall', 'Muro di vento', 3, 'evo', 'DR', A, '36 m', 'V, S, M', '1 minuto', 'c', 'Un muro di vento: TS su Forza, 4d8 danni contundenti; devia frecce e gas.', { save: 'str', damage: '4d8', damageType: 'bludgeoning' }),

  // ---------- 4th level ----------
  s('arcaneEye', 'Occhio arcano', 4, 'div', 'W', A, '9 m', 'V, S, M', '1 ora', 'c', 'Un occhio invisibile che vede con Scurovisione e si muove di 9 m a round.'),
  s('auraOfLife', 'Aura di vita', 4, 'abj', 'CP', A, 'Sé', 'V', '10 minuti', 'c', 'Aura di 9 m: resistenza ai necrotici, PF massimi non riducibili, chi è a 0 PF recupera 1 PF.'),
  s('banishment', 'Esilio', 4, 'abj', 'CPSKW', A, '18 m', 'V, S, M', '1 minuto', 'c', 'TS su Carisma o il bersaglio viene esiliato in un semipiano.', { save: 'cha' }),
  s('blight', 'Avvizzire', 4, 'nec', 'DSKW', A, '9 m', 'V, S', I, '', 'TS su Costituzione: 8d8 danni necrotici (metà se superato); le piante lo falliscono.', { save: 'con', damage: '8d8', damageType: 'necrotic', upcast: '1d8' }),
  s('charmMonster', 'Charme sui mostri', 4, 'enc', 'BDSKW', A, '9 m', 'V, S', '1 ora', '', 'Come Charme su persone, ma su qualsiasi creatura.', { save: 'wis' }),
  s('confusion', 'Confusione', 4, 'enc', 'BDSW', A, '27 m', 'V, S, M', '1 minuto', 'c', 'Sfera di 3 m: TS su Saggezza o le creature agiscono a caso.', { save: 'wis' }),
  s('deathWard', 'Interdizione alla morte', 4, 'abj', 'CP', A, 'Contatto', 'V, S', '8 ore', '', 'La prima volta che la creatura scenderebbe a 0 PF, resta a 1 PF.'),
  s('dimensionDoor', 'Porta dimensionale', 4, 'con', 'BSKW', A, '150 m', 'V', I, '', 'Ti teletrasporti (con un compagno) fino a 150 m.'),
  s('divination', 'Divinazione', 4, 'div', 'CDW', A, 'Sé', 'V, S, M', I, 'r', 'Una risposta veritiera su un evento dei prossimi 7 giorni.'),
  s('dominateBeast', 'Dominare bestie', 4, 'enc', 'DRS', A, '18 m', 'V, S', '1 minuto', 'c', 'TS su Saggezza o controlli una bestia.', { save: 'wis' }),
  s('fireShield', 'Scudo di fuoco', 4, 'evo', 'DSW', A, 'Sé', 'V, S, M', '10 minuti', '', 'Resistenza al freddo o al fuoco; chi ti colpisce in mischia subisce 2d8 danni.'),
  s('freedomOfMovement', 'Libertà di movimento', 4, 'abj', 'BCDR', A, 'Contatto', 'V, S, M', '1 ora', '', 'Il terreno difficile e la magia non riducono la Velocità; sfuggi alle prese.'),
  s('greaterInvisibility', 'Invisibilità superiore', 4, 'ill', 'BSW', A, 'Contatto', 'V, S', '1 minuto', 'c', 'La creatura resta Invisibile anche attaccando o lanciando incantesimi.'),
  s('guardianOfFaith', 'Guardiano della fede', 4, 'con', 'CP', A, '9 m', 'V', '8 ore', '', 'Un guardiano spettrale: i nemici che si avvicinano fanno TS su Destrezza o subiscono 20 danni radiosi (fino a 60 in totale).', { save: 'dex', damage: '20', damageType: 'radiant' }),
  s('iceStorm', 'Tempesta di ghiaccio', 4, 'evo', 'DSW', A, '90 m', 'V, S, M', I, '', 'Cilindro di 6 m: TS su Destrezza, 2d10 contundenti + 4d6 da freddo; terreno difficile.', { save: 'dex', damage: '2d10+4d6', damageType: 'cold', upcast: '1d10' }),
  s('phantasmalKiller', 'Assassino fantasmatico', 4, 'ill', 'BW', A, '36 m', 'V, S', '1 minuto', 'c', 'TS su Saggezza o 4d10 danni psichici e Svantaggio agli attacchi; si ripete ogni turno.', { save: 'wis', damage: '4d10', damageType: 'psychic', upcast: '1d10' }),
  s('polymorph', 'Metamorfosi', 4, 'tra', 'BDSW', A, '18 m', 'V, S, M', '1 ora', 'c', 'TS su Saggezza o il bersaglio diventa una bestia di GS pari o inferiore.', { save: 'wis' }),
  s('stoneskin', 'Pelle di pietra', 4, 'tra', 'DRSW', A, 'Contatto', 'V, S, M', '1 ora', 'c', 'Resistenza ai danni contundenti, perforanti e taglienti.'),
  s('wallOfFire', 'Muro di fuoco', 4, 'evo', 'DSW', A, '36 m', 'V, S, M', '1 minuto', 'c', 'Un muro di fiamme: TS su Destrezza, 5d8 danni da fuoco; brucia chi vi entra.', { save: 'dex', damage: '5d8', damageType: 'fire', upcast: '1d8' }),

  // ---------- 5th level ----------
  s('cloudkill', 'Nube mortale', 5, 'con', 'SW', A, '36 m', 'V, S', '10 minuti', 'c', 'Sfera di 6 m di nebbia tossica: TS su Costituzione, 5d8 danni da veleno; si sposta di 3 m a turno.', { save: 'con', damage: '5d8', damageType: 'poison', upcast: '1d8' }),
  s('commune', 'Comunione', 5, 'div', 'C', '1 minuto', 'Sé', 'V, S, M', '1 minuto', 'r', 'Tre domande sì/no alla tua divinità.'),
  s('coneOfCold', 'Cono di freddo', 5, 'evo', 'DSW', A, 'Sé (cono 18 m)', 'V, S, M', I, '', 'TS su Costituzione, 8d8 danni da freddo (metà se superato).', { save: 'con', damage: '8d8', damageType: 'cold', upcast: '1d8' }),
  s('dominatePerson', 'Dominare persone', 5, 'enc', 'BSW', A, '18 m', 'V, S', '1 minuto', 'c', 'TS su Saggezza o controlli un umanoide.', { save: 'wis' }),
  s('flameStrike', 'Colpo infuocato', 5, 'evo', 'CP', A, '18 m', 'V, S, M', I, '', 'Colonna di fuoco divino: TS su Destrezza, 5d6 da fuoco + 5d6 radiosi (metà se superato).', { save: 'dex', damage: '5d6+5d6', damageType: 'fire', upcast: '1d6' }),
  s('geas', 'Costrizione', 5, 'enc', 'BCDPW', '1 minuto', '18 m', 'V', '30 giorni', '', 'TS su Saggezza o la creatura deve eseguire un compito; se non lo fa subisce 5d10 danni psichici.', { save: 'wis' }),
  s('greaterRestoration', 'Ristorare superiore', 5, 'abj', 'BCDPR', A, 'Contatto', 'V, S, M', I, '', 'Rimuove Indebolimento, Affascinato, Pietrificato, maledizioni o riduzioni ai punteggi e ai PF massimi.'),
  s('holdMonster', 'Blocca mostri', 5, 'enc', 'BSKW', A, '27 m', 'V, S, M', '1 minuto', 'c', 'TS su Saggezza o la creatura è Paralizzata.', { save: 'wis' }),
  s('insectPlague', 'Piaga di insetti', 5, 'con', 'CDS', A, '90 m', 'V, S, M', '10 minuti', 'c', 'Sfera di 6 m di locuste: TS su Costituzione, 4d10 danni perforanti.', { save: 'con', damage: '4d10', damageType: 'piercing', upcast: '1d10' }),
  s('legendLore', 'Conoscenza delle leggende', 5, 'div', 'BCW', '10 minuti', 'Sé', 'V, S, M', I, '', 'Informazioni su una persona, un luogo o un oggetto leggendari.'),
  s('massCureWounds', 'Cura ferite di massa', 5, 'abj', 'BCD', A, '18 m', 'V, S', I, '', 'Fino a sei creature in una sfera di 9 m recuperano 5d8 + modificatore PF.', { heal: '5d8', upcast: '1d8', addMod: true }),
  s('raiseDead', 'Rianimare morti', 5, 'nec', 'BCP', '1 ora', 'Contatto', 'V, S, M', I, '', 'Riporta in vita una creatura morta da non più di 10 giorni (diamante da 500 mo).'),
  s('summonDragon', 'Evoca drago', 5, 'con', 'W', A, '18 m', 'V, S, M', '1 ora', 'c', 'Uno spirito draconico combatte al tuo fianco.'),
  s('telekinesis', 'Telecinesi', 5, 'tra', 'SW', A, '18 m', 'V, S', '10 minuti', 'c', 'Muovi creature o oggetti con la mente (TS su Forza).', { save: 'str' }),
  s('treeStride', 'Passo arboreo', 5, 'con', 'DR', A, 'Sé', 'V, S', '1 minuto', 'c', 'Entri in un albero ed esci da un altro entro 150 m.'),
  s('wallOfForce', 'Muro di forza', 5, 'evo', 'W', A, '36 m', 'V, S, M', '10 minuti', 'c', 'Un muro invisibile e indistruttibile.'),
  s('wallOfStone', 'Muro di pietra', 5, 'evo', 'DSW', A, '36 m', 'V, S, M', '10 minuti', 'c', 'Un muro di pietra solida, permanente se mantieni la concentrazione.'),

  // ---------- 6th–9th level ----------
  s('bladeBarrier', 'Barriera di lame', 6, 'evo', 'C', A, '27 m', 'V, S', '10 minuti', 'c', 'Un muro di lame vorticanti: TS su Destrezza, 6d10 danni taglienti.', { save: 'dex', damage: '6d10', damageType: 'slashing' }),
  s('chainLightning', 'Catena di fulmini', 6, 'evo', 'SW', A, '45 m', 'V, S, M', I, '', 'Un fulmine salta tra quattro bersagli: TS su Destrezza, 10d8 danni da fulmine.', { save: 'dex', damage: '10d8', damageType: 'lightning' }),
  s('circleOfDeath', 'Cerchio di morte', 6, 'nec', 'SKW', A, '45 m', 'V, S, M', I, '', 'Sfera di 18 m: TS su Costituzione, 8d8 danni necrotici.', { save: 'con', damage: '8d8', damageType: 'necrotic', upcast: '2d8' }),
  s('disintegrate', 'Disintegrazione', 6, 'tra', 'SW', A, '18 m', 'V, S, M', I, '', 'TS su Destrezza o 10d6 + 40 danni da forza; a 0 PF il bersaglio diventa polvere.', { save: 'dex', damage: '10d6+40', damageType: 'force', upcast: '3d6' }),
  s('harm', 'Ferire', 6, 'nec', 'C', A, '18 m', 'V, S', I, '', 'TS su Costituzione: 14d6 danni necrotici e riduzione dei PF massimi.', { save: 'con', damage: '14d6', damageType: 'necrotic' }),
  s('heal', 'Guarigione', 6, 'abj', 'CD', A, '18 m', 'V, S', I, '', 'La creatura recupera 70 PF e guarisce da Accecato, Assordato e Avvelenato.', { heal: '70', upcast: '10' }),
  s('sunbeam', 'Raggio solare', 6, 'evo', 'DSW', A, 'Sé (linea 18 m)', 'V, S, M', '1 minuto', 'c', 'Un raggio di luce: TS su Costituzione, 6d8 danni radiosi e Accecato; ripetibile.', { save: 'con', damage: '6d8', damageType: 'radiant' }),
  s('trueSeeing', 'Visione del vero', 6, 'div', 'BCSKW', A, 'Contatto', 'V, S, M', '1 ora', '', 'Vista pura entro 36 m.'),
  s('divineWord', 'Parola divina', 7, 'evo', 'BC', BA, '9 m', 'V', I, '', 'Creature scelte fanno TS su Carisma: in base ai PF restano Assordate, Accecate, Stordite o muoiono.', { save: 'cha' }),
  s('fingerOfDeath', 'Dito della morte', 7, 'nec', 'SKW', A, '18 m', 'V, S', I, '', 'TS su Costituzione: 7d8 + 30 danni necrotici; se muore diventa uno zombi.', { save: 'con', damage: '7d8+30', damageType: 'necrotic' }),
  s('fireStorm', 'Tempesta di fuoco', 7, 'evo', 'CDS', A, '45 m', 'V, S', I, '', 'Dieci cubi di 3 m di fiamme: TS su Destrezza, 7d10 danni da fuoco.', { save: 'dex', damage: '7d10', damageType: 'fire' }),
  s('planeShift', 'Spostamento planare', 7, 'con', 'CDSKW', A, 'Contatto', 'V, S, M', I, '', 'Trasporti fino a otto creature in un altro piano.'),
  s('regenerate', 'Rigenerazione', 7, 'tra', 'BCD', '1 minuto', 'Contatto', 'V, S, M', '1 ora', '', 'Recupera 4d8 + 15 PF, poi 1 PF a round, e fa ricrescere arti perduti.', { heal: '4d8+15' }),
  s('resurrection', 'Resurrezione', 7, 'nec', 'BC', '1 ora', 'Contatto', 'V, S, M', I, '', 'Riporta in vita una creatura morta da non più di un secolo (diamante da 1000 mo).'),
  s('teleport', 'Teletrasporto', 7, 'con', 'BSW', A, '3 m', 'V', I, '', 'Trasporta te e fino a otto creature in un luogo sullo stesso piano.'),
  s('powerWordStun', 'Parola del potere stordire', 8, 'enc', 'BSKW', A, '18 m', 'V', I, '', 'Una creatura con 150 PF o meno è Stordita.'),
  s('sunburst', 'Esplosione solare', 8, 'evo', 'DSW', A, '45 m', 'V, S, M', I, '', 'Sfera di 18 m: TS su Costituzione, 12d6 danni radiosi e Accecato.', { save: 'con', damage: '12d6', damageType: 'radiant' }),
  s('meteorSwarm', 'Sciame di meteore', 9, 'evo', 'SW', A, '1,5 km', 'V, S', I, '', 'Quattro sfere di 12 m: TS su Destrezza, 20d6 da fuoco + 20d6 contundenti.', { save: 'dex', damage: '20d6+20d6', damageType: 'fire' }),
  s('powerWordKill', 'Parola del potere uccidere', 9, 'enc', 'BSKW', A, '18 m', 'V', I, '', 'Una creatura con 100 PF o meno muore; altrimenti subisce 12d12 danni psichici.'),
  s('timeStop', 'Fermare il tempo', 9, 'tra', 'SW', A, 'Sé', 'V', I, '', 'Ottieni 1d4 + 1 turni consecutivi.'),
  s('wish', 'Desiderio', 9, 'con', 'SW', A, 'Sé', 'V', I, '', 'L’incantesimo più potente: replica qualsiasi incantesimo di 8° livello o piega la realtà.'),
];

export const spellById = (id: string) => SPELLS.find((x) => x.id === id);

export function spellsFor(classId: string, maxLevel: number): SpellDef[] {
  return SPELLS.filter((sp) => sp.classes.includes(classId) && sp.level <= maxLevel);
}

import type { StatId } from './glossary';

/** Coins: 10 monete d’argento (ma) = 1 moneta d’oro (mo). */

export type ArmorKind = 'cloth' | 'leather' | 'mail' | 'plate' | 'shield';
export const ARMOR_KINDS: Record<ArmorKind, string> = { cloth: 'Stoffa', leather: 'Cuoio', mail: 'Maglia', plate: 'Piastre', shield: 'Scudi' };

export interface ArmorDef {
  id: string;
  name: string;
  kind: ArmorKind;
  /** base armour */
  base: number;
  /** how much DEX adds (null = none, Infinity = all of it) */
  dexMax: number | null;
  reqStr?: number;
  cost: number;
}

const all = Number.POSITIVE_INFINITY;

export const ARMORS: ArmorDef[] = [
  { id: 'garb', name: 'Abiti da avventuriero', kind: 'cloth', base: 2, dexMax: all, cost: 10 },
  { id: 'minor-ench', name: 'Incantamento minore', kind: 'cloth', base: 3, dexMax: all, cost: 100 },
  { id: 'major-ench', name: 'Incantamento maggiore', kind: 'cloth', base: 4, dexMax: all, cost: 1000 },
  { id: 'epic-ench', name: 'Incantamento epico', kind: 'cloth', base: 5, dexMax: all, cost: 10000 },
  { id: 'cheap-hides', name: 'Pelli scadenti', kind: 'leather', base: 3, dexMax: all, cost: 5 },
  { id: 'ox-hide', name: 'Pelle di bue', kind: 'leather', base: 4, dexMax: all, cost: 45 },
  { id: 'hard-leather', name: 'Cuoio duro', kind: 'leather', base: 5, dexMax: all, reqStr: 1, cost: 300 },
  { id: 'wyrmhide', name: 'Pelle di viverna', kind: 'leather', base: 6, dexMax: all, reqStr: 1, cost: 2000 },
  { id: 'rusty-mail', name: 'Maglia arrugginita', kind: 'mail', base: 6, dexMax: 2, cost: 15 },
  { id: 'chain-shirt', name: 'Camicia di maglia', kind: 'mail', base: 9, dexMax: 2, reqStr: 2, cost: 60 },
  { id: 'scale-mail', name: 'Armatura a scaglie', kind: 'mail', base: 12, dexMax: 2, reqStr: 3, cost: 700 },
  { id: 'dragonscale', name: 'Scaglie di drago', kind: 'mail', base: 15, dexMax: 2, reqStr: 4, cost: 3000 },
  { id: 'rusty-plate', name: 'Piastre arrugginite', kind: 'plate', base: 10, dexMax: null, reqStr: 2, cost: 25 },
  { id: 'half-plate', name: 'Mezza armatura', kind: 'plate', base: 14, dexMax: null, reqStr: 3, cost: 200 },
  { id: 'full-plate', name: 'Armatura completa', kind: 'plate', base: 18, dexMax: null, reqStr: 4, cost: 2000 },
  { id: 'mithril-plate', name: 'Piastre di mithril', kind: 'plate', base: 22, dexMax: null, reqStr: 5, cost: 5000 },
];

export const SHIELDS: ArmorDef[] = [
  { id: 'buckler', name: 'Brocchiero di legno', kind: 'shield', base: 2, dexMax: null, cost: 5 },
  { id: 'iron-shield', name: 'Scudo di ferro', kind: 'shield', base: 4, dexMax: null, reqStr: 2, cost: 80 },
  { id: 'tower-shield', name: 'Scudo torre', kind: 'shield', base: 6, dexMax: null, reqStr: 3, cost: 1500 },
  { id: 'dragon-shield', name: 'Scudo di drago', kind: 'shield', base: 8, dexMax: null, reqStr: 3, cost: 9000 },
];

export type WeaponTag = 'blade' | 'staff' | 'wand' | 'melee' | 'ranged';

export interface WeaponDef {
  id: string;
  name: string;
  damage: string;
  stat: StatId;
  type: string;
  /** what the book lists: «A due mani», «Gittata 12»… */
  props: string[];
  twoHanded?: boolean;
  /** 1-handed if STR is at least this (Longsword) */
  oneHandedStr?: number;
  light?: boolean;
  vicious?: boolean;
  thrown?: number;
  range?: number;
  reach?: number;
  load?: number;
  reqStr?: number;
  stack?: number;
  tags: WeaponTag[];
  cost: number;
}

export const WEAPONS: WeaponDef[] = [
  { id: 'dagger', name: 'Pugnale', damage: '1d4', stat: 'dex', type: 'perforante', props: ['Leggera', 'Da lancio 4'], light: true, thrown: 4, tags: ['blade', 'melee'], cost: 3 },
  { id: 'sickle', name: 'Falcetto', damage: '1d4', stat: 'dex', type: 'tagliente', props: ['Brutale'], vicious: true, tags: ['blade', 'melee'], cost: 10 },
  { id: 'club', name: 'Clava/Mazza', damage: '1d6', stat: 'str', type: 'contundente', props: [], tags: ['melee'], cost: 2 },
  { id: 'hand-axe', name: 'Accetta', damage: '1d6', stat: 'str', type: 'tagliente', props: ['Da lancio 4'], thrown: 4, tags: ['melee'], cost: 8 },
  { id: 'short-sword', name: 'Spada corta', damage: '1d6', stat: 'dex', type: 'perforante', props: ['Leggera'], light: true, tags: ['blade', 'melee'], cost: 10 },
  { id: 'rapier', name: 'Stocco', damage: '2d4', stat: 'dex', type: 'perforante', props: [], tags: ['blade', 'melee'], cost: 60 },
  { id: 'staff', name: 'Bastone', damage: '1d8', stat: 'str', type: 'contundente', props: ['A due mani'], twoHanded: true, tags: ['staff', 'melee'], cost: 8 },
  { id: 'longsword', name: 'Spada lunga', damage: '1d8', stat: 'str', type: 'tagliente', props: ['A due mani (a una mano: richiede FOR 2)'], twoHanded: true, oneHandedStr: 2, tags: ['blade', 'melee'], cost: 60 },
  { id: 'battleaxe', name: 'Ascia da battaglia', damage: '1d10', stat: 'str', type: 'tagliente', props: ['A due mani'], twoHanded: true, tags: ['melee'], cost: 30 },
  { id: 'pole-hammer', name: 'Martello in asta', damage: '1d10', stat: 'str', type: 'contundente', props: ['A due mani', 'Portata 2'], twoHanded: true, reach: 2, tags: ['melee'], cost: 60 },
  { id: 'glaive', name: 'Falcione', damage: '1d10', stat: 'str', type: 'tagliente', props: ['A due mani', 'Portata 2'], twoHanded: true, reach: 2, tags: ['blade', 'melee'], cost: 60 },
  { id: 'spear', name: 'Lancia', damage: '1d10', stat: 'str', type: 'perforante', props: ['A due mani', 'Portata 2'], twoHanded: true, reach: 2, tags: ['melee'], cost: 60 },
  { id: 'greatmaul', name: 'Grande maglio', damage: '1d12', stat: 'str', type: 'contundente', props: ['A due mani (richiede FOR 2)'], twoHanded: true, reqStr: 2, tags: ['melee'], cost: 80 },
  { id: 'greataxe', name: 'Ascia bipenne', damage: '2d6', stat: 'str', type: 'tagliente', props: ['A due mani (richiede FOR 2)'], twoHanded: true, reqStr: 2, tags: ['melee'], cost: 100 },
  { id: 'greatsword', name: 'Spadone', damage: '3d4', stat: 'str', type: 'tagliente', props: ['A due mani (richiede FOR 2)', 'tagliente/perforante'], twoHanded: true, reqStr: 2, tags: ['blade', 'melee'], cost: 120 },
  { id: 'sling', name: 'Fionda', damage: '1d4', stat: 'dex', type: 'contundente', props: ['A due mani', 'Gittata 12', 'Brutale'], twoHanded: true, range: 12, vicious: true, tags: ['ranged'], cost: 4 },
  { id: 'javelins', name: 'Giavellotti', damage: '1d6', stat: 'str', type: 'perforante', props: ['Gittata 8', 'Mazzo da 4'], range: 8, stack: 4, tags: ['ranged'], cost: 20 },
  { id: 'throwing-hammers', name: 'Martelli da lancio', damage: '1d8', stat: 'str', type: 'contundente', props: ['Gittata 4', 'Mazzo da 3'], range: 4, stack: 3, tags: ['ranged'], cost: 25 },
  { id: 'shortbow', name: 'Arco corto', damage: '1d6', stat: 'dex', type: 'perforante', props: ['A due mani', 'Gittata 12'], twoHanded: true, range: 12, tags: ['ranged'], cost: 25 },
  { id: 'longbow', name: 'Arco lungo', damage: '1d8', stat: 'dex', type: 'perforante', props: ['A due mani', 'Gittata 16 (richiede FOR 1)'], twoHanded: true, range: 16, reqStr: 1, tags: ['ranged'], cost: 30 },
  { id: 'crossbow', name: 'Balestra', damage: '4d4', stat: 'dex', type: 'perforante', props: ['A due mani', 'Ricarica: 1 azione', 'Gittata 8'], twoHanded: true, load: 1, range: 8, tags: ['ranged'], cost: 60 },
  { id: 'hand-ballista', name: 'Balista a mano', damage: '1d20', stat: 'dex', type: 'perforante', props: ['A due mani', 'Ricarica: 2 azioni', 'Gittata 8 (richiede FOR 2)'], twoHanded: true, load: 2, range: 8, reqStr: 2, tags: ['ranged'], cost: 120 },
];

/** Bare hands: 1d4, on a hit 1+FOR. */
export const UNARMED: WeaponDef = { id: 'unarmed', name: 'Colpo senz’armi', damage: '1d4', stat: 'str', type: 'contundente', props: ['danni: 1+FOR'], tags: ['melee'], cost: 0 };

export interface GearDef {
  id: string;
  name: string;
  text: string;
  /** in gold pieces (0.1 = 1 ma) */
  cost: number;
  slots?: number;
  /** a potion: heals this */
  heal?: string;
}

export const GEAR: GearDef[] = [
  { id: 'healing-potion', name: 'Pozione di guarigione', text: '(azione) Cura 2d4+4 PF.', cost: 50, slots: 0.5, heal: '2d4+4' },
  { id: 'greater-healing-potion', name: 'Pozione di guarigione superiore', text: '(azione) Cura 3d6+6 PF.', cost: 150, slots: 0.5, heal: '3d6+6' },
  { id: 'supreme-healing-potion', name: 'Pozione di guarigione suprema', text: '(azione) Cura 4d8+8 PF.', cost: 450, slots: 0.5, heal: '4d8+8' },
  { id: 'torch', name: 'Torce (2)', text: 'Per quando è buio. Una per sotterraneo; luce fino a 6 caselle.', cost: 0.5 },
  { id: 'lantern', name: 'Lanterna e olio', text: 'Come una torcia, ma meno scenografica; dura fino al prossimo Riposo sicuro (ricarica: 1 mo).', cost: 10 },
  { id: 'pitch', name: 'Fiala di pece', text: 'Appiccicosa e MOLTO infiammabile.', cost: 2 },
  { id: 'rope', name: 'Corda (15 m)', text: 'Una corda serve sempre.', cost: 10 },
  { id: 'chain', name: 'Catena (3 m)', text: 'Come una corda, ma più robusta (e pesante).', cost: 50 },
  { id: 'bucket', name: 'Secchio', text: 'All’occorrenza fa anche da elmo!', cost: 1 },
  { id: 'padlock', name: 'Lucchetto e chiave', text: 'Chiudilo o perdilo.', cost: 3 },
  { id: 'mirror', name: 'Specchio', text: 'Per le meduse E per gli spinaci tra i denti.', cost: 4 },
  { id: 'telescope', name: 'Cannocchiale', text: 'Arrr.', cost: 10 },
  { id: 'magnifying-glass', name: 'Lente d’ingrandimento', text: 'Fa diventare grande il piccolo.', cost: 5 },
  { id: 'chalk', name: 'Gesso', text: 'Non SOLO per bambini.', cost: 0.1 },
  { id: 'shovel', name: 'Pala', text: 'A volte serve una buca.', cost: 3 },
  { id: 'pulley', name: 'Carrucola', text: 'Tiri giù, vai su.', cost: 3 },
  { id: 'grappling-hook', name: 'Rampino', text: 'Per arrampicarsi o pescare pesci MOLTO grossi.', cost: 4 },
  { id: 'quiver', name: 'Faretra e munizioni', text: 'Non uscire senza. Di norma le frecce non si contano.', cost: 10 },
  { id: 'saw', name: 'Sega', text: 'Per tagliare legna.', cost: 4 },
  { id: 'soap', name: 'Sapone', text: 'Inutile.', cost: 0.1 },
  { id: 'strange-plant', name: 'Pianta strana', text: 'Chi lo sa?', cost: 0.5 },
  { id: 'shiny-object', name: 'Oggetto luccicante', text: 'Senza valore, ma MOLTO carino.', cost: 0.1 },
  { id: 'lock-pick', name: 'Grimaldello', text: 'Non è mio, giuro!', cost: 5 },
  { id: 'bell', name: 'Campanello', text: 'Per il servizio.', cost: 2 },
  { id: 'dice', name: 'Dadi', text: 'TANTO divertimento.', cost: 0.5 },
  { id: 'blanket', name: 'Coperta', text: 'Calda e morbida.', cost: 1 },
  { id: 'hunting-trap', name: 'Tagliola', text: 'Snap snap, attento alle dita!', cost: 10 },
  { id: 'camping', name: 'Attrezzatura da campo', text: 'Giaciglio, razioni, tenda semplice.', cost: 5 },
  { id: 'crowbar', name: 'Piede di porco', text: 'È COME una chiave.', cost: 2 },
  { id: 'pitons', name: 'Chiodi da roccia', text: 'Spuntoni di metallo, per bloccare le porte.', cost: 5 },
  { id: 'manacles', name: 'Manette', text: 'Per chi si è comportato male.', cost: 3 },
  { id: 'large-sack', name: 'Sacco grande', text: 'Come una tasca GRANDE.', cost: 0.5 },
  { id: 'instrument', name: 'Strumento musicale', text: 'Tamburo, corno, lira, flauto… (5–50 mo).', cost: 25 },
  { id: 'rations', name: 'Razioni', text: 'Cibo per il viaggio.', cost: 0.5 },
  { id: 'robes', name: 'Vesti da viaggio e sandali', text: 'Leggere, per chi combatte senza armatura.', cost: 1 },
];

/** Spell scrolls and wands: typical prices by tier (0 = cantrip). */
export const SCROLL_PRICES = [10, 35, 100, 300, 1000, 3000, 10000, 25000, 75000, 200000];
export const WAND_PRICES = [50, 175, 500, 1500, 5000, 15000, 50000, 125000, 375000, 1000000];

export const RARITY: Record<string, { name: string; levels: string; price: string }> = {
  uncommon: { name: 'Non comune', levels: 'livelli 2–6', price: '50–500+ mo' },
  rare: { name: 'Raro', levels: 'livelli 5–12', price: '500–5.000+ mo' },
  veryRare: { name: 'Molto raro', levels: 'livelli 8–18', price: '5.000–500.000+ mo' },
  legendary: { name: 'Leggendario', levels: 'livelli 15–20', price: '1.000.000+ mo o inestimabile' },
};

export interface MagicItemDef {
  id: string;
  name: string;
  rarity: keyof typeof RARITY | 'varies';
  text: string;
}

export const MAGIC_ITEMS: MagicItemDef[] = [
  { id: 'many-hands', name: 'Arma dalle molte mani', rarity: 'varies', text: 'Finché è impugnata dà braccia in più, che fanno tutto quello che fanno le mani normali (impugnare, Lottare, arrampicarsi), ma non permettono di agire più in fretta. 1 mano in più: non comune; 4: leggendaria. Sì: puoi impugnare due armi a due mani o più scudi.' },
  { id: 'harbinger-sovereign', name: 'Araldo e Sovrano, Pretesa dell’Abisso', rarity: 'legendary', text: 'Due falcioni gemelli: +4 braccia finché sono impugnati entrambi.' },
  { id: 'animosity', name: 'Arma dell’animosità', rarity: 'varies', text: 'A ogni attacco tira un dado di animosità in più: se colpisci, il bersaglio subisce quei danni extra; se manchi, li subisci tu. +1d4: non comune; +1d10 o più: leggendaria.' },
  { id: 'slaying', name: 'Arma dello sterminio', rarity: 'varies', text: 'Un dado di danni in più contro un tipo di creatura (che potrebbe provare a ucciderti per primo). +1d4: non comune; +1d10 o più: leggendaria.' },
  { id: 'gnatbane', name: 'Arma ammazzamoscerini', rarity: 'uncommon', text: 'Non manca mai le creature Piccole o Minuscole (che potrebbero odiarti e attaccarti per prime).' },
  { id: 'wounding', name: 'Arma delle ferite', rarity: 'uncommon', text: 'Quando colpisci, puoi subire 1d6 danni per infliggerne il doppio in più al bersaglio.' },
  { id: 'ill-omen', name: 'Ninnolo del malaugurio', rarity: 'rare', text: 'Indossato: −1 ai tuoi TS e +1 alla CD dei tuoi TS.' },
  { id: 'mindlink', name: 'Pugnali del legame mentale', rarity: 'rare', text: 'Due pugnali d’argento con rune intrecciate: chi ne impugna (o ne è trafitto) uno condivide i pensieri con chi tiene l’altro.' },
  { id: 'quill', name: 'Penna insanguinata', rarity: 'uncommon', text: 'Intinta nel sangue di una creatura intelligente morta, si anima e scrive le sue ultime parole.' },
  { id: 'street-eyes', name: 'Occhi della strada', rarity: 'uncommon', text: 'Occhialoni incrostati: guardando un ratto o un piccione vedi e senti con i suoi sensi per 10 minuti. Per riusarli devi sussurrargli un segreto, che presto diventerà una voce di paese…' },
  { id: 'force-wraps', name: 'Fasce della forza', rarity: 'rare', text: 'Coi colpi senz’armi puoi spingere il bersaglio fino a 2 caselle e te stesso altrettanto dalla parte opposta; oppure colpire l’aria per spingerti di 4 caselle in qualsiasi direzione.' },
  { id: 'golden-bastion', name: 'Zanne risolute, Bastione d’oro', rarity: 'legendary', text: 'Scudo, +8 Armatura. Reazione: quando riduci i danni di un attacco in mischia, afferra l’attaccante di qualsiasi taglia (fuga CD 20 FOR, max 1). Azione: con la parola di comando diventa inamovibile, finché non la ripeti.' },
  { id: 'key-of-doors', name: 'Chiave delle porte', rarity: 'veryRare', text: 'Infilata in una porta chiusa a chiave la apre non sulla stanza oltre, ma su qualunque porta tu abbia attraversato tenendola con te.' },
  { id: 'grim-coronet', name: 'Corona funesta', rarity: 'rare', text: 'Quando moriresti indossandola, ottieni 3 azioni e fai subito un turno; muori alla fine del turno.' },
  { id: 'vindication', name: 'Rivalsa', rarity: 'legendary', text: 'Arma dell’animosità leggendaria, lama seghettata e bruciata: +1d12 danni; se manchi li subisci tu.' },
  { id: 'pocket-cauldron', name: 'Calderone tascabile', rarity: 'rare', text: 'Durante un Riposo sicuro prepara una pozione da bere subito: Elisir della preveggenza (una visione criptica del futuro), Elisir del requiem (rivivi un ricordo cruciale), Elisir del tempo (una volta ogni 100 anni: torna indietro di 1 giorno).' },
  { id: 'phoenix-helm', name: 'Elmo della fenice', rarity: 'legendary', text: 'Se muori indossandolo rinasci come fenice di fuoco dorato: i nemici entro 6 caselle subiscono LIV d10 danni da fuoco (TS su DES CD 10+CHIAVE, metà se riesce). Volo 10, Armatura 10, 10×LIV PF; chi ti tocca subisce LIV danni da fuoco; Artigli infuocati (1 azione) 1d10+LIV. Dopo 10 minuti l’elmo svanisce e torni con 0 PF e tutte le Ferite tranne una.' },
  { id: 'spider-ball', name: 'Palla di ragni', rarity: 'uncommon', text: 'Azione: lanciala fino a 6 caselle; libera ragni spettrali innocui ma orribili in un’area 2×2: TS su VOL o Spaventato fino alla fine del prossimo turno. Si ricompone al Riposo sicuro.' },
  { id: 'skitter-shoes', name: 'Scarpe zampettanti', rarity: 'rare', text: 'Cammini su pareti e soffitti a metà velocità. Se finisci il turno a testa in giù o in verticale: TS su FOR CD 10 o cadi Prono.' },
  { id: 'protection-button', name: 'Bottone della protezione', rarity: 'rare', text: 'Reazione quando sei attaccato: strappalo e lancialo in aria; lampo e fischio acuto: l’attaccante fa un TS su VOL o ti manca. Poi è inerte finché un sarto esperto non lo ricuce con filo d’argento durante un Riposo sicuro.' },
  { id: 'escape-gem', name: 'Gemma della fuga', rarity: 'rare', text: 'Sempre in coppia. Frantumarne una (1 azione) teletrasporta tutti quelli legati alla gemma dove si trova l’altra.' },
  { id: 'glacier-bottle', name: 'Ghiacciaio in bottiglia', rarity: 'uncommon', text: 'Versato (1 azione) crea ghiaccio solido in caselle libere consecutive fino a 6 caselle di distanza e 2 di altezza, per 1 ora. 1/Riposo sicuro.' },
  { id: 'grimoire', name: 'Grimorio delle verità', rarity: 'rare', text: 'Libro senziente che sa molto del mondo e parla volentieri col suo padrone: dà quanto basta per guadagnarsi la sua fiducia… e portarlo nei guai.' },
  { id: 'hear-ring', name: 'Orecchino-ascolto', rarity: 'uncommon', text: 'Chi li indossa comunica con gli altri portatori a qualsiasi distanza. Spesso in coppia, a volte in serie più grandi.' },
  { id: 'lumina', name: 'Lumina, raggio di sole vivente', rarity: 'rare', text: 'Una sferetta di luce sorridente. Una sola volta (azione): LIV d6 danni radianti a tutti i nemici entro 6 caselle e cura della stessa quantità gli alleati nell’area.' },
  { id: 'manglemaul', name: 'Stritolamaglio', rarity: 'rare', text: 'Maglio a due mani, 1d6+FOR contundente. Se colpisci puoi afferrare una creatura più piccola di te (fuga CD 10). Azione: scaglia la creatura afferrata contro un’altra entro portata, danneggiando entrambe e ponendo fine alla presa.' },
];

/** Wands from the book (cantrip = tier 0). */
export const WANDS: { name: string; rarity: keyof typeof RARITY; tier: number; charges: number; recharge: string }[] = [
  { name: 'Bacchetta di Passo di fuoco', rarity: 'uncommon', tier: 0, charges: 3, recharge: 'Scaldala in una forgia finché non è rovente, poi temprala nell’olio.' },
  { name: 'Bacchetta di Volto del terrore', rarity: 'uncommon', tier: 2, charges: 2, recharge: 'Lasciala in un cadavere fresco finché non restano solo le ossa.' },
  { name: 'Bacchetta di Volo', rarity: 'uncommon', tier: 3, charges: 2, recharge: 'Dalla a un uccello selvatico e lascialo volare; recuperala dove la lascia cadere.' },
  { name: 'Bacchetta di Barriera di vento', rarity: 'rare', tier: 2, charges: 3, recharge: 'Appendila con dei campanelli al vento in un posto ventoso per 3 giorni.' },
  { name: 'Bacchetta di Cavalcare il fulmine', rarity: 'veryRare', tier: 6, charges: 2, recharge: 'Mettila nel punto più alto entro un miglio; riprendila dopo 3 temporali.' },
  { name: 'Bacchetta di Sacrificio', rarity: 'veryRare', tier: 6, charges: 1, recharge: 'Piantala in un giardino nuovo e lasciala finché non sbocciano i fiori.' },
  { name: 'Bacchetta di Colpo del ghiacciaio', rarity: 'veryRare', tier: 8, charges: 1, recharge: 'Lasciala in fondo a un lago finché non gela e disgela da solo.' },
  { name: 'Maestà del drago antico', rarity: 'legendary', tier: 9, charges: 1, recharge: 'Fai a un drago antico un dono che desidera davvero. Lancia Forma di drago, del tipo dell’ultimo drago che l’ha caricata.' },
  { name: 'Cuore di legno, scheggia dell’Albero della Vita', rarity: 'legendary', tier: 9, charges: 1, recharge: 'Un inno sacro va cantato su di essa senza sosta per 100 anni. Lancia Redenzione senza componenti.' },
];

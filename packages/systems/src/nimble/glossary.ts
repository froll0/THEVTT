/**
 * Nimble (Nimble Co., 2025) in italiano. Ogni termine di regola ha una sola
 * traduzione, usata ovunque (scheda, incantesimi, mostri, tavolo): qui sotto
 * c'è l'elenco, con l'originale inglese accanto per chi confronta col manuale.
 *
 * «Nimble» è un prodotto indipendente pubblicato con la Nimble 3rd Party
 * Creator License; non è affiliato a Nimble Co. Nimble © 2025 Nimble Co.
 */

export type StatId = 'str' | 'dex' | 'int' | 'wil';
export const STATS: StatId[] = ['str', 'dex', 'int', 'wil'];

export const STAT_INFO: Record<StatId, { name: string; short: string; en: string; text: string }> = {
  str: {
    name: 'Forza',
    short: 'FOR',
    en: 'Strength (STR)',
    text: 'Potenza fisica, resistenza e tenuta. Danni delle armi di FOR, Ferite, recupero dei PF, Concentrazione, TS su FOR, carico, Lottare e l’abilità Potenza.',
  },
  dex: {
    name: 'Destrezza',
    short: 'DES',
    en: 'Dexterity (DEX)',
    text: 'Agilità, riflessi e precisione con lame e archi. Danni delle armi di DES, Iniziativa, TS su DES, Lottare, Armatura, e le abilità Furtività e Finezza.',
  },
  int: {
    name: 'Intelligenza',
    short: 'INT',
    en: 'Intelligence (INT)',
    text: 'Conoscenza e ragionamento. Lingue, incantesimi, bacchette e pergamene, TS su INT, e le abilità Arcano, Analisi e Cultura.',
  },
  wil: {
    name: 'Volontà',
    short: 'VOL',
    en: 'Will (WIL)',
    text: 'Forza di carattere, coraggio e saggezza. Incantesimi, TS su VOL, e le abilità Intuito, Influenza, Natura e Percezione.',
  },
};

export type SkillId = 'arcana' | 'examination' | 'finesse' | 'influence' | 'insight' | 'might' | 'lore' | 'naturecraft' | 'perception' | 'stealth';
export const SKILLS: SkillId[] = ['arcana', 'examination', 'finesse', 'influence', 'insight', 'might', 'lore', 'naturecraft', 'perception', 'stealth'];

export const SKILL_INFO: Record<SkillId, { name: string; stat: StatId; en: string; text: string }> = {
  arcana: { name: 'Arcano', stat: 'int', en: 'Arcana', text: 'Fenomeni magici, incantesimi e incantamenti; punti deboli di Aberrazioni, Elementali e Melme.' },
  examination: { name: 'Analisi', stat: 'int', en: 'Examination', text: 'Esaminare e dedurre: ferite, cause di morte, indizi, trappole e meccanismi; punti deboli dei Costrutti.' },
  finesse: { name: 'Finezza', stat: 'dex', en: 'Finesse', text: 'Mani e piedi usati con cura: serrature, trappole, guidare, trucchi con le carte, borseggiare, scalare con attenzione.' },
  influence: { name: 'Influenza', stat: 'wil', en: 'Influence', text: 'Convincere o ingannare, trattare, conquistare fiducia e alleati, esibirsi.' },
  insight: { name: 'Intuito', stat: 'wil', en: 'Insight', text: 'Capire persone e situazioni: intenzioni, bugie, emozioni nascoste. Può cambiare le cose a posteriori («ci avevi pensato?»).' },
  might: { name: 'Potenza', stat: 'str', en: 'Might', text: 'Usare la forza: sollevare, sfondare, arrampicarsi, nuotare, saltare.' },
  lore: { name: 'Cultura', stat: 'int', en: 'Lore', text: 'Storia, regni e religioni; Celestiali, Draghi, Fatati, Immondi, Giganti, Umanoidi e Non morti.' },
  naturecraft: { name: 'Natura', stat: 'wil', en: 'Naturecraft', text: 'Sopravvivere nelle terre selvagge, orientarsi, seguire tracce, trattare gli animali; Bestie, Mostruosità e Piante.' },
  perception: { name: 'Percezione', stat: 'wil', en: 'Perception', text: 'Notare dettagli: oggetti nascosti, passaggi segreti, chi ti segue o ti osserva.' },
  stealth: { name: 'Furtività', stat: 'dex', en: 'Stealth', text: 'Restare nascosti e muoversi in silenzio.' },
};

/** Conditions on the token menu, in the order of the book. */
export const CONDITIONS = [
  'Accecato',
  'Sanguinante',
  'Affascinato',
  'Frastornato',
  'Morente',
  'Spaventato',
  'Afferrato',
  'Trattenuto',
  'Impacciato',
  'Inerme',
  'Invisibile',
  'Pietrificato',
  'Avvelenato',
  'Prono',
  'In groppa',
  'Rallentato',
  'Provocato',
  'Ferito',
  'Fumante',
  'Elettrizzato',
  'Distratto',
  'Nascosto',
  'Concentrato',
];

export const CONDITION_INFO: Record<string, string> = {
  Accecato: 'Non vede. Gli attacchi contro di te hanno vantaggio, i tuoi svantaggio. (Blinded)',
  Sanguinante: 'A metà dei PF o meno. (Bloodied)',
  Affascinato: 'Vede chi l’ha affascinato come un alleato; questi ha vantaggio nelle interazioni sociali con lui. (Charmed)',
  Frastornato: 'Eroi: perdono 1 azione; mostri: un’azione in meno al prossimo turno. (Dazed)',
  Morente: 'A 0 PF. Subire danni causa 2 Ferite, un critico 3. Al massimo 1 azione; attaccare o lanciare costa 1 Ferita salvo un TS su FOR CD 10. (Dying)',
  Spaventato: 'Svantaggio ai tiri quando la fonte della paura è vicina; velocità dimezzata avvicinandosi. (Frightened)',
  Afferrato: 'Non può muoversi; gli attacchi contro di lui hanno vantaggio. Finisce con uno spostamento forzato, se chi afferra è inerme, o con un’azione e un TS su FOR o DES riuscito. (Grappled)',
  Trattenuto: 'Come Afferrato, ma per opera di oggetti (catene, corde, radici) e senza limiti di taglia; finisce con ogni mezzo logico. (Restrained)',
  Impacciato: 'Chiunque abbia azioni o movimento ridotti (Frastornato, Afferrato, Prono, terreno difficile…). (Hampered)',
  Inerme: 'Non può fare nulla. Gli attacchi contro di lui hanno vantaggio e quelli in mischia che colpiscono sono critici. (Incapacitated)',
  Invisibile: 'Non può essere visto. I tuoi attacchi hanno vantaggio, quelli contro di te svantaggio. (Invisible)',
  Pietrificato: 'Inerme, con tutti i pregi e i difetti di una roccia: immune alla maggior parte dei danni. (Petrified)',
  Avvelenato: 'Svantaggio ai tiri. (Poisoned)',
  Prono: 'Muoversi costa il doppio, svantaggio agli attacchi. Gli attacchi in mischia contro di lui hanno vantaggio, quelli a distanza svantaggio. Rialzarsi costa 3 caselle. (Prone)',
  'In groppa': 'Ti muovi con la creatura su cui sei; gli attacchi che ti mancano colpiscono lei. (Riding)',
  Rallentato: 'Velocità dimezzata nel prossimo turno. (Slowed)',
  Provocato: 'Svantaggio agli attacchi, tranne contro l’ultimo che l’ha provocato. (Taunted)',
  Ferito: 'Ha delle Ferite (di solito con 6 un eroe muore). (Wounded)',
  Fumante: 'Stato minore: da solo non fa nulla, ma alcuni incantesimi di Fuoco hanno effetti in più. Finisce con lo scontro. (Smoldering)',
  Elettrizzato: 'Stato minore: chi subisce danni da fulmine lo è per 1 minuto; alcuni incantesimi di Fulmine lo usano. (Charged)',
  Distratto: 'Adiacente a un tuo alleato, provocato da un tuo alleato, o non può vederti. (Distracted)',
  Nascosto: 'Il primo attacco che fai da nascosto ha vantaggio, poi non lo sei più (salvo se uccidi e nessun altro ti vede).',
  Concentrato: 'Mantiene un effetto. Se subisce un critico: TS su FOR CD 10 o la concentrazione si rompe; si rompe a 0 PF o da inerme.',
};

export const DAMAGE_TYPES = ['tagliente', 'perforante', 'contundente', 'fuoco', 'freddo', 'fulmine', 'radiante', 'necrotico', 'psichico', 'acido', 'veleno'] as const;

/** Sizes, and how many cells a creature fills. */
export const SIZES: Record<string, { name: string; cells: number }> = {
  tiny: { name: 'Minuscola', cells: 1 },
  small: { name: 'Piccola', cells: 1 },
  medium: { name: 'Media', cells: 1 },
  large: { name: 'Grande', cells: 2 },
  huge: { name: 'Enorme', cells: 3 },
  gargantuan: { name: 'Mastodontica', cells: 4 },
};

/** The terms, Italian and English: the reference for the whole module (and the compendium). */
export const GLOSSARY: { it: string; en: string; text: string }[] = [
  { it: 'CHIAVE', en: 'KEY', text: 'Una delle due caratteristiche chiave della tua classe. Davanti a un dado («VOL d8») significa tanti dadi quanto vale la caratteristica.' },
  { it: 'LIV', en: 'LVL', text: 'Il livello dell’eroe.' },
  { it: 'Tiro salvezza (TS)', en: 'Save', text: '1d20 + caratteristica contro una CD. Ogni eroe ha un TS favorito (+), uno sfavorito (–) e due neutri. Un 1 fallisce sempre, un 20 riesce sempre.' },
  { it: 'Prova di abilità', en: 'Skill check', text: '1d20 + abilità contro una CD (facile 8, media 12, impegnativa 15, molto difficile 18, estrema 20+). Bonus massimo di un’abilità: +12.' },
  { it: 'CD', en: 'DC', text: 'Classe di Difficoltà. Gli effetti degli eroi hanno CD 10+CHIAVE salvo diversa indicazione.' },
  { it: 'Vantaggio X / Svantaggio X', en: 'Advantage / Disadvantage X', text: 'Tira X dadi in più e scarta i più bassi (vantaggio) o i più alti (svantaggio); a parità si scarta da sinistra. Ogni vantaggio annulla uno svantaggio.' },
  { it: 'Dado primario', en: 'Primary Die', text: 'Il dado più a sinistra di un attacco: con 1 l’attacco manca, col massimo è un critico.' },
  { it: 'Critico esplosivo', en: 'Exploding Critical Hit', text: 'Col massimo sul dado primario ritira il dado primario e aggiungilo, di nuovo a ogni massimo. I critici ignorano l’armatura dei mostri.' },
  { it: 'Attacchi affrettati', en: 'Rushed Attacks', text: 'Ogni attacco dopo il primo nello stesso turno ha uno svantaggio cumulativo (ai TS che provochi, i nemici hanno vantaggio cumulativo).' },
  { it: 'Azioni eroiche', en: 'Heroic Actions', text: 'Nel tuo turno hai 3 azioni: Attaccare, Lanciare un incantesimo, Muoversi, Valutare. Tornano tutte alla fine del tuo turno.' },
  { it: 'Valutare', en: 'Assess', text: 'Prova di abilità CD 12 per: Fare una domanda, Creare un’apertura (+1 al prossimo dado primario contro il bersaglio, questo round) o Anticipare il pericolo (−1 ai dadi primari contro di te, questo round). Non due volte con la stessa abilità nello stesso scontro.' },
  { it: 'Reazioni eroiche', en: 'Heroic Reactions', text: 'Costano 1 azione, fuori dal tuo turno, ognuna al massimo 1 volta per round: Difendersi, Interporsi, Attacco d’opportunità, Aiutare.' },
  { it: 'Difendersi', en: 'Defend', text: 'Riduci il danno di un attacco del valore della tua Armatura.' },
  { it: 'Interporsi', en: 'Interpose', text: 'Se una creatura entro 2 caselle sta per essere colpita, spingila via e diventa tu il bersaglio.' },
  { it: 'Attacco d’opportunità', en: 'Opportunity Attack', text: 'Attacco in mischia con svantaggio contro un nemico adiacente che si allontana volontariamente. Solo gli eroi.' },
  { it: 'Aiutare', en: 'Help', text: 'Dai vantaggio al tiro di un alleato, se spieghi come (uno per tiro).' },
  { it: 'Armatura', en: 'Armor', text: 'Eroi: quanto toglie Difendersi (senza armatura vale la DES). Mostri: nessuna, media (M: solo i dadi, niente modificatori) o pesante (P: metà dei dadi).' },
  { it: 'Gregario', en: 'Minion', text: 'Muore con qualsiasi danno; non fa critici; più gregari che attaccano lo stesso eroe contano come un solo attacco.' },
  { it: 'Tirapiedi', en: 'Flunky', text: 'Come un mostro normale, ma non fa critici.' },
  { it: 'Ferite', en: 'Wounds', text: 'Danni gravi e duraturi. A 0 PF ne prendi 1 e diventi Morente; con 6 Ferite muori. Ne guarisci 1 per Riposo sicuro.' },
  { it: 'Dadi Vita (DV)', en: 'Hit Dice', text: 'Si spendono per recuperare PF; massimo pari al livello. Tornano col Riposo sicuro.' },
  { it: 'Riposo sul campo', en: 'Field Rest', text: 'Riprendere fiato (10 minuti): spendi DV, tirali e aggiungi FOR a ciascuno. Accamparsi (8 ore con cibo e sonno): ogni DV vale il massimo + FOR.' },
  { it: 'Riposo sicuro', en: 'Safe Rest', text: 'In un luogo sicuro (una locanda): tornano tutti i PF, i DV, il mana e le risorse di classe; guarisci 1 Ferita.' },
  { it: 'Iniziativa', en: 'Initiative', text: '1d20 + Iniziativa (di solito DES). Una cifra: inizi con 1 azione; due cifre: 2; 20 o più: 3. Di norma gli eroi agiscono prima, i mostri per ultimi.' },
  { it: 'Gittata X', en: 'Range X', text: 'Attacchi a distanza: svantaggio se un nemico ti è adiacente. Con 1 svantaggio in più ottieni +2 di gittata (massimo +6).' },
  { it: 'Portata X', en: 'Reach X', text: 'L’area entro X caselle. Senza indicazioni, Portata 1. Non soffre lo svantaggio in mischia.' },
  { it: 'Trucchetto', en: 'Cantrip', text: 'Incantesimo base, costa 0 mana e cresce coi livelli.' },
  { it: 'Grado', en: 'Tier', text: 'Il grado di un incantesimo (1–9): costa tanto mana quanto il grado.' },
  { it: 'Potenziare', en: 'Upcast', text: 'Spendere mana in più (fino al grado sbloccato) per un effetto più forte.' },
  { it: 'Bersaglio singolo / Multiplo / Area', en: 'Single Target / Multi-target / AoE', text: 'Gli attacchi ad area o a più bersagli non mancano e non fanno critici: un solo tiro per tutti.' },
  { it: 'd44, d66, d88', en: 'd44, d66, d88', text: 'Due dadi uguali: il primo dà le decine, il secondo le unità. Non mancano e non fanno critici.' },
  { it: 'Brutale', en: 'Vicious', text: 'Ogni volta che tiri i danni di un critico, tira un dado in più.' },
  { it: 'Impacciato', en: 'Hampered', text: 'Chi ha azioni o movimento ridotti: Frastornato, Rallentato, Afferrato, Trattenuto, Prono, nel terreno difficile.' },
  { it: 'Spazi d’inventario', en: 'Inventory Slots', text: '10+FOR. 1 spazio: un’arma a una mano, uno scudo, l’armatura indossata, 500 mo, 2 pozioni. 2 spazi: un’arma a due mani, un’armatura non indossata.' },
  { it: 'Scontro', en: 'Encounter', text: 'Comincia quando si tira l’Iniziativa e finisce con le ostilità.' },
  { it: 'Leggendario', en: 'Legendary', text: 'Mostro solitario che agisce dopo il turno di ogni eroe, con poteri da Sanguinante e un’Ultima resistenza.' },
  { it: 'Ultima resistenza', en: 'Last Stand', text: 'Un mostro leggendario a 0 PF sta morendo ma diventa più pericoloso; muore dopo altri danni indicati.' },
];

/** Species from SRD 5.2 (speeds and senses in metres). */

import type { Skill } from './data';

export type Size = 'small' | 'medium';

export interface Trait {
  name: string;
  description: string;
  level?: number;
}

export interface SpeciesChoice {
  /** stored under character.speciesChoices[key] */
  key: string;
  label: string;
  options: { id: string; name: string; description: string }[];
}

export interface SpeciesDef {
  id: string;
  name: string;
  description: string;
  sizes: Size[];
  speed: number;
  darkvision: number;
  traits: Trait[];
  choice?: SpeciesChoice;
  /** extra skill proficiency granted by the species */
  skillChoice?: { count: number; from: Skill[] | null };
  /** Human Versatile: an extra origin feat */
  originFeat?: boolean;
  hpPerLevel?: number;
  resistances?: string[];
}

const DAMAGE = (type: string) => type;

export const SPECIES: SpeciesDef[] = [
  {
    id: 'dragonborn',
    name: 'Dragonide',
    description: 'Discendenti dei draghi, con scaglie e un soffio elementale.',
    sizes: ['medium'],
    speed: 9,
    darkvision: 18,
    choice: {
      key: 'ancestry',
      label: 'Ascendenza draconica',
      options: [
        { id: 'black', name: 'Nero', description: 'Acido' },
        { id: 'blue', name: 'Blu', description: 'Fulmine' },
        { id: 'brass', name: 'Ottone', description: 'Fuoco' },
        { id: 'bronze', name: 'Bronzo', description: 'Fulmine' },
        { id: 'copper', name: 'Rame', description: 'Acido' },
        { id: 'gold', name: 'Oro', description: 'Fuoco' },
        { id: 'green', name: 'Verde', description: 'Veleno' },
        { id: 'red', name: 'Rosso', description: 'Fuoco' },
        { id: 'silver', name: 'Argento', description: 'Freddo' },
        { id: 'white', name: 'Bianco', description: 'Freddo' },
      ],
    },
    traits: [
      { name: 'Ascendenza draconica', description: 'Il tipo di drago da cui discendi determina il danno del soffio e la resistenza.' },
      {
        name: 'Arma a soffio',
        description:
          'Al posto di un attacco dell’azione di Attacco: cono di 4,5 m o linea di 9 m. TS su Destrezza (CD 8 + Cos + competenza), 1d10 danni (2d10 al 5°, 3d10 all’11°, 4d10 al 17°), metà se superato. Usi pari al bonus di competenza per riposo lungo.',
      },
      { name: 'Resistenza ai danni', description: 'Resistenza al tipo di danno della tua ascendenza.' },
      { name: 'Scurovisione', description: 'Vedi al buio entro 18 m.' },
      { name: 'Volo draconico', level: 5, description: 'Con un’azione bonus spieghi ali spettrali per 10 minuti: Velocità di volare pari alla tua Velocità. Una volta per riposo lungo.' },
    ],
  },
  {
    id: 'dwarf',
    name: 'Nano',
    description: 'Robusti e tenaci, forgiati dalla pietra e dalla tradizione.',
    sizes: ['medium'],
    speed: 9,
    darkvision: 36,
    hpPerLevel: 1,
    resistances: [DAMAGE('veleno')],
    traits: [
      { name: 'Scurovisione', description: 'Vedi al buio entro 36 m.' },
      { name: 'Resilienza nanica', description: 'Resistenza ai danni da veleno e Vantaggio ai TS per evitare o terminare la condizione Avvelenato.' },
      { name: 'Robustezza nanica', description: 'Il massimo dei punti ferita aumenta di 1, e di 1 a ogni livello.' },
      { name: 'Sensibilità alla pietra', description: 'Con un’azione bonus ottieni Percezione tellurica entro 18 m per 10 minuti, se sei su una superficie di pietra. Usi pari alla competenza per riposo lungo.' },
    ],
  },
  {
    id: 'elf',
    name: 'Elfo',
    description: 'Longevi e legati alla magia della Selva Fatata.',
    sizes: ['medium'],
    speed: 9,
    darkvision: 18,
    skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] },
    choice: {
      key: 'lineage',
      label: 'Lignaggio elfico',
      options: [
        { id: 'drow', name: 'Drow', description: 'Scurovisione 36 m, trucchetto Luci danzanti; Luminescenza al 3°, Oscurità al 5°.' },
        { id: 'high', name: 'Alto elfo', description: 'Trucchetto Prestidigitazione (sostituibile a ogni riposo lungo); Individuazione del magico al 3°, Passo velato al 5°.' },
        { id: 'wood', name: 'Elfo dei boschi', description: 'Velocità 10,5 m, trucchetto Arte druidica; Passo veloce al 3°, Passare senza tracce al 5°.' },
      ],
    },
    traits: [
      { name: 'Scurovisione', description: 'Vedi al buio entro 18 m (36 m per i drow).' },
      { name: 'Ascendenza fatata', description: 'Vantaggio ai TS per evitare o terminare la condizione Affascinato.' },
      { name: 'Sensi acuti', description: 'Competenza in Intuizione, Percezione o Sopravvivenza.' },
      { name: 'Trance', description: 'Non hai bisogno di dormire: un riposo lungo ti richiede 4 ore di trance.' },
      { name: 'Lignaggio elfico', description: 'Il lignaggio ti dona incantesimi al 1°, 3° e 5° livello (Int, Sag o Car).' },
    ],
  },
  {
    id: 'gnome',
    name: 'Gnomo',
    description: 'Curiosi e ingegnosi, pieni di trovate e di magia.',
    sizes: ['small'],
    speed: 9,
    darkvision: 18,
    choice: {
      key: 'lineage',
      label: 'Lignaggio gnomesco',
      options: [
        { id: 'forest', name: 'Gnomo delle foreste', description: 'Trucchetto Illusione minore; Parlare con gli animali sempre preparato.' },
        { id: 'rock', name: 'Gnomo delle rocce', description: 'Trucchetti Aggiustare e Prestidigitazione; puoi creare piccoli congegni a orologeria.' },
      ],
    },
    traits: [
      { name: 'Scurovisione', description: 'Vedi al buio entro 18 m.' },
      { name: 'Astuzia gnomesca', description: 'Vantaggio ai TS su Intelligenza, Saggezza e Carisma.' },
      { name: 'Lignaggio gnomesco', description: 'Il lignaggio ti dona trucchetti e incantesimi (Int, Sag o Car).' },
    ],
  },
  {
    id: 'goliath',
    name: 'Goliath',
    description: 'Imponenti discendenti dei giganti.',
    sizes: ['medium'],
    speed: 10.5,
    darkvision: 0,
    choice: {
      key: 'ancestry',
      label: 'Ascendenza gigante',
      options: [
        { id: 'cloud', name: 'Delle nubi', description: 'Passo delle nubi: azione bonus, teletrasporto fino a 9 m.' },
        { id: 'fire', name: 'Del fuoco', description: 'Ustione del fuoco: quando colpisci, +1d10 danni da fuoco.' },
        { id: 'frost', name: 'Del gelo', description: 'Freddo del gelo: quando colpisci, +1d6 danni da freddo e −3 m di Velocità.' },
        { id: 'hill', name: 'Delle colline', description: 'Ribaltone delle colline: quando colpisci una creatura Grande o più piccola, la fai cadere Prona.' },
        { id: 'stone', name: 'Della pietra', description: 'Resistenza della pietra: reazione per ridurre i danni subiti di 1d12 + Cos.' },
        { id: 'storm', name: 'Della tempesta', description: 'Tuono della tempesta: reazione quando vieni colpito, 1d8 danni da tuono all’attaccante.' },
      ],
    },
    traits: [
      { name: 'Ascendenza gigante', description: 'Un beneficio soprannaturale legato al tuo antenato gigante, usabile un numero di volte pari alla competenza per riposo lungo.' },
      { name: 'Forma grande', level: 5, description: 'Con un’azione bonus diventi Grande per 10 minuti: Vantaggio alle prove di Forza e +3 m di Velocità. Una volta per riposo lungo.' },
      { name: 'Corporatura possente', description: 'Vantaggio alle prove per terminare la condizione Afferrato; conti come una taglia più grande per la capacità di carico.' },
    ],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Piccoli, coraggiosi e baciati dalla fortuna.',
    sizes: ['small'],
    speed: 9,
    darkvision: 0,
    traits: [
      { name: 'Coraggioso', description: 'Vantaggio ai TS per evitare o terminare la condizione Spaventato.' },
      { name: 'Agilità halfling', description: 'Puoi muoverti attraverso lo spazio di creature di taglia più grande della tua.' },
      { name: 'Fortunato', description: 'Quando ottieni 1 su un d20 per una prova d20, puoi ritirarlo e devi usare il nuovo risultato.' },
      { name: 'Furtività innata', description: 'Puoi nasconderti anche dietro una creatura di taglia più grande della tua.' },
    ],
  },
  {
    id: 'human',
    name: 'Umano',
    description: 'Versatili e ambiziosi, diffusi in ogni angolo del mondo.',
    sizes: ['medium', 'small'],
    speed: 9,
    darkvision: 0,
    skillChoice: { count: 1, from: null },
    originFeat: true,
    traits: [
      { name: 'Intraprendente', description: 'Ottieni Ispirazione eroica a ogni riposo lungo.' },
      { name: 'Abile', description: 'Competenza in un’abilità a tua scelta.' },
      { name: 'Versatile', description: 'Ottieni un talento di origine a tua scelta.' },
    ],
  },
  {
    id: 'orc',
    name: 'Orco',
    description: 'Fieri e instancabili, con una resistenza fuori dal comune.',
    sizes: ['medium'],
    speed: 9,
    darkvision: 36,
    traits: [
      { name: 'Scarica di adrenalina', description: 'Azione di Scatto come azione bonus e, quando lo fai, ottieni punti ferita temporanei pari alla competenza. Usi pari alla competenza per riposo breve o lungo.' },
      { name: 'Scurovisione', description: 'Vedi al buio entro 36 m.' },
      { name: 'Tenacia implacabile', description: 'Quando scendi a 0 PF senza morire sul colpo, puoi restare a 1 PF. Una volta per riposo lungo.' },
    ],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Segnati da un’eredità dei Piani Inferiori.',
    sizes: ['medium', 'small'],
    speed: 9,
    darkvision: 18,
    choice: {
      key: 'legacy',
      label: 'Eredità immonda',
      options: [
        { id: 'abyssal', name: 'Abissale', description: 'Resistenza al veleno, trucchetto Spruzzo velenoso; Raggio di infermità al 3°, Blocca persone al 5°.' },
        { id: 'chthonic', name: 'Ctonia', description: 'Resistenza ai necrotici, trucchetto Tocco gelido; Vita falsata al 3°, Raggio di indebolimento al 5°.' },
        { id: 'infernal', name: 'Infernale', description: 'Resistenza al fuoco, trucchetto Fiotto di fiamme; Intimorire infernale al 3°, Oscurità al 5°.' },
      ],
    },
    traits: [
      { name: 'Scurovisione', description: 'Vedi al buio entro 18 m.' },
      { name: 'Eredità immonda', description: 'Resistenza e incantesimi legati alla tua eredità (Int, Sag o Car).' },
      { name: 'Presenza ultraterrena', description: 'Conosci il trucchetto Taumaturgia.' },
    ],
  },
];

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id);

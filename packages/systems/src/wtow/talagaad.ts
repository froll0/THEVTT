/**
 * Talagaad, the port the starting campaign lives in (Guida del Gamemaster,
 * «Avventure a Talagaad», pp. 7-18): its quarters as Zones of a scene, and the
 * three Tetri Presagi written for it. The texts here are short summaries for
 * the GM, with the page to read in full.
 */

export interface Quarter {
  name: string;
  /** cells, on a 40 × 28 scene */
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  note: string;
}

export const TALAGAAD_SIZE = { w: 40, h: 28 };

/** A schematic layout: north bank above the Talabec, the port below, joined by the Viadotto del Mago. */
export const QUARTERS: Quarter[] = [
  { name: 'Sponda Fredda', x: 4, y: 2, w: 33, h: 8, color: '#7aa7c7', note: 'La riva destra del Talabec, battuta dai venti del nord.' },
  { name: 'Viadotto del Mago', x: 19, y: 10, w: 3, h: 4, color: '#c9b38a', note: 'L’antico ponte di pietra che unisce le due metà del porto.' },
  { name: 'I Moli', x: 4, y: 14, w: 12, h: 4, color: '#5f8fb0', note: 'Le banchine, i barcaioli, l’Ambasciata Elfica.' },
  { name: 'Le Schiere', x: 16, y: 14, w: 11, h: 6, color: '#b08f6a', note: 'Gli edifici lungo la Strada del Mago, templi e santuari.' },
  { name: 'Flussdreck', x: 27, y: 14, w: 10, h: 5, color: '#6d6a52', note: 'Il quartiere peggiore, lungo il fiume e il muro settentrionale.' },
  { name: 'Corna di Vetro', x: 4, y: 18, w: 12, h: 5, color: '#9c7fb0', note: 'A nord della Piazza del Mercato: avvocati e affari.' },
  { name: 'Favorita di Ahalt', x: 16, y: 20, w: 11, h: 3, color: '#b0806d', note: 'Dietro la Strada del Mago, il Calderone Pigro.' },
  { name: 'Casa del Magistrato', x: 27, y: 19, w: 10, h: 4, color: '#a39a6c', note: 'Il Magistrato Anselm Ragguser, il crimine e la legge.' },
  { name: 'Markebundt', x: 4, y: 23, w: 33, h: 4, color: '#c2a256', note: 'La zona meridionale dei mercanti e la Piazza del Mercato.' },
];

/** The painted ground: dirt outside, cobbles in town, the Talabec across, the bridge in stone. */
export function talagaadTerrain(): string {
  const { w, h } = TALAGAAD_SIZE;
  const cells: string[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const town = x >= 3 && x <= 37 && y >= 1 && y <= 27;
      let c = town ? (y < 10 ? 'd' : 'c') : 'g';
      if (y >= 10 && y <= 13) c = y === 10 || y === 13 ? 'q' : 'p';
      if (y >= 10 && y <= 13 && x >= 19 && x <= 21) c = 's';
      cells.push(c);
    }
  }
  return cells.join('');
}

export interface Omen {
  id: string;
  name: string;
  page: number;
  /** the hook, in a line, as the book opens it */
  hook: string;
  /** what happens to the characters */
  setup: string;
  /** where it can go from here */
  plot: string[];
  /** images to bring back during the campaign */
  reminders: string[];
  objectives: string[];
}

export const OMENS: Omen[] = [
  {
    id: 'dalle-ceneri',
    name: 'Dalle Ceneri',
    page: 16,
    hook: 'Siete gli unici sopravvissuti a un’atrocità e, in quanto ultimi testimoni, dovete essere messi a tacere.',
    setup:
      'Fuori da Talagaad i personaggi si fermano alla locanda Fine del Viaggio, dove il giovane nobile Günther Ludenhof offre da bere in cambio di racconti. Ubriaco, si lascia sfuggire che suo zio «è morto, ma continua a governarci». Nella notte il suo seguito appicca il fuoco alla locanda: i PG scelgono chi salvare, poi affrontano i Guardastrada venuti a indagare.',
    plot: [
      'Günther sa che a capo del suo ramo dei Ludenhof c’è il Vampiro Zekrakar e cercherà di eliminare i testimoni sopravvissuti.',
      'Può assoldare i Ghigni Rossi o la Veglia Fredda, o il necromante Heinrich von Mortis.',
      'Alla fine Zekrakar stesso può entrare in scena; la Cacciatrice di Streghe Brunhammer è un’alleata possibile e pericolosa.',
    ],
    reminders: ['Lo scoppiettare del fuoco e le urla dei morenti.', 'Il falco da caccia dei Ludenhof sotto i mantelli dei servitori.', 'Occhi di cadaveri e di animali che seguono i personaggi.'],
    objectives: ['Sopravvivere all’incendio della Fine del Viaggio', 'Scoprire chi è Günther Ludenhof', 'Capire che cosa nasconde la sua famiglia'],
  },
  {
    id: 'proteste-della-pira',
    name: 'Le Proteste della Pira',
    page: 17,
    hook: 'Siete perseguitati dallo spirito di una vittima, o da qualcosa che finge di esserlo.',
    setup:
      'I personaggi assistono al rogo di Helda Wittekant, condannata per stregoneria da un processo popolare; la folla li spinge fino alla pira. Morendo, la donna maledice i presenti. Nelle settimane dopo, altri testimoni muoiono tra fiamme e ustioni: si dice che Wittekant sia tornata per vendicarsi.',
    plot: [
      'La folla era sobillata da seguaci della Cacciatrice di Streghe Grisela Brunhammer; la guardia può sospettare i PG stessi.',
      'Wittekant era davvero una strega elementalista, ma la sua maledizione non ha potere.',
      'Dietro le morti c’è Vecchio Ardente, il suo famiglio di fuoco, che cerca la libertà e può arruolare la Hexenguilde.',
    ],
    reminders: ['Ogni fuoco sembra troppo caldo.', 'Le urla per strada riportano le ultime parole di Wittekant.', 'Le vittime bruciate sembrano guardare i personaggi.'],
    objectives: ['Capire chi uccide i testimoni del rogo', 'Scoprire i segreti della morte di Helda Wittekant', 'Spezzare la «maledizione»'],
  },
  {
    id: 'tributo-della-foresta',
    name: 'Il Tributo della Foresta',
    page: 18,
    hook: 'Siete fuggiti dalla prigionia di ritualisti bestiali, ma ora portate il loro marchio.',
    setup:
      'Dopo un’imboscata alla carovana, i personaggi si risvegliano prigionieri degli Uominibestia, pronti al sacrificio. Una lite tra un Bestigor e il Capobranco li distrae: è il momento di fuggire tra gli alberi. Tornati a Talagaad grazie ad altri viaggiatori, sono debitori di un favore e tormentati da sogni e da una figura incappucciata che solo loro vedono.',
    plot: [
      'A Talagaad pochi prendono sul serio il Branco da Guerra del Cervo Massacrato, ma qualcuno ascolterà i PG.',
      'La Fratellanza di Serac degli Elfi Silvani conosce la minaccia nella foresta.',
      'Il rituale è incompiuto? Gli Uominibestia li hanno lasciati andare di proposito?',
    ],
    reminders: ['Occhi tra gli alberi che osservano e attendono.', 'Il verso degli animali sembra contenere parole malvagie.', 'Marchi e segni di corde che non guariscono mai.'],
    objectives: ['Fuggire dagli Uominibestia', 'Ripagare chi li ha salvati sulla strada', 'Scoprire perché sono stati marchiati'],
  },
];

/** The GM's note for an omen, as rich text. */
export function omenNote(o: Omen): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return [
    `<p><i>${esc(o.hook)}</i></p>`,
    `<p>${esc(o.setup)}</p>`,
    '<h3>La Trama si Infittisce</h3>',
    list(o.plot),
    '<h3>Tetri Richiami</h3>',
    list(o.reminders),
    `<p>Testo completo: Guida del Gamemaster, p. ${o.page}.</p>`,
  ].join('');
}

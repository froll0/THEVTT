import { parsePlugin } from './pluginMeta';
import { TEMPLATES } from './pluginKit';

/**
 * The catalog that ships with the app: extensions ready to add, read in full
 * before they are switched on. Others come from a link (a .js anyone can host)
 * or a file.
 */

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'Chat e dadi' | 'Combattimento' | 'Master' | 'Atmosfera';
  code: string;
}

const EXTRA: { id: string; category: CatalogEntry['category']; code: string }[] = [
  {
    id: 'meteo',
    category: 'Atmosfera',
    code: `// @name Meteo del viaggio
// @description /meteo tira il tempo della giornata, con la stagione
// @version 1.0

const TEMPO = {
  primavera: ['Sole tiepido', 'Pioggerella', 'Vento fresco', 'Nebbia al mattino', 'Temporale improvviso'],
  estate: ['Caldo torrido', 'Cielo terso', 'Afa e zanzare', 'Temporale estivo', 'Brezza leggera'],
  autunno: ['Foglie e vento', 'Pioggia battente', 'Nebbia fitta', 'Cielo grigio', 'Prima brina'],
  inverno: ['Neve fitta', 'Gelo pungente', 'Bufera', 'Cielo limpido e freddo', 'Nevischio'],
};

thevtt.command('meteo', 'Il tempo di oggi: /meteo [stagione]', (args) => {
  const stagione = TEMPO[args.trim().toLowerCase()] ? args.trim().toLowerCase() : 'primavera';
  const lista = TEMPO[stagione];
  const oggi = lista[Math.floor(Math.random() * lista.length)];
  thevtt.card({ title: 'Il tempo di oggi', subtitle: stagione, body: oggi, tags: ['meteo'] });
});
`,
  },
  {
    id: 'nomi',
    category: 'Master',
    code: `// @name Nomi al volo
// @description /nome nano, elfo, umano, orco o halfling: un nome per il PNG improvvisato
// @version 1.0

const SILLABE = {
  nano: [['Thor', 'Brom', 'Dur', 'Gim', 'Bal', 'Kaz'], ['in', 'ak', 'gar', 'li', 'dur', 'rek']],
  elfo: [['Ae', 'Lir', 'Thal', 'Ely', 'Syl', 'Ear'], ['ndil', 'wen', 'ion', 'rael', 'thas', 'iel']],
  umano: [['Ald', 'Ber', 'Cor', 'Ed', 'Mar', 'Ros'], ['ric', 'ta', 'win', 'mund', 'ella', 'ard']],
  orco: [['Gru', 'Mog', 'Urz', 'Kra', 'Thok', 'Gash'], ['ak', 'gul', 'nak', 'rot', 'mash', 'za']],
  halfling: [['Pip', 'Mer', 'Ros', 'Tob', 'Lil', 'Fro'], ['pin', 'ry', 'ie', 'old', 'ly', 'do']],
};
const pesca = (lista) => lista[Math.floor(Math.random() * lista.length)];

thevtt.command('nome', 'Un nome a caso: /nome nano|elfo|umano|orco|halfling', (args) => {
  const popolo = SILLABE[args.trim().toLowerCase()] ? args.trim().toLowerCase() : pesca(Object.keys(SILLABE));
  const [inizi, fini] = SILLABE[popolo];
  thevtt.toast(\`\${pesca(inizi)}\${pesca(fini)} (\${popolo})\`);
});
`,
  },
  {
    id: 'morale',
    category: 'Combattimento',
    code: `// @name Morale dei nemici
// @description Quando un nemico scende sotto metà dei punti ferita, ricorda al master di tirare il morale
// @version 1.0

const avvisati = new Set();

// i punti ferita dei nemici li vede solo il master: per i giocatori non scatta
thevtt.on('state', (state) => {
  for (const t of Object.values(state.tokens)) {
    if (!t.hp || t.ownerIds.length) continue;
    const ferito = t.hp.current > 0 && t.hp.current <= t.hp.max / 2;
    if (ferito && !avvisati.has(t.id)) {
      avvisati.add(t.id);
      thevtt.toast(\`\${t.name} è sotto metà: tira il morale?\`);
    }
    if (!ferito) avvisati.delete(t.id);
  }
});
`,
  },
  {
    id: 'promemoria',
    category: 'Master',
    code: `// @name Promemoria di fine round
// @description A ogni nuovo round ricorda in chat le condizioni che stanno per finire
// @version 1.0

let ultimoRound = 0;

thevtt.on('turn', (entry, state) => {
  const round = state.initiative.round;
  if (round === ultimoRound || state.initiative.turn !== 0) return;
  ultimoRound = round;
  const inScadenza = Object.values(state.tokens).flatMap((t) =>
    Object.entries(t.conditionRounds ?? {})
      .filter(([, n]) => n <= 1)
      .map(([c]) => \`\${t.name}: \${c}\`),
  );
  if (inScadenza.length) thevtt.dispatch({ type: 'chat', text: \`Round \${round}, finiscono: \${inScadenza.join(', ')}\`, private: true });
});
`,
  },
];

const CATEGORY: Record<string, CatalogEntry['category']> = {
  critici: 'Chat e dadi',
  turni: 'Combattimento',
  bottino: 'Master',
  colpisci: 'Combattimento',
  ispirazione: 'Chat e dadi',
};

export const CATALOG: CatalogEntry[] = [
  ...TEMPLATES.filter((t) => t.id !== 'vuota').map((t) => ({ id: t.id, code: t.code, category: CATEGORY[t.id] ?? 'Master' })),
  ...EXTRA,
].map((e) => {
  const meta = parsePlugin(e.code);
  return { id: e.id, category: e.category, code: e.code, name: meta.name, description: meta.description, version: meta.version };
});

/** "1.10" > "1.9": versions compared by their numbers */
export function newerVersion(a: string, b: string): boolean {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

/** an extension from a link: only https, at most the size an extension may have */
export async function fetchPlugin(url: string, maxBytes: number): Promise<string> {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    throw new Error('Il link non è valido');
  }
  if (u.protocol !== 'https:') throw new Error('Serve un link https://');
  // GitHub pages of a file: the raw file instead
  if (u.hostname === 'github.com' && /\/blob\//.test(u.pathname)) {
    u = new URL(`https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`);
  }
  const res = await fetch(u, { credentials: 'omit', redirect: 'follow' }).catch(() => null);
  if (!res) throw new Error('Non riesco a scaricarla: controlla il link o la connessione');
  if (!res.ok) throw new Error(`Il sito risponde ${res.status}`);
  const text = await res.text();
  if (text.length > maxBytes) throw new Error('Estensione troppo grande (max 200 kB)');
  if (/^\s*</.test(text)) throw new Error('Il link porta a una pagina web, non al file .js');
  return text;
}

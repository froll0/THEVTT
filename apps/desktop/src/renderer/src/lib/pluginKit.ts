/**
 * What the extensions workshop knows: the `thevtt` API (for the completions and
 * the manual), ready-made extensions to start from and quick snippets. In
 * snippets `${nome}` marks a field the cursor visits with Tab.
 */

export interface ApiEntry {
  name: string;
  /** how it is called */
  signature: string;
  doc: string;
  /** what is inserted when completed */
  snippet: string;
}

export const API: ApiEntry[] = [
  { name: 'on', signature: "on('log' | 'state' | 'turn', fn)", doc: 'Reagisce a quello che succede: una nuova riga in chat o un tiro (log), ogni cambio del tavolo (state), il turno che passa (turn).', snippet: "on('${log}', (${entry}) => {\n\t${}\n})" },
  { name: 'command', signature: 'command(nome, descrizione, fn)', doc: 'Aggiunge un comando alla chat: /nome argomenti. La funzione riceve il testo dopo il nome e il tavolo.', snippet: "command('${nome}', '${Cosa fa}', (args, state) => {\n\t${}\n})" },
  { name: 'button', signature: 'button(etichetta, fn)', doc: 'Aggiunge un pulsante alla barra delle macro. La funzione riceve il tavolo.', snippet: "button('${Etichetta}', (state) => {\n\t${}\n})" },
  { name: 'chat', signature: 'chat(testo)', doc: 'Scrive in chat a nome tuo.', snippet: "chat(${'Testo'})" },
  { name: 'roll', signature: 'roll(formula, etichetta?)', doc: 'Tira i dadi in chat: 1d20+5, 2d6, 4d6kh3…', snippet: "roll('${1d20}', '${Etichetta}')" },
  { name: 'card', signature: 'card({ title, subtitle?, body?, tags?, rolls? })', doc: 'Mostra una scheda in chat, anche con pulsanti di tiro: rolls: [{ label, formula }].', snippet: "card({ title: '${Titolo}', body: '${Testo}' })" },
  { name: 'toast', signature: 'toast(testo)', doc: 'Un avviso che vedi solo tu, in un angolo dello schermo.', snippet: "toast(${'Fatto!'})" },
  { name: 'dispatch', signature: 'dispatch(azione)', doc: 'Qualsiasi azione del tavolo, come se la facessi tu: token.move, token.update, hp.roll, initiative.next… Passa gli stessi controlli dei tuoi clic.', snippet: "dispatch({ type: '${initiative.next}' })" },
  { name: 'log', signature: 'log(...valori)', doc: 'Scrive nella console del laboratorio (anche console.log). Al tavolo non si vede.', snippet: 'log(${})' },
  { name: 'state', signature: 'state', doc: 'Il tavolo come lo vedi tu: tokens, initiative, log, players, scenes, activeSceneId.', snippet: 'state' },
];

/** fields of the objects an extension handles, for completions after `state.` and `entry.` */
export const FIELDS: Record<string, { name: string; doc: string }[]> = {
  state: [
    { name: 'tokens', doc: 'I token, per id: { name, x, y, hp: { current, max }, ac, conditions, ownerIds, sceneId }' },
    { name: 'initiative', doc: '{ round, turn, entries: [{ id, name, value, tokenId }] }' },
    { name: 'log', doc: 'Le righe della chat, dalla più vecchia' },
    { name: 'players', doc: 'Le persone al tavolo, per id: { displayName, color, online }' },
    { name: 'scenes', doc: 'Le scene, per id' },
    { name: 'activeSceneId', doc: 'La scena in cui si gioca' },
    { name: 'gmId', doc: 'L’id del master' },
    { name: 'campaignName', doc: 'Il nome della campagna' },
    { name: 'systemId', doc: 'Il sistema di gioco: dnd5e-2024, nimble, wtow, free…' },
  ],
  entry: [
    { name: 'kind', doc: "'chat' | 'roll' | 'system' | 'card'" },
    { name: 'text', doc: 'Il testo della riga' },
    { name: 'authorName', doc: 'Chi l’ha scritta' },
    { name: 'authorId', doc: 'L’id di chi l’ha scritta' },
    { name: 'label', doc: 'L’etichetta del tiro' },
    { name: 'roll', doc: '{ formula, total, parts: [{ sides, rolls: [{ value, dropped }] }] }' },
    { name: 'card', doc: 'La scheda mostrata' },
  ],
};

export interface Template {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'vuota',
    name: 'Pergamena bianca',
    description: 'Solo l’intestazione: si parte da zero.',
    code: `// @name La mia estensione
// @description Cosa fa, in una riga
// @version 1.0

// Scrivi thevtt. per vedere tutto quello che puoi usare.
`,
  },
  {
    id: 'critici',
    name: 'Critici e disastri',
    description: 'Annuncia ogni 20 naturale e ogni 1 naturale.',
    code: `// @name Critici e disastri
// @description Annuncia i 20 e gli 1 naturali sul d20
// @version 1.0

thevtt.on('log', (entry) => {
  const d20 = entry.roll?.parts.find((p) => p.sides === 20);
  const facce = (d20?.rolls ?? []).filter((r) => !r.dropped).map((r) => r.value);
  if (facce.includes(20)) thevtt.chat(\`⚔️ Colpo critico per \${entry.authorName}!\`);
  else if (facce.includes(1)) thevtt.chat(\`💀 \${entry.authorName} inciampa nel proprio mantello…\`);
});
`,
  },
  {
    id: 'turni',
    name: 'Araldo dei turni',
    description: 'Annuncia chi tocca e ricorda le sue condizioni.',
    code: `// @name Araldo dei turni
// @description Annuncia il turno e ricorda le condizioni del combattente
// @version 1.0

thevtt.on('turn', (entry, state) => {
  if (!entry) return;
  const token = entry.tokenId ? state.tokens[entry.tokenId] : null;
  const condizioni = token?.conditions?.length ? \` (\${token.conditions.join(', ')})\` : '';
  thevtt.chat(\`📯 Round \${state.initiative.round}: tocca a \${entry.name}\${condizioni}\`);
});
`,
  },
  {
    id: 'bottino',
    name: 'Borsa del bottino',
    description: 'Il comando /bottino pesca un tesoro a caso e lo mostra in una scheda.',
    code: `// @name Borsa del bottino
// @description /bottino pesca un tesoro a caso
// @version 1.0

const TESORI = [
  'Una borsa con 3d6 monete d’argento',
  'Un anello d’ottone con un’incisione elfica',
  'Una pozione di guarigione (2d4+2)',
  'Una mappa strappata a metà',
  'Un pugnale dall’elsa di osso',
];

const aCaso = (lista) => lista[Math.floor(Math.random() * lista.length)];

thevtt.command('bottino', 'Pesca un tesoro dalla borsa', () => {
  thevtt.card({ title: 'Bottino', subtitle: 'Dalla borsa del master', body: aCaso(TESORI), tags: ['tesoro'] });
});
`,
  },
  {
    id: 'colpisci',
    name: 'Colpo rapido',
    description: '/colpisci Goblin 1d6: danni a un token cercato per nome.',
    code: `// @name Colpo rapido
// @description /colpisci <nome> <formula>: danni a un token
// @version 1.0

const trova = (state, nome) =>
  Object.values(state.tokens).find((t) => t.name.toLowerCase() === nome.toLowerCase());

thevtt.command('colpisci', 'Danni a un token: /colpisci Goblin 1d6', (args, state) => {
  const parti = args.trim().split(/\\s+/);
  const formula = parti.pop();
  const bersaglio = trova(state, parti.join(' '));
  if (!bersaglio || !formula) return thevtt.toast('Scrivi /colpisci <nome> <formula>');
  thevtt.dispatch({ type: 'hp.roll', formula, tokenIds: [bersaglio.id], label: 'Colpo rapido' });
});
`,
  },
  {
    id: 'ispirazione',
    name: 'Segnalini ispirazione',
    description: 'Un pulsante che dà un segnalino a turno e tiene il conto.',
    code: `// @name Segnalini ispirazione
// @description Un pulsante dà ispirazione e tiene il conto
// @version 1.0

const conto = {};

thevtt.button('Ispirazione', (state) => {
  const turno = state.initiative.entries[state.initiative.turn];
  if (!turno) return thevtt.toast('Nessun combattente di turno');
  conto[turno.name] = (conto[turno.name] ?? 0) + 1;
  thevtt.chat(\`✨ \${turno.name} riceve ispirazione (\${conto[turno.name]})\`);
});
`,
  },
];

export interface Snippet {
  name: string;
  hint: string;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  { name: 'Comando in chat', hint: '/nome', code: "thevtt.command('${nome}', '${Cosa fa}', (args, state) => {\n\t${thevtt.chat('Ciao!')}\n});\n" },
  { name: 'Pulsante', hint: 'barra delle macro', code: "thevtt.button('${Etichetta}', (state) => {\n\t${thevtt.roll('1d20', 'Prova')}\n});\n" },
  { name: 'A ogni tiro', hint: 'on log', code: "thevtt.on('log', (entry) => {\n\tif (entry.kind !== 'roll') return;\n\t${thevtt.log(entry.roll.total)}\n});\n" },
  { name: 'A ogni turno', hint: 'on turn', code: "thevtt.on('turn', (entry, state) => {\n\t${thevtt.chat('Tocca a ' + entry.name)}\n});\n" },
  { name: 'Scheda in chat', hint: 'card', code: "thevtt.card({ title: '${Titolo}', body: '${Testo}', rolls: [{ label: '${Danni}', formula: '${1d8}' }] });\n" },
  { name: 'Messaggio al master', hint: 'privato', code: "thevtt.dispatch({ type: 'chat', text: ${'Solo per il master'}, private: true });\n" },
  { name: 'Token per nome', hint: 'cerca', code: "const ${token} = Object.values(thevtt.state.tokens).find((t) => t.name === '${Goblin}');\n" },
  { name: 'Scegli a caso', hint: 'lista', code: "const ${scelta} = [${'uno', 'due', 'tre'}][Math.floor(Math.random() * 3)];\n" },
  { name: 'Turno successivo', hint: 'iniziativa', code: "thevtt.dispatch({ type: 'initiative.next' });\n" },
];

/** the header fields of an extension's code */
export function readHeader(code: string) {
  const tag = (k: string) => new RegExp(`^\\s*//\\s*@${k}[ \\t]+(.*)$`, 'm').exec(code)?.[1]?.trim() ?? '';
  return { name: tag('name'), description: tag('description'), version: tag('version') };
}

/** the code with one header field changed (added at the top when missing) */
export function writeHeader(code: string, key: 'name' | 'description' | 'version', value: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ');
  const re = new RegExp(`^(\\s*//\\s*@${key})([ \\t]+.*)?$`, 'm');
  if (re.test(code)) return code.replace(re, `$1 ${clean}`);
  // after the header lines already there, or at the very top
  const lines = code.split('\n');
  let at = 0;
  while (at < lines.length && /^\s*\/\/\s*@\w+/.test(lines[at]!)) at++;
  lines.splice(at, 0, `// @${key} ${clean}`);
  return lines.join('\n');
}

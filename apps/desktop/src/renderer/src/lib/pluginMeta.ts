/** An extension as stored: its code and what its header says about it. */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  code: string;
  enabled: boolean;
  installedAt: number;
  /** where it came from: 'catalogo:<id>', a link, or nothing (a file, pasted, the workshop) */
  source?: string;
}

/** `// @name …`, `// @description …`, `// @version …` at the top of the file */
export function parsePlugin(code: string, fallbackName = 'Estensione'): Omit<Plugin, 'id' | 'enabled' | 'installedAt' | 'source'> {
  const tag = (k: string) => new RegExp(`^\\s*//\\s*@${k}\\s+(.+)$`, 'm').exec(code)?.[1]?.trim();
  return {
    name: (tag('name') ?? fallbackName).slice(0, 60),
    description: (tag('description') ?? '').slice(0, 200),
    version: (tag('version') ?? '1.0').slice(0, 20),
    code,
  };
}


export type Capability = 'chat' | 'roll' | 'actions' | 'commands' | 'buttons' | 'reacts' | 'network' | 'timers';

/** what an extension's code can do, read from the code itself: shown before adding and switching it on */
export const CAPABILITIES: Record<Capability, { label: string; hint: string; risky?: boolean }> = {
  reacts: { label: 'Osserva il tavolo', hint: 'Legge il tavolo come lo vedi tu e reagisce a chat, tiri e turni' },
  chat: { label: 'Scrive in chat', hint: 'Messaggi e schede in chat a tuo nome' },
  roll: { label: 'Tira dadi', hint: 'Tiri in chat a tuo nome' },
  actions: { label: 'Agisce al tavolo', hint: 'Azioni del tavolo come se le facessi tu (token, punti ferita, iniziativa…)', risky: true },
  commands: { label: 'Comandi in chat', hint: 'Aggiunge /comandi' },
  buttons: { label: 'Pulsanti', hint: 'Aggiunge pulsanti alla barra delle macro' },
  timers: { label: 'Lavora da sola', hint: 'Usa timer: può agire anche senza che succeda niente' },
  network: { label: 'Internet', hint: 'Si collega a siti esterni e può mandargli quello che vede', risky: true },
};

export function pluginCapabilities(code: string): Capability[] {
  // comments don't count: a mention isn't a use
  const c = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const has = (re: RegExp) => re.test(c);
  const out: Capability[] = [];
  if (has(/thevtt\s*\.\s*(on|state)\b/)) out.push('reacts');
  if (has(/thevtt\s*\.\s*(chat|card)\s*\(/)) out.push('chat');
  if (has(/thevtt\s*\.\s*roll\s*\(/)) out.push('roll');
  if (has(/thevtt\s*\.\s*dispatch\s*\(/)) out.push('actions');
  if (has(/thevtt\s*\.\s*command\s*\(/)) out.push('commands');
  if (has(/thevtt\s*\.\s*button\s*\(/)) out.push('buttons');
  if (has(/\b(setTimeout|setInterval)\s*\(/)) out.push('timers');
  if (has(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|sendBeacon)\b|\bimport\s*\(/)) out.push('network');
  return out;
}

// Runs one TheVTT extension, away from the app: no page, no saved data, no
// desktop bridge (the network, like any web page, it can still reach). It sees
// the table as its user does and acts through the same actions, which the
// table checks as for any of that user's clicks.
'use strict';
const handlers = { state: [], log: [], turn: [] };
const commands = new Map();
const buttons = new Map();
let state = null;
let nextId = 1;

const post = (m) => self.postMessage(m);
// the extension's code runs as `function anonymous(thevtt\n) {\n"use strict";\n…`: three lines before its first
const HEADER_LINES = 3;
/** an error, with the line of the extension's code it came from when the stack tells */
const report = (e) => {
  const m = /<anonymous>:(\d+):(\d+)/.exec(String((e && e.stack) || ''));
  const line = m ? Number(m[1]) - HEADER_LINES : 0;
  post({ k: 'error', message: String((e && e.message) || e), ...(line > 0 ? { line, col: Number(m[2]) } : {}) });
};
const safe = (fn, ...args) => {
  try {
    const r = fn(...args);
    if (r && typeof r.catch === 'function') r.catch(report);
  } catch (e) {
    report(e);
  }
};

const thevtt = Object.freeze({
  /** the table as you see it (updated before every 'state' event) */
  get state() {
    return state;
  },
  /** 'state' (the whole table), 'log' (a new chat line or roll), 'turn' (initiative moved on) */
  on(event, fn) {
    if (!handlers[event]) throw new Error(`Evento sconosciuto: ${event}`);
    if (typeof fn === 'function') handlers[event].push(fn);
  },
  /** a chat command: /name arguments */
  command(name, description, fn) {
    const n = String(name).toLowerCase().replace(/[^a-z0-9àèéìòù_-]/g, '').slice(0, 24);
    if (!n || typeof fn !== 'function') throw new Error('Comando non valido');
    commands.set(n, fn);
    post({ k: 'command', name: n, description: String(description || '').slice(0, 120) });
  },
  /** a button on the macro bar */
  button(label, fn) {
    if (typeof fn !== 'function') throw new Error('Pulsante senza azione');
    const id = String(nextId++);
    buttons.set(id, fn);
    post({ k: 'button', id, label: String(label).slice(0, 40) });
    return id;
  },
  /** any table action, as if you did it yourself */
  dispatch(action) {
    post({ k: 'dispatch', action });
  },
  chat(text) {
    post({ k: 'dispatch', action: { type: 'chat', text: String(text) } });
  },
  roll(formula, label) {
    post({ k: 'dispatch', action: { type: 'roll', formula: String(formula), label: label ? String(label) : undefined } });
  },
  card(card) {
    post({ k: 'dispatch', action: { type: 'card', card } });
  },
  toast(text) {
    post({ k: 'toast', text: String(text).slice(0, 200) });
  },
  /** a line for whoever is writing the extension (the workshop's console) */
  log(...values) {
    post({ k: 'print', text: values.map(show).join(' ').slice(0, 2000) });
  },
});

function show(v) {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 1).replace(/\n\s*/g, ' ');
  } catch {
    return String(v);
  }
}
// console.log while writing one lands in the same place
self.console.log = (...values) => thevtt.log(...values);

self.onmessage = (e) => {
  const m = e.data || {};
  if (m.k === 'load') {
    try {
      // the extension's code, with `thevtt` as its whole world
      new Function('thevtt', `"use strict";\n${m.code}`)(thevtt);
      post({ k: 'ready' });
    } catch (err) {
      report(err);
    }
  } else if (m.k === 'state') {
    const prevTurn = state ? `${state.initiative.round}:${state.initiative.turn}` : null;
    state = m.state;
    for (const fn of handlers.state) safe(fn, state);
    const turn = `${state.initiative.round}:${state.initiative.turn}`;
    if (prevTurn !== null && turn !== prevTurn && state.initiative.round > 0) for (const fn of handlers.turn) safe(fn, state.initiative.entries[state.initiative.turn] || null, state);
  } else if (m.k === 'log') {
    for (const entry of m.entries) for (const fn of handlers.log) safe(fn, entry);
  } else if (m.k === 'command') {
    const fn = commands.get(m.name);
    if (fn) safe(fn, m.args, state);
  } else if (m.k === 'button') {
    const fn = buttons.get(m.id);
    if (fn) safe(fn, state);
  }
};

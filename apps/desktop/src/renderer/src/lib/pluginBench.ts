import { createInitialState, cryptoRng, GameHost, type GameAction, type GameState, type LogEntry } from '@thevtt/shared';
import { PluginRunner, usePlugins } from './plugins';

/** the workshop's extension, apart from the real ones */
export const BENCH_ID = '__banco__';
const ME = 'banco-master';
const LIA = 'banco-lia';

export type BenchKind = 'chat' | 'roll' | 'system' | 'card' | 'toast' | 'print' | 'error' | 'action';
export interface BenchLine {
  id: number;
  kind: BenchKind;
  text: string;
  /** for errors: the line of the extension's code */
  line?: number;
}

/** how a table line reads in the workshop's console */
export function describeEntry(e: LogEntry): string {
  if (e.kind === 'roll' && e.roll) return `${e.authorName} tira ${e.label ? `${e.label} ` : ''}${e.roll.formula} = ${e.roll.total}`;
  if (e.kind === 'card' && e.card) return `${e.authorName} mostra «${e.card.title}»${e.card.body ? `: ${e.card.body}` : ''}`;
  if (e.kind === 'system') return e.text;
  return `${e.private ? '(al master) ' : ''}${e.authorName}: ${e.text}`;
}

/**
 * A pretend table for trying an extension while writing it: a real game host
 * in memory, the user as its GM, a player and a few tokens. The extension runs
 * in its own worker exactly as at a real table and its actions go through the
 * same rules; nothing leaves the page.
 */
export class PluginBench {
  private host: GameHost;
  private runner: PluginRunner;
  private lastLog: string | null = null;
  private seq = 0;
  /** dice the next rolls will show (to try a natural 20) */
  private forced: number[] = [];
  lines: BenchLine[] = [];
  view: GameState;
  private listeners = new Set<() => void>();

  constructor(code: string) {
    const state = createInitialState({ campaignId: 'banco', campaignName: 'Banco di prova', systemId: 'dnd5e-2024', gmId: ME, sceneId: 'scena' });
    this.view = state;
    this.host = new GameHost({
      state,
      send: (to, msg) => {
        if (to === ME && msg.k === 'state') this.receive(msg.state);
      },
      rng: (sides) => {
        const v = this.forced.shift();
        return v !== undefined ? Math.min(sides, v) : cryptoRng(sides);
      },
    });
    this.host.upsertPlayer({ id: ME, displayName: 'Tu', color: '#c9973f', characterId: null });
    this.host.upsertPlayer({ id: LIA, displayName: 'Lia', color: '#7fae5c', characterId: null });
    this.host.connect(ME);
    for (const t of [
      { name: 'Brunilde', x: 3, y: 3, color: '#7fae5c', ownerIds: [LIA], hp: { current: 24, max: 24 }, ac: 17, init: 14 },
      { name: 'Goblin', x: 8, y: 4, color: '#8e2f24', ownerIds: [], hp: { current: 7, max: 7 }, ac: 15, init: 12 },
      { name: 'Goblin arciere', x: 10, y: 6, color: '#8e2f24', ownerIds: [], hp: { current: 7, max: 7 }, ac: 13, init: 9 },
    ]) {
      const { init, ...token } = t;
      this.host.dispatch(ME, { type: 'token.create', token });
      const id = Object.values(this.host.state.tokens).find((x) => x.name === t.name)!.id;
      this.host.dispatch(ME, { type: 'initiative.add', name: t.name, tokenId: id, value: init });
    }
    this.host.clearHistory();
    this.lastLog = this.host.state.log.at(-1)?.id ?? null;
    // the table laid out: the console starts empty
    this.lines = [];

    usePlugins.setState((s) => {
      const errors = { ...s.errors };
      delete errors[BENCH_ID];
      return { errors };
    });
    this.runner = new PluginRunner(
      { id: BENCH_ID, name: 'Banco', description: '', version: '', code, enabled: true, installedAt: 0 },
      {
        dispatch: (a) => this.act(ME, a, true),
        toast: (t) => this.push('toast', t),
        print: (t) => this.push('print', t),
        error: (message, line) => this.push('error', message, line),
      },
    );
    this.runner.state(this.view);
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn();
  }

  private push(kind: BenchKind, text: string, line?: number) {
    this.lines = [...this.lines, { id: ++this.seq, kind, text, ...(line ? { line } : {}) }].slice(-300);
    this.emit();
  }

  private receive(view: GameState) {
    this.view = view;
    const from = this.lastLog ? view.log.findIndex((e) => e.id === this.lastLog) : -1;
    const fresh = view.log.slice(from + 1);
    this.lastLog = view.log.at(-1)?.id ?? this.lastLog;
    for (const e of fresh) this.push(e.kind, describeEntry(e));
    // during the constructor the runner isn't there yet
    if (this.runner) {
      this.runner.state(view);
      this.runner.log(fresh);
    }
    this.emit();
  }

  /** an action at the pretend table, from the user or from Lia */
  act(from: 'me' | 'lia' | typeof ME, action: GameAction, byExtension = false) {
    const who = from === 'lia' ? LIA : ME;
    // chat lines, rolls and cards show up as themselves
    if (byExtension && !['chat', 'roll', 'card'].includes(action.type)) this.push('action', `L’estensione fa: ${action.type}`);
    const r = this.host.dispatch(who, action);
    if (!r.ok) this.push('error', `${action.type} rifiutata: ${r.reason}`);
  }

  /** what the user types in the bench's chat: an extension's command, a roll or words */
  say(text: string) {
    const t = text.trim();
    if (!t) return;
    const cmd = /^\/(\S+)\s*(.*)$/s.exec(t);
    if (cmd) {
      const name = cmd[1]!.toLowerCase();
      if (usePlugins.getState().commands.some((c) => c.pluginId === BENCH_ID && c.name === name)) {
        this.push('chat', `Tu: ${t}`);
        this.runner.command(name, cmd[2]!);
        return;
      }
      if (name === 'r' || name === 'tira') return this.act('me', { type: 'roll', formula: cmd[2]!.split(/\s+/)[0] || '1d20', label: cmd[2]!.split(/\s+/).slice(1).join(' ') || undefined });
      return this.push('error', `Nessun comando /${name}: l’estensione non l’ha aggiunto`);
    }
    this.act('me', { type: 'chat', text: t });
  }

  press(buttonId: string) {
    this.runner.press(buttonId);
  }

  /** Lia rolls a d20, showing this face */
  liaRolls(face?: number) {
    if (face) this.forced.push(face);
    this.act('lia', { type: 'roll', formula: '1d20+5', label: 'Attacco' });
  }

  stop() {
    this.runner.stop();
    this.listeners.clear();
  }
}

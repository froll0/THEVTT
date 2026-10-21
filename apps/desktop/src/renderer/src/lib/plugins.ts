import { newId, type GameAction, type GameState, type LogEntry } from '@thevtt/shared';
import { create } from 'zustand';
import { localStore } from './platform';
import { parsePlugin, type Plugin } from './pluginMeta';

export { parsePlugin, type Plugin };

/**
 * Extensions: small scripts a user adds to their own app (a file, or pasted).
 * Each runs in its own worker (see public/plugin-worker.js), sees the table
 * as that user does and can only do what that user could: its actions go
 * through the same checks as their clicks.
 */

export const MAX_PLUGIN_BYTES = 200_000;
/** buttons and chat commands one extension may add */
const MAX_PER_PLUGIN = 12;

interface PluginStore {
  userId: string | null;
  plugins: Plugin[];
  /** what the running extensions put on the table */
  buttons: { pluginId: string; id: string; label: string }[];
  commands: { pluginId: string; name: string; description: string }[];
  errors: Record<string, string>;
  load(userId: string): Promise<void>;
  install(code: string, fileName?: string): Plugin;
  /** the workshop saves over the extension it opened, even renamed */
  update(id: string, code: string): Plugin;
  toggle(id: string, enabled: boolean): void;
  remove(id: string): void;
}

export const usePlugins = create<PluginStore>((set, get) => {
  const persist = () => {
    const { userId, plugins } = get();
    if (userId) void localStore.write(`plugins-${userId}`, plugins);
  };
  return {
    userId: null,
    plugins: [],
    buttons: [],
    commands: [],
    errors: {},
    load: async (userId) => {
      if (get().userId === userId) return;
      const saved = await localStore.read<Plugin[]>(`plugins-${userId}`).catch(() => null);
      set({ userId, plugins: Array.isArray(saved) ? saved.filter((p) => p && typeof p.code === 'string') : [] });
    },
    install: (code, fileName) => {
      if (code.length > MAX_PLUGIN_BYTES) throw new Error('Estensione troppo grande (max 200 kB)');
      const meta = parsePlugin(code, fileName?.replace(/\.[^.]+$/, ''));
      // the same name again: an update
      const old = get().plugins.find((p) => p.name === meta.name);
      const plugin: Plugin = { id: old?.id ?? newId(), enabled: old?.enabled ?? false, installedAt: Date.now(), ...meta };
      set({ plugins: old ? get().plugins.map((p) => (p.id === old.id ? plugin : p)) : [...get().plugins, plugin] });
      persist();
      return plugin;
    },
    update: (id, code) => {
      const old = get().plugins.find((p) => p.id === id);
      if (!old) return get().install(code);
      if (code.length > MAX_PLUGIN_BYTES) throw new Error('Estensione troppo grande (max 200 kB)');
      const meta = parsePlugin(code, old.name);
      if (get().plugins.some((p) => p.id !== id && p.name === meta.name)) throw new Error(`C’è già un’estensione chiamata «${meta.name}»`);
      const plugin: Plugin = { ...old, ...meta, installedAt: Date.now() };
      set({ plugins: get().plugins.map((p) => (p.id === id ? plugin : p)) });
      persist();
      return plugin;
    },
    toggle: (id, enabled) => {
      set({ plugins: get().plugins.map((p) => (p.id === id ? { ...p, enabled } : p)) });
      persist();
    },
    remove: (id) => {
      set({ plugins: get().plugins.filter((p) => p.id !== id) });
      persist();
    },
  };
});

type FromWorker =
  | { k: 'ready' }
  | { k: 'error'; message: string; line?: number }
  | { k: 'dispatch'; action: GameAction }
  | { k: 'toast'; text: string }
  | { k: 'print'; text: string }
  | { k: 'command'; name: string; description: string }
  | { k: 'button'; id: string; label: string };

export interface PluginHost {
  dispatch(action: GameAction): void;
  toast(text: string): void;
  /** thevtt.log / console.log: only the workshop shows them */
  print?(text: string): void;
  /** an error, with its line in the extension's code when known */
  error?(message: string, line?: number): void;
}

/** One running extension. */
export class PluginRunner {
  private worker: Worker;
  /** actions in the last second: a runaway script can't flood the table */
  private recent: number[] = [];

  constructor(
    readonly plugin: Plugin,
    private host: PluginHost,
  ) {
    this.worker = new Worker(new URL('./plugin-worker.js', document.baseURI));
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.receive(e.data);
    this.worker.onerror = (e) => this.fail(e.message || 'Errore nell’estensione');
    this.worker.postMessage({ k: 'load', code: plugin.code });
  }

  private fail(message: string, line?: number) {
    const text = `${message.slice(0, 300)}${line ? ` (riga ${line})` : ''}`;
    usePlugins.setState((s) => ({ errors: { ...s.errors, [this.plugin.id]: text } }));
    this.host.error?.(message, line);
  }

  private receive(m: FromWorker) {
    const id = this.plugin.id;
    switch (m?.k) {
      case 'ready':
        usePlugins.setState((s) => {
          const errors = { ...s.errors };
          delete errors[id];
          return { errors };
        });
        break;
      case 'error':
        this.fail(String(m.message), typeof m.line === 'number' && m.line > 0 ? Math.floor(m.line) : undefined);
        break;
      case 'dispatch': {
        const now = Date.now();
        this.recent = this.recent.filter((t) => now - t < 1000);
        if (this.recent.length >= 20) return this.fail('Troppe azioni in un secondo: fermata');
        this.recent.push(now);
        if (m.action && typeof m.action === 'object' && typeof (m.action as { type?: unknown }).type === 'string') this.host.dispatch(m.action);
        break;
      }
      case 'toast':
        this.host.toast(`${this.plugin.name}: ${String(m.text).slice(0, 200)}`);
        break;
      case 'print':
        this.host.print?.(String(m.text));
        break;
      case 'command': {
        // a misbehaving script can't fill the chat's commands or the macro bar
        const name = String(m.name).toLowerCase().slice(0, 24);
        usePlugins.setState((s) => {
          const others = s.commands.filter((c) => c.name !== name);
          if (others.filter((c) => c.pluginId === id).length >= MAX_PER_PLUGIN) return s;
          return { commands: [...others, { pluginId: id, name, description: String(m.description).slice(0, 120) }] };
        });
        break;
      }
      case 'button':
        usePlugins.setState((s) => {
          const mine = s.buttons.filter((b) => b.pluginId === id);
          if (mine.length >= MAX_PER_PLUGIN || mine.some((b) => b.id === String(m.id))) return s;
          return { buttons: [...s.buttons, { pluginId: id, id: String(m.id), label: String(m.label).slice(0, 40) }] };
        });
        break;
    }
  }

  state(state: GameState) {
    this.worker.postMessage({ k: 'state', state });
  }
  log(entries: LogEntry[]) {
    if (entries.length) this.worker.postMessage({ k: 'log', entries });
  }
  command(name: string, args: string) {
    this.worker.postMessage({ k: 'command', name, args });
  }
  press(buttonId: string) {
    this.worker.postMessage({ k: 'button', id: buttonId });
  }

  stop() {
    this.worker.terminate();
    usePlugins.setState((s) => ({ buttons: s.buttons.filter((b) => b.pluginId !== this.plugin.id), commands: s.commands.filter((c) => c.pluginId !== this.plugin.id) }));
  }
}

/** The extensions running at the table now, by plugin id. */
export const running = new Map<string, PluginRunner>();

/** `/name args` typed in the chat: true if an extension took it. */
export function runPluginCommand(text: string): boolean {
  const m = /^\/(\S+)\s*(.*)$/s.exec(text.trim());
  if (!m) return false;
  const cmd = usePlugins.getState().commands.find((c) => c.name === m[1]!.toLowerCase());
  const runner = cmd && running.get(cmd.pluginId);
  if (!runner) return false;
  runner.command(cmd.name, m[2]!);
  return true;
}

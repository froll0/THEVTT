import { newId, type Macro } from '@thevtt/shared';
import { create } from 'zustand';
import { localStore } from '../lib/platform';

/**
 * Each person's macros, on their computer, the same in every campaign.
 * The first ten are on the bar at the table, keys 1 to 0.
 */
interface MacroStore {
  userId: string | null;
  macros: Macro[];
  load(userId: string): Promise<void>;
  save(macro: Macro): void;
  remove(id: string): void;
  move(id: string, by: -1 | 1): void;
  create(partial?: Partial<Macro>): Macro;
}

export const MACRO_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#64d2ff', '#ffd60a', '#8e8e93'];

export const useMacros = create<MacroStore>((set, get) => {
  const persist = () => {
    const { userId, macros } = get();
    if (userId) void localStore.write(`macros-${userId}`, macros);
  };
  return {
    userId: null,
    macros: [],
    load: async (userId) => {
      if (get().userId === userId) return;
      const saved = await localStore.read<Macro[]>(`macros-${userId}`).catch(() => null);
      set({ userId, macros: Array.isArray(saved) ? saved.filter((m) => m && typeof m.body === 'string') : [] });
    },
    save: (macro) => {
      const exists = get().macros.some((m) => m.id === macro.id);
      set({ macros: exists ? get().macros.map((m) => (m.id === macro.id ? macro : m)) : [...get().macros, macro] });
      persist();
    },
    remove: (id) => {
      set({ macros: get().macros.filter((m) => m.id !== id) });
      persist();
    },
    move: (id, by) => {
      const list = [...get().macros];
      const i = list.findIndex((m) => m.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j]!, list[i]!];
      set({ macros: list });
      persist();
    },
    create: (partial) => ({ id: newId(), name: 'Nuova macro', color: MACRO_COLORS[get().macros.length % MACRO_COLORS.length]!, body: '', ...partial }),
  };
});

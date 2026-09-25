import { newId } from '@thevtt/shared';
import { create } from 'zustand';
import { localStore } from '../lib/platform';

/**
 * Homebrew content made by this user (for now: monsters). Kept on this PC,
 * per game system: the GM's stat blocks never leave the GM's machine.
 */
export interface HomebrewMonster<T = unknown> {
  id: string;
  systemId: string;
  data: T;
  updatedAt: number;
}

interface HomebrewStore {
  loaded: boolean;
  monsters: HomebrewMonster[];
  load(): Promise<void>;
  saveMonster(systemId: string, data: unknown, id?: string): string;
  deleteMonster(id: string): void;
}

const KEY = 'homebrew-monsters';
export const HOMEBREW_PREFIX = 'hb:';

export const useHomebrew = create<HomebrewStore>((set, get) => {
  const persist = () => void localStore.write(KEY, get().monsters);
  return {
    loaded: false,
    monsters: [],
    async load() {
      if (get().loaded) return;
      const saved = await localStore.read<HomebrewMonster[]>(KEY);
      set({ loaded: true, monsters: Array.isArray(saved) ? saved : [] });
    },
    saveMonster(systemId, data, id) {
      const monsterId = id ?? `${HOMEBREW_PREFIX}${newId()}`;
      const entry: HomebrewMonster = { id: monsterId, systemId, data, updatedAt: Date.now() };
      set((s) => ({ monsters: [...s.monsters.filter((m) => m.id !== monsterId), entry] }));
      persist();
      return monsterId;
    },
    deleteMonster(id) {
      set((s) => ({ monsters: s.monsters.filter((m) => m.id !== id) }));
      persist();
    },
  };
});

void useHomebrew.getState().load();

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
  /** pictures for creatures (SRD or homebrew), by monster id: small data URLs */
  images: Record<string, string>;
  load(): Promise<void>;
  setImage(monsterId: string, dataUrl: string | null): void;
  saveMonster(systemId: string, data: unknown, id?: string): string;
  deleteMonster(id: string): void;
}

const KEY = 'homebrew-monsters';
const IMAGES_KEY = 'monster-images';
export const HOMEBREW_PREFIX = 'hb:';

export const useHomebrew = create<HomebrewStore>((set, get) => {
  const persist = () => void localStore.write(KEY, get().monsters);
  return {
    loaded: false,
    monsters: [],
    images: {},
    async load() {
      if (get().loaded) return;
      const [saved, images] = await Promise.all([localStore.read<HomebrewMonster[]>(KEY), localStore.read<Record<string, string>>(IMAGES_KEY)]);
      set({ loaded: true, monsters: Array.isArray(saved) ? saved : [], images: images && typeof images === 'object' ? images : {} });
    },
    setImage(monsterId, dataUrl) {
      const images = { ...get().images };
      if (dataUrl) images[monsterId] = dataUrl;
      else delete images[monsterId];
      set({ images });
      void localStore.write(IMAGES_KEY, images);
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
      if (get().images[id]) get().setImage(id, null);
    },
  };
});

void useHomebrew.getState().load();

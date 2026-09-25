import { create } from 'zustand';

/**
 * Floating windows over the table (character sheets, compendium pages):
 * moved, resized and minimised at will. Geometry is remembered per content.
 */
export type WindowKind = 'sheet' | 'compendium';

export interface FloatWin {
  id: string;
  kind: WindowKind;
  /** character id or compendium entry id */
  ref: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  z: number;
}

type Geometry = Pick<FloatWin, 'x' | 'y' | 'w' | 'h'>;
const GEO_KEY = 'thevtt:windows';

function loadGeo(): Record<string, Geometry> {
  try {
    return JSON.parse(localStorage.getItem(GEO_KEY) ?? '{}') as Record<string, Geometry>;
  } catch {
    return {};
  }
}

interface WindowStore {
  windows: FloatWin[];
  open(kind: WindowKind, ref: string, title: string): void;
  close(id: string): void;
  focus(id: string): void;
  update(id: string, patch: Partial<FloatWin>): void;
  toggleMinimized(id: string): void;
  closeAll(): void;
}

let zTop = 10;
const idOf = (kind: WindowKind, ref: string) => `${kind}:${ref}`;

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  open(kind, ref, title) {
    const id = idOf(kind, ref);
    const existing = get().windows.find((w) => w.id === id);
    if (existing) {
      set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, z: ++zTop, title } : w)) }));
      return;
    }
    const saved = loadGeo()[id];
    const size = kind === 'sheet' ? { w: 760, h: 640 } : { w: 520, h: 560 };
    // new windows cascade from the top left of the board
    const n = get().windows.length;
    const geo = saved ?? { x: 80 + n * 28, y: 16 + n * 28, ...size };
    const maxW = window.innerWidth - 40;
    const maxH = window.innerHeight - 90;
    const win: FloatWin = {
      id,
      kind,
      ref,
      title,
      w: Math.min(geo.w, maxW),
      h: Math.min(geo.h, maxH),
      x: Math.max(0, Math.min(geo.x, window.innerWidth - 160)),
      y: Math.max(0, Math.min(geo.y, window.innerHeight - 120)),
      minimized: false,
      z: ++zTop,
    };
    set((s) => ({ windows: [...s.windows, win] }));
  },
  close(id) {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
  },
  focus(id) {
    const w = get().windows.find((x) => x.id === id);
    if (!w || w.z === zTop) return;
    set((s) => ({ windows: s.windows.map((x) => (x.id === id ? { ...x, z: ++zTop } : x)) }));
  },
  update(id, patch) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    if (patch.x !== undefined || patch.y !== undefined || patch.w !== undefined || patch.h !== undefined) {
      const w = get().windows.find((x) => x.id === id);
      if (!w) return;
      const all = loadGeo();
      all[id] = { x: w.x, y: w.y, w: w.w, h: w.h };
      try {
        localStorage.setItem(GEO_KEY, JSON.stringify(all));
      } catch {
        /* not important */
      }
    }
  },
  toggleMinimized(id) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized, z: ++zTop } : w)) }));
  },
  closeAll: () => set({ windows: [] }),
}));

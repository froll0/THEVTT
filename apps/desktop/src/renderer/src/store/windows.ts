import { create } from 'zustand';

/**
 * Floating windows over the table (character sheets, compendium pages):
 * moved, resized and minimised at will. Geometry is remembered per content.
 */
export type WindowKind = 'sheet' | 'compendium' | 'journal';

export interface FloatWin {
  id: string;
  kind: WindowKind;
  /** character id, compendium entry id or campaign id (journal) */
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

/** the free part of the board (between the tool rail and the dock, above the dice and macro bars), in layer coordinates */
function stageArea() {
  const fallback = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - 90 };
  const stage = document.querySelector('.stage');
  const layer = document.querySelector('.windows-layer') ?? stage?.parentElement;
  if (!stage || !layer) return fallback;
  const s = stage.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  if (s.width < 200) return fallback;
  // the bars sit at the bottom of the stage
  const bars = [...stage.querySelectorAll('.dicebar, .macrobar')].map((b) => b.getBoundingClientRect().top).filter((t) => t > s.top);
  const bottom = bars.length ? Math.min(...bars) : s.bottom;
  // and the tool rail on the left
  const rail = stage.querySelector('.rail')?.getBoundingClientRect();
  const left = rail && rail.right < s.left + s.width / 3 ? rail.right : s.left;
  return { x: left - l.left, y: s.top - l.top, w: s.right - left, h: Math.max(200, bottom - s.top) };
}
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
    const size = kind === 'sheet' ? { w: 760, h: 640 } : kind === 'journal' ? { w: 640, h: 520 } : { w: 520, h: 560 };
    // new windows cascade from the top left of the board, inside the stage: the dock and the
    // bars at the bottom stay reachable even on small screens
    const n = get().windows.length;
    const area = stageArea();
    const geo = saved ?? { x: area.x + 16 + n * 28, y: area.y + 16 + n * 28, ...size };
    const maxW = saved ? window.innerWidth - 40 : Math.max(320, area.x + area.w - geo.x - 8);
    const maxH = saved ? window.innerHeight - 90 : Math.max(240, area.y + area.h - geo.y - 8);
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

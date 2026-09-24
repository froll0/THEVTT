import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type FontChoice = 'sans' | 'rounded' | 'serif' | 'mono';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type NameMode = 'always' | 'hover' | 'never';

export interface Settings {
  theme: ThemeMode;
  accent: string;
  font: FontChoice;
  uiScale: number;
  radius: number;
  density: Density;
  glass: boolean;
  reduceMotion: boolean;
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  dockPosition: 'left' | 'right';
  /** direct WebRTC link with the GM/players instead of the server relay */
  directConnection: boolean;
  board: {
    background: string;
    gridColor: string;
    gridOpacity: number;
    tokenNames: NameMode;
    hpBars: boolean;
  };
  customCss: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: '#c9a227',
  font: 'sans',
  uiScale: 1,
  radius: 10,
  density: 'comfortable',
  glass: true,
  reduceMotion: false,
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  dockPosition: 'right',
  directConnection: true,
  board: { background: '#0d0e10', gridColor: '#ffffff', gridOpacity: 0.12, tokenNames: 'hover', hpBars: true },
  customCss: '',
};

export interface ThemePreset {
  id: string;
  name: string;
  patch: Partial<Settings>;
}

export const PRESETS: ThemePreset[] = [
  { id: 'default', name: 'Ossidiana', patch: { theme: 'dark', accent: '#c9a227', font: 'sans', radius: 10 } },
  { id: 'arcane', name: 'Arcano', patch: { theme: 'dark', accent: '#8b7cf6', font: 'sans', radius: 14 } },
  { id: 'forest', name: 'Foresta', patch: { theme: 'dark', accent: '#5fb58a', font: 'rounded', radius: 12 } },
  { id: 'ember', name: 'Brace', patch: { theme: 'dark', accent: '#e4572e', font: 'sans', radius: 6 } },
  { id: 'parchment', name: 'Pergamena', patch: { theme: 'light', accent: '#9a3b2a', font: 'serif', radius: 4 } },
  { id: 'paper', name: 'Carta', patch: { theme: 'light', accent: '#2f6fed', font: 'sans', radius: 10 } },
  { id: 'terminal', name: 'Terminale', patch: { theme: 'dark', accent: '#39d353', font: 'mono', radius: 0 } },
];

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  setBoard: (patch: Partial<Settings['board']>) => void;
  reset: () => void;
  importJson: (json: string) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      setBoard: (patch) => set((s) => ({ board: { ...s.board, ...patch } })),
      reset: () => set(DEFAULT_SETTINGS),
      importJson: (json) => {
        const parsed = JSON.parse(json) as Partial<Settings>;
        set((s) => ({ ...DEFAULT_SETTINGS, ...s, ...parsed, board: { ...s.board, ...(parsed.board ?? {}) } }));
      },
    }),
    { name: 'thevtt:settings', version: 1 },
  ),
);

export function exportSettings(s: Settings): string {
  const { theme, accent, font, uiScale, radius, density, glass, reduceMotion, sidebarPosition, sidebarCollapsed, dockPosition, board, customCss } = s;
  return JSON.stringify({ theme, accent, font, uiScale, radius, density, glass, reduceMotion, sidebarPosition, sidebarCollapsed, dockPosition, board, customCss }, null, 2);
}

const FONTS: Record<FontChoice, string> = {
  sans: '"Inter", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif',
  rounded: '"Nunito", "SF Pro Rounded", "Varela Round", system-ui, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  mono: '"JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, monospace',
};

/** Black or white, whichever reads better on the given color (WCAG relative luminance). */
export function readableOn(hex: string): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#111111' : '#ffffff';
}

const DENSITY: Record<Density, number> = { compact: 0.8, comfortable: 1, spacious: 1.25 };

/** Mirrors settings onto CSS custom properties: the whole UI is driven by them. */
export function applySettings(s: Settings, prefersDark: boolean): void {
  const root = document.documentElement;
  const dark = s.theme === 'system' ? prefersDark : s.theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.glass = String(s.glass);
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'full';
  root.style.setProperty('--accent', s.accent);
  root.style.setProperty('--accent-fg', readableOn(s.accent));
  root.style.setProperty('--font', FONTS[s.font]);
  root.style.setProperty('--radius', `${s.radius}px`);
  root.style.setProperty('--space', String(DENSITY[s.density]));
  root.style.fontSize = `${14 * s.uiScale}px`;

  let style = document.getElementById('thevtt-custom-css');
  if (!style) {
    style = document.createElement('style');
    style.id = 'thevtt-custom-css';
    document.head.appendChild(style);
  }
  style.textContent = s.customCss;
}

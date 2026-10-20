import type { DiceSkin } from '@thevtt/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setLanguage, type Language } from '../i18n';

export type ThemeMode = 'dark' | 'light' | 'system';
export type FontChoice = 'fantasy' | 'sans' | 'rounded' | 'serif' | 'mono';
/** the look: tavern wood, brass and parchment, or Apple-like glass */
export type Skin = 'fantasy' | 'glass';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type NameMode = 'always' | 'hover' | 'never';

export interface Settings {
  /** interface language; game texts stay in Italian */
  language: Language;
  theme: ThemeMode;
  skin: Skin;
  accent: string;
  font: FontChoice;
  uiScale: number;
  radius: number;
  density: Density;
  glass: boolean;
  reduceMotion: boolean;
  /** colours that don't rely on red and green (hit points, alerts) */
  colorblind: boolean;
  /** stronger text and borders, no transparency */
  highContrast: boolean;
  /** what happens at the table is read out by screen readers */
  announce: boolean;
  dockPosition: 'left' | 'right';
  /** direct WebRTC link with the GM/players instead of the server relay */
  directConnection: boolean;
  /** table music volume, 0..1 (each player sets their own) */
  musicVolume: number;
  /** rolling 3D dice on the table */
  dice3d: boolean;
  /** one's own dice, seen by the whole table (null: the player colour) */
  diceSkin: DiceSkin | null;
  /** lines spoken as a character are read aloud, a voice per character */
  npcVoices: boolean;
  board: {
    background: string;
    gridColor: string;
    gridOpacity: number;
    tokenNames: NameMode;
    hpBars: boolean;
  };
  customCss: string;
  /** voice and video: chosen devices (empty = the system's), volume per person 0..1, video tiles */
  call: {
    micId: string;
    camId: string;
    outId: string;
    volumes: Record<string, number>;
    tiles: 'small' | 'large' | 'hidden';
  };
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'it',
  theme: 'system',
  skin: 'fantasy',
  accent: '#c9973f',
  font: 'fantasy',
  uiScale: 1,
  radius: 6,
  density: 'comfortable',
  glass: true,
  reduceMotion: false,
  colorblind: false,
  highContrast: false,
  announce: true,
  dockPosition: 'right',
  directConnection: true,
  musicVolume: 0.6,
  dice3d: true,
  diceSkin: null,
  npcVoices: false,
  board: { background: '#15110c', gridColor: '#f2dcb0', gridOpacity: 0.12, tokenNames: 'hover', hpBars: true },
  customCss: '',
  call: { micId: '', camId: '', outId: '', volumes: {}, tiles: 'small' },
};

export interface ThemePreset {
  id: string;
  name: string;
  patch: Partial<Settings>;
}

export const PRESETS: ThemePreset[] = [
  // the fantasy looks: wood, brass, leather and parchment
  { id: 'tavern', name: 'Locanda', patch: { skin: 'fantasy', theme: 'dark', accent: '#c9973f', font: 'fantasy', radius: 6 } },
  { id: 'scroll', name: 'Pergamena', patch: { skin: 'fantasy', theme: 'light', accent: '#8e2f24', font: 'fantasy', radius: 6 } },
  { id: 'grimoire', name: 'Grimorio', patch: { skin: 'fantasy', theme: 'dark', accent: '#a688e8', font: 'fantasy', radius: 6 } },
  { id: 'greenwood', name: 'Bosco antico', patch: { skin: 'fantasy', theme: 'dark', accent: '#7fae5c', font: 'fantasy', radius: 6 } },
  { id: 'forge', name: 'Forgia', patch: { skin: 'fantasy', theme: 'dark', accent: '#de6a35', font: 'fantasy', radius: 4 } },
  { id: 'frost', name: 'Gelo', patch: { skin: 'fantasy', theme: 'dark', accent: '#8ec5e6', font: 'fantasy', radius: 6 } },
  { id: 'court', name: 'Corte', patch: { skin: 'fantasy', theme: 'light', accent: '#24527a', font: 'fantasy', radius: 6 } },
  // the clean ones, as before
  { id: 'default', name: 'Vetro', patch: { skin: 'glass', theme: 'system', accent: '#0a84ff', font: 'sans', radius: 12 } },
  { id: 'graphite', name: 'Grafite', patch: { skin: 'glass', theme: 'dark', accent: '#e6e6e8', font: 'sans', radius: 8 } },
  { id: 'paper', name: 'Carta', patch: { skin: 'glass', theme: 'light', accent: '#1f1f22', font: 'sans', radius: 8 } },
  { id: 'terminal', name: 'Terminale', patch: { skin: 'glass', theme: 'dark', accent: '#39d353', font: 'mono', radius: 0 } },
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
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, call: s.call })),
      importJson: (json) => {
        const parsed = JSON.parse(json) as Partial<Settings>;
        set((s) => ({ ...DEFAULT_SETTINGS, ...s, ...parsed, board: { ...s.board, ...(parsed.board ?? {}) } }));
      },
    }),
    {
      name: 'thevtt:settings',
      version: 3,
      migrate: (persisted, version) => {
        let s = (persisted ?? {}) as Partial<Settings>;
        // v2 (the glass redesign): whoever kept the old default look gets the new one
        if (version < 2 && s.accent === '#c9a227' && (s.radius ?? 8) === 8 && s.theme === 'dark') s = { ...s, theme: 'system', accent: '#0a84ff', radius: 12 };
        // v3 (the fantasy redesign): everyone moves to it; their own colour, font and corners stay if they chose them
        if (version < 3) {
          s = { ...s, skin: 'fantasy' };
          if (!s.accent || s.accent === '#0a84ff') s.accent = '#c9973f';
          if (!s.font || s.font === 'sans') s.font = 'fantasy';
          if (s.radius === undefined || s.radius === 12) s.radius = 6;
          // the table's wood, unless one picked another colour
          if (!s.board || (s.board.background === '#0d0e10' && s.board.gridColor === '#ffffff')) s.board = { ...(s.board ?? DEFAULT_SETTINGS.board), background: '#15110c', gridColor: '#f2dcb0' };
        }
        return s as Settings;
      },
      // settings saved before a field existed get its default
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        return { ...current, ...p, board: { ...current.board, ...(p.board ?? {}) }, call: { ...current.call, ...(p.call ?? {}) } };
      },
    },
  ),
);

export function exportSettings(s: Settings): string {
  const { theme, skin, accent, font, uiScale, radius, density, glass, reduceMotion, dockPosition, board, customCss } = s;
  return JSON.stringify({ theme, skin, accent, font, uiScale, radius, density, glass, reduceMotion, dockPosition, board, customCss }, null, 2);
}

const FONTS: Record<FontChoice, string> = {
  // a humanist sans, readable in dense panels; titles and long texts get their own (see fantasy.css)
  fantasy: '"Alegreya Sans", "Segoe UI", system-ui, sans-serif',
  // San Francisco on a Mac, Inter (shipped with the app) elsewhere
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  rounded: '"Nunito", "SF Pro Rounded", "Varela Round", system-ui, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  mono: '"JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, monospace',
};

/** White or black text on the given colour (WCAG relative luminance), preferring white as Apple does. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // white whenever it is legible enough for button labels (like system blue), black on light accents
  return 1.05 / (L + 0.05) >= 3 ? '#ffffff' : '#111111';
}

const DENSITY: Record<Density, number> = { compact: 0.8, comfortable: 1, spacious: 1.25 };

/** Mirrors settings onto CSS custom properties: the whole UI is driven by them. */
export function applySettings(s: Settings, prefersDark: boolean): void {
  const root = document.documentElement;
  const dark = s.theme === 'system' ? prefersDark : s.theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.skin = s.skin ?? 'fantasy';
  root.dataset.glass = String(s.glass);
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'full';
  root.dataset.contrast = s.highContrast ? 'high' : 'normal';
  root.dataset.colorblind = String(!!s.colorblind);
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
  setLanguage(s.language ?? 'it');
}

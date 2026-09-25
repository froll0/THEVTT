import type { GameState } from '@thevtt/shared';
import { sightFor } from '@thevtt/shared';

/**
 * What a player has already seen on a scene, one bit per cell, kept on their
 * PC. With dynamic vision on, those areas stay visible in the dark (the map,
 * never the tokens).
 */
const RADIUS = 40;

interface Memory {
  key: string;
  w: number;
  h: number;
  cells: Uint8Array;
  canvas: HTMLCanvasElement | null;
  changed: boolean;
  saveTimer: ReturnType<typeof setTimeout> | null;
}

let current: Memory | null = null;

const storageKey = (campaignId: string, sceneId: string) => `thevtt:explored:${campaignId}:${sceneId}`;

function load(campaignId: string, sceneId: string, w: number, h: number): Memory {
  const key = storageKey(campaignId, sceneId);
  const cells = new Uint8Array(w * h);
  try {
    const raw = localStorage.getItem(key);
    const saved = raw ? (JSON.parse(raw) as { w: number; h: number; runs: number[] }) : null;
    // run-length encoded, dropped if the scene was resized
    if (saved && saved.w === w && saved.h === h) {
      let i = 0;
      saved.runs.forEach((n, k) => {
        if (k % 2) cells.fill(1, i, i + n);
        i += n;
      });
    }
  } catch {
    /* start fresh */
  }
  return { key, w, h, cells, canvas: null, changed: true, saveTimer: null };
}

function save(m: Memory) {
  const runs: number[] = [];
  let v = 0;
  let n = 0;
  for (const c of m.cells) {
    if (c === v) n++;
    else {
      runs.push(n);
      v = c;
      n = 1;
    }
  }
  runs.push(n);
  try {
    localStorage.setItem(m.key, JSON.stringify({ w: m.w, h: m.h, runs }));
  } catch {
    /* storage full: memory only for this session */
  }
}

/** Marks what the user's tokens see now. Call when the state changes. */
export function updateExplored(state: GameState, userId: string): void {
  const scene = state.scenes[state.activeSceneId];
  if (!scene?.vision) return;
  const w = scene.widthCells;
  const h = scene.heightCells;
  const key = storageKey(state.campaignId, scene.id);
  if (!current || current.key !== key || current.w !== w || current.h !== h) current = load(state.campaignId, scene.id, w, h);
  const m = current;
  const sight = sightFor(state, userId);
  let added = false;
  for (const v of sight.viewers) {
    const x0 = Math.max(0, Math.floor(v.x - RADIUS));
    const x1 = Math.min(w - 1, Math.ceil(v.x + RADIUS));
    const y0 = Math.max(0, Math.floor(v.y - RADIUS));
    const y1 = Math.min(h - 1, Math.ceil(v.y + RADIUS));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (m.cells[i]) continue;
        if (sight.canSee([{ x: x + 0.5, y: y + 0.5 }])) {
          m.cells[i] = 1;
          added = true;
        }
      }
    }
  }
  if (added) {
    m.changed = true;
    if (m.saveTimer) clearTimeout(m.saveTimer);
    m.saveTimer = setTimeout(() => save(m), 1500);
  }
}

/** 1 px per cell, opaque where explored: scaled up (smoothly) over the scene. */
export function exploredTexture(campaignId: string, sceneId: string): HTMLCanvasElement | null {
  const m = current;
  if (!m || m.key !== storageKey(campaignId, sceneId)) return null;
  if (!m.canvas || m.changed) {
    m.canvas ??= document.createElement('canvas');
    m.canvas.width = m.w;
    m.canvas.height = m.h;
    const c = m.canvas.getContext('2d')!;
    const img = c.createImageData(m.w, m.h);
    for (let i = 0; i < m.cells.length; i++) img.data[i * 4 + 3] = m.cells[i] ? 255 : 0;
    c.putImageData(img, 0, 0);
    m.changed = false;
  }
  return m.canvas;
}

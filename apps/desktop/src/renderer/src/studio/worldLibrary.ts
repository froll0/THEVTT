import { isWorldMap, normalizeWorld, WORLD_FILE_EXT, type WorldMap } from '@thevtt/shared';
import { localStore } from '../lib/platform';
import { renderWorldImage } from './worldRender';

/**
 * The world maps made in the studio, on this computer: an index with names and
 * thumbnails, each map in its own file. They go with the backups like the rest.
 */
export interface WorldEntry {
  id: string;
  name: string;
  savedAt: string;
  thumb: string;
  width: number;
  height: number;
}

const INDEX = 'world-library';
const fileKey = (id: string) => `world-${id}`;

export async function listWorlds(): Promise<WorldEntry[]> {
  const list = await localStore.read<WorldEntry[]>(INDEX);
  return Array.isArray(list) ? list : [];
}

/** Saves (or saves again) a world; its thumbnail is redrawn. */
export async function saveWorld(w: WorldMap): Promise<WorldEntry> {
  const scale = Math.min(1, 360 / Math.max(w.width, w.height));
  const thumb = renderWorldImage(w, scale, { noGrid: true }).toDataURL('image/jpeg', 0.8);
  const entry: WorldEntry = { id: w.id, name: w.name || 'Mondo senza nome', savedAt: new Date().toISOString(), thumb, width: w.width, height: w.height };
  await localStore.write(fileKey(w.id), w);
  const rest = (await listWorlds()).filter((e) => e.id !== w.id);
  await localStore.write(INDEX, [entry, ...rest]);
  return entry;
}

export async function loadWorld(id: string): Promise<WorldMap | null> {
  const w = await localStore.read<WorldMap>(fileKey(id));
  return isWorldMap(w) ? normalizeWorld(w) : null;
}

export async function deleteWorld(id: string): Promise<void> {
  await localStore.write(INDEX, (await listWorlds()).filter((e) => e.id !== id));
  await localStore.write(fileKey(id), null);
}

export function worldFile(w: WorldMap): { href: string; name: string } {
  const blob = new Blob([JSON.stringify(w)], { type: 'application/json' });
  return { href: URL.createObjectURL(blob), name: `${w.name || 'Mondo'}.${WORLD_FILE_EXT}` };
}

export async function readWorldFile(file: File): Promise<WorldMap> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Il file non è un mondo che TheVTT sa leggere');
  }
  if (!isWorldMap(parsed)) throw new Error('Il file non è un mondo che TheVTT sa leggere');
  return normalizeWorld(parsed);
}

import { describePackage, isMapPackage, MAP_FILE_EXT, newId, type MapPackage } from '@thevtt/shared';
import { renderPackage } from '../table/sceneImage';
import { localStore } from './platform';

/**
 * The GM's map library, on this computer and outside any campaign: an index
 * with names and thumbnails, and each map in its own file (maps with pictures
 * are big). It travels with the backups like everything else the app keeps.
 */
export interface LibraryEntry {
  id: string;
  name: string;
  savedAt: string;
  /** small JPEG of the map */
  thumb: string;
  info: ReturnType<typeof describePackage>;
}

const INDEX = 'map-library';
const fileKey = (id: string) => `map-${id}`;

export async function listMaps(): Promise<LibraryEntry[]> {
  const list = await localStore.read<LibraryEntry[]>(INDEX);
  return Array.isArray(list) ? list : [];
}

async function writeIndex(list: LibraryEntry[]) {
  await localStore.write(INDEX, list);
}

export async function saveMap(pkg: MapPackage): Promise<LibraryEntry> {
  const id = newId();
  const thumb = (await renderPackage(pkg, 360)).toDataURL('image/jpeg', 0.8);
  const entry: LibraryEntry = { id, name: pkg.name, savedAt: new Date().toISOString(), thumb, info: describePackage(pkg) };
  await localStore.write(fileKey(id), pkg);
  await writeIndex([entry, ...(await listMaps())]);
  return entry;
}

export async function loadMap(id: string): Promise<MapPackage | null> {
  const pkg = await localStore.read<MapPackage>(fileKey(id));
  return isMapPackage(pkg) ? pkg : null;
}

export async function renameMap(id: string, name: string): Promise<void> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return;
  await writeIndex((await listMaps()).map((e) => (e.id === id ? { ...e, name: clean } : e)));
  const pkg = await loadMap(id);
  if (pkg) await localStore.write(fileKey(id), { ...pkg, name: clean });
}

export async function deleteMap(id: string): Promise<void> {
  await writeIndex((await listMaps()).filter((e) => e.id !== id));
  await localStore.write(fileKey(id), null);
}

/** The map as a file to give to another GM. */
export function mapFile(pkg: MapPackage): { href: string; name: string } {
  const blob = new Blob([JSON.stringify(pkg)], { type: 'application/json' });
  return { href: URL.createObjectURL(blob), name: `${pkg.name}.${MAP_FILE_EXT}` };
}

/** Reads a map file (from another GM, or from a backup of one's own). */
export async function readMapFile(file: File): Promise<MapPackage> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Il file non è una mappa di TheVTT');
  }
  if (!isMapPackage(parsed)) throw new Error('Il file non è una mappa di TheVTT');
  return parsed;
}

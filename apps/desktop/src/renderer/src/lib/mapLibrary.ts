import { describePackage, fromUniversalVtt, isMapPackage, isUniversalVtt, MAP_FILE_EXT, newId, type MapPackage } from '@thevtt/shared';
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

/** Saves a map again over its own entry (the map studio), or as a new one if it's gone. */
export async function updateMap(id: string, pkg: MapPackage): Promise<LibraryEntry> {
  const thumb = (await renderPackage(pkg, 360)).toDataURL('image/jpeg', 0.8);
  const entry: LibraryEntry = { id, name: pkg.name, savedAt: new Date().toISOString(), thumb, info: describePackage(pkg) };
  await localStore.write(fileKey(id), pkg);
  await writeIndex([entry, ...(await listMaps()).filter((e) => e.id !== id)]);
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

/** The pictures of a map made elsewhere can be huge: past this they are made lighter. */
const MAX_PICTURE = 9 * 1024 * 1024;

async function lighter(dataUrl: string): Promise<string> {
  if (dataUrl.length <= MAX_PICTURE) return dataUrl;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  // big maps lose a little size first, then quality
  let scale = Math.min(1, 8192 / Math.max(img.width, img.height));
  for (let q = 0.88; ; q -= 0.12, scale *= 0.85) {
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL('image/jpeg', Math.max(0.5, q));
    if (out.length <= MAX_PICTURE || q < 0.5) return out;
  }
}

/** Reads a map file: one of ours (from another GM, or a backup), or a Universal VTT one (Dungeondraft, Dungeon Alchemist…). */
export async function readMapFile(file: File): Promise<MapPackage> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Il file non è una mappa che TheVTT sa leggere');
  }
  if (isMapPackage(parsed)) return parsed;
  if (isUniversalVtt(parsed)) {
    const pkg = fromUniversalVtt(parsed, file.name.replace(/\.[^.]+$/, '') || 'Mappa');
    const map = pkg.assets.map;
    if (map) {
      // the picture is drawn at its own size: if it shrinks, its grid shrinks with it
      const small = await lighter(map);
      if (small !== map && pkg.scene.bgCellPx) {
        const [a, b] = await Promise.all([map, small].map(async (u) => { const i = new Image(); i.src = u; await i.decode(); return i.width; }));
        pkg.scene.bgCellPx = Math.round(pkg.scene.bgCellPx * (b! / a!) * 100) / 100;
      }
      pkg.assets.map = small;
    }
    return pkg;
  }
  throw new Error('Il file non è una mappa che TheVTT sa leggere');
}

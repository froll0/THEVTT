import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { BackupSummary } from '../preload/api';

/**
 * Backups of everything this PC keeps: the hosted server's database (users,
 * campaigns, characters, journals, chat), the tables (maps, tokens, walls…),
 * homebrew and the group identity behind the group code. One gzipped JSON
 * file, so it can be copied anywhere and restored on another computer.
 */

export const BACKUP_EXT = 'thevtt-backup';
const DB_FILE = 'server/thevtt.sqlite';
const DATA_DIR = 'data';
/** only plain JSON files directly in the data folder travel (no binaries, no sub-folders) */
const DATA_FILE = /^data\/[A-Za-z0-9_.-]+\.json$/;

export interface BackupFile {
  thevtt: 'backup';
  version: 1;
  createdAt: string;
  appVersion: string;
  /** relative path → base64 content */
  files: Record<string, string>;
}

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false,
  );

/** A consistent copy of the database, even while the server is using it. */
async function snapshotDb(dbPath: string, tmpDir: string): Promise<Buffer | null> {
  if (!(await exists(dbPath))) return null;
  await mkdir(tmpDir, { recursive: true });
  const tmp = join(tmpDir, `snapshot-${process.pid}-${Date.now()}.sqlite`);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  try {
    return await readFile(tmp);
  } finally {
    await rm(tmp, { force: true });
  }
}

export async function createBackup(userData: string, appVersion: string, now = new Date()): Promise<Buffer> {
  const files: Record<string, string> = {};
  const db = await snapshotDb(join(userData, DB_FILE), join(userData, 'tmp'));
  if (db) files[DB_FILE] = db.toString('base64');
  const dataDir = join(userData, DATA_DIR);
  if (await exists(dataDir)) {
    for (const name of await readdir(dataDir)) {
      const rel = `${DATA_DIR}/${name}`;
      if (!DATA_FILE.test(rel)) continue;
      const s = await stat(join(dataDir, name));
      if (s.isFile()) files[rel] = (await readFile(join(dataDir, name))).toString('base64');
    }
  }
  const backup: BackupFile = { thevtt: 'backup', version: 1, createdAt: now.toISOString(), appVersion, files };
  return gzipSync(Buffer.from(JSON.stringify(backup)));
}

export function readBackup(raw: Buffer): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(gunzipSync(raw).toString('utf8'));
  } catch {
    throw new Error('Il file non è un backup di TheVTT');
  }
  const b = parsed as Partial<BackupFile>;
  if (b?.thevtt !== 'backup' || b.version !== 1 || !b.files || typeof b.files !== 'object') throw new Error('Il file non è un backup di TheVTT');
  for (const [path, content] of Object.entries(b.files)) {
    // never write outside the known places
    if ((path !== DB_FILE && !DATA_FILE.test(path)) || typeof content !== 'string') throw new Error('Backup danneggiato o non valido');
  }
  return b as BackupFile;
}

export function summarize(b: BackupFile, bytes: number): BackupSummary {
  return {
    createdAt: b.createdAt,
    appVersion: b.appVersion,
    tables: Object.keys(b.files).filter((p) => /^data\/table-.+\.json$/.test(p)).length,
    hasServer: DB_FILE in b.files,
    bytes,
  };
}

/**
 * Puts a backup in place of the current data. The server must be stopped.
 * What was there before is kept aside in `restore-previous` until the next restore.
 */
export async function applyBackup(userData: string, b: BackupFile): Promise<void> {
  const previous = join(userData, 'restore-previous');
  await rm(previous, { recursive: true, force: true });
  await mkdir(previous, { recursive: true });
  for (const rel of ['server', DATA_DIR]) {
    if (await exists(join(userData, rel))) await rename(join(userData, rel), join(previous, rel));
  }
  await mkdir(join(userData, 'server'), { recursive: true });
  await mkdir(join(userData, DATA_DIR), { recursive: true });
  // the cloudflared binary and other non-JSON files stay where they are
  const prevData = join(previous, DATA_DIR);
  if (await exists(prevData)) {
    for (const name of await readdir(prevData)) {
      if (!DATA_FILE.test(`${DATA_DIR}/${name}`)) await rename(join(prevData, name), join(userData, DATA_DIR, name));
    }
  }
  for (const [rel, content] of Object.entries(b.files)) await writeFile(join(userData, rel), Buffer.from(content, 'base64'));
}

// ---------- automatic backups ----------

export const autoDir = (userData: string) => join(userData, 'backups');

export interface AutoBackup {
  name: string;
  createdAt: string;
  bytes: number;
}

export async function listAuto(userData: string): Promise<AutoBackup[]> {
  const dir = autoDir(userData);
  if (!(await exists(dir))) return [];
  const out: AutoBackup[] = [];
  for (const name of await readdir(dir)) {
    if (!name.endsWith(`.${BACKUP_EXT}`)) continue;
    const s = await stat(join(dir, name));
    // automatic ones carry their time in the name (copies keep it, unlike file dates)
    const m = /^auto-(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})\./.exec(name);
    out.push({ name, createdAt: m ? new Date(`${m[1]}T${m[2]}:${m[3]}:00Z`).toISOString() : s.mtime.toISOString(), bytes: s.size });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** How many automatic backups to keep: the last days, then one a week, then one a month. */
export interface Rotation {
  daily: number;
  weekly: number;
  monthly: number;
}
export const DEFAULT_ROTATION: Rotation = { daily: 7, weekly: 4, monthly: 6 };

const weekOf = (d: Date) => {
  // Monday-based week number since the epoch: enough to tell weeks apart
  const day = Math.floor(d.getTime() / 86400_000);
  return Math.floor((day + 3) / 7);
};

/** Which backups (newest first) the rotation keeps. */
export function rotationKeeps(list: AutoBackup[], r: Rotation): Set<string> {
  const keep = new Set<string>(list.slice(0, r.daily).map((b) => b.name));
  const pick = (key: (d: Date) => string | number, n: number) => {
    const seen = new Set<string | number>();
    for (const b of list) {
      const k = key(new Date(b.createdAt));
      if (seen.has(k)) continue;
      if (seen.size >= n) break;
      seen.add(k);
      keep.add(b.name);
    }
  };
  pick(weekOf, r.weekly);
  pick((d) => d.toISOString().slice(0, 7), r.monthly);
  return keep;
}

/**
 * One backup a day at most; older ones thin out (a week's worth, then one a
 * week, then one a month). Returns the file made, if any.
 */
export async function autoBackup(userData: string, appVersion: string, keep: number | Rotation = DEFAULT_ROTATION, now = new Date()): Promise<string | null> {
  const hasData = (await exists(join(userData, DB_FILE))) || (await exists(join(userData, DATA_DIR)));
  if (!hasData) return null;
  const list = await listAuto(userData);
  if (list[0] && now.getTime() - new Date(list[0].createdAt).getTime() < 20 * 3600_000) return null;
  const dir = autoDir(userData);
  await mkdir(dir, { recursive: true });
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const file = join(dir, `auto-${stamp}.${BACKUP_EXT}`);
  await writeFile(file, await createBackup(userData, appVersion, now));
  const rotation = typeof keep === 'number' ? { daily: keep, weekly: 0, monthly: 0 } : keep;
  const all = await listAuto(userData);
  const kept = rotationKeeps(all, rotation);
  for (const old of all) if (!kept.has(old.name)) await rm(join(dir, old.name), { force: true });
  return file;
}

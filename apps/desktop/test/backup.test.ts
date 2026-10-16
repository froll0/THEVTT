import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { applyBackup, autoBackup, createBackup, listAuto, readBackup, rotationKeeps, summarize } from '../src/main/backup';

function fakeProfile() {
  const dir = mkdtempSync(join(tmpdir(), 'thevtt-backup-'));
  mkdirSync(join(dir, 'server'), { recursive: true });
  mkdirSync(join(dir, 'data'), { recursive: true });
  mkdirSync(join(dir, 'bin'), { recursive: true });
  const db = new DatabaseSync(join(dir, 'server', 'thevtt.sqlite'));
  db.exec("PRAGMA journal_mode = WAL; CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('miniera')");
  // left open on purpose: the server is running while the backup is taken
  writeFileSync(join(dir, 'data', 'table-c1.json'), JSON.stringify({ campaignId: 'c1' }));
  writeFileSync(join(dir, 'data', 'group-identity.json'), '{"publicKey":"k"}');
  writeFileSync(join(dir, 'data', 'notes.txt'), 'not travelling');
  writeFileSync(join(dir, 'bin', 'cloudflared'), 'binary');
  return { dir, db };
}

describe('backups', () => {
  it('saves the database and the tables, and restores them elsewhere', async () => {
    const { dir, db } = fakeProfile();
    const raw = await createBackup(dir, '0.6.0');
    db.close();
    const b = readBackup(raw);
    expect(Object.keys(b.files).sort()).toEqual(['data/group-identity.json', 'data/table-c1.json', 'server/thevtt.sqlite']);
    expect(summarize(b, raw.length)).toMatchObject({ appVersion: '0.6.0', tables: 1, hasServer: true });

    // another PC, with its own data
    const other = mkdtempSync(join(tmpdir(), 'thevtt-restore-'));
    mkdirSync(join(other, 'data'), { recursive: true });
    mkdirSync(join(other, 'data', 'bin-like'), { recursive: true });
    writeFileSync(join(other, 'data', 'table-old.json'), '{}');
    await applyBackup(other, b);
    const restored = new DatabaseSync(join(other, 'server', 'thevtt.sqlite'));
    expect(restored.prepare('SELECT v FROM t').get()).toEqual({ v: 'miniera' });
    restored.close();
    expect(JSON.parse(readFileSync(join(other, 'data', 'table-c1.json'), 'utf8'))).toEqual({ campaignId: 'c1' });
    // what was there is set aside, not lost
    expect(existsSync(join(other, 'data', 'table-old.json'))).toBe(false);
    expect(existsSync(join(other, 'restore-previous', 'data', 'table-old.json'))).toBe(true);
  });

  it('refuses files that are not backups or that point outside the data', () => {
    expect(() => readBackup(Buffer.from('ciao'))).toThrow('non è un backup');
    const evil = { thevtt: 'backup', version: 1, createdAt: '', appVersion: '', files: { '../evil.json': 'eA==' } };
    expect(() => readBackup(gzipSync(Buffer.from(JSON.stringify(evil))))).toThrow('non valido');
  });

  it('keeps one automatic backup a day, the last few', async () => {
    const { dir, db } = fakeProfile();
    const day = (n: number) => new Date(Date.UTC(2026, 9, n, 10));
    expect(await autoBackup(dir, '0.6.0', 2, day(1))).toBeTruthy();
    expect(await autoBackup(dir, '0.6.0', 2, day(1))).toBeNull();
    db.close();
    for (const n of [2, 3]) expect(await autoBackup(dir, '0.6.0', 2, day(n))).toBeTruthy();
    const list = await listAuto(dir);
    expect(list.map((b) => b.createdAt.slice(0, 10))).toEqual(['2026-10-03', '2026-10-02']);
  });

  it('thins old backups out: the last days, one a week, one a month', () => {
    // a backup every day for 120 days, newest first
    const list = Array.from({ length: 120 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 1) - i * 86400_000);
      return { name: `b${i}`, createdAt: d.toISOString(), bytes: 1 };
    });
    const kept = rotationKeeps(list, { daily: 7, weekly: 4, monthly: 4 });
    const days = list.filter((b) => kept.has(b.name)).map((b) => b.createdAt.slice(0, 10));
    expect(days.slice(0, 7)).toEqual(list.slice(0, 7).map((b) => b.createdAt.slice(0, 10)));
    // one per month for four months, some weeks in between
    expect(new Set(days.map((d) => d.slice(0, 7))).size).toBe(4);
    expect(kept.size).toBeLessThanOrEqual(15);
    expect(kept.size).toBeGreaterThan(8);
  });
});

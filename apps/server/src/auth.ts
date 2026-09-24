import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from './db';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const TOKEN_TTL_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function issueToken(db: Db, userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = new Date(now.getTime() + TOKEN_TTL_DAYS * 86_400_000);
  db.prepare('INSERT INTO auth_tokens (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now.toISOString(),
    expires.toISOString(),
  );
  return token;
}

export function resolveToken(db: Db, token: string | undefined | null): string | null {
  if (!token) return null;
  const row = db.prepare('SELECT user_id, expires_at FROM auth_tokens WHERE token_hash = ?').get(sha256(token)) as
    | { user_id: string; expires_at: string }
    | undefined;
  if (!row || row.expires_at < new Date().toISOString()) return null;
  return row.user_id;
}

export function revokeToken(db: Db, token: string): void {
  db.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').run(sha256(token));
}

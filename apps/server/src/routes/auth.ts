import type { AuthResponse } from '@thevtt/shared';
import type { FastifyInstance } from 'fastify';
import { bearer, type Ctx } from '../app';
import { hashPassword, issueToken, revokeToken, verifyPassword } from '../auth';
import { image, str, tooMany, unauthorized } from '../errors';

const USERNAME = /^[a-zA-Z0-9_.-]+$/;

/**
 * Wrong passwords, by address and by account: past a handful in a quarter of
 * an hour, logins wait. The server can be reachable from the internet (the
 * tunnel), and passwords should not be guessable by trying.
 */
const FAIL_WINDOW = 15 * 60_000;
const MAX_FAILS = 8;
const fails = new Map<string, number[]>();
function recent(key: string, now = Date.now()): number[] {
  const list = (fails.get(key) ?? []).filter((t) => now - t < FAIL_WINDOW);
  if (list.length) fails.set(key, list);
  else fails.delete(key);
  return list;
}
export function loginBlocked(keys: string[]): boolean {
  return keys.some((k) => recent(k).length >= MAX_FAILS);
}
function loginFailed(keys: string[]): void {
  const now = Date.now();
  for (const k of keys) fails.set(k, [...recent(k, now), now]);
  // an old address or account no one tries any more
  if (fails.size > 5000) for (const k of [...fails.keys()]) recent(k, now);
}
const COLOR = /^#[0-9a-fA-F]{6}$/;

export function authRoutes(app: FastifyInstance, { db, repo }: Ctx): void {
  app.post('/auth/register', async (req): Promise<AuthResponse> => {
    const username = str(req.body, 'username', { min: 3, max: 24, pattern: USERNAME });
    const password = str(req.body, 'password', { min: 8, max: 200 });
    const displayName = str(req.body, 'displayName', { max: 40, optional: true }) || username;
    const user = repo.createUser(username, displayName, await hashPassword(password));
    return { token: issueToken(db, user.id), user };
  });

  app.post('/auth/login', async (req): Promise<AuthResponse> => {
    const username = str(req.body, 'username', { max: 24 });
    const password = str(req.body, 'password', { max: 200 });
    // through the tunnel everyone arrives from this computer: Cloudflare says who it really is
    const cf = req.headers['cf-connecting-ip'];
    const keys = [`ip:${typeof cf === 'string' ? cf : req.ip}`, `user:${username.toLowerCase()}`];
    if (loginBlocked(keys)) throw tooMany('Troppi tentativi sbagliati: riprova tra un quarto d’ora');
    const cred = repo.credentials(username);
    if (!cred || !(await verifyPassword(password, cred.hash))) {
      loginFailed(keys);
      throw unauthorized('Credenziali non valide');
    }
    return { token: issueToken(db, cred.id), user: repo.user(cred.id) };
  });

  app.post('/auth/logout', async (req) => {
    const token = bearer(req);
    if (token) revokeToken(db, token);
    return { ok: true };
  });

  app.get('/me', async (req) => repo.user(req.userId));

  app.patch('/me', async (req) => {
    const displayName = str(req.body, 'displayName', { min: 1, max: 40, optional: true });
    const avatarColor = str(req.body, 'avatarColor', { pattern: COLOR, optional: true });
    const avatar = image(req.body, 'avatar', 80_000);
    return repo.updateProfile(req.userId, { displayName: displayName || undefined, avatarColor: avatarColor || undefined, avatar });
  });
}

import type { AuthResponse } from '@thevtt/shared';
import type { FastifyInstance } from 'fastify';
import { bearer, type Ctx } from '../app';
import { hashPassword, issueToken, revokeToken, verifyPassword } from '../auth';
import { image, str, unauthorized } from '../errors';

const USERNAME = /^[a-zA-Z0-9_.-]+$/;
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
    const cred = repo.credentials(username);
    if (!cred || !(await verifyPassword(password, cred.hash))) throw unauthorized('Credenziali non valide');
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

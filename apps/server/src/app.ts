import cors from '@fastify/cors';
import type { RtcConfig } from '@thevtt/shared';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { resolveToken } from './auth';
import { openDb, type Db } from './db';
import { HttpError, unauthorized } from './errors';
import { Hub } from './hub';
import { Repo } from './repo';
import { authRoutes } from './routes/auth';
import { campaignRoutes } from './routes/campaigns';
import { characterRoutes } from './routes/characters';
import { chatRoutes } from './routes/chat';
import { socialRoutes } from './routes/social';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export interface Ctx {
  db: Db;
  repo: Repo;
  hub: Hub;
}

export interface AppOptions {
  dbPath: string;
  logger?: boolean;
  /** ICE servers handed to clients for direct GM ↔ player connections */
  iceServers?: RtcConfig['iceServers'];
}

export const DEFAULT_ICE_SERVERS: RtcConfig['iceServers'] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];

export function bearer(req: FastifyRequest): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}

export async function buildApp(opts: AppOptions): Promise<{ app: FastifyInstance; ctx: Ctx }> {
  const db = openDb(opts.dbPath);
  const hub = new Hub();
  const repo = new Repo(db, hub);
  hub.attach(repo);
  const ctx: Ctx = { db, repo, hub };

  // forceCloseConnections: closing must not wait for idle keep-alive clients (the desktop app quits with it)
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 4 * 1024 * 1024, forceCloseConnections: true });
  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });

  app.decorateRequest('userId', '');
  app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/auth/register') || req.url.startsWith('/auth/login') || req.url === '/health') return;
    if (req.method === 'OPTIONS') return;
    const userId = resolveToken(db, bearer(req));
    if (!userId) throw unauthorized();
    req.userId = userId;
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.code, message: err.message });
    const { statusCode, message } = err as { statusCode?: number; message?: string };
    if (statusCode && statusCode < 500) return reply.code(statusCode).send({ error: 'bad_request', message: message ?? 'Richiesta non valida' });
    app.log.error(err);
    return reply.code(500).send({ error: 'internal', message: 'Errore interno del server' });
  });

  app.get('/health', async () => ({ ok: true, name: 'thevtt-lobby', version: '0.1.0' }));
  app.get('/rtc/config', async (): Promise<RtcConfig> => ({ iceServers: opts.iceServers ?? DEFAULT_ICE_SERVERS }));
  authRoutes(app, ctx);
  socialRoutes(app, ctx);
  campaignRoutes(app, ctx);
  characterRoutes(app, ctx);
  chatRoutes(app, ctx);

  // WebSocket: /ws?token=...
  app.server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const userId = url.pathname === '/ws' ? resolveToken(db, url.searchParams.get('token')) : null;
    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    hub.handleUpgrade(req, socket, head, userId);
  });

  // websockets are detached from the HTTP server: drop them before it waits for connections to end
  app.addHook('preClose', async () => {
    hub.close();
  });
  app.addHook('onClose', async () => {
    db.close();
  });

  return { app, ctx };
}

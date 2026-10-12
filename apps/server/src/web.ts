import type { FastifyInstance } from 'fastify';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
};

/** The web client at /play/: players join from a browser, no install needed. */
export function webClient(app: FastifyInstance, root: string) {
  const base = normalize(root);
  app.get('/', (_req, reply) => reply.redirect('/play/'));
  app.get('/play', (_req, reply) => reply.redirect('/play/'));
  app.get('/play/*', async (req, reply) => {
    const rel = decodeURIComponent((req.params as { '*': string })['*'] || 'index.html');
    const file = normalize(join(base, rel));
    if (file !== base && !file.startsWith(base + sep)) return reply.code(404).send();
    try {
      const body = await readFile(file);
      const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
      // index.html changes with every version; the hashed assets never do
      reply.header('cache-control', rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      return reply.type(type).send(body);
    } catch {
      return reply.code(404).send({ error: 'not_found', message: 'File non trovato' });
    }
  });
}

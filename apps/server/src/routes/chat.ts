import type { FastifyInstance } from 'fastify';
import type { Ctx } from '../app';
import { str } from '../errors';

type ChannelParams = { Params: { channel: string } };

/** Chat outside the table: campaign channels and direct messages between friends. */
export function chatRoutes(app: FastifyInstance, { repo, hub }: Ctx): void {
  app.get('/chat/unread', async (req) => repo.unread(req.userId));

  app.get<ChannelParams & { Querystring: { before?: string } }>('/chat/:channel', async (req) => {
    const { key } = repo.chatChannel(req.userId, req.params.channel);
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;
    return repo.messages(key, req.userId, before);
  });

  app.post<ChannelParams>('/chat/:channel', async (req) => {
    const { key, members } = repo.chatChannel(req.userId, req.params.channel);
    const text = str(req.body, 'text', { min: 1, max: 2000 }).trim();
    const { id } = repo.postMessage(key, req.userId, text);
    for (const m of members) if (m !== req.userId) hub.notify(m, { kind: 'chat.message', message: repo.messageFor(id, m) });
    return repo.messageFor(id, req.userId);
  });

  app.post<ChannelParams>('/chat/:channel/read', async (req) => {
    const { key } = repo.chatChannel(req.userId, req.params.channel);
    repo.markRead(req.userId, key);
    return { ok: true };
  });
}

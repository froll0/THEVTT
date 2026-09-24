import type { FastifyInstance } from 'fastify';
import type { Ctx } from '../app';
import { badRequest, forbidden, str } from '../errors';

type IdParams = { Params: { id: string } };

export function characterRoutes(app: FastifyInstance, { repo }: Ctx): void {
  const parse = (body: unknown) => {
    const name = str(body, 'name', { min: 1, max: 80 });
    const systemId = str(body, 'systemId', { max: 40 });
    const data = (body as { data?: unknown } | null)?.data;
    if (data === undefined || typeof data !== 'object') throw badRequest('Dati della scheda mancanti');
    return { name, systemId, data };
  };

  /** The owner, or the GM of the campaign the character is seated in, may edit it. */
  const canEdit = (userId: string, id: string) => {
    const ch = repo.character(id);
    if (ch.ownerId === userId) return ch;
    if (ch.campaignId && repo.role(ch.campaignId, userId) === 'gm') return ch;
    throw forbidden('Non puoi modificare questo personaggio');
  };

  app.get('/characters', async (req) => repo.characters(req.userId));

  app.get<IdParams>('/characters/:id', async (req) => {
    const ch = repo.character(req.params.id);
    if (ch.ownerId !== req.userId && !(ch.campaignId && repo.role(ch.campaignId, req.userId))) throw forbidden();
    return ch;
  });

  app.post('/characters', async (req) => repo.saveCharacter(req.userId, parse(req.body)));

  app.put<IdParams>('/characters/:id', async (req) => {
    const ch = canEdit(req.userId, req.params.id);
    const input = parse(req.body);
    if (input.systemId !== ch.systemId) throw badRequest('Non puoi cambiare sistema a un personaggio');
    return repo.saveCharacter(ch.ownerId, { ...input, id: ch.id });
  });

  app.delete<IdParams>('/characters/:id', async (req) => {
    const ch = repo.character(req.params.id);
    if (ch.ownerId !== req.userId) throw forbidden();
    repo.deleteCharacter(ch.id);
    return { ok: true };
  });
}

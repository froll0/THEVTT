import type { FastifyInstance } from 'fastify';
import type { Ctx } from '../app';
import { badRequest, str } from '../errors';

type IdParams = { Params: { id: string } };

function fields(body: unknown): { title?: string; body?: string; campaignId?: string | null } {
  const b = (body ?? {}) as { title?: unknown; body?: unknown; campaignId?: unknown };
  if (b.campaignId !== undefined && b.campaignId !== null && typeof b.campaignId !== 'string') throw badRequest('Campagna non valida');
  return {
    title: b.title !== undefined ? str(body, 'title', { max: 120, optional: true }) : undefined,
    body: b.body !== undefined ? (typeof b.body === 'string' ? b.body : '') : undefined,
    campaignId: b.campaignId as string | null | undefined,
  };
}

/** The personal journal: only its author reads or writes it. */
export function journalRoutes(app: FastifyInstance, { repo }: Ctx): void {
  app.get('/journal', async (req) => repo.journal(req.userId));
  app.post('/journal', async (req) => repo.saveJournalEntry(req.userId, fields(req.body)));
  app.patch<IdParams>('/journal/:id', async (req) => repo.saveJournalEntry(req.userId, { ...fields(req.body), id: req.params.id }));
  app.delete<IdParams>('/journal/:id', async (req) => {
    repo.deleteJournalEntry(req.userId, req.params.id);
    return { ok: true };
  });
}

import type { FastifyInstance } from 'fastify';
import type { Ctx } from '../app';
import { badRequest, forbidden, notFound, str } from '../errors';

type IdParams = { Params: { id: string } };
const SYSTEM_ID = /^[a-z0-9][a-z0-9.-]*$/;

export function campaignRoutes(app: FastifyInstance, { repo, hub }: Ctx): void {
  app.get('/campaigns', async (req) => repo.campaigns(req.userId));

  app.post('/campaigns', async (req) => {
    const name = str(req.body, 'name', { min: 1, max: 80 });
    const description = str(req.body, 'description', { max: 2000, optional: true });
    const systemId = str(req.body, 'systemId', { max: 40, pattern: SYSTEM_ID });
    return repo.createCampaign(req.userId, name, description, systemId);
  });

  app.get<IdParams>('/campaigns/:id', async (req) => {
    repo.requireRole(req.params.id, req.userId);
    return repo.campaign(req.params.id);
  });

  app.patch<IdParams>('/campaigns/:id', async (req) => {
    repo.requireRole(req.params.id, req.userId, 'gm');
    const name = str(req.body, 'name', { max: 80, optional: true });
    const body = req.body as { description?: unknown } | null;
    const description = body?.description !== undefined ? str(req.body, 'description', { max: 2000, optional: true }) : undefined;
    const c = repo.updateCampaign(req.params.id, { name: name || undefined, description });
    hub.notifyCampaign(c.id, { kind: 'campaign.updated', campaignId: c.id }, req.userId);
    return c;
  });

  app.delete<IdParams>('/campaigns/:id', async (req) => {
    repo.requireRole(req.params.id, req.userId, 'gm');
    const members = repo.memberIds(req.params.id);
    hub.endSession(req.params.id);
    repo.deleteCampaign(req.params.id);
    for (const m of members) if (m !== req.userId) hub.notify(m, { kind: 'campaign.deleted', campaignId: req.params.id });
    return { ok: true };
  });

  app.post<IdParams>('/campaigns/:id/invites', async (req) => {
    repo.requireRole(req.params.id, req.userId, 'gm');
    const userId = str(req.body, 'userId', { max: 64 });
    repo.createInvite(req.params.id, req.userId, userId);
    const c = repo.campaign(req.params.id);
    hub.notify(userId, { kind: 'invite.received', campaignName: c.name, from: repo.user(req.userId) });
    return c;
  });

  app.delete<{ Params: { id: string; inviteId: string } }>('/campaigns/:id/invites/:inviteId', async (req) => {
    repo.requireRole(req.params.id, req.userId, 'gm');
    const inv = repo.invite(req.params.inviteId);
    if (inv.campaignId !== req.params.id) throw notFound('Invito non trovato');
    repo.deleteInvite(req.params.inviteId);
    return repo.campaign(req.params.id);
  });

  /** GM kicks a player, or a player leaves. */
  app.delete<{ Params: { id: string; userId: string } }>('/campaigns/:id/members/:userId', async (req) => {
    const myRole = repo.requireRole(req.params.id, req.userId);
    const target = req.params.userId;
    if (target !== req.userId && myRole !== 'gm') throw forbidden();
    if (repo.role(req.params.id, target) === 'gm') throw badRequest('Il master non può lasciare la campagna: eliminala');
    hub.dropFromSession(req.params.id, target);
    repo.removeMember(req.params.id, target);
    hub.notifyCampaign(req.params.id, { kind: 'campaign.updated', campaignId: req.params.id });
    hub.notify(target, { kind: 'campaign.deleted', campaignId: req.params.id });
    return { ok: true };
  });

  /** Assign one of my characters to this campaign (or null to unassign). */
  app.put<IdParams>('/campaigns/:id/character', async (req) => {
    repo.requireRole(req.params.id, req.userId);
    const characterId = (req.body as { characterId?: unknown } | null)?.characterId;
    if (characterId !== null) {
      if (typeof characterId !== 'string') throw badRequest('characterId mancante');
      const ch = repo.character(characterId);
      const campaign = repo.campaign(req.params.id);
      if (ch.ownerId !== req.userId) throw forbidden('Non è il tuo personaggio');
      if (ch.systemId !== campaign.systemId) throw badRequest('Il personaggio usa un altro sistema di gioco');
    }
    repo.assignCharacter(req.params.id, req.userId, characterId as string | null);
    hub.notifyCampaign(req.params.id, { kind: 'campaign.updated', campaignId: req.params.id }, req.userId);
    return repo.campaign(req.params.id);
  });

  /** Characters seated in the campaign: used by the GM to host the table. */
  app.get<IdParams>('/campaigns/:id/characters', async (req) => {
    repo.requireRole(req.params.id, req.userId);
    return repo.campaignCharacters(req.params.id);
  });
}

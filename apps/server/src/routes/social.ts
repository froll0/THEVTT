import type { FastifyInstance } from 'fastify';
import type { Ctx } from '../app';
import { notFound, str } from '../errors';

export function socialRoutes(app: FastifyInstance, { repo, hub }: Ctx): void {
  app.get('/users/search', async (req) => {
    const q = str(req.query, 'q', { min: 2, max: 40 });
    return repo.searchUsers(q, req.userId);
  });

  app.get('/friends', async (req) => repo.friends(req.userId));

  app.post('/friends/requests', async (req) => {
    const username = str(req.body, 'username', { max: 24 });
    const target = repo.credentials(username);
    if (!target) throw notFound('Utente non trovato');
    const outcome = repo.requestFriend(req.userId, target.id);
    const me = repo.user(req.userId);
    if (outcome === 'accepted') hub.notify(target.id, { kind: 'friend.accepted', by: me });
    else hub.notify(target.id, { kind: 'friend.request', from: me });
    return { status: outcome };
  });

  app.post<{ Params: { userId: string } }>('/friends/:userId/accept', async (req) => {
    repo.acceptFriend(req.userId, req.params.userId);
    hub.notify(req.params.userId, { kind: 'friend.accepted', by: repo.user(req.userId) });
    return { ok: true };
  });

  /** Declines a request, cancels an outgoing one or removes a friend. */
  app.delete<{ Params: { userId: string } }>('/friends/:userId', async (req) => {
    repo.removeFriend(req.userId, req.params.userId);
    hub.notify(req.params.userId, { kind: 'friend.removed', userId: req.userId });
    return { ok: true };
  });

  app.get('/invites', async (req) => repo.invitesFor(req.userId));

  app.post<{ Params: { id: string } }>('/invites/:id/accept', async (req) => {
    const campaignId = repo.acceptInvite(req.params.id, req.userId);
    hub.notifyCampaign(campaignId, { kind: 'campaign.updated', campaignId });
    return repo.campaign(campaignId);
  });

  app.post<{ Params: { id: string } }>('/invites/:id/decline', async (req) => {
    const inv = repo.invite(req.params.id);
    if (inv.toId !== req.userId) throw notFound('Invito non trovato');
    repo.deleteInvite(req.params.id);
    hub.notify(inv.fromId, { kind: 'campaign.updated', campaignId: inv.campaignId });
    return { ok: true };
  });
}

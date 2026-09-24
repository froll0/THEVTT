import type { Campaign } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { Check, ChevronRight, X } from 'lucide-react';
import { Avatar, Empty, Section } from '../components/ui';
import { useApp } from '../store/app';

export function CampaignRow({ c }: { c: Campaign }) {
  const { go, user } = useApp();
  const isGm = c.gmId === user?.id;
  const players = c.members.filter((m) => m.role === 'player').length;
  return (
    <div className="list-item clickable" onClick={() => go({ name: 'campaign', id: c.id })}>
      <div className="grow">
        <div className="row">
          <span className="title ellipsis">{c.name}</span>
          {c.session && <span className="badge live">in gioco</span>}
        </div>
        <div className="meta ellipsis">
          {isGm ? 'Master' : 'Giocatore'} · {getSystem(c.systemId)?.shortName ?? c.systemId} · {players} {players === 1 ? 'giocatore' : 'giocatori'}
        </div>
      </div>
      <div className="avatars">
        {c.members.slice(0, 5).map((m) => (
          <Avatar key={m.user.id} user={m.user} size={22} />
        ))}
      </div>
      <ChevronRight size={16} className="faint" />
    </div>
  );
}

export function HomeView() {
  const { user, campaigns, invites, friends, api, run, refresh, go, upsertCampaign } = useApp();
  const live = campaigns.filter((c) => c.session);
  const requests = friends.filter((f) => f.status === 'pending_in');
  const onlineFriends = friends.filter((f) => f.status === 'accepted' && f.user.online);
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buona notte' : hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {greeting}, {user?.displayName}
          </h1>
          <p>{live.length ? `${live.length === 1 ? 'Un tavolo è aperto' : `${live.length} tavoli sono aperti`} adesso.` : 'Nessun tavolo aperto.'}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => go({ name: 'character', id: null })}>
            Nuovo personaggio
          </button>
          <button className="btn primary" onClick={() => go({ name: 'campaigns' })}>
            Nuova campagna
          </button>
        </div>
      </div>

      {live.length > 0 && (
        <Section title="In corso">
          <div className="list">
            {live.map((c) => (
              <div className="list-item" key={c.id}>
                <span className="status-dot online" />
                <div className="grow">
                  <div className="title">{c.name}</div>
                  <div className="meta">
                    {c.session!.participants.length} al tavolo · master {c.members.find((m) => m.role === 'gm')?.user.displayName}
                  </div>
                </div>
                <button className="btn primary sm" onClick={() => go({ name: 'table', campaignId: c.id })}>
                  {c.gmId === user?.id ? 'Torna al tavolo' : 'Siediti'}
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(invites.length > 0 || requests.length > 0) && (
        <Section title="Da fare">
          <div className="list">
            {invites.map((inv) => (
              <div className="list-item" key={inv.id}>
                <Avatar user={inv.from} size={28} />
                <div className="grow">
                  <div className="title">Invito a «{inv.campaign.name}»</div>
                  <div className="meta">
                    da {inv.from.displayName} · {getSystem(inv.campaign.systemId)?.shortName}
                  </div>
                </div>
                <button
                  className="btn primary sm"
                  onClick={() =>
                    run(async () => {
                      const c = await api.acceptInvite(inv.id);
                      upsertCampaign(c);
                      await refresh(['invites']);
                      go({ name: 'campaign', id: c.id });
                    })
                  }
                >
                  <Check size={14} /> Unisciti
                </button>
                <button className="btn ghost sm icon" aria-label="Rifiuta" onClick={() => run(async () => { await api.declineInvite(inv.id); await refresh(['invites']); })}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {requests.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={28} presence />
                <div className="grow">
                  <div className="title">{f.user.displayName}</div>
                  <div className="meta">vuole essere tuo amico</div>
                </div>
                <button className="btn primary sm" onClick={() => run(async () => { await api.acceptFriend(f.user.id); await refresh(['friends']); })}>
                  <Check size={14} /> Accetta
                </button>
                <button className="btn ghost sm icon" aria-label="Rifiuta" onClick={() => run(async () => { await api.removeFriend(f.user.id); await refresh(['friends']); })}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Campagne"
        action={
          campaigns.length > 5 && (
            <a className="small muted" onClick={() => go({ name: 'campaigns' })}>
              Tutte
            </a>
          )
        }
      >
        {campaigns.length ? (
          <div className="list">
            {campaigns.slice(0, 5).map((c) => (
              <CampaignRow key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <Empty>Ancora nessuna campagna. Creane una, oppure aspetta l'invito di un amico.</Empty>
        )}
      </Section>

      {onlineFriends.length > 0 && (
        <Section title={`Amici online · ${onlineFriends.length}`}>
          <div className="row wrap" style={{ gap: 'var(--s3)' }}>
            {onlineFriends.map((f) => (
              <div key={f.user.id} className="row small">
                <Avatar user={f.user} size={22} presence /> {f.user.displayName}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

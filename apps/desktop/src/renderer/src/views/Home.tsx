import type { Campaign } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { Check, Play, Plus, Radio, X } from 'lucide-react';
import { Avatar, Empty } from '../components/ui';
import { useApp } from '../store/app';

export function CampaignCard({ c }: { c: Campaign }) {
  const { go, user } = useApp();
  const isGm = c.gmId === user?.id;
  const live = !!c.session;
  return (
    <div className="card clickable campaign-card" onClick={() => go({ name: 'campaign', id: c.id })}>
      <div className="cover" />
      <div className="row between">
        <h3 className="ellipsis">{c.name}</h3>
        {live ? (
          <span className="badge live">
            <Radio size={11} /> In gioco
          </span>
        ) : (
          <span className="badge">{isGm ? 'Master' : 'Giocatore'}</span>
        )}
      </div>
      <p className="muted small" style={{ minHeight: '2.6em' }}>
        {c.description || 'Nessuna descrizione.'}
      </p>
      <div className="row between">
        <div className="avatars">
          {c.members.map((m) => (
            <Avatar key={m.user.id} user={m.user} size={26} />
          ))}
        </div>
        <span className="faint small">{getSystem(c.systemId)?.shortName ?? c.systemId}</span>
      </div>
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
      <div className="hero">
        <h1>
          {greeting}, {user?.displayName}
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {live.length ? `${live.length} ${live.length === 1 ? 'tavolo è aperto' : 'tavoli sono aperti'} in questo momento.` : 'Nessun tavolo aperto. Pronto a cominciare?'}
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => go({ name: 'campaigns' })}>
            <Plus size={16} /> Nuova campagna
          </button>
          <button className="btn" onClick={() => go({ name: 'character', id: null })}>
            Crea personaggio
          </button>
        </div>
      </div>

      {live.length > 0 && (
        <section className="section">
          <div className="section-title">Tavoli aperti</div>
          <div className="list">
            {live.map((c) => {
              const isGm = c.gmId === user?.id;
              return (
                <div className="list-item" key={c.id}>
                  <span className="status-dot online" />
                  <div className="grow">
                    <b>{c.name}</b>
                    <div className="muted small">
                      {c.session!.participants.length} giocator{c.session!.participants.length === 1 ? 'e' : 'i'} al tavolo
                    </div>
                  </div>
                  <button className="btn primary" onClick={() => go({ name: 'table', campaignId: c.id })}>
                    <Play size={15} /> {isGm ? 'Torna al tavolo' : 'Entra'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(invites.length > 0 || requests.length > 0) && (
        <section className="section">
          <div className="section-title">In attesa di risposta</div>
          <div className="list">
            {invites.map((inv) => (
              <div className="list-item" key={inv.id}>
                <Avatar user={inv.from} size={32} />
                <div className="grow">
                  <b>{inv.campaign.name}</b>
                  <div className="muted small">Invito da {inv.from.displayName} · {getSystem(inv.campaign.systemId)?.shortName}</div>
                </div>
                <button
                  className="btn primary sm"
                  onClick={() =>
                    run(async () => {
                      const c = await api.acceptInvite(inv.id);
                      upsertCampaign(c);
                      await refresh(['invites']);
                      go({ name: 'campaign', id: c.id });
                    }, 'Benvenuto nella campagna!')
                  }
                >
                  <Check size={14} /> Unisciti
                </button>
                <button className="btn ghost sm icon" onClick={() => run(async () => { await api.declineInvite(inv.id); await refresh(['invites']); })} aria-label="Rifiuta">
                  <X size={14} />
                </button>
              </div>
            ))}
            {requests.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={32} presence />
                <div className="grow">
                  <b>{f.user.displayName}</b>
                  <div className="muted small">vuole essere tuo amico</div>
                </div>
                <button className="btn primary sm" onClick={() => run(async () => { await api.acceptFriend(f.user.id); await refresh(['friends']); })}>
                  <Check size={14} /> Accetta
                </button>
                <button className="btn ghost sm icon" onClick={() => run(async () => { await api.removeFriend(f.user.id); await refresh(['friends']); })} aria-label="Rifiuta">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="row between">
          <div className="section-title">Le tue campagne</div>
          <button className="btn ghost sm" onClick={() => go({ name: 'campaigns' })}>
            Vedi tutte
          </button>
        </div>
        {campaigns.length ? (
          <div className="grid">
            {campaigns.slice(0, 6).map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <Empty>Non partecipi ancora a nessuna campagna. Creane una o aspetta un invito.</Empty>
        )}
      </section>

      {onlineFriends.length > 0 && (
        <section className="section">
          <div className="section-title">Amici online</div>
          <div className="row wrap">
            {onlineFriends.map((f) => (
              <div key={f.user.id} className="chip" style={{ cursor: 'default' }}>
                <Avatar user={f.user} size={20} presence /> {f.user.displayName}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

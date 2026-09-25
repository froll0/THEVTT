import type { JournalEntry } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { BookText, Check, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CampaignCard, CharacterCard } from '../components/Cards';
import { Avatar, Empty, Section } from '../components/ui';
import { useApp } from '../store/app';
import { formatSession, relativeDay } from './Campaign';

export function HomeView() {
  const { user, campaigns, characters, invites, friends, api, run, refresh, go, upsertCampaign } = useApp();
  const live = campaigns.filter((c) => c.session);
  const upcoming = campaigns
    .filter((c) => c.nextSession && new Date(c.nextSession).getTime() > Date.now() - 6 * 3600_000 && !c.session)
    .sort((a, b) => a.nextSession!.localeCompare(b.nextSession!));
  const requests = friends.filter((f) => f.status === 'pending_in');
  const onlineFriends = friends.filter((f) => f.status === 'accepted' && f.user.online);
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buona notte' : hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div className="page wide">
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

      {live.map((c) => (
        <div className="live-strip" key={c.id}>
          <span className="status-dot online" />
          <div className="grow">
            <div className="title">{c.name} è in gioco</div>
            <div className="meta muted small">
              {c.session!.participants.length} al tavolo · master {c.members.find((m) => m.role === 'gm')?.user.displayName}
            </div>
          </div>
          <button className="btn primary sm" onClick={() => go({ name: 'table', campaignId: c.id })}>
            {c.gmId === user?.id ? 'Torna al tavolo' : 'Siediti'}
          </button>
        </div>
      ))}

      <div className="dash">
        <div className="dash-main">
          {upcoming.length > 0 && (
            <Section title="Prossime sessioni">
              <div className="list">
                {upcoming.map((c) => {
                  const answer = user ? c.rsvps[user.id] : undefined;
                  const coming = Object.values(c.rsvps).filter((a) => a === 'yes').length;
                  return (
                    <div className="list-item clickable" key={c.id} onClick={() => go({ name: 'campaign', id: c.id })}>
                      <div className="grow">
                        <div className="title">{c.name}</div>
                        <div className="meta">
                          {formatSession(c.nextSession!)} · {relativeDay(c.nextSession!)} · {coming} {coming === 1 ? 'conferma' : 'conferme'}
                          {c.gmId !== user?.id && !answer ? ' · rispondi!' : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} className="faint" />
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section
            title="Le tue campagne"
            action={
              campaigns.length > 6 && (
                <a className="small muted" onClick={() => go({ name: 'campaigns' })}>
                  Tutte
                </a>
              )
            }
          >
            {campaigns.length ? (
              <div className="tile-grid">
                {[...campaigns]
                  .sort((a, b) => Number(!!b.session) - Number(!!a.session) || (a.nextSession ?? '9').localeCompare(b.nextSession ?? '9'))
                  .slice(0, 6)
                  .map((c) => (
                    <CampaignCard key={c.id} c={c} />
                  ))}
              </div>
            ) : (
              <Empty>Ancora nessuna campagna. Creane una, oppure aspetta l'invito di un amico.</Empty>
            )}
          </Section>

          <Section
            title="I tuoi personaggi"
            action={
              characters.length > 4 && (
                <a className="small muted" onClick={() => go({ name: 'characters' })}>
                  Tutti
                </a>
              )
            }
          >
            <div className="tile-grid small">
              {characters.slice(0, 4).map((c) => (
                <CharacterCard key={c.id} c={c} />
              ))}
              {characters.length === 0 && <p className="faint small">Nessun personaggio ancora: la creazione guidata ti accompagna passo passo.</p>}
            </div>
          </Section>
        </div>
        <aside className="dash-side">
          {(invites.length > 0 || requests.length > 0) && (
            <div className="panel-card">
              <h3>Da fare</h3>
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
                    <button
                      className="btn ghost sm icon"
                      aria-label="Rifiuta"
                      onClick={() =>
                        run(async () => {
                          await api.declineInvite(inv.id);
                          await refresh(['invites']);
                        })
                      }
                    >
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
                    <button
                      className="btn primary sm"
                      onClick={() =>
                        run(async () => {
                          await api.acceptFriend(f.user.id);
                          await refresh(['friends']);
                        })
                      }
                    >
                      <Check size={14} /> Accetta
                    </button>
                    <button
                      className="btn ghost sm icon"
                      aria-label="Rifiuta"
                      onClick={() =>
                        run(async () => {
                          await api.removeFriend(f.user.id);
                          await refresh(['friends']);
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel-card">
            <h3>
              Amici online <span className="faint">{onlineFriends.length}</span>
            </h3>
            {onlineFriends.length ? (
              <div className="col" style={{ gap: 'var(--s2)' }}>
                {onlineFriends.map((f) => (
                  <div key={f.user.id} className="row small">
                    <Avatar user={f.user} size={22} presence /> {f.user.displayName}
                  </div>
                ))}
              </div>
            ) : (
              <p className="faint small">
                Nessuno online. <a onClick={() => go({ name: 'friends' })}>Amici</a>
              </p>
            )}
          </div>
          <JournalCard />
        </aside>
      </div>
    </div>
  );
}

/** The latest pages of the personal journal. */
function JournalCard() {
  const { api, go } = useApp();
  const [pages, setPages] = useState<JournalEntry[] | null>(null);
  useEffect(() => {
    api
      .journal()
      .then(setPages)
      .catch(() => setPages([]));
  }, [api]);
  return (
    <div className="panel-card">
      <h3>
        Diario
        <button className="btn ghost sm" onClick={() => go({ name: 'journal' })}>
          <BookText size={13} /> Apri
        </button>
      </h3>
      {pages?.length ? (
        <div className="col" style={{ gap: 'var(--s2)' }}>
          {pages.slice(0, 3).map((p) => (
            <a key={p.id} className="col small" style={{ gap: 0 }} onClick={() => go({ name: 'journal' })}>
              <b className="ellipsis">{p.title || 'Senza titolo'}</b>
              <span className="faint tiny ellipsis">{p.body.replace(/\s+/g, ' ').slice(0, 80) || '—'}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="faint small">{pages ? 'Appunti di sessione che legge solo tu.' : '…'}</p>
      )}
    </div>
  );
}

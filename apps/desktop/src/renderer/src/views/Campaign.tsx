import type { Campaign, CharacterRecord, RsvpAnswer } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { ArrowLeft, CalendarClock, Crown, ImagePlus, MoreHorizontal, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChatThread } from '../components/ChatThread';
import { coverStyle } from '../components/Cards';
import { Avatar, Empty, Field, Modal, Popover, readImage, Section } from '../components/ui';
import { useApp } from '../store/app';

export function CampaignView({ id }: { id: string }) {
  const { campaigns, user, friends, characters, api, run, go, upsertCampaign, refresh } = useApp();
  const campaign = campaigns.find((c) => c.id === id);
  const [seated, setSeated] = useState<CharacterRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '' });

  const setCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f)
      void run(
        async () => upsertCampaign(await api.updateCampaign(id, { cover: await readImage(f, 1600, { opaque: true, quality: 0.82 }) })),
        'Copertina aggiornata',
      );
  };

  useEffect(() => {
    api
      .campaignCharacters(id)
      .then(setSeated)
      .catch(() => setSeated([]));
  }, [api, id, campaign?.members]);

  if (!campaign || !user) {
    return (
      <div className="page">
        <Empty>Campagna non trovata.</Empty>
      </div>
    );
  }

  const isGm = campaign.gmId === user.id;
  const system = getSystem(campaign.systemId);
  const me = campaign.members.find((m) => m.user.id === user.id);
  const memberIds = new Set(campaign.members.map((m) => m.user.id));
  const invitedIds = new Set(campaign.pendingInvites.map((i) => i.user.id));
  const invitable = friends.filter((f) => f.status === 'accepted' && !memberIds.has(f.user.id) && !invitedIds.has(f.user.id));
  const myCharacters = characters.filter((c) => c.systemId === campaign.systemId);
  const live = !!campaign.session;
  const gm = campaign.members.find((m) => m.role === 'gm');

  return (
    <div className="page wide">
      <button className="back" onClick={() => go({ name: 'campaigns' })}>
        <ArrowLeft size={14} /> Campagne
      </button>

      <div className="hero" style={coverStyle(campaign.name, campaign.cover)}>
        {isGm && (
          <div className="hero-tools">
            <label className="btn sm">
              <ImagePlus size={14} /> {campaign.cover ? 'Cambia copertina' : 'Aggiungi copertina'}
              <input type="file" accept="image/*" hidden aria-label="Copertina della campagna" onChange={(e) => setCover(e)} />
            </label>
            {campaign.cover && (
              <button className="btn sm" onClick={() => run(async () => upsertCampaign(await api.updateCampaign(campaign.id, { cover: null })))}>
                Rimuovi
              </button>
            )}
            {isGm && (
              <Popover
                trigger={(_o, toggle) => (
                  <button className="btn sm icon" onClick={toggle} aria-label="Altre azioni">
                    <MoreHorizontal size={16} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <button
                      className="menu-item"
                      onClick={() => {
                        close();
                        setDraft({ name: campaign.name, description: campaign.description });
                        setEditing(true);
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      className="menu-item"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => {
                        close();
                        setConfirmDelete(true);
                      }}
                    >
                      Elimina campagna
                    </button>
                  </>
                )}
              </Popover>
            )}
          </div>
        )}
        <div className="hero-content">
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <div className="row">
              <h1 className="ellipsis">{campaign.name}</h1>
              {live && <span className="badge live solid">in gioco</span>}
            </div>
            <p className="hero-meta">
              {system?.name ?? campaign.systemId} · master {gm?.user.displayName} · {campaign.members.length} al tavolo
            </p>
          </div>
          <div className="row">
            {isGm ? (
              <button className="btn primary" onClick={() => go({ name: 'table', campaignId: campaign.id })}>
                {live ? 'Torna al tavolo' : 'Avvia sessione'}
              </button>
            ) : (
              <button className="btn primary" disabled={!live} onClick={() => go({ name: 'table', campaignId: campaign.id })}>
                {live ? 'Siediti al tavolo' : 'In attesa del master'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="dash-main">
          {(campaign.description || isGm) && (
            <p className="muted selectable campaign-description">{campaign.description || 'Aggiungi una descrizione per i giocatori (menu ⋯ › Modifica).'}</p>
          )}
          <NextSession campaign={campaign} isGm={isGm} />

          {!isGm && (
            <Section title="Il tuo personaggio">
              <div className="list">
                <div className="list-item">
                  <select
                    className="select grow"
                    style={{ maxWidth: 360 }}
                    value={me?.characterId ?? ''}
                    onChange={(e) =>
                      run(async () => {
                        upsertCampaign(await api.assignCharacter(campaign.id, e.target.value || null));
                        await refresh(['characters']);
                      })
                    }
                  >
                    <option value="">Nessun personaggio</option>
                    {myCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.campaignId && c.campaignId !== campaign.id ? ' (in un’altra campagna)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="grow" />
                  {me?.characterId && (
                    <button className="btn ghost sm" onClick={() => go({ name: 'character', id: me.characterId })}>
                      Apri scheda
                    </button>
                  )}
                  <button className="btn sm" onClick={() => go({ name: 'character', id: null, systemId: campaign.systemId, assignTo: campaign.id })}>
                    <Plus size={14} /> Crea nuovo
                  </button>
                </div>
              </div>
            </Section>
          )}

          <CampaignChat campaign={campaign} />
        </div>
        <aside className="dash-side">
          <div className="panel-card">
            <h3>Al tavolo · {campaign.members.length}</h3>
            <div className="list">
              {campaign.members.map((m) => {
                const ch = seated.find((c) => c.id === m.characterId);
                const inSession = campaign.session?.participants.includes(m.user.id) || (live && m.role === 'gm');
                const summary = ch && system ? system.summary(ch.data) : [];
                return (
                  <div className="list-item" key={m.user.id}>
                    <Avatar user={m.user} size={30} presence />
                    <div className="grow">
                      <div className="row">
                        <span className="title">{m.user.displayName}</span>
                        {m.role === 'gm' && <Crown size={13} className="faint" />}
                        {inSession && <span className="badge live">connesso</span>}
                      </div>
                      <div className="meta">
                        {m.role === 'gm'
                          ? 'Master'
                          : ch
                            ? `${ch.name} · ${summary.find((l) => l.label === 'Specie')?.value ?? ''} ${summary[0]?.value ?? ''}`
                            : m.characterId
                              ? 'Personaggio assegnato'
                              : 'Nessun personaggio'}
                      </div>
                    </div>
                    {isGm && m.role !== 'gm' && (
                      <button
                        className="btn ghost sm"
                        onClick={() =>
                          run(async () => {
                            await api.removeMember(campaign.id, m.user.id);
                            upsertCampaign(await api.campaign(campaign.id));
                          }, 'Giocatore rimosso')
                        }
                      >
                        Rimuovi
                      </button>
                    )}
                    {!isGm && m.user.id === user.id && (
                      <button
                        className="btn ghost sm danger"
                        onClick={() =>
                          run(async () => {
                            await api.removeMember(campaign.id, user.id);
                            await refresh(['campaigns', 'characters']);
                            go({ name: 'campaigns' });
                          }, 'Hai lasciato la campagna')
                        }
                      >
                        Lascia
                      </button>
                    )}
                  </div>
                );
              })}
              {campaign.pendingInvites.map((i) => (
                <div className="list-item" key={i.id}>
                  <Avatar user={i.user} size={30} />
                  <div className="grow">
                    <div className="title muted">{i.user.displayName}</div>
                    <div className="meta">invitato, in attesa</div>
                  </div>
                  {isGm && (
                    <button
                      className="btn ghost sm icon"
                      aria-label="Annulla invito"
                      onClick={() => run(async () => upsertCampaign(await api.cancelInvite(campaign.id, i.id)))}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isGm && (
            <div className="panel-card">
              <h3>Invita</h3>
              {invitable.length ? (
                <div className="row wrap">
                  {invitable.map((f) => (
                    <button
                      key={f.user.id}
                      className="chip"
                      onClick={() => run(async () => upsertCampaign(await api.invite(campaign.id, f.user.id)), `Invito inviato a ${f.user.displayName}`)}
                    >
                      <Avatar user={f.user} size={18} presence /> {f.user.displayName} <Plus size={13} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted small">
                  Nessun amico da invitare. <a onClick={() => go({ name: 'friends' })}>Aggiungi amici</a>
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {editing && (
        <Modal
          title="Modifica campagna"
          onClose={() => setEditing(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setEditing(false)}>
                Annulla
              </button>
              <button
                className="btn primary"
                disabled={!draft.name.trim()}
                onClick={() =>
                  run(async () => {
                    upsertCampaign(await api.updateCampaign(campaign.id, draft));
                    setEditing(false);
                  })
                }
              >
                Salva
              </button>
            </>
          }
        >
          <Field label="Nome">
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Descrizione">
            <textarea className="textarea" rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Eliminare la campagna?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Annulla
              </button>
              <button
                className="btn danger solid"
                onClick={() =>
                  run(async () => {
                    await api.deleteCampaign(campaign.id);
                    await refresh(['campaigns']);
                    go({ name: 'campaigns' });
                  }, 'Campagna eliminata')
                }
              >
                Elimina
              </button>
            </>
          }
        >
          <p className="muted">«{campaign.name}» verrà eliminata per tutti. I personaggi restano ai rispettivi giocatori.</p>
        </Modal>
      )}
    </div>
  );
}

/** "in 3 giorni", "domani", "tra 2 ore"… */
export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'passata';
  const hours = Math.round(diff / 3600_000);
  if (hours < 1) return 'tra poco';
  if (hours < 24 && d.getDate() === new Date().getDate()) return `oggi, tra ${hours} ${hours === 1 ? 'ora' : 'ore'}`;
  const days = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400_000);
  return days === 1 ? 'domani' : `tra ${days} giorni`;
}

export const formatSession = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** datetime-local value in local time */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ANSWERS: { id: RsvpAnswer; label: string }[] = [
  { id: 'yes', label: 'Ci sono' },
  { id: 'maybe', label: 'Forse' },
  { id: 'no', label: 'Non posso' },
];

function NextSession({ campaign, isGm }: { campaign: Campaign; isGm: boolean }) {
  const { user, api, run, upsertCampaign } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const at = campaign.nextSession;
  const players = campaign.members.filter((m) => m.role === 'player');
  const mine = user ? campaign.rsvps[user.id] : undefined;

  const schedule = (iso: string | null) =>
    run(
      async () => {
        upsertCampaign(await api.scheduleSession(campaign.id, iso));
        setEditing(false);
      },
      iso ? 'Sessione fissata: i giocatori ricevono un avviso' : 'Sessione annullata',
    );

  return (
    <Section
      title="Prossima sessione"
      action={
        isGm &&
        !editing && (
          <button
            className="btn ghost sm"
            onClick={() => {
              setValue(at ? toLocalInput(at) : toLocalInput(new Date(Date.now() + 7 * 86400_000).toISOString()).slice(0, 11) + '21:00');
              setEditing(true);
            }}
          >
            <CalendarClock size={14} /> {at ? 'Cambia' : 'Fissa una data'}
          </button>
        )
      }
    >
      {editing ? (
        <div className="row">
          <input className="input" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Data e ora" />
          <button className="btn primary sm" disabled={!value} onClick={() => void schedule(new Date(value).toISOString())}>
            Salva
          </button>
          {at && (
            <button className="btn ghost sm danger" onClick={() => void schedule(null)}>
              Annulla la sessione
            </button>
          )}
          <button className="btn ghost sm" onClick={() => setEditing(false)}>
            Chiudi
          </button>
        </div>
      ) : at ? (
        <div className="col" style={{ gap: 'var(--s3)' }}>
          <div className="next-session">
            <b>{formatSession(at)}</b> <span className="muted">· {relativeDay(at)}</span>
          </div>
          {!isGm && (
            <div className="seg">
              {ANSWERS.map((a) => (
                <button key={a.id} className={mine === a.id ? 'on' : ''} onClick={() => run(async () => upsertCampaign(await api.rsvp(campaign.id, a.id)))}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          {players.length > 0 && (
            <div className="rsvps">
              {players.map((p) => {
                const a = campaign.rsvps[p.user.id];
                return (
                  <span key={p.user.id} className={`rsvp ${a ?? 'none'}`} title={a ? ANSWERS.find((x) => x.id === a)?.label : 'Non ha ancora risposto'}>
                    <Avatar user={p.user} size={20} /> {p.user.displayName}
                    <small>{a ? ANSWERS.find((x) => x.id === a)?.label : '—'}</small>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="muted small">
          {isGm
            ? 'Nessuna data in programma. Fissala: i giocatori ricevono un avviso e possono rispondere.'
            : 'Il master non ha ancora fissato la prossima sessione.'}
        </p>
      )}
    </Section>
  );
}

export function CampaignChat({ campaign }: { campaign: Campaign }) {
  return (
    <Section title="Chat del gruppo">
      <div className="campaign-chat">
        <ChatThread channel={`campaign:${campaign.id}`} people={campaign.members.map((m) => m.user)} placeholder="Scrivi al gruppo" />
      </div>
    </Section>
  );
}

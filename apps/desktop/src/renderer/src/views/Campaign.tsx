import type { CharacterRecord } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { ArrowLeft, Crown, LogOut, Pencil, Play, Plus, Radio, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, Empty, Field, Modal } from '../components/ui';
import { useApp } from '../store/app';

export function CampaignView({ id }: { id: string }) {
  const { campaigns, user, friends, characters, api, run, go, upsertCampaign, refresh } = useApp();
  const campaign = campaigns.find((c) => c.id === id);
  const [seated, setSeated] = useState<CharacterRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '' });

  useEffect(() => {
    api.campaignCharacters(id).then(setSeated).catch(() => setSeated([]));
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

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ width: 'fit-content' }} onClick={() => go({ name: 'campaigns' })}>
        <ArrowLeft size={14} /> Campagne
      </button>

      <div className="hero">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 6 }}>
            <div className="row">
              <h1>{campaign.name}</h1>
              {live && (
                <span className="badge live">
                  <Radio size={11} /> In gioco
                </span>
              )}
            </div>
            <p className="muted">{campaign.description || 'Nessuna descrizione.'}</p>
            <p className="faint small">{system?.name ?? campaign.systemId}</p>
          </div>
          {isGm && (
            <div className="row">
              <button
                className="btn ghost icon"
                aria-label="Modifica"
                onClick={() => {
                  setDraft({ name: campaign.name, description: campaign.description });
                  setEditing(true);
                }}
              >
                <Pencil size={16} />
              </button>
              <button className="btn ghost icon danger" aria-label="Elimina" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          {isGm ? (
            <button className="btn primary" onClick={() => go({ name: 'table', campaignId: campaign.id })}>
              <Play size={16} /> {live ? 'Torna al tavolo' : 'Avvia sessione'}
            </button>
          ) : (
            <button className="btn primary" disabled={!live} onClick={() => go({ name: 'table', campaignId: campaign.id })}>
              <Play size={16} /> {live ? 'Entra al tavolo' : 'In attesa del master'}
            </button>
          )}
          {isGm && <span className="muted small">La sessione è ospitata dal tuo computer: mappe e stato del tavolo restano in locale.</span>}
        </div>
      </div>

      {!isGm && (
        <section className="section">
          <div className="section-title">Il tuo personaggio</div>
          <div className="card row wrap">
            <select
              className="select grow"
              style={{ maxWidth: 360 }}
              value={me?.characterId ?? ''}
              onChange={(e) =>
                run(async () => {
                  upsertCampaign(await api.assignCharacter(campaign.id, e.target.value || null));
                  await refresh(['characters']);
                }, 'Personaggio aggiornato')
              }
            >
              <option value="">— Nessun personaggio —</option>
              {myCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.campaignId && c.campaignId !== campaign.id ? ' (in un’altra campagna)' : ''}
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => go({ name: 'character', id: null, systemId: campaign.systemId, assignTo: campaign.id })}>
              <Plus size={15} /> Crea nuovo
            </button>
            {me?.characterId && (
              <button className="btn ghost" onClick={() => go({ name: 'character', id: me.characterId })}>
                Apri scheda
              </button>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-title">Partecipanti · {campaign.members.length}</div>
        <div className="list">
          {campaign.members.map((m) => {
            const ch = seated.find((c) => c.id === m.characterId);
            const inSession = campaign.session?.participants.includes(m.user.id) || (live && m.role === 'gm');
            return (
              <div className="list-item" key={m.user.id}>
                <Avatar user={m.user} size={34} presence />
                <div className="grow">
                  <div className="row">
                    <b>{m.user.displayName}</b>
                    {m.role === 'gm' && <Crown size={14} color="var(--accent)" />}
                    {inSession && <span className="badge live">al tavolo</span>}
                  </div>
                  <div className="muted small">
                    {m.role === 'gm' ? 'Master' : ch ? `${ch.name} · ${system?.summary(ch.data)[0]?.value ?? ''}` : m.characterId ? 'Personaggio assegnato' : 'Nessun personaggio'}
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
                    <LogOut size={14} /> Lascia
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {isGm && (
        <section className="section">
          <div className="section-title">Invita amici</div>
          {campaign.pendingInvites.length > 0 && (
            <div className="list">
              {campaign.pendingInvites.map((i) => (
                <div className="list-item" key={i.id}>
                  <Avatar user={i.user} size={28} presence />
                  <div className="grow">
                    {i.user.displayName} <span className="faint small">· invito inviato</span>
                  </div>
                  <button className="btn ghost sm icon" aria-label="Annulla invito" onClick={() => run(async () => upsertCampaign(await api.cancelInvite(campaign.id, i.id)))}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {invitable.length ? (
            <div className="row wrap">
              {invitable.map((f) => (
                <button key={f.user.id} className="chip" onClick={() => run(async () => upsertCampaign(await api.invite(campaign.id, f.user.id)), `Invito inviato a ${f.user.displayName}`)}>
                  <Avatar user={f.user} size={20} presence /> {f.user.displayName} <UserPlus size={13} />
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">
              Nessun amico da invitare.{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); go({ name: 'friends' }); }}>
                Aggiungi amici
              </a>
            </p>
          )}
        </section>
      )}

      {editing && (
        <Modal
          title="Modifica campagna"
          onClose={() => setEditing(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setEditing(false)}>Annulla</button>
              <button
                className="btn primary"
                disabled={!draft.name.trim()}
                onClick={() => run(async () => { upsertCampaign(await api.updateCampaign(campaign.id, draft)); setEditing(false); }, 'Salvato')}
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
            <textarea className="textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Eliminare la campagna?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Annulla</button>
              <button
                className="btn primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}
                onClick={() => run(async () => { await api.deleteCampaign(campaign.id); await refresh(['campaigns']); go({ name: 'campaigns' }); }, 'Campagna eliminata')}
              >
                Elimina
              </button>
            </>
          }
        >
          <p className="muted">
            «{campaign.name}» verrà eliminata per tutti i partecipanti. I personaggi restano ai rispettivi giocatori.
          </p>
        </Modal>
      )}
    </div>
  );
}

import type { UserPublic } from '@thevtt/shared';
import { Check, Search, UserMinus, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, Empty, PageHeader } from '../components/ui';
import { useApp } from '../store/app';

export function FriendsView() {
  const { friends, api, run, refresh } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return setResults([]);
    const t = setTimeout(() => api.searchUsers(query.trim()).then(setResults).catch(() => setResults([])), 250);
    return () => clearTimeout(t);
  }, [api, query]);

  const accepted = friends.filter((f) => f.status === 'accepted').sort((a, b) => Number(!!b.user.online) - Number(!!a.user.online));
  const incoming = friends.filter((f) => f.status === 'pending_in');
  const outgoing = friends.filter((f) => f.status === 'pending_out');
  const known = new Map(friends.map((f) => [f.user.id, f.status]));
  const act = (fn: () => Promise<unknown>, msg?: string) => run(async () => { await fn(); await refresh(['friends']); }, msg);

  return (
    <div className="page">
      <PageHeader title="Amici" subtitle="Aggiungi amici per invitarli nelle tue campagne." />

      <div className="card col">
        <div className="row">
          <Search size={16} className="muted" />
          <input className="input" placeholder="Cerca per nome utente…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {results.length > 0 && (
          <div className="list">
            {results.map((u) => {
              const st = known.get(u.id);
              return (
                <div className="list-item" key={u.id}>
                  <Avatar user={u} size={30} presence />
                  <div className="grow">
                    <b>{u.displayName}</b> <span className="faint small">@{u.username}</span>
                  </div>
                  {st === 'accepted' ? (
                    <span className="badge">Amici</span>
                  ) : st === 'pending_out' ? (
                    <span className="badge">Richiesta inviata</span>
                  ) : (
                    <button className="btn primary sm" onClick={() => act(() => api.requestFriend(u.username), st === 'pending_in' ? 'Ora siete amici' : 'Richiesta inviata')}>
                      <UserPlus size={14} /> {st === 'pending_in' ? 'Accetta' : 'Aggiungi'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <section className="section">
          <div className="section-title">Richieste ricevute</div>
          <div className="list">
            {incoming.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={32} presence />
                <div className="grow">
                  <b>{f.user.displayName}</b> <span className="faint small">@{f.user.username}</span>
                </div>
                <button className="btn primary sm" onClick={() => act(() => api.acceptFriend(f.user.id), 'Ora siete amici')}>
                  <Check size={14} /> Accetta
                </button>
                <button className="btn ghost sm icon" aria-label="Rifiuta" onClick={() => act(() => api.removeFriend(f.user.id))}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-title">
          Amici · {accepted.filter((f) => f.user.online).length} online su {accepted.length}
        </div>
        {accepted.length ? (
          <div className="list">
            {accepted.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={34} presence />
                <div className="grow">
                  <b>{f.user.displayName}</b>
                  <div className="faint small">{f.user.online ? 'Online' : 'Offline'} · @{f.user.username}</div>
                </div>
                <button className="btn ghost sm" onClick={() => act(() => api.removeFriend(f.user.id), 'Amicizia rimossa')}>
                  <UserMinus size={14} /> Rimuovi
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Ancora nessun amico. Cerca il nome utente di chi gioca con te.</Empty>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="section">
          <div className="section-title">Richieste inviate</div>
          <div className="row wrap">
            {outgoing.map((f) => (
              <div key={f.user.id} className="chip">
                <Avatar user={f.user} size={20} /> {f.user.displayName}
                <button className="btn ghost sm icon" aria-label="Annulla" onClick={() => act(() => api.removeFriend(f.user.id))}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

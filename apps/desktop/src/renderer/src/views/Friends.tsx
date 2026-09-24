import type { UserPublic } from '@thevtt/shared';
import { Check, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, Empty, PageHeader, Section } from '../components/ui';
import { useApp } from '../store/app';

export function FriendsView() {
  const { friends, api, run, refresh } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
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
      <PageHeader title="Amici" subtitle="Per invitarli nelle tue campagne." />

      <div className="col">
        <div className="row" style={{ position: 'relative' }}>
          <Search size={15} className="faint" style={{ position: 'absolute', left: 10 }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Cerca per nome utente" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {query.trim().length >= 2 && (
          <div className="list">
            {results.map((u) => {
              const st = known.get(u.id);
              return (
                <div className="list-item" key={u.id}>
                  <Avatar user={u} size={28} presence />
                  <div className="grow">
                    <span className="title">{u.displayName}</span> <span className="faint small">@{u.username}</span>
                  </div>
                  {st === 'accepted' ? (
                    <span className="faint small">Già amici</span>
                  ) : st === 'pending_out' ? (
                    <span className="faint small">Richiesta inviata</span>
                  ) : (
                    <button className="btn sm" onClick={() => act(() => api.requestFriend(u.username), st === 'pending_in' ? 'Ora siete amici' : 'Richiesta inviata')}>
                      {st === 'pending_in' ? 'Accetta' : 'Aggiungi'}
                    </button>
                  )}
                </div>
              );
            })}
            {!results.length && <div className="empty">Nessun utente trovato su questo server.</div>}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <Section title="Richieste">
          <div className="list">
            {incoming.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={30} presence />
                <div className="grow">
                  <span className="title">{f.user.displayName}</span> <span className="faint small">@{f.user.username}</span>
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
        </Section>
      )}

      <Section title={`Amici · ${accepted.filter((f) => f.user.online).length} online`}>
        {accepted.length ? (
          <div className="list">
            {accepted.map((f) => (
              <div className="list-item" key={f.user.id}>
                <Avatar user={f.user} size={30} presence />
                <div className="grow">
                  <div className="title">{f.user.displayName}</div>
                  <div className="meta">
                    {f.user.online ? 'Online' : 'Offline'} · @{f.user.username}
                  </div>
                </div>
                <button className="btn ghost sm" onClick={() => act(() => api.removeFriend(f.user.id), 'Amicizia rimossa')}>
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Ancora nessun amico. Cerca il nome utente di chi gioca con te.</Empty>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section title="In attesa di risposta">
          <div className="list">
            {outgoing.map((f) => (
              <div key={f.user.id} className="list-item">
                <Avatar user={f.user} size={26} />
                <div className="grow muted">{f.user.displayName}</div>
                <button className="btn ghost sm" onClick={() => act(() => api.removeFriend(f.user.id))}>
                  Annulla
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

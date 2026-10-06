import type { UserPublic } from '@thevtt/shared';
import { MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';
import { ChatThread } from '../components/ChatThread';
import { Avatar, Empty, Modal, PageHeader, Section } from '../components/ui';
import { useApp } from '../store/app';
import { useChat } from '../store/chat';

/** Everyone who plays on this server: the group's server is private, so everyone sees everyone. */
export function ParticipantsView() {
  const { participants, campaigns, user } = useApp();
  const [query, setQuery] = useState('');
  const [dm, setDm] = useState<UserPublic | null>(null);
  const unread = useChat((s) => s.unread);

  const q = query.trim().toLowerCase();
  const shown = participants.filter((p) => !q || p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q));
  const online = shown.filter((p) => p.online);
  const offline = shown.filter((p) => !p.online);
  // the campaigns we share, to tell people apart
  const together = (id: string) => campaigns.filter((c) => c.members.some((m) => m.user.id === id) && c.members.some((m) => m.user.id === user?.id)).map((c) => c.name);

  const row = (p: UserPublic) => {
    const shared = together(p.id);
    const n = unread[`dm:${p.id}`];
    return (
      <div className="list-item" key={p.id}>
        <Avatar user={p} size={34} presence />
        <div className="grow">
          <div className="title">
            {p.displayName} <span className="faint small">@{p.username}</span>
          </div>
          <div className="meta ellipsis">{shared.length ? `Insieme in ${shared.join(', ')}` : p.online ? 'Online' : 'Offline'}</div>
        </div>
        <button className="btn sm" onClick={() => setDm(p)} aria-label={`Scrivi a ${p.displayName}`}>
          <MessageSquare size={14} /> Messaggio
          {!!n && <span className="count">{n}</span>}
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <PageHeader title="Partecipanti" subtitle="Tutti quelli che giocano su questo server. Puoi invitarli nelle tue campagne o scrivergli in privato." />
      {participants.length > 6 && (
        <div className="search-field">
          <Search size={14} />
          <input className="input" placeholder="Cerca per nome" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cerca tra i partecipanti" />
        </div>
      )}
      {participants.length === 0 ? (
        <Empty>Per ora ci sei solo tu. Condividi il codice del gruppo: chi si registra con quel codice compare qui.</Empty>
      ) : (
        <>
          <Section title={`Online · ${online.length}`}>{online.length ? <div className="list">{online.map(row)}</div> : <p className="faint small">Nessuno online in questo momento.</p>}</Section>
          {offline.length > 0 && (
            <Section title="Offline">
              <div className="list">{offline.map(row)}</div>
            </Section>
          )}
        </>
      )}

      {dm && (
        <Modal title={`Messaggi con ${dm.displayName}`} onClose={() => setDm(null)}>
          <ChatThread channel={`dm:${dm.id}`} people={[dm]} placeholder={`Scrivi a ${dm.displayName}`} />
        </Modal>
      )}
    </div>
  );
}

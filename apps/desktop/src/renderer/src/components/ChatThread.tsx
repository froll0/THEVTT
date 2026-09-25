import type { UserPublic } from '@thevtt/shared';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/app';
import { useChat } from '../store/chat';
import { Avatar } from './ui';

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString('it-IT', today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** A conversation: campaign chat or direct messages. */
export function ChatThread({ channel, people, placeholder }: { channel: string; people: UserPublic[]; placeholder?: string }) {
  const me = useApp((s) => s.user);
  const messages = useChat((s) => s.threads[channel]);
  const { openThread, send } = useChat();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const toast = useApp((s) => s.toast);

  useEffect(() => {
    void openThread(channel);
    return () => {
      if (useChat.getState().open === channel) void useChat.getState().openThread(null);
    };
  }, [channel, openThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length]);

  const byId = new Map([...people, ...(me ? [me] : [])].map((u) => [u.id, u]));
  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await send(channel, t);
      setText('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Messaggio non inviato', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread">
      <div className="thread-log">
        {!messages && <div className="spinner" />}
        {messages?.length === 0 && <p className="faint small center">Ancora nessun messaggio.</p>}
        {messages?.map((m, i) => {
          const author = byId.get(m.authorId);
          const grouped = i > 0 && messages[i - 1]!.authorId === m.authorId && new Date(m.createdAt).getTime() - new Date(messages[i - 1]!.createdAt).getTime() < 5 * 60_000;
          return (
            <div key={m.id} className={`msg ${m.authorId === me?.id ? 'mine' : ''} ${grouped ? 'grouped' : ''}`}>
              {!grouped && (
                <div className="msg-head">
                  {author && <Avatar user={author} size={18} />}
                  <b>{author?.displayName ?? 'Qualcuno'}</b>
                  <span className="faint tiny">{when(m.createdAt)}</span>
                </div>
              )}
              <div className="msg-text selectable">{m.text}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="thread-input"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input className="input grow" value={text} placeholder={placeholder ?? 'Scrivi un messaggio'} onChange={(e) => setText(e.target.value)} aria-label="Messaggio" />
        <button className="btn primary icon" disabled={!text.trim() || busy} aria-label="Invia">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

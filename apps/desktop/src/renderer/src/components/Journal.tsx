import type { JournalEntry } from '@thevtt/shared';
import { BookText, ChevronLeft, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useApp } from '../store/app';
import { plainText, RichEditor } from './RichText';

type Filter = 'all' | 'none' | string;
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const today = () => new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const when = (ts: string) => {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `oggi, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * The personal journal: session notes only their author can read, kept on the
 * server. Used as a launcher page and as a floating window at the table.
 */
export function Journal({ campaignId, narrow }: { campaignId?: string | null; narrow?: boolean }) {
  const { api, campaigns, run } = useApp();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>(campaignId ?? 'all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .journal()
      .then((list) => {
        if (!alive) return;
        setEntries(list);
        // open straight onto the latest page (of this campaign, at the table)
        if (!narrow) setOpenId((campaignId ? list.find((e) => e.campaignId === campaignId) : list[0])?.id ?? null);
      })
      .catch(() => alive && setEntries([]));
    return () => {
      alive = false;
    };
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = useCallback((e: JournalEntry) => setEntries((list) => (list ?? []).map((x) => (x.id === e.id ? e : x)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))), []);

  const create = () =>
    run(async () => {
      const e = await api.createJournal({ title: `Sessione del ${today()}`, campaignId: filter !== 'all' && filter !== 'none' ? filter : null });
      setEntries((list) => [e, ...(list ?? [])]);
      setQuery('');
      setOpenId(e.id);
    });

  const remove = (e: JournalEntry) =>
    run(async () => {
      await api.deleteJournal(e.id);
      setEntries((list) => (list ?? []).filter((x) => x.id !== e.id));
      setOpenId(null);
    }, 'Pagina eliminata');

  const q = query.trim().toLowerCase();
  const shown = (entries ?? []).filter(
    (e) =>
      (filter === 'all' || (filter === 'none' ? !e.campaignId : e.campaignId === filter)) &&
      (!q || `${e.title} ${plainText(e.body)}`.toLowerCase().includes(q)),
  );
  const open = entries?.find((e) => e.id === openId) ?? null;
  const campaignName = (id: string | null) => (id ? (campaigns.find((c) => c.id === id)?.name ?? 'Campagna') : null);

  const list = (
    <div className="journal-list">
      <div className="row">
        <div className="search-field grow">
          <Search size={14} />
          <input className="input" placeholder="Cerca nel diario" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cerca nel diario" />
        </div>
        <button className="btn sm primary" onClick={create}>
          <Plus size={14} /> Nuova pagina
        </button>
      </div>
      <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Campagna del diario">
        <option value="all">Tutte le pagine</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="none">Senza campagna</option>
      </select>
      <div className="journal-pages">
        {entries === null ? (
          <p className="faint small">Carico il diario…</p>
        ) : shown.length === 0 ? (
          <div className="journal-empty">
            <BookText size={22} />
            <p className="faint small">{q ? 'Nessuna pagina trovata.' : 'Il tuo diario è vuoto. Annota qui quello che succede in sessione: lo ritrovi la volta dopo, e lo leggi solo tu.'}</p>
          </div>
        ) : (
          shown.map((e) => (
            <button key={e.id} className={`journal-row ${e.id === openId ? 'active' : ''}`} onClick={() => setOpenId(e.id)}>
              <b className="ellipsis">{e.title || 'Senza titolo'}</b>
              <span className="faint tiny ellipsis">{plainText(e.body).slice(0, 100) || '—'}</span>
              <span className="faint tiny row" style={{ gap: 6 }}>
                {when(e.updatedAt)}
                {filter === 'all' && e.campaignId && <span className="badge">{campaignName(e.campaignId)}</span>}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const editor = open ? (
    <JournalEditor key={open.id} entry={open} narrow={narrow} onBack={() => setOpenId(null)} onSaved={saved} onDelete={() => remove(open)} />
  ) : (
    <div className="journal-editor journal-empty">
      <BookText size={28} />
      <p className="faint small">Scegli una pagina o scrivine una nuova.</p>
    </div>
  );

  if (narrow) return <div className="journal narrow">{open ? editor : list}</div>;
  return (
    <div className="journal">
      {list}
      {editor}
    </div>
  );
}

function JournalEditor({
  entry,
  narrow,
  onBack,
  onSaved,
  onDelete,
}: {
  entry: JournalEntry;
  narrow?: boolean;
  onBack: () => void;
  onSaved: (e: JournalEntry) => void;
  onDelete: () => void;
}) {
  const { api, campaigns } = useApp();
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [status, setStatus] = useState<SaveState>('saved');
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** what the server has, to know when there is something to send */
  const last = useRef({ title: entry.title, body: entry.body });
  const latest = useRef({ title, body });
  latest.current = { title, body };

  const flush = useCallback(async () => {
    const { title: t, body: b } = latest.current;
    if (t === last.current.title && b === last.current.body) return;
    setStatus('saving');
    try {
      const e = await api.updateJournal(entry.id, { title: t, body: b });
      last.current = { title: e.title, body: e.body };
      onSaved(e);
      const now = latest.current;
      setStatus(now.title === e.title && now.body === e.body ? 'saved' : 'dirty');
    } catch {
      setStatus('error');
    }
  }, [api, entry.id, onSaved]);

  useEffect(() => {
    if (title === last.current.title && body === last.current.body) return;
    setStatus('dirty');
    const t = setTimeout(() => void flush(), 700);
    return () => clearTimeout(t);
  }, [title, body, flush]);

  // leaving the page (or closing the window) saves what's left
  useEffect(() => () => void flush(), [flush]);

  const setCampaign = async (campaignId: string | null) => {
    await flush();
    const e = await api.updateJournal(entry.id, { campaignId }).catch(() => null);
    if (e) onSaved(e);
  };

  const editorRef = useRef<Editor | null>(null);
  const stamp = () => {
    const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    editorRef.current?.chain().focus('end').insertContent(`<h3>Ore ${time}</h3><p></p>`).run();
  };

  return (
    <div className="journal-editor">
      <div className="row between">
        {narrow ? (
          <button className="btn ghost sm" onClick={onBack}>
            <ChevronLeft size={14} /> Diario
          </button>
        ) : (
          <span />
        )}
        <div className="row" style={{ gap: 6 }}>
          <span className={`faint tiny save-state ${status}`} aria-live="polite">
            {status === 'saving' ? 'Salvataggio…' : status === 'dirty' ? 'Modifiche non salvate' : status === 'error' ? 'Non salvato: riprovo alla prossima modifica' : 'Salvato'}
          </span>
          <button className="btn ghost sm" onClick={stamp} title="Aggiunge l’ora attuale, per tenere il filo della sessione">
            Segna l’ora
          </button>
          {confirmDelete ? (
            <>
              <button className="btn sm danger" onClick={onDelete}>
                Elimina
              </button>
              <button className="btn ghost sm" onClick={() => setConfirmDelete(false)}>
                Annulla
              </button>
            </>
          ) : (
            <button className="btn ghost sm icon danger" onClick={() => setConfirmDelete(true)} aria-label="Elimina pagina" title="Elimina pagina">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <input className="input journal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" aria-label="Titolo della pagina" maxLength={120} />
      <select className="select" value={entry.campaignId ?? ''} onChange={(e) => void setCampaign(e.target.value || null)} aria-label="Campagna della pagina">
        <option value="">Nessuna campagna</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <RichEditor
        className="journal-body"
        value={body}
        onChange={setBody}
        onBlur={() => void flush()}
        onReady={(e) => (editorRef.current = e)}
        placeholder="Cosa è successo? PNG incontrati, indizi, promesse, tesori…"
        ariaLabel="Testo della pagina"
      />
    </div>
  );
}

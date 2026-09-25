import type { ChatCard } from '@thevtt/shared';
import { ChevronLeft, ExternalLink, MessageSquareShare, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useHomebrew } from '../store/homebrew';
import { getSystemUi, type CompendiumEntry } from '../systems';

/** Lower case without accents: "è" finds "e" and the other way round. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function useEntries(systemId: string) {
  const homebrew = useHomebrew((s) => s.monsters);
  const ui = getSystemUi(systemId);
  return useMemo(() => {
    const list = ui?.compendium?.entries(homebrew.filter((h) => h.systemId === systemId)) ?? [];
    return list.map((e) => ({ e, title: fold(e.title), text: fold(e.text) }));
  }, [ui, homebrew, systemId]);
}

type Actions = {
  onRoll?: (formula: string, label: string) => void;
  onShare?: (card: ChatCard) => void;
  /** table: open the page in a floating window */
  onPopOut?: (entry: CompendiumEntry) => void;
};

function EntryPage({ e, onRoll, onShare, onPopOut }: { e: CompendiumEntry } & Actions) {
  return (
    <article className="comp-page">
      <header className="col" style={{ gap: 2 }}>
        <span className="faint tiny">{e.category}</span>
        <h2>{e.title}</h2>
        {e.subtitle && <span className="muted small">{e.subtitle}</span>}
        {(onShare && e.card) || onPopOut ? (
          <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
            {onShare && e.card && (
              <button className="btn sm" onClick={() => onShare(e.card!())}>
                <MessageSquareShare size={14} /> Mostra in chat
              </button>
            )}
            {onPopOut && (
              <button className="btn ghost sm" onClick={() => onPopOut(e)}>
                <ExternalLink size={14} /> Apri in finestra
              </button>
            )}
          </div>
        ) : null}
      </header>
      {e.render({ onRoll })}
    </article>
  );
}

/** One compendium page by id: the content of a floating window at the table. */
export function CompendiumEntryView({ systemId, entryId, ...actions }: { systemId: string; entryId: string } & Actions) {
  const all = useEntries(systemId);
  const e = all.find((x) => x.e.id === entryId)?.e;
  return e ? <EntryPage e={e} {...actions} /> : <p className="muted small">Voce non trovata.</p>;
}

export function Compendium({
  systemId,
  compact,
  onRoll,
  onShare,
  onPopOut,
}: {
  systemId: string;
  /** narrow layout (table dock): list and page one at a time */
  compact?: boolean;
} & Actions) {
  const ui = getSystemUi(systemId);
  const all = useEntries(systemId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const categories = ui?.compendium?.categories ?? [];

  const results = useMemo(() => {
    const q = fold(query.trim());
    const words = q.split(/\s+/).filter(Boolean);
    return all
      .filter((x) => !category || x.e.category === category)
      .map((x) => {
        if (!words.length) return { x, score: 0 };
        if (!words.every((w) => x.title.includes(w) || x.text.includes(w))) return null;
        const score = (x.title === q ? 100 : 0) + (x.title.startsWith(q) ? 50 : 0) + words.filter((w) => x.title.includes(w)).length * 10;
        return { x, score };
      })
      .filter((r): r is { x: (typeof all)[number]; score: number } => !!r)
      .sort((a, b) => b.score - a.score || a.x.e.title.localeCompare(b.x.e.title))
      .slice(0, 300)
      .map((r) => r.x.e);
  }, [all, query, category]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const x of all) c.set(x.e.category, (c.get(x.e.category) ?? 0) + 1);
    return c;
  }, [all]);

  if (!ui?.compendium) return <p className="muted small">Nessun compendio per questo sistema di gioco.</p>;
  const open = all.find((x) => x.e.id === openId)?.e;

  const searchBox = (
    <div className="row" style={{ position: 'relative' }}>
      <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
      <input
        className="input"
        style={{ paddingLeft: 30 }}
        placeholder="Cerca regole, incantesimi, mostri…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (compact) setOpenId(null);
        }}
        aria-label="Cerca nel compendio"
      />
    </div>
  );

  const list = (
    <div className="comp-list">
      {results.length === 0 && <p className="faint small">Nessun risultato.</p>}
      {results.map((e) => (
        <button key={e.id} className={`comp-row ${e.id === openId ? 'active' : ''}`} onClick={() => setOpenId(e.id)}>
          <span className="ellipsis">{e.title}</span>
          <span className="faint tiny ellipsis">
            {!category ? `${e.category}${e.subtitle ? ' · ' : ''}` : ''}
            {e.subtitle}
          </span>
        </button>
      ))}
    </div>
  );

  const page = (e: CompendiumEntry) => <EntryPage e={e} onRoll={onRoll} onShare={onShare} onPopOut={onPopOut} />;

  if (compact) {
    return (
      <div className="col compendium compact">
        {open ? (
          <>
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOpenId(null)}>
              <ChevronLeft size={14} /> Risultati
            </button>
            {page(open)}
          </>
        ) : (
          <>
            {searchBox}
            <select className="select" value={category ?? ''} onChange={(e) => setCategory(e.target.value || null)} aria-label="Categoria">
              <option value="">Tutte le categorie</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({counts.get(c) ?? 0})
                </option>
              ))}
            </select>
            {list}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="compendium">
      <aside className="comp-side">
        {searchBox}
        <nav className="comp-cats">
          <button className={!category ? 'active' : ''} onClick={() => setCategory(null)}>
            Tutto <span className="faint tiny">{all.length}</span>
          </button>
          {categories.map((c) => (
            <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
              {c} <span className="faint tiny">{counts.get(c) ?? 0}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="comp-results">{list}</div>
      <div className="comp-detail">{open ? page(open) : <p className="faint small">Scegli una voce a sinistra. La ricerca guarda anche dentro i testi.</p>}</div>
    </div>
  );
}

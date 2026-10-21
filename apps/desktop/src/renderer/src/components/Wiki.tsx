import { WIKI_KINDS, type WikiKind, type WikiPage } from '@thevtt/shared';
import { CalendarDays, Eye, EyeOff, FileText, Gem, Lock, MapPin, Pencil, Plus, Search, Shield, Trash2, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/app';
import { useWiki } from '../store/wiki';
import { plainText, RichEditor, RichView, WIKI_LINK } from './RichText';
import { Modal, Switch } from './ui';

export const KIND: Record<WikiKind, { label: string; plural: string; icon: typeof MapPin }> = {
  luogo: { label: 'Luogo', plural: 'Luoghi', icon: MapPin },
  png: { label: 'Personaggio', plural: 'Personaggi', icon: User },
  fazione: { label: 'Fazione', plural: 'Fazioni', icon: Shield },
  oggetto: { label: 'Oggetto', plural: 'Oggetti', icon: Gem },
  evento: { label: 'Evento', plural: 'Eventi', icon: CalendarDays },
  altro: { label: 'Altro', plural: 'Altro', icon: FileText },
};

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('it') === b.trim().toLocaleLowerCase('it');
/** the pages a text links to, by title */
const linksIn = (html: string) => [...plainText(html).matchAll(WIKI_LINK)].map((m) => m[1]!.trim());

type Draft = Pick<WikiPage, 'title' | 'kind' | 'body' | 'secret' | 'visible'> & { id?: string };

/**
 * The campaign's wiki: places, people, factions, things and events, linked
 * with [[Title]]. Players read what the GM made visible; the GM also reads
 * (and writes) the part for their eyes only.
 */
export function WikiBrowser({ campaignId, isGm, compact, initial }: { campaignId: string; isGm: boolean; compact?: boolean; initial?: string }) {
  const toast = useApp((s) => s.toast);
  const pages = useWiki((s) => s.pages[campaignId]);
  const { load, save, remove } = useWiki();
  const [openTitle, setOpenTitle] = useState<string | null>(initial ?? null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<WikiKind | 'all'>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WikiPage | null>(null);

  useEffect(() => {
    void load(campaignId).catch((e) => toast((e as Error).message, 'error'));
  }, [campaignId, load, toast]);

  const list = pages ?? [];
  const open = openTitle ? list.find((p) => same(p.title, openTitle)) : undefined;
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('it');
    return list.filter((p) => (kind === 'all' || p.kind === kind) && (!q || p.title.toLocaleLowerCase('it').includes(q) || plainText(p.body).toLocaleLowerCase('it').includes(q)));
  }, [list, query, kind]);
  const groups = WIKI_KINDS.map((k) => [k, shown.filter((p) => p.kind === k)] as const).filter(([, l]) => l.length);
  // who links here
  const backlinks = open ? list.filter((p) => p.id !== open.id && linksIn(p.body).some((t) => same(t, open.title))) : [];

  const follow = (title: string) => {
    if (list.some((p) => same(p.title, title))) return setOpenTitle(title);
    if (isGm) setDraft({ title, kind: 'altro', body: '', secret: '', visible: false });
    else toast(`«${title}» non è ancora stata scritta`);
  };
  const commit = async () => {
    if (!draft) return;
    if (!draft.title.trim()) return toast('Dai un titolo alla pagina', 'error');
    if (list.some((p) => p.id !== draft.id && same(p.title, draft.title))) return toast('C’è già una pagina con questo titolo', 'error');
    try {
      const saved = await save(campaignId, draft);
      setDraft(null);
      setOpenTitle(saved.title);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className={`wiki ${compact ? 'compact' : ''}`}>
      <aside className="wiki-index" aria-label="Pagine della wiki">
        <div className="wiki-search">
          <Search size={13} />
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nella wiki" aria-label="Cerca nella wiki" />
        </div>
        <div className="workshop-chips" role="group" aria-label="Tipo">
          <button className={`chip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>
            Tutto
          </button>
          {WIKI_KINDS.map((k) => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(kind === k ? 'all' : k)}>
              {KIND[k].plural}
            </button>
          ))}
        </div>
        {isGm && (
          <button className="btn sm" onClick={() => setDraft({ title: '', kind: kind === 'all' ? 'luogo' : kind, body: '', secret: '', visible: false })}>
            <Plus size={13} /> Nuova pagina
          </button>
        )}
        {groups.map(([k, items]) => {
          const Icon = KIND[k].icon;
          return (
            <section key={k}>
              <h4 className="wiki-group">
                <Icon size={12} /> {KIND[k].plural}
              </h4>
              {items.map((p) => (
                <button key={p.id} className={`wiki-item ${open?.id === p.id ? 'on' : ''}`} onClick={() => setOpenTitle(p.title)}>
                  <span className="ellipsis">{p.title}</span>
                  {isGm && !p.visible && <EyeOff size={11} aria-label="Nascosta ai giocatori" />}
                </button>
              ))}
            </section>
          );
        })}
        {pages && !list.length && <p className="faint small">{isGm ? 'Ancora vuota: scrivi la prima pagina, un luogo o un personaggio.' : 'Il master non ha ancora scritto niente.'}</p>}
        {pages && list.length > 0 && !shown.length && <p className="faint small">Nessuna pagina trovata.</p>}
      </aside>

      <article className="wiki-page" aria-label={open ? open.title : 'Pagina'}>
        {open ? (
          <>
            <header className="wiki-head">
              <div className="grow">
                <span className="faint tiny wiki-kind">
                  {(() => {
                    const Icon = KIND[open.kind].icon;
                    return <Icon size={12} />;
                  })()}{' '}
                  {KIND[open.kind].label}
                  {isGm && (open.visible ? ' · visibile ai giocatori' : ' · solo tu')}
                </span>
                <h2>{open.title}</h2>
              </div>
              {isGm && (
                <>
                  <button
                    className="btn ghost sm icon"
                    title={open.visible ? 'Nascondi ai giocatori' : 'Mostra ai giocatori'}
                    aria-label={open.visible ? 'Nascondi ai giocatori' : 'Mostra ai giocatori'}
                    onClick={() => void save(campaignId, { id: open.id, visible: !open.visible }).catch((e) => toast((e as Error).message, 'error'))}
                  >
                    {open.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button className="btn ghost sm icon" aria-label="Modifica la pagina" onClick={() => setDraft({ id: open.id, title: open.title, kind: open.kind, body: open.body, secret: open.secret ?? '', visible: open.visible })}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn ghost sm icon" aria-label="Elimina la pagina" onClick={() => setConfirmDelete(open)}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </header>
            {open.body ? <RichView value={open.body} onLink={follow} /> : <p className="faint">Ancora niente da leggere.</p>}
            {isGm && open.secret && plainText(open.secret) && (
              <section className="wiki-secret" aria-label="Solo per il master">
                <h4>
                  <Lock size={12} /> Solo per te
                </h4>
                <RichView value={open.secret} onLink={follow} />
              </section>
            )}
            {backlinks.length > 0 && (
              <footer className="wiki-backlinks">
                <span className="faint tiny">Citata in</span>
                <div className="workshop-chips">
                  {backlinks.map((p) => (
                    <button key={p.id} className="chip" onClick={() => setOpenTitle(p.title)}>
                      {p.title}
                    </button>
                  ))}
                </div>
              </footer>
            )}
          </>
        ) : (
          <div className="wiki-empty">
            <p className="muted">Scegli una pagina{isGm ? ', o scrivine una nuova' : ''}.</p>
            <p className="faint small">Nel testo, [[Titolo]] porta a un’altra pagina.</p>
          </div>
        )}
      </article>

      {draft && (
        <Modal
          title={draft.id ? `Modifica «${draft.title}»` : 'Nuova pagina'}
          onClose={() => setDraft(null)}
          wide
          actions={
            <>
              <button className="btn ghost" onClick={() => setDraft(null)}>
                Annulla
              </button>
              <button className="btn primary" onClick={() => void commit()}>
                Salva
              </button>
            </>
          }
        >
          <div className="fields two">
            <label className="field">
              <span>Titolo</span>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 120) })} autoFocus placeholder="Roccanera" />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as WikiKind })}>
                {WIKI_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND[k].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row between">
            <span className="small">Visibile ai giocatori</span>
            <Switch on={draft.visible} onChange={(visible) => setDraft({ ...draft, visible })} label="Visibile ai giocatori" />
          </div>
          <RichEditor key={`b-${draft.id ?? 'new'}`} value={draft.body} onChange={(body) => setDraft((d) => d && { ...d, body })} placeholder="Cosa sanno tutti. [[Un’altra pagina]] fa un collegamento." ariaLabel="Testo della pagina" />
          <span className="small">
            <Lock size={12} /> Solo per te
          </span>
          <RichEditor key={`s-${draft.id ?? 'new'}`} value={draft.secret ?? ''} onChange={(secret) => setDraft((d) => d && { ...d, secret })} placeholder="Segreti, colpi di scena, statistiche: i giocatori non li ricevono mai" ariaLabel="Parte segreta" />
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title={`Eliminare «${confirmDelete.title}»?`}
          onClose={() => setConfirmDelete(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirmDelete(null)}>
                Annulla
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  const p = confirmDelete;
                  setConfirmDelete(null);
                  setOpenTitle(null);
                  void remove(campaignId, p.id).catch((e) => toast((e as Error).message, 'error'));
                }}
              >
                Elimina
              </button>
            </>
          }
        >
          <p>La pagina sparisce per tutti. I collegamenti che la citano restano, e portano a una pagina da scrivere.</p>
        </Modal>
      )}
    </div>
  );
}

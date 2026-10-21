import { Check, CircleAlert, Code2, FileUp, FlaskConical, Link2, Pencil, Puzzle, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Setting, Switch, Tabs } from '../components/ui';
import { CATALOG, fetchPlugin, newerVersion, type CatalogEntry } from '../lib/pluginCatalog';
import { CAPABILITIES, MAX_PLUGIN_BYTES, parsePlugin, pluginCapabilities, usePlugins, type Plugin } from '../lib/plugins';
import { useApp } from '../store/app';

const EXAMPLE = `// @name Tiro critico
// @description Applaude ogni 20 naturale e aggiunge il comando /moneta
// @version 1.0

thevtt.on('log', (entry) => {
  const d20 = entry.roll?.parts.find((p) => p.sides === 20);
  if (d20?.rolls?.some((r) => r.value === 20 && !r.dropped)) thevtt.toast('Venti naturale!');
});

thevtt.command('moneta', 'Testa o croce', () => {
  thevtt.chat(Math.random() < 0.5 ? 'Testa!' : 'Croce!');
});

thevtt.button('Iniziativa', () => thevtt.roll('1d20', 'Iniziativa'));`;

/** what the code can do, as small labels (the risky ones stand out) */
function Capabilities({ code }: { code: string }) {
  const caps = pluginCapabilities(code);
  if (!caps.length) return <span className="faint tiny">Non fa niente al tavolo</span>;
  return (
    <span className="caps" aria-label="Cosa può fare">
      {caps.map((c) => (
        <span key={c} className={`cap ${CAPABILITIES[c].risky ? 'risky' : ''}`} title={CAPABILITIES[c].hint}>
          {CAPABILITIES[c].risky && <ShieldAlert size={11} />}
          {CAPABILITIES[c].label}
        </span>
      ))}
    </span>
  );
}

/** an extension about to be added: who it is, what it can do, its whole code */
interface Candidate {
  code: string;
  source?: string;
  fileName?: string;
}

/**
 * Extensions: the user's own scripts, from the workshop, the catalog, a link
 * or a file. Off until switched on, after a clear word about what they can do.
 */
export function PluginSettings() {
  const me = useApp((s) => s.user?.id ?? '');
  const toast = useApp((s) => s.toast);
  const go = useApp((s) => s.go);
  const { plugins, errors, load, install, toggle, remove } = usePlugins();
  const [tab, setTab] = useState<'mine' | 'catalog'>('mine');
  const [paste, setPaste] = useState(false);
  const [code, setCode] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [confirm, setConfirm] = useState<Plugin | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (me) void load(me);
  }, [me, load]);

  const add = (c: Candidate) => {
    try {
      const p = install(c.code, c.fileName, c.source);
      toast(`Estensione «${p.name}» aggiunta: attivala quando vuoi`);
      setPaste(false);
      setCode('');
      setCandidate(null);
      setLink(null);
      setTab('mine');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const fromLink = async () => {
    if (!link) return;
    setFetching(true);
    try {
      const text = await fetchPlugin(link, MAX_PLUGIN_BYTES);
      setCandidate({ code: text, source: link.trim(), fileName: link.split('/').pop() });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setFetching(false);
    }
  };

  return (
    <>
      <p className="muted small">
        Piccoli programmi che aggiungono comandi in chat, pulsanti sulla barra delle macro e reazioni a quello che succede al tavolo. Girano isolati dall’app e possono fare solo
        quello che potresti fare tu: vedono il tavolo come lo vedi tu, e le loro azioni passano gli stessi controlli dei tuoi clic.
      </p>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn primary sm" onClick={() => go({ name: 'workshop', id: null })}>
          <FlaskConical size={14} /> Crea nel laboratorio
        </button>
        <button className="btn sm" onClick={() => setLink('')}>
          <Link2 size={14} /> Da un link
        </button>
        <button className="btn sm" onClick={() => file.current?.click()}>
          <FileUp size={14} /> Da un file .js
        </button>
        <button className="btn ghost sm" onClick={() => setPaste(true)}>
          Incolla il codice
        </button>
        <input
          ref={file}
          type="file"
          accept=".js,text/javascript"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setCandidate({ code: await f.text(), fileName: f.name });
          }}
        />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { id: 'mine', label: `Le tue (${plugins.length})` },
          { id: 'catalog', label: 'Catalogo' },
        ]}
      />
      {tab === 'mine' ? (
        <div className="list">
          {plugins.map((p) => (
            <Setting
              key={p.id}
              title={`${p.name} · ${p.version}`}
              hint={
                <>
                  {errors[p.id] && p.enabled ? `Errore: ${errors[p.id]}` : p.description || 'Nessuna descrizione'}
                  <br />
                  <Capabilities code={p.code} />
                </>
              }
            >
              {errors[p.id] && p.enabled && <CircleAlert size={14} className="danger-text" aria-label="Errore" />}
              <button className="btn ghost sm icon" onClick={() => go({ name: 'workshop', id: p.id })} aria-label={`Modifica ${p.name}`} title="Apri nel laboratorio">
                <Pencil size={14} />
              </button>
              <Switch on={p.enabled} onChange={(on) => (on ? setConfirm(p) : toggle(p.id, false))} label={`Attiva ${p.name}`} />
              <button className="btn ghost sm icon" onClick={() => remove(p.id)} aria-label={`Rimuovi ${p.name}`}>
                <Trash2 size={14} />
              </button>
            </Setting>
          ))}
          {!plugins.length && (
            <p className="faint small">
              <Puzzle size={13} /> Nessuna estensione. Creane una nel laboratorio, partendo da un modello, o prendine una dal catalogo.
            </p>
          )}
        </div>
      ) : (
        <Catalog plugins={plugins} onPick={(e) => setCandidate({ code: e.code, source: `catalogo:${e.id}` })} />
      )}

      {link !== null && !candidate && (
        <Modal
          title="Un’estensione da un link"
          onClose={() => setLink(null)}
          actions={
            <button className="btn primary" disabled={!link.trim() || fetching} onClick={() => void fromLink()}>
              {fetching ? 'Scarico…' : 'Scarica e leggi'}
            </button>
          }
        >
          <input
            className="input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void fromLink()}
            placeholder="https://…/estensione.js"
            aria-label="Link dell’estensione"
            autoFocus
          />
          <p className="small faint">Il link a un file .js (anche su GitHub o in un gist). Prima di aggiungerla vedi cosa può fare e tutto il suo codice.</p>
        </Modal>
      )}
      {candidate && <Preview candidate={candidate} existing={plugins} onAdd={() => add(candidate)} onClose={() => setCandidate(null)} />}
      {paste && (
        <Modal
          title="Incolla un’estensione"
          onClose={() => setPaste(false)}
          wide
          actions={
            <>
              <button className="btn ghost" onClick={() => setCode(EXAMPLE)}>
                Usa l’esempio
              </button>
              <button className="btn primary" disabled={!code.trim()} onClick={() => add({ code })}>
                Aggiungi
              </button>
            </>
          }
        >
          <textarea className="input mono" rows={16} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Codice dell’estensione" placeholder="// @name La mia estensione" spellCheck={false} />
          <p className="faint tiny">
            L’estensione riceve <code>thevtt</code>: <code>on('state' | 'log' | 'turn', fn)</code>, <code>command(nome, descrizione, fn)</code>, <code>button(etichetta, fn)</code>,{' '}
            <code>chat(testo)</code>, <code>roll(formula, etichetta)</code>, <code>card(scheda)</code>, <code>dispatch(azione)</code>, <code>toast(testo)</code>, <code>log(…)</code>,{' '}
            <code>state</code>.
          </p>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={`Attivare «${confirm.name}»?`}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Annulla
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  toggle(confirm.id, true);
                  setConfirm(null);
                }}
              >
                Attiva
              </button>
            </>
          }
        >
          <p>Attiva solo estensioni di cui ti fidi. Al tavolo potrà vedere quello che vedi tu (da master: tutto il tavolo, anche i segreti) e, leggendo il suo codice:</p>
          <CapabilityList code={confirm.code} />
          <p className="small faint">Non vede le tue password, i tuoi file né le impostazioni dell’app. Codice: {Math.ceil(confirm.code.length / 1024)} kB.</p>
        </Modal>
      )}
    </>
  );
}

function CapabilityList({ code }: { code: string }) {
  const caps = pluginCapabilities(code);
  return (
    <ul className="small cap-list">
      {caps.map((c) => (
        <li key={c} className={CAPABILITIES[c].risky ? 'risky' : ''}>
          {CAPABILITIES[c].risky && <ShieldAlert size={12} />} <b>{CAPABILITIES[c].label}</b>: {CAPABILITIES[c].hint.toLowerCase()}
        </li>
      ))}
      {!caps.length && <li>niente di particolare: non usa le funzioni del tavolo</li>}
    </ul>
  );
}

/** before adding: name, what it can do, its whole code */
function Preview({ candidate, existing, onAdd, onClose }: { candidate: Candidate; existing: Plugin[]; onAdd(): void; onClose(): void }) {
  const meta = parsePlugin(candidate.code, candidate.fileName?.replace(/\.[^.]+$/, ''));
  const same = existing.find((p) => p.name === meta.name);
  return (
    <Modal
      title={`Aggiungere «${meta.name}»?`}
      onClose={onClose}
      wide
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={onAdd}>
            {same ? `Aggiorna (${same.version} → ${meta.version})` : 'Aggiungi'}
          </button>
        </>
      }
    >
      <p className="small">
        {meta.description || 'Nessuna descrizione'} · versione {meta.version}
        {candidate.source && !candidate.source.startsWith('catalogo:') && <span className="faint"> · da {new URL(candidate.source).hostname}</span>}
      </p>
      <p className="small">Leggendo il suo codice, può:</p>
      <CapabilityList code={candidate.code} />
      <details className="plugin-code">
        <summary>
          <Code2 size={13} /> Il codice ({Math.ceil(candidate.code.length / 1024)} kB)
        </summary>
        <pre translate="no">{candidate.code}</pre>
      </details>
      <p className="small faint">Resta spenta finché non la attivi.</p>
    </Modal>
  );
}

function Catalog({ plugins, onPick }: { plugins: Plugin[]; onPick(e: CatalogEntry): void }) {
  const groups = useMemo(() => {
    const by = new Map<string, CatalogEntry[]>();
    for (const e of CATALOG) by.set(e.category, [...(by.get(e.category) ?? []), e]);
    return [...by];
  }, []);
  return (
    <div className="catalog">
      <p className="small faint">Estensioni pronte, scritte per TheVTT. Le leggi prima di aggiungerle e restano spente finché non le attivi; poi puoi cambiarle nel laboratorio.</p>
      {groups.map(([category, entries]) => (
        <section key={category}>
          <h3 className="catalog-h">{category}</h3>
          <div className="catalog-grid">
            {entries.map((e) => {
              const mine = plugins.find((p) => p.source === `catalogo:${e.id}` || p.name === e.name);
              const update = mine && newerVersion(e.version, mine.version);
              return (
                <article key={e.id} className="catalog-card">
                  <div className="row between">
                    <b>{e.name}</b>
                    <span className="faint tiny">{e.version}</span>
                  </div>
                  <p className="small">{e.description}</p>
                  <Capabilities code={e.code} />
                  <div className="row" style={{ marginTop: 'auto' }}>
                    {mine && !update ? (
                      <span className="small success-text">
                        <Check size={13} /> Aggiunta
                      </span>
                    ) : (
                      <button className="btn sm" onClick={() => onPick(e)} aria-label={`${update ? 'Aggiorna' : 'Aggiungi'} ${e.name}`}>
                        {update ? (
                          <>
                            <RefreshCw size={13} /> Aggiorna
                          </>
                        ) : (
                          'Aggiungi'
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

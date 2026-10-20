import { ArrowLeft, BookOpen, FileDown, FlaskConical, Play, Plus, RotateCcw, Save, ScrollText, Send, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CodeEditor, type CodeEditorHandle } from '../components/CodeEditor';
import { TopBar } from '../components/Shell';
import { Modal, Switch, Tabs } from '../components/ui';
import { BENCH_ID, PluginBench, type BenchLine } from '../lib/pluginBench';
import { API, FIELDS, readHeader, SNIPPETS, TEMPLATES, writeHeader, type Template } from '../lib/pluginKit';
import { usePlugins } from '../lib/plugins';
import { download } from '../table/sceneImage';
import { useApp } from '../store/app';

const KIND_LABEL: Record<BenchLine['kind'], string> = {
  chat: 'chat',
  roll: 'tiro',
  system: 'tavolo',
  card: 'scheda',
  toast: 'avviso',
  print: 'log',
  error: 'errore',
  action: 'azione',
};

/** the editor's shortcuts use ⌘ on a Mac (suggestions stay on Ctrl+Space everywhere) */
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

/** the snippet syntax (`${campo}`) as plain code, for the manual's examples */
const plain = (snippet: string) => snippet.replace(/\$\{([^}]*)\}/g, '$1').replace(/\t/g, '  ');

/**
 * The extensions workshop: write one with completions and checks as you type,
 * start from a ready-made one or drop in snippets, and try it at once on a
 * pretend table that plays by the real rules. Saved, it is one of the user's
 * extensions like any other.
 */
export function PluginStudio({ id }: { id: string | null }) {
  const { go, toast } = useApp();
  const me = useApp((s) => s.user?.id ?? '');
  const { plugins, load, install, update } = usePlugins();
  const existing = id ? plugins.find((p) => p.id === id) : undefined;
  const [savedId, setSavedId] = useState<string | null>(id);
  const [code, setCode] = useState(() => existing?.code ?? TEMPLATES[0]!.code);
  const [savedCode, setSavedCode] = useState<string | null>(existing?.code ?? null);
  const [pane, setPane] = useState<'bench' | 'manual'>('bench');
  const [auto, setAuto] = useState(true);
  const [pickTemplate, setPickTemplate] = useState<Template | null>(null);
  const [leaving, setLeaving] = useState(false);
  const editor = useRef<CodeEditorHandle>(null);
  const header = readHeader(code);
  const dirty = code !== savedCode;

  useEffect(() => {
    if (me) void load(me);
  }, [me, load]);
  // the store loads after the page opens: then the extension's code arrives
  useEffect(() => {
    if (existing && savedCode === null) {
      setCode(existing.code);
      setSavedCode(existing.code);
    }
  }, [existing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the bench: a new pretend table for each try ──
  const [bench, setBench] = useState<PluginBench | null>(null);
  const benchRef = useRef<PluginBench | null>(null);
  const run = (text = code) => {
    benchRef.current?.stop();
    benchRef.current = new PluginBench(text);
    setBench(benchRef.current);
  };
  useEffect(() => {
    run();
    return () => {
      benchRef.current?.stop();
      benchRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // trying it as you write: a moment after the last key
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (!auto) return;
    const t = setTimeout(() => run(code), 900);
    return () => clearTimeout(t);
  }, [code, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    try {
      const p = savedId ? update(savedId, code) : install(code);
      setSavedId(p.id);
      setSavedCode(code);
      toast(savedId ? `«${p.name}» salvata` : `«${p.name}» aggiunta alle tue estensioni: attivala dalle impostazioni`, 'success');
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    }
  };
  const back = () => go({ name: 'settings', section: 'plugins' });
  const exportFile = () => {
    const name = (header.name || 'estensione').toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, '-').replace(/^-|-$/g, '');
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    download(url, `${name || 'estensione'}.js`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const applyTemplate = (tpl: Template) => {
    setCode(tpl.code);
    setPickTemplate(null);
    editor.current?.focus();
  };

  return (
    <div className="shell table-shell studio workshop">
      <TopBar>
        <div className="studio-top row">
          <button className="btn ghost sm" onClick={() => (dirty ? setLeaving(true) : back())}>
            <ArrowLeft size={14} /> Estensioni
          </button>
          <span className="workshop-title">
            <FlaskConical size={15} /> {header.name || 'Senza nome'}
          </span>
          <span className="faint tiny">{dirty ? (savedCode === null ? 'Non ancora salvata' : 'Modifiche da salvare') : 'Salvata'}</span>
          <div className="grow" />
          <button className="btn sm" onClick={exportFile} title="L’estensione come file .js, da condividere">
            <FileDown size={14} /> Esporta
          </button>
          <button className="btn primary sm" onClick={save} disabled={!dirty} title={`Salva (${MOD}+S)`}>
            <Save size={14} /> Salva
          </button>
        </div>
      </TopBar>

      <div className="workshop-body">
        <aside className="workshop-side" aria-label="Intestazione, modelli e frammenti">
          <section>
            <h3 className="workshop-h">
              <ScrollText size={13} /> Intestazione
            </h3>
            <label className="workshop-field">
              <span>Nome</span>
              <input className="input" value={header.name} onChange={(e) => setCode((c) => writeHeader(c, 'name', e.target.value.slice(0, 60)))} placeholder="La mia estensione" />
            </label>
            <label className="workshop-field">
              <span>Descrizione</span>
              <input className="input" value={header.description} onChange={(e) => setCode((c) => writeHeader(c, 'description', e.target.value.slice(0, 200)))} placeholder="Cosa fa, in una riga" />
            </label>
            <label className="workshop-field">
              <span>Versione</span>
              <input className="input" value={header.version} onChange={(e) => setCode((c) => writeHeader(c, 'version', e.target.value.slice(0, 20)))} placeholder="1.0" />
            </label>
          </section>
          <section>
            <h3 className="workshop-h">
              <BookOpen size={13} /> Modelli
            </h3>
            <div className="workshop-list">
              {TEMPLATES.map((t) => (
                <button key={t.id} className="workshop-item" onClick={() => (code.trim() === t.code.trim() ? undefined : setPickTemplate(t))} title={t.description}>
                  <b>{t.name}</b>
                  <span>{t.description}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="workshop-h">
              <Wand2 size={13} /> Frammenti
            </h3>
            <p className="faint tiny">Si inseriscono dove sei; Tab passa al campo successivo.</p>
            <div className="workshop-chips">
              {SNIPPETS.map((s) => (
                <button key={s.name} className="chip" onClick={() => editor.current?.insertSnippet(s.code)} title={plain(s.code)}>
                  <Plus size={11} /> {s.name}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="workshop-code">
          <CodeEditor ref={editor} value={code} onChange={setCode} onSave={() => dirty && save()} label="Codice dell’estensione" />
          <div className="workshop-keys faint tiny" translate="no">
            <span>
              <kbd>Ctrl</kbd>+<kbd>Spazio</kbd> suggerimenti
            </span>
            <span>
              <kbd>{MOD}</kbd>+<kbd>S</kbd> salva
            </span>
            <span>
              <kbd>{MOD}</kbd>+<kbd>F</kbd> cerca
            </span>
            <span>
              <kbd>{MOD}</kbd>+<kbd>/</kbd> commento
            </span>
            <span>
              <kbd>{MOD}</kbd>+<kbd>Z</kbd> annulla
            </span>
          </div>
        </div>

        <aside className="workshop-bench" aria-label="Banco di prova">
          <Tabs
            value={pane}
            onChange={setPane}
            options={[
              { id: 'bench', label: 'Banco di prova' },
              { id: 'manual', label: 'Guida' },
            ]}
          />
          {pane === 'bench' ? bench && <Bench bench={bench} auto={auto} setAuto={setAuto} onRun={() => run()} /> : <Manual onInsert={(s) => editor.current?.insertSnippet(s)} />}
        </aside>
      </div>

      {pickTemplate && (
        <Modal
          title={`Partire da «${pickTemplate.name}»?`}
          onClose={() => setPickTemplate(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setPickTemplate(null)}>
                Annulla
              </button>
              <button className="btn primary" onClick={() => applyTemplate(pickTemplate)}>
                Usa il modello
              </button>
            </>
          }
        >
          <p>{pickTemplate.description}</p>
          <p className="small faint">Il codice che hai scritto qui viene sostituito{savedCode !== null && !dirty ? ' (quello salvato resta finché non salvi di nuovo)' : ''}. Puoi tornare indietro con {MOD}+Z.</p>
        </Modal>
      )}
      {leaving && (
        <Modal
          title="Uscire dal laboratorio?"
          onClose={() => setLeaving(false)}
          actions={
            <>
              <button className="btn ghost" onClick={back}>
                Esci senza salvare
              </button>
              <button className="btn primary" onClick={() => save() && back()}>
                Salva ed esci
              </button>
            </>
          }
        >
          <p>Ci sono modifiche non salvate.</p>
        </Modal>
      )}
    </div>
  );
}

/** the pretend table: what the extension did, its buttons and commands, a chat */
function Bench({ bench, auto, setAuto, onRun }: { bench: PluginBench; auto: boolean; setAuto(v: boolean): void; onRun(): void }) {
  const lines = useSyncExternalStore(
    (fn) => bench.subscribe(fn),
    () => bench.lines,
  );
  const view = useSyncExternalStore(
    (fn) => bench.subscribe(fn),
    () => bench.view,
  );
  const buttons = usePlugins((s) => s.buttons).filter((b) => b.pluginId === BENCH_ID);
  const commands = usePlugins((s) => s.commands).filter((c) => c.pluginId === BENCH_ID);
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);
  const turn = view.initiative.round > 0 ? view.initiative.entries[view.initiative.turn] : null;
  const tokens = useMemo(() => Object.values(view.tokens), [view.tokens]);

  return (
    <div className="bench">
      <div className="row between">
        <label className="row small" style={{ gap: 6 }}>
          <Switch on={auto} onChange={setAuto} label="Prova mentre scrivi" /> Prova mentre scrivi
        </label>
        <button className="btn sm" onClick={onRun} title="Riavvia l’estensione su un tavolo nuovo">
          <Play size={13} /> Prova
        </button>
      </div>

      <div className="bench-table" aria-label="Il tavolo di prova">
        {tokens.map((t) => (
          <span key={t.id} className={`bench-token ${turn?.tokenId === t.id ? 'on' : ''}`} style={{ ['--c' as string]: t.color }}>
            <i />
            {t.name}
            {t.hp && (
              <small>
                {t.hp.current}/{t.hp.max}
              </small>
            )}
            {!!t.conditions.length && <small>· {t.conditions.join(', ')}</small>}
          </span>
        ))}
        <span className="faint tiny">{turn ? `Round ${view.initiative.round} · turno di ${turn.name}` : 'Combattimento non iniziato'}</span>
      </div>

      <div className="bench-sim">
        <span className="faint tiny">Fai succedere qualcosa:</span>
        <div className="workshop-chips">
          <button className="chip" onClick={() => bench.liaRolls()}>
            Lia tira
          </button>
          <button className="chip" onClick={() => bench.liaRolls(20)}>
            <Sparkles size={11} /> 20 naturale
          </button>
          <button className="chip" onClick={() => bench.liaRolls(1)}>
            1 naturale
          </button>
          <button className="chip" onClick={() => bench.act('me', { type: 'initiative.next' })}>
            Turno successivo
          </button>
          <button className="chip" onClick={() => bench.act('lia', { type: 'chat', text: 'Attacco il goblin!' })}>
            Lia scrive
          </button>
          <button className="chip" onClick={onRun}>
            <RotateCcw size={11} /> Tavolo nuovo
          </button>
        </div>
      </div>

      {(buttons.length > 0 || commands.length > 0) && (
        <div className="bench-own">
          {buttons.length > 0 && (
            <div className="workshop-chips" role="toolbar" aria-label="Pulsanti dell’estensione">
              {buttons.map((b) => (
                <button key={b.id} className="btn sm" onClick={() => bench.press(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
          )}
          {commands.length > 0 && (
            <div className="workshop-chips">
              {commands.map((c) => (
                <button key={c.name} className="chip mono" onClick={() => setText(`/${c.name} `)} title={c.description}>
                  /{c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bench-console" ref={box} role="log" aria-label="Console del banco di prova" translate="no">
        {lines.map((l) => (
          <div key={l.id} className={`bench-line ${l.kind}`}>
            <span className="bench-kind">{KIND_LABEL[l.kind]}</span>
            <span className="bench-text">{l.text}</span>
          </div>
        ))}
        {!lines.length && <p className="faint small">Qui compare quello che fa l’estensione: messaggi, tiri, avvisi, errori e i suoi thevtt.log.</p>}
      </div>

      <form
        className="bench-chat row"
        onSubmit={(e) => {
          e.preventDefault();
          bench.say(text);
          setText('');
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi, /r 1d20 o un /comando" aria-label="Chat del banco di prova" />
        <button className="btn icon sm" aria-label="Invia" disabled={!text.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

/** what `thevtt` offers, with a click to put it in the code */
function Manual({ onInsert }: { onInsert(snippet: string): void }) {
  return (
    <div className="manual">
      <p className="small">
        Un’estensione è un file JavaScript. Riceve <code>thevtt</code>, l’unico ponte verso il tavolo: vede quello che vedi tu e fa solo quello che potresti fare tu.
      </p>
      {API.map((a) => (
        <div key={a.name} className="manual-entry">
          <div className="row between">
            <code className="manual-sig">thevtt.{a.signature}</code>
            <button className="btn ghost sm icon" onClick={() => onInsert(`thevtt.${a.snippet}`)} aria-label={`Inserisci thevtt.${a.name}`} title="Inserisci">
              <Plus size={13} />
            </button>
          </div>
          <p className="small faint">{a.doc}</p>
        </div>
      ))}
      {Object.entries(FIELDS).map(([obj, fields]) => (
        <div key={obj} className="manual-entry">
          <h4 className="workshop-h">{obj === 'state' ? 'Il tavolo (state)' : 'Una riga di chat (entry)'}</h4>
          {fields.map((f) => (
            <p key={f.name} className="small">
              <code>{f.name}</code> <span className="faint">{f.doc}</span>
            </p>
          ))}
        </div>
      ))}
      <p className="small faint">
        Limiti: al massimo 20 azioni al secondo, 12 pulsanti e 12 comandi. Non può leggere i tuoi file, le password né le impostazioni dell’app.
      </p>
    </div>
  );
}

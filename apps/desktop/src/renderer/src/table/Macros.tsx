import { describeStep, expandMacro, macroQuestions, parseMacro, type Macro } from '@thevtt/shared';
import { ArrowDown, ArrowUp, CircleAlert, Play, Plus, Settings2, Trash2, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Field, Modal } from '../components/ui';
import { macroTargets, macroVars, runMacro } from '../lib/runMacro';
import { useApp } from '../store/app';
import { MACRO_COLORS, useMacros } from '../store/macros';
import { useTable } from '../store/table';

const EXAMPLES: Omit<Macro, 'id' | 'color'>[] = [
  { name: 'Attacco', body: '/r 1d20+?{Bonus per colpire|5} Attacco\n/r ?{Danni|1d8+3} Danni' },
  { name: 'Iniziativa', body: '/iniziativa' },
  { name: 'Pozione', body: '/cura 2d4+2 Pozione di guarigione\nBevo una pozione di guarigione!' },
  { name: 'Percezione', body: '/r 1d20+@sag+@comp Percezione' },
  { name: 'Furtività', body: '/br 1d20+@des+@comp Furtività' },
  { name: 'Colpo al bersaglio', body: '/danno ?{Danni|1d8+@for} ?{Arma|Spada lunga}' },
];

const HELP: [string, string][] = [
  ['/r 1d20+5 Etichetta', 'tira i dadi (/gr di nascosto, /br alla cieca)'],
  ['/danno 2d6+3 Ascia', 'tira e toglie i PF ai token selezionati'],
  ['/cura 2d4+2 Pozione', 'tira e ridà i PF ai token selezionati'],
  ['/condizione Avvelenato', 'mette o toglie una condizione ai token selezionati'],
  ['/iniziativa', 'aggiunge i token selezionati all’iniziativa'],
  ['/gm testo', 'messaggio al solo master'],
  ['testo', 'un messaggio in chat'],
  ['?{Domanda|5}', 'chiede un valore quando la lanci (5 se non lo cambi)'],
  ['@for @des @cos @int @sag @car', 'modificatori di caratteristica della tua scheda'],
  ['@comp @livello @ca @iniz', 'competenza, livello, CA, bonus d’iniziativa'],
];

/** A macro ready to run: asks its questions first, if it has any. */
function useMacroRun() {
  const { state, dispatch, selectedTokenId, group } = useTable();
  const me = useApp((s) => s.user?.id ?? '');
  const toast = useApp((s) => s.toast);
  const [asking, setAsking] = useState<{ macro: Macro; answers: Record<string, string> } | null>(null);

  const go = (macro: Macro, answers: Record<string, string>) => {
    if (!state) return;
    const selectedIds = group.tokens.length ? group.tokens : selectedTokenId ? [selectedTokenId] : [];
    const problem = runMacro(macro.body, answers, { state, me, selectedIds, dispatch });
    if (problem) toast(`${macro.name}: ${problem}`, 'error');
  };
  const run = (macro: Macro) => {
    const qs = macroQuestions(macro.body);
    if (qs.length) setAsking({ macro, answers: Object.fromEntries(qs.map((q) => [q.question, q.fallback])) });
    else go(macro, {});
  };
  const askElement = asking && (
    <Modal
      title={asking.macro.name}
      onClose={() => setAsking(null)}
      actions={
        <>
          <button className="btn ghost" onClick={() => setAsking(null)}>
            Annulla
          </button>
          <button className="btn primary" form="macro-ask" type="submit">
            <Play size={14} /> Lancia
          </button>
        </>
      }
    >
      <form
        id="macro-ask"
        className="col"
        style={{ gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          go(asking.macro, asking.answers);
          setAsking(null);
        }}
      >
        {Object.entries(asking.answers).map(([q, v], i) => (
          <Field key={q} label={q}>
            <input className="input" autoFocus={i === 0} value={v} onChange={(e) => setAsking({ ...asking, answers: { ...asking.answers, [q]: e.target.value } })} />
          </Field>
        ))}
      </form>
    </Modal>
  );
  return { run, askElement };
}

/** The bar of macros over the dice: a click, or keys 1 to 0. */
export function MacroBar() {
  const me = useApp((s) => s.user?.id ?? '');
  const { macros, load } = useMacros();
  const { run, askElement } = useMacroRun();
  const [managing, setManaging] = useState(false);
  useEffect(() => {
    if (me) void load(me);
  }, [me, load]);
  useEffect(() => {
    const onKey = (e: Event) => {
      const m = useMacros.getState().macros[(e as CustomEvent<number>).detail];
      if (m) run(m);
    };
    window.addEventListener('thevtt:macro', onKey);
    return () => window.removeEventListener('thevtt:macro', onKey);
  });
  return (
    <>
      <div className="float macrobar glass" role="toolbar" aria-label="Macro">
        {macros.slice(0, 10).map((m, i) => (
          <button key={m.id} className="macro-btn" onClick={() => run(m)} title={`${m.name} (${(i + 1) % 10})\n${m.body}`}>
            <span className="macro-dot" style={{ background: m.color }} />
            <span className="ellipsis">{m.name}</span>
            <kbd>{(i + 1) % 10}</kbd>
          </button>
        ))}
        <button className={`macro-btn ${macros.length ? 'icon-only' : ''}`} onClick={() => setManaging(true)} title="Crea e modifica le tue macro" aria-label="Gestisci le macro">
          {macros.length ? <Settings2 size={14} /> : (
            <>
              <Zap size={14} /> Macro
            </>
          )}
        </button>
      </div>
      {managing && <MacroManager onClose={() => setManaging(false)} onRun={run} />}
      {askElement}
    </>
  );
}

/** Make, change and try one's macros, seeing what each line will do. */
function MacroManager({ onClose, onRun }: { onClose: () => void; onRun: (m: Macro) => void }) {
  const { macros, save, remove, move, create } = useMacros();
  const { state, selectedTokenId, group } = useTable();
  const me = useApp((s) => s.user?.id ?? '');
  const [editing, setEditing] = useState<Macro | null>(macros[0] ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = !!editing && JSON.stringify(macros.find((m) => m.id === editing.id)) !== JSON.stringify(editing);

  // what each line does, with this sheet's numbers and the questions' default answers
  const preview = useMemo(() => {
    if (!editing || !state) return null;
    const selectedIds = group.tokens.length ? group.tokens : selectedTokenId ? [selectedTokenId] : [];
    const targets = macroTargets(state, me, selectedIds);
    const vars = macroVars(state, me, targets);
    const qs = macroQuestions(editing.body);
    const steps = parseMacro(expandMacro(editing.body, Object.fromEntries(qs.map((q) => [q.question, q.fallback])), vars));
    return { steps, qs, targets, hasSheet: Object.keys(vars).length > 0 };
  }, [editing, state, me, selectedTokenId, group]);

  const pick = (m: Macro) => {
    if (dirty && editing) save(editing);
    setEditing(m);
    setConfirmDelete(false);
  };
  const add = (partial?: Partial<Macro>) => {
    const m = create(partial);
    save(m);
    pick(m);
  };

  return (
    <Modal title="Macro" wide onClose={() => (dirty && editing && save(editing), onClose())}>
      <div className="macro-manager">
        <div className="col macro-list">
          {macros.map((m, i) => (
            <div key={m.id} className={`macro-row ${editing?.id === m.id ? 'on' : ''}`}>
              <button className="grow macro-row-name" onClick={() => pick(m)}>
                <span className="macro-dot" style={{ background: m.color }} />
                <span className="ellipsis">{m.name}</span>
                {i < 10 && <kbd>{(i + 1) % 10}</kbd>}
              </button>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(m.id, -1)} aria-label={`Sposta su ${m.name}`}>
                <ArrowUp size={12} />
              </button>
              <button className="icon-btn" disabled={i === macros.length - 1} onClick={() => move(m.id, 1)} aria-label={`Sposta giù ${m.name}`}>
                <ArrowDown size={12} />
              </button>
            </div>
          ))}
          <button className="btn sm" onClick={() => add()}>
            <Plus size={13} /> Nuova macro
          </button>
          <span className="ed-group" style={{ marginTop: 8 }}>
            Esempi da cui partire
          </span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            {EXAMPLES.map((x) => (
              <button key={x.name} className="chip" onClick={() => add(x)}>
                {x.name}
              </button>
            ))}
          </div>
        </div>

        {editing ? (
          <div className="col macro-edit">
            <div className="row" style={{ gap: 8 }}>
              <Field label="Nome">
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Nome della macro" />
              </Field>
              <div className="row macro-colors" role="radiogroup" aria-label="Colore">
                {MACRO_COLORS.map((c) => (
                  <button key={c} role="radio" aria-checked={editing.color === c} className={`swatch ${editing.color === c ? 'on active' : ''}`} style={{ background: c }} onClick={() => setEditing({ ...editing, color: c })} aria-label={`Colore ${c}`} />
                ))}
              </div>
            </div>
            <textarea
              className="input macro-body"
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder={'/r 1d20+@for+@comp Attacco\n/danno ?{Danni|1d8+@for} Spada'}
              aria-label="Testo della macro"
              spellCheck={false}
              rows={6}
            />
            <div className="macro-preview" aria-label="Anteprima della macro">
              <span className="ed-group">Cosa farà</span>
              {preview && !preview.steps.length && <span className="faint small">Scrivi una riga per comando: guarda l’aiuto qui sotto.</span>}
              {preview?.steps.map((s, i) => (
                <div key={i} className={`macro-step ${s.kind === 'error' ? 'bad' : ''}`}>
                  {s.kind === 'error' ? <CircleAlert size={13} /> : <span className="macro-step-n">{i + 1}</span>}
                  {describeStep(s)}
                </div>
              ))}
              {preview && preview.qs.length > 0 && <span className="faint tiny">Prima di partire chiede: {preview.qs.map((q) => `«${q.question}»`).join(', ')}.</span>}
              {preview && /@[a-z]/i.test(editing.body) && !preview.hasSheet && <span className="faint tiny">I valori @ vengono dalla scheda del tuo personaggio: qui non ne hai uno.</span>}
              {preview && preview.steps.some((s) => s.kind === 'hp' || s.kind === 'condition' || s.kind === 'initiative') && (
                <span className="faint tiny">{preview.targets.length ? `Agisce su: ${preview.targets.map((t) => t.name).join(', ')}.` : 'Agisce sui token che selezioni sulla mappa.'}</span>
              )}
            </div>
            <div className="row between">
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn primary sm"
                  onClick={() => {
                    save(editing);
                    onRun(editing);
                  }}
                >
                  <Play size={13} /> Prova
                </button>
                <button className="btn sm" disabled={!dirty} onClick={() => save(editing)}>
                  {dirty ? 'Salva' : 'Salvata'}
                </button>
              </div>
              {confirmDelete ? (
                <button
                  className="btn sm danger"
                  onClick={() => {
                    remove(editing.id);
                    setEditing(macros.find((m) => m.id !== editing.id) ?? null);
                    setConfirmDelete(false);
                  }}
                >
                  Elimina davvero
                </button>
              ) : (
                <button className="btn sm ghost" onClick={() => setConfirmDelete(true)} aria-label="Elimina la macro">
                  <Trash2 size={13} /> Elimina
                </button>
              )}
            </div>
            <details className="macro-help">
              <summary>Cosa si può scrivere</summary>
              <dl>
                {HELP.map(([k, v]) => (
                  <div key={k}>
                    <dt>
                      <code>{k}</code>
                    </dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        ) : (
          <div className="col macro-edit faint small" style={{ justifyContent: 'center', textAlign: 'center' }}>
            Le macro fanno in un clic ciò che scriveresti in chat: tiri, danni, cure, condizioni, iniziativa. Parti da un esempio a sinistra.
          </div>
        )}
      </div>
    </Modal>
  );
}

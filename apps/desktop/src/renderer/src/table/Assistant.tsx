import { MessageSquareShare, NotebookPen, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { RichView } from '../components/RichText';
import { assistantHtml, isAnswer, rulesContext } from '../lib/assistant';
import { bridge } from '../lib/platform';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { getSystemUi } from '../systems';

type Mode = 'npc' | 'rules';

/** GM: Claude at the table, with the GM's own key: an NPC on the spot, a rules answer from the compendium. */
export function AssistantPanel() {
  const { state, dispatch } = useTable();
  const toast = useApp((s) => s.toast);
  const go = useApp((s) => s.go);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('npc');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ mode: Mode; question: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void bridge?.assistant.status().then((r) => setConfigured(r.configured));
  }, []);
  const entries = useMemo(() => (state ? (getSystemUi(state.systemId)?.compendium?.entries([]) ?? []) : []), [state?.systemId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  if (!bridge) return <div className="panel-body faint small">L’assistente c’è solo nell’app desktop del master.</div>;
  if (configured === false)
    return (
      <div className="panel-body col">
        <p className="small muted">Per usare l’assistente serve una chiave API di Anthropic: la inserisci una volta nelle impostazioni.</p>
        <button className="btn" onClick={() => go({ name: 'settings', section: 'advanced' })}>
          Impostazioni → Avanzate
        </button>
      </div>
    );

  const ask = async () => {
    setBusy(true);
    setError(null);
    const question = input.trim();
    const r = await bridge!.assistant.ask({ task: mode, systemId: state.systemId, input: question, context: mode === 'rules' ? rulesContext(entries, question) : undefined });
    setBusy(false);
    if (isAnswer(r)) setAnswer({ mode, question, text: r.text });
    else setError(r.error);
  };
  const html = answer ? assistantHtml(answer.text) : '';
  return (
    <div className="panel-body col assistant">
      <div className="seg">
        <button className={mode === 'npc' ? 'on' : ''} onClick={() => setMode('npc')}>
          PNG al volo
        </button>
        <button className={mode === 'rules' ? 'on' : ''} onClick={() => setMode('rules')}>
          Domanda sulle regole
        </button>
      </div>
      <textarea
        className="input"
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        aria-label={mode === 'npc' ? 'Idea del PNG' : 'Domanda sulle regole'}
        placeholder={mode === 'npc' ? 'Un oste nervoso che nasconde un contrabbandiere in cantina' : 'Cosa succede quando un personaggio Prono viene attaccato in mischia?'}
        onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && input.trim() && !busy && void ask()}
      />
      <button className="btn primary" disabled={!input.trim() || busy} onClick={() => void ask()}>
        <Sparkles size={14} /> {busy ? 'Ci penso…' : 'Chiedi'}
      </button>
      {mode === 'rules' && <span className="faint tiny">Risponde partendo dalle voci del compendio più vicine alla domanda.</span>}
      {error && <span className="danger-text small">{error}</span>}
      {answer && (
        <div className="col assistant-answer" style={{ gap: 8 }}>
          <RichView className="selectable" value={html} />
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn ghost sm"
              onClick={() => {
                dispatch({ type: 'note.create', note: { title: answer.mode === 'npc' ? `PNG: ${answer.question.slice(0, 60)}` : `Regole: ${answer.question.slice(0, 60)}`, body: html, shared: 'private' } });
                toast('Salvato nelle note, solo per te', 'success');
              }}
            >
              <NotebookPen size={13} /> Salva nelle note
            </button>
            <button
              className="btn ghost sm"
              onClick={() => dispatch({ type: 'card', card: { title: answer.mode === 'npc' ? 'Un PNG' : 'Regole', subtitle: answer.question.slice(0, 80), body: answer.text.replace(/\*\*/g, '') } })}
            >
              <MessageSquareShare size={13} /> Mostra in chat
            </button>
          </div>
          <span className="faint tiny">Scritto dall’IA: controllalo prima di usarlo.</span>
        </div>
      )}
    </div>
  );
}

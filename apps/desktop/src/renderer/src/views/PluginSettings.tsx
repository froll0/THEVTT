import { CircleAlert, FileUp, Puzzle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Modal, Setting, Switch } from '../components/ui';
import { usePlugins, type Plugin } from '../lib/plugins';
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

/**
 * Extensions: the user's own scripts. Off until switched on, after a clear
 * word about what they can do.
 */
export function PluginSettings() {
  const me = useApp((s) => s.user?.id ?? '');
  const toast = useApp((s) => s.toast);
  const { plugins, errors, load, install, toggle, remove } = usePlugins();
  const [paste, setPaste] = useState(false);
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<Plugin | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (me) void load(me);
  }, [me, load]);

  const add = (text: string, name?: string) => {
    try {
      const p = install(text, name);
      toast(`Estensione «${p.name}» aggiunta: attivala quando vuoi`);
      setPaste(false);
      setCode('');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <p className="muted small">
        Piccoli programmi che aggiungono comandi in chat, pulsanti sulla barra delle macro e reazioni a quello che succede al tavolo. Girano isolati dall’app e possono fare solo
        quello che potresti fare tu: vedono il tavolo come lo vedi tu, e le loro azioni passano gli stessi controlli dei tuoi clic.
      </p>
      <div className="row" style={{ gap: 6 }}>
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
            if (f) add(await f.text(), f.name);
          }}
        />
      </div>
      <div className="list">
        {plugins.map((p) => (
          <Setting
            key={p.id}
            title={`${p.name} · ${p.version}`}
            hint={errors[p.id] && p.enabled ? `Errore: ${errors[p.id]}` : p.description || 'Nessuna descrizione'}
          >
            {errors[p.id] && p.enabled && <CircleAlert size={14} className="danger-text" aria-label="Errore" />}
            <Switch on={p.enabled} onChange={(on) => (on ? setConfirm(p) : toggle(p.id, false))} label={`Attiva ${p.name}`} />
            <button className="btn ghost sm icon" onClick={() => remove(p.id)} aria-label={`Rimuovi ${p.name}`}>
              <Trash2 size={14} />
            </button>
          </Setting>
        ))}
        {!plugins.length && (
          <p className="faint small">
            <Puzzle size={13} /> Nessuna estensione. Prova a incollare l’esempio.
          </p>
        )}
      </div>
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
              <button className="btn primary" disabled={!code.trim()} onClick={() => add(code)}>
                Aggiungi
              </button>
            </>
          }
        >
          <textarea className="input mono" rows={16} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Codice dell’estensione" placeholder="// @name La mia estensione" spellCheck={false} />
          <p className="faint tiny">
            L’estensione riceve <code>thevtt</code>: <code>on('state' | 'log' | 'turn', fn)</code>, <code>command(nome, descrizione, fn)</code>, <code>button(etichetta, fn)</code>,{' '}
            <code>chat(testo)</code>, <code>roll(formula, etichetta)</code>, <code>card(scheda)</code>, <code>dispatch(azione)</code>, <code>toast(testo)</code>, <code>state</code>.
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
          <p>Attiva solo estensioni di cui ti fidi. Al tavolo potrà:</p>
          <ul className="small">
            <li>vedere quello che vedi tu (da master: tutto il tavolo, anche i segreti);</li>
            <li>scrivere in chat, tirare dadi e fare le azioni che puoi fare tu;</li>
            <li>collegarsi a internet come una qualsiasi pagina web.</li>
          </ul>
          <p className="small faint">Non vede le tue password, i tuoi file né le impostazioni dell’app. Codice: {Math.ceil(confirm.code.length / 1024)} kB.</p>
        </Modal>
      )}
    </>
  );
}

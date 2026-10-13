import type { SessionDigest } from '@thevtt/shared';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { assistantHtml, isAnswer } from '../lib/assistant';
import { bridge } from '../lib/platform';
import { recapForDiscord, toDiscord } from '../lib/discord';
import { plainText, RichEditor } from '../components/RichText';
import { Field, Modal } from '../components/ui';
import { useApp } from '../store/app';

/** When the GM closes the session: a recap drafted from the table log, to edit and publish in one go. */
export function SessionEnd({ campaignId, systemId, digest, onDone, onCancel }: { campaignId: string; systemId: string; digest: SessionDigest; onDone: () => void; onCancel: () => void }) {
  const { api, run } = useApp();
  const [title, setTitle] = useState(digest.title);
  const [body, setBody] = useState(digest.body);
  // with the GM's assistant: the draft told as a story
  const [canTell, setCanTell] = useState(false);
  const [telling, setTelling] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    void bridge?.assistant.status().then((r) => setCanTell(r.configured));
  }, []);
  const tell = async (systemId: string) => {
    setTelling('Scrivo il racconto…');
    const plain = new DOMParser().parseFromString(body, 'text/html').body.innerText;
    const r = await bridge!.assistant.ask({ task: 'recap', systemId, input: plain });
    if (!isAnswer(r)) return setTelling(r.error);
    setBody(`<h3>Il racconto</h3>${assistantHtml(r.text)}${body}`);
    setVersion((v) => v + 1);
    setTelling(null);
  };
  const publish = () => run(async () => {
    await api.createRecap(campaignId, { title, body });
    void toDiscord(campaignId, 'recaps', recapForDiscord(title, plainText(body)));
    onDone();
  }, 'Riassunto pubblicato');
  return (
    <Modal
      title="Chiudi la sessione"
      onClose={onCancel}
      actions={
        <>
          <button className="btn ghost" onClick={onCancel}>
            Resta al tavolo
          </button>
          <button className="btn ghost" onClick={onDone}>
            Chiudi senza riassunto
          </button>
          <button className="btn primary" disabled={!title.trim()} onClick={() => void publish()}>
            Pubblica e chiudi
          </button>
        </>
      }
    >
      <p className="small muted">Ho preparato una bozza dal registro del tavolo ({digest.entries} righe). Sistemala e pubblicala: la trovate tutti tra i riassunti della campagna.</p>
      <Field label="Titolo">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      {canTell && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" disabled={telling === 'Scrivo il racconto…'} onClick={() => void tell(systemId)} title="L’assistente trasforma la bozza in un racconto da leggere ai giocatori: controllalo prima di pubblicare">
            <Sparkles size={13} /> Scrivi il racconto
          </button>
          {telling && <span className="faint small">{telling}</span>}
        </div>
      )}
      <RichEditor key={version} className="recap-editor" value={body} onChange={setBody} ariaLabel="Riassunto della sessione" placeholder="Cosa è successo" />
    </Modal>
  );
}

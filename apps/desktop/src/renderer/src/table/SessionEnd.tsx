import type { SessionDigest } from '@thevtt/shared';
import { useState } from 'react';
import { RichEditor } from '../components/RichText';
import { Field, Modal } from '../components/ui';
import { useApp } from '../store/app';

/** When the GM closes the session: a recap drafted from the table log, to edit and publish in one go. */
export function SessionEnd({ campaignId, digest, onDone, onCancel }: { campaignId: string; digest: SessionDigest; onDone: () => void; onCancel: () => void }) {
  const { api, run } = useApp();
  const [title, setTitle] = useState(digest.title);
  const [body, setBody] = useState(digest.body);
  const publish = () => run(async () => {
    await api.createRecap(campaignId, { title, body });
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
      <RichEditor className="recap-editor" value={body} onChange={setBody} ariaLabel="Riassunto della sessione" placeholder="Cosa è successo" />
    </Modal>
  );
}

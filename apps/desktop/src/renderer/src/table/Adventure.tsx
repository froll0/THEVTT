import { ADVENTURE_FILE_EXT, describeAdventure, isAdventurePackage, packAdventure, type AdventurePackage } from '@thevtt/shared';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { Field, Modal, Switch } from '../components/ui';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { download } from './sceneImage';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summary(p: AdventurePackage) {
  const d = describeAdventure(p);
  return [
    plural(d.scenes, 'scena', 'scene'),
    plural(d.encounters, 'incontro', 'incontri'),
    plural(d.notes, 'nota', 'note'),
    plural(d.quests, 'missione', 'missioni'),
    d.tracks ? plural(d.tracks, 'brano', 'brani') : '',
    d.creatures ? plural(d.creatures, 'creatura', 'creature') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The adventure as a file: what the GM prepared (scenes, encounters, notes,
 * quests, music, macros) to use in another campaign or give to another GM.
 */
export function AdventureDialog({ onClose }: { onClose: () => void }) {
  const { state, assets, dispatch } = useTable();
  const toast = useApp((s) => s.toast);
  const [name, setName] = useState(state?.campaignName ?? 'Avventura');
  const [description, setDescription] = useState('');
  const [music, setMusic] = useState(true);
  const [incoming, setIncoming] = useState<AdventurePackage | null>(null);
  if (!state) return null;

  const exportIt = () => {
    const pkg = packAdventure(state, assets, { name: name.trim() || 'Avventura', description: description.trim(), music });
    const href = URL.createObjectURL(new Blob([JSON.stringify(pkg)], { type: 'application/json' }));
    download(href, `${pkg.name}.${ADVENTURE_FILE_EXT}`);
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    toast(`«${pkg.name}» salvata: ${summary(pkg)}`, 'success');
  };

  const readIt = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isAdventurePackage(parsed)) throw new Error();
      setIncoming(parsed);
    } catch {
      toast(`${file.name}: non è un’avventura di TheVTT`, 'error');
    }
  };

  const importIt = () => {
    if (!incoming) return;
    dispatch({ type: 'adventure.import', pkg: incoming });
    toast(`«${incoming.name}» aggiunta alla campagna`, 'success');
    onClose();
  };

  return (
    <Modal title="Avventura" onClose={onClose}>
      <div className="col" style={{ gap: 14 }}>
        <section className="col" style={{ gap: 8 }}>
          <b>Salva come avventura</b>
          <p className="faint small">Scene con le loro creature, incontri, note e dispense del master, missioni, musica e macro, in un solo file. Personaggi e note dei giocatori restano fuori.</p>
          <Field label="Nome dell’avventura">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome dell’avventura" />
          </Field>
          <Field label="Descrizione (facoltativa)">
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Descrizione dell’avventura" />
          </Field>
          <label className="row small" style={{ gap: 8 }}>
            <Switch on={music} onChange={setMusic} label="Con musica ed effetti sonori" />
            Con musica ed effetti sonori (il file diventa più grande)
          </label>
          <button className="btn primary" onClick={exportIt}>
            <Download size={15} /> Salva il file
          </button>
        </section>
        <section className="col" style={{ gap: 8 }}>
          <b>Apri un’avventura</b>
          <p className="faint small">Si aggiunge a questa campagna: le scene restano nascoste ai giocatori finché non le apri, le missioni finché non le mostri.</p>
          <label className="btn">
            <Upload size={15} /> Scegli il file (.{ADVENTURE_FILE_EXT})
            <input type="file" hidden accept={`.${ADVENTURE_FILE_EXT},.json,application/json`} aria-label="Apri un’avventura da file" onChange={(e) => void readIt(e.target.files?.[0]).then(() => (e.target.value = ''))} />
          </label>
          {incoming && (
            <div className="adventure-card" role="group" aria-label={incoming.name}>
              <b>{incoming.name}</b>
              {incoming.description && <span className="small">{incoming.description}</span>}
              <span className="faint tiny">{summary(incoming)}</span>
              {incoming.systemId !== state.systemId && <span className="tiny warn">Fatta per un altro gioco: creature e macro potrebbero non funzionare qui.</span>}
              <button className="btn primary sm" onClick={importIt}>
                Aggiungi alla campagna
              </button>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

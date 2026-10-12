import type { Encounter } from '@thevtt/shared';
import { ChevronLeft, Clapperboard, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '../components/ui';
import { useTable } from '../store/table';

/** GM: encounters prepared before the session, launched in one click (scene, creatures, music, note). */
export function EncountersPanel() {
  const { state, dispatch, group, selectedTokenId } = useTable();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [chapter, setChapter] = useState('');
  if (!state) return null;
  const list = Object.values(state.encounters ?? {});
  const open = list.find((e) => e.id === editing);
  if (open) return <EncounterEditor e={open} onBack={() => setEditing(null)} />;
  // the creatures to save: those selected, or every one on the map that isn't a character
  // (a selection can outlive its tokens: a saved encounter takes them off the map)
  const picked = (group.tokens.length ? group.tokens : selectedTokenId ? [selectedTokenId] : []).filter((id) => state.tokens[id]);
  const onMap = Object.values(state.tokens).filter((t) => t.sceneId === state.activeSceneId && !t.characterId);
  const capture = picked.length ? picked.filter((id) => !state.tokens[id]!.characterId) : onMap.map((t) => t.id);
  const chapters = [...new Set(list.map((e) => e.chapter))].sort((a, b) => a.localeCompare(b));
  return (
    <div className="panel-body col encounters">
      <div className="col" style={{ gap: 6 }}>
        <div className="fields two">
          <label className="field">
            <span>Nuovo incontro</span>
            <input className="input" placeholder="Agguato al guado" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Capitolo</span>
            <input className="input" placeholder="Capitolo 1" value={chapter} onChange={(e) => setChapter(e.target.value)} list="encounter-chapters" />
          </label>
        </div>
        <datalist id="encounter-chapters">
          {chapters.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button
          className="btn sm"
          style={{ alignSelf: 'flex-start' }}
          disabled={!name.trim()}
          title="Le creature tornano sulla mappa, nella stessa scena e posizione, quando lanci l’incontro"
          onClick={() => {
            dispatch({ type: 'encounter.save', encounter: { name: name.trim(), chapter: chapter.trim() }, captureTokenIds: capture, removeCaptured: true });
            setName('');
          }}
        >
          <Clapperboard size={13} /> Salva {capture.length ? `con ${capture.length} ${capture.length === 1 ? 'creatura' : 'creature'}` : 'vuoto'}
        </button>
        <span className="faint tiny">
          {picked.length ? 'Salva le creature selezionate' : 'Salva tutte le creature della scena (non i personaggi)'}, togliendole dalla mappa finché non lanci l’incontro.
        </span>
      </div>
      {chapters.map((ch) => (
        <div key={ch || '-'} className="col" style={{ gap: 4 }}>
          <b className="small">{ch || 'Senza capitolo'}</b>
          {list
            .filter((e) => e.chapter === ch)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((e) => (
              <div key={e.id} className="encounter-row">
                <button className="grow ghost-row" onClick={() => setEditing(e.id)} title="Modifica">
                  <span className="ellipsis">{e.name}</span>
                  <span className="faint tiny">
                    {e.tokens.length} creature
                    {e.sceneId && state.scenes[e.sceneId] ? ` · ${state.scenes[e.sceneId]!.name}` : ''}
                    {e.trackId ? ' · musica' : ''}
                    {e.noteId ? ' · dispensa' : ''}
                    {e.launchedAt ? ' · già lanciato' : ''}
                  </span>
                </button>
                <button className="btn sm" onClick={() => dispatch({ type: 'encounter.launch', encounterId: e.id })} title="Lancia: scena, creature, musica e dispensa">
                  <Play size={12} /> Lancia
                </button>
              </div>
            ))}
        </div>
      ))}
      {!list.length && <p className="faint small">Prepara gli incontri prima della sessione: metti le creature sulla mappa, scegli musica e dispensa, salva. Al tavolo basta un clic.</p>}
    </div>
  );
}

function EncounterEditor({ e, onBack }: { e: Encounter; onBack: () => void }) {
  const { state, dispatch, group, selectedTokenId } = useTable();
  if (!state) return null;
  const save = (patch: Partial<Encounter>) => dispatch({ type: 'encounter.save', encounter: { id: e.id, name: e.name, ...patch } });
  const picked = (group.tokens.length ? group.tokens : selectedTokenId ? [selectedTokenId] : []).filter((id) => state.tokens[id] && !state.tokens[id].characterId);
  const notes = Object.values(state.notes ?? {}).filter((n) => n.authorId === state.gmId);
  return (
    <div className="panel-body col encounters">
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        <ChevronLeft size={13} /> Incontri
      </button>
      <label className="field">
        <span>Nome</span>
        <input className="input" defaultValue={e.name} key={`n-${e.name}`} onBlur={(ev) => ev.target.value.trim() && ev.target.value !== e.name && save({ name: ev.target.value.trim() })} />
      </label>
      <label className="field">
        <span>Capitolo</span>
        <input className="input" defaultValue={e.chapter} key={`c-${e.chapter}`} onBlur={(ev) => ev.target.value !== e.chapter && save({ chapter: ev.target.value })} />
      </label>
      <label className="field">
        <span>Scena</span>
        <select className="select" value={e.sceneId ?? ''} onChange={(ev) => save({ sceneId: ev.target.value || null })}>
          <option value="">Quella in gioco</option>
          {Object.values(state.scenes).map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Musica</span>
        <select className="select" value={e.trackId ?? ''} onChange={(ev) => save({ trackId: ev.target.value || null })}>
          <option value="">Nessuna</option>
          {(state.music?.tracks ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Dispensa da condividere</span>
        <select className="select" value={e.noteId ?? ''} onChange={(ev) => save({ noteId: ev.target.value || null })}>
          <option value="">Nessuna</option>
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      </label>
      <label className="row between small">
        <span>Le creature entrano in iniziativa</span>
        <Switch on={e.initiative} onChange={(initiative) => save({ initiative })} label="Iniziativa" />
      </label>
      <label className="field">
        <span>Promemoria per il master</span>
        <textarea className="input" rows={4} defaultValue={e.text} key={`t-${e.id}`} onBlur={(ev) => ev.target.value !== e.text && save({ text: ev.target.value })} placeholder="Cosa vogliono, come reagiscono, cosa trovano i personaggi…" />
      </label>
      <div className="col" style={{ gap: 4 }}>
        <span className="small muted">Creature ({e.tokens.length})</span>
        <span className="small">{e.tokens.map((t) => t.name).join(', ') || '—'}</span>
        <button
          className="btn ghost sm"
          style={{ alignSelf: 'flex-start' }}
          disabled={!picked.length}
          onClick={() => dispatch({ type: 'encounter.save', encounter: { id: e.id, name: e.name }, captureTokenIds: picked, removeCaptured: true })}
          title="Sostituisce le creature con quelle selezionate sulla mappa"
        >
          Sostituisci con la selezione ({picked.length})
        </button>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => dispatch({ type: 'encounter.launch', encounterId: e.id })}>
          <Play size={12} /> Lancia
        </button>
        <button
          className="btn ghost sm danger"
          onClick={() => {
            if (!confirm(`Eliminare «${e.name}»?`)) return;
            dispatch({ type: 'encounter.delete', encounterId: e.id });
            onBack();
          }}
        >
          <Trash2 size={12} /> Elimina
        </button>
      </div>
    </div>
  );
}

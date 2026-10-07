import { MAP_FILE_EXT, newId, packScene } from '@thevtt/shared';
import { BookmarkPlus, Download, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Switch } from '../components/ui';
import { deleteMap, listMaps, loadMap, mapFile, readMapFile, renameMap, saveMap, type LibraryEntry } from '../lib/mapLibrary';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { download } from './sceneImage';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The GM's maps, kept on this computer for every campaign: save the scene
 * being worked on, use a saved map here as a new scene, pass maps to other
 * GMs as files.
 */
export function MapLibrary({ sceneId, onClose, onUsed }: { sceneId: string; onClose: () => void; onUsed?: (sceneId: string) => void }) {
  const { state, assets, dispatch } = useTable();
  const toast = useApp((s) => s.toast);
  const [maps, setMaps] = useState<LibraryEntry[] | null>(null);
  const [q, setQ] = useState('');
  const [withTokens, setWithTokens] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const scene = state?.scenes[sceneId];

  const reload = () => void listMaps().then(setMaps);
  useEffect(reload, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (maps ?? []).filter((m) => !needle || m.name.toLowerCase().includes(needle));
  }, [maps, q]);

  const npcCount = state ? Object.values(state.tokens).filter((t) => t.sceneId === sceneId && !t.characterId && t.ownerIds.length === 0).length : 0;

  const saveCurrent = async () => {
    if (!state || !scene) return;
    setBusy('save');
    try {
      await saveMap(packScene(state, sceneId, assets, { tokens: withTokens }));
      toast(`«${scene.name}» è nella libreria`, 'success');
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Non riesco a salvare la mappa', 'error');
    } finally {
      setBusy(null);
    }
  };

  const use = async (entry: LibraryEntry) => {
    setBusy(entry.id);
    const pkg = await loadMap(entry.id);
    setBusy(null);
    if (!pkg) return toast('Questa mappa non si trova più sul disco', 'error');
    const id = `lib-${newId()}`;
    dispatch({ type: 'scene.import', pkg: { ...pkg, name: entry.name }, id });
    toast(`«${entry.name}» è una nuova scena di questa campagna`, 'success');
    onUsed?.(id);
    onClose();
  };

  const exportEntry = async (entry: LibraryEntry) => {
    const pkg = await loadMap(entry.id);
    if (!pkg) return toast('Questa mappa non si trova più sul disco', 'error');
    const f = mapFile({ ...pkg, name: entry.name });
    download(f.href, f.name);
    setTimeout(() => URL.revokeObjectURL(f.href), 10_000);
  };

  const importFiles = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      try {
        const pkg = await readMapFile(file);
        await saveMap(pkg);
        toast(`«${pkg.name}» aggiunta alla libreria`, 'success');
      } catch (e) {
        toast(`${file.name}: ${e instanceof Error ? e.message : 'file non valido'}`, 'error');
      }
    }
    reload();
  };

  return (
    <Modal title="Libreria di mappe" wide onClose={onClose}>
      <div className="col library">
        {scene && (
          <div className="library-save">
            <div className="col grow" style={{ gap: 4, minWidth: 0 }}>
              <b className="ellipsis">Salva «{scene.name}»</b>
              <span className="faint tiny">Terreno, muri e porte, oggetti, luci, scritte e immagini. Poi la usi in qualsiasi campagna.</span>
              {npcCount > 0 && (
                <label className="row small" style={{ gap: 8 }}>
                  <Switch on={withTokens} onChange={setWithTokens} label="Con mostri e PNG" />
                  Con mostri e PNG ({npcCount})
                </label>
              )}
            </div>
            <button className="btn primary" disabled={busy === 'save'} onClick={() => void saveCurrent()}>
              <BookmarkPlus size={15} /> {busy === 'save' ? 'Salvo…' : 'Salva nella libreria'}
            </button>
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <label className="search-field grow">
            <Search size={14} />
            <input className="input" placeholder="Cerca una mappa" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca una mappa" />
          </label>
          <label className="btn" title={`Aggiungi mappe ricevute da altri master (file .${MAP_FILE_EXT})`}>
            <Upload size={14} /> Importa file
            <input type="file" accept={`.${MAP_FILE_EXT},.json,application/json`} multiple hidden onChange={(e) => void importFiles(e.target.files).then(() => (e.target.value = ''))} aria-label="Importa mappe da file" />
          </label>
        </div>
        {maps && !maps.length && (
          <p className="faint small library-empty">
            La libreria è vuota. Salva qui le mappe che prepari: le ritrovi in tutte le tue campagne, e puoi passarle ad altri master come file.
          </p>
        )}
        {maps && !!maps.length && !shown.length && <p className="faint small">Nessuna mappa con questo nome.</p>}
        <div className="library-grid" role="list" aria-label="Mappe salvate">
          {shown.map((m) => (
            <div key={m.id} className="library-card" role="listitem" aria-label={m.name}>
              <button className="library-thumb" onClick={() => void use(m)} disabled={!!busy} title="Usala in questa campagna">
                <img src={m.thumb} alt="" />
              </button>
              {renaming?.id === m.id ? (
                <input
                  className="input"
                  autoFocus
                  value={renaming.name}
                  aria-label="Nuovo nome"
                  onChange={(e) => setRenaming({ id: m.id, name: e.target.value })}
                  onBlur={() => void renameMap(m.id, renaming.name).then(() => (setRenaming(null), reload()))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <b className="ellipsis">{m.name}</b>
              )}
              <span className="faint tiny">
                {m.info.width} × {m.info.height}
                {m.info.doors ? ` · ${plural(m.info.doors, 'porta', 'porte')}` : ''}
                {m.info.props ? ` · ${plural(m.info.props, 'oggetto', 'oggetti')}` : ''}
                {m.info.tokens ? ` · ${plural(m.info.tokens, 'creatura', 'creature')}` : ''} · {new Date(m.savedAt).toLocaleDateString('it-IT')}
              </span>
              <div className="row library-actions">
                <button className="btn sm primary grow" disabled={!!busy} onClick={() => void use(m)}>
                  {busy === m.id ? 'Apro…' : 'Usa qui'}
                </button>
                <button className="btn sm icon ghost" onClick={() => void exportEntry(m)} title="Salva come file, da dare a un altro master" aria-label={`Esporta ${m.name}`}>
                  <Download size={13} />
                </button>
                <button className="btn sm icon ghost" onClick={() => setRenaming({ id: m.id, name: m.name })} title="Rinomina" aria-label={`Rinomina ${m.name}`}>
                  <Pencil size={13} />
                </button>
                {confirmDelete === m.id ? (
                  <button className="btn sm danger" onClick={() => void deleteMap(m.id).then(() => (setConfirmDelete(null), reload()))}>
                    Elimina
                  </button>
                ) : (
                  <button className="btn sm icon ghost" onClick={() => setConfirmDelete(m.id)} title="Togli dalla libreria" aria-label={`Togli ${m.name} dalla libreria`}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

import { packScene, rotatePiece, type MapPackage } from '@thevtt/shared';
import { ArrowLeft, Download, FileDown, Image as ImageIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TopBar } from '../components/Shell';
import { mapFile, updateMap } from '../lib/mapLibrary';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { Board, DEFAULT_TOOL_OPTIONS, type ToolOptions } from '../table/Board';
import { EditorPanel, EditorRail, type EditorTool } from '../table/MapEditor';
import { DoorInspector, PropInspector } from '../table/Panels';
import { download, renderPackage } from '../table/sceneImage';
import { isTyping } from './WorldEditor';

/**
 * A map for the table, made away from any session: the table's own editor
 * (ground, walls and doors, scenery, lights, labels, ready-made rooms, the
 * generator) on a table of one that lives only here. What's made is kept in
 * the map library, where every campaign can take it.
 */
export function SceneStudio({ entryId, pkg, onClose }: { entryId: string; pkg: MapPackage | null; onClose: () => void }) {
  const toast = useApp((s) => s.toast);
  const table = useTable();
  const [tool, setTool] = useState<EditorTool>('terrain');
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const [options, setOptions] = useState<ToolOptions>(DEFAULT_TOOL_OPTIONS);
  const cameraRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const [saved, setSaved] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const loaded = useRef(false);

  // a table of one, for as long as the studio is open
  useEffect(() => {
    useTable.getState().workshop(pkg, pkg?.name ?? 'Nuova mappa');
    return () => useTable.getState().leave();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const state = table.state;
  const sceneId = table.editorSceneId;
  const scene = sceneId ? state?.scenes[sceneId] : undefined;

  /** the scene being edited, as a map for the library */
  const pack = (): MapPackage | null => {
    const t = useTable.getState();
    if (!t.state || !t.editorSceneId || !t.state.scenes[t.editorSceneId]) return null;
    return packScene(t.state, t.editorSceneId, t.assets, { tokens: true });
  };

  const save = async () => {
    const p = pack();
    if (!p) return;
    setSaved('saving');
    try {
      await updateMap(entryId, p);
      setSaved((s) => (s === 'saving' ? 'saved' : s));
    } catch {
      setSaved('dirty');
      toast('Salvataggio della mappa non riuscito', 'error');
    }
  };

  // every change is kept in the library, a moment after the last one
  useEffect(() => {
    if (!state) return;
    if (!loaded.current) {
      loaded.current = true;
      // a new map goes in the library from the start
      if (!pkg) void save();
      return;
    }
    setSaved('dirty');
    const t = setTimeout(() => void save(), 1500);
    return () => clearTimeout(t);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const undoRedo = (which: 'undo' | 'redo') => {
    const t = useTable.getState();
    const label = t.state?.history?.[which][0];
    if (!label) return;
    t.dispatch({ type: which === 'undo' ? 'game.undo' : 'game.redo' });
    toast(`${which === 'undo' ? 'Annullato' : 'Ripetuto'}: ${label}`);
  };

  // the editor's keys, as at the table
  useEffect(() => {
    const keys: Record<string, EditorTool> = { v: 'select', b: 'terrain', w: 'walls', o: 'props', l: 'light', t: 'labels', c: 'copy' };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        undoRedo(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo');
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (keys[e.key]) setTool(keys[e.key]!);
      if (e.key === '[' || e.key === ']') setOptions((o) => ({ ...o, brushSize: Math.min(9, Math.max(1, o.brushSize + (e.key === ']' ? 1 : -1))) }));
      if (e.key === 'g') setOptions((o) => ({ ...o, snap: !o.snap }));
      if (e.key === 'r') {
        const t = useTable.getState();
        if (toolRef.current === 'copy' && t.clipboard) t.setClipboard(rotatePiece(t.clipboard));
        else setOptions((o) => ({ ...o, propRotation: (o.propRotation + 90) % 360 }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportImage = async () => {
    const p = pack();
    if (!p) return;
    const c = await renderPackage(p, 4096);
    c.toBlob((b) => b && download(URL.createObjectURL(b), `${p.name}.png`), 'image/png');
  };

  const exportFile = () => {
    const p = pack();
    if (!p) return;
    const f = mapFile(p);
    download(f.href, f.name);
  };

  const boardOptions: ToolOptions = { ...options, drawText: tool === 'labels' && !options.erase, drawColor: options.drawColor || '#ffffff' };
  const status = saved === 'saved' ? 'Salvata nella libreria' : saved === 'saving' ? 'Salvataggio…' : 'Modifiche non salvate';

  return (
    <div className="shell table-shell studio">
      <TopBar>
        <div className="studio-top row">
          <button
            className="btn ghost sm"
            onClick={async () => {
              if (saved !== 'saved') await save();
              onClose();
            }}
          >
            <ArrowLeft size={14} /> Mappe
          </button>
          {scene && (
            <input
              className="input studio-name"
              value={scene.name}
              onChange={(e) => table.dispatch({ type: 'scene.update', sceneId: scene.id, patch: { name: e.target.value.slice(0, 80) } })}
              aria-label="Nome della mappa"
            />
          )}
          <span className="faint tiny">{status}</span>
          <div className="grow" />
          <button className="btn sm" onClick={() => void exportImage()} title="La mappa come immagine PNG">
            <ImageIcon size={14} /> Immagine
          </button>
          <button className="btn sm" onClick={exportFile} title="La mappa come file, per un altro master">
            <FileDown size={14} /> File
          </button>
          <span className="faint tiny studio-tip">
            <Download size={12} /> Al tavolo: Scena › Libreria
          </span>
        </div>
      </TopBar>
      <div className="table-body dock-right">
        <div className="stage">
          {state && scene ? (
            <ErrorBoundary area="La mappa">
              <Board tool={tool === 'labels' ? 'draw' : tool} options={boardOptions} cameraRef={cameraRef} onPickTerrain={(code) => setOptions((o) => ({ ...o, terrain: code, terrainMode: 'brush' }))} onCopied={() => setOptions((o) => ({ ...o, pieceMode: 'paste' }))} />
              <EditorRail tool={tool} setTool={setTool} options={options} setOptions={setOptions} undoRedo={undoRedo} />
              {table.selectedPropId && state.props?.[table.selectedPropId] && <PropInspector prop={state.props[table.selectedPropId]!} />}
              {table.selectedWallId && state.walls?.[table.selectedWallId] && <DoorInspector wall={state.walls[table.selectedWallId]!} />}
            </ErrorBoundary>
          ) : (
            <div className="stage-message">
              <div className="spinner" />
            </div>
          )}
        </div>
        <aside className="dock editor-dock" aria-label="Editor mappa">
          <div className="dock-panel">
            {state && scene && (
              <ErrorBoundary area="L’editor">
                <EditorPanel tool={tool} options={options} setOptions={setOptions} />
              </ErrorBoundary>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

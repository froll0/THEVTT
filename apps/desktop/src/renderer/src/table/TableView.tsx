import { rotatePiece } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { ListChecks, PencilRuler, ArrowLeft, Keyboard, EyeOff, Trash2, X, BookText, Magnet, Redo2, Undo2, Pause, Play, Type, ArrowLeftRight, Eraser, Eye, Library, Music, Pencil, BookOpen, Circle, CloudFog, Crosshair, Dices, Map as MapIcon, Minus, MousePointer2, NotebookPen, Radio, Ruler, ScrollText, Server, Shapes, Square, Swords, Triangle, UserRoundPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../components/Shell';
import { Compendium, CompendiumEntryView } from '../components/Compendium';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Avatar, Modal } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { Board, CELL, groupDeleteActions, type Tool, type ToolOptions } from './Board';
import { DiceLayer } from './DiceLayer';
import { MusicChip, MusicPanel, MusicPlayer } from './Music';
import { PROP_KINDS } from './props';
import { CallControls, CallTiles, type CallPerson } from './Call';
import { GroupSaveForm } from './Saves';
import { QuestsPanel, RestPrompt, WorldClock } from './World';
import { MacroBar } from './Macros';
import { useCall } from '../store/call';
import { EditorBanner, EditorPanel, EditorRail, type EditorTool } from './MapEditor';
import { BestiaryPanel, ChatPanel, DiceBar, DoorInspector, InitiativePanel, NotesPanel, PropInspector, ScenePanel, SheetPanel, SheetWindow, TokenInspector } from './Panels';
import { FloatingWindow, MinimizedWindow } from '../components/FloatingWindow';
import { useWindows } from '../store/windows';
import { Journal } from '../components/Journal';

const DRAW_COLORS = ['', '#ffffff', '#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#b388ff'];

type DockTab = 'chat' | 'initiative' | 'sheet' | 'bestiary' | 'scene' | 'notes' | 'quests' | 'music' | 'rules';

export function TableView({ campaignId }: { campaignId: string }) {
  const { campaigns, user, go, status } = useApp();
  const campaign = campaigns.find((c) => c.id === campaignId);
  const table = useTable();
  const dockPosition = useSettings((s) => s.dockPosition);
  const [tool, setTool] = useState<Tool>('select');
  const [options, setOptions] = useState<ToolOptions>({
    fogReveal: true,
    shape: 'circle',
    drawColor: '',
    drawWidth: 0.08,
    erase: false,
    drawText: false,
    doorState: 'closed',
    wallKind: 'wall',
    wallMode: 'line',
    wallErase: false,
    propKind: 'crate',
    lightPreview: false,
    snap: true,
    terrain: 's',
    terrainMode: 'brush',
    brushSize: 2,
    propRotation: 0,
    lightKind: 'torch',
    showTokens: true,
    pieceMode: 'copy',
  });
  const [editorTool, setEditorTool] = useState<EditorTool>('terrain');
  const editorToolRef = useRef(editorTool);
  editorToolRef.current = editorTool;
  const [tab, setTab] = useState<DockTab>('chat');
  const [dockOpen, setDockOpen] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const cameraRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const { windows, open: openWindow, closeAll } = useWindows();
  const undoRedo = (which: 'undo' | 'redo') => {
    const t = useTable.getState();
    const label = t.state?.history?.[which][0];
    if (!label) return;
    t.dispatch({ type: which === 'undo' ? 'game.undo' : 'game.redo' });
    useApp.getState().toast(`${which === 'undo' ? 'Annullato' : 'Ripetuto'}: ${label}`);
  };
  // windows belong to this table
  useEffect(() => closeAll, [campaignId, closeAll]);
  const isGm = campaign?.gmId === user?.id;

  // personal notes once written at the table move to the journal, which only their author reads
  const notesMap = table.state?.notes;
  const migrating = useRef(new Set<string>());
  useEffect(() => {
    if (isGm || !user || !notesMap) return;
    const mine = Object.values(notesMap).filter((n) => n.authorId === user.id && n.shared === 'private' && !migrating.current.has(n.id));
    if (!mine.length) return;
    for (const n of mine) migrating.current.add(n.id);
    void (async () => {
      const { api, toast } = useApp.getState();
      let moved = 0;
      for (const n of mine) {
        try {
          await api.createJournal({ title: n.title || 'Appunti', body: n.body, campaignId });
          // a note with a picture stays too: the journal holds only the text
          if (!n.image) useTable.getState().dispatch({ type: 'note.delete', noteId: n.id });
          moved++;
        } catch {
          migrating.current.delete(n.id);
        }
      }
      if (moved) toast(`${moved === 1 ? 'Il tuo appunto personale è stato spostato' : `${moved} appunti personali sono stati spostati`} nel Diario`, 'success');
    })();
  }, [notesMap, isGm, user, campaignId]);

  useEffect(() => {
    if (!campaign) return;
    if (isGm) void useTable.getState().host(campaign);
    else useTable.getState().join(campaign);
    return () => useTable.getState().leave();
  }, [campaign?.id, isGm]); // eslint-disable-line react-hooks/exhaustive-deps

  // voice and video: follow this table's call while seated
  const rtReady = useApp((s) => !!s.rt);
  useEffect(() => (rtReady ? useCall.getState().attach(campaignId) : undefined), [campaignId, rtReady]);
  const speaking = useCall((s) => s.speaking);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      // microphone on and off, like in most call apps
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        void useCall.getState().toggleMic();
        return;
      }
      // the GM takes back changes to the map
      if ((e.ctrlKey || e.metaKey) && useTable.getState().role === 'gm') {
        const k = e.key.toLowerCase();
        if (k === 'z' || k === 'y') {
          e.preventDefault();
          undoRedo(k === 'y' || e.shiftKey ? 'redo' : 'undo');
        }
        return;
      }
      const t = useTable.getState();
      const gm = t.role === 'gm';
      // map tools live in the editor: their keys open it
      const editorKeys: Record<string, EditorTool> = { v: 'select', b: 'terrain', w: 'walls', o: 'props', l: 'light', t: 'labels', c: 'copy' };
      if (gm && t.editorSceneId) {
        if (editorKeys[e.key]) setEditorTool(editorKeys[e.key]!);
        if (e.key === 'e') t.setEditor(null);
        if (e.key === '[' || e.key === ']') setOptions((o) => ({ ...o, brushSize: Math.min(9, Math.max(1, o.brushSize + (e.key === ']' ? 1 : -1))) }));
        if (e.key === 'r') {
          // the copy tool turns the piece; elsewhere, the next prop
          const clip = t.clipboard;
          if (editorToolRef.current === 'copy' && clip) t.setClipboard(rotatePiece(clip));
          else setOptions((o) => ({ ...o, propRotation: (o.propRotation + 90) % 360 }));
        }
        if (e.key === 'g') setOptions((o) => ({ ...o, snap: !o.snap }));
        if (e.key === '?') setShowKeys((v) => !v);
        return;
      }
      if (gm && t.state && (e.key === 'e' || (e.key !== 'v' && e.key !== 't' && editorKeys[e.key]))) {
        if (e.key !== 'e') setEditorTool(editorKeys[e.key]!);
        t.setEditor(t.state.activeSceneId);
        return;
      }
      // the macros on the bar: 1 to 9, then 0
      if (/^[0-9]$/.test(e.key) && !e.altKey) {
        window.dispatchEvent(new CustomEvent('thevtt:macro', { detail: (Number(e.key) + 9) % 10 }));
        return;
      }
      if (e.key === 'v') setTool('select');
      if (e.key === 'm') setTool('measure');
      if (e.key === 'p') setTool('ping');
      if (e.key === 'a') setTool('template');
      if (e.key === 'd') setTool('draw');
      if (e.key === 'g') setOptions((o) => ({ ...o, snap: !o.snap }));
      if (e.key === '?') setShowKeys((v) => !v);
      if (e.key === 't') {
        setTool('draw');
        setOptions((o) => ({ ...o, drawText: true, erase: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the scene being edited went away: back to the one in play
  useEffect(() => {
    if (table.editorSceneId && table.state && !table.state.scenes[table.editorSceneId]) table.setEditor(table.state.activeSceneId);
  }, [table.editorSceneId, table.state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!campaign || !user) return null;
  const { state, phase } = table;
  const scene = state?.scenes[state.activeSceneId];
  const editing = isGm && !!table.editorSceneId && !!state;
  const people: Record<string, CallPerson> = Object.fromEntries(campaign.members.map((m) => [m.user.id, { name: m.user.displayName, color: m.user.avatarColor, avatar: m.user.avatar }]));
  const openEditor = (t?: EditorTool) => {
    if (!state) return;
    if (t) setEditorTool(t);
    table.setEditor(state.activeSceneId);
  };
  const closeEditor = () => {
    table.setEditor(null);
    setTool('select');
  };
  const boardTool: Tool = editing ? (editorTool === 'labels' ? 'draw' : editorTool) : tool;
  const boardOptions: ToolOptions = editing ? { ...options, drawText: editorTool === 'labels' && !options.erase, drawColor: options.drawColor || '#ffffff' } : { ...options, showTokens: true };
  const selected = table.selectedTokenId ? state?.tokens[table.selectedTokenId] : undefined;
  const players = Object.values(state?.players ?? {});

  /** center of the current view, in cells */
  const viewCenter = () => {
    const cam = cameraRef.current;
    const board = document.querySelector('.board');
    if (!cam || !board || !scene) return { x: 0, y: 0 };
    const r = board.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(scene.widthCells - 1, Math.floor((cam.x + r.width / 2 / cam.zoom) / CELL))),
      y: Math.max(0, Math.min(scene.heightCells - 1, Math.floor((cam.y + r.height / 2 / cam.zoom) / CELL))),
    };
  };

  const tabs: { id: DockTab; label: string; icon: typeof Dices; gm?: boolean }[] = [
    { id: 'chat', label: 'Chat e tiri', icon: ScrollText },
    { id: 'initiative', label: 'Iniziativa', icon: Swords },
    { id: 'sheet', label: 'Scheda', icon: Users },
    { id: 'bestiary', label: 'Bestiario', icon: BookOpen, gm: true },
    { id: 'scene', label: 'Scene', icon: MapIcon, gm: true },
    { id: 'notes', label: 'Note e dispense', icon: NotebookPen },
    { id: 'quests', label: 'Missioni', icon: ListChecks },
    { id: 'music', label: 'Musica', icon: Music, gm: true },
    { id: 'rules', label: 'Compendio', icon: Library },
  ];

  return (
    <div className="shell table-shell">
      <TopBar>
        <div className="row no-drag table-title">
          <button className="btn ghost sm icon" onClick={() => go({ name: 'campaign', id: campaign.id })} title={isGm ? 'Chiudi la sessione' : 'Lascia il tavolo'}>
            <ArrowLeft size={15} />
          </button>
          <span className="ellipsis">{campaign.name}</span>
          {scene && <span className="faint ellipsis">/ {scene.name}</span>}
        </div>
        {state && (
          <div className="row no-drag" style={{ gap: 'var(--s3)', marginLeft: 'var(--s3)' }}>
            <ConnectionBadge isGm={isGm} onlinePlayers={players.filter((p) => p.online).map((p) => p.id)} />
            <CallControls people={people} />
            <WorldClock />
            <MusicChip />
            {isGm && (
              <button
                className={`btn sm ${editing ? 'primary' : 'ghost icon'}`}
                onClick={() => (editing ? closeEditor() : openEditor())}
                title={editing ? 'Torna al gioco (E)' : 'Editor mappa: dipingi, costruisci, arreda (E)'}
                aria-label={editing ? 'Chiudi editor' : 'Editor mappa'}
              >
                <PencilRuler size={14} /> {editing && 'Chiudi editor'}
              </button>
            )}
            {isGm && (
              <button
                className={`btn sm ${state.paused ? 'primary' : 'ghost icon'}`}
                onClick={() => table.dispatch({ type: 'game.pause', paused: !state.paused })}
                title={state.paused ? 'Riprendi il gioco' : 'Pausa gioco: i giocatori possono solo scrivere e tirare dadi'}
                aria-label={state.paused ? 'Riprendi il gioco' : 'Pausa gioco'}
              >
                {state.paused ? <Play size={14} /> : <Pause size={14} />} {state.paused && 'Riprendi il gioco'}
              </button>
            )}
            <button className="btn ghost sm icon" onClick={() => setShowKeys(true)} title="Scorciatoie da tastiera (?)" aria-label="Scorciatoie da tastiera">
              <Keyboard size={15} />
            </button>
            <button className="btn ghost sm icon" onClick={() => openWindow('journal', campaign.id, 'Diario')} title="Diario: i tuoi appunti personali, che leggi solo tu" aria-label="Diario">
              <BookText size={14} />
            </button>
            <div className="avatars">
              <span className={speaking[campaign.members.find((m) => m.role === 'gm')?.user.id ?? ''] ? 'speaking' : ''}>
                <Avatar user={{ ...(campaign.members.find((m) => m.role === 'gm')?.user ?? user), online: true }} size={20} presence />
              </span>
              {players.map((p) => (
                <span
                  key={p.id}
                  className={`avatar-route ${speaking[p.id] ? 'speaking' : ''}`}
                  data-route={p.online ? (table.routes[p.id] ?? 'relay') : undefined}
                  title={`${p.displayName}${p.online ? (table.routes[p.id] === 'p2p' ? ' · connessione diretta' : ' · via server') : ' · offline'}`}
                >
                  <Avatar user={{ displayName: p.displayName, avatarColor: p.color, online: p.online, avatar: campaign.members.find((m) => m.user.id === p.id)?.user.avatar }} size={20} presence />
                </span>
              ))}
            </div>
          </div>
        )}
      </TopBar>
      {state && <MusicPlayer />}
      <div className={`table-body dock-${dockPosition}`}>
        <div className="stage">
          {state && scene && phase === 'waiting' && !isGm && (
            <div className="stage-paused">
              <Radio size={26} />
              <h2>{status === 'online' ? 'Il master si è allontanato' : 'Connessione al master persa'}</h2>
              <p className="muted">Il tavolo riprende da solo appena {campaign.members.find((m) => m.role === 'gm')?.user.displayName ?? 'il master'} {status === 'online' ? 'riapre la sessione' : 'torna raggiungibile'}.</p>
            </div>
          )}
          {state?.paused && phase !== 'waiting' && !isGm && (
            <div className="stage-paused game-paused">
              <Pause size={26} />
              <h2>Gioco in pausa</h2>
              <p className="muted">Il master ha fermato il gioco. Puoi scrivere in chat, tirare i dadi e consultare la scheda.</p>
            </div>
          )}
          {state?.paused && isGm && <div className="float paused-pill glass">In pausa: i giocatori non possono muovere né disegnare</div>}
          {state && scene ? (
            <>
              <CallTiles people={people} />
              <Board tool={boardTool} options={boardOptions} cameraRef={cameraRef} onPickTerrain={(code) => setOptions((o) => ({ ...o, terrain: code, terrainMode: 'brush' }))}
                onCopied={() => setOptions((o) => ({ ...o, pieceMode: 'paste' }))}
              />
              <DiceLayer />
            </>
          ) : (
            <div className="stage-message">
              {phase === 'waiting' ? (
                <>
                  <Radio size={28} />
                  <h2>In attesa del master</h2>
                  <p className="muted">Il tavolo si aprirà appena {campaign.members.find((m) => m.role === 'gm')?.user.displayName ?? 'il master'} avvierà la sessione.</p>
                </>
              ) : (
                <>
                  <div className="spinner" />
                  <p className="muted">{isGm ? 'Preparo il tavolo…' : 'Mi siedo al tavolo…'}</p>
                </>
              )}
            </div>
          )}

          {editing && <EditorRail tool={editorTool} setTool={setEditorTool} options={options} setOptions={setOptions} undoRedo={undoRedo} />}
          {editing && <EditorBanner onExit={closeEditor} />}
          {state && !editing && (
            <div className="float rail glass">
              {(
                [
                  { id: 'select', icon: MousePointer2, label: 'Seleziona e sposta (V)' },
                  { id: 'measure', icon: Ruler, label: 'Righello (M)' },
                  { id: 'ping', icon: Crosshair, label: 'Ping (P · o Alt+clic)' },
                  { id: 'template', icon: Shapes, label: 'Aree d’effetto (A)' },
                  { id: 'draw', icon: Pencil, label: 'Disegna (D)' },
                  ...(isGm
                    ? ([
                        { id: 'fog', icon: CloudFog, label: 'Nebbia di guerra' },
                      ] as const)
                    : []),
                ] as const
              ).map((t) => (
                <button key={t.id} className={`tool ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)} title={t.label}>
                  <t.icon size={16} />
                </button>
              ))}
              {isGm && (
                <>
                  <button className="tool" onClick={() => openEditor()} title="Editor mappa: terreno, muri, porte, oggetti, luci (E)" aria-label="Editor mappa">
                    <PencilRuler size={16} />
                  </button>
                  <span className="sep" />
                  <button
                    className="tool"
                    title="Aggiungi token"
                    onClick={() => {
                      table.selectNextToken();
                      table.dispatch({ type: 'token.create', token: { name: 'PNG', ...viewCenter(), color: '#9a9ba3', hp: { current: 10, max: 10 }, ac: 12 } });
                    }}
                  >
                    <UserRoundPlus size={16} />
                  </button>
                  <span className="sep" />
                  <button className="tool" disabled={!state.history?.undo.length} onClick={() => undoRedo('undo')} title={state.history?.undo.length ? `Annulla: ${state.history.undo[0]} (Ctrl+Z)` : 'Niente da annullare'} aria-label="Annulla">
                    <Undo2 size={16} />
                  </button>
                  <button className="tool" disabled={!state.history?.redo.length} onClick={() => undoRedo('redo')} title={state.history?.redo.length ? `Ripeti: ${state.history.redo[0]} (Ctrl+Y)` : 'Niente da ripetere'} aria-label="Ripeti">
                    <Redo2 size={16} />
                  </button>
                </>
              )}
              <span className="sep" />
              <button
                className={`tool ${options.snap ? 'active' : ''}`}
                aria-pressed={options.snap}
                title={options.snap ? 'Aggancia alla griglia: attivo (G) · tieni Alt per spostare libero' : 'Movimento libero (G) · tieni Alt per agganciare alla griglia'}
                onClick={() => setOptions((o) => ({ ...o, snap: !o.snap }))}
              >
                <Magnet size={16} />
              </button>
            </div>
          )}

          {state && scene && !editing && tool === 'template' && (
            <div className="float tool-options glass">
              {(
                [
                  ['circle', Circle, 'Sfera'],
                  ['cone', Triangle, 'Cono'],
                  ['line', Minus, 'Linea'],
                  ['square', Square, 'Cubo'],
                ] as const
              ).map(([shape, Icon, label]) => (
                <button key={shape} className={`tool wide ${options.shape === shape ? 'active' : ''}`} onClick={() => setOptions({ ...options, shape })}>
                  <Icon size={14} /> {label}
                </button>
              ))}
              {isGm && Object.values(state.templates ?? {}).some((t) => t.sceneId === scene.id) && (
                <>
                  <span className="vsep" />
                  <button className="tool wide" onClick={() => table.dispatch({ type: 'template.clear' })}>
                    Cancella tutte
                  </button>
                </>
              )}
              <span className="faint tiny" style={{ padding: '0 6px' }}>trascina dall’origine</span>
            </div>
          )}
          {state && scene && !editing && tool === 'draw' && (
            <div className="float tool-options glass">
              <button className={`tool ${!options.erase && !options.drawText ? 'active' : ''}`} title="Penna" onClick={() => setOptions({ ...options, drawText: false, erase: false })}>
                <Pencil size={15} />
              </button>
              <button className={`tool ${!options.erase && options.drawText ? 'active' : ''}`} title="Testo (T): clic sulla mappa e scrivi" onClick={() => setOptions({ ...options, drawText: true, erase: false })}>
                <Type size={15} />
              </button>
              <span className="vsep" />
              {DRAW_COLORS.map((c) => (
                <button
                  key={c || 'mine'}
                  className={`swatch ${!options.erase && options.drawColor === c ? 'active' : ''}`}
                  style={{ background: c || (isGm ? '#ffffff' : state.players[user.id]?.color) }}
                  title={c ? c : 'Il tuo colore'}
                  onClick={() => setOptions({ ...options, drawColor: c, erase: false })}
                />
              ))}
              <span className="vsep" />
              {([0.05, 0.08, 0.16] as const).map((w, i) => (
                <button key={w} className={`tool ${!options.erase && options.drawWidth === w ? 'active' : ''}`} title={options.drawText ? ['Testo piccolo', 'Testo medio', 'Testo grande'][i] : ['Sottile', 'Medio', 'Spesso'][i]} onClick={() => setOptions({ ...options, drawWidth: w, erase: false })}>
                  <span className="stroke-dot" style={{ width: 4 + i * 4, height: 4 + i * 4 }} />
                </button>
              ))}
              <span className="vsep" />
              <button className={`tool ${options.erase ? 'active' : ''}`} title="Gomma: trascina sui tratti" onClick={() => setOptions({ ...options, erase: !options.erase })}>
                <Eraser size={15} />
              </button>
              {Object.values(state.drawings ?? {}).some((d) => d.sceneId === scene.id && (isGm || d.authorId === user.id)) && (
                <button className="tool wide" onClick={() => table.dispatch({ type: 'drawing.clear' })}>
                  {isGm ? 'Cancella tutto' : 'Cancella i miei'}
                </button>
              )}
            </div>
          )}
          {state && scene && !editing && tool === 'fog' && isGm && (
            <div className="float tool-options glass">
              <button className={`tool wide ${options.fogReveal ? 'active' : ''}`} onClick={() => setOptions({ ...options, fogReveal: true })}>
                Rivela
              </button>
              <button className={`tool wide ${!options.fogReveal ? 'active' : ''}`} onClick={() => setOptions({ ...options, fogReveal: false })}>
                Copri
              </button>
              <span className="vsep" />
              <button className="tool wide" onClick={() => { if (!scene.fog?.enabled) table.dispatch({ type: 'fog.enable', sceneId: scene.id, enabled: true }); table.dispatch({ type: 'fog.fill', sceneId: scene.id, reveal: true }); }}>
                Rivela tutto
              </button>
              <button className="tool wide" onClick={() => { if (!scene.fog?.enabled) table.dispatch({ type: 'fog.enable', sceneId: scene.id, enabled: true }); table.dispatch({ type: 'fog.fill', sceneId: scene.id, reveal: false }); }}>
                Copri tutto
              </button>
              {scene.fog?.enabled && (
                <button className="tool wide" onClick={() => table.dispatch({ type: 'fog.enable', sceneId: scene.id, enabled: false })}>
                  Disattiva
                </button>
              )}
            </div>
          )}

          {showKeys && <ShortcutsHelp isGm={isGm} onClose={() => setShowKeys(false)} />}
          {state && table.group.tokens.length + table.group.props.length > 1 && <GroupBar isGm={isGm} />}
          {selected && !editing && <TokenInspector token={selected} />}
          {isGm && table.selectedPropId && state?.props?.[table.selectedPropId] && <PropInspector prop={state.props[table.selectedPropId]!} />}
          {isGm && table.selectedWallId && state?.walls?.[table.selectedWallId] && <DoorInspector wall={state.walls[table.selectedWallId]!} />}
          {state && scene?.vision && !isGm && !Object.values(state.tokens).some((t) => t.sceneId === scene.id && t.ownerIds.includes(user.id)) && (
            <div className="float board-hint glass">Visione dinamica: vedi solo quello che vedono i tuoi token. Metti il tuo personaggio sulla mappa.</div>
          )}
          {isGm && scene?.vision && (
            <button className={`float light-preview glass ${options.lightPreview ? 'on' : ''}`} onClick={() => setOptions({ ...options, lightPreview: !options.lightPreview })} title="Mostra luci e ombre come le vedono i giocatori">
              <Eye size={14} /> {options.lightPreview ? 'Vista giocatori' : 'Vista master'}
            </button>
          )}
          {state && !editing && <DiceBar />}
          {state && !editing && <MacroBar />}
          {state && <RestPrompt />}
        </div>

        {editing && (
          <aside className="dock editor-dock" aria-label="Editor mappa">
            <div className="dock-panel">
              <ErrorBoundary area="L’editor">
                <EditorPanel tool={editorTool} options={options} setOptions={setOptions} />
              </ErrorBoundary>
            </div>
          </aside>
        )}
        <aside className={`dock ${dockOpen ? '' : 'closed'}`} style={editing ? { display: 'none' } : undefined}>
          <div className="dock-tabs">
            {tabs
              .filter((t) => !t.gm || isGm)
              .map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id && dockOpen ? 'active' : ''}
                  title={t.label}
                  onClick={() => {
                    if (tab === t.id) setDockOpen(!dockOpen);
                    else {
                      setTab(t.id);
                      setDockOpen(true);
                    }
                  }}
                >
                  <t.icon size={16} />
                </button>
              ))}
          </div>
          {dockOpen && state && (
            <div className="dock-panel">
              <div className="dock-title">{tabs.find((t) => t.id === tab)?.label}</div>
              <ErrorBoundary area="Il pannello" key={tab}>
                {tab === 'chat' && <ChatPanel />}
                {tab === 'initiative' && <InitiativePanel />}
                {tab === 'sheet' && <SheetPanel />}
                {tab === 'bestiary' && isGm && <BestiaryPanel placeAt={viewCenter} />}
                {tab === 'scene' && isGm && <ScenePanel />}
                {tab === 'notes' && <NotesPanel />}
                {tab === 'quests' && <QuestsPanel />}
                {tab === 'music' && isGm && <MusicPanel />}
                {tab === 'rules' && (
                  <div className="panel-body">
                    <Compendium
                      systemId={state.systemId}
                      compact
                      onRoll={(formula, label) => table.dispatch({ type: 'roll', formula, label, private: isGm })}
                      onShare={(card) => table.dispatch({ type: 'card', card })}
                      onPopOut={(e) => openWindow('compendium', e.id, e.title)}
                    />
                  </div>
                )}
              </ErrorBoundary>
            </div>
          )}
        </aside>
        {state && (
          <div className="windows-layer">
            {windows.some((w) => w.minimized) && (
              <div className="windows-tray">
                {windows
                  .filter((w) => w.minimized)
                  .map((w) => (
                    <MinimizedWindow key={w.id} win={w} />
                  ))}
              </div>
            )}
            {windows.filter((w) => !w.minimized).map((w) => (
              <FloatingWindow key={w.id} win={w}>
                <ErrorBoundary area="La finestra">
                  {w.kind === 'sheet' ? (
                    <SheetWindow characterId={w.ref} width={w.w} placeAt={viewCenter} />
                  ) : w.kind === 'journal' ? (
                    <Journal campaignId={w.ref} narrow={w.w < 600} />
                  ) : (
                    <CompendiumEntryView
                      systemId={state.systemId}
                      entryId={w.ref}
                      onRoll={(formula, label) => table.dispatch({ type: 'roll', formula, label, private: isGm })}
                      onShare={(card) => table.dispatch({ type: 'card', card })}
                    />
                  )}
                </ErrorBoundary>
              </FloatingWindow>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionBadge({ isGm, onlinePlayers }: { isGm: boolean; onlinePlayers: string[] }) {
  const routes = useTable((s) => s.routes);
  if (isGm) {
    if (!onlinePlayers.length) return null;
    const direct = onlinePlayers.filter((id) => routes[id] === 'p2p').length;
    return (
      <span className={`badge ${direct === onlinePlayers.length ? 'live' : ''}`} title="Giocatori collegati direttamente al tuo computer">
        <ArrowLeftRight size={11} /> {direct}/{onlinePlayers.length} diretti
      </span>
    );
  }
  const direct = Object.values(routes).includes('p2p');
  return direct ? (
    <span className="badge live" title="Collegato direttamente al computer del master">
      <ArrowLeftRight size={11} /> Diretta
    </span>
  ) : (
    <span className="badge" title="Collegato al master tramite il server">
      <Server size={11} /> Via server
    </span>
  );
}

/** What can be done to several tokens and props at once. */
function GroupBar({ isGm }: { isGm: boolean }) {
  const { state, group, dispatch, setGroup } = useTable();
  const me = useApp((s) => s.user?.id ?? '');
  if (!state) return null;
  const tokens = group.tokens.map((id) => state.tokens[id]).filter((t) => !!t);
  const props = group.props.map((id) => state.props?.[id]).filter((p) => !!p);
  const anyVisible = tokens.some((t) => !t.hidden) || props.some((p) => !p.hidden);
  const setHidden = (hidden: boolean) =>
    dispatch({
      type: 'batch',
      actions: [...tokens.map((t) => ({ type: 'token.update' as const, tokenId: t.id, patch: { hidden } })), ...props.map((p) => ({ type: 'prop.update' as const, propId: p.id, patch: { hidden } }))],
    });
  const parts = [tokens.length && `${tokens.length} ${tokens.length === 1 ? 'token' : 'token'}`, props.length && `${props.length} ${props.length === 1 ? 'oggetto' : 'oggetti'}`].filter(Boolean);
  return (
    <div className="inspector glass group-bar" role="region" aria-label="Selezione multipla">
      <div className="row between">
        <b>{parts.join(' e ')} selezionati</b>
        <button className="btn ghost sm icon" onClick={() => setGroup({ tokens: [], props: [] })} aria-label="Deseleziona" title="Deseleziona (Esc)">
          <X size={14} />
        </button>
      </div>
      <p className="faint small">Trascina uno di loro per spostarli insieme. Shift+clic aggiunge o toglie, Shift+trascina seleziona un’area.</p>
      {isGm && tokens.length > 0 && <GroupSaveForm tokenIds={tokens.map((t) => t.id)} />}
      <div className="row wrap">
        {isGm && (
          <button className="btn sm" onClick={() => setHidden(anyVisible)}>
            {anyVisible ? <EyeOff size={13} /> : <Eye size={13} />} {anyVisible ? 'Nascondi ai giocatori' : 'Mostra ai giocatori'}
          </button>
        )}
        <button
          className="btn sm danger"
          onClick={() => {
            const actions = groupDeleteActions(state, group, me, isGm);
            if (actions.length) dispatch({ type: 'batch', actions });
            setGroup({ tokens: [], props: [] });
          }}
        >
          <Trash2 size={13} /> Elimina
        </button>
      </div>
    </div>
  );
}

const SHORTCUTS: { title: string; gm?: boolean; keys: [string, string, boolean?][] }[] = [
  {
    title: 'Strumenti',
    keys: [
      ['V', 'Seleziona e sposta'],
      ['M', 'Righello'],
      ['P', 'Ping (o Alt+clic ovunque)'],
      ['A', 'Aree d’effetto'],
      ['D', 'Disegna'],
      ['T', 'Testo sulla mappa'],
      ['E', 'Editor mappa (apri e chiudi)', true],
    ],
  },
  {
    title: 'Sulla mappa',
    keys: [
      ['Rotella', 'Zoom'],
      ['Trascina il vuoto · tasto destro', 'Sposta la vista'],
      ['G', 'Aggancia alla griglia / movimento libero'],
      ['Alt + trascina', 'Il contrario dell’aggancio, per una volta'],
      ['Shift + clic', 'Aggiungi o togli dalla selezione'],
      ['Shift + trascina', 'Seleziona un’area'],
      ['Ctrl + clic su un token', 'Segnalo come bersaglio degli attacchi (Esc li toglie)'],
      ['Canc', 'Elimina ciò che è selezionato'],
      ['Esc', 'Deseleziona · chiudi i muri'],
      ['Clic su una porta', 'Aprila o chiudila', false],
      ['Doppio clic su una porta', 'Aprila o chiudila (un clic la seleziona)', true],
      ['Invio · tasto destro', 'Finisci una linea di muri', true],
    ],
  },
  {
    title: 'Editor mappa',
    gm: true,
    keys: [
      ['B · W · O · L · T · V', 'Terreno, muri, oggetti, luci, scritte, seleziona'],
      ['[ · ]', 'Pennello più piccolo o più grande'],
      ['R', 'Ruota l’oggetto da posare'],
      ['Alt + clic', 'Posa fuori griglia'],
    ],
  },
  {
    title: 'Master',
    gm: true,
    keys: [
      ['Ctrl + Z', 'Annulla l’ultima modifica alla mappa'],
      ['Ctrl + Y · Ctrl + Shift + Z', 'Ripeti'],
    ],
  },
  {
    title: 'Macro',
    keys: [['1 … 9 · 0', 'Lancia la macro in quella posizione della barra']],
  },
  {
    title: 'Voce e video',
    keys: [['Ctrl + Maiusc + M', 'Accendi o spegni il microfono']],
  },
  {
    title: 'Chat',
    keys: [
      ['/r 1d20+5', 'Tira i dadi'],
      ['/gr', 'Tiro nascosto (master)', true],
      ['/br', 'Tiro alla cieca: il risultato lo vede il master', false],
      ['/gm', 'Messaggio al solo master', false],
    ],
  },
];

function ShortcutsHelp({ isGm, onClose }: { isGm: boolean; onClose: () => void }) {
  return (
    <Modal title="Scorciatoie" onClose={onClose}>
      <div className="shortcuts">
        {SHORTCUTS.filter((g) => !g.gm || isGm).map((g) => (
          <section key={g.title}>
            <h4>{g.title}</h4>
            <dl>
              {g.keys
                .filter(([, , who]) => who === undefined || who === isGm)
                .map(([k, what]) => (
                  <div key={k}>
                    <dt>
                      {k.split(' · ').map((part, i) => (
                        <span key={part}>
                          {i > 0 && <span className="faint"> o </span>}
                          <kbd>{part}</kbd>
                        </span>
                      ))}
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="faint small">Premi ? per aprire o chiudere questo elenco.</p>
    </Modal>
  );
}

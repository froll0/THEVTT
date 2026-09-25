import { getSystem } from '@thevtt/systems';
import { Armchair, ArrowLeft, BookText, Pause, Play, Lightbulb, Type, ArrowLeftRight, BrickWall, DoorOpen, Eraser, Eye, Library, Music, Pencil, RectangleHorizontal, Spline, BookOpen, Circle, CloudFog, Crosshair, Dices, Map as MapIcon, Minus, MousePointer2, NotebookPen, Radio, Ruler, ScrollText, Server, Shapes, Square, Swords, Triangle, UserRoundPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../components/Shell';
import { Compendium, CompendiumEntryView } from '../components/Compendium';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Avatar } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { Board, CELL, type Tool, type ToolOptions } from './Board';
import { DiceLayer } from './DiceLayer';
import { MusicChip, MusicPanel, MusicPlayer } from './Music';
import { PROP_KINDS } from './props';
import { BestiaryPanel, ChatPanel, DiceBar, DoorInspector, InitiativePanel, NotesPanel, PropInspector, ScenePanel, SheetPanel, SheetWindow, TokenInspector } from './Panels';
import { FloatingWindow, MinimizedWindow } from '../components/FloatingWindow';
import { useWindows } from '../store/windows';
import { Journal } from '../components/Journal';

const DRAW_COLORS = ['', '#ffffff', '#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#b388ff'];

type DockTab = 'chat' | 'initiative' | 'sheet' | 'bestiary' | 'scene' | 'notes' | 'music' | 'rules';

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
  });
  const [tab, setTab] = useState<DockTab>('chat');
  const [dockOpen, setDockOpen] = useState(true);
  const cameraRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const { windows, open: openWindow, closeAll } = useWindows();
  // windows belong to this table
  useEffect(() => closeAll, [campaignId, closeAll]);
  const isGm = campaign?.gmId === user?.id;

  useEffect(() => {
    if (!campaign) return;
    if (isGm) void useTable.getState().host(campaign);
    else useTable.getState().join(campaign);
    return () => useTable.getState().leave();
  }, [campaign?.id, isGm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'v') setTool('select');
      if (e.key === 'm') setTool('measure');
      if (e.key === 'p') setTool('ping');
      if (e.key === 'a') setTool('template');
      if (e.key === 'd') setTool('draw');
      if (e.key === 'w' && useTable.getState().role === 'gm') setTool('walls');
      if (e.key === 'o' && useTable.getState().role === 'gm') setTool('props');
      if (e.key === 'l' && useTable.getState().role === 'gm') setTool('light');
      if (e.key === 't') {
        setTool('draw');
        setOptions((o) => ({ ...o, drawText: true, erase: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!campaign || !user) return null;
  const { state, phase } = table;
  const scene = state?.scenes[state.activeSceneId];
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
            <MusicChip />
            {isGm && (
              <button className={`btn sm ${state.paused ? 'primary' : 'ghost'}`} onClick={() => table.dispatch({ type: 'game.pause', paused: !state.paused })} title={state.paused ? 'Riprendi il gioco' : 'Metti in pausa: i giocatori possono solo scrivere e tirare dadi'}>
                {state.paused ? <Play size={14} /> : <Pause size={14} />} {state.paused ? 'Riprendi il gioco' : 'Pausa gioco'}
              </button>
            )}
            <button className="btn ghost sm" onClick={() => openWindow('journal', campaign.id, 'Diario')} title="Il tuo diario personale: appunti che legge solo tu">
              <BookText size={14} /> Diario
            </button>
            <div className="avatars">
              <Avatar user={{ ...(campaign.members.find((m) => m.role === 'gm')?.user ?? user), online: true }} size={20} presence />
              {players.map((p) => (
                <span
                  key={p.id}
                  className="avatar-route"
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
              <Board tool={tool} options={options} cameraRef={cameraRef} />
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

          {state && (
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
                        { id: 'walls', icon: BrickWall, label: 'Muri e porte (W)' },
                        { id: 'props', icon: Armchair, label: 'Oggetti di scena (O)' },
                        { id: 'light', icon: Lightbulb, label: 'Luci e visione (L)' },
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
                </>
              )}
            </div>
          )}

          {state && scene && tool === 'template' && (
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
          {state && scene && tool === 'draw' && (
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
          {state && scene && tool === 'walls' && isGm && (
            <div className="float tool-options glass">
              {(
                [
                  ['wall', BrickWall, 'Muro'],
                  ['door', DoorOpen, 'Porta'],
                  ['window', RectangleHorizontal, 'Finestra'],
                ] as const
              ).map(([kind, Icon, label]) => (
                <button key={kind} className={`tool wide ${!options.wallErase && options.wallKind === kind ? 'active' : ''}`} onClick={() => setOptions({ ...options, wallKind: kind, wallErase: false })}>
                  <Icon size={14} /> {label}
                </button>
              ))}
              {options.wallKind === 'door' && !options.wallErase && (
                <select className="select tool-select" value={options.doorState} onChange={(e) => setOptions({ ...options, doorState: e.target.value as ToolOptions['doorState'] })} aria-label="Nuove porte">
                  <option value="closed">chiuse</option>
                  <option value="open">aperte</option>
                  <option value="locked">a chiave</option>
                </select>
              )}
              <span className="vsep" />
              <button className={`tool wide ${options.wallMode === 'line' ? 'active' : ''}`} title="Clic dopo clic; Invio, Esc o tasto destro per finire" onClick={() => setOptions({ ...options, wallMode: 'line', wallErase: false })}>
                <Spline size={14} /> Linea
              </button>
              <button className={`tool wide ${options.wallMode === 'rect' ? 'active' : ''}`} title="Trascina per una stanza rettangolare" onClick={() => setOptions({ ...options, wallMode: 'rect', wallErase: false })}>
                <Square size={14} /> Stanza
              </button>
              <button className={`tool ${options.wallErase ? 'active' : ''}`} title="Gomma: clic su un muro per toglierlo" onClick={() => setOptions({ ...options, wallErase: !options.wallErase })}>
                <Eraser size={15} />
              </button>
              {Object.values(state.walls ?? {}).some((w) => w.sceneId === scene.id) && (
                <button className="tool wide" onClick={() => table.dispatch({ type: 'wall.clear' })}>
                  Cancella tutti
                </button>
              )}
            </div>
          )}
          {state && scene && tool === 'props' && isGm && (
            <div className="float tool-options glass props-palette">
              {PROP_KINDS.map((k) => (
                <button key={k.id} className={`tool wide ${options.propKind === k.id ? 'active' : ''}`} onClick={() => setOptions({ ...options, propKind: k.id })}>
                  {k.name}
                </button>
              ))}
              <span className="faint tiny" style={{ padding: '0 6px' }}>clic sulla mappa per posarlo</span>
            </div>
          )}
          {state && scene && tool === 'light' && isGm && (
            <div className="float tool-options glass">
              <button
                className={`tool wide ${scene.vision ? 'active' : ''}`}
                title="Ogni giocatore vede solo ciò che vedono i suoi token"
                onClick={() => table.dispatch({ type: 'scene.update', sceneId: scene.id, patch: { vision: !scene.vision } })}
              >
                <Eye size={14} /> Visione dinamica {scene.vision ? 'attiva' : 'spenta'}
              </button>
              {scene.vision && (
                <>
                  <span className="vsep" />
                  {(
                    [
                      ['bright', 'Giorno'],
                      ['dim', 'Penombra'],
                      ['dark', 'Buio'],
                    ] as const
                  ).map(([a, label]) => (
                    <button key={a} className={`tool wide ${(scene.ambient ?? 'bright') === a ? 'active' : ''}`} onClick={() => table.dispatch({ type: 'scene.update', sceneId: scene.id, patch: { ambient: a } })}>
                      {label}
                    </button>
                  ))}
                  <span className="vsep" />
                  <button className={`tool wide ${options.lightPreview ? 'active' : ''}`} onClick={() => setOptions({ ...options, lightPreview: !options.lightPreview })}>
                    Vista giocatori
                  </button>
                </>
              )}
              <span className="faint tiny" style={{ padding: '0 6px' }}>clic sulla mappa: fonte di luce · luci dei token nel loro pannello</span>
            </div>
          )}
          {state && scene && tool === 'fog' && isGm && (
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

          {selected && <TokenInspector token={selected} />}
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
          {state && <DiceBar />}
        </div>

        <aside className={`dock ${dockOpen ? '' : 'closed'}`}>
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

import { getSystem } from '@thevtt/systems';
import { ArrowLeft, ArrowLeftRight, BookOpen, Circle, CloudFog, Crosshair, Dices, Map as MapIcon, Minus, MousePointer2, NotebookPen, Radio, Ruler, ScrollText, Server, Shapes, Square, Swords, Triangle, UserRoundPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../components/Shell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Avatar } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { Board, CELL, type Tool, type ToolOptions } from './Board';
import { BestiaryPanel, ChatPanel, DiceBar, InitiativePanel, NotesPanel, ScenePanel, SheetPanel, TokenInspector } from './Panels';

type DockTab = 'chat' | 'initiative' | 'sheet' | 'bestiary' | 'scene' | 'notes';

export function TableView({ campaignId }: { campaignId: string }) {
  const { campaigns, user, go, status } = useApp();
  const campaign = campaigns.find((c) => c.id === campaignId);
  const table = useTable();
  const dockPosition = useSettings((s) => s.dockPosition);
  const [tool, setTool] = useState<Tool>('select');
  const [options, setOptions] = useState<ToolOptions>({ fogReveal: true, shape: 'circle' });
  const [tab, setTab] = useState<DockTab>('chat');
  const [dockOpen, setDockOpen] = useState(true);
  const cameraRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
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
    { id: 'notes', label: 'Note', icon: NotebookPen, gm: true },
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
            <div className="avatars">
              <Avatar user={{ ...(campaign.members.find((m) => m.role === 'gm')?.user ?? user), online: true }} size={20} presence />
              {players.map((p) => (
                <span
                  key={p.id}
                  className="avatar-route"
                  data-route={p.online ? (table.routes[p.id] ?? 'relay') : undefined}
                  title={`${p.displayName}${p.online ? (table.routes[p.id] === 'p2p' ? ' · connessione diretta' : ' · via server') : ' · offline'}`}
                >
                  <Avatar user={{ displayName: p.displayName, avatarColor: p.color, online: p.online }} size={20} presence />
                </span>
              ))}
            </div>
          </div>
        )}
      </TopBar>
      <div className={`table-body dock-${dockPosition}`}>
        <div className="stage">
          {state && scene && phase === 'waiting' && !isGm && (
            <div className="stage-paused">
              <Radio size={26} />
              <h2>{status === 'online' ? 'Il master si è allontanato' : 'Connessione al master persa'}</h2>
              <p className="muted">Il tavolo riprende da solo appena {campaign.members.find((m) => m.role === 'gm')?.user.displayName ?? 'il master'} {status === 'online' ? 'riapre la sessione' : 'torna raggiungibile'}.</p>
            </div>
          )}
          {state && scene ? (
            <Board tool={tool} options={options} cameraRef={cameraRef} />
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
                  ...(isGm ? ([{ id: 'fog', icon: CloudFog, label: 'Nebbia di guerra' }] as const) : []),
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
                    onClick={() => table.dispatch({ type: 'token.create', token: { name: 'PNG', ...viewCenter(), color: '#9a9ba3', hp: { current: 10, max: 10 }, ac: 12 } })}
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
                {tab === 'sheet' && <SheetPanel placeAt={viewCenter} />}
                {tab === 'bestiary' && isGm && <BestiaryPanel placeAt={viewCenter} />}
                {tab === 'scene' && isGm && <ScenePanel />}
                {tab === 'notes' && isGm && <NotesPanel />}
              </ErrorBoundary>
            </div>
          )}
        </aside>
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

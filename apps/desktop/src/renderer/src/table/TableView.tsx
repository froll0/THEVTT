import { getSystem } from '@thevtt/systems';
import { ArrowLeft, ArrowLeftRight, Crosshair, Server, Dices, MousePointer2, NotebookPen, Radio, Ruler, ScrollText, Swords, Map as MapIcon, UserRoundPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TitleBar } from '../components/Shell';
import { Avatar } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { Board, CELL, type Tool } from './Board';
import { ChatPanel, DiceBar, InitiativePanel, NotesPanel, ScenePanel, SheetPanel, TokenInspector } from './Panels';

type DockTab = 'chat' | 'initiative' | 'sheet' | 'scene' | 'notes';

export function TableView({ campaignId }: { campaignId: string }) {
  const { campaigns, user, go } = useApp();
  const campaign = campaigns.find((c) => c.id === campaignId);
  const table = useTable();
  const dockPosition = useSettings((s) => s.dockPosition);
  const [tool, setTool] = useState<Tool>('select');
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
    { id: 'scene', label: 'Scene', icon: MapIcon, gm: true },
    { id: 'notes', label: 'Note', icon: NotebookPen, gm: true },
  ];

  return (
    <div className="shell table-shell">
      <TitleBar>
        <span className="muted">{campaign.name}</span>
        {scene && <span className="faint">/ {scene.name}</span>}
      </TitleBar>
      <div className={`table-body dock-${dockPosition}`}>
        <div className="stage">
          {state && scene ? (
            <Board tool={tool} cameraRef={cameraRef} />
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

          <div className="toolbar glass top-left">
            <button className="btn ghost sm" onClick={() => go({ name: 'campaign', id: campaign.id })} title="Lascia il tavolo">
              <ArrowLeft size={15} /> {isGm ? 'Chiudi sessione' : 'Esci'}
            </button>
          </div>

          {state && (
            <div className="toolbar glass left-rail">
              {(
                [
                  { id: 'select', icon: MousePointer2, label: 'Seleziona e sposta (V)' },
                  { id: 'measure', icon: Ruler, label: 'Righello (M)' },
                  { id: 'ping', icon: Crosshair, label: 'Ping (P · o Alt+clic)' },
                ] as const
              ).map((t) => (
                <button key={t.id} className={`btn ghost icon ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)} title={t.label}>
                  <t.icon size={17} />
                </button>
              ))}
              {isGm && (
                <>
                  <span className="rail-sep" />
                  <button
                    className="btn ghost icon"
                    title="Aggiungi token"
                    onClick={() => table.dispatch({ type: 'token.create', token: { name: 'PNG', ...viewCenter(), color: '#9a9ba3', hp: { current: 10, max: 10 }, ac: 12 } })}
                  >
                    <UserRoundPlus size={17} />
                  </button>
                </>
              )}
            </div>
          )}

          {state && (
            <div className="toolbar glass top-right">
              {isGm && <span className="badge live"><Radio size={11} /> Host</span>}
              <ConnectionBadge isGm={isGm} onlinePlayers={players.filter((p) => p.online).map((p) => p.id)} />
              <div className="avatars">
                <Avatar user={{ ...(campaign.members.find((m) => m.role === 'gm')?.user ?? user), online: true }} size={24} presence />
                {players.map((p) => (
                  <span key={p.id} className="avatar-route" data-route={p.online ? (table.routes[p.id] ?? 'relay') : undefined} title={`${p.displayName}${p.online ? (table.routes[p.id] === 'p2p' ? ' · connessione diretta' : ' · via server') : ' · offline'}`}>
                    <Avatar user={{ displayName: p.displayName, avatarColor: p.color, online: p.online }} size={24} presence />
                  </span>
                ))}
              </div>
              <span className="faint small">{getSystem(state.systemId)?.shortName}</span>
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
                  <t.icon size={17} />
                </button>
              ))}
          </div>
          {dockOpen && state && (
            <div className="dock-panel">
              <div className="dock-title">{tabs.find((t) => t.id === tab)?.label}</div>
              {tab === 'chat' && <ChatPanel />}
              {tab === 'initiative' && <InitiativePanel />}
              {tab === 'sheet' && <SheetPanel placeAt={viewCenter} />}
              {tab === 'scene' && isGm && <ScenePanel />}
              {tab === 'notes' && isGm && <NotesPanel />}
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

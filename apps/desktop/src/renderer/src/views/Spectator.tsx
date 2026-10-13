import { SPECTATOR_ID } from '@thevtt/shared';
import { useEffect, useRef, useState } from 'react';
import { SPECTATOR_CHANNEL, type SpectatorMessage } from '../lib/spectator';
import { useTable } from '../store/table';
import { useThemeSync } from '../App';
import { Board, type ToolOptions } from '../table/Board';

const OPTIONS: ToolOptions = {
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
};

/**
 * The audience's window: the map as the players see it, the turn order and
 * the latest roll, nothing to click. To stream or to show on a second screen.
 */
export function Spectator() {
  const cameraRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const state = useTable((s) => s.state);
  const [closed, setClosed] = useState(false);
  useThemeSync();
  useEffect(() => {
    document.title = 'TheVTT – vista spettatore';
    document.body.classList.add('spectator-body');
    const assets: Record<string, string> = {};
    const ch = new BroadcastChannel(SPECTATOR_CHANNEL);
    ch.onmessage = (e: MessageEvent<SpectatorMessage>) => {
      const m = e.data;
      if (m.k === 'asset') {
        assets[m.id] = m.dataUrl;
        useTable.setState({ assets: { ...assets } });
      } else if (m.k === 'state') {
        setClosed(false);
        // a player's view, read only: nothing here talks to the server
        useTable.setState({ state: m.state, role: 'player', phase: 'live', campaignId: null });
      } else if (m.k === 'closed') setClosed(true);
    };
    ch.postMessage({ k: 'hello' } satisfies SpectatorMessage);
    return () => ch.close();
  }, []);

  if (!state)
    return (
      <div className="spectator-wait">
        <p>Apri il tavolo nella finestra del master: la partita comparirà qui.</p>
      </div>
    );
  const ini = state.initiative;
  const last = [...state.log].reverse().find((l) => l.kind === 'roll' && l.roll);
  return (
    <div className="spectator" aria-label="Vista spettatore">
      <div className="spectator-board board">
        <Board tool="select" options={OPTIONS} cameraRef={cameraRef} viewerId={SPECTATOR_ID} readOnly />
      </div>
      <div className="spectator-title">{state.campaignName}</div>
      {ini.round > 0 && ini.entries.length > 0 && (
        <ol className="spectator-ini" aria-label="Ordine di iniziativa">
          {ini.entries.map((e, i) => (
            <li key={e.id} className={i === ini.turn ? 'now' : ''}>
              {e.name}
            </li>
          ))}
        </ol>
      )}
      {last && (
        <div className="spectator-roll" key={last.id}>
          <span>{last.authorName}</span>
          {last.label && <span className="faint"> · {last.label}</span>}
          <b>{last.text}</b>
        </div>
      )}
      {closed && <div className="spectator-paused">Il master ha chiuso il tavolo</div>}
    </div>
  );
}

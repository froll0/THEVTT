import { referencedAssets, spectatorView, type GameState } from '@thevtt/shared';
import { useEffect, useRef } from 'react';

/**
 * The audience's window gets the game from the GM's own window, on this
 * computer (same app, no server): the state as the players see it together,
 * and the pictures it needs.
 */
export const SPECTATOR_CHANNEL = 'thevtt-spectator';

export type SpectatorMessage =
  | { k: 'hello' }
  | { k: 'state'; state: GameState }
  | { k: 'asset'; id: string; dataUrl: string }
  /** the GM left the table */
  | { k: 'closed' };

/** GM: keeps the audience's window up to date while the table is open. */
export function useSpectatorFeed(state: GameState | null, assets: Record<string, string>, active: boolean) {
  const channel = useRef<BroadcastChannel | null>(null);
  const sent = useRef(new Set<string>());
  /** an audience window said hello: until then nothing is computed */
  const watched = useRef(false);
  const latest = useRef({ state, assets });
  latest.current = { state, assets };

  const publish = () => {
    const ch = channel.current;
    const { state: st, assets: as } = latest.current;
    if (!ch || !st || !watched.current) return;
    const view = spectatorView(st);
    for (const id of referencedAssets(view)) {
      if (sent.current.has(id) || !as[id]) continue;
      ch.postMessage({ k: 'asset', id, dataUrl: as[id] } satisfies SpectatorMessage);
      sent.current.add(id);
    }
    ch.postMessage({ k: 'state', state: view } satisfies SpectatorMessage);
  };

  useEffect(() => {
    if (!active || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(SPECTATOR_CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<SpectatorMessage>) => {
      // a window just opened: everything again
      if (e.data?.k === 'hello') {
        watched.current = true;
        sent.current.clear();
        publish();
      }
    };
    publish();
    return () => {
      ch.postMessage({ k: 'closed' } satisfies SpectatorMessage);
      ch.close();
      channel.current = null;
      watched.current = false;
      sent.current.clear();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active) publish();
  }, [state, active]); // eslint-disable-line react-hooks/exhaustive-deps
}

import { useEffect, useRef } from 'react';
import { useApp } from '../store/app';
import { readableOn, useSettings } from '../store/settings';
import { useTable } from '../store/table';

type Dice3d = typeof import('../lib/dice3d');
let loading: Promise<Dice3d> | null = null;
/** no WebGL on this machine: stop trying */
let unavailable = false;
/** three.js and the physics engine load with the first roll, not with the app */
const load = () => (loading ??= import('../lib/dice3d'));

/** Rolling 3D dice over the board, for every roll that shows up in the log. */
export function DiceLayer() {
  const log = useTable((s) => s.state?.log);
  const enabled = useSettings((s) => s.dice3d && !s.reduceMotion);
  const ref = useRef<HTMLDivElement>(null);
  const tray = useRef<InstanceType<Dice3d['DiceTray']> | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => () => tray.current?.dispose(), []);

  // one's chosen dice reach the table (and follow changes in the settings)
  const skin = useSettings((s) => s.diceSkin);
  const live = useTable((s) => !!s.state);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => {
      const { state, dispatch } = useTable.getState();
      const me = useApp.getState().user?.id ?? '';
      const now = state?.dice?.[me];
      if (JSON.stringify(now ?? null) !== JSON.stringify(skin)) dispatch({ type: 'dice.skin', skin });
    }, 400);
    return () => clearTimeout(t);
  }, [live, skin?.color, skin?.ink, skin?.finish]);

  useEffect(() => {
    if (!log) return;
    const lastId = log.at(-1)?.id ?? '';
    // the history already in the log when we sit down doesn't roll again
    if (seen.current === null || !enabled) {
      seen.current = lastId;
      return;
    }
    const from = log.findIndex((e) => e.id === seen.current);
    const fresh = from >= 0 ? log.slice(from + 1) : log.slice(-1);
    seen.current = lastId;
    const rolls = fresh.filter((e) => e.kind === 'roll' && e.roll);
    if (!rolls.length || !ref.current || unavailable) return;
    void load().then((m) => {
      if (!ref.current || unavailable) return;
      if (!tray.current) {
        if (!m.webglAvailable()) {
          unavailable = true;
          return;
        }
        tray.current = new m.DiceTray(ref.current);
      }
      const { state } = useTable.getState();
      for (const e of rolls) {
        const dice = m.diceFor(e.roll!.parts);
        // their own dice if they chose them, else the player's colour
        const skin = state?.dice?.[e.authorId];
        const color = skin?.color ?? state?.players[e.authorId]?.color ?? (e.authorId === state?.gmId ? '#e9e7e1' : '#c9a227');
        tray.current.roll(dice, color, skin?.ink ?? readableOn(color), undefined, skin?.finish);
      }
    });
  }, [log, enabled]);

  return <div ref={ref} className="dice-host" aria-hidden />;
}

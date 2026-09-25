import { useEffect, useRef } from 'react';
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
        const color = state?.players[e.authorId]?.color ?? (e.authorId === state?.gmId ? '#e9e7e1' : '#c9a227');
        tray.current.roll(dice, color, readableOn(color));
      }
    });
  }, [log, enabled]);

  return <div ref={ref} className="dice-host" aria-hidden />;
}

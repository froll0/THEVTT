import { useEffect, useRef, useState } from 'react';
import { useTable } from '../store/table';

const hpWord = (hp: { current: number; max: number } | null) => {
  if (!hp || hp.max <= 0) return '';
  const p = hp.current / hp.max;
  return p <= 0 ? ', a terra' : p <= 0.25 ? ', gravemente ferito' : p <= 0.5 ? ', ferito' : p < 1 ? ', graffiato' : '';
};

/**
 * For screen readers: who is on the map and where (a list read on demand),
 * and what just happened (the latest roll, whose turn it is) read aloud.
 */
export function BoardAnnouncer() {
  const state = useTable((s) => s.state);
  const [said, setSaid] = useState('');
  const lastLog = useRef<string | null>(null);
  const lastTurn = useRef<string>('');
  const log = state?.log;
  const ini = state?.initiative;

  useEffect(() => {
    const e = log?.at(-1);
    if (!e || e.id === lastLog.current) return;
    const first = lastLog.current === null;
    lastLog.current = e.id;
    // what was there before isn't news
    if (first) return;
    if (e.kind === 'roll') setSaid(`${e.authorName}${e.label ? `, ${e.label}` : ''}: ${e.text}`);
    else if (e.kind === 'system') setSaid(e.text);
    else if (e.kind === 'card' && e.card) setSaid(`${e.card.title}${e.card.body ? `: ${e.card.body}` : ''}`);
    else if (e.kind === 'chat') setSaid(`${e.authorName} dice: ${e.text}`);
  }, [log]);

  useEffect(() => {
    if (!ini || ini.round === 0) return;
    const who = ini.entries[ini.turn]?.name;
    const key = `${ini.round}:${ini.turn}:${who}`;
    if (!who || key === lastTurn.current) return;
    lastTurn.current = key;
    setSaid(`Round ${ini.round}, tocca a ${who}`);
  }, [ini]);

  if (!state) return null;
  const scene = state.scenes[state.activeSceneId];
  const tokens = Object.values(state.tokens).filter((t) => t.sceneId === state.activeSceneId);
  return (
    <div className="sr-only">
      <div aria-live="polite" aria-atomic="true">
        {said}
      </div>
      <h2>Sulla mappa{scene ? ` «${scene.name}»` : ''}</h2>
      <ul aria-label="Token sulla mappa">
        {tokens.map((t) => (
          <li key={t.id}>
            {t.name}, colonna {Math.round(t.x) + 1}, riga {Math.round(t.y) + 1}
            {hpWord(t.hp)}
            {t.elevation ? `, a ${t.elevation} di altezza` : ''}
            {t.conditions.length ? `, ${t.conditions.join(', ')}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

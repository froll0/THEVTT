import { useEffect, useRef } from 'react';
import { speakAs } from '../lib/voices';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';

/** Lines said in a character's voice are read aloud (if one wants it). */
export function SpokenLines() {
  const log = useTable((s) => s.state?.log);
  const on = useSettings((s) => s.npcVoices);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!log) return;
    const lastId = log.at(-1)?.id ?? '';
    // what was said before sitting down (or before switching it on) stays quiet
    if (seen.current === null || !on) {
      seen.current = lastId;
      return;
    }
    const from = log.findIndex((e) => e.id === seen.current);
    const fresh = from >= 0 ? log.slice(from + 1) : log.slice(-1);
    seen.current = lastId;
    const me = useApp.getState().user?.id;
    for (const e of fresh) if (e.kind === 'chat' && e.speaker && e.authorId !== me) speakAs(e.speaker.name, e.text);
  }, [log, on]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return null;
}

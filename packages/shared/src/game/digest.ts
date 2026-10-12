import type { GameState, LogEntry } from './state';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface PlayerStats {
  name: string;
  rolls: number;
  /** natural 20s and 1s on a d20 */
  crits: number;
  fumbles: number;
  /** the average of their d20s, null without any */
  d20Average: number | null;
  /** dice pools: successes in total */
  successes: number;
}

/** Who rolled what in the log entries given. */
export function sessionStats(log: LogEntry[]): PlayerStats[] {
  const by = new Map<string, PlayerStats & { d20: number[] }>();
  for (const l of log) {
    if (l.kind !== 'roll' || !l.roll) continue;
    const p = by.get(l.authorName) ?? { name: l.authorName, rolls: 0, crits: 0, fumbles: 0, d20Average: null, successes: 0, d20: [] };
    p.rolls++;
    for (const part of l.roll.parts) {
      if (part.type !== 'dice') continue;
      if (part.target !== undefined) p.successes += part.subtotal;
      else if (part.sides === 20) {
        for (const d of part.rolls) {
          if (d.dropped) continue;
          p.d20.push(d.value);
          if (d.value === 20) p.crits++;
          if (d.value === 1) p.fumbles++;
        }
      }
    }
    by.set(l.authorName, p);
  }
  return [...by.values()]
    .map(({ d20, ...p }) => ({ ...p, d20Average: d20.length ? Math.round((d20.reduce((a, b) => a + b, 0) / d20.length) * 10) / 10 : null }))
    .sort((a, b) => b.rolls - a.rolls);
}

export interface SessionDigest {
  title: string;
  /** rich text (HTML) ready for the recap editor */
  body: string;
  /** how many log entries it was drawn from */
  entries: number;
}

/**
 * A draft recap of a session, drawn from the table log since `since`: who was
 * there, what happened (system lines and shared cards), the rolls and what was
 * said in chat. The GM edits it before publishing; private lines stay out.
 */
export function sessionDigest(state: GameState, since: number, now = Date.now()): SessionDigest {
  const log = state.log.filter((l) => l.ts >= since && !l.private && !l.blind);
  const date = new Date(now).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const title = `Sessione del ${date}`;
  if (!log.length) return { title, body: '', entries: 0 };

  const people = [...new Set(log.filter((l) => l.authorId !== 'system' && l.authorId !== state.gmId).map((l) => l.authorName))];
  const minutes = Math.max(1, Math.round((log[log.length - 1]!.ts - log[0]!.ts) / 60000));
  const length = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim() : `${minutes} min`;

  const events: string[] = [];
  const push = (s: string) => {
    if (events[events.length - 1] !== s) events.push(s);
  };
  for (const l of log) {
    if (l.kind === 'system') push(l.text);
    else if (l.kind === 'card' && l.card) push(`${l.authorName}: ${l.card.title}${l.card.subtitle ? ` (${l.card.subtitle})` : ''}`);
  }

  const rolls = log.filter((l): l is LogEntry & { roll: NonNullable<LogEntry['roll']> } => l.kind === 'roll' && !!l.roll);
  const best = [...rolls].sort((a, b) => b.roll.total - a.roll.total).slice(0, 1);

  const chat = log.filter((l) => l.kind === 'chat' && l.text.trim()).slice(-20);

  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const parts: string[] = [`<p><b>Durata</b>: circa ${esc(length)}${people.length ? ` · <b>Presenti</b>: ${esc(people.join(', '))}` : ''}</p>`];
  parts.push('<h3>Cosa è successo</h3>', '<p><i>Scrivi qui il racconto della sessione.</i></p>');
  if (events.length) parts.push('<h3>Momenti dal tavolo</h3>', list(events.slice(-30)));
  if (rolls.length) {
    const stats = sessionStats(log);
    const line = (p: PlayerStats) =>
      [
        `${p.name}: ${p.rolls} ${p.rolls === 1 ? 'tiro' : 'tiri'}`,
        p.crits ? `${p.crits} × 20 naturale` : '',
        p.fumbles ? `${p.fumbles} × 1 naturale` : '',
        p.d20Average !== null ? `media del d20 ${p.d20Average}` : '',
        p.successes ? `${p.successes} successi` : '',
      ]
        .filter(Boolean)
        .join(', ');
    parts.push('<h3>Tiri</h3>', list([...stats.map(line), ...best.map((r) => `Il più alto: ${r.authorName}${r.label ? `, ${r.label}` : ''}: ${r.roll.total} (${r.roll.formula})`)]));
  }
  if (chat.length) parts.push('<h3>Dalla chat</h3>', list(chat.map((c) => `${c.authorName}: ${c.text}`)));
  return { title, body: parts.join(''), entries: log.length };
}

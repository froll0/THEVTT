import type { GameState, LogEntry } from './state';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const perAuthor = new Map<string, number>();
  for (const r of rolls) perAuthor.set(r.authorName, (perAuthor.get(r.authorName) ?? 0) + 1);
  const best = [...rolls].sort((a, b) => b.roll.total - a.roll.total).slice(0, 3);

  const chat = log.filter((l) => l.kind === 'chat' && l.text.trim()).slice(-20);

  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const parts: string[] = [`<p><b>Durata</b>: circa ${esc(length)}${people.length ? ` · <b>Presenti</b>: ${esc(people.join(', '))}` : ''}</p>`];
  parts.push('<h3>Cosa è successo</h3>', '<p><i>Scrivi qui il racconto della sessione.</i></p>');
  if (events.length) parts.push('<h3>Momenti dal tavolo</h3>', list(events.slice(-30)));
  if (rolls.length) {
    parts.push(
      '<h3>Tiri</h3>',
      list([
        `${rolls.length} tiri: ${[...perAuthor].map(([n, c]) => `${n} ${c}`).join(', ')}`,
        ...best.map((r) => `${r.authorName}${r.label ? `, ${r.label}` : ''}: ${r.roll.total} (${r.roll.formula})`),
      ]),
    );
  }
  if (chat.length) parts.push('<h3>Dalla chat</h3>', list(chat.map((c) => `${c.authorName}: ${c.text}`)));
  return { title, body: parts.join(''), entries: log.length };
}

import { describeRoll, type LogEntry } from '@thevtt/shared';

/** A session recap, for the channel: its title and as much of the text as fits. */
export function recapForDiscord(title: string, text: string): string {
  const head = `📖 **${title}**\n`;
  const room = 1990 - head.length;
  return head + (text.length > room ? `${text.slice(0, room - 1)}…` : text);
}

/** A line of the table's log as a Discord message (null: not for the channel). */
export function logToDiscord(e: LogEntry): { kind: 'rolls' | 'events'; text: string } | null {
  if (e.private || e.blind) return null;
  if (e.kind === 'roll' && e.roll) return { kind: 'rolls', text: `🎲 **${e.authorName}**${e.label ? ` · ${e.label}` : ''}: **${e.roll.total}** (${describeRoll(e.roll)})` };
  if (e.kind === 'system') return { kind: 'events', text: `📜 ${e.text}` };
  if (e.kind === 'card' && e.card) return { kind: 'rolls', text: `🃏 **${e.card.title}**${e.card.subtitle ? ` (${e.card.subtitle})` : ''}${e.card.body ? `: ${e.card.body}` : ''}` };
  return null;
}

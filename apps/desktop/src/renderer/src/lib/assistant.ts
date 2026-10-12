import type { AssistantResult } from '../../../preload/api';
import type { CompendiumEntry } from '../systems';

/** Light markdown from the assistant (bold, paragraphs, lists) as safe HTML for notes and the rich viewer. */
export function assistantHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const item = /^[-*•]\s+(.*)$/.exec(line);
    if (item) {
      list.push(item[1]!);
      continue;
    }
    flush();
    if (!line) continue;
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    out.push(h ? `<h3>${inline(h[1]!)}</h3>` : `<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('');
}

/** The compendium entries closest to a question, as context for a rules answer. */
export function rulesContext(entries: CompendiumEntry[], question: string, max = 6): { title: string; text: string }[] {
  const words = question
    .toLowerCase()
    .split(/[^a-zà-ù0-9]+/i)
    .filter((w) => w.length > 3);
  if (!words.length) return [];
  return entries
    .map((e) => {
      const title = e.title.toLowerCase();
      const text = e.text.toLowerCase();
      const score = words.reduce((n, w) => n + (title.includes(w) ? 5 : 0) + (text.includes(w) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ e }) => ({ title: `${e.title}${e.subtitle ? ` (${e.subtitle})` : ''}`, text: e.text.slice(0, 4000) }));
}

export const isAnswer = (r: AssistantResult): r is { text: string; truncated?: boolean } => 'text' in r;

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

interface MemoryInput {
  state: {
    campaignName: string;
    notes?: Record<string, { title: string; body: string; updatedAt: number }>;
    quests?: Record<string, { title: string; description: string; status: string; objectives: { text: string; done: boolean }[] }>;
    log: { kind: string; authorName: string; text: string; label?: string; private?: boolean; ts: number }[];
    tokens: Record<string, { name: string; characterId: string | null }>;
    encounters?: Record<string, { name: string; chapter: string; text: string }>;
    world?: { minutes: number };
  };
  recaps: { title: string; body: string; createdAt: string }[];
  journal: { title: string; body: string; updatedAt: string }[];
  /** rich text → plain text */
  plain: (html: string) => string;
}

/** about 60k tokens of campaign at most */
const MEMORY_LIMIT = 240_000;

/**
 * What the table remembers of the campaign, as documents for the assistant:
 * the session recaps, the GM's journal and notes, the quests, the prepared
 * encounters, the latest lines of the table's log. Past the limit, those
 * closest to the question go first.
 */
export function campaignMemory({ state, recaps, journal, plain }: MemoryInput, question: string): { title: string; text: string }[] {
  const docs: { title: string; text: string; recent: number }[] = [];
  for (const r of recaps) docs.push({ title: `Riassunto: ${r.title}`, text: plain(r.body), recent: Date.parse(r.createdAt) || 0 });
  for (const j of journal) docs.push({ title: `Diario del master: ${j.title}`, text: plain(j.body), recent: Date.parse(j.updatedAt) || 0 });
  for (const n of Object.values(state.notes ?? {})) docs.push({ title: `Nota: ${n.title}`, text: plain(n.body), recent: n.updatedAt });
  for (const q of Object.values(state.quests ?? {})) {
    const objectives = q.objectives.map((o) => `${o.done ? '[fatto]' : '[da fare]'} ${o.text}`).join('\n');
    docs.push({ title: `Missione (${q.status === 'done' ? 'compiuta' : q.status === 'failed' ? 'fallita' : 'in corso'}): ${q.title}`, text: `${plain(q.description)}\n${objectives}`.trim(), recent: 0 });
  }
  for (const e of Object.values(state.encounters ?? {})) docs.push({ title: `Incontro preparato: ${e.name}${e.chapter ? ` (${e.chapter})` : ''}`, text: plain(e.text), recent: 0 });
  const npcs = [...new Set(Object.values(state.tokens).filter((t) => !t.characterId).map((t) => t.name))];
  if (npcs.length) docs.push({ title: 'Creature e PNG sulla mappa', text: npcs.join(', '), recent: Date.now() });
  const lines = state.log
    .filter((l) => l.kind === 'chat' || l.kind === 'system' || l.kind === 'card')
    .slice(-200)
    .map((l) => `${new Date(l.ts).toLocaleDateString('it-IT')} ${l.authorName}: ${l.label ? `${l.label} ` : ''}${l.text}`);
  if (lines.length) docs.push({ title: 'Registro del tavolo (ultime righe)', text: lines.join('\n'), recent: Date.now() });

  const useful = docs.filter((d) => d.text.trim());
  const total = useful.reduce((n, d) => n + d.text.length, 0);
  let chosen = useful;
  if (total > MEMORY_LIMIT) {
    const words = question.toLowerCase().split(/[^a-zà-ù0-9]+/i).filter((w) => w.length > 3);
    const score = (d: (typeof useful)[number]) => words.reduce((n, w) => n + (d.title.toLowerCase().includes(w) ? 5 : 0) + (d.text.toLowerCase().includes(w) ? 1 : 0), 0);
    chosen = [];
    let used = 0;
    for (const d of [...useful].sort((a, b) => score(b) - score(a) || b.recent - a.recent)) {
      const text = d.text.slice(0, 20_000);
      if (used + text.length > MEMORY_LIMIT) continue;
      chosen.push({ ...d, text });
      used += text.length;
    }
  }
  // oldest first: the story reads in order
  return [...chosen].sort((a, b) => a.recent - b.recent).map(({ title, text }) => ({ title, text }));
}

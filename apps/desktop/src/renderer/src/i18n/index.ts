import EN_TEXT from './en.txt?raw';

export type Language = 'it' | 'en';

/** Italian → English, exact strings and patterns with {0}, {1}… for the variable parts. */
export function parseDictionary(text: string) {
  const exact = new Map<string, string>();
  const patterns: { re: RegExp; to: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [from, to] = line.split(' ⇒ ');
    if (!from || to === undefined) continue;
    if (/\{\d\}/.test(from)) {
      const src = from
        .split(/(\{\d\})/)
        .map((part) => (/^\{\d\}$/.test(part) ? `(?<p${part[1]}>.+?)` : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('');
      patterns.push({ re: new RegExp(`^${src}$`, 's'), to });
    } else exact.set(from, to);
  }
  return { exact, patterns };
}

export function makeTranslator(text: string) {
  const { exact, patterns } = parseDictionary(text);
  const cache = new Map<string, string | null>();
  /** the English for a whole UI string, or null when it isn't one */
  return (s: string): string | null => {
    const key = s.replace(/\s+/g, ' ').trim();
    if (!key) return null;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let out = exact.get(key) ?? null;
    if (out === null) {
      for (const p of patterns) {
        const m = p.re.exec(key);
        if (!m) continue;
        // the variable parts may be UI words themselves («Prova di Forza» keeps «Forza», «Modifica Nuova scena»…)
        out = p.to.replace(/\{(\d)\}/g, (_, i: string) => {
          const v = m.groups?.[`p${i}`] ?? '';
          return exact.get(v) ?? v;
        });
        break;
      }
    }
    if (cache.size > 5000) cache.clear();
    cache.set(key, out);
    return out;
  };
}

const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
/** user content and editors: names, chat, notes, journals are never translated */
const SKIP =
  '[contenteditable], .ProseMirror, [translate="no"], .selectable, .rt-view, .log-text, .log-system, .log-card, .log-who, .thread-log, .note-body, .journal-body, .tile-title'
/** text inside these is code or a form value, never interface */
const RAW = 'script, style, textarea'

/**
 * Shows the interface in English by rewriting the page's text as React renders
 * it. The Italian stays the source: switching back restores every original.
 */
export class DomTranslator {
  private readonly tr: (s: string) => string | null;
  private observer: MutationObserver | null = null;
  /** what each node said before we touched it, to restore Italian, and what we wrote */
  private readonly texts = new Map<Text, { it: string; en: string }>();
  private readonly attrs = new Map<Element, Record<string, string>>();
  private busy = false;

  constructor(dictionary: string) {
    this.tr = makeTranslator(dictionary);
  }

  start(root: HTMLElement = document.body) {
    if (this.observer) return;
    this.walk(root);
    this.observer = new MutationObserver((records) => {
      if (this.busy) return;
      this.busy = true;
      try {
        for (const r of records) {
          if (r.type === 'characterData') this.text(r.target as Text);
          else if (r.type === 'attributes') this.attr(r.target as Element, r.attributeName!);
          else r.addedNodes.forEach((n) => this.walk(n));
        }
        // our own rewrites come back as mutations: drop them
        this.observer?.takeRecords();
      } finally {
        this.busy = false;
      }
    });
    this.observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    for (const [node, { it, en }] of this.texts) if (node.isConnected && node.data === en) node.data = it;
    for (const [el, saved] of this.attrs) if (el.isConnected) for (const [a, v] of Object.entries(saved)) el.setAttribute(a, v);
    this.texts.clear();
    this.attrs.clear();
  }

  private skipped(el: Element | null) {
    return !el || !!el.closest(SKIP);
  }

  private walk(n: Node) {
    if (n.nodeType === Node.TEXT_NODE) return this.text(n as Text);
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    if (this.skipped(el)) return;
    for (const a of ATTRS) if (el.hasAttribute(a)) this.attr(el, a);
    el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach((c) => {
      if (!this.skipped(c)) for (const a of ATTRS) if (c.hasAttribute(a)) this.attr(c, a);
    });
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) this.text(t as Text);
  }

  private text(node: Text) {
    const parent = node.parentElement;
    if (this.skipped(parent) || parent!.closest(RAW)) return;
    if (this.texts.get(node)?.en === node.data) return;
    const en = this.tr(node.data);
    if (en === null || en === node.data.trim()) {
      this.texts.delete(node);
      return;
    }
    // an <option> without value takes it from its text: keep the Italian one for the form
    if (parent instanceof HTMLOptionElement && !parent.hasAttribute('value')) parent.setAttribute('value', node.data);
    const lead = /^\s*/.exec(node.data)![0];
    const trail = /\s*$/.exec(node.data)![0];
    const out = lead + en + trail;
    this.texts.set(node, { it: node.data, en: out });
    node.data = out;
  }

  private attr(el: Element, name: string) {
    const v = el.getAttribute(name);
    if (!v) return;
    const en = this.tr(v);
    if (en === null || en === v) return;
    const saved = this.attrs.get(el) ?? {};
    saved[name] = v;
    this.attrs.set(el, saved);
    el.setAttribute(name, en);
  }
}

let active: DomTranslator | null = null;

export function setLanguage(lang: Language) {
  document.documentElement.lang = lang;
  if (lang === 'en') {
    active ??= new DomTranslator(EN_TEXT);
    active.start();
  } else active?.stop();
}

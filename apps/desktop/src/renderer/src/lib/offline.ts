import type { JournalEntry } from '@thevtt/shared';
import { localStore } from './platform';

/**
 * A copy, on this PC, of what the group's server last said: campaigns,
 * characters, journal, recaps, chat. When the GM's computer is off the app
 * reads from it; journal pages written meanwhile wait in an outbox and go
 * out as soon as the server answers again.
 */

export type OutboxOp =
  | { op: 'create'; localId: string; body: { title?: string; body?: string; campaignId?: string | null } }
  | { op: 'update'; id: string; patch: { title?: string; body?: string; campaignId?: string | null } }
  | { op: 'delete'; id: string };

interface Saved {
  userId: string | null;
  savedAt: Record<string, number>;
  entries: Record<string, unknown>;
  outbox: OutboxOp[];
  /** pages created offline and since saved: local id → server id */
  ids?: Record<string, string>;
}

const LOCAL_PREFIX = 'local-';
export const isLocalId = (id: string) => id.startsWith(LOCAL_PREFIX);

/** GET answers not worth keeping: they only make sense live */
const SKIP = [/^\/health$/, /^\/rtc\//, /^\/users\/search/, /^\/chat\/unread$/];

export class OfflineCache {
  private data: Saved = { userId: null, savedAt: {}, entries: {}, outbox: [] };
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  readonly ready: Promise<void>;

  constructor(private readonly key: string) {
    this.ready = localStore
      .read<Saved>(this.storeKey)
      .then((saved) => {
        if (saved && typeof saved === 'object' && saved.entries) this.data = { userId: saved.userId ?? null, savedAt: saved.savedAt ?? {}, entries: saved.entries, outbox: saved.outbox ?? [], ids: saved.ids ?? {} };
      })
      .catch(() => undefined);
  }

  private get storeKey() {
    // one file per group (or server address), whatever its current address
    let h = 0;
    for (const ch of this.key) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    return `offline-${(h >>> 0).toString(36)}`;
  }

  private persist() {
    // grouped (a page asks for several things at once), and never lost when the window closes
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush(), 300);
  }

  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    void localStore.write(this.storeKey, this.data);
  }

  keeps(path: string): boolean {
    return !SKIP.some((re) => re.test(path));
  }

  get<T>(path: string): { value: T; savedAt: number } | null {
    return path in this.data.entries ? { value: this.data.entries[path] as T, savedAt: this.data.savedAt[path] ?? 0 } : null;
  }

  put(path: string, value: unknown): void {
    // another account on this PC: start over, never mix two people's data
    if (path === '/me') {
      const id = (value as { id?: string } | null)?.id ?? null;
      if (this.data.userId && id && this.data.userId !== id) this.data = { userId: id, savedAt: {}, entries: {}, outbox: [] };
      this.data.userId = id;
    }
    this.data.entries[path] = value;
    this.data.savedAt[path] = Date.now();
    this.persist();
  }

  clear(): void {
    this.data = { userId: null, savedAt: {}, entries: {}, outbox: [] };
    this.persist();
  }

  // ---------- journal written offline ----------

  get pending(): number {
    return this.data.outbox.length;
  }

  outbox(): OutboxOp[] {
    return [...this.data.outbox];
  }

  setOutbox(ops: OutboxOp[]): void {
    this.data.outbox = ops;
    this.persist();
  }

  /** The server's id for a page created offline, once it has been sent. */
  realId(id: string): string {
    return this.data.ids?.[id] ?? id;
  }

  mapId(localId: string, realId: string): void {
    this.data.ids = { ...this.data.ids, [localId]: realId };
    this.persist();
  }

  private journal(): JournalEntry[] {
    return (this.data.entries['/journal'] as JournalEntry[] | undefined) ?? [];
  }

  private setJournal(list: JournalEntry[]) {
    this.data.entries['/journal'] = list;
    this.persist();
  }

  queueCreate(body: { title?: string; body?: string; campaignId?: string | null }): JournalEntry {
    const now = new Date().toISOString();
    const entry: JournalEntry = { id: `${LOCAL_PREFIX}${crypto.randomUUID()}`, campaignId: body.campaignId ?? null, title: body.title || 'Nuova pagina', body: body.body ?? '', createdAt: now, updatedAt: now };
    this.data.outbox.push({ op: 'create', localId: entry.id, body });
    this.setJournal([entry, ...this.journal()]);
    return entry;
  }

  queueUpdate(id: string, patch: { title?: string; body?: string; campaignId?: string | null }): JournalEntry {
    const list = this.journal();
    const cur = list.find((e) => e.id === id);
    if (!cur) throw new Error('Pagina non trovata');
    const next: JournalEntry = { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)), updatedAt: new Date().toISOString() };
    // a page created offline just carries its latest text
    const create = this.data.outbox.find((o) => o.op === 'create' && o.localId === id);
    const update = this.data.outbox.find((o) => o.op === 'update' && o.id === id);
    if (create && create.op === 'create') create.body = { ...create.body, ...patch };
    else if (update && update.op === 'update') update.patch = { ...update.patch, ...patch };
    else this.data.outbox.push({ op: 'update', id, patch });
    this.setJournal(list.map((e) => (e.id === id ? next : e)));
    return next;
  }

  queueDelete(id: string): void {
    if (isLocalId(id)) this.data.outbox = this.data.outbox.filter((o) => !(o.op === 'create' && o.localId === id) && !(o.op === 'update' && o.id === id));
    else this.data.outbox.push({ op: 'delete', id });
    this.setJournal(this.journal().filter((e) => e.id !== id));
  }
}

const caches = new Map<string, OfflineCache>();
export function offlineCache(key: string): OfflineCache {
  let c = caches.get(key);
  if (!c) {
    c = new OfflineCache(key);
    caches.set(key, c);
    const cache = c;
    window.addEventListener('pagehide', () => cache.flush());
  }
  return c;
}

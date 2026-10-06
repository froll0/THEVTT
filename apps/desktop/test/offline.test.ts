import { describe, expect, it, vi } from 'vitest';

const stored = new Map<string, unknown>();
vi.mock('../src/renderer/src/lib/platform', () => ({
  localStore: {
    read: async (k: string) => stored.get(k) ?? null,
    write: async (k: string, v: unknown) => void stored.set(k, structuredClone(v)),
  },
}));

const { OfflineCache, isLocalId } = await import('../src/renderer/src/lib/offline');

describe('offline copy', () => {
  it('keeps what the server said, per account', async () => {
    const c = new OfflineCache('ABCD-EFGH');
    await c.ready;
    c.put('/me', { id: 'u1' });
    c.put('/campaigns', [{ id: 'c1' }]);
    expect(c.get('/campaigns')?.value).toEqual([{ id: 'c1' }]);
    expect(c.keeps('/users/search?q=x')).toBe(false);
    // someone else signs in on this PC: nothing of the first account remains
    c.put('/me', { id: 'u2' });
    expect(c.get('/campaigns')).toBeNull();
  });

  it('queues journal pages written offline, compactly', async () => {
    const c = new OfflineCache('group-2');
    await c.ready;
    c.put('/journal', [{ id: 'p1', campaignId: null, title: 'Vecchia', body: '', createdAt: '', updatedAt: '' }]);
    const page = c.queueCreate({ title: 'Nuova', body: '<p>a</p>' });
    expect(isLocalId(page.id)).toBe(true);
    c.queueUpdate(page.id, { body: '<p>ab</p>' });
    c.queueUpdate('p1', { title: 'Vecchia 1' });
    c.queueUpdate('p1', { title: 'Vecchia 2' });
    expect(c.outbox()).toEqual([
      { op: 'create', localId: page.id, body: { title: 'Nuova', body: '<p>ab</p>' } },
      { op: 'update', id: 'p1', patch: { title: 'Vecchia 2' } },
    ]);
    expect((c.get<{ title: string }[]>('/journal')!.value).map((e) => e.title)).toEqual(['Nuova', 'Vecchia 2']);
    // a page made and dropped offline never existed for the server
    c.queueDelete(page.id);
    expect(c.outbox()).toEqual([{ op: 'update', id: 'p1', patch: { title: 'Vecchia 2' } }]);
    c.mapId('local-x', 'srv-1');
    expect(c.realId('local-x')).toBe('srv-1');
  });
});

import type { WikiPage } from '@thevtt/shared';
import { create } from 'zustand';
import { useApp } from './app';

/** The campaigns' wikis, by campaign id: loaded when opened, refreshed when the GM changes them. */
interface WikiStore {
  pages: Record<string, WikiPage[]>;
  load(campaignId: string): Promise<void>;
  /** after a change pushed by the server: only the wikis already open */
  changed(campaignId: string): void;
  save(campaignId: string, page: Partial<WikiPage> & { id?: string }): Promise<WikiPage>;
  remove(campaignId: string, id: string): Promise<void>;
}

/** newest request per campaign: an older answer landing late is dropped */
const asked: Record<string, number> = {};

export const useWiki = create<WikiStore>((set, get) => ({
  pages: {},
  async load(campaignId) {
    const mine = (asked[campaignId] = (asked[campaignId] ?? 0) + 1);
    const list = await useApp.getState().api.wiki(campaignId);
    if (asked[campaignId] === mine) set((s) => ({ pages: { ...s.pages, [campaignId]: list } }));
  },
  changed(campaignId) {
    if (get().pages[campaignId]) void get().load(campaignId).catch(() => undefined);
  },
  async save(campaignId, page) {
    const { api } = useApp.getState();
    const body = { title: page.title, kind: page.kind, body: page.body, secret: page.secret, visible: page.visible };
    const saved = page.id ? await api.updateWikiPage(campaignId, page.id, body) : await api.createWikiPage(campaignId, body);
    asked[campaignId] = (asked[campaignId] ?? 0) + 1;
    set((s) => {
      const list = s.pages[campaignId] ?? [];
      const next = list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved];
      return { pages: { ...s.pages, [campaignId]: next.sort((a, b) => a.title.localeCompare(b.title, 'it')) } };
    });
    return saved;
  },
  async remove(campaignId, id) {
    await useApp.getState().api.deleteWikiPage(campaignId, id);
    asked[campaignId] = (asked[campaignId] ?? 0) + 1;
    set((s) => ({ pages: { ...s.pages, [campaignId]: (s.pages[campaignId] ?? []).filter((p) => p.id !== id) } }));
  },
}));

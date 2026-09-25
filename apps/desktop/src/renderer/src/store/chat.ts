import type { ChatMessage } from '@thevtt/shared';
import { create } from 'zustand';
import { useApp } from './app';

/** Chat outside the table: campaign channels and direct messages. */
interface ChatStore {
  unread: Record<string, number>;
  threads: Record<string, ChatMessage[]>;
  /** the channel on screen: its messages count as read */
  open: string | null;
  loadUnread(): Promise<void>;
  openThread(channel: string | null): Promise<void>;
  send(channel: string, text: string): Promise<void>;
  receive(m: ChatMessage): void;
  reset(): void;
}

export const useChat = create<ChatStore>((set, get) => ({
  unread: {},
  threads: {},
  open: null,
  async loadUnread() {
    const unread = await useApp.getState().api.unread().catch(() => null);
    if (unread) set({ unread });
  },
  async openThread(channel) {
    set({ open: channel });
    if (!channel) return;
    const { api } = useApp.getState();
    const messages = await api.messages(channel).catch(() => null);
    if (messages && get().open === channel) set((s) => ({ threads: { ...s.threads, [channel]: messages } }));
    if (get().unread[channel]) {
      set((s) => ({ unread: { ...s.unread, [channel]: 0 } }));
      void api.markRead(channel).catch(() => undefined);
    }
  },
  async send(channel, text) {
    const m = await useApp.getState().api.sendMessage(channel, text);
    get().receive(m);
  },
  receive(m) {
    set((s) => {
      const list = s.threads[m.channel];
      const threads = list && !list.some((x) => x.id === m.id) ? { ...s.threads, [m.channel]: [...list, m] } : s.threads;
      const mine = m.authorId === useApp.getState().user?.id;
      const unread = s.open === m.channel || mine ? s.unread : { ...s.unread, [m.channel]: (s.unread[m.channel] ?? 0) + 1 };
      return { threads, unread };
    });
    if (get().open === m.channel && m.authorId !== useApp.getState().user?.id) void useApp.getState().api.markRead(m.channel).catch(() => undefined);
  },
  reset: () => set({ unread: {}, threads: {}, open: null }),
}));

/** Unread messages across channels of one kind ("campaign:" or "dm:"). */
export const unreadOf = (unread: Record<string, number>, prefix: string) =>
  Object.entries(unread).reduce((n, [k, v]) => (k.startsWith(prefix) ? n + v : n), 0);

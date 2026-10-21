import type { ChatMessage } from '@thevtt/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// a slow server: every answer waits until the test lets it go
const pending: (() => void)[] = [];
const later = <T>(value: T) => new Promise<T>((resolve) => pending.push(() => resolve(value)));
const flush = async () => {
  while (pending.length) pending.shift()!();
  await new Promise((r) => setTimeout(r, 0));
};

const history: ChatMessage[] = [{ id: 'a', channel: 'dm:x', authorId: 'giulia', text: 'ciao', createdAt: '2026-10-20T10:00:00.000Z' }];
const api = {
  messages: vi.fn(() => later(history)),
  unread: vi.fn(() => later({ 'dm:x': 0, 'campaign:c': 0 })),
  markRead: vi.fn(() => Promise.resolve()),
};
vi.mock('../src/renderer/src/store/app', () => ({ useApp: { getState: () => ({ api, user: { id: 'marco' } }) } }));

const { useChat } = await import('../src/renderer/src/store/chat');
const msg = (id: string, channel: string, at: string): ChatMessage => ({ id, channel, authorId: 'giulia', text: id, createdAt: at });

describe('chat on a slow network', () => {
  beforeEach(() => useChat.getState().reset());

  it('keeps a message that arrives while the conversation is loading', async () => {
    const opening = useChat.getState().openThread('dm:x');
    useChat.getState().receive(msg('b', 'dm:x', '2026-10-20T10:01:00.000Z'));
    await flush();
    await opening;
    expect(useChat.getState().threads['dm:x']!.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('a count fetched before a new message does not hide it', async () => {
    const loading = useChat.getState().loadUnread();
    useChat.getState().receive(msg('c', 'campaign:c', '2026-10-20T10:02:00.000Z'));
    await flush();
    await loading;
    expect(useChat.getState().unread['campaign:c']).toBe(1);
  });
});

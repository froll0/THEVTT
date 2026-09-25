import type { Campaign, CampaignInvite, CharacterRecord, FriendEntry, Notification, SessionInfo, UserPublic } from '@thevtt/shared';
import { create } from 'zustand';
import { Api } from '../lib/api';
import { bridge } from '../lib/platform';
import { Realtime, type ConnectionStatus } from '../lib/realtime';

export type Route =
  | { name: 'home' }
  | { name: 'campaigns' }
  | { name: 'campaign'; id: string }
  | { name: 'characters' }
  | { name: 'character'; id: string | null; systemId?: string; assignTo?: string }
  | { name: 'friends' }
  | { name: 'compendium' }
  | { name: 'journal' }
  | { name: 'settings'; section?: SettingsSection }
  | { name: 'table'; campaignId: string };

export type SettingsSection = 'appearance' | 'table' | 'server' | 'account' | 'advanced';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

const SERVER_KEY = 'thevtt:server';
const TOKEN_KEY = 'thevtt:token';
const GROUP_KEY = 'thevtt:group';
// an empty build variable (e.g. unset in CI) must not produce an empty address
export const DEFAULT_SERVER = import.meta.env.VITE_THEVTT_SERVER || 'http://localhost:4477';

interface AppState {
  serverUrl: string;
  /** group code the server was found with: its address may change, the code doesn't */
  groupCode: string | null;
  api: Api;
  rt: Realtime | null;
  status: ConnectionStatus;
  user: UserPublic | null;
  booting: boolean;
  route: Route;
  friends: FriendEntry[];
  invites: CampaignInvite[];
  campaigns: Campaign[];
  characters: CharacterRecord[];
  sessions: Record<string, SessionInfo>;
  toasts: Toast[];

  boot(): Promise<void>;
  setServer(url: string, groupCode?: string | null): void;
  authenticate(mode: 'login' | 'register', username: string, password: string, displayName?: string): Promise<void>;
  logout(): Promise<void>;
  go(route: Route): void;
  toast(text: string, tone?: Toast['tone']): void;
  dismissToast(id: number): void;
  refresh(what?: ('friends' | 'invites' | 'campaigns' | 'characters')[]): Promise<void>;
  upsertCampaign(c: Campaign): void;
  upsertCharacter(c: CharacterRecord): void;
  setUser(u: UserPublic): void;
  /** wraps an async action with an error toast */
  run<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined>;
}

let toastSeq = 0;

/** Asks the relay for the current address behind a group code (desktop only). */
async function lookupGroup(code: string): Promise<string | null> {
  const res = await bridge?.resolveGroupCode(code).catch(() => null);
  return res && 'url' in res ? res.url : null;
}

export const useApp = create<AppState>((set, get) => {
  const makeApi = (url: string, token: string | null) => new Api(url, token, () => void get().logout());

  /** The GM restarted and got a new address: follow it, keeping the session. */
  const followGroup = async () => {
    const code = get().groupCode;
    if (!code) return false;
    const url = await lookupGroup(code);
    if (!url || url === get().serverUrl) return false;
    localStorage.setItem(SERVER_KEY, url);
    set({ serverUrl: url, api: makeApi(url, localStorage.getItem(TOKEN_KEY)) });
    return true;
  };

  let lookupTimer: ReturnType<typeof setTimeout> | null = null;
  const connect = () => {
    get().rt?.close();
    const rt = new Realtime(get().api.wsUrl);
    rt.onStatus((status) => {
      set({ status });
      // cut off for a while: maybe the GM's server moved to a new address
      if (status === 'online' || !get().groupCode) {
        if (lookupTimer) clearTimeout(lookupTimer);
        lookupTimer = null;
      } else if (!lookupTimer) {
        lookupTimer = setTimeout(async () => {
          lookupTimer = null;
          if (get().rt === rt && get().status !== 'online' && (await followGroup())) connect();
        }, 8000);
      }
    });
    rt.on((msg) => {
      switch (msg.t) {
        case 'hello':
          set({ user: msg.user });
          void get().refresh();
          void import('./chat').then(({ useChat }) => useChat.getState().loadUnread());
          break;
        case 'presence':
          set((s) => ({
            friends: s.friends.map((f) => (f.user.id === msg.userId ? { ...f, user: { ...f.user, online: msg.online } } : f)),
          }));
          break;
        case 'session.state':
          set((s) => {
            const sessions = { ...s.sessions };
            if (msg.session) sessions[msg.campaignId] = msg.session;
            else delete sessions[msg.campaignId];
            return { sessions, campaigns: s.campaigns.map((c) => (c.id === msg.campaignId ? { ...c, session: msg.session } : c)) };
          });
          break;
        case 'notify':
          onNotification(msg.notification);
          break;
        case 'error':
          get().toast(msg.message, 'error');
          break;
      }
    });
    set({ rt });
  };

  const onNotification = (n: Notification) => {
    const { toast, refresh, route, go } = get();
    switch (n.kind) {
      case 'friend.request':
        toast(`${n.from.displayName} ti ha chiesto l'amicizia`);
        void refresh(['friends']);
        break;
      case 'friend.accepted':
        toast(`${n.by.displayName} ha accettato l'amicizia`, 'success');
        void refresh(['friends']);
        break;
      case 'friend.removed':
        void refresh(['friends']);
        break;
      case 'chat.message':
        void import('./chat').then(({ useChat }) => {
          useChat.getState().receive(n.message);
          // a toast only when the conversation isn't already on screen
          if (useChat.getState().open !== n.message.channel) {
            const author = get().friends.find((f) => f.user.id === n.message.authorId)?.user.displayName
              ?? get().campaigns.flatMap((c) => c.members).find((m) => m.user.id === n.message.authorId)?.user.displayName
              ?? 'Nuovo messaggio';
            toast(`${author}: ${n.message.text.slice(0, 80)}`);
          }
        });
        break;
      case 'session.scheduled':
        toast(n.at ? `«${n.campaignName}»: prossima sessione ${new Date(n.at).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : `«${n.campaignName}»: sessione annullata`);
        void refresh(['campaigns']);
        break;
      case 'invite.received':
        toast(`${n.from.displayName} ti ha invitato in «${n.campaignName}»`);
        void refresh(['invites']);
        break;
      case 'campaign.updated':
        void refresh(['campaigns']);
        break;
      case 'campaign.deleted':
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== n.campaignId) }));
        if ((route.name === 'campaign' && route.id === n.campaignId) || (route.name === 'table' && route.campaignId === n.campaignId)) {
          toast('Non fai più parte di questa campagna', 'error');
          go({ name: 'campaigns' });
        }
        break;
    }
  };

  const serverUrl = localStorage.getItem(SERVER_KEY) ?? DEFAULT_SERVER;

  return {
    serverUrl,
    groupCode: localStorage.getItem(GROUP_KEY),
    api: makeApi(serverUrl, localStorage.getItem(TOKEN_KEY)),
    rt: null,
    status: 'offline',
    user: null,
    booting: true,
    route: { name: 'home' },
    friends: [],
    invites: [],
    campaigns: [],
    characters: [],
    sessions: {},
    toasts: [],

    async boot() {
      if (!localStorage.getItem(TOKEN_KEY)) return set({ booting: false });
      // the address saved last time may be stale: ask where the group is now
      await Promise.race([followGroup(), new Promise((r) => setTimeout(r, 4000))]).catch(() => undefined);
      try {
        const user = await get().api.me();
        set({ user });
        connect();
        await get().refresh();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        get().api.setToken(null);
      } finally {
        set({ booting: false });
      }
    },

    setServer(url, groupCode) {
      const clean = url.trim().replace(/\/+$/, '');
      localStorage.setItem(SERVER_KEY, clean);
      if (groupCode !== undefined) {
        if (groupCode) localStorage.setItem(GROUP_KEY, groupCode);
        else localStorage.removeItem(GROUP_KEY);
      }
      set({ serverUrl: clean, api: makeApi(clean, null), ...(groupCode !== undefined ? { groupCode } : {}) });
    },

    async authenticate(mode, username, password, displayName) {
      const { api } = get();
      const res = mode === 'login' ? await api.login(username, password) : await api.register(username, password, displayName);
      localStorage.setItem(TOKEN_KEY, res.token);
      api.setToken(res.token);
      set({ user: res.user, route: { name: 'home' } });
      connect();
      await get().refresh();
    },

    async logout() {
      const { api, rt } = get();
      rt?.close();
      void import('./chat').then(({ useChat }) => useChat.getState().reset());
      await api.logout().catch(() => undefined);
      localStorage.removeItem(TOKEN_KEY);
      api.setToken(null);
      set({ user: null, rt: null, friends: [], invites: [], campaigns: [], characters: [], sessions: {}, route: { name: 'home' } });
    },

    go: (route) => set({ route }),

    toast(text, tone = 'info') {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
      setTimeout(() => get().dismissToast(id), tone === 'error' ? 6000 : 4000);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    async refresh(what = ['friends', 'invites', 'campaigns', 'characters']) {
      const { api } = get();
      const tasks = what.map(async (w) => {
        if (w === 'friends') set({ friends: await api.friends() });
        if (w === 'invites') set({ invites: await api.invites() });
        if (w === 'characters') set({ characters: await api.characters() });
        if (w === 'campaigns') {
          const campaigns = await api.campaigns();
          const sessions: Record<string, SessionInfo> = {};
          for (const c of campaigns) if (c.session) sessions[c.id] = c.session;
          set({ campaigns, sessions });
        }
      });
      await Promise.allSettled(tasks);
    },

    upsertCampaign: (c) =>
      set((s) => ({ campaigns: s.campaigns.some((x) => x.id === c.id) ? s.campaigns.map((x) => (x.id === c.id ? c : x)) : [...s.campaigns, c] })),
    upsertCharacter: (c) =>
      set((s) => ({ characters: s.characters.some((x) => x.id === c.id) ? s.characters.map((x) => (x.id === c.id ? c : x)) : [c, ...s.characters] })),
    setUser: (user) => set({ user }),

    async run(fn, success) {
      try {
        const out = await fn();
        if (success) get().toast(success, 'success');
        return out;
      } catch (e) {
        get().toast(e instanceof Error ? e.message : 'Errore', 'error');
        return undefined;
      }
    },
  };
});

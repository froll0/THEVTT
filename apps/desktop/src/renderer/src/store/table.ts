import {
  createInitialState,
  GameHost,
  newId,
  type Campaign,
  type GameAction,
  type GameState,
  type HostToPlayer,
  type PlayerToHost,
  type TableCharacter,
} from '@thevtt/shared';
import { create } from 'zustand';
import { localStore } from '../lib/platform';
import { useApp } from './app';

export interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  at: number;
}

type Phase = 'idle' | 'connecting' | 'live' | 'waiting';

interface SavedTable {
  state: GameState;
  assets: Record<string, string>;
}

interface TableStore {
  campaignId: string | null;
  role: 'gm' | 'player' | null;
  phase: Phase;
  state: GameState | null;
  assets: Record<string, string>;
  pings: Ping[];
  selectedTokenId: string | null;

  host(campaign: Campaign): Promise<void>;
  join(campaign: Campaign): void;
  leave(): void;
  dispatch(action: GameAction): void;
  select(tokenId: string | null): void;
}

// Session plumbing lives outside React state.
let host: GameHost | null = null;
let cleanup: (() => void)[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const charTimers = new Map<string, ReturnType<typeof setTimeout>>();

const saveKey = (campaignId: string) => `table-${campaignId}`;

export const useTable = create<TableStore>((set, get) => {
  const apply = (msg: HostToPlayer) => {
    switch (msg.k) {
      case 'state':
        set({ state: msg.state, phase: 'live' });
        break;
      case 'asset':
        set((s) => ({ assets: { ...s.assets, [msg.id]: msg.dataUrl } }));
        break;
      case 'rejected':
        useApp.getState().toast(msg.reason, 'error');
        break;
      case 'ping': {
        const ping: Ping = { id: newId(), x: msg.x, y: msg.y, color: msg.color, at: performance.now() };
        set((s) => ({ pings: [...s.pings.filter((p) => performance.now() - p.at < 2000), ping] }));
        break;
      }
    }
  };

  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!host) return;
      const saved: SavedTable = { state: host.state, assets: { ...host.assetStore } };
      void localStore.write(saveKey(host.state.campaignId), saved);
    }, 800);
  };

  const syncCharacter = (ch: TableCharacter) => {
    const prev = charTimers.get(ch.id);
    if (prev) clearTimeout(prev);
    charTimers.set(
      ch.id,
      setTimeout(() => {
        const { api, upsertCharacter } = useApp.getState();
        void api
          .updateCharacter(ch.id, { name: ch.name, systemId: ch.systemId, data: ch.data })
          .then((rec) => {
            if (rec.ownerId === useApp.getState().user?.id) upsertCharacter(rec);
          })
          .catch(() => undefined);
      }, 1500),
    );
  };

  const syncRoster = async (campaignId: string) => {
    if (!host) return;
    const { api } = useApp.getState();
    const [campaign, characters] = await Promise.all([api.campaign(campaignId), api.campaignCharacters(campaignId)]);
    if (!host) return;
    const memberIds = new Set(campaign.members.map((m) => m.user.id));
    for (const id of Object.keys(host.state.players)) if (!memberIds.has(id)) host.removePlayer(id);
    for (const m of campaign.members) {
      if (m.role === 'gm') continue;
      host.upsertPlayer({ id: m.user.id, displayName: m.user.displayName, color: m.user.avatarColor, characterId: m.characterId });
    }
    for (const c of characters) host.upsertCharacter({ id: c.id, ownerId: c.ownerId, name: c.name, systemId: c.systemId, data: c.data });
    host.state.campaignName = campaign.name;
    host.broadcast();
    persist();
  };

  const teardown = () => {
    for (const fn of cleanup) fn();
    cleanup = [];
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (host) void localStore.write(saveKey(host.state.campaignId), { state: host.state, assets: { ...host.assetStore } });
    }
    host = null;
  };

  return {
    campaignId: null,
    role: null,
    phase: 'idle',
    state: null,
    assets: {},
    pings: [],
    selectedTokenId: null,

    async host(campaign) {
      teardown();
      const { rt, user } = useApp.getState();
      if (!rt || !user) return;
      set({ campaignId: campaign.id, role: 'gm', phase: 'connecting', state: null, assets: {}, pings: [], selectedTokenId: null });

      const saved = await localStore.read<SavedTable>(saveKey(campaign.id));
      const state =
        saved?.state ??
        createInitialState({ campaignId: campaign.id, campaignName: campaign.name, systemId: campaign.systemId, gmId: user.id, sceneId: newId() });
      state.gmId = user.id;
      for (const p of Object.values(state.players)) p.online = false;

      const me = user.id;
      host = new GameHost({
        state,
        assets: saved?.assets,
        send: (to, msg) => {
          if (to === me) apply(msg);
          else rt.send({ t: 'relay.peer', campaignId: campaign.id, to, payload: msg });
        },
        onChange: persist,
        onCharacterChange: syncCharacter,
      });
      set({ assets: { ...host.assetStore } });

      cleanup.push(
        rt.on((msg) => {
          if (!host) return;
          if (msg.t === 'relay' && msg.campaignId === campaign.id) host.handle(msg.from, msg.payload as PlayerToHost);
          if (msg.t === 'session.peer' && msg.campaignId === campaign.id && !msg.joined && host.isConnected(msg.userId)) host.disconnect(msg.userId);
          if (msg.t === 'notify' && msg.notification.kind === 'campaign.updated' && msg.notification.campaignId === campaign.id) {
            void syncRoster(campaign.id);
          }
        }),
        rt.onStatus((s) => {
          if (s === 'online') rt.send({ t: 'session.start', campaignId: campaign.id });
        }),
        () => rt.send({ t: 'session.stop', campaignId: campaign.id }),
      );

      await syncRoster(campaign.id).catch(() => undefined);
      rt.send({ t: 'session.start', campaignId: campaign.id });
      host.connect(me);
    },

    join(campaign) {
      teardown();
      const { rt } = useApp.getState();
      if (!rt) return;
      set({ campaignId: campaign.id, role: 'player', phase: 'connecting', state: null, assets: {}, pings: [], selectedTokenId: null });
      const hello = () => {
        rt.send({ t: 'session.join', campaignId: campaign.id });
        const payload: PlayerToHost = { k: 'hello' };
        rt.send({ t: 'relay.host', campaignId: campaign.id, payload });
      };
      cleanup.push(
        rt.on((msg) => {
          if (msg.t === 'relay' && msg.campaignId === campaign.id) apply(msg.payload as HostToPlayer);
          if (msg.t === 'session.state' && msg.campaignId === campaign.id) {
            if (!msg.session) set({ phase: 'waiting' });
            else if (get().phase === 'waiting') {
              set({ phase: 'connecting' });
              hello();
            }
          }
        }),
        rt.onStatus((s) => {
          if (s === 'online') hello();
        }),
        () => rt.send({ t: 'session.leave', campaignId: campaign.id }),
      );
      if (campaign.session) hello();
      else set({ phase: 'waiting' });
    },

    leave() {
      teardown();
      set({ campaignId: null, role: null, phase: 'idle', state: null, assets: {}, pings: [], selectedTokenId: null });
    },

    dispatch(action) {
      const { campaignId, role } = get();
      const me = useApp.getState().user?.id;
      if (!campaignId || !me) return;
      if (role === 'gm' && host) {
        const res = host.dispatch(me, action);
        if (!res.ok) useApp.getState().toast(res.reason, 'error');
        if (action.type === 'asset.add') set({ assets: { ...host.assetStore } });
        return;
      }
      const payload: PlayerToHost = { k: 'action', action };
      useApp.getState().rt?.send({ t: 'relay.host', campaignId, payload });
    },

    select: (selectedTokenId) => set({ selectedTokenId }),
  };
});

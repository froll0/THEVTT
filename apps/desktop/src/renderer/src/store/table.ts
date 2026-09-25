import {
  createInitialState,
  GameHost,
  newId,
  type Campaign,
  type GameAction,
  type GameState,
  type HostToPlayer,
  type PlayerToHost,
  type RtcConfig,
  type TableCharacter,
} from '@thevtt/shared';
import { create } from 'zustand';
import { FALLBACK_ICE, PeerLink } from '../lib/p2p';
import { localStore } from '../lib/platform';
import { useApp } from './app';
import { useSettings } from './settings';

export interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  at: number;
}

type Phase = 'idle' | 'connecting' | 'live' | 'waiting';
/** how a peer is reached: direct WebRTC link or the server relay */
export type Route = 'p2p' | 'relay';

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
  /** GM: scenery object being edited */
  selectedPropId: string | null;
  /** GM: door or wall being edited */
  selectedWallId: string | null;
  /** host: route per player · player: route to the host */
  routes: Record<string, Route>;
  /** host clock minus local clock (ms), to follow the shared music */
  clockOffset: number;

  host(campaign: Campaign): Promise<void>;
  join(campaign: Campaign): void;
  leave(): void;
  dispatch(action: GameAction): void;
  select(tokenId: string | null): void;
  /** the next token to appear (one we just asked for) gets selected */
  selectNextToken(): void;
  selectProp(propId: string | null): void;
  selectWall(wallId: string | null): void;
}

// Session plumbing lives outside React state.
let host: GameHost | null = null;
let cleanup: (() => void)[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** direct links: host → one per player, player → one to the host */
const links = new Map<string, PeerLink>();
let lastRev = 0;
/** token ids known when we asked for a new token */
let awaitingToken: Set<string> | null = null;
const charTimers = new Map<string, ReturnType<typeof setTimeout>>();

const saveKey = (campaignId: string) => `table-${campaignId}`;

/** Players: a toast when someone shares a note or handout with you. */
function announceNotes(prev: GameState | null, next: GameState) {
  if (!prev || prev.campaignId !== next.campaignId) return;
  const me = useApp.getState().user?.id;
  if (!me || me === next.gmId) return;
  for (const n of Object.values(next.notes ?? {})) {
    if (n.authorId !== me && !prev.notes?.[n.id]) useApp.getState().toast(`Nuova dispensa: ${n.title}`);
  }
}

export const useTable = create<TableStore>((set, get) => {
  const apply = (msg: HostToPlayer) => {
    switch (msg.k) {
      case 'state':
        // snapshots may arrive through both relay and direct link while switching
        if (msg.rev <= lastRev) break;
        lastRev = msg.rev;
        announceNotes(get().state, msg.state);
        set({ state: msg.state, phase: 'live', ...(msg.now ? { clockOffset: msg.now - Date.now() } : {}) });
        if (awaitingToken) {
          const known = awaitingToken;
          const created = Object.keys(msg.state.tokens).find((id) => !known.has(id));
          if (created) {
            awaitingToken = null;
            get().select(created);
          }
        }
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

  const iceServers = () =>
    useApp
      .getState()
      .api.rtcConfig()
      .then((c) => c.iceServers)
      .catch(() => FALLBACK_ICE);

  const setRoute = (userId: string, route: Route | null) =>
    set((s) => {
      const routes = { ...s.routes };
      if (route) routes[userId] = route;
      else delete routes[userId];
      return { routes };
    });

  const openLink = (campaignId: string, peerId: string, initiator: boolean, ice: RtcConfig['iceServers'], onMessage: (p: unknown) => void, onClosed?: () => void) => {
    // detach the previous link first, so its closing doesn't trigger fallbacks/retries
    const previous = links.get(peerId);
    links.delete(peerId);
    previous?.close(true);
    const { rt } = useApp.getState();
    const link: PeerLink = new PeerLink({
      initiator,
      iceServers: ice,
      signal: (data) => rt?.send({ t: 'rtc.signal', campaignId, to: peerId, data }),
      onMessage,
      onState: (st) => {
        if (links.get(peerId) !== link) return;
        if (st === 'open') setRoute(peerId, 'p2p');
        if (st === 'closed') {
          links.delete(peerId);
          setRoute(peerId, 'relay');
          onClosed?.();
        }
      },
    });
    links.set(peerId, link);
    return link;
  };

  const closeLinks = () => {
    const all = [...links.values()];
    links.clear();
    for (const l of all) l.close(true);
  };

  const teardown = () => {
    for (const fn of cleanup) fn();
    cleanup = [];
    closeLinks();
    lastRev = 0;
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
    selectedPropId: null,
    selectedWallId: null,
    routes: {},
    clockOffset: 0,

    async host(campaign) {
      teardown();
      const { rt, user } = useApp.getState();
      if (!rt || !user) return;
      set({ campaignId: campaign.id, role: 'gm', phase: 'connecting', state: null, assets: {}, pings: [], selectedTokenId: null, selectedPropId: null, selectedWallId: null, routes: {} });

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
          else if (!links.get(to)?.send(msg)) rt.send({ t: 'relay.peer', campaignId: campaign.id, to, payload: msg });
        },
        onChange: persist,
        onCharacterChange: syncCharacter,
      });
      set({ assets: { ...host.assetStore } });
      const ice = await iceServers();
      if (!host || get().campaignId !== campaign.id) return; // left while loading

      cleanup.push(
        rt.on((msg) => {
          if (!host) return;
          if (msg.t === 'relay' && msg.campaignId === campaign.id) host.handle(msg.from, msg.payload as PlayerToHost);
          if (msg.t === 'rtc.signal' && msg.campaignId === campaign.id) {
            const from = msg.from;
            if (msg.data.type === 'description' && msg.data.description.type === 'offer') {
              if (!useSettings.getState().directConnection) {
                rt.send({ t: 'rtc.signal', campaignId: campaign.id, to: from, data: { type: 'bye' } });
                return;
              }
              // a new offer always replaces the previous link with that player
              openLink(campaign.id, from, false, ice, (p) => host?.handle(from, p as PlayerToHost));
            }
            void links.get(from)?.handleSignal(msg.data);
          }
          if (msg.t === 'session.peer' && msg.campaignId === campaign.id && !msg.joined) {
            links.get(msg.userId)?.close(false);
            setRoute(msg.userId, null);
            if (host.isConnected(msg.userId)) host.disconnect(msg.userId);
          }
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
      set({ campaignId: campaign.id, role: 'player', phase: 'connecting', state: null, assets: {}, pings: [], selectedTokenId: null, selectedPropId: null, selectedWallId: null, routes: {} });
      let hostId = campaign.session?.hostId ?? campaign.gmId;
      let retries = 0;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      const icePromise = iceServers();

      const connectDirect = async () => {
        if (retryTimer) clearTimeout(retryTimer);
        if (!useSettings.getState().directConnection || get().campaignId !== campaign.id) return;
        const ice = await icePromise;
        if (get().campaignId !== campaign.id || get().phase === 'waiting') return;
        const target = hostId;
        openLink(campaign.id, target, true, ice, (p) => apply(p as HostToPlayer), () => {
          // the link dropped or never opened: keep playing on the relay and retry a few times
          if (retries++ < 3 && get().campaignId === campaign.id && get().phase !== 'waiting') {
            retryTimer = setTimeout(() => void connectDirect(), 4000 * retries);
          }
        });
      };

      const hello = () => {
        lastRev = 0;
        rt.send({ t: 'session.join', campaignId: campaign.id });
        const payload: PlayerToHost = { k: 'hello' };
        rt.send({ t: 'relay.host', campaignId: campaign.id, payload });
        retries = 0;
        void connectDirect();
      };
      cleanup.push(
        rt.on((msg) => {
          if (msg.t === 'relay' && msg.campaignId === campaign.id) apply(msg.payload as HostToPlayer);
          if (msg.t === 'rtc.signal' && msg.campaignId === campaign.id && msg.from === hostId) void links.get(hostId)?.handleSignal(msg.data);
          if (msg.t === 'session.state' && msg.campaignId === campaign.id) {
            if (!msg.session) {
              closeLinks();
              set({ phase: 'waiting', routes: {} });
            } else {
              hostId = msg.session.hostId;
              if (get().phase === 'waiting') {
                set({ phase: 'connecting' });
                hello();
              }
            }
          }
        }),
        () => {
          if (retryTimer) clearTimeout(retryTimer);
        },
        rt.onStatus((s) => {
          // the socket dropped (often because the GM's computer, which hosts the server, went away):
          // pause the table. On reconnect the server replays session.state, which resumes it.
          if (s !== 'online' && get().phase !== 'waiting') {
            closeLinks();
            set({ phase: 'waiting', routes: {} });
          }
        }),
        () => rt.send({ t: 'session.leave', campaignId: campaign.id }),
      );
      if (campaign.session) hello();
      else set({ phase: 'waiting' });
    },

    leave() {
      teardown();
      set({ campaignId: null, role: null, phase: 'idle', state: null, assets: {}, pings: [], selectedTokenId: null, selectedPropId: null, selectedWallId: null, routes: {} });
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
      const direct = [...links.values()][0];
      if (!direct?.send(payload)) useApp.getState().rt?.send({ t: 'relay.host', campaignId, payload });
    },

    select: (selectedTokenId) => set(selectedTokenId ? { selectedTokenId, selectedPropId: null, selectedWallId: null } : { selectedTokenId }),
    selectNextToken: () => {
      awaitingToken = new Set(Object.keys(get().state?.tokens ?? {}));
    },
    selectProp: (selectedPropId) => set(selectedPropId ? { selectedPropId, selectedTokenId: null, selectedWallId: null } : { selectedPropId }),
    selectWall: (selectedWallId) => set(selectedWallId ? { selectedWallId, selectedTokenId: null, selectedPropId: null } : { selectedWallId }),
  };
});

import type { AvState, RtcConfig, RtcSignal } from '@thevtt/shared';
import { create } from 'zustand';
import { CallPeer, LevelMeter, type CallLinkState } from '../lib/call';
import { FALLBACK_ICE } from '../lib/p2p';
import { bridge } from '../lib/platform';
import { useApp } from './app';
import { useSettings } from './settings';

/**
 * Voice and video at the table. Everyone in the call is linked to everyone
 * else directly (fine for a group around a table); the server only says who
 * is in the call and passes the negotiation along.
 */
interface CallStore {
  campaignId: string | null;
  joined: boolean;
  joining: boolean;
  mic: boolean;
  cam: boolean;
  /** who is in the call, as the server says (me included) */
  members: Record<string, AvState>;
  local: MediaStream | null;
  streams: Record<string, MediaStream>;
  links: Record<string, CallLinkState>;
  speaking: Record<string, boolean>;
  /** my microphone, 0..1, for the meter in the settings */
  myLevel: number;
  error: string | null;

  /** follows the call of a table (call when seated, the returned function when leaving) */
  attach(campaignId: string): () => void;
  join(withCamera?: boolean): Promise<void>;
  leave(): void;
  toggleMic(): Promise<void>;
  toggleCam(): Promise<void>;
  setVolume(userId: string, volume: number): void;
  /** after choosing another microphone, camera or speaker */
  applyDevices(): Promise<void>;
}

const peers = new Map<string, CallPeer>();
const players = new Map<string, HTMLAudioElement>();
let meter: LevelMeter | null = null;
let meterTimer: ReturnType<typeof setInterval> | null = null;
let ice: RtcConfig['iceServers'] | null = null;
const lastLoud = new Map<string, number>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const me = () => useApp.getState().user?.id ?? '';
const devices = () => useSettings.getState().call;

const micConstraints = (): MediaTrackConstraints => ({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  ...(devices().micId ? { deviceId: { ideal: devices().micId } } : {}),
});
const camConstraints = (): MediaTrackConstraints => ({
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
  ...(devices().camId ? { deviceId: { ideal: devices().camId } } : {}),
});

function mediaError(e: unknown, what: 'microfono' | 'videocamera'): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return `Accesso al ${what} negato: consentilo nelle impostazioni del sistema`;
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return `Nessun ${what} trovato`;
  if (name === 'NotReadableError') return `Il ${what} è usato da un altro programma`;
  return `Non riesco a usare il ${what}`;
}

export const useCall = create<CallStore>((set, get) => {
  const localTracks = () => {
    const s = get().local;
    return { audio: s?.getAudioTracks()[0] ?? null, video: s?.getVideoTracks()[0] ?? null };
  };

  const announce = () => {
    const { campaignId, joined, mic, cam } = get();
    if (campaignId) useApp.getState().rt?.send({ t: 'av.update', campaignId, call: joined ? { mic, cam } : null });
  };

  const setLink = (id: string, st: CallLinkState | null) =>
    set((s) => {
      const links = { ...s.links };
      if (st) links[id] = st;
      else delete links[id];
      return { links };
    });

  const play = (id: string, stream: MediaStream | null) => {
    let el = players.get(id);
    if (!stream) {
      if (el) {
        el.srcObject = null;
        players.delete(id);
      }
      return;
    }
    if (!el) {
      el = new Audio();
      el.autoplay = true;
      players.set(id, el);
    }
    if (el.srcObject !== stream) el.srcObject = stream;
    el.volume = Math.max(0, Math.min(1, devices().volumes[id] ?? 1));
    const out = devices().outId;
    const sink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (sink.setSinkId) void sink.setSinkId(out).catch(() => undefined);
    void el.play().catch(() => undefined);
  };

  const dropPeer = (id: string, notify: boolean) => {
    clearTimeout(retryTimers.get(id));
    retryTimers.delete(id);
    const p = peers.get(id);
    peers.delete(id);
    p?.close(notify);
    play(id, null);
    meter?.unwatch(id);
    setLink(id, null);
    set((s) => {
      const streams = { ...s.streams };
      delete streams[id];
      const speaking = { ...s.speaking };
      delete speaking[id];
      return { streams, speaking };
    });
  };

  const makePeer = (id: string, offerer: boolean) => {
    const campaignId = get().campaignId;
    if (!campaignId) return null;
    const old = peers.get(id);
    peers.delete(id);
    old?.close(false);
    const peer: CallPeer = new CallPeer({
      offerer,
      iceServers: ice ?? FALLBACK_ICE,
      signal: (data: RtcSignal) => useApp.getState().rt?.send({ t: 'av.signal', campaignId, to: id, data }),
      local: localTracks,
      onStream: (stream) => {
        if (peers.get(id) !== peer) return;
        play(id, stream);
        meter?.watch(id, stream);
        set((s) => ({ streams: { ...s.streams, [id]: stream } }));
      },
      onState: (st) => {
        if (peers.get(id) !== peer) return;
        setLink(id, st);
        // the one who offers tries again a little later; the other waits for the new offer
        if (st === 'failed' && offerer && get().joined && get().members[id]) {
          clearTimeout(retryTimers.get(id));
          retryTimers.set(
            id,
            setTimeout(() => get().joined && get().members[id] && makePeer(id, true), 4000),
          );
        }
      },
    });
    peers.set(id, peer);
    setLink(id, 'connecting');
    return peer;
  };

  /** links with whoever is in the call, none with who left */
  const reconcile = () => {
    const { joined, members } = get();
    const myId = me();
    for (const id of [...peers.keys()]) if (!joined || !members[id]) dropPeer(id, false);
    if (!joined) return;
    for (const id of Object.keys(members)) {
      if (id === myId || peers.has(id)) continue;
      if (myId < id) makePeer(id, true);
      else setLink(id, 'connecting');
    }
  };

  const startMeter = () => {
    if (meterTimer) return;
    meter ??= new LevelMeter();
    meterTimer = setInterval(() => {
      if (!meter) return;
      const now = performance.now();
      const speaking: Record<string, boolean> = {};
      const myId = me();
      let myLevel = 0;
      for (const id of meter.ids()) {
        const muted = id === myId ? !get().mic : get().members[id]?.mic === false;
        const lvl = muted ? 0 : meter.level(id);
        if (id === myId) myLevel = lvl;
        if (lvl > 0.035) lastLoud.set(id, now);
        speaking[id] = now - (lastLoud.get(id) ?? -1e9) < 350;
      }
      const prev = get().speaking;
      const changed = Object.keys(speaking).length !== Object.keys(prev).length || Object.entries(speaking).some(([k, v]) => prev[k] !== v);
      if (changed) set({ speaking });
      if (Math.abs(myLevel - get().myLevel) > 0.01) set({ myLevel });
    }, 120);
  };

  const stopMeter = () => {
    if (meterTimer) clearInterval(meterTimer);
    meterTimer = null;
    meter?.close();
    meter = null;
    lastLoud.clear();
  };

  const getMic = async (): Promise<MediaStreamTrack | null> => {
    if (!(await bridge?.askMedia('microphone').catch(() => true)) && bridge) throw new DOMException('denied', 'NotAllowedError');
    const s = await navigator.mediaDevices.getUserMedia({ audio: micConstraints() });
    return s.getAudioTracks()[0] ?? null;
  };
  const getCam = async (): Promise<MediaStreamTrack | null> => {
    if (!(await bridge?.askMedia('camera').catch(() => true)) && bridge) throw new DOMException('denied', 'NotAllowedError');
    const s = await navigator.mediaDevices.getUserMedia({ video: camConstraints() });
    return s.getVideoTracks()[0] ?? null;
  };

  /** puts a new local track in place of the old one, for us and for everyone we're linked to */
  const swapTrack = async (kind: 'audio' | 'video', track: MediaStreamTrack | null) => {
    const old = get().local;
    const tracks = (old?.getTracks() ?? []).filter((t) => t.kind !== kind);
    for (const t of old?.getTracks() ?? []) if (t.kind === kind && t !== track) t.stop();
    if (track) tracks.push(track);
    const local = tracks.length ? new MediaStream(tracks) : null;
    set({ local });
    meter?.watch(me(), local);
    await Promise.all([...peers.values()].map((p) => p.setTrack(kind, track)));
  };

  return {
    campaignId: null,
    joined: false,
    joining: false,
    mic: false,
    cam: false,
    members: {},
    local: null,
    streams: {},
    links: {},
    speaking: {},
    myLevel: 0,
    error: null,

    attach: (campaignId) => {
      set({ campaignId, members: {} });
      const rt = useApp.getState().rt;
      if (!rt) return () => undefined;
      const offMsg = rt.on((msg) => {
        if (get().campaignId !== campaignId) return;
        if (msg.t === 'av.members' && msg.campaignId === campaignId) {
          set({ members: msg.members });
          // the server forgot us (it restarted, or we came back online): we say we're here again
          if (get().joined && !msg.members[me()]) announce();
          reconcile();
        }
        if (msg.t === 'av.signal' && msg.campaignId === campaignId && get().joined) {
          const from = msg.from;
          let peer = peers.get(from);
          // a new offer always starts a fresh link with that person
          if (msg.data.type === 'description' && msg.data.description.type === 'offer') peer = makePeer(from, false) ?? undefined;
          void peer?.handleSignal(msg.data);
        }
        if (msg.t === 'session.state' && msg.campaignId === campaignId && !msg.session && get().joined) get().leave();
      });
      const offStatus = rt.onStatus((s) => {
        if (s === 'online' && get().joined && get().campaignId === campaignId) announce();
      });
      return () => {
        offMsg();
        offStatus();
        if (get().campaignId === campaignId) {
          get().leave();
          set({ campaignId: null, members: {} });
        }
      };
    },

    join: async (withCamera = false) => {
      if (get().joined || get().joining || !get().campaignId) return;
      set({ joining: true, error: null });
      let audio: MediaStreamTrack | null = null;
      let video: MediaStreamTrack | null = null;
      let error: string | null = null;
      try {
        audio = await getMic();
      } catch (e) {
        // still in the call, listening: the microphone can come later
        error = mediaError(e, 'microfono');
      }
      if (withCamera) {
        try {
          video = await getCam();
        } catch (e) {
          error = mediaError(e, 'videocamera');
        }
      }
      if (!ice) ice = await useApp.getState().api.rtcConfig().then((c) => c.iceServers).catch(() => FALLBACK_ICE);
      const tracks = [audio, video].filter((t): t is MediaStreamTrack => !!t);
      const local = tracks.length ? new MediaStream(tracks) : null;
      set({ joined: true, joining: false, local, mic: !!audio, cam: !!video, error });
      startMeter();
      meter?.watch(me(), local);
      announce();
      reconcile();
    },

    leave: () => {
      if (!get().joined) return;
      set({ joined: false });
      announce();
      for (const id of [...peers.keys()]) dropPeer(id, true);
      for (const t of get().local?.getTracks() ?? []) t.stop();
      stopMeter();
      set({ local: null, mic: false, cam: false, streams: {}, links: {}, speaking: {}, myLevel: 0, joining: false });
    },

    toggleMic: async () => {
      if (!get().joined) return;
      const track = get().local?.getAudioTracks()[0];
      if (track) {
        track.enabled = !get().mic;
        set({ mic: !get().mic });
      } else {
        try {
          const t = await getMic();
          await swapTrack('audio', t);
          set({ mic: !!t, error: null });
        } catch (e) {
          set({ error: mediaError(e, 'microfono') });
          return;
        }
      }
      announce();
    },

    toggleCam: async () => {
      if (!get().joined) return;
      if (get().cam) {
        await swapTrack('video', null);
        set({ cam: false });
      } else {
        try {
          const t = await getCam();
          await swapTrack('video', t);
          set({ cam: !!t, error: null });
        } catch (e) {
          set({ error: mediaError(e, 'videocamera') });
          return;
        }
      }
      announce();
    },

    setVolume: (userId, volume) => {
      const s = useSettings.getState();
      s.set({ call: { ...s.call, volumes: { ...s.call.volumes, [userId]: volume } } });
      const el = players.get(userId);
      if (el) el.volume = Math.max(0, Math.min(1, volume));
    },

    applyDevices: async () => {
      for (const [id, el] of players) play(id, el.srcObject as MediaStream | null);
      if (!get().joined) return;
      try {
        if (get().local?.getAudioTracks()[0]) {
          const enabled = get().mic;
          const t = await getMic();
          if (t) t.enabled = enabled;
          await swapTrack('audio', t);
        }
        if (get().cam) await swapTrack('video', await getCam());
        set({ error: null });
      } catch (e) {
        set({ error: mediaError(e, 'microfono') });
      }
    },
  };
});

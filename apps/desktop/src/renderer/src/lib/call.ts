import type { RtcConfig, RtcSignal } from '@thevtt/shared';

export type CallLinkState = 'connecting' | 'connected' | 'failed' | 'closed';

export interface CallPeerOptions {
  /** one side of each pair makes the offer (the one with the smaller id): no glare */
  offerer: boolean;
  iceServers: RtcConfig['iceServers'];
  signal: (data: RtcSignal) => void;
  /** what we send right now */
  local: () => { audio: MediaStreamTrack | null; video: MediaStreamTrack | null };
  onStream: (stream: MediaStream) => void;
  onState: (state: CallLinkState) => void;
}

/**
 * Voice and video with one other person at the table, straight between the
 * two computers. Each link carries one audio and one video slot from the
 * start: turning the microphone or camera on and off swaps the track in its
 * slot, so the link is negotiated once and never again.
 */
export class CallPeer {
  state: CallLinkState = 'connecting';
  readonly stream = new MediaStream();
  private readonly pc: RTCPeerConnection;
  private pending: RTCIceCandidateInit[] = [];

  constructor(private readonly o: CallPeerOptions) {
    this.pc = new RTCPeerConnection({ iceServers: o.iceServers });
    this.pc.onicecandidate = (e) => o.signal({ type: 'candidate', candidate: e.candidate ? e.candidate.toJSON() : null });
    this.pc.ontrack = (e) => {
      if (!this.stream.getTracks().includes(e.track)) this.stream.addTrack(e.track);
      o.onStream(this.stream);
    };
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'connected') this.setState('connected');
      else if (s === 'failed') this.setState('failed');
      else if (s === 'closed') this.setState('closed');
    };
    if (o.offerer) {
      const { audio, video } = o.local();
      this.pc.addTransceiver(audio ?? 'audio', { direction: 'sendrecv' });
      this.pc.addTransceiver(video ?? 'video', { direction: 'sendrecv' });
      void this.offer();
    }
  }

  private async offer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.o.signal({ type: 'description', description: { type: offer.type, sdp: offer.sdp } });
    } catch {
      this.setState('failed');
    }
  }

  async handleSignal(data: RtcSignal): Promise<void> {
    if (this.state === 'closed') return;
    try {
      if (data.type === 'bye') return this.close(false);
      if (data.type === 'description') {
        await this.pc.setRemoteDescription(data.description);
        for (const c of this.pending) await this.pc.addIceCandidate(c);
        this.pending = [];
        if (data.description.type === 'offer') {
          // the slots come with the offer: fill ours and send both ways
          const { audio, video } = this.o.local();
          for (const t of this.pc.getTransceivers()) {
            t.direction = 'sendrecv';
            const kind = t.receiver.track.kind;
            await t.sender.replaceTrack(kind === 'audio' ? audio : video);
          }
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.o.signal({ type: 'description', description: { type: answer.type, sdp: answer.sdp } });
        }
      } else if (data.candidate) {
        const c = data.candidate as RTCIceCandidateInit;
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(c);
        else this.pending.push(c);
      }
    } catch {
      this.setState('failed');
    }
  }

  /** Puts a track (or nothing) in the audio or video slot. */
  async setTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    for (const t of this.pc.getTransceivers()) {
      if (t.receiver.track.kind !== kind || t.currentDirection === 'stopped') continue;
      try {
        await t.sender.replaceTrack(track);
      } catch {
        /* the link is going away */
      }
    }
  }

  close(notify = true): void {
    if (this.state === 'closed') return;
    if (notify) this.o.signal({ type: 'bye' });
    try {
      this.pc.close();
    } catch {
      /* already closed */
    }
    this.setState('closed');
  }

  private setState(s: CallLinkState) {
    if (this.state === s || this.state === 'closed') return;
    this.state = s;
    this.o.onState(s);
  }
}

/** How loud a stream is, 0..1, read a few times a second. */
export class LevelMeter {
  private readonly ctx: AudioContext;
  private readonly nodes = new Map<string, { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; stream: MediaStream; track: string }>();
  private readonly buf = new Uint8Array(512);

  constructor() {
    this.ctx = new AudioContext();
  }

  /** Watches a stream under a name (replaces what was watched under it). */
  watch(id: string, stream: MediaStream | null): void {
    const track = stream?.getAudioTracks()[0];
    const cur = this.nodes.get(id);
    if (cur && cur.stream === stream && cur.track === track?.id) return;
    this.unwatch(id);
    if (!stream || !track) return;
    const source = this.ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    this.nodes.set(id, { source, analyser, stream, track: track.id });
  }

  unwatch(id: string): void {
    const n = this.nodes.get(id);
    if (!n) return;
    n.source.disconnect();
    this.nodes.delete(id);
  }

  level(id: string): number {
    const n = this.nodes.get(id);
    if (!n) return 0;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    n.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += ((v - 128) / 128) ** 2;
    return Math.sqrt(sum / this.buf.length);
  }

  ids(): string[] {
    return [...this.nodes.keys()];
  }

  close(): void {
    for (const id of [...this.nodes.keys()]) this.unwatch(id);
    void this.ctx.close();
  }
}

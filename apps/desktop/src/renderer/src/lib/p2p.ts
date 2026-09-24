import { encodeFrames, FrameDecoder, type RtcConfig, type RtcSignal } from '@thevtt/shared';

export type LinkState = 'connecting' | 'open' | 'closed';

export interface PeerLinkOptions {
  /** the player opens the connection, the host answers */
  initiator: boolean;
  iceServers: RtcConfig['iceServers'];
  /** deliver negotiation data to the other side (through the lobby server) */
  signal: (data: RtcSignal) => void;
  onMessage: (payload: unknown) => void;
  onState: (state: LinkState) => void;
  connectTimeoutMs?: number;
}

const HIGH_WATER = 1024 * 1024;
const LOW_WATER = 256 * 1024;

export const FALLBACK_ICE: RtcConfig['iceServers'] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * A direct WebRTC data channel between the GM and one player.
 * Messages are framed (maps are larger than a channel message) and sent with
 * backpressure. When the link can't be established or drops, the owner falls
 * back to the server relay.
 */
export class PeerLink {
  state: LinkState = 'connecting';
  private readonly pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private readonly decoder = new FrameDecoder();
  private queue: string[] = [];
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private readonly timer: ReturnType<typeof setTimeout>;

  constructor(private readonly o: PeerLinkOptions) {
    this.pc = new RTCPeerConnection({ iceServers: o.iceServers });
    this.pc.onicecandidate = (e) => o.signal({ type: 'candidate', candidate: e.candidate ? e.candidate.toJSON() : null });
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') this.close(true);
    };
    if (o.initiator) {
      this.attach(this.pc.createDataChannel('game', { ordered: true }));
      void this.offer();
    } else {
      this.pc.ondatachannel = (e) => this.attach(e.channel);
    }
    this.timer = setTimeout(() => this.state === 'connecting' && this.close(true), o.connectTimeoutMs ?? 12_000);
  }

  private async offer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.o.signal({ type: 'description', description: { type: offer.type, sdp: offer.sdp } });
    } catch {
      this.close(true);
    }
  }

  async handleSignal(data: RtcSignal): Promise<void> {
    if (this.state === 'closed') return;
    try {
      if (data.type === 'bye') return this.close(false);
      if (data.type === 'description') {
        await this.pc.setRemoteDescription(data.description);
        for (const c of this.pendingCandidates) await this.pc.addIceCandidate(c);
        this.pendingCandidates = [];
        if (data.description.type === 'offer') {
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.o.signal({ type: 'description', description: { type: answer.type, sdp: answer.sdp } });
        }
      } else if (data.candidate) {
        const c = data.candidate as RTCIceCandidateInit;
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(c);
        else this.pendingCandidates.push(c);
      }
    } catch {
      this.close(true);
    }
  }

  private attach(ch: RTCDataChannel) {
    this.channel = ch;
    ch.bufferedAmountLowThreshold = LOW_WATER;
    ch.onopen = () => {
      clearTimeout(this.timer);
      this.setState('open');
    };
    ch.onclose = () => this.close(false);
    ch.onbufferedamountlow = () => this.flush();
    ch.onmessage = (e) => {
      try {
        const msg = this.decoder.push(String(e.data));
        if (msg !== undefined) this.o.onMessage(msg);
      } catch {
        /* malformed frame: ignore */
      }
    };
  }

  /** Returns false when the link isn't usable: the caller must use the relay. */
  send(payload: unknown): boolean {
    if (this.state !== 'open' || this.channel?.readyState !== 'open') return false;
    this.queue.push(...encodeFrames(payload));
    this.flush();
    return true;
  }

  private flush() {
    const ch = this.channel;
    while (ch && ch.readyState === 'open' && this.queue.length && ch.bufferedAmount < HIGH_WATER) ch.send(this.queue.shift()!);
  }

  /** @param notify tell the other side (through the server) to drop its end too */
  close(notify = true): void {
    if (this.state === 'closed') return;
    clearTimeout(this.timer);
    if (notify) this.o.signal({ type: 'bye' });
    this.state = 'closed';
    this.queue = [];
    try {
      this.channel?.close();
      this.pc.close();
    } catch {
      /* already closed */
    }
    this.o.onState('closed');
  }

  private setState(s: LinkState) {
    this.state = s;
    this.o.onState(s);
  }
}

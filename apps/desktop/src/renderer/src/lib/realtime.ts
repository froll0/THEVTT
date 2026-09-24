import type { ClientToServer, ServerToClient } from '@thevtt/shared';

type Listener = (msg: ServerToClient) => void;
export type ConnectionStatus = 'connecting' | 'online' | 'offline';

/** WebSocket to the lobby with automatic reconnection and keep-alive. */
export class Realtime {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private retry = 0;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  status: ConnectionStatus = 'connecting';

  constructor(private readonly url: string) {
    this.open();
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  private open() {
    this.setStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('online');
      this.keepAlive = setInterval(() => this.send({ t: 'ping' }), 25_000);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data)) as ServerToClient;
      for (const l of this.listeners) l(msg);
    };
    ws.onclose = () => {
      if (this.keepAlive) clearInterval(this.keepAlive);
      if (this.closed) return;
      this.setStatus('offline');
      const delay = Math.min(15_000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.open(), delay);
    };
  }

  send(msg: ClientToServer): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  onStatus(l: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.ws?.close();
  }
}

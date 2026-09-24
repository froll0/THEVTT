import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { ClientToServer, Notification, ServerToClient, SessionInfo } from '@thevtt/shared';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Presence, Repo } from './repo';

interface LiveSession {
  campaignId: string;
  hostId: string;
  host: WebSocket;
  startedAt: string;
  /** userId → socket seated at the table */
  peers: Map<string, WebSocket>;
}

const MAX_PAYLOAD = 16 * 1024 * 1024;

/**
 * Realtime hub: presence, notifications and session relay.
 * It never interprets game payloads — the GM's client is the authority.
 */
export class Hub implements Presence {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  private readonly sockets = new Map<string, Set<WebSocket>>();
  private readonly userOf = new WeakMap<WebSocket, string>();
  private readonly sessions = new Map<string, LiveSession>();
  private repo!: Repo;
  private closing = false;

  attach(repo: Repo): void {
    this.repo = repo;
  }

  isOnline(userId: string): boolean {
    return (this.sockets.get(userId)?.size ?? 0) > 0;
  }

  session(campaignId: string): SessionInfo | null {
    const s = this.sessions.get(campaignId);
    if (!s) return null;
    return { campaignId, hostId: s.hostId, startedAt: s.startedAt, participants: [...s.peers.keys()] };
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, userId: string): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, userId));
  }

  send(ws: WebSocket, msg: ServerToClient): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  sendUser(userId: string, msg: ServerToClient): void {
    for (const ws of this.sockets.get(userId) ?? []) this.send(ws, msg);
  }

  notify(userId: string, notification: Notification): void {
    this.sendUser(userId, { t: 'notify', notification });
  }

  notifyCampaign(campaignId: string, notification: Notification, except?: string): void {
    for (const id of this.repo.memberIds(campaignId)) if (id !== except) this.notify(id, notification);
  }

  /** Called when a member is removed or a campaign is deleted. */
  dropFromSession(campaignId: string, userId: string): void {
    const s = this.sessions.get(campaignId);
    if (!s) return;
    if (s.hostId === userId) return this.endSession(campaignId);
    if (s.peers.delete(userId)) {
      this.send(s.host, { t: 'session.peer', campaignId, userId, joined: false });
      this.sendUser(userId, { t: 'session.state', campaignId, session: null });
    }
  }

  endSession(campaignId: string): void {
    const s = this.sessions.get(campaignId);
    if (!s) return;
    this.sessions.delete(campaignId);
    this.broadcastSession(campaignId);
  }

  close(): void {
    this.closing = true;
    for (const set of this.sockets.values()) for (const ws of set) ws.terminate();
    this.wss.close();
  }

  private broadcastSession(campaignId: string): void {
    const session = this.session(campaignId);
    let members: string[] = [];
    try {
      members = this.repo.memberIds(campaignId);
    } catch {
      /* campaign deleted */
    }
    for (const id of members) this.sendUser(id, { t: 'session.state', campaignId, session });
  }

  private onConnection(ws: WebSocket, userId: string): void {
    this.userOf.set(ws, userId);
    let set = this.sockets.get(userId);
    const firstSocket = !set?.size;
    if (!set) this.sockets.set(userId, (set = new Set()));
    set.add(ws);

    this.send(ws, { t: 'hello', user: this.repo.user(userId) });
    if (firstSocket) for (const f of this.repo.friendIds(userId)) this.sendUser(f, { t: 'presence', userId, online: true });
    for (const cid of this.repo.campaignIdsFor(userId)) {
      const session = this.session(cid);
      if (session) this.send(ws, { t: 'session.state', campaignId: cid, session });
    }

    ws.on('message', (raw) => {
      let msg: ClientToServer;
      try {
        msg = JSON.parse(raw.toString()) as ClientToServer;
      } catch {
        return this.send(ws, { t: 'error', message: 'Messaggio non valido' });
      }
      try {
        this.onMessage(ws, userId, msg);
      } catch (e) {
        this.send(ws, { t: 'error', message: e instanceof Error ? e.message : 'Errore' });
      }
    });
    ws.on('close', () => this.onClose(ws, userId));
  }

  private onMessage(ws: WebSocket, userId: string, msg: ClientToServer): void {
    switch (msg.t) {
      case 'ping':
        return this.send(ws, { t: 'pong' });
      case 'session.start': {
        this.repo.requireRole(msg.campaignId, userId, 'gm');
        const prev = this.sessions.get(msg.campaignId);
        // A restarted host keeps the players seated: they'll re-sync with a hello.
        this.sessions.set(msg.campaignId, {
          campaignId: msg.campaignId,
          hostId: userId,
          host: ws,
          startedAt: prev?.startedAt ?? new Date().toISOString(),
          peers: prev?.peers ?? new Map(),
        });
        this.broadcastSession(msg.campaignId);
        for (const peer of prev?.peers.keys() ?? []) this.send(ws, { t: 'session.peer', campaignId: msg.campaignId, userId: peer, joined: true });
        return;
      }
      case 'session.stop': {
        const s = this.sessions.get(msg.campaignId);
        if (s && s.hostId === userId) this.endSession(msg.campaignId);
        return;
      }
      case 'session.join': {
        this.repo.requireRole(msg.campaignId, userId);
        const s = this.sessions.get(msg.campaignId);
        if (!s) throw new Error('La sessione non è attiva');
        if (s.hostId === userId) return;
        const old = s.peers.get(userId);
        s.peers.set(userId, ws);
        if (old !== ws) this.send(s.host, { t: 'session.peer', campaignId: msg.campaignId, userId, joined: true });
        this.broadcastSession(msg.campaignId);
        return;
      }
      case 'session.leave': {
        const s = this.sessions.get(msg.campaignId);
        if (s?.peers.get(userId) === ws) {
          s.peers.delete(userId);
          this.send(s.host, { t: 'session.peer', campaignId: msg.campaignId, userId, joined: false });
          this.broadcastSession(msg.campaignId);
        }
        return;
      }
      case 'relay.host': {
        const s = this.sessions.get(msg.campaignId);
        if (!s || s.peers.get(userId) !== ws) throw new Error('Non sei seduto a questo tavolo');
        this.send(s.host, { t: 'relay', campaignId: msg.campaignId, from: userId, payload: msg.payload });
        return;
      }
      case 'relay.peer': {
        const s = this.sessions.get(msg.campaignId);
        if (!s || s.host !== ws) throw new Error('Non sei l’host di questa sessione');
        const peer = s.peers.get(msg.to);
        if (peer) this.send(peer, { t: 'relay', campaignId: msg.campaignId, from: userId, payload: msg.payload });
        return;
      }
      case 'rtc.signal': {
        const s = this.sessions.get(msg.campaignId);
        if (!s) throw new Error('La sessione non è attiva');
        // Signaling only flows between the host and players seated at its table.
        if (s.host === ws) {
          const peer = s.peers.get(msg.to);
          if (peer) this.send(peer, { t: 'rtc.signal', campaignId: msg.campaignId, from: userId, data: msg.data });
        } else if (s.peers.get(userId) === ws && msg.to === s.hostId) {
          this.send(s.host, { t: 'rtc.signal', campaignId: msg.campaignId, from: userId, data: msg.data });
        } else throw new Error('Non sei seduto a questo tavolo');
        return;
      }
      default:
        throw new Error('Tipo di messaggio sconosciuto');
    }
  }

  private onClose(ws: WebSocket, userId: string): void {
    if (this.closing) return;
    const set = this.sockets.get(userId);
    set?.delete(ws);
    if (set && set.size === 0) {
      this.sockets.delete(userId);
      for (const f of this.repo.friendIds(userId)) this.sendUser(f, { t: 'presence', userId, online: false });
    }
    for (const s of [...this.sessions.values()]) {
      if (s.host === ws) this.endSession(s.campaignId);
      else if (s.peers.get(userId) === ws) {
        s.peers.delete(userId);
        this.send(s.host, { t: 'session.peer', campaignId: s.campaignId, userId, joined: false });
        this.broadcastSession(s.campaignId);
      }
    }
  }
}

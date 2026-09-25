import { buildApp } from '@thevtt/server/app';
import { findGateway, isPrivateIp, mapPort, unmapPort, type PortMapping } from '@thevtt/server/upnp';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import type { HostedServerConfig, HostedServerStatus } from '../preload/api';
import { codeFor, publish, type GroupIdentity } from './group-code';
import { Tunnel } from './tunnel';

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface HostedServerOptions {
  dataDir: string;
  identity: GroupIdentity;
  rendezvous: string;
  fetch: Fetch;
  onStatus: (s: HostedServerStatus) => void;
}

/** the relay keeps messages 12 hours: republish well before */
const REPUBLISH_MS = 3 * 3600_000;

type LobbyApp = Awaited<ReturnType<typeof buildApp>>['app'];

export const DEFAULT_SERVER_CONFIG: HostedServerConfig = { enabled: false, port: 4477, upnp: true, tunnel: true };

/**
 * The lobby server, run inside the desktop app so a group can play without
 * anyone installing or starting a server by hand.
 */
export class HostedServer {
  private app: LobbyApp | null = null;
  private mapping: PortMapping | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private busy: Promise<void> = Promise.resolve();
  private readonly tunnel: Tunnel;
  private publishTimer: ReturnType<typeof setInterval> | null = null;
  private publishedUrl: string | null = null;
  status: HostedServerStatus;

  constructor(private readonly o: HostedServerOptions) {
    this.status = {
      state: 'stopped',
      port: DEFAULT_SERVER_CONFIG.port,
      lanAddresses: [],
      upnp: { state: 'off' },
      tunnel: { state: 'off' },
      code: codeFor(o.identity.publicKey),
      published: 'no',
    };
    this.tunnel = new Tunnel(join(o.dataDir, 'bin'), (tunnel) => {
      this.update({ tunnel });
      this.announce();
    }, o.fetch);
  }

  private update(patch: Partial<HostedServerStatus>) {
    this.status = { ...this.status, ...patch };
    this.o.onStatus(this.status);
  }

  /** The address friends should use from the internet, if any. */
  private publicUrl(): string | null {
    const s = this.status;
    if (s.state !== 'running') return null;
    if (s.tunnel.state === 'ready') return s.tunnel.url;
    if (s.upnp.state === 'mapped' && s.upnp.externalIp) return `http://${s.upnp.externalIp}:${s.port}`;
    return null;
  }

  /** Publishes the public address under the group code when it changes. */
  private announce(force = false) {
    const url = this.publicUrl();
    if (!url || (!force && url === this.publishedUrl)) return;
    this.publishedUrl = url;
    publish(this.o.rendezvous, this.o.identity, url, this.o.fetch).then(
      () => this.publishedUrl === url && this.update({ published: 'yes' }),
      () => {
        if (this.publishedUrl !== url) return;
        this.publishedUrl = null; // try again on the next change or timer
        this.update({ published: 'error' });
      },
    );
  }

  /** Serializes start/stop so rapid toggles can't overlap. */
  private queue(fn: () => Promise<void>): Promise<void> {
    this.busy = this.busy.then(fn, fn);
    return this.busy;
  }

  start(cfg: HostedServerConfig): Promise<void> {
    return this.queue(async () => {
      if (this.app) await this.shutdown();
      this.update({ state: 'starting', port: cfg.port, error: undefined, upnp: { state: cfg.upnp ? 'working' : 'off' } });
      try {
        const { app } = await buildApp({ dbPath: join(this.o.dataDir, 'server', 'thevtt.sqlite') });
        await app.listen({ port: cfg.port, host: '0.0.0.0' });
        this.app = app;
        this.update({ state: 'running', lanAddresses: lanAddresses(), published: 'no' });
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        this.update({
          state: 'error',
          error: code === 'EADDRINUSE' ? `La porta ${cfg.port} è già usata da un altro programma` : e instanceof Error ? e.message : 'Avvio non riuscito',
          upnp: { state: 'off' },
        });
        return;
      }
      if (cfg.upnp) void this.openRouterPort(cfg.port);
      if (cfg.tunnel) this.tunnel.start(cfg.port);
      this.publishTimer = setInterval(() => this.announce(true), REPUBLISH_MS);
    });
  }

  stop(): Promise<void> {
    return this.queue(async () => {
      await this.shutdown();
      this.update({ state: 'stopped', error: undefined, upnp: { state: 'off' }, tunnel: { state: 'off' }, published: 'no' });
    });
  }

  private async shutdown() {
    if (this.renewTimer) clearInterval(this.renewTimer);
    this.renewTimer = null;
    if (this.publishTimer) clearInterval(this.publishTimer);
    this.publishTimer = null;
    this.publishedUrl = null;
    this.tunnel.stop();
    const closing = (async () => {
      if (this.mapping) await unmapPort(this.mapping);
      await this.app?.close();
    })();
    // never let a slow router or a stuck client keep the app from quitting
    await Promise.race([closing, new Promise((r) => setTimeout(r, 3000))]);
    this.mapping = null;
    this.app = null;
  }

  private async openRouterPort(port: number) {
    try {
      const gw = await findGateway();
      if (!gw) {
        this.update({ upnp: { state: 'unavailable', message: 'Il router non ha risposto (UPnP spento o non supportato)' } });
        return;
      }
      const mapping = await mapPort(gw, port);
      if (!this.app) {
        await unmapPort(mapping); // stopped meanwhile
        return;
      }
      this.mapping = mapping;
      const ip = mapping.externalIp;
      if (ip && isPrivateIp(ip)) {
        this.update({
          upnp: {
            state: 'cgnat',
            externalIp: ip,
            message: 'Il tuo provider condivide l’indirizzo pubblico (CGNAT): dall’esterno non sei raggiungibile',
          },
        });
      } else {
        this.update({ upnp: { state: 'mapped', externalIp: ip ?? undefined } });
        this.announce();
      }
      // timed leases must be renewed before they expire
      if (mapping.leaseSeconds > 0) {
        this.renewTimer = setInterval(() => void mapPort(gw, port).catch(() => undefined), (mapping.leaseSeconds / 2) * 1000);
      }
    } catch (e) {
      this.update({ upnp: { state: 'failed', message: e instanceof Error ? e.message : 'Il router ha rifiutato la richiesta' } });
    }
  }

  dispose(): Promise<void> {
    return this.queue(() => this.shutdown());
  }
}

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  // typical home networks first
  return out.sort((a, b) => Number(!a.startsWith('192.168.')) - Number(!b.startsWith('192.168.')));
}

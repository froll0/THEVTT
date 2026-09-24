import { buildApp } from '@thevtt/server/app';
import { findGateway, isPrivateIp, mapPort, unmapPort, type PortMapping } from '@thevtt/server/upnp';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import type { HostedServerConfig, HostedServerStatus } from '../preload/api';

type LobbyApp = Awaited<ReturnType<typeof buildApp>>['app'];

export const DEFAULT_SERVER_CONFIG: HostedServerConfig = { enabled: false, port: 4477, upnp: true };

/**
 * The lobby server, run inside the desktop app so a group can play without
 * anyone installing or starting a server by hand.
 */
export class HostedServer {
  private app: LobbyApp | null = null;
  private mapping: PortMapping | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private busy: Promise<void> = Promise.resolve();
  status: HostedServerStatus = { state: 'stopped', port: DEFAULT_SERVER_CONFIG.port, lanAddresses: [], upnp: { state: 'off' } };

  constructor(
    private readonly dataDir: string,
    private readonly onStatus: (s: HostedServerStatus) => void,
  ) {}

  private update(patch: Partial<HostedServerStatus>) {
    this.status = { ...this.status, ...patch };
    this.onStatus(this.status);
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
        const { app } = await buildApp({ dbPath: join(this.dataDir, 'server', 'thevtt.sqlite') });
        await app.listen({ port: cfg.port, host: '0.0.0.0' });
        this.app = app;
        this.update({ state: 'running', lanAddresses: lanAddresses() });
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
    });
  }

  stop(): Promise<void> {
    return this.queue(async () => {
      await this.shutdown();
      this.update({ state: 'stopped', error: undefined, upnp: { state: 'off' } });
    });
  }

  private async shutdown() {
    if (this.renewTimer) clearInterval(this.renewTimer);
    this.renewTimer = null;
    if (this.mapping) await unmapPort(this.mapping);
    this.mapping = null;
    await this.app?.close();
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

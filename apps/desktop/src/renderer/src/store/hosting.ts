import { create } from 'zustand';
import type { HostedServerConfig, HostedServerStatus } from '../../../preload/api';
import { bridge } from '../lib/platform';

interface HostingStore {
  available: boolean;
  config: HostedServerConfig | null;
  status: HostedServerStatus | null;
  load(): Promise<void>;
  apply(cfg: HostedServerConfig): Promise<HostedServerStatus | null>;
}

/** The lobby server hosted by this app (desktop only). */
export const useHosting = create<HostingStore>((set) => ({
  available: !!bridge,
  config: null,
  status: null,
  async load() {
    if (!bridge) return;
    const [config, status] = await Promise.all([bridge.server.getConfig(), bridge.server.status()]);
    set({ config, status });
  },
  async apply(cfg) {
    if (!bridge) return null;
    set({ config: cfg });
    const status = await bridge.server.setConfig(cfg);
    set({ status });
    return status;
  },
}));

bridge?.server.onStatus((status) => useHosting.setState({ status }));

export const localServerUrl = (port: number) => `http://localhost:${port}`;

/**
 * What to give friends: the group code once the public address is published
 * (it never changes), else a public address, else the LAN one.
 */
export function inviteAddress(s: HostedServerStatus): { address: string; scope: 'code' | 'internet' | 'lan' } | null {
  if (s.state !== 'running') return null;
  if (s.published === 'yes' && s.code) return { address: s.code, scope: 'code' };
  if (s.tunnel?.state === 'ready') return { address: s.tunnel.url, scope: 'internet' };
  if (s.upnp.state === 'mapped' && s.upnp.externalIp) return { address: `${s.upnp.externalIp}:${s.port}`, scope: 'internet' };
  const lan = s.lanAddresses[0];
  return lan ? { address: `${lan}:${s.port}`, scope: 'lan' } : null;
}

export const DEFAULT_HOSTING: HostedServerConfig = { enabled: false, port: 4477, upnp: true, tunnel: true };

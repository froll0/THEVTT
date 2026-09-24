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

/** Address to give friends: the public one when the router opened the port, else the LAN one. */
export function inviteAddress(s: HostedServerStatus): { address: string; scope: 'internet' | 'lan' } | null {
  if (s.state !== 'running') return null;
  if (s.upnp.state === 'mapped' && s.upnp.externalIp) return { address: `${s.upnp.externalIp}:${s.port}`, scope: 'internet' };
  const lan = s.lanAddresses[0];
  return lan ? { address: `${lan}:${s.port}`, scope: 'lan' } : null;
}

import { create } from 'zustand';
import type { UpdateCheck } from '../../../preload/api';
import { bridge } from '../lib/platform';

interface UpdateStore {
  check: UpdateCheck | null;
  checking: boolean;
  /** download progress, 0..1, while installing */
  progress: number | null;
  error: string | null;
  checkNow(): Promise<void>;
  install(): Promise<void>;
}

const EVERY = 6 * 3600_000;

export const useUpdates = create<UpdateStore>((set, get) => ({
  check: null,
  checking: false,
  progress: null,
  error: null,
  async checkNow() {
    if (!bridge || get().checking) return;
    set({ checking: true });
    const check = await bridge.updates.check().catch(() => ({ state: 'error', message: 'Controllo non riuscito' }) as const);
    set({ check, checking: false });
  },
  async install() {
    if (!bridge) return;
    set({ error: null, progress: 0 });
    const off = bridge.updates.onProgress(({ received, total }) => set({ progress: total ? received / total : null }));
    const res = await bridge.updates.install().catch(() => ({ error: 'Aggiornamento non riuscito' }));
    off();
    if ('error' in res) set({ error: res.error, progress: null });
    else if ('opened' in res) set({ progress: null });
    // otherwise the app is closing to install
  },
}));

/** Checks shortly after start and then every few hours. */
export function startUpdateChecks(): () => void {
  if (!bridge) return () => {};
  const first = setTimeout(() => void useUpdates.getState().checkNow(), 4000);
  const every = setInterval(() => void useUpdates.getState().checkNow(), EVERY);
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}

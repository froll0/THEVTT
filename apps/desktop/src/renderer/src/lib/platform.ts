import type { DesktopBridge } from '../../../preload/api';

export const bridge: DesktopBridge | undefined = window.thevtt;
export const isDesktop = !!bridge;

/** Local persistence: user-data folder on desktop, localStorage in the browser. */
export const localStore = {
  async read<T>(key: string): Promise<T | null> {
    if (bridge) return (await bridge.store.read(key)) as T | null;
    const raw = localStorage.getItem(`thevtt:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async write(key: string, value: unknown): Promise<void> {
    if (bridge) return bridge.store.write(key, value);
    try {
      localStorage.setItem(`thevtt:${key}`, JSON.stringify(value));
    } catch {
      /* quota exceeded: maps are large, desktop build has no such limit */
    }
  },
};

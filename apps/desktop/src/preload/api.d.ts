export interface HostedServerConfig {
  /** host the lobby server on this computer (restarted with the app) */
  enabled: boolean;
  port: number;
  /** ask the router to open the port (UPnP) */
  upnp: boolean;
}

export interface HostedServerStatus {
  state: 'stopped' | 'starting' | 'running' | 'error';
  port: number;
  lanAddresses: string[];
  error?: string;
  upnp: {
    state: 'off' | 'working' | 'mapped' | 'unavailable' | 'failed' | 'cgnat';
    externalIp?: string;
    message?: string;
  };
}

/** API exposed by the preload script as `window.thevtt`. Absent when running in a browser. */
export interface DesktopBridge {
  platform: string;
  window: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    onMaximized(cb: (maximized: boolean) => void): () => void;
  };
  /** local JSON storage in the user data folder */
  store: {
    read(key: string): Promise<unknown>;
    write(key: string, value: unknown): Promise<void>;
  };
  info(): Promise<{ version: string; dataDir: string }>;
  /** the lobby server hosted inside the app */
  server: {
    getConfig(): Promise<HostedServerConfig>;
    /** saves the config and starts, restarts or stops the server accordingly */
    setConfig(cfg: HostedServerConfig): Promise<HostedServerStatus>;
    status(): Promise<HostedServerStatus>;
    onStatus(cb: (s: HostedServerStatus) => void): () => void;
  };
}

declare global {
  interface Window {
    thevtt?: DesktopBridge;
  }
}

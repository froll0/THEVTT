export interface HostedServerConfig {
  /** host the lobby server on this computer (restarted with the app) */
  enabled: boolean;
  port: number;
  /** ask the router to open the port (UPnP) */
  upnp: boolean;
  /** public address through a Cloudflare tunnel, no router setup needed */
  tunnel: boolean;
  /** a TURN server, for voice, video and the table when two computers can't reach each other directly */
  turn?: { url: string; username: string; credential: string } | null;
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
  tunnel:
    | { state: 'off' }
    | { state: 'downloading'; progress: number }
    | { state: 'starting' }
    | { state: 'ready'; url: string }
    | { state: 'error'; message: string };
  /** permanent code friends type to find this server, e.g. ABCD-EFGH-JKLM-NPQR */
  code: string;
  /** whether the current address is published under the code */
  published: 'no' | 'yes' | 'error';
}

export interface BackupSummary {
  createdAt: string;
  appVersion: string;
  tables: number;
  hasServer: boolean;
  bytes: number;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  notes: string;
  pageUrl: string;
  publishedAt: string | null;
  asset: { name: string; url: string; size: number } | null;
  mode: 'installer' | 'appimage' | 'page';
}

export type UpdateCheck =
  | { state: 'available'; info: UpdateInfo }
  | { state: 'none'; current: string }
  | { state: 'disabled' }
  | { state: 'error'; message: string };

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
  /** finds the current address of a friend's server from their group code */
  resolveGroupCode(code: string): Promise<{ url: string } | { error: string }>;
  /** everything this PC keeps, in one file */
  backup: {
    create(): Promise<{ path: string; bytes: number } | { canceled: true } | { error: string }>;
    list(): Promise<{ dir: string; backups: { name: string; createdAt: string; bytes: number }[] }>;
    openFolder(): Promise<string>;
    /** picks a file (or an automatic backup by name) and describes it */
    inspect(autoName?: string): Promise<{ summary: BackupSummary } | { canceled: true } | { error: string }>;
    /** replaces the data with the inspected backup and restarts the app */
    restore(): Promise<{ ok: true } | { error: string }>;
  };
  /** new versions of the app, from the project's releases */
  updates: {
    check(): Promise<UpdateCheck>;
    /** downloads and installs (the app then restarts), or opens the release page */
    install(): Promise<{ installing: true } | { opened: true } | { error: string }>;
    openPage(): Promise<void>;
    onProgress(cb: (p: { received: number; total: number }) => void): () => void;
  };
  /** asks the system for the microphone or camera (macOS asks the user once); true when allowed */
  askMedia(kind: 'microphone' | 'camera'): Promise<boolean>;
}

declare global {
  interface Window {
    thevtt?: DesktopBridge;
  }
}

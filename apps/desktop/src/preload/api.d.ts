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
}

declare global {
  interface Window {
    thevtt?: DesktopBridge;
  }
}

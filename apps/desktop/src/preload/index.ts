import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from './api';

const bridge: DesktopBridge = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    onMaximized: (cb) => {
      const listener = (_: unknown, v: boolean) => cb(v);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
  store: {
    read: (key) => ipcRenderer.invoke('store:read', key),
    write: (key, value) => ipcRenderer.invoke('store:write', key, value),
  },
  info: () => ipcRenderer.invoke('app:info'),
};

contextBridge.exposeInMainWorld('thevtt', bridge);

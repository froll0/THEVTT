import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HostedServerConfig } from '../preload/api';
import { DEFAULT_SERVER_CONFIG, HostedServer } from './hosted-server';

const isMac = process.platform === 'darwin';
const devUrl = process.env.VITE_DEV_SERVER_URL;

// Separate profiles (e.g. to run two instances side by side while testing)
if (process.env.THEVTT_USER_DATA) app.setPath('userData', process.env.THEVTT_USER_DATA);
// Otherwise one instance only: a second window would try to host a second server
if (!process.env.THEVTT_USER_DATA && !app.requestSingleInstanceLock()) app.quit();

// Everything the GM hosts (table state, maps) is kept on this machine.
const dataDir = () => join(app.getPath('userData'), 'data');
const safeName = (key: string) => key.replace(/[^a-zA-Z0-9_.-]/g, '_');

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(value));
  await rename(tmp, file);
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    show: false,
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#111214',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // the table music starts when the GM presses play, not on a local click
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized', false));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
  return win;
}

ipcMain.handle('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.handle('window:toggle-maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (w.isMaximized()) w.unmaximize();
  else w.maximize();
});
ipcMain.handle('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.handle('store:read', (_e, key: string) => readJson(join(dataDir(), `${safeName(key)}.json`)));
ipcMain.handle('store:write', (_e, key: string, value: unknown) => writeJson(join(dataDir(), `${safeName(key)}.json`), value));
ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataDir: dataDir() }));

// ---------- hosted lobby server ----------

const serverConfigFile = () => join(dataDir(), 'server-config.json');
let serverConfig: HostedServerConfig = DEFAULT_SERVER_CONFIG;
const hosted = new HostedServer(app.getPath('userData'), (status) => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('server:status', status);
});

function sanitize(cfg: Partial<HostedServerConfig>): HostedServerConfig {
  const port = Number(cfg.port);
  return {
    enabled: !!cfg.enabled,
    port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_SERVER_CONFIG.port,
    upnp: cfg.upnp !== false,
  };
}

ipcMain.handle('server:get-config', () => serverConfig);
ipcMain.handle('server:status', () => hosted.status);
ipcMain.handle('server:set-config', async (_e, cfg: Partial<HostedServerConfig>) => {
  const next = sanitize(cfg);
  const changed = next.port !== serverConfig.port || next.upnp !== serverConfig.upnp;
  serverConfig = next;
  await writeJson(serverConfigFile(), serverConfig);
  if (!next.enabled) await hosted.stop();
  else if (changed || hosted.status.state !== 'running') await hosted.start(next);
  return hosted.status;
});

let quitting = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  // close the server and the router port mapping before exiting
  e.preventDefault();
  quitting = true;
  void hosted.dispose().finally(() => app.quit());
});

app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) {
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

app.whenReady().then(async () => {
  serverConfig = sanitize({ ...DEFAULT_SERVER_CONFIG, ...((await readJson(serverConfigFile())) as Partial<HostedServerConfig> | null) });
  if (serverConfig.enabled) void hosted.start(serverConfig);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

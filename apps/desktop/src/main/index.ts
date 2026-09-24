import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const isMac = process.platform === 'darwin';
const devUrl = process.env.VITE_DEV_SERVER_URL;

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

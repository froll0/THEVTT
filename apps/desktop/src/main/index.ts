import { app, BrowserWindow, dialog, ipcMain, net, shell, systemPreferences } from 'electron';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HostedServerConfig, HostedServerStatus, UpdateInfo } from '../preload/api';
import { DEFAULT_RENDEZVOUS, newIdentity, normalizeCode, resolve as resolveCode, type GroupIdentity } from './group-code';
import { DEFAULT_SERVER_CONFIG, HostedServer } from './hosted-server';
import { pickUpdate, RELEASES_API, type GithubRelease } from './updates';
import { applyBackup, autoBackup, autoDir, BACKUP_EXT, createBackup, listAuto, readBackup, summarize, type BackupFile } from './backup';

const isMac = process.platform === 'darwin';
const devUrl = process.env.VITE_DEV_SERVER_URL;

// Separate profiles (e.g. to run two instances side by side while testing)
if (process.env.THEVTT_USER_DATA) app.setPath('userData', process.env.THEVTT_USER_DATA);
// Otherwise one instance only: a second window would try to host a second server
if (!process.env.THEVTT_USER_DATA && !app.requestSingleInstanceLock()) app.quit();
// 3D dice need WebGL: on PCs whose GPU is blocklisted Chromium falls back to its
// software renderer only when allowed. The page is our own code, not the web.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
// automated tests: a fake camera and microphone, no permission prompt
if (process.env.THEVTT_FAKE_MEDIA) {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
}

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
// voice and video: macOS asks the user the first time; elsewhere the app may use them
ipcMain.handle('media:ask', async (_e, kind: 'microphone' | 'camera') => {
  if (!isMac || (kind !== 'microphone' && kind !== 'camera')) return true;
  if (systemPreferences.getMediaAccessStatus(kind) === 'granted') return true;
  return systemPreferences.askForMediaAccess(kind);
});

// ---------- backups ----------

const userData = () => app.getPath('userData');
/** the backup chosen for restoring, waiting for the user's confirmation */
let pendingRestore: BackupFile | null = null;

ipcMain.handle('backup:create', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const day = new Date().toISOString().slice(0, 10);
  const opts = { defaultPath: join(app.getPath('documents'), `TheVTT-backup-${day}.${BACKUP_EXT}`), filters: [{ name: 'Backup di TheVTT', extensions: [BACKUP_EXT] }] };
  const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts);
  if (res.canceled || !res.filePath) return { canceled: true };
  try {
    const raw = await createBackup(userData(), app.getVersion());
    await writeFile(res.filePath, raw);
    return { path: res.filePath, bytes: raw.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Backup non riuscito' };
  }
});

ipcMain.handle('backup:list', async () => ({ dir: autoDir(userData()), backups: await listAuto(userData()) }));
ipcMain.handle('backup:open-folder', async () => {
  await mkdir(autoDir(userData()), { recursive: true });
  return shell.openPath(autoDir(userData()));
});

/** Reads a backup (picked from disk, or an automatic one by name) and describes it, without touching anything. */
ipcMain.handle('backup:inspect', async (e, autoName?: string) => {
  let file: string | undefined;
  if (autoName) {
    if (!/^[A-Za-z0-9_.-]+$/.test(autoName)) return { error: 'Backup non valido' };
    file = join(autoDir(userData()), autoName);
  } else {
    const win = BrowserWindow.fromWebContents(e.sender);
    const opts = { properties: ['openFile' as const], filters: [{ name: 'Backup di TheVTT', extensions: [BACKUP_EXT] }] };
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    if (res.canceled || !res.filePaths[0]) return { canceled: true };
    file = res.filePaths[0];
  }
  try {
    const raw = await readFile(file);
    pendingRestore = readBackup(raw);
    return { summary: summarize(pendingRestore, raw.length) };
  } catch (err) {
    pendingRestore = null;
    return { error: err instanceof Error ? err.message : 'Backup illeggibile' };
  }
});

/** Replaces the data with the inspected backup, keeping a copy of today's first, then restarts. */
ipcMain.handle('backup:restore', async () => {
  const b = pendingRestore;
  if (!b) return { error: 'Nessun backup scelto' };
  try {
    const safety = await createBackup(userData(), app.getVersion()).catch(() => null);
    if (safety) {
      await mkdir(autoDir(userData()), { recursive: true });
      await writeFile(join(autoDir(userData()), `prima-del-ripristino-${Date.now()}.${BACKUP_EXT}`), safety);
    }
    await hosted.stop();
    await applyBackup(userData(), b);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Ripristino non riuscito' };
  }
  pendingRestore = null;
  // start again on the restored data (the window must not save its old state over it)
  for (const w of BrowserWindow.getAllWindows()) w.destroy();
  app.relaunch();
  app.exit(0);
  return { ok: true };
});

// ---------- app updates ----------

const updateUrl = process.env.THEVTT_UPDATE_URL || RELEASES_API;
/** the last update found: installs only ever use what the main process fetched */
let pendingUpdate: UpdateInfo | null = null;
let installing = false;

ipcMain.handle('update:check', async () => {
  if (process.env.THEVTT_NO_UPDATES || (devUrl && !process.env.THEVTT_UPDATE_URL)) return { state: 'disabled' };
  try {
    const res = await net.fetch(updateUrl, { headers: { accept: 'application/vnd.github+json', 'user-agent': `TheVTT/${app.getVersion()}` } });
    if (!res.ok) return { state: 'error', message: res.status === 404 ? 'Nessuna versione pubblicata' : `GitHub ha risposto ${res.status}` };
    const release = (await res.json()) as GithubRelease;
    pendingUpdate = pickUpdate(release, app.getVersion(), process.platform, process.arch, !!process.env.APPIMAGE);
    return pendingUpdate ? { state: 'available', info: pendingUpdate } : { state: 'none', current: app.getVersion() };
  } catch {
    return { state: 'error', message: 'Non riesco a controllare gli aggiornamenti: sei offline?' };
  }
});

/** Downloads the new version and applies it. Resolves with an error message, or never (the app restarts). */
ipcMain.handle('update:install', async (e) => {
  const u = pendingUpdate;
  if (!u || installing) return { error: 'Nessun aggiornamento da installare' };
  if (u.mode === 'page' || !u.asset) {
    await shell.openExternal(u.pageUrl);
    return { opened: true };
  }
  installing = true;
  try {
    const res = await net.fetch(u.asset.url, { headers: { 'user-agent': `TheVTT/${app.getVersion()}` } });
    if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
    const total = Number(res.headers.get('content-length')) || u.asset.size;
    const target = u.mode === 'appimage' ? `${process.env.APPIMAGE}.new` : join(tmpdir(), u.asset.name);
    const out = createWriteStream(target);
    let received = 0;
    let lastSent = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (!out.write(value)) await new Promise<void>((r) => out.once('drain', () => r()));
      if (received - lastSent > 256 * 1024 || received === total) {
        lastSent = received;
        e.sender.send('update:progress', { received, total });
      }
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    if (u.mode === 'installer') {
      // the installer replaces the app: let it start, then get out of its way
      spawn(target, [], { detached: true, stdio: 'ignore' }).unref();
      setTimeout(() => app.quit(), 800);
    } else {
      await chmod(target, 0o755);
      await rename(target, process.env.APPIMAGE!);
      app.relaunch({ execPath: process.env.APPIMAGE });
      app.quit();
    }
    return { installing: true };
  } catch {
    installing = false;
    return { error: 'Download non riuscito. Riprova, oppure scarica la nuova versione dalla pagina del progetto.' };
  }
});

ipcMain.handle('update:open-page', () => (pendingUpdate ? shell.openExternal(pendingUpdate.pageUrl) : undefined));

// ---------- hosted lobby server ----------

const serverConfigFile = () => join(dataDir(), 'server-config.json');
let serverConfig: HostedServerConfig = DEFAULT_SERVER_CONFIG;
let hosted: HostedServer;
const onServerStatus = (status: HostedServerStatus) => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('server:status', status);
};
const rendezvous = (process.env.THEVTT_RENDEZVOUS || DEFAULT_RENDEZVOUS).replace(/\/$/, '');

/** The key behind this PC's group code: created once, kept with the app data. */
async function groupIdentity(): Promise<GroupIdentity> {
  const file = join(dataDir(), 'group-identity.json');
  const saved = (await readJson(file)) as GroupIdentity | null;
  if (saved?.publicKey && saved.privateKey) return saved;
  const id = newIdentity();
  await writeJson(file, id);
  return id;
}

ipcMain.handle('group:resolve', async (_e, input: string) => {
  const code = normalizeCode(String(input));
  if (!code) return { error: 'Codice non valido' };
  try {
    const url = await resolveCode(rendezvous, code, (u, init) => net.fetch(u, init));
    return url ? { url } : { error: 'Il master non è online in questo momento (o il codice è sbagliato)' };
  } catch {
    return { error: 'Non riesco a raggiungere il servizio per i codici: controlla la connessione' };
  }
});

function sanitize(cfg: Partial<HostedServerConfig>): HostedServerConfig {
  const port = Number(cfg.port);
  return {
    enabled: !!cfg.enabled,
    port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_SERVER_CONFIG.port,
    upnp: cfg.upnp !== false,
    tunnel: cfg.tunnel !== false,
    turn:
      cfg.turn && /^turns?:/.test(String(cfg.turn.url).trim())
        ? { url: String(cfg.turn.url).trim().slice(0, 300), username: String(cfg.turn.username ?? '').slice(0, 200), credential: String(cfg.turn.credential ?? '').slice(0, 300) }
        : null,
  };
}

ipcMain.handle('server:get-config', () => serverConfig);
ipcMain.handle('server:status', () => hosted.status);
ipcMain.handle('server:set-config', async (_e, cfg: Partial<HostedServerConfig>) => {
  const next = sanitize(cfg);
  const changed = next.port !== serverConfig.port || next.upnp !== serverConfig.upnp || next.tunnel !== serverConfig.tunnel || JSON.stringify(next.turn ?? null) !== JSON.stringify(serverConfig.turn ?? null);
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
  void (hosted ? hosted.dispose() : Promise.resolve()).finally(() => app.quit());
});

app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) {
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

app.whenReady().then(async () => {
  hosted = new HostedServer({
    dataDir: app.getPath('userData'),
    identity: await groupIdentity(),
    rendezvous,
    fetch: (u, init) => net.fetch(u, init),
    onStatus: onServerStatus,
  });
  // a copy of yesterday's data, before anything changes today
  await autoBackup(app.getPath('userData'), app.getVersion()).catch(() => null);
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

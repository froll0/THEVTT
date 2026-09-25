import { spawn, type ChildProcess } from 'node:child_process';
import { chmod, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

/**
 * Reaching the GM's server from the internet without touching the router:
 * a Cloudflare quick tunnel (free, no account) gives a public https address
 * that forwards to the local server, through any NAT or CGNAT.
 * cloudflared is downloaded from Cloudflare's GitHub releases on first use.
 */

const RELEASES = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';

/** Release asset for this platform, or null when Cloudflare doesn't ship one. */
export function cloudflaredAsset(platform: string, arch: string): { file: string; archive: boolean } | null {
  if (platform === 'win32') return arch === 'ia32' ? { file: 'cloudflared-windows-386.exe', archive: false } : { file: 'cloudflared-windows-amd64.exe', archive: false };
  if (platform === 'darwin') return { file: arch === 'arm64' ? 'cloudflared-darwin-arm64.tgz' : 'cloudflared-darwin-amd64.tgz', archive: true };
  if (platform === 'linux') {
    const a = { x64: 'amd64', arm64: 'arm64', arm: 'arm', ia32: '386' }[arch];
    return a ? { file: `cloudflared-linux-${a}`, archive: false } : null;
  }
  return null;
}

/** The public address cloudflared prints once the quick tunnel is up. */
export function parseTunnelUrl(output: string): string | null {
  return /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(output)?.[0] ?? null;
}

/** Extracts one regular file from a (ustar) tar archive. */
export function extractFromTar(tar: Buffer, name: string): Buffer | null {
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) return null;
    const field = (start: number, len: number) => header.subarray(start, start + len).toString('utf8').replace(/\0.*$/s, '');
    const prefix = field(345, 155);
    const entry = (prefix ? `${prefix}/` : '') + field(0, 100);
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156] ?? 48);
    off += 512;
    if ((type === '0' || type === '\0') && entry.replace(/^\.\//, '').split('/').pop() === name) return Buffer.from(tar.subarray(off, off + size));
    off += Math.ceil(size / 512) * 512;
  }
  return null;
}

export type TunnelState =
  | { state: 'off' }
  | { state: 'downloading'; progress: number }
  | { state: 'starting' }
  | { state: 'ready'; url: string }
  | { state: 'error'; message: string };

type Fetch = (url: string) => Promise<Response>;

export class Tunnel {
  private child: ChildProcess | null = null;
  private stopped = true;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  state: TunnelState = { state: 'off' };

  constructor(
    private readonly binDir: string,
    private readonly onState: (s: TunnelState) => void,
    private readonly fetchFn: Fetch = (u) => fetch(u),
    private readonly platform = process.platform,
    private readonly arch = process.arch,
  ) {}

  private set(s: TunnelState) {
    this.state = s;
    this.onState(s);
  }

  get binaryPath(): string {
    return join(this.binDir, this.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  }

  /** Downloads cloudflared once; later starts reuse it. */
  async ensureBinary(): Promise<string> {
    const target = this.binaryPath;
    const existing = await stat(target).catch(() => null);
    if (existing && existing.size > 1_000_000) return target;
    const asset = cloudflaredAsset(this.platform, this.arch);
    if (!asset) throw new Error('Il collegamento automatico non è disponibile per questo sistema');
    this.set({ state: 'downloading', progress: 0 });
    const res = await this.fetchFn(RELEASES + asset.file);
    if (!res.ok || !res.body) throw new Error(`Download non riuscito (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    const chunks: Uint8Array[] = [];
    let got = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) this.set({ state: 'downloading', progress: Math.min(1, got / total) });
    }
    let data: Buffer = Buffer.concat(chunks);
    if (asset.archive) {
      const file = extractFromTar(gunzipSync(data), 'cloudflared');
      if (!file) throw new Error('Archivio di cloudflared non valido');
      data = file;
    }
    if (data.length < 1_000_000) throw new Error('Download di cloudflared incompleto');
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.download`;
    await writeFile(tmp, data);
    await chmod(tmp, 0o755);
    await rm(target, { force: true });
    await rename(tmp, target);
    return target;
  }

  start(localPort: number): void {
    this.stopped = false;
    this.attempts = 0;
    void this.run(localPort);
  }

  private async run(localPort: number) {
    if (this.stopped) return;
    let bin: string;
    try {
      bin = await this.ensureBinary();
    } catch (e) {
      this.set({ state: 'error', message: e instanceof Error ? e.message : 'Download non riuscito' });
      this.scheduleRetry(localPort);
      return;
    }
    if (this.stopped) return;
    this.set({ state: 'starting' });
    const child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${localPort}`], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    this.child = child;
    let output = '';
    const onData = (buf: Buffer) => {
      output = (output + buf.toString()).slice(-20_000);
      const url = parseTunnelUrl(output);
      if (url && this.state.state !== 'ready') {
        this.attempts = 0;
        this.set({ state: 'ready', url });
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    const timeout = setTimeout(() => {
      if (this.child === child && this.state.state !== 'ready') child.kill();
    }, 45_000);
    child.on('error', (e) => {
      clearTimeout(timeout);
      if (this.child !== child) return;
      this.child = null;
      this.set({ state: 'error', message: e.message });
      this.scheduleRetry(localPort);
    });
    child.on('exit', () => {
      clearTimeout(timeout);
      if (this.child !== child) return;
      this.child = null;
      if (this.stopped) return;
      this.set({ state: 'error', message: /provisioning failed|failed to request quick Tunnel|dial tcp|no such host/i.test(output) ? 'Cloudflare non raggiungibile' : 'Il collegamento si è interrotto' });
      this.scheduleRetry(localPort);
    });
  }

  /** backoff: 5s, 10s, 20s ... up to 5 minutes */
  private scheduleRetry(localPort: number) {
    if (this.stopped) return;
    const delay = Math.min(300_000, 5000 * 2 ** this.attempts++);
    this.retry = setTimeout(() => void this.run(localPort), delay);
  }

  stop(): void {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    const child = this.child;
    this.child = null;
    child?.kill();
    if (this.state.state !== 'off') this.set({ state: 'off' });
  }
}

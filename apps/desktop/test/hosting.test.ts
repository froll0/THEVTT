import { gzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { announce, checkAnnouncement, codeFor, looksLikeCode, newIdentity, normalizeCode, resolve, topicFor } from '../src/main/group-code';
import { cloudflaredAsset, extractFromTar, parseTunnelUrl, Tunnel } from '../src/main/tunnel';

function tar(files: Record<string, Buffer>): Buffer {
  const parts: Buffer[] = [];
  for (const [name, data] of Object.entries(files)) {
    const h = Buffer.alloc(512);
    h.write(name, 0);
    h.write('0000755\0', 100);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('0', 156);
    h.write('ustar\0', 257);
    parts.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

const ndjson = (messages: unknown[]) =>
  messages.map((m) => JSON.stringify({ event: 'message', message: typeof m === 'string' ? m : JSON.stringify(m) })).join('\n') + '\n' + JSON.stringify({ event: 'open' });

describe('group code', () => {
  it('is a short, stable, typeable name for a key', () => {
    const id = newIdentity();
    const code = codeFor(id.publicKey);
    expect(code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
    expect(codeFor(id.publicKey)).toBe(code);
    expect(normalizeCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code);
    expect(normalizeCode('abc')).toBeNull();
    expect(looksLikeCode(code)).toBe(true);
    expect(looksLikeCode('192.168.1.20:4477')).toBe(false);
    expect(looksLikeCode('vtt.example.com')).toBe(false);
    expect(topicFor(code)).toMatch(/^thevtt-[a-z2-7]{16}$/);
  });

  it('accepts only addresses signed by the key behind the code', () => {
    const id = newIdentity();
    const other = newIdentity();
    const code = codeFor(id.publicKey);
    const a = announce(id, 'https://abc.trycloudflare.com');
    expect(checkAnnouncement(code, a)?.url).toBe('https://abc.trycloudflare.com');
    expect(checkAnnouncement(code, { ...a, url: 'https://evil.example' })).toBeNull();
    expect(checkAnnouncement(code, announce(other, 'https://evil.example'))).toBeNull();
    expect(checkAnnouncement(code, { ...announce(other, 'https://evil.example'), pub: id.publicKey })).toBeNull();
    expect(checkAnnouncement(code, 'nope')).toBeNull();
  });

  it('resolves the newest valid address and ignores junk and forgeries', async () => {
    const id = newIdentity();
    const code = codeFor(id.publicKey);
    const body = ndjson([announce(id, 'https://old.trycloudflare.com', 1000), 'hello', announce(newIdentity(), 'https://evil.example', 9e12), announce(id, 'https://new.trycloudflare.com', 2000)]);
    let asked = '';
    const url = await resolve('https://relay.test', code, async (u) => {
      asked = String(u);
      return new Response(body);
    });
    expect(asked).toBe(`https://relay.test/${topicFor(code)}/json?poll=1&since=all`);
    expect(url).toBe('https://new.trycloudflare.com');
    expect(await resolve('https://relay.test', code, async () => new Response(''))).toBeNull();
  });
});

describe('tunnel', () => {
  it('picks the right cloudflared build and reads its address', () => {
    expect(cloudflaredAsset('win32', 'x64')?.file).toBe('cloudflared-windows-amd64.exe');
    expect(cloudflaredAsset('darwin', 'arm64')).toEqual({ file: 'cloudflared-darwin-arm64.tgz', archive: true });
    expect(cloudflaredAsset('linux', 'x64')?.file).toBe('cloudflared-linux-amd64');
    expect(cloudflaredAsset('freebsd', 'x64')).toBeNull();
    const log = `2026-09-25T10:00:00Z INF Requesting new quick Tunnel on trycloudflare.com...
2026-09-25T10:00:02Z INF +--------------------------------------------------------------------------------------------+
2026-09-25T10:00:02Z INF |  https://silly-words-here-now.trycloudflare.com                                            |`;
    expect(parseTunnelUrl(log)).toBe('https://silly-words-here-now.trycloudflare.com');
    expect(parseTunnelUrl('INF Starting tunnel')).toBeNull();
  });

  it('extracts the binary from the macOS archive and installs it once', async () => {
    const bin = Buffer.alloc(1_200_000, 7);
    const archive = tar({ 'README.md': Buffer.from('hi'), cloudflared: bin });
    expect(extractFromTar(archive, 'cloudflared')?.length).toBe(bin.length);
    expect(extractFromTar(archive, 'missing')).toBeNull();

    const dir = mkdtempSync(join(tmpdir(), 'thevtt-bin-'));
    let downloads = 0;
    const states: string[] = [];
    const t = new Tunnel(
      dir,
      (s) => states.push(s.state),
      async (u) => {
        downloads++;
        expect(u).toContain('cloudflared-darwin-arm64.tgz');
        return new Response(gzipSync(archive), { headers: { 'content-length': String(gzipSync(archive).length) } });
      },
      'darwin',
      'arm64',
    );
    const path = await t.ensureBinary();
    expect(readFileSync(path).equals(bin)).toBe(true);
    expect(statSync(path).mode & 0o111).toBeTruthy();
    await t.ensureBinary();
    expect(downloads).toBe(1);
    expect(states).toContain('downloading');
  });
});

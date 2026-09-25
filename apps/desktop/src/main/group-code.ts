import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from 'node:crypto';

/**
 * The group code: a short, permanent name for a GM's server whose address
 * changes (the tunnel gets a new one at every start). The GM publishes the
 * current address, signed, on a public relay (ntfy.sh); players look the code
 * up there. The code is a hash of the GM's public key, so nobody else can
 * publish a valid address for it.
 */

export const DEFAULT_RENDEZVOUS = 'https://ntfy.sh';

export interface GroupIdentity {
  /** base64url raw Ed25519 public key */
  publicKey: string;
  /** PKCS#8 DER, base64 */
  privateKey: string;
}

export interface Announcement {
  v: 1;
  url: string;
  ts: number;
  pub: string;
  sig: string;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function newIdentity(): GroupIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ format: 'jwk' }).x!,
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  };
}

/** "ABCD-EFGH-JKLM-NPQR": 80 bits of the public key's hash. */
export function codeFor(publicKey: string): string {
  const hash = createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest();
  return base32(hash)
    .slice(0, 16)
    .match(/.{4}/g)!
    .join('-');
}

/** Accepts codes typed loosely: lower case, spaces, missing dashes. */
export function normalizeCode(input: string): string | null {
  // base32 has no 0, 1, 8: people read them as O, I, B
  const s = input.toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I').replace(/8/g, 'B').replace(/[^A-Z2-7]/g, '');
  if (s.length !== 16) return null;
  return s.match(/.{4}/g)!.join('-');
}

export const looksLikeCode = (input: string) => /^\s*[a-z0-9]{4}[-\s]?[a-z0-9]{4}[-\s]?[a-z0-9]{4}[-\s]?[a-z0-9]{4}\s*$/i.test(input) && !/[.:/]/.test(input);

export const topicFor = (code: string) => `thevtt-${code.replace(/-/g, '').toLowerCase()}`;

const payload = (code: string, url: string, ts: number) => Buffer.from(`thevtt:v1:${code}:${url}:${ts}`);

const publicKeyObject = (raw: string): KeyObject => createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: raw }, format: 'jwk' });

export function announce(id: GroupIdentity, url: string, ts = Date.now()): Announcement {
  const code = codeFor(id.publicKey);
  const key = createPrivateKey({ key: Buffer.from(id.privateKey, 'base64'), format: 'der', type: 'pkcs8' });
  return { v: 1, url, ts, pub: id.publicKey, sig: sign(null, payload(code, url, ts), key).toString('base64url') };
}

/** A valid announcement for this code, or null (wrong key, bad signature, garbage). */
export function checkAnnouncement(code: string, raw: unknown, now = Date.now()): Announcement | null {
  const a = raw as Partial<Announcement> | null;
  if (!a || a.v !== 1 || typeof a.url !== 'string' || typeof a.ts !== 'number' || typeof a.pub !== 'string' || typeof a.sig !== 'string') return null;
  if (!/^https?:\/\/[^\s]+$/.test(a.url) || a.ts > now + 24 * 3600_000) return null;
  try {
    if (codeFor(a.pub) !== code) return null;
    if (!verify(null, payload(code, a.url, a.ts), publicKeyObject(a.pub), Buffer.from(a.sig, 'base64url'))) return null;
  } catch {
    return null;
  }
  return a as Announcement;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function publish(base: string, id: GroupIdentity, url: string, fetchFn: Fetch = fetch): Promise<void> {
  const res = await fetchFn(`${base}/${topicFor(codeFor(id.publicKey))}`, { method: 'POST', body: JSON.stringify(announce(id, url)), headers: { Title: 'TheVTT' } });
  if (!res.ok) throw new Error(`Pubblicazione non riuscita (${res.status})`);
}

/** The newest valid address published for a code, or null if the GM isn't online. */
export async function resolve(base: string, code: string, fetchFn: Fetch = fetch): Promise<string | null> {
  const res = await fetchFn(`${base}/${topicFor(code)}/json?poll=1&since=all`);
  if (!res.ok) throw new Error(`Servizio non raggiungibile (${res.status})`);
  let best: Announcement | null = null;
  for (const line of (await res.text()).split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as { event?: string; message?: string };
      if (ev.event !== 'message' || !ev.message) continue;
      const a = checkAnnouncement(code, JSON.parse(ev.message));
      if (a && (!best || a.ts > best.ts)) best = a;
    } catch {
      /* someone else's junk on the topic */
    }
  }
  return best?.url ?? null;
}

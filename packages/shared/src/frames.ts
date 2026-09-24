/**
 * Message framing for WebRTC data channels, whose per-message size is limited
 * (≈256 KB in Chromium). Small messages travel whole; big ones (maps, portraits)
 * are split into frames and reassembled on the other side.
 *
 * Wire format (strings): `W<json>` whole message, `F<id>:<index>:<count>:<chunk>` frame.
 */

export const FRAME_SIZE = 60_000;

let frameSeq = 0;

export function encodeFrames(message: unknown, frameSize = FRAME_SIZE): string[] {
  const json = JSON.stringify(message);
  if (json.length <= frameSize) return [`W${json}`];
  const id = `${Date.now().toString(36)}${(frameSeq++).toString(36)}`;
  const count = Math.ceil(json.length / frameSize);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(`F${id}:${i}:${count}:${json.slice(i * frameSize, (i + 1) * frameSize)}`);
  return out;
}

/** Collects frames and yields complete messages. Incomplete messages expire. */
export class FrameDecoder {
  private partial = new Map<string, { parts: string[]; got: number; at: number }>();

  constructor(private readonly ttlMs = 60_000) {}

  push(data: string, now = Date.now()): unknown | undefined {
    if (data[0] === 'W') return JSON.parse(data.slice(1));
    if (data[0] !== 'F') throw new Error('Frame non valido');
    const a = data.indexOf(':');
    const b = data.indexOf(':', a + 1);
    const c = data.indexOf(':', b + 1);
    if (a < 0 || b < 0 || c < 0) throw new Error('Frame non valido');
    const id = data.slice(1, a);
    const index = Number(data.slice(a + 1, b));
    const count = Number(data.slice(b + 1, c));
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || count > 10_000 || index < 0 || index >= count) {
      throw new Error('Frame non valido');
    }
    this.expire(now);
    let entry = this.partial.get(id);
    if (!entry) this.partial.set(id, (entry = { parts: new Array<string>(count), got: 0, at: now }));
    if (entry.parts[index] === undefined) {
      entry.parts[index] = data.slice(c + 1);
      entry.got++;
    }
    if (entry.got < count) return undefined;
    this.partial.delete(id);
    return JSON.parse(entry.parts.join(''));
  }

  private expire(now: number) {
    for (const [id, e] of this.partial) if (now - e.at > this.ttlMs) this.partial.delete(id);
  }
}

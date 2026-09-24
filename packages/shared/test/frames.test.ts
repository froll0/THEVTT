import { describe, expect, it } from 'vitest';
import { encodeFrames, FrameDecoder } from '../src/frames';

describe('frames', () => {
  it('sends small messages whole', () => {
    const frames = encodeFrames({ k: 'state', n: 1 });
    expect(frames).toHaveLength(1);
    expect(new FrameDecoder().push(frames[0]!)).toEqual({ k: 'state', n: 1 });
  });

  it('splits and reassembles big messages, in any order', () => {
    const msg = { k: 'asset', id: 'a', dataUrl: 'data:image/png;base64,' + 'x:y'.repeat(50_000) };
    const frames = encodeFrames(msg, 10_000);
    expect(frames.length).toBeGreaterThan(10);
    const dec = new FrameDecoder();
    const shuffled = [...frames].reverse();
    const results = shuffled.map((f) => dec.push(f));
    expect(results.slice(0, -1).every((r) => r === undefined)).toBe(true);
    expect(results.at(-1)).toEqual(msg);
  });

  it('keeps interleaved messages apart', () => {
    const a = encodeFrames({ v: 'a'.repeat(300) }, 100);
    const b = encodeFrames({ v: 'b'.repeat(300) }, 100);
    const dec = new FrameDecoder();
    const out: unknown[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      for (const f of [a[i], b[i]]) if (f) {
        const r = dec.push(f);
        if (r) out.push(r);
      }
    }
    expect(out).toEqual([{ v: 'a'.repeat(300) }, { v: 'b'.repeat(300) }]);
  });

  it('drops expired partial messages and rejects garbage', () => {
    const dec = new FrameDecoder(1000);
    const frames = encodeFrames({ v: 'z'.repeat(300) }, 100);
    dec.push(frames[0]!, 0);
    for (const f of frames.slice(1)) expect(dec.push(f, 5000)).toBeUndefined();
    expect(() => dec.push('Xnope')).toThrow();
    expect(() => dec.push('Fid:9:2:x')).toThrow();
  });
});

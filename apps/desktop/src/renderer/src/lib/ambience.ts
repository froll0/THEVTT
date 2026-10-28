import type { Ambience } from '@thevtt/shared';

/**
 * The ambiences of the scenes, synthesized with Web Audio like the sound
 * effects: a bed that loops (murmur, rain, waves, wind) and little events
 * at random moments (a mug, a drop, a bird, a crackle). Nothing to download.
 */

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

/** seconds of noise that loop; white, or brown (deeper) */
const beds = new Map<string, AudioBuffer>();
function noiseBuffer(ac: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const have = beds.get(kind);
  if (have) return have;
  const buf = ac.createBuffer(1, ac.sampleRate * 6, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  beds.set(kind, buf);
  return buf;
}

interface Voice {
  /** every node to stop at the end */
  sources: AudioScheduledSourceNode[];
  timers: Set<number>;
}

function loopNoise(ac: AudioContext, v: Voice, kind: 'white' | 'brown', out: AudioNode, filter: BiquadFilterType, freq: number, q = 0.7, gain = 1) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, kind);
  src.loop = true;
  // each bed starts somewhere else in the loop, so two beds do not beat
  src.start(0, Math.random() * 5);
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  v.sources.push(src);
  return { filter: f, gain: g };
}

/** a slow wobble on a parameter (waves, gusts, the murmur of a crowd) */
function wobble(ac: AudioContext, v: Voice, param: AudioParam, rate: number, depth: number) {
  const lfo = ac.createOscillator();
  lfo.frequency.value = rate;
  const d = ac.createGain();
  d.gain.value = depth;
  lfo.connect(d).connect(param);
  lfo.start();
  v.sources.push(lfo);
}

/** something that happens now and then: every `min`..`max` seconds */
function every(v: Voice, min: number, max: number, fn: () => void) {
  const next = () => {
    const t = window.setTimeout(() => {
      v.timers.delete(t);
      fn();
      next();
    }, (min + Math.random() * (max - min)) * 1000);
    v.timers.add(t);
  };
  next();
}

function ping(ac: AudioContext, out: AudioNode, freq: number, at: number, peak: number, release: number, type: OscillatorType = 'sine', to?: number) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + release);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + release);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + release + 0.05);
}

function crackle(ac: AudioContext, out: AudioNode, at: number, peak: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 'white');
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1500 + Math.random() * 3500;
  f.Q.value = 2;
  const g = ac.createGain();
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.02 + Math.random() * 0.04);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 5, 0.08);
}

const BUILD: Record<Ambience, (ac: AudioContext, out: AudioNode, v: Voice) => void> = {
  taverna: (ac, out, v) => {
    // the murmur: voices are noise in the speech band, swelling and falling
    for (const [f, rate] of [
      [380, 0.31],
      [700, 0.23],
      [1100, 0.17],
    ] as const) {
      const b = loopNoise(ac, v, 'white', out, 'bandpass', f, 1.4, 0.05);
      wobble(ac, v, b.gain.gain, rate, 0.03);
    }
    loopNoise(ac, v, 'brown', out, 'lowpass', 240, 0.7, 0.12);
    // mugs and cutlery
    every(v, 1.2, 4, () => {
      const t = ac.currentTime + 0.01;
      const f = 1800 + Math.random() * 1600;
      ping(ac, out, f, t, 0.05, 0.25);
      ping(ac, out, f * 2.7, t, 0.02, 0.15);
    });
    // the fire in the hearth
    every(v, 0.15, 0.9, () => crackle(ac, out, ac.currentTime + 0.01, 0.05));
  },
  foresta: (ac, out, v) => {
    // leaves in the wind
    const w = loopNoise(ac, v, 'white', out, 'bandpass', 900, 0.5, 0.05);
    wobble(ac, v, w.gain.gain, 0.09, 0.035);
    wobble(ac, v, w.filter.frequency, 0.05, 300);
    // birds: a few quick whistles
    every(v, 1.5, 5, () => {
      const t = ac.currentTime + 0.01;
      const base = 2200 + Math.random() * 2200;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) ping(ac, out, base, t + i * 0.11, 0.04, 0.09, 'sine', base * (1.2 + Math.random() * 0.4));
    });
  },
  dungeon: (ac, out, v) => {
    // a deep hum of stone, two tones beating slowly
    for (const f of [55, 55.6]) {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = 0.05;
      o.connect(g).connect(out);
      o.start();
      v.sources.push(o);
    }
    const air = loopNoise(ac, v, 'brown', out, 'lowpass', 160, 0.7, 0.18);
    wobble(ac, v, air.gain.gain, 0.04, 0.08);
    // water dripping, with the echo of the vault
    const echo = ac.createDelay(1);
    echo.delayTime.value = 0.32;
    const fb = ac.createGain();
    fb.gain.value = 0.35;
    echo.connect(fb).connect(echo);
    echo.connect(out);
    every(v, 1.5, 4.5, () => {
      const t = ac.currentTime + 0.01;
      const f = 900 + Math.random() * 700;
      ping(ac, out, f, t, 0.06, 0.12, 'sine', f * 0.45);
      ping(ac, echo, f, t, 0.04, 0.12, 'sine', f * 0.45);
    });
  },
  pioggia: (ac, out, v) => {
    // the patter: white noise above, a softer rush below
    loopNoise(ac, v, 'white', out, 'highpass', 1800, 0.5, 0.08);
    const rush = loopNoise(ac, v, 'white', out, 'lowpass', 900, 0.5, 0.06);
    wobble(ac, v, rush.gain.gain, 0.07, 0.02);
    // drops on the roof and the puddles
    every(v, 0.05, 0.25, () => crackle(ac, out, ac.currentTime + 0.01, 0.03 + Math.random() * 0.03));
  },
  mare: (ac, out, v) => {
    // waves: a deep rush that rises and falls, the foam on top
    const sea = loopNoise(ac, v, 'brown', out, 'lowpass', 500, 0.7, 0.2);
    wobble(ac, v, sea.gain.gain, 0.11, 0.17);
    const foam = loopNoise(ac, v, 'white', out, 'bandpass', 2500, 0.6, 0.03);
    wobble(ac, v, foam.gain.gain, 0.11, 0.028);
    every(v, 4, 10, () => {
      // a gull, far away
      const t = ac.currentTime + 0.01;
      for (let i = 0; i < 3; i++) ping(ac, out, 1500, t + i * 0.28, 0.02, 0.22, 'triangle', 1050);
    });
  },
  fuoco: (ac, out, v) => {
    const roar = loopNoise(ac, v, 'brown', out, 'lowpass', 300, 0.7, 0.2);
    wobble(ac, v, roar.gain.gain, 0.3, 0.06);
    every(v, 0.05, 0.4, () => crackle(ac, out, ac.currentTime + 0.01, 0.05 + Math.random() * 0.1));
    // now and then a log settles: a pop
    every(v, 3, 8, () => {
      const t = ac.currentTime + 0.01;
      for (let i = 0; i < 4; i++) crackle(ac, out, t + i * 0.03, 0.18);
    });
  },
  notte: (ac, out, v) => {
    const air = loopNoise(ac, v, 'white', out, 'bandpass', 600, 0.4, 0.025);
    wobble(ac, v, air.gain.gain, 0.06, 0.015);
    // crickets: trains of short chirps, two of them answering each other
    for (const [f, start] of [
      [4400, 0],
      [4700, 0.4],
    ] as const) {
      every(v, 0.7, 1.4, () => {
        const t = ac.currentTime + 0.01 + start * Math.random();
        for (let i = 0; i < 3; i++) ping(ac, out, f, t + i * 0.045, 0.018, 0.03, 'triangle');
      });
    }
    // an owl, rarely
    every(v, 9, 20, () => {
      const t = ac.currentTime + 0.01;
      ping(ac, out, 420, t, 0.05, 0.35, 'sine', 380);
      ping(ac, out, 420, t + 0.5, 0.04, 0.5, 'sine', 360);
    });
  },
  vento: (ac, out, v) => {
    // gusts: a band of noise that sweeps up and down
    const gust = loopNoise(ac, v, 'white', out, 'bandpass', 500, 2.5, 0.12);
    wobble(ac, v, gust.filter.frequency, 0.07, 280);
    wobble(ac, v, gust.gain.gain, 0.05, 0.08);
    const low = loopNoise(ac, v, 'brown', out, 'lowpass', 200, 0.7, 0.1);
    wobble(ac, v, low.gain.gain, 0.03, 0.06);
  },
};

export interface AmbiencePlayer {
  setVolume(volume: number): void;
  /** fades out, then frees everything */
  stop(fadeSeconds?: number): void;
}

/** Starts an ambience at a volume (0..1), fading in. */
export function startAmbience(id: Ambience, volume: number, fadeSeconds = 2.5): AmbiencePlayer | null {
  const build = BUILD[id];
  if (!build || typeof AudioContext === 'undefined') return null;
  const ac = audio();
  void ac.resume();
  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.linearRampToValueAtTime(Math.max(0.0001, volume), ac.currentTime + fadeSeconds);
  master.connect(ac.destination);
  const v: Voice = { sources: [], timers: new Set() };
  build(ac, master, v);
  let stopped = false;
  return {
    setVolume(vol) {
      if (stopped) return;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(Math.max(0.0001, vol), ac.currentTime, 0.2);
    },
    stop(fade = 2) {
      if (stopped) return;
      stopped = true;
      for (const t of v.timers) clearTimeout(t);
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + fade);
      window.setTimeout(() => {
        for (const s of v.sources) {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        }
        master.disconnect();
      }, fade * 1000 + 100);
    },
  };
}

/** The browser may hold sound back until the first click: try again then. */
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

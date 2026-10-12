import type { BuiltinSound } from '@thevtt/shared';

/**
 * The built-in sound effects, synthesized on the spot with Web Audio:
 * no files to ship, the same sound on every computer.
 */
let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

function noise(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

/** a gain that rises in `attack` and fades out over `release` */
function envelope(ac: AudioContext, out: AudioNode, at: number, peak: number, attack: number, release: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  g.connect(out);
  return g;
}

function filtered(ac: AudioContext, src: AudioNode, type: BiquadFilterType, freq: number, q = 1) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f);
  return f;
}

function tone(ac: AudioContext, out: AudioNode, type: OscillatorType, freq: number, at: number, peak: number, attack: number, release: number) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  o.connect(envelope(ac, out, at, peak, attack, release));
  o.start(at);
  o.stop(at + attack + release + 0.05);
  return o;
}

function burst(ac: AudioContext, out: AudioNode, at: number, seconds: number, type: BiquadFilterType, freq: number, peak: number, attack: number, q = 1) {
  const n = noise(ac, seconds + attack);
  filtered(ac, n, type, freq, q).connect(envelope(ac, out, at, peak, attack, seconds));
  n.start(at);
  return n;
}

const SYNTHS: Record<BuiltinSound, (ac: AudioContext, out: AudioNode, t: number) => void> = {
  tuono: (ac, out, t) => {
    burst(ac, out, t, 0.25, 'lowpass', 2500, 0.9, 0.005);
    burst(ac, out, t + 0.05, 3.2, 'lowpass', 180, 1, 0.15);
    burst(ac, out, t + 0.6, 2, 'lowpass', 90, 0.8, 0.3);
  },
  esplosione: (ac, out, t) => {
    burst(ac, out, t, 1.8, 'lowpass', 600, 1, 0.01);
    const o = tone(ac, out, 'sine', 120, t, 0.9, 0.01, 1.2);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
  },
  porta: (ac, out, t) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t);
    for (let i = 1; i <= 14; i++) o.frequency.linearRampToValueAtTime(140 + Math.sin(i * 1.7) * 60 + i * 6, t + i * 0.09);
    filtered(ac, o, 'bandpass', 900, 4).connect(envelope(ac, out, t, 0.35, 0.1, 1.3));
    o.start(t);
    o.stop(t + 1.5);
  },
  spade: (ac, out, t) => {
    for (const [dt, f] of [
      [0, 2100],
      [0.22, 2600],
    ] as const) {
      burst(ac, out, t + dt, 0.08, 'highpass', 3000, 0.5, 0.002);
      for (const k of [1, 2.76, 5.4]) tone(ac, out, 'sine', f * k * 0.5, t + dt, 0.18 / k, 0.002, 0.9);
    }
  },
  ruggito: (ac, out, t) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.5);
    o.frequency.linearRampToValueAtTime(55, t + 1.8);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 28;
    const depth = ac.createGain();
    depth.gain.value = 18;
    lfo.connect(depth).connect(o.frequency);
    filtered(ac, o, 'lowpass', 700, 2).connect(envelope(ac, out, t, 0.7, 0.25, 1.6));
    burst(ac, out, t, 1.6, 'bandpass', 500, 0.3, 0.3, 0.8);
    o.start(t);
    lfo.start(t);
    o.stop(t + 2);
    lfo.stop(t + 2);
  },
  campana: (ac, out, t) => {
    for (const [k, v] of [
      [1, 0.4],
      [2.0, 0.2],
      [2.76, 0.15],
      [5.4, 0.08],
    ] as const) tone(ac, out, 'sine', 330 * k, t, v, 0.005, 3.5 / Math.sqrt(k));
  },
  cuore: (ac, out, t) => {
    for (let b = 0; b < 4; b++) {
      for (const dt of [0, 0.28]) {
        const o = tone(ac, out, 'sine', 70, t + b * 0.9 + dt, dt ? 0.5 : 0.8, 0.01, 0.18);
        o.frequency.exponentialRampToValueAtTime(40, t + b * 0.9 + dt + 0.18);
      }
    }
  },
  vento: (ac, out, t) => {
    const n = noise(ac, 4.5);
    const f = filtered(ac, n, 'bandpass', 500, 3);
    f.frequency.setValueAtTime(400, t);
    f.frequency.linearRampToValueAtTime(900, t + 1.5);
    f.frequency.linearRampToValueAtTime(350, t + 4);
    f.connect(envelope(ac, out, t, 0.5, 1.2, 3));
    n.start(t);
  },
  magia: (ac, out, t) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, out, 'triangle', f, t + i * 0.07, 0.18, 0.01, 1.4));
    burst(ac, out, t, 1.2, 'highpass', 6000, 0.08, 0.3);
  },
  trappola: (ac, out, t) => {
    burst(ac, out, t, 0.06, 'highpass', 2000, 0.8, 0.001);
    for (const k of [1, 1.5]) tone(ac, out, 'square', 900 * k, t, 0.08, 0.001, 0.25);
    burst(ac, out, t + 0.12, 0.9, 'lowpass', 400, 0.6, 0.01);
  },
  monete: (ac, out, t) => {
    for (let i = 0; i < 9; i++) {
      const at = t + i * 0.06 + Math.random() * 0.05;
      for (const k of [1, 2.7]) tone(ac, out, 'sine', (2800 + Math.random() * 1600) * k * 0.6, at, 0.1 / k, 0.001, 0.35);
    }
  },
  corno: (ac, out, t) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.linearRampToValueAtTime(147, t + 0.25);
    filtered(ac, o, 'lowpass', 900, 1.5).connect(envelope(ac, out, t, 0.45, 0.25, 2.2));
    o.start(t);
    o.stop(t + 2.6);
  },
};

/** Plays a built-in sound, or an audio data URL, at the given volume (0..1). */
export function playSfx(sound: string, volume: number, dataUrl?: string) {
  if (volume <= 0) return;
  if (dataUrl) {
    const a = new Audio(dataUrl);
    a.volume = Math.min(1, volume);
    void a.play().catch(() => undefined);
    return;
  }
  const synth = SYNTHS[sound as BuiltinSound];
  if (!synth) return;
  const ac = audio();
  void ac.resume();
  const master = ac.createGain();
  master.gain.value = Math.min(1, volume);
  master.connect(ac.destination);
  synth(ac, master, ac.currentTime + 0.02);
}

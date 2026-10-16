/**
 * Characters' lines read aloud with the system's speech voices: each
 * character always gets the same voice and pitch (from their name), Italian
 * voices first.
 */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speakAs(name: string, text: string, lang = 'it'): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const all = synth.getVoices();
  const local = all.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const pool = local.length ? local : all;
  const h = hash(name);
  const u = new SpeechSynthesisUtterance(text.slice(0, 400));
  if (pool.length) u.voice = pool[h % pool.length]!;
  u.lang = u.voice?.lang ?? lang;
  // the same voice for two characters still sounds different
  u.pitch = 0.7 + ((h >> 4) % 7) * 0.1;
  u.rate = 0.92 + ((h >> 8) % 4) * 0.05;
  synth.speak(u);
}

/** The sound effects every table has: made by the app itself, nothing to download. */
export const BUILTIN_SOUNDS = [
  { id: 'tuono', name: 'Tuono' },
  { id: 'esplosione', name: 'Esplosione' },
  { id: 'porta', name: 'Porta che cigola' },
  { id: 'spade', name: 'Spade' },
  { id: 'ruggito', name: 'Ruggito' },
  { id: 'campana', name: 'Campana' },
  { id: 'cuore', name: 'Battito' },
  { id: 'vento', name: 'Vento' },
  { id: 'magia', name: 'Magia' },
  { id: 'trappola', name: 'Trappola' },
  { id: 'monete', name: 'Monete' },
  { id: 'corno', name: 'Corno di guerra' },
] as const;

export type BuiltinSound = (typeof BUILTIN_SOUNDS)[number]['id'];

/** A sound by its id or name, built-in or the GM's own («tuono», «Porta che cigola», «Il mio urlo»). */
export function findSound(sounds: { id: string; name: string }[], query: string): { id: string; name: string } | undefined {
  const q = query.trim().toLowerCase();
  const all = [...BUILTIN_SOUNDS, ...sounds];
  return all.find((s) => s.id === q || s.name.toLowerCase() === q) ?? all.find((s) => s.name.toLowerCase().startsWith(q));
}

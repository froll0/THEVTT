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

/** Ambiences: a scene's background sound, looping, made by the app like the effects. */
export const AMBIENCES = [
  { id: 'taverna', name: 'Taverna' },
  { id: 'foresta', name: 'Foresta' },
  { id: 'dungeon', name: 'Sotterraneo' },
  { id: 'pioggia', name: 'Pioggia' },
  { id: 'mare', name: 'Mare' },
  { id: 'fuoco', name: 'Fuoco da campo' },
  { id: 'notte', name: 'Notte' },
  { id: 'vento', name: 'Vento sulle vette' },
] as const;

export type Ambience = (typeof AMBIENCES)[number]['id'];

export const isAmbience = (x: unknown): x is Ambience => AMBIENCES.some((a) => a.id === x);

/** An ambience by its id or name («taverna», «Fuoco da campo», «fuoco»). */
export function findAmbience(query: string): Ambience | undefined {
  const q = query.trim().toLowerCase();
  return (AMBIENCES.find((a) => a.id === q || a.name.toLowerCase() === q) ?? AMBIENCES.find((a) => a.name.toLowerCase().startsWith(q) || a.id.startsWith(q)))?.id;
}

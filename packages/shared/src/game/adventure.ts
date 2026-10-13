import type { Macro } from '../macros';
import { isMapPackage, packScene, type MapPackage } from './library';
import type { Encounter, GameState, Quest } from './state';
import type { RollTable, Shop } from './tables';
import type { Relations } from './relations';

/**
 * A whole adventure in one file: its scenes (with their creatures), the
 * encounters prepared on them, the GM's notes and handouts, the quests, the
 * music and sounds, the macros. Made from a campaign, opened in another one,
 * or passed to another GM.
 */
export interface AdventurePackage {
  format: 'thevtt-adventure';
  version: 1;
  name: string;
  description: string;
  /** systemId of the campaign it came from (creatures and macros are written for it) */
  systemId: string;
  scenes: { key: string; map: MapPackage }[];
  notes: { key: string; title: string; body: string; image: string | null }[];
  tracks: { key: string; name: string; asset: string }[];
  sounds: { name: string; asset: string }[];
  encounters: (Omit<Encounter, 'id' | 'sceneId' | 'trackId' | 'noteId' | 'launchedAt'> & { scene: string | null; track: string | null; note: string | null })[];
  quests: Omit<Quest, 'id' | 'updatedAt'>[];
  macros: Omit<Macro, 'id'>[];
  /** random tables and shops (added later: older files have none) */
  tables?: Omit<RollTable, 'id'>[];
  shops?: Omit<Shop, 'id'>[];
  /** who's who (added later too) */
  relations?: Relations;
  /** pictures and audio of notes, tracks, sounds and encounters, by key */
  assets: Record<string, string>;
}

export const ADVENTURE_FILE_EXT = 'thevtt-adventure';

/** The campaign's prepared material, packed. Players' characters and notes stay out. */
export function packAdventure(state: GameState, assets: Record<string, string>, opts: { name: string; description?: string; music?: boolean }): AdventurePackage {
  const used: Record<string, string> = {};
  const keep = (id: string | null | undefined): string | null => {
    if (!id || !assets[id]) return null;
    used[id] = assets[id]!;
    return id;
  };
  const tracks = opts.music === false ? [] : (state.music?.tracks ?? []).filter((t) => keep(t.asset)).map((t) => ({ key: t.id, name: t.name, asset: t.asset }));
  const notes = Object.values(state.notes ?? {})
    .filter((n) => n.authorId === state.gmId)
    .map((n) => ({ key: n.id, title: n.title, body: n.body, image: keep(n.image) }));
  const sceneKeys = new Set(Object.keys(state.scenes));
  const noteKeys = new Set(notes.map((n) => n.key));
  const trackKeys = new Set(tracks.map((t) => t.key));
  return {
    format: 'thevtt-adventure',
    version: 1,
    name: opts.name,
    description: opts.description ?? '',
    systemId: state.systemId,
    scenes: Object.keys(state.scenes).map((id) => ({ key: id, map: packScene(state, id, assets, { tokens: true }) })),
    notes,
    tracks,
    sounds: opts.music === false ? [] : (state.sounds ?? []).filter((x) => keep(x.asset)).map((x) => ({ name: x.name, asset: x.asset })),
    encounters: Object.values(state.encounters ?? {}).map(({ id: _id, sceneId, trackId, noteId, launchedAt: _l, ...e }) => ({
      ...structuredClone(e),
      tokens: e.tokens.map((t) => ({ ...structuredClone(t), image: keep(t.image) })),
      scene: sceneId && sceneKeys.has(sceneId) ? sceneId : null,
      track: trackId && trackKeys.has(trackId) ? trackId : null,
      note: noteId && noteKeys.has(noteId) ? noteId : null,
    })),
    quests: Object.values(state.quests ?? {}).map(({ id: _id, updatedAt: _u, ...q }) => structuredClone(q)),
    macros: (state.macros ?? []).map(({ id: _id, ...m }) => ({ ...m })),
    tables: Object.values(state.tables ?? {}).map(({ id: _id, ...t }) => structuredClone(t)),
    shops: Object.values(state.shops ?? {}).map(({ id: _id, ...x }) => ({ ...structuredClone(x), open: false })),
    relations: structuredClone(state.relations ?? { nodes: {}, links: {} }),
    assets: used,
  };
}

export function isAdventurePackage(v: unknown): v is AdventurePackage {
  const p = v as Partial<AdventurePackage> | null;
  return (
    !!p &&
    typeof p === 'object' &&
    p.format === 'thevtt-adventure' &&
    p.version === 1 &&
    typeof p.name === 'string' &&
    Array.isArray(p.scenes) &&
    p.scenes.every((s) => !!s && typeof s.key === 'string' && isMapPackage(s.map)) &&
    Array.isArray(p.notes) &&
    Array.isArray(p.tracks) &&
    Array.isArray(p.encounters) &&
    Array.isArray(p.quests) &&
    !!p.assets &&
    typeof p.assets === 'object'
  );
}

/** What it holds, to show before opening it. */
export function describeAdventure(p: AdventurePackage) {
  return {
    scenes: p.scenes.length,
    encounters: p.encounters.length,
    notes: p.notes.length,
    quests: p.quests.length,
    tracks: p.tracks.length,
    creatures: p.scenes.reduce((n, s) => n + s.map.tokens.length, 0) + p.encounters.reduce((n, e) => n + e.tokens.length, 0),
  };
}

import type { RollResult } from '../dice';

/**
 * Table state. It is owned and persisted by the GM's client (the host);
 * players receive a filtered copy after every change.
 * Heavy binary data (maps, token art) lives in a separate asset store and is
 * referenced by id, so state updates stay small.
 */

export interface Scene {
  id: string;
  name: string;
  /** asset id of the map image */
  background: string | null;
  widthCells: number;
  heightCells: number;
  /** feet (or any unit) per cell, shown on the ruler */
  cellDistance: number;
  showGrid: boolean;
}

export interface Token {
  id: string;
  sceneId: string;
  name: string;
  /** position in grid cells (top-left corner) */
  x: number;
  y: number;
  /** size in cells (1 = medium, 2 = large, ...) */
  size: number;
  color: string;
  /** asset id */
  image: string | null;
  ownerIds: string[];
  characterId: string | null;
  hp: { current: number; max: number } | null;
  ac: number | null;
  hidden: boolean;
  conditions: string[];
}

export interface InitiativeEntry {
  id: string;
  name: string;
  value: number;
  tokenId: string | null;
}

export interface Initiative {
  round: number;
  /** index into entries (sorted by value desc) */
  turn: number;
  entries: InitiativeEntry[];
}

export interface LogEntry {
  id: string;
  ts: number;
  authorId: string;
  authorName: string;
  kind: 'chat' | 'roll' | 'system';
  text: string;
  label?: string;
  roll?: RollResult;
  /** visible only to the author and the GM */
  private?: boolean;
}

export interface TablePlayer {
  id: string;
  displayName: string;
  color: string;
  online: boolean;
  characterId: string | null;
}

export interface TableCharacter {
  id: string;
  ownerId: string;
  name: string;
  systemId: string;
  data: unknown;
}

export interface GameState {
  version: 1;
  campaignId: string;
  campaignName: string;
  systemId: string;
  gmId: string;
  activeSceneId: string;
  scenes: Record<string, Scene>;
  tokens: Record<string, Token>;
  initiative: Initiative;
  log: LogEntry[];
  players: Record<string, TablePlayer>;
  characters: Record<string, TableCharacter>;
  /** GM-only notes, stripped from player views */
  gmNotes: string;
}

export const LOG_LIMIT = 300;

export function createScene(id: string, name: string): Scene {
  return { id, name, background: null, widthCells: 30, heightCells: 20, cellDistance: 5, showGrid: true };
}

export function createInitialState(opts: {
  campaignId: string;
  campaignName: string;
  systemId: string;
  gmId: string;
  sceneId: string;
}): GameState {
  const scene = createScene(opts.sceneId, 'Scena 1');
  return {
    version: 1,
    campaignId: opts.campaignId,
    campaignName: opts.campaignName,
    systemId: opts.systemId,
    gmId: opts.gmId,
    activeSceneId: scene.id,
    scenes: { [scene.id]: scene },
    tokens: {},
    initiative: { round: 0, turn: 0, entries: [] },
    log: [],
    players: {},
    characters: {},
    gmNotes: '',
  };
}

/** The view of the state a given user is allowed to see. */
export function viewFor(state: GameState, userId: string): GameState {
  // always a copy: the host mutates its state in place, a shared reference would leak later changes
  if (userId === state.gmId) return structuredClone(state);
  const active = state.scenes[state.activeSceneId];
  const tokens: Record<string, Token> = {};
  for (const t of Object.values(state.tokens)) {
    if (t.sceneId !== state.activeSceneId) continue;
    if (t.hidden && !t.ownerIds.includes(userId)) continue;
    tokens[t.id] = t;
  }
  const visibleTokenIds = new Set(Object.keys(tokens));
  return structuredClone({
    ...state,
    scenes: active ? { [active.id]: active } : {},
    tokens,
    initiative: {
      ...state.initiative,
      // hidden combatants stay hidden in the tracker too
      entries: state.initiative.entries.filter((e) => !e.tokenId || visibleTokenIds.has(e.tokenId) || !state.tokens[e.tokenId]),
    },
    log: state.log.filter((l) => !l.private || l.authorId === userId),
    gmNotes: '',
  });
}

/** Asset ids referenced by a (filtered) state. */
export function referencedAssets(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const s of Object.values(state.scenes)) if (s.background) ids.add(s.background);
  for (const t of Object.values(state.tokens)) if (t.image) ids.add(t.image);
  return ids;
}

import type { RollResult } from '../dice';
import { tokenVisible, type Fog } from './fog';
import { sightFor, tokenPoints } from './sight';

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
  /** distance per cell, shown on the ruler */
  cellDistance: number;
  /** unit of cellDistance; scenes saved before it existed are in feet */
  unit?: 'm' | 'ft';
  showGrid: boolean;
  fog?: Fog;
  /** dynamic vision: players only see what their tokens can see */
  vision?: boolean;
  /** ambient light when vision is on */
  ambient?: Ambient;
  /** the map's own grid: pixels per square in the image (null = stretch the map over the scene) */
  bgCellPx?: number | null;
  /** shift of the map image, in cells, to line its grid up with ours */
  bgOffsetX?: number;
  bgOffsetY?: number;
}

export type Ambient = 'bright' | 'dim' | 'dark';

export type WallKind = 'wall' | 'door' | 'window';

/** A wall between two grid points (cells). Walls and closed doors block sight and light, windows don't. */
export interface Wall {
  id: string;
  sceneId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: WallKind;
  open?: boolean;
  /** doors: players can't open it */
  locked?: boolean;
}

/** A light source. Radii in cells: fully lit up to `bright`, dim up to `dim`. */
export interface Light {
  bright: number;
  dim: number;
  color?: string;
}

/**
 * Scenery: furniture, trees, a campfire... Drawn under the tokens. `kind` is a
 * built-in drawing (crate, barrel...) or 'image' with an uploaded picture.
 */
export interface Prop {
  id: string;
  sceneId: string;
  kind: string;
  image: string | null;
  /** top-left corner and size, in cells */
  x: number;
  y: number;
  w: number;
  h: number;
  /** degrees */
  rotation: number;
  light: Light | null;
  /** walls of stone: the footprint blocks sight */
  blocksVision: boolean;
  /** GM only */
  hidden: boolean;
  label?: string;
}

export type TemplateShape = 'circle' | 'cone' | 'line' | 'square';

/** An area of effect drawn on the map. Coordinates and size in cells. */
export interface AreaTemplate {
  id: string;
  sceneId: string;
  shape: TemplateShape;
  x: number;
  y: number;
  /** radius (circle), length (cone, line) or side (square) */
  size: number;
  /** radians, direction for cones and lines */
  angle: number;
  color: string;
  authorId: string;
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
  /** bestiary entry, for the GM's stat block */
  monsterId?: string | null;
  hp: { current: number; max: number } | null;
  ac: number | null;
  hidden: boolean;
  conditions: string[];
  /** light carried by the token (torch, lantern…) */
  light?: Light | null;
  /** darkvision radius in cells */
  darkvision?: number;
  /** a circle around the token (paladin aura, spirit guardians…), radius in cells */
  aura?: { radius: number; color: string } | null;
}

/**
 * A freehand stroke on the map, or a text label. Points are in cells,
 * flattened [x0, y0, x1, y1, ...]; a label sits at its first point.
 */
export interface Drawing {
  id: string;
  sceneId: string;
  points: number[];
  color: string;
  /** stroke width in cells; for labels, the text height */
  width: number;
  authorId: string;
  text?: string;
}

/**
 * A note or handout. Who can read it: the author always, the GM always
 * (the table runs on the GM's machine), and whoever `shared` says.
 */
export interface Note {
  id: string;
  title: string;
  body: string;
  /** optional picture (asset id): a map, a letter, a portrait... */
  image: string | null;
  /** 'private' = only the author (and the GM); 'all' = every player; or a list of user ids */
  shared: 'private' | 'all' | string[];
  authorId: string;
  updatedAt: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  /** audio asset id */
  asset: string;
}

/**
 * Shared music. Players compute where to be from `position` (seconds) at
 * host time `startedAt`; the host sends its clock with every state.
 */
export interface MusicState {
  tracks: MusicTrack[];
  current: string | null;
  playing: boolean;
  position: number;
  startedAt: number;
  loop: boolean;
}

/** A rich chat message: a spell, a feature, an item shared from a sheet. */
export interface ChatCard {
  title: string;
  subtitle?: string;
  body?: string;
  tags?: string[];
  /** roll buttons shown under the card */
  rolls?: { label: string; formula: string }[];
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
  kind: 'chat' | 'roll' | 'system' | 'card';
  text: string;
  label?: string;
  roll?: RollResult;
  card?: ChatCard;
  /** visible only to the author and the GM */
  private?: boolean;
  /** rolled blind: only the GM sees the result, the author sees that it happened */
  blind?: boolean;
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
  templates?: Record<string, AreaTemplate>;
  initiative: Initiative;
  log: LogEntry[];
  players: Record<string, TablePlayer>;
  characters: Record<string, TableCharacter>;
  /** GM-only notes, stripped from player views. Superseded by `notes` (migrated on load). */
  gmNotes: string;
  notes?: Record<string, Note>;
  drawings?: Record<string, Drawing>;
  music?: MusicState;
  walls?: Record<string, Wall>;
  props?: Record<string, Prop>;
}

export function emptyMusic(): MusicState {
  return { tracks: [], current: null, playing: false, position: 0, startedAt: 0, loop: true };
}

export function noteVisibleTo(note: Note, userId: string, gmId: string): boolean {
  if (userId === gmId || note.authorId === userId) return true;
  return note.shared === 'all' || (Array.isArray(note.shared) && note.shared.includes(userId));
}

export const LOG_LIMIT = 300;

export function createScene(id: string, name: string): Scene {
  return { id, name, background: null, widthCells: 30, heightCells: 20, cellDistance: 1.5, unit: 'm', showGrid: true };
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
    templates: {},
    initiative: { round: 0, turn: 0, entries: [] },
    log: [],
    players: {},
    characters: {},
    gmNotes: '',
    notes: {},
    drawings: {},
    music: emptyMusic(),
    walls: {},
    props: {},
  };
}

/** The view of the state a given user is allowed to see. */
export function viewFor(state: GameState, userId: string): GameState {
  // always a copy: the host mutates its state in place, a shared reference would leak later changes
  if (userId === state.gmId) return structuredClone(state);
  const active = state.scenes[state.activeSceneId];
  const sight = sightFor(state, userId);
  const tokens: Record<string, Token> = {};
  for (const t of Object.values(state.tokens)) {
    if (t.sceneId !== state.activeSceneId) continue;
    const owned = t.ownerIds.includes(userId);
    if (t.hidden && !owned) continue;
    // under the fog of war only your own tokens reach you
    if (!owned && active && !tokenVisible(active.fog, active.widthCells, t)) continue;
    // dynamic vision: only what your tokens can see
    if (!owned && active?.vision && !sight.canSee(tokenPoints(t))) continue;
    tokens[t.id] = t;
  }
  const visibleTokenIds = new Set(Object.keys(tokens));
  return structuredClone({
    ...state,
    scenes: active ? { [active.id]: active } : {},
    tokens,
    templates: Object.fromEntries(Object.entries(state.templates ?? {}).filter(([, t]) => t.sceneId === state.activeSceneId)),
    initiative: {
      ...state.initiative,
      // hidden combatants stay hidden in the tracker too
      entries: state.initiative.entries.filter((e) => !e.tokenId || visibleTokenIds.has(e.tokenId) || !state.tokens[e.tokenId]),
    },
    log: state.log
      .filter((l) => !l.private || l.authorId === userId)
      // blind rolls: the author only learns that the GM got a result
      .map((l) => (l.blind && l.roll ? { ...l, text: '?', roll: undefined } : l)),
    // your own characters only: the others' sheets are private
    characters: Object.fromEntries(Object.entries(state.characters).filter(([, c]) => c.ownerId === userId)),
    notes: Object.fromEntries(Object.entries(state.notes ?? {}).filter(([, n]) => noteVisibleTo(n, userId, state.gmId))),
    drawings: Object.fromEntries(Object.entries(state.drawings ?? {}).filter(([, d]) => d.sceneId === state.activeSceneId)),
    walls: Object.fromEntries(Object.entries(state.walls ?? {}).filter(([, w]) => w.sceneId === state.activeSceneId)),
    props: Object.fromEntries(Object.entries(state.props ?? {}).filter(([, p]) => p.sceneId === state.activeSceneId && !p.hidden)),
    gmNotes: '',
  });
}

/** Asset ids referenced by a (filtered) state. */
export function referencedAssets(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const s of Object.values(state.scenes)) if (s.background) ids.add(s.background);
  for (const t of Object.values(state.tokens)) if (t.image) ids.add(t.image);
  for (const n of Object.values(state.notes ?? {})) if (n.image) ids.add(n.image);
  for (const p of Object.values(state.props ?? {})) if (p.image) ids.add(p.image);
  const track = state.music?.tracks.find((t) => t.id === state.music?.current);
  if (track) ids.add(track.asset);
  return ids;
}

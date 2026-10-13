import type { ExtendedTest, Maneuver, PoolStats, Zone } from './pool';
import type { RollResult } from '../dice';
import type { Macro } from '../macros';
import { tokenVisible, type Fog } from './fog';
import { sightFor, tokenPoints } from './sight';
import type { PartyLoot, RollTable, Shop } from './tables';

/**
 * Table state. It is owned and persisted by the GM's client (the host);
 * players receive a filtered copy after every change.
 * Heavy binary data (maps, token art) lives in a separate asset store and is
 * referenced by id, so state updates stay small.
 */

export const WEATHERS = ['rain', 'storm', 'snow', 'fog', 'embers', 'ash'] as const;
export type Weather = (typeof WEATHERS)[number];

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
  /** the map painted at the table, one terrain code per cell (see terrain.ts) */
  terrain?: string | null;
  /** rock and rooms of the painted map get their walls by themselves (default on) */
  autoWalls?: boolean;
  /** with autoWalls: the floors of buildings get walls against the ground outside (default on) */
  buildingWalls?: boolean;
  /** where the painting's little details come from (the scene's id unless it came from the library) */
  seed?: string;
  /** outdoors: its light follows the hour of the world's clock */
  daylight?: boolean;
  /** the grid tokens stand on and distances count in (square by default) */
  grid?: 'square' | 'hex';
  /** weather drawn over the map, for everyone */
  weather?: Weather | null;
  /** 0.2 (a few drops) to 1 (a downpour) */
  weatherIntensity?: number;
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
  /** made by the painted map: redone when the map changes */
  auto?: boolean;
}

/** A light source. Radii in cells: fully lit up to `bright`, dim up to `dim`. */
export interface Light {
  bright: number;
  dim: number;
  color?: string;
  /** a flame: it trembles */
  flicker?: boolean;
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
  /** stairs, ladders, trapdoors: a token that steps on it goes to this scene (another floor) */
  link?: string | null;
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
  /** how high it flies or stands, in the scene's unit (m or ft); 0 = on the ground */
  elevation?: number;
  /** a circle around the token (paladin aura, spirit guardians…), radius in cells */
  aura?: { radius: number; color: string } | null;
  /** conditions that end by themselves: rounds left, counted at the start of the token's turns */
  conditionRounds?: Record<string, number>;
  /** cells walked in its current turn (only during combat) */
  moved?: number;
  /** zones crossed in its current turn (success-pool systems, only during combat) */
  zonesMoved?: number;
  /** the Manovrare action taken this turn (success-pool systems) */
  maneuver?: Maneuver;
  /** damage types (as written in the chat: «fuoco», «taglienti»…) it takes half, none or double of */
  defenses?: Defenses;
  /** what it has spent this round: action, bonus action, reaction (back at the start of its turn) */
  used?: { action?: boolean; bonus?: boolean; reaction?: boolean };
  /** legendary actions: how many per round, how many are left */
  legendary?: { max: number; left: number } | null;
  /** its lair's actions, by name: a reminder at initiative 20 */
  lair?: string[];
  /** success-pool systems: Resilienza, Protezione and wounds (see pool.ts) */
  pool?: PoolStats;
}

export interface Defenses {
  resist?: string[];
  immune?: string[];
  vulnerable?: string[];
}

/** Damage after resistance, immunity or vulnerability, and what changed it. */
export function damageAfter(defenses: Defenses | undefined, amount: number, type: string | undefined): { amount: number; note?: string } {
  // «da fuoco» and «fuoco» are the same
  const norm = (x: string) => x.trim().toLowerCase().replace(/^da\s+/, '');
  const t = type ? norm(type) : '';
  if (!t || !defenses || amount <= 0) return { amount };
  const has = (list?: string[]) => !!list?.some((x) => norm(x) === t);
  if (has(defenses.immune)) return { amount: 0, note: 'immune' };
  if (has(defenses.resist)) return { amount: Math.floor(amount / 2), note: 'resistente' };
  if (has(defenses.vulnerable)) return { amount: amount * 2, note: 'vulnerabile' };
  return { amount };
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
  /**
   * GM: the picture shown a piece at a time. One character per piece of a
   * REVEAL_COLS × REVEAL_ROWS grid, row by row: '1' shown, '0' covered.
   * Players never receive the full picture, only `shownImage`.
   */
  reveal?: string | null;
  /** the picture with its covered pieces painted over (asset id) */
  shownImage?: string | null;
}

/** A journey: where to, how, how many days so far and expected. */
export interface Travel {
  from: string;
  to: string;
  /** on foot, by coach, by river barge… (free text) */
  mode: string;
  day: number;
  /** the GM's estimate; 0 = unknown */
  days: number;
  startedAt: number;
}

export const REVEAL_COLS = 6;
export const REVEAL_ROWS = 4;

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
/** A sound effect of the GM's own, uploaded for this table. */
export interface SoundEffect {
  id: string;
  name: string;
  /** audio asset id */
  asset: string;
}

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
  /** regions of the scenes, for systems that count distance in zones */
  zones?: Record<string, Zone>;
  /** extended tests the table is working on */
  extended?: Record<string, ExtendedTest>;
  music?: MusicState;
  /** the GM's own sound effects (the built-in ones are always there) */
  sounds?: SoundEffect[];
  walls?: Record<string, Wall>;
  props?: Record<string, Prop>;
  /** set by the GM: players can talk and roll, but not touch the map */
  paused?: boolean;
  /** what the GM can undo/redo right now (labels of the steps, latest first) */
  history?: { undo: string[]; redo: string[] };
  /** macros the GM shares with the table */
  macros?: Macro[];
  /** the world's clock: minutes since the first morning of the campaign */
  world?: { minutes: number };
  /** quests: players see those the GM made visible */
  quests?: Record<string, Quest>;
  /** a journey under way (Warhammer: the days on the road and their Hazards) */
  travel?: Travel | null;
  /** encounters the GM prepared (never sent to the players) */
  encounters?: Record<string, Encounter>;
  /** the last rest the GM called: each player spends their hit dice */
  rest?: { id: string; kind: 'short' | 'long' };
  /** the GM's random tables (players see the shared ones) */
  tables?: Record<string, RollTable>;
  /** what the party found and hasn't shared out yet */
  loot?: PartyLoot;
  /** shops (players see the open ones) */
  shops?: Record<string, Shop>;
}

/** A creature of a prepared encounter, as it will appear. */
export interface EncounterToken {
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  image: string | null;
  monsterId?: string | null;
  hp: { current: number; max: number } | null;
  ac: number | null;
  hidden: boolean;
  conditions: string[];
  darkvision?: number;
  defenses?: Defenses;
  legendary?: { max: number; left: number } | null;
  lair?: string[];
  pool?: PoolStats;
}

/** Something the GM prepared: a scene, its creatures, music and a note, launched in one click. */
export interface Encounter {
  id: string;
  name: string;
  /** the part of the adventure it belongs to */
  chapter: string;
  /** the scene it happens in (null: wherever the table is) */
  sceneId: string | null;
  tokens: EncounterToken[];
  trackId: string | null;
  /** a note to share with the players when it starts */
  noteId: string | null;
  /** the GM's reminder: what happens, what the creatures want */
  text: string;
  /** its creatures join the initiative when it starts */
  initiative: boolean;
  /** when it was last launched */
  launchedAt?: number;
}

export interface QuestObjective {
  id: string;
  text: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'done' | 'failed';
  objectives: QuestObjective[];
  /** the players know about it */
  visible: boolean;
  updatedAt: number;
}

/**
 * Distance between two tokens in cells, height included: squares (or hexes)
 * on the map, and the difference in height counts like one more axis.
 */
export function distance3d(scene: Pick<Scene, 'cellDistance'>, flat: number, elevationA = 0, elevationB = 0): number {
  const up = Math.abs(elevationA - elevationB) / (scene.cellDistance || 1.5);
  return Math.max(flat, Math.round(up));
}

/** Tokens within another's aura: edge to edge, squares counted like the ruler (height included). */
export function tokensInAura(holder: Token, all: Token[], cellDistance = 1.5): Token[] {
  if (!holder.aura || holder.aura.radius <= 0) return [];
  const hc = { x: holder.x + holder.size / 2, y: holder.y + holder.size / 2 };
  return all.filter((t) => {
    if (t.id === holder.id || t.sceneId !== holder.sceneId) return false;
    const gap = Math.max(Math.abs(t.x + t.size / 2 - hc.x), Math.abs(t.y + t.size / 2 - hc.y)) - holder.size / 2 - t.size / 2;
    const up = Math.abs((t.elevation ?? 0) - (holder.elevation ?? 0)) / (cellDistance || 1.5);
    return Math.max(gap, up) <= holder.aura!.radius + 0.01;
  });
}

/** Day and time of the world's clock, and the light outside. */
export function worldTime(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const light: Ambient = hour >= 7 && hour < 19 ? 'bright' : hour === 6 || hour === 19 ? 'dim' : 'dark';
  const part = hour < 5 ? 'notte' : hour < 7 ? 'alba' : hour < 12 ? 'mattina' : hour < 14 ? 'mezzogiorno' : hour < 18 ? 'pomeriggio' : hour < 20 ? 'sera' : 'notte';
  return { day, hour, minute, light, part, clock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
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
    zones: {},
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
    notes: Object.fromEntries(
      Object.entries(state.notes ?? {})
        .filter(([, n]) => noteVisibleTo(n, userId, state.gmId))
        // a picture revealed in pieces: only what is shown so far
        .map(([id, n]) => [id, n.reveal ? { ...n, image: n.shownImage ?? null, shownImage: null } : n]),
    ),
    drawings: Object.fromEntries(Object.entries(state.drawings ?? {}).filter(([, d]) => d.sceneId === state.activeSceneId)),
    zones: Object.fromEntries(Object.entries(state.zones ?? {}).filter(([, z]) => z.sceneId === state.activeSceneId)),
    walls: Object.fromEntries(Object.entries(state.walls ?? {}).filter(([, w]) => w.sceneId === state.activeSceneId)),
    props: Object.fromEntries(Object.entries(state.props ?? {}).filter(([, p]) => p.sceneId === state.activeSceneId && !p.hidden)),
    gmNotes: '',
    history: undefined,
    quests: Object.fromEntries(Object.entries(state.quests ?? {}).filter(([, q]) => q.visible)),
    encounters: undefined,
    tables: Object.fromEntries(Object.entries(state.tables ?? {}).filter(([, t]) => t.shared)),
    shops: Object.fromEntries(Object.entries(state.shops ?? {}).filter(([, x]) => x.open)),
  });
}

export const SPECTATOR_ID = '__spettatore__';

/**
 * What an audience watching the game sees (a stream, a screen in the room):
 * everything the players see together, nothing of the GM's. As if one more
 * player owned every player's token.
 */
export function spectatorView(state: GameState): GameState {
  const tokens: Record<string, Token> = {};
  for (const [id, t] of Object.entries(state.tokens)) tokens[id] = t.ownerIds.length ? { ...t, ownerIds: [...t.ownerIds, SPECTATOR_ID] } : t;
  // (it stays among the owners in this view: dynamic vision draws from their eyes)
  return viewFor({ ...state, tokens, log: state.log.filter((l) => !l.private && !l.blind) }, SPECTATOR_ID);
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
  // sound effects are short: everyone has them ready before the GM plays one
  for (const x of state.sounds ?? []) ids.add(x.asset);
  return ids;
}

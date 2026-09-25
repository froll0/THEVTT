import { cryptoRng, DiceError, roll, type Rng } from '../dice';
import { newId } from '../id';
import type { GameAction, HostToPlayer, PlayerToHost, TokenPatch } from './actions';
import { emptyMask, paintRect, resizeMask } from './fog';
import { lineOfSight } from './vision';
import {
  createScene,
  emptyMusic,
  LOG_LIMIT,
  referencedAssets,
  viewFor,
  type GameState,
  type Light,
  type LogEntry,
  type Prop,
  type TableCharacter,
  type TablePlayer,
  type Token,
} from './state';

export type ActionResult = { ok: true } | { ok: false; reason: string };

export interface GameHostOptions {
  state: GameState;
  assets?: Record<string, string>;
  /** deliver a message to a user; the GM's own client is a peer like the others */
  send: (to: string, msg: HostToPlayer) => void;
  rng?: Rng;
  now?: () => number;
  /** called after every state change (persistence hook) */
  onChange?: (state: GameState) => void;
  /** called when a character sheet changes (sync back to the server) */
  onCharacterChange?: (character: TableCharacter) => void;
}

const PLAYER_TOKEN_FIELDS: ReadonlyArray<keyof TokenPatch> = ['hp', 'conditions', 'color', 'name', 'light'];
const MAX_WALLS = 3000;
const MAX_PROPS = 500;

/** A light from untrusted input: radii in cells, dim never below bright. */
function cleanLight(l: unknown): Light | null {
  const v = l as Partial<Light> | null;
  if (!v || typeof v !== 'object') return null;
  const bright = Math.min(60, Math.max(0, Number(v.bright) || 0));
  const dim = Math.min(120, Math.max(bright, Number(v.dim) || 0));
  if (dim <= 0) return null;
  return { bright, dim, ...(typeof v.color === 'string' ? { color: v.color.slice(0, 20) } : {}) };
}

const coord = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round((Number(v) || 0) * 2) / 2));
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
/** audio travels to every player, through the relay too (16MB per message): ~11MB files */
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/;
const AUDIO_DATA_URL = /^data:audio\/(mpeg|mp3|ogg|wav|x-wav|webm|mp4|x-m4a|aac|flac);base64,/;
const MAX_DRAWINGS = 500;

const cleanShared = (v: unknown, players: GameState['players']): 'private' | 'all' | string[] =>
  v === 'all' ? 'all' : Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && !!players[id]).slice(0, 50) : 'private';

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

/**
 * Authoritative game logic. Runs on the GM's machine only: validates
 * permissions, resolves dice, mutates the state and fans out filtered views.
 */
export class GameHost {
  private _state: GameState;
  private readonly assets: Record<string, string>;
  private readonly connected = new Set<string>();
  private readonly delivered = new Map<string, Set<string>>();
  private readonly opts: GameHostOptions;
  private readonly rng: Rng;
  private readonly now: () => number;
  private rev = 0;

  constructor(opts: GameHostOptions) {
    this.opts = opts;
    this._state = opts.state;
    // tables saved before notes existed: the old GM scratchpad becomes a private note
    if (!this._state.notes) {
      this._state.notes = {};
      if (this._state.gmNotes.trim()) {
        const id = newId();
        this._state.notes[id] = { id, title: 'Note del master', body: this._state.gmNotes, image: null, shared: 'private', authorId: this._state.gmId, updatedAt: Date.now() };
      }
      this._state.gmNotes = '';
    }
    this._state.drawings ??= {};
    this._state.walls ??= {};
    this._state.props ??= {};
    this._state.music ??= emptyMusic();
    this.assets = { ...(opts.assets ?? {}) };
    this.rng = opts.rng ?? cryptoRng;
    this.now = opts.now ?? Date.now;
  }

  get state(): GameState {
    return this._state;
  }

  get assetStore(): Readonly<Record<string, string>> {
    return this.assets;
  }

  get gmId(): string {
    return this._state.gmId;
  }

  isConnected(userId: string): boolean {
    return this.connected.has(userId);
  }

  // ---------- roster ----------

  upsertPlayer(p: Omit<TablePlayer, 'online'>): void {
    const prev = this._state.players[p.id];
    this._state.players[p.id] = { ...p, online: prev?.online ?? this.connected.has(p.id) };
  }

  upsertCharacter(c: TableCharacter): void {
    this._state.characters[c.id] = c;
  }

  removePlayer(userId: string): void {
    delete this._state.players[userId];
    this.connected.delete(userId);
    this.delivered.delete(userId);
    this.commit();
  }

  connect(userId: string): void {
    this.connected.add(userId);
    this.delivered.set(userId, new Set());
    const p = this._state.players[userId];
    if (p) {
      p.online = true;
      if (userId !== this.gmId) this.system(`${p.displayName} si è seduto al tavolo`);
    }
    this.commit();
  }

  disconnect(userId: string): void {
    this.connected.delete(userId);
    this.delivered.delete(userId);
    const p = this._state.players[userId];
    if (p) {
      p.online = false;
      if (userId !== this.gmId) this.system(`${p.displayName} ha lasciato il tavolo`);
    }
    this.commit();
  }

  // ---------- messaging ----------

  handle(from: string, msg: PlayerToHost): void {
    if (msg.k === 'hello') {
      if (!this.connected.has(from)) this.connect(from);
      else this.sync(from, true);
      return;
    }
    if (msg.k === 'action') {
      const res = this.dispatch(from, msg.action);
      if (!res.ok) this.opts.send(from, { k: 'rejected', seq: msg.seq, reason: res.reason });
    }
  }

  dispatch(from: string, action: GameAction): ActionResult {
    const s = this._state;
    const isGm = from === s.gmId;
    const player = s.players[from];
    if (!isGm && !player) return { ok: false, reason: 'Non fai parte di questo tavolo' };
    const gmOnly = (): ActionResult | null => (isGm ? null : { ok: false, reason: 'Solo il master può farlo' });

    switch (action.type) {
      case 'scene.create': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = createScene(newId(), action.name.trim().slice(0, 80) || 'Nuova scena');
        s.scenes[scene.id] = scene;
        break;
      }
      case 'scene.update': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = s.scenes[action.sceneId];
        if (!scene) return { ok: false, reason: 'Scena inesistente' };
        const p = action.patch;
        if (p.name !== undefined) scene.name = String(p.name).slice(0, 80);
        const oldW = scene.widthCells;
        const oldH = scene.heightCells;
        if (p.widthCells !== undefined) scene.widthCells = clampInt(p.widthCells, 1, 200);
        if (p.heightCells !== undefined) scene.heightCells = clampInt(p.heightCells, 1, 200);
        if (scene.fog && (oldW !== scene.widthCells || oldH !== scene.heightCells)) {
          scene.fog.revealed = resizeMask(scene.fog.revealed, oldW, oldH, scene.widthCells, scene.heightCells);
        }
        if (p.cellDistance !== undefined) scene.cellDistance = Math.min(1000, Math.max(0.1, Math.round(Number(p.cellDistance) * 10) / 10 || 1));
        if (p.unit !== undefined) scene.unit = p.unit === 'ft' ? 'ft' : 'm';
        if (p.showGrid !== undefined) scene.showGrid = !!p.showGrid;
        if (p.vision !== undefined) scene.vision = !!p.vision;
        if (p.ambient !== undefined) scene.ambient = p.ambient === 'dark' || p.ambient === 'dim' ? p.ambient : 'bright';
        if (p.background !== undefined) {
          if (p.background !== null && !this.assets[p.background]) return { ok: false, reason: 'Immagine sconosciuta' };
          scene.background = p.background;
        }
        break;
      }
      case 'scene.activate': {
        const denied = gmOnly();
        if (denied) return denied;
        if (!s.scenes[action.sceneId]) return { ok: false, reason: 'Scena inesistente' };
        s.activeSceneId = action.sceneId;
        break;
      }
      case 'scene.delete': {
        const denied = gmOnly();
        if (denied) return denied;
        if (Object.keys(s.scenes).length <= 1) return { ok: false, reason: "Serve almeno una scena" };
        if (!s.scenes[action.sceneId]) return { ok: false, reason: 'Scena inesistente' };
        delete s.scenes[action.sceneId];
        for (const t of Object.values(s.tokens)) if (t.sceneId === action.sceneId) delete s.tokens[t.id];
        for (const t of Object.values(s.templates ?? {})) if (t.sceneId === action.sceneId) delete s.templates![t.id];
        for (const w of Object.values(s.walls ?? {})) if (w.sceneId === action.sceneId) delete s.walls![w.id];
        for (const p of Object.values(s.props ?? {})) if (p.sceneId === action.sceneId) delete s.props![p.id];
        if (s.activeSceneId === action.sceneId) s.activeSceneId = Object.keys(s.scenes)[0]!;
        break;
      }
      case 'token.create': {
        const t = action.token;
        if (!isGm) {
          const ch = t.characterId ? s.characters[t.characterId] : undefined;
          if (!ch || ch.ownerId !== from) return { ok: false, reason: 'Puoi piazzare solo il tuo personaggio' };
          if (Object.values(s.tokens).some((x) => x.characterId === ch.id && x.sceneId === s.activeSceneId)) {
            return { ok: false, reason: 'Il tuo personaggio è già sulla mappa' };
          }
        }
        const sceneId = isGm && t.sceneId && s.scenes[t.sceneId] ? t.sceneId : s.activeSceneId;
        const scene = s.scenes[sceneId]!;
        const size = clampInt(t.size ?? 1, 1, 10);
        const spot = this.freeSpot(sceneId, clampInt(t.x ?? 0, 0, scene.widthCells - size), clampInt(t.y ?? 0, 0, scene.heightCells - size), size);
        const token: Token = {
          id: newId(),
          sceneId,
          name: t.name.trim().slice(0, 60) || 'Token',
          x: spot.x,
          y: spot.y,
          size,
          color: typeof t.color === 'string' ? t.color : player?.color ?? '#c9a227',
          image: isGm && t.image && this.assets[t.image] ? t.image : null,
          ownerIds: isGm ? (t.ownerIds ?? []) : [from],
          characterId: t.characterId ?? null,
          monsterId: isGm && typeof t.monsterId === 'string' ? t.monsterId : null,
          hp: t.hp ? { current: clampInt(t.hp.current, -999, 9999), max: clampInt(t.hp.max, 0, 9999) } : null,
          ac: t.ac != null ? clampInt(t.ac, 0, 99) : null,
          hidden: isGm ? !!t.hidden : false,
          conditions: Array.isArray(t.conditions) ? t.conditions.slice(0, 20).map(String) : [],
          light: cleanLight(t.light),
          darkvision: Math.min(60, Math.max(0, Number(t.darkvision) || 0)),
        };
        s.tokens[token.id] = token;
        break;
      }
      case 'token.move': {
        const t = s.tokens[action.tokenId];
        if (!t) return { ok: false, reason: 'Token inesistente' };
        if (!isGm && !t.ownerIds.includes(from)) return { ok: false, reason: 'Non controlli questo token' };
        const scene = s.scenes[t.sceneId]!;
        const nx = clampInt(action.x, 0, scene.widthCells - t.size);
        const ny = clampInt(action.y, 0, scene.heightCells - t.size);
        if (!isGm) {
          // walls, windows and closed doors stop players (the GM can move anything anywhere)
          const blocking = Object.values(s.walls ?? {})
            .filter((w) => w.sceneId === scene.id && !(w.kind === 'door' && w.open))
            .map((w) => ({ a: { x: w.x1, y: w.y1 }, b: { x: w.x2, y: w.y2 } }));
          const half = t.size / 2;
          if (blocking.length && !lineOfSight({ x: t.x + half, y: t.y + half }, { x: nx + half, y: ny + half }, blocking)) return { ok: false, reason: 'C’è un muro in mezzo' };
        }
        t.x = nx;
        t.y = ny;
        break;
      }
      case 'token.update': {
        const t = s.tokens[action.tokenId];
        if (!t) return { ok: false, reason: 'Token inesistente' };
        if (!isGm && !t.ownerIds.includes(from)) return { ok: false, reason: 'Non controlli questo token' };
        const patch = action.patch;
        for (const key of Object.keys(patch) as (keyof TokenPatch)[]) {
          if (!isGm && !PLAYER_TOKEN_FIELDS.includes(key)) return { ok: false, reason: `Campo non modificabile: ${key}` };
        }
        if (patch.name !== undefined) t.name = String(patch.name).slice(0, 60);
        if (patch.color !== undefined) t.color = String(patch.color);
        if (patch.size !== undefined) t.size = clampInt(patch.size, 1, 10);
        if (patch.hidden !== undefined) t.hidden = !!patch.hidden;
        if (patch.ownerIds !== undefined) t.ownerIds = patch.ownerIds.filter((id) => !!s.players[id]);
        if (patch.ac !== undefined) t.ac = patch.ac === null ? null : clampInt(patch.ac, 0, 99);
        if (patch.conditions !== undefined) t.conditions = patch.conditions.slice(0, 20).map(String);
        if (patch.light !== undefined) t.light = cleanLight(patch.light);
        if (patch.darkvision !== undefined) t.darkvision = Math.min(60, Math.max(0, Number(patch.darkvision) || 0));
        if (patch.image !== undefined) {
          if (patch.image !== null && !this.assets[patch.image]) return { ok: false, reason: 'Immagine sconosciuta' };
          t.image = patch.image;
        }
        if (patch.hp !== undefined) {
          t.hp = patch.hp === null ? null : { current: clampInt(patch.hp.current, -999, 9999), max: clampInt(patch.hp.max, 0, 9999) };
        }
        if (patch.x !== undefined || patch.y !== undefined) {
          const scene = s.scenes[t.sceneId]!;
          t.x = clampInt(patch.x ?? t.x, 0, scene.widthCells - t.size);
          t.y = clampInt(patch.y ?? t.y, 0, scene.heightCells - t.size);
        }
        break;
      }
      case 'token.delete': {
        const t = s.tokens[action.tokenId];
        if (!t) return { ok: false, reason: 'Token inesistente' };
        if (!isGm && !t.ownerIds.includes(from)) return { ok: false, reason: 'Non controlli questo token' };
        delete s.tokens[t.id];
        s.initiative.entries = s.initiative.entries.filter((e) => e.tokenId !== t.id);
        break;
      }
      case 'chat': {
        const text = action.text.trim().slice(0, 2000);
        if (!text) return { ok: false, reason: 'Messaggio vuoto' };
        this.log({ kind: 'chat', authorId: from, text, private: !!action.private });
        break;
      }
      case 'roll': {
        try {
          const r = roll(action.formula, this.rng);
          this.log({
            kind: 'roll',
            authorId: from,
            text: `${r.total}`,
            label: action.label?.slice(0, 120),
            roll: r,
            private: !!action.private || !!action.blind,
            blind: !!action.blind && !isGm,
          });
        } catch (e) {
          return { ok: false, reason: e instanceof DiceError ? e.message : 'Tiro non valido' };
        }
        break;
      }
      case 'card': {
        const c = action.card;
        if (!c || typeof c.title !== 'string' || !c.title.trim()) return { ok: false, reason: 'Scheda vuota' };
        const card = {
          title: c.title.slice(0, 120),
          subtitle: typeof c.subtitle === 'string' ? c.subtitle.slice(0, 200) : undefined,
          body: typeof c.body === 'string' ? c.body.slice(0, 4000) : undefined,
          tags: Array.isArray(c.tags) ? c.tags.slice(0, 12).map((t) => String(t).slice(0, 40)) : undefined,
          rolls: Array.isArray(c.rolls)
            ? c.rolls.slice(0, 6).map((r) => ({ label: String(r.label).slice(0, 60), formula: String(r.formula).slice(0, 60) }))
            : undefined,
        };
        this.log({ kind: 'card', authorId: from, text: card.title, card, private: !!action.private });
        break;
      }
      case 'initiative.add': {
        const token = action.tokenId ? s.tokens[action.tokenId] : undefined;
        if (action.tokenId && !token) return { ok: false, reason: 'Token inesistente' };
        if (!isGm && (!token || !token.ownerIds.includes(from))) return { ok: false, reason: 'Puoi aggiungere solo i tuoi token' };
        let value = action.value;
        if (value === undefined || !isGm) {
          const mod = clampInt(action.modifier ?? 0, -20, 20);
          const r = roll(`1d20${mod >= 0 ? '+' : ''}${mod}`, this.rng);
          value = r.total;
          this.log({ kind: 'roll', authorId: from, text: `${r.total}`, label: `Iniziativa · ${action.name}`, roll: r, private: !!token?.hidden });
        }
        const entries = s.initiative.entries.filter((e) => !(action.tokenId && e.tokenId === action.tokenId));
        entries.push({ id: newId(), name: action.name.slice(0, 60), value: clampInt(value, -99, 99), tokenId: action.tokenId ?? null });
        this.setEntries(entries);
        break;
      }
      case 'initiative.set': {
        const denied = gmOnly();
        if (denied) return denied;
        const e = s.initiative.entries.find((x) => x.id === action.entryId);
        if (!e) return { ok: false, reason: 'Voce inesistente' };
        e.value = clampInt(action.value, -99, 99);
        this.setEntries(s.initiative.entries);
        break;
      }
      case 'initiative.remove': {
        const denied = gmOnly();
        if (denied) return denied;
        const idx = s.initiative.entries.findIndex((x) => x.id === action.entryId);
        if (idx < 0) return { ok: false, reason: 'Voce inesistente' };
        s.initiative.entries.splice(idx, 1);
        if (idx < s.initiative.turn) s.initiative.turn--;
        if (s.initiative.turn >= s.initiative.entries.length) s.initiative.turn = 0;
        break;
      }
      case 'initiative.next': {
        const ini = s.initiative;
        if (!ini.entries.length) return { ok: false, reason: 'Nessun combattente' };
        if (!isGm) {
          const current = ini.entries[ini.turn];
          const tok = current?.tokenId ? s.tokens[current.tokenId] : undefined;
          if (ini.round === 0 || !tok || !tok.ownerIds.includes(from)) return { ok: false, reason: 'Non è il tuo turno' };
        }
        if (ini.round === 0) {
          ini.round = 1;
          ini.turn = 0;
        } else if (ini.turn + 1 >= ini.entries.length) {
          ini.turn = 0;
          ini.round++;
        } else ini.turn++;
        const cur = ini.entries[ini.turn];
        if (cur) this.system(`Round ${ini.round} · turno di ${cur.name}`);
        break;
      }
      case 'initiative.prev': {
        const denied = gmOnly();
        if (denied) return denied;
        const ini = s.initiative;
        if (!ini.entries.length || ini.round === 0) break;
        if (ini.turn === 0) {
          if (ini.round > 1) {
            ini.round--;
            ini.turn = ini.entries.length - 1;
          }
        } else ini.turn--;
        break;
      }
      case 'initiative.clear': {
        const denied = gmOnly();
        if (denied) return denied;
        s.initiative = { round: 0, turn: 0, entries: [] };
        break;
      }
      case 'character.update': {
        const ch = s.characters[action.characterId];
        if (!ch) return { ok: false, reason: 'Personaggio inesistente' };
        if (!isGm && ch.ownerId !== from) return { ok: false, reason: 'Non è il tuo personaggio' };
        ch.data = action.data;
        if (action.name) ch.name = action.name.slice(0, 80);
        this.opts.onCharacterChange?.(ch);
        break;
      }
      case 'ping': {
        const color = isGm ? '#ffffff' : player!.color;
        for (const id of this.connected) {
          this.opts.send(id, { k: 'ping', x: Number(action.x) || 0, y: Number(action.y) || 0, sceneId: s.activeSceneId, color, from });
        }
        return { ok: true };
      }
      case 'fog.enable': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = s.scenes[action.sceneId];
        if (!scene) return { ok: false, reason: 'Scena inesistente' };
        const mask = scene.fog?.revealed.length === scene.widthCells * scene.heightCells ? scene.fog.revealed : emptyMask(scene.widthCells, scene.heightCells);
        scene.fog = { enabled: !!action.enabled, revealed: mask };
        break;
      }
      case 'fog.paint':
      case 'fog.fill': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = s.scenes[action.sceneId];
        if (!scene?.fog) return { ok: false, reason: 'La nebbia non è attiva' };
        const { widthCells: w, heightCells: h } = scene;
        scene.fog.revealed =
          action.type === 'fog.fill'
            ? emptyMask(w, h, action.reveal)
            : paintRect(scene.fog.revealed, w, h, { x: action.x, y: action.y, w: action.w, h: action.h }, action.reveal);
        break;
      }
      case 'template.create': {
        const t = action.template;
        if (!['circle', 'cone', 'line', 'square'].includes(t.shape)) return { ok: false, reason: 'Forma non valida' };
        s.templates ??= {};
        const id = newId();
        s.templates[id] = {
          id,
          sceneId: s.activeSceneId,
          shape: t.shape,
          x: Number(t.x) || 0,
          y: Number(t.y) || 0,
          size: Math.min(60, Math.max(0.5, Number(t.size) || 1)),
          angle: Number(t.angle) || 0,
          color: typeof t.color === 'string' ? t.color : player?.color ?? '#c9a227',
          authorId: from,
        };
        break;
      }
      case 'template.delete': {
        const t = s.templates?.[action.templateId];
        if (!t) return { ok: false, reason: 'Area inesistente' };
        if (!isGm && t.authorId !== from) return { ok: false, reason: 'Puoi cancellare solo le tue aree' };
        delete s.templates![t.id];
        break;
      }
      case 'template.clear': {
        const denied = gmOnly();
        if (denied) return denied;
        for (const t of Object.values(s.templates ?? {})) if (t.sceneId === s.activeSceneId) delete s.templates![t.id];
        break;
      }
      case 'notes.update': {
        const denied = gmOnly();
        if (denied) return denied;
        s.gmNotes = action.text.slice(0, 100_000);
        break;
      }
      case 'note.create': {
        const n = action.note ?? {};
        const id = newId();
        s.notes![id] = {
          id,
          title: String(n.title ?? '').slice(0, 120) || 'Nuova nota',
          body: String(n.body ?? '').slice(0, 100_000),
          image: null,
          shared: cleanShared(n.shared, s.players),
          authorId: from,
          updatedAt: this.now(),
        };
        break;
      }
      case 'note.update': {
        const note = s.notes![action.noteId];
        if (!note) return { ok: false, reason: 'Nota inesistente' };
        if (!isGm && note.authorId !== from) return { ok: false, reason: 'Puoi modificare solo le tue note' };
        const p = action.patch;
        const wasShared = note.shared;
        if (p.title !== undefined) note.title = String(p.title).slice(0, 120);
        if (p.body !== undefined) note.body = String(p.body).slice(0, 100_000);
        if (p.shared !== undefined) note.shared = cleanShared(p.shared, s.players);
        if (p.image !== undefined) {
          if (p.image !== null && !this.assets[p.image]) return { ok: false, reason: 'Immagine sconosciuta' };
          note.image = p.image;
        }
        note.updatedAt = this.now();
        if (isGm && p.shared !== undefined && note.shared === 'all' && wasShared !== 'all') this.system(`Il master ha condiviso «${note.title}»`);
        break;
      }
      case 'note.delete': {
        const note = s.notes![action.noteId];
        if (!note) return { ok: false, reason: 'Nota inesistente' };
        if (!isGm && note.authorId !== from) return { ok: false, reason: 'Puoi cancellare solo le tue note' };
        delete s.notes![note.id];
        break;
      }
      case 'wall.create': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = s.scenes[s.activeSceneId]!;
        const count = Object.values(s.walls!).filter((w) => w.sceneId === scene.id).length;
        const list = Array.isArray(action.walls) ? action.walls.slice(0, 500) : [];
        if (count + list.length > MAX_WALLS) return { ok: false, reason: 'Troppi muri in questa scena' };
        for (const w of list) {
          const wall = {
            id: newId(),
            sceneId: scene.id,
            x1: coord(w.x1, scene.widthCells),
            y1: coord(w.y1, scene.heightCells),
            x2: coord(w.x2, scene.widthCells),
            y2: coord(w.y2, scene.heightCells),
            kind: w.kind === 'door' || w.kind === 'window' ? w.kind : ('wall' as const),
          };
          if (wall.x1 === wall.x2 && wall.y1 === wall.y2) continue;
          s.walls![wall.id] = wall;
        }
        break;
      }
      case 'wall.update': {
        const w = s.walls![action.wallId];
        if (!w) return { ok: false, reason: 'Muro inesistente' };
        if (!isGm) {
          // players may only open and close doors next to one of their tokens
          if (w.kind !== 'door' || Object.keys(action.patch).some((k) => k !== 'open')) return { ok: false, reason: 'Solo il master può farlo' };
          const mid = { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 };
          const near = Object.values(s.tokens).some((t) => t.sceneId === w.sceneId && t.ownerIds.includes(from) && Math.hypot(t.x + t.size / 2 - mid.x, t.y + t.size / 2 - mid.y) <= 2.5 + t.size / 2);
          if (!near) return { ok: false, reason: 'Devi essere vicino alla porta' };
        }
        if (action.patch.kind !== undefined) w.kind = action.patch.kind === 'door' || action.patch.kind === 'window' ? action.patch.kind : 'wall';
        if (action.patch.open !== undefined) w.open = !!action.patch.open;
        break;
      }
      case 'wall.delete': {
        const denied = gmOnly();
        if (denied) return denied;
        if (!s.walls![action.wallId]) return { ok: false, reason: 'Muro inesistente' };
        delete s.walls![action.wallId];
        break;
      }
      case 'wall.clear': {
        const denied = gmOnly();
        if (denied) return denied;
        for (const w of Object.values(s.walls!)) if (w.sceneId === s.activeSceneId) delete s.walls![w.id];
        break;
      }
      case 'prop.create':
      case 'prop.update': {
        const denied = gmOnly();
        if (denied) return denied;
        const scene = s.scenes[s.activeSceneId]!;
        let p: Prop;
        if (action.type === 'prop.create') {
          if (Object.values(s.props!).filter((x) => x.sceneId === scene.id).length >= MAX_PROPS) return { ok: false, reason: 'Troppi oggetti in questa scena' };
          p = { id: newId(), sceneId: scene.id, kind: 'crate', image: null, x: 0, y: 0, w: 1, h: 1, rotation: 0, light: null, blocksVision: false, hidden: false };
        } else {
          const found = s.props![action.propId];
          if (!found) return { ok: false, reason: 'Oggetto inesistente' };
          p = found;
        }
        const patch = action.type === 'prop.create' ? action.prop : action.patch;
        const sc = s.scenes[p.sceneId] ?? scene;
        if (patch.kind !== undefined) p.kind = String(patch.kind).slice(0, 30);
        if (patch.label !== undefined) p.label = String(patch.label).slice(0, 60) || undefined;
        if (patch.w !== undefined) p.w = Math.min(40, Math.max(0.25, Math.round(Number(patch.w) * 4) / 4 || 1));
        if (patch.h !== undefined) p.h = Math.min(40, Math.max(0.25, Math.round(Number(patch.h) * 4) / 4 || 1));
        if (patch.x !== undefined) p.x = Math.min(sc.widthCells, Math.max(-p.w, Math.round(Number(patch.x) * 4) / 4 || 0));
        if (patch.y !== undefined) p.y = Math.min(sc.heightCells, Math.max(-p.h, Math.round(Number(patch.y) * 4) / 4 || 0));
        if (patch.rotation !== undefined) p.rotation = ((Math.round(Number(patch.rotation) || 0) % 360) + 360) % 360;
        if (patch.light !== undefined) p.light = cleanLight(patch.light);
        if (patch.blocksVision !== undefined) p.blocksVision = !!patch.blocksVision;
        if (patch.hidden !== undefined) p.hidden = !!patch.hidden;
        if (patch.image !== undefined) {
          if (patch.image !== null && !this.assets[patch.image]) return { ok: false, reason: 'Immagine sconosciuta' };
          p.image = patch.image;
        }
        s.props![p.id] = p;
        break;
      }
      case 'prop.delete': {
        const denied = gmOnly();
        if (denied) return denied;
        if (!s.props![action.propId]) return { ok: false, reason: 'Oggetto inesistente' };
        delete s.props![action.propId];
        break;
      }
      case 'drawing.create': {
        const pts = Array.isArray(action.points) ? action.points.slice(0, 4000).map((v) => Math.round((Number(v) || 0) * 100) / 100) : [];
        if (pts.length < 4 || pts.length % 2) return { ok: false, reason: 'Tratto non valido' };
        const onScene = Object.values(s.drawings!).filter((d) => d.sceneId === s.activeSceneId);
        if (onScene.length >= MAX_DRAWINGS) return { ok: false, reason: 'Troppi disegni: cancellane qualcuno' };
        const id = newId();
        s.drawings![id] = {
          id,
          sceneId: s.activeSceneId,
          points: pts,
          color: typeof action.color === 'string' ? action.color.slice(0, 20) : player?.color ?? '#ffffff',
          width: Math.min(2, Math.max(0.02, Number(action.width) || 0.08)),
          authorId: from,
        };
        break;
      }
      case 'drawing.delete': {
        const d = s.drawings![action.drawingId];
        if (!d) return { ok: false, reason: 'Disegno inesistente' };
        if (!isGm && d.authorId !== from) return { ok: false, reason: 'Puoi cancellare solo i tuoi disegni' };
        delete s.drawings![d.id];
        break;
      }
      case 'drawing.clear': {
        for (const d of Object.values(s.drawings!)) {
          if (d.sceneId === s.activeSceneId && (isGm || d.authorId === from)) delete s.drawings![d.id];
        }
        break;
      }
      case 'music.play':
      case 'music.pause':
      case 'music.seek':
      case 'music.loop':
      case 'music.remove':
      case 'music.rename': {
        const denied = gmOnly();
        if (denied) return denied;
        const m = s.music!;
        const now = this.now();
        const here = () => (m.playing ? m.position + (now - m.startedAt) / 1000 : m.position);
        if (action.type === 'music.play') {
          if (action.trackId !== undefined && !m.tracks.some((t) => t.id === action.trackId)) return { ok: false, reason: 'Brano inesistente' };
          // another track starts from the top, the same one resumes where it is
          const switching = (action.trackId !== undefined && action.trackId !== m.current) || !m.current;
          m.current = action.trackId ?? m.current ?? m.tracks[0]?.id ?? null;
          if (!m.current) return { ok: false, reason: 'Nessun brano in scaletta' };
          m.position = Math.max(0, Number(action.position ?? (switching ? 0 : here())) || 0);
          m.playing = true;
          m.startedAt = now;
        } else if (action.type === 'music.pause') {
          m.position = here();
          m.playing = false;
          m.startedAt = now;
        } else if (action.type === 'music.seek') {
          m.position = Math.max(0, Number(action.position) || 0);
          m.startedAt = now;
        } else if (action.type === 'music.loop') {
          m.loop = !!action.loop;
        } else if (action.type === 'music.rename') {
          const t = m.tracks.find((x) => x.id === action.trackId);
          if (!t) return { ok: false, reason: 'Brano inesistente' };
          t.name = String(action.name).slice(0, 120) || t.name;
        } else {
          m.tracks = m.tracks.filter((t) => t.id !== action.trackId);
          if (m.current === action.trackId) Object.assign(m, { current: null, playing: false, position: 0 });
        }
        break;
      }
      case 'asset.add': {
        const target = action.attachTo;
        const audio = AUDIO_DATA_URL.test(action.dataUrl);
        if (!isGm) {
          // players: only a picture for one of their own notes
          const note = target && 'noteId' in target ? s.notes![target.noteId] : undefined;
          if (!note || note.authorId !== from) return { ok: false, reason: 'Solo il master può farlo' };
        }
        if (audio) {
          if (!target || !('track' in target)) return { ok: false, reason: 'Formato non supportato' };
          if (action.dataUrl.length > MAX_AUDIO_BYTES) return { ok: false, reason: 'Brano troppo grande (max ~11MB)' };
        } else {
          if (!IMAGE_DATA_URL.test(action.dataUrl)) return { ok: false, reason: 'Formato immagine non supportato' };
          if (action.dataUrl.length > MAX_ASSET_BYTES) return { ok: false, reason: 'Immagine troppo grande (max ~9MB)' };
          if (target && 'track' in target) return { ok: false, reason: 'Formato audio non supportato' };
        }
        const id = this.addAsset(action.dataUrl);
        if (target && 'sceneId' in target && s.scenes[target.sceneId]) s.scenes[target.sceneId]!.background = id;
        if (target && 'tokenId' in target && s.tokens[target.tokenId]) s.tokens[target.tokenId]!.image = id;
        if (target && 'noteId' in target && s.notes![target.noteId]) {
          s.notes![target.noteId]!.image = id;
          s.notes![target.noteId]!.updatedAt = this.now();
        }
        if (target && 'propId' in target && s.props![target.propId]) {
          s.props![target.propId]!.image = id;
          s.props![target.propId]!.kind = 'image';
        }
        if (target && 'track' in target) {
          s.music!.tracks.push({ id: newId(), name: String(target.track).slice(0, 120) || 'Brano', asset: id });
        }
        break;
      }
      default: {
        const _exhaustive: never = action;
        return { ok: false, reason: `Azione sconosciuta ${(_exhaustive as { type: string }).type}` };
      }
    }
    this.commit();
    return { ok: true };
  }

  addAsset(dataUrl: string): string {
    const existing = Object.entries(this.assets).find(([, v]) => v === dataUrl);
    if (existing) return existing[0];
    const id = newId();
    this.assets[id] = dataUrl;
    return id;
  }

  /** Sends a (filtered) state to every connected peer. */
  broadcast(): void {
    for (const id of this.connected) this.sync(id, false);
  }

  private sync(userId: string, resendAssets: boolean): void {
    const view = viewFor(this._state, userId);
    let known = this.delivered.get(userId);
    if (!known || resendAssets) {
      known = new Set();
      this.delivered.set(userId, known);
    }
    for (const assetId of referencedAssets(view)) {
      if (known.has(assetId)) continue;
      const dataUrl = this.assets[assetId];
      if (!dataUrl) continue;
      this.opts.send(userId, { k: 'asset', id: assetId, dataUrl });
      known.add(assetId);
    }
    this.opts.send(userId, { k: 'state', state: view, rev: ++this.rev, now: this.now() });
  }

  private commit(): void {
    this.opts.onChange?.(this._state);
    this.broadcast();
  }

  /** Nearest position (spiralling out) where a token of `size` doesn't overlap another one. */
  private freeSpot(sceneId: string, x: number, y: number, size: number): { x: number; y: number } {
    const scene = this._state.scenes[sceneId]!;
    const others = Object.values(this._state.tokens).filter((t) => t.sceneId === sceneId);
    const free = (cx: number, cy: number) =>
      cx >= 0 &&
      cy >= 0 &&
      cx + size <= scene.widthCells &&
      cy + size <= scene.heightCells &&
      !others.some((o) => cx < o.x + o.size && o.x < cx + size && cy < o.y + o.size && o.y < cy + size);
    const maxR = Math.max(scene.widthCells, scene.heightCells);
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (free(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
      }
    }
    return { x, y };
  }

  private setEntries(entries: GameState['initiative']['entries']): void {
    const ini = this._state.initiative;
    const currentId = ini.entries[ini.turn]?.id;
    ini.entries = [...entries].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    const idx = currentId ? ini.entries.findIndex((e) => e.id === currentId) : -1;
    ini.turn = idx >= 0 ? idx : 0;
  }

  private system(text: string): void {
    this.log({ kind: 'system', authorId: 'system', text });
  }

  private log(entry: Omit<LogEntry, 'id' | 'ts' | 'authorName'>): void {
    const s = this._state;
    const authorName =
      entry.authorId === 'system' ? 'Sistema' : entry.authorId === s.gmId ? 'Master' : s.players[entry.authorId]?.displayName ?? '???';
    s.log.push({ ...entry, id: newId(), ts: this.now(), authorName });
    if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  }
}

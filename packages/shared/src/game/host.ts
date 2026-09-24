import { cryptoRng, DiceError, roll, type Rng } from '../dice';
import { newId } from '../id';
import type { GameAction, HostToPlayer, PlayerToHost, TokenPatch } from './actions';
import {
  createScene,
  LOG_LIMIT,
  referencedAssets,
  viewFor,
  type GameState,
  type LogEntry,
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

const PLAYER_TOKEN_FIELDS: ReadonlyArray<keyof TokenPatch> = ['hp', 'conditions', 'color', 'name'];
const MAX_ASSET_BYTES = 12 * 1024 * 1024;

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
        if (p.widthCells !== undefined) scene.widthCells = clampInt(p.widthCells, 1, 200);
        if (p.heightCells !== undefined) scene.heightCells = clampInt(p.heightCells, 1, 200);
        if (p.cellDistance !== undefined) scene.cellDistance = clampInt(p.cellDistance, 1, 1000);
        if (p.showGrid !== undefined) scene.showGrid = !!p.showGrid;
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
          hp: t.hp ? { current: clampInt(t.hp.current, -999, 9999), max: clampInt(t.hp.max, 0, 9999) } : null,
          ac: t.ac != null ? clampInt(t.ac, 0, 99) : null,
          hidden: isGm ? !!t.hidden : false,
          conditions: Array.isArray(t.conditions) ? t.conditions.slice(0, 20).map(String) : [],
        };
        s.tokens[token.id] = token;
        break;
      }
      case 'token.move': {
        const t = s.tokens[action.tokenId];
        if (!t) return { ok: false, reason: 'Token inesistente' };
        if (!isGm && !t.ownerIds.includes(from)) return { ok: false, reason: 'Non controlli questo token' };
        const scene = s.scenes[t.sceneId]!;
        t.x = clampInt(action.x, 0, scene.widthCells - t.size);
        t.y = clampInt(action.y, 0, scene.heightCells - t.size);
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
            private: !!action.private,
          });
        } catch (e) {
          return { ok: false, reason: e instanceof DiceError ? e.message : 'Tiro non valido' };
        }
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
      case 'notes.update': {
        const denied = gmOnly();
        if (denied) return denied;
        s.gmNotes = action.text.slice(0, 100_000);
        break;
      }
      case 'asset.add': {
        const denied = gmOnly();
        if (denied) return denied;
        if (!/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/.test(action.dataUrl)) return { ok: false, reason: 'Formato immagine non supportato' };
        if (action.dataUrl.length > MAX_ASSET_BYTES) return { ok: false, reason: 'Immagine troppo grande (max ~9MB)' };
        const id = this.addAsset(action.dataUrl);
        const target = action.attachTo;
        if (target && 'sceneId' in target && s.scenes[target.sceneId]) s.scenes[target.sceneId]!.background = id;
        if (target && 'tokenId' in target && s.tokens[target.tokenId]) s.tokens[target.tokenId]!.image = id;
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
    this.opts.send(userId, { k: 'state', state: view, rev: ++this.rev });
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

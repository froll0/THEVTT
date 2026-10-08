import { blockingSegments, brushCells, copyPiece, ellipseCells, moveCost, pasteActions, emptyTerrain, EMPTY_TERRAIN, floodCells, lineCells, terrainKind, lineOfSight, paintCells, rectCells, lightSources, propCorners, sightFor, type AreaTemplate, type Drawing, type GameAction, type MapPiece, type Prop, type Scene, type TemplateShape, type Token, type Wall, type WallKind } from '@thevtt/shared';
import { exploredTexture, updateExplored } from './explored';
import { conditionImage, CONDITION_COLORS } from './conditionIcons';
import { drawLighting } from './lighting';
import { animatedProp, drawProp, LIGHT_PRESETS, metresToCells, propKind } from './props';
import { TerrainLayer, terrainSample, terrainSeed } from './terrainRender';
import { useEffect, useRef, useState } from 'react';
import { readImage } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { useCall } from '../store/call';
import { tokenSpeed } from '../lib/combat';

export const CELL = 70;
export type Tool = 'select' | 'measure' | 'ping' | 'fog' | 'template' | 'draw' | 'walls' | 'props' | 'light' | 'terrain' | 'copy';

export interface ToolOptions {
  fogReveal: boolean;
  shape: TemplateShape;
  /** drawing colour; empty = the player's own colour */
  drawColor: string;
  /** stroke width in cells */
  drawWidth: number;
  erase: boolean;
  /** draw tool writes text labels instead of strokes */
  drawText: boolean;
  /** new doors start closed, open or locked */
  doorState: 'closed' | 'open' | 'locked';
  wallKind: WallKind;
  /** chain of segments, a rectangular room by dragging, or one side of a cell per click */
  wallMode: 'line' | 'rect' | 'edge';
  wallErase: boolean;
  propKind: string;
  /** GM: see the darkness as players do */
  lightPreview: boolean;
  /** tokens and props land on the grid (Alt while dragging does the opposite) */
  snap: boolean;
  /** map painting: terrain code (EMPTY_TERRAIN rubs out), how, and brush size in cells */
  terrain: string;
  terrainMode: 'brush' | 'line' | 'rect' | 'ellipse' | 'fill' | 'pick';
  brushSize: number;
  /** degrees, for the next prop placed */
  propRotation: number;
  /** light placed by the light tool (LIGHT_PRESETS id) */
  lightKind: string;
  /** tokens drawn on the board (the map editor can hide them) */
  showTokens: boolean;
  /** the copy tool: take a piece of the map, or put the copied one down */
  pieceMode: 'copy' | 'paste';
}

/** A light preset as placed by the light tool, in cells for a scene. */
export function presetLight(scene: { cellDistance: number; unit?: 'm' | 'ft' }, id: string) {
  const p = LIGHT_PRESETS.find((l) => l.id === id) ?? LIGHT_PRESETS.find((l) => l.id === 'torch')!;
  return { bright: metresToCells(scene, p.bright), dim: metresToCells(scene, p.dim), color: p.color };
}

/** The side of a cell nearest to a point (cells): a door or a window fits there. */
export function nearestEdge(x: number, y: number) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const fx = x - cx;
  const fy = y - cy;
  const d = [fy, 1 - fy, fx, 1 - fx];
  const i = d.indexOf(Math.min(...d));
  if (i === 0) return { x1: cx, y1: cy, x2: cx + 1, y2: cy };
  if (i === 1) return { x1: cx, y1: cy + 1, x2: cx + 1, y2: cy + 1 };
  if (i === 2) return { x1: cx, y1: cy, x2: cx, y2: cy + 1 };
  return { x1: cx + 1, y1: cy, x2: cx + 1, y2: cy + 1 };
}

/** The cells a terrain shape covers, from one corner (cells) to the other. */
function shapeCells(mode: ToolOptions['terrainMode'], w: number, h: number, f: { x: number; y: number }, t: { x: number; y: number }, size: number): number[] {
  if (mode === 'line') return lineCells(w, h, f.x, f.y, t.x, t.y, size);
  const [x0, y0, x1, y1] = [Math.floor(f.x), Math.floor(f.y), Math.floor(t.x), Math.floor(t.y)];
  return mode === 'ellipse' ? ellipseCells(w, h, x0, y0, x1, y1) : rectCells(w, h, x0, y0, x1, y1);
}

/** Where a piece of map lands under the pointer (world px): centred on it, on the grid. */
const pieceAt = (p: MapPiece, wx: number, wy: number) => ({ x: Math.round(wx / CELL - p.w / 2), y: Math.round(wy / CELL - p.h / 2) });

/** A small dark tag with text, at a point in world px, readable at any zoom. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, zoom: number) {
  ctx.save();
  ctx.font = `600 ${12 / zoom}px Inter, system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 14 / zoom;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.beginPath();
  ctx.roundRect(x + 12 / zoom, y - 26 / zoom, w, 22 / zoom, 6 / zoom);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 19 / zoom, y - 15 / zoom);
  ctx.restore();
}

/**
 * Top-left (in cells) of something `size` cells wide centred near `c`: on the
 * grid it sits in a cell (odd sizes) or on a grid line (even ones), free it
 * goes exactly there.
 */
export function placeAxis(c: number, size: number, snap: boolean): number {
  if (!snap) return Math.round((c - size / 2) * 100) / 100;
  const odd = size < 1 || Math.round(size) % 2 === 1;
  return (odd ? Math.floor(c) + 0.5 : Math.round(c)) - size / 2;
}

/** Nearest grid point, corners and edge midpoints (half cells). */
const snapHalf = (v: number) => Math.round(v * 2) / 2;

function hitProp(p: Prop, x: number, y: number): boolean {
  // back to the prop's own frame, then a box test
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const r = (-(p.rotation || 0) * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const lx = dx * Math.cos(r) - dy * Math.sin(r);
  const ly = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2;
}

const WALL_COLORS: Record<WallKind, string> = { wall: '#ffb347', door: '#5ec8ff', window: '#9be7c4' };

/** Walls for the GM; doors for everyone (players click them to open). */
function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], zoom: number, which: 'all' | 'doors', hovered: string | null, selected: string | null, redraw: () => void) {
  for (const w of walls) {
    if (which === 'doors' && w.kind !== 'door') continue;
    const a = { x: w.x1 * CELL, y: w.y1 * CELL };
    const b = { x: w.x2 * CELL, y: w.y2 * CELL };
    ctx.save();
    ctx.lineCap = 'round';
    if (w.kind === 'door') {
      // a door: thick bar, hollow when open
      const width = (w.id === hovered ? 9 : 7) / zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = width + 3 / zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.stroke();
      ctx.lineWidth = width;
      ctx.strokeStyle = w.locked ? '#ff8a5c' : WALL_COLORS.door;
      if (w.open) ctx.setLineDash([6 / zoom, 5 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (w.id === selected) {
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (w.locked) {
        // a padlock in the middle of the door
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = 9 / zoom;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fillStyle = '#b8472a';
        ctx.fill();
        ctx.lineWidth = 1.5 / zoom;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.stroke();
        const icon = conditionImage('__lock', redraw);
        if (icon) ctx.drawImage(icon, mx - r * 0.62, my - r * 0.62, r * 1.24, r * 1.24);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = (w.id === hovered ? 6 : 4) / zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      ctx.lineWidth = (w.id === hovered ? 4 : 2.5) / zoom;
      ctx.strokeStyle = WALL_COLORS[w.kind];
      if (w.kind === 'window') ctx.setLineDash([3 / zoom, 4 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = WALL_COLORS[w.kind];
      for (const p of [a, b]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** Distance from point p to segment ab. */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitDrawing(d: Drawing, wx: number, wy: number, slack: number) {
  const p = d.points;
  if (d.text) {
    // roughly the label's box
    const h = d.width * CELL;
    const w = d.text.length * h * 0.55;
    return Math.abs(wx - p[0]! * CELL) <= w / 2 + slack && Math.abs(wy - p[1]! * CELL) <= h / 2 + slack;
  }
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (distToSegment(wx, wy, p[i]! * CELL, p[i + 1]! * CELL, p[i + 2]! * CELL, p[i + 3]! * CELL) <= (d.width * CELL) / 2 + slack) return true;
  }
  return false;
}

/** Half-angle of a 2024 cone: its width at the end equals its length. */
const CONE_HALF = Math.atan(0.5);

/** Is a point (cells) inside an area of effect? */
export function inTemplate(t: Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle'>, px: number, py: number): boolean {
  const dx = px - t.x;
  const dy = py - t.y;
  if (t.shape === 'circle') return Math.hypot(dx, dy) <= t.size + 1e-6;
  if (t.shape === 'square') return Math.abs(dx) <= t.size / 2 && Math.abs(dy) <= t.size / 2;
  const along = dx * Math.cos(t.angle) + dy * Math.sin(t.angle);
  const across = Math.abs(-dx * Math.sin(t.angle) + dy * Math.cos(t.angle));
  if (along < 0 || along > t.size + 1e-6) return false;
  return t.shape === 'cone' ? across <= along * Math.tan(CONE_HALF) + 1e-6 : across <= 0.5;
}

export function templatePath(ctx: CanvasRenderingContext2D, t: Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle'>) {
  const ox = t.x * CELL;
  const oy = t.y * CELL;
  const len = t.size * CELL;
  ctx.beginPath();
  if (t.shape === 'circle') ctx.arc(ox, oy, len, 0, Math.PI * 2);
  else if (t.shape === 'square') ctx.rect(ox - len / 2, oy - len / 2, len, len);
  else if (t.shape === 'cone') {
    ctx.moveTo(ox, oy);
    const r = len / Math.cos(CONE_HALF);
    ctx.lineTo(ox + Math.cos(t.angle - CONE_HALF) * r, oy + Math.sin(t.angle - CONE_HALF) * r);
    ctx.lineTo(ox + Math.cos(t.angle + CONE_HALF) * r, oy + Math.sin(t.angle + CONE_HALF) * r);
    ctx.closePath();
  } else {
    const half = CELL / 2;
    const nx = -Math.sin(t.angle) * half;
    const ny = Math.cos(t.angle) * half;
    const ex = ox + Math.cos(t.angle) * len;
    const ey = oy + Math.sin(t.angle) * len;
    ctx.moveTo(ox + nx, oy + ny);
    ctx.lineTo(ex + nx, ey + ny);
    ctx.lineTo(ex - nx, ey - ny);
    ctx.lineTo(ox - nx, oy - ny);
    ctx.closePath();
  }
}

function hitTemplate(ctx: CanvasRenderingContext2D, t: AreaTemplate, wx: number, wy: number): boolean {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  templatePath(ctx, t);
  const hit = ctx.isPointInPath(wx, wy);
  ctx.restore();
  return hit;
}

/** 1 px per cell texture of the fog, scaled up with smoothing for soft edges. */
function fogTexture(scene: Scene, cache: { key: string; canvas: HTMLCanvasElement | null }) {
  const fog = scene.fog;
  if (!fog?.enabled) return null;
  const key = `${scene.id}:${scene.widthCells}:${fog.revealed}`;
  if (cache.key === key && cache.canvas) return cache.canvas;
  const c = cache.canvas ?? document.createElement('canvas');
  c.width = scene.widthCells;
  c.height = scene.heightCells;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  for (let i = 0; i < c.width * c.height; i++) img.data[i * 4 + 3] = fog.revealed[i] === '1' ? 0 : 255;
  ctx.putImageData(img, 0, 0);
  cache.key = key;
  cache.canvas = c;
  return c;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'drag'; tokenId: string; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  | { kind: 'measure'; fx: number; fy: number; tx: number; ty: number }
  | { kind: 'fog'; fx: number; fy: number; tx: number; ty: number }
  | { kind: 'template'; fx: number; fy: number; tx: number; ty: number }
  /** points in world pixels */
  | { kind: 'draw'; points: number[] }
  | { kind: 'erase' }
  /** wall chain: points in cells, the pointer in world px */
  | { kind: 'wall'; points: { x: number; y: number }[]; tx: number; ty: number }
  | { kind: 'room'; fx: number; fy: number; tx: number; ty: number }
  | { kind: 'prop'; propId: string; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  /** a group dragged by one of its members (the anchor), which sets the snap */
  | { kind: 'group'; anchor: { x: number; y: number; w: number; h: number }; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  | { kind: 'box'; fx: number; fy: number; tx: number; ty: number }
  /** painting the map: the map as it will be, the last brush point in cells, or the rectangle in world px */
  | { kind: 'paint'; terrain: string; lx: number; ly: number }
  /** a terrain line, rectangle or ellipse being dragged (world px) */
  | { kind: 'paintShape'; fx: number; fy: number; tx: number; ty: number }
  /** the copy tool's rectangle (world px) */
  | { kind: 'copyRect'; fx: number; fy: number; tx: number; ty: number };

/**
 * Overlays (ruler, areas, drawings) must read on any map: a dark theme accent on a
 * dark dungeon disappears. Colours too dark are lifted towards white.
 */
export function vivid(color: string): string {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(color.trim());
  if (!m) return '#ffd166';
  const h = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!;
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
  if (lum < 0.55) {
    const t = (0.55 - lum) / (1 - lum);
    [r, g, b] = [r!, g!, b!].map((v) => Math.round(v + (255 - v) * t));
  }
  return `#${[r!, g!, b!].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const accentColor = () => vivid(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c9a227');

/** Stroke the current path with a dark halo under the colour, so it stands out on light and dark maps. */
function haloStroke(ctx: CanvasRenderingContext2D, color: string, width: number, zoom: number) {
  ctx.save();
  ctx.lineWidth = width + 3 / zoom;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const drawColor = (L: { options: ToolOptions; state: { players: Record<string, { color: string }> } | null; me: string; isGm: boolean }) =>
  L.options.drawColor || (L.isGm ? '#ffffff' : L.state?.players[L.me]?.color ?? '#ffffff');

/** Everyone can see a token's name; HP only its owners and the GM. */
const canControl = (t: Token, me: string, gm: boolean) => gm || t.ownerIds.includes(me);

/** Deleting a group: the tokens one controls, and props for the GM. */
export function groupDeleteActions(state: { tokens: Record<string, Token>; props?: Record<string, Prop> }, group: { tokens: string[]; props: string[] }, me: string, gm: boolean): GameAction[] {
  const out: GameAction[] = [];
  for (const id of group.tokens) {
    const t = state.tokens[id];
    if (t && canControl(t, me, gm)) out.push({ type: 'token.delete', tokenId: id });
  }
  if (gm) for (const id of group.props) if (state.props?.[id]) out.push({ type: 'prop.delete', propId: id });
  return out;
}

export function Board({
  tool,
  options,
  cameraRef,
  onPickTerrain,
  onCopied,
}: {
  tool: Tool;
  options: ToolOptions;
  cameraRef: React.RefObject<Camera | null>;
  onPickTerrain?: (code: string) => void;
  /** a piece of map was copied: the copy tool turns to pasting it */
  onCopied?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture>({ kind: 'none' });
  const images = useRef(new Map<string, HTMLImageElement>());
  const hover = useRef<string | null>(null);
  const dirty = useRef(true);
  /** where the pointer is (world px), for the placement preview */
  const hoverWorld = useRef<{ x: number; y: number } | null>(null);
  const altDown = useRef(false);
  /** grid snapping right now: the option, flipped while Alt is held */
  const snapNow = (L: { options: ToolOptions }) => (L.options.snap !== false) !== altDown.current;
  const tokenDropAt = (g: { wx: number; wy: number; ox: number; oy: number }, t: { size: number }) => {
    const L = live.current;
    return {
      x: placeAxis((g.wx - g.ox) / CELL + t.size / 2, t.size, snapNow(L)),
      y: placeAxis((g.wy - g.oy) / CELL + t.size / 2, t.size, snapNow(L)),
    };
  };
  const deleteGroup = () => {
    const L = live.current;
    if (!L.state) return;
    const actions = groupDeleteActions(L.state, L.group, L.me, L.isGm);
    if (actions.length) dispatch({ type: 'batch', actions });
    setGroup({ tokens: [], props: [] });
  };
  /** How far a group moves: its anchor lands on the grid (or not), the rest follows. */
  const groupDelta = (g: { anchor: { x: number; y: number; w: number; h: number }; ox: number; oy: number; wx: number; wy: number }) => {
    const L = live.current;
    const nx = placeAxis((g.wx - g.ox) / CELL + g.anchor.w / 2, g.anchor.w, snapNow(L));
    const ny = placeAxis((g.wy - g.oy) / CELL + g.anchor.h / 2, g.anchor.h, snapNow(L));
    return { dx: nx - g.anchor.x, dy: ny - g.anchor.y };
  };
  const propDropAt = (g: { wx: number; wy: number; ox: number; oy: number }, p: { w: number; h: number }) => {
    const L = live.current;
    return {
      x: placeAxis((g.wx - g.ox) / CELL + p.w / 2, p.w, snapNow(L)),
      y: placeAxis((g.wy - g.oy) / CELL + p.h / 2, p.h, snapNow(L)),
    };
  };
  const fogCache = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null });
  const terrainLayer = useRef(new TerrainLayer());
  /** textures for the previews, one per ground */
  const patterns = useRef(new Map<string, CanvasPattern | null>());
  /** what the bucket would fill from the cell under the pointer */
  const fillPreview = useRef<{ key: string; terrain: string | null | undefined; cells: number[] }>({ key: '', terrain: null, cells: [] });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [cursor, setCursor] = useState('default');
  const erased = useRef(new Set<string>());
  /** a label being typed: where (cells) and where on screen */
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; sx: number; sy: number; value: string } | null>(null);
  const commitText = () => {
    const d = textDraft;
    setTextDraft(null);
    const L = live.current;
    if (!d || !d.value.trim()) return;
    dispatch({ type: 'drawing.create', sceneId: live.current.scene?.id, points: [d.x, d.y], color: drawColor(L), width: L.options.drawWidth >= 0.16 ? 0.9 : L.options.drawWidth >= 0.08 ? 0.55 : 0.38, text: d.value });
  };

  const me = useApp((s) => s.user?.id ?? '');
  const { state, assets, pings, role, selectedTokenId, selectedPropId, selectedWallId, group, dispatch, select, selectProp, selectWall, setGroup, toggleInGroup } = useTable();
  const board = useSettings((s) => s.board);
  const isGm = role === 'gm';
  const editorSceneId = useTable((s) => s.editorSceneId);
  // the map editor may be working on a scene the players are not on
  const scene = state ? ((editorSceneId && state.scenes[editorSceneId]) || state.scenes[state.activeSceneId]) : undefined;

  // keep latest values available to the render loop and handlers
  const speaking = useCall((s) => s.speaking);
  const pendingArea = useTable((s) => s.pendingArea);
  const clipboard = useTable((s) => s.clipboard);
  const setClipboard = useTable((s) => s.setClipboard);
  const setPendingArea = useTable((s) => s.setPendingArea);
  const targets = useTable((s) => s.targets);
  const toggleTarget = useTable((s) => s.toggleTarget);
  const clearTargets = useTable((s) => s.clearTargets);
  /** a cone or line with no caster on the map: its point, set by a first click */
  const areaOrigin = useRef<{ x: number; y: number } | null>(null);
  const live = useRef({ state, assets, pings, scene, board, selectedTokenId, selectedPropId, selectedWallId, group, isGm, me, tool, options, selectedTemplate, speaking, pendingArea, clipboard, targets });
  live.current = { state, assets, pings, scene, board, selectedTokenId, selectedPropId, selectedWallId, group, isGm, me, tool, options, selectedTemplate, speaking, pendingArea, clipboard, targets };
  const hoverWall = useRef<string | null>(null);
  dirty.current = true;

  // players remember what they've seen
  useEffect(() => {
    if (state && !isGm && scene?.vision) updateExplored(state, me);
  }, [state, isGm, scene?.vision, me]);

  // center camera on first scene load
  useEffect(() => {
    if (!scene || !wrapRef.current) return;
    const { width, height } = wrapRef.current.getBoundingClientRect();
    const w = scene.widthCells * CELL;
    const h = scene.heightCells * CELL;
    // fit the map, but never so small that tokens become specks: then centre on the tokens
    const fit = Math.min(width / w, height / h) * 0.9;
    const zoom = Math.min(1.2, Math.max(0.6, fit));
    const toks = Object.values(state?.tokens ?? {}).filter((t) => t.sceneId === scene.id);
    const cx = zoom > fit && toks.length ? (toks.reduce((a, t) => a + t.x + t.size / 2, 0) / toks.length) * CELL : w / 2;
    const cy = zoom > fit && toks.length ? (toks.reduce((a, t) => a + t.y + t.size / 2, 0) / toks.length) * CELL : h / 2;
    cameraRef.current = { zoom, x: cx - width / 2 / zoom, y: cy - height / 2 / zoom };
    dirty.current = true;
  }, [scene?.id, cameraRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // render loop
  useEffect(() => {
    let raf = 0;
    const accent = accentColor;
    const image = (id: string | null) => {
      if (!id) return null;
      const src = live.current.assets[id];
      if (!src) return null;
      let img = images.current.get(id);
      if (!img) {
        img = new Image();
        img.onload = () => (dirty.current = true);
        img.src = src;
        images.current.set(id, img);
      }
      return img.complete && img.naturalWidth ? img : null;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const canvas = canvasRef.current;
      const cam = cameraRef.current;
      const L = live.current;
      const animating =
        L.pings.some((p) => performance.now() - p.at < 2000) || Object.values(L.state?.props ?? {}).some((p) => p.sceneId === L.scene?.id && animatedProp(p));
      if (!canvas || !cam || !L.state || !L.scene || (!dirty.current && !animating)) return;
      dirty.current = false;

      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: cw, clientHeight: ch } = canvas;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = L.board.background;
      ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, -cam.x * cam.zoom * dpr, -cam.y * cam.zoom * dpr);

      const W = L.scene.widthCells * CELL;
      const H = L.scene.heightCells * CELL;
      const bg = image(L.scene.background);
      ctx.fillStyle = hexToRgba(L.board.gridColor, 0.03);
      ctx.fillRect(0, 0, W, H);
      if (bg) {
        // a map with its own grid is scaled so its squares match ours; otherwise it fills the scene
        const px = L.scene.bgCellPx;
        if (px) ctx.drawImage(bg, (L.scene.bgOffsetX ?? 0) * CELL, (L.scene.bgOffsetY ?? 0) * CELL, (bg.naturalWidth / px) * CELL, (bg.naturalHeight / px) * CELL);
        else ctx.drawImage(bg, 0, 0, W, H);
      }
      // the painted map (while the GM paints, the stroke under way)
      const pg0 = gesture.current;
      const terrain = pg0.kind === 'paint' ? pg0.terrain : L.scene.terrain;
      terrainLayer.current.update(terrain, L.scene.widthCells, L.scene.heightCells, terrainSeed(L.scene.seed ?? L.scene.id), L.scene.autoWalls !== false && L.scene.buildingWalls !== false);
      terrainLayer.current.draw(ctx, CELL);
      if (L.scene.showGrid && L.board.gridOpacity > 0) {
        ctx.strokeStyle = hexToRgba(L.board.gridColor, L.board.gridOpacity);
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        for (let x = 0; x <= L.scene.widthCells; x++) {
          ctx.moveTo(x * CELL, 0);
          ctx.lineTo(x * CELL, H);
        }
        for (let y = 0; y <= L.scene.heightCells; y++) {
          ctx.moveTo(0, y * CELL);
          ctx.lineTo(W, y * CELL);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = hexToRgba(L.board.gridColor, 0.25);
      ctx.lineWidth = 2 / cam.zoom;
      ctx.strokeRect(0, 0, W, H);

      // what the terrain tool will do, painted with the real ground
      if (L.isGm && L.tool === 'terrain') {
        const sw = L.scene.widthCells;
        const sh = L.scene.heightCells;
        const bh = hoverWorld.current;
        const code = L.options.terrain;
        const preview = (cells: number[], alpha: number) => {
          if (!cells.length) return;
          let pat = patterns.current.get(code);
          if (pat === undefined) {
            pat = code === EMPTY_TERRAIN ? null : ctx.createPattern(terrainSample(code), 'repeat');
            patterns.current.set(code, pat);
          }
          pat?.setTransform(new DOMMatrix().scale(CELL / 32));
          const set = new Set(cells);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = pat ?? 'rgba(255,80,80,0.35)';
          ctx.beginPath();
          for (const i of cells) {
            const cx = i % sw;
            ctx.rect(cx * CELL, ((i - cx) / sw) * CELL, CELL, CELL);
          }
          ctx.fill();
          ctx.restore();
          // the outline of the whole shape
          ctx.beginPath();
          for (const i of cells) {
            const cx = i % sw;
            const cy = (i - cx) / sw;
            if (cy === 0 || !set.has(i - sw)) (ctx.moveTo(cx * CELL, cy * CELL), ctx.lineTo((cx + 1) * CELL, cy * CELL));
            if (cy === sh - 1 || !set.has(i + sw)) (ctx.moveTo(cx * CELL, (cy + 1) * CELL), ctx.lineTo((cx + 1) * CELL, (cy + 1) * CELL));
            if (cx === 0 || !set.has(i - 1)) (ctx.moveTo(cx * CELL, cy * CELL), ctx.lineTo(cx * CELL, (cy + 1) * CELL));
            if (cx === sw - 1 || !set.has(i + 1)) (ctx.moveTo((cx + 1) * CELL, cy * CELL), ctx.lineTo((cx + 1) * CELL, (cy + 1) * CELL));
          }
          haloStroke(ctx, code === EMPTY_TERRAIN ? '#ff6b6b' : '#ffffff', 1.5 / cam.zoom, cam.zoom);
        };
        const gq = gesture.current;
        const mode = L.options.terrainMode;
        if (gq.kind === 'paintShape') {
          const f = { x: gq.fx / CELL, y: gq.fy / CELL };
          const t = { x: gq.tx / CELL, y: gq.ty / CELL };
          preview(shapeCells(mode, sw, sh, f, t, L.options.brushSize), 0.9);
          const dx = Math.abs(Math.floor(t.x) - Math.floor(f.x)) + 1;
          const dy = Math.abs(Math.floor(t.y) - Math.floor(f.y)) + 1;
          const unit = L.scene.unit ?? 'ft';
          const m = (n: number) => `${String(Math.round(n * L.scene!.cellDistance * 10) / 10).replace('.', ',')}`;
          tag(ctx, mode === 'line' ? `${m(Math.hypot(t.x - f.x, t.y - f.y))} ${unit}` : `${dx} × ${dy} · ${m(dx)} × ${m(dy)} ${unit}`, gq.tx, gq.ty, cam.zoom);
        } else if (bh && gq.kind === 'none' && bh.x >= 0 && bh.y >= 0 && bh.x < sw * CELL && bh.y < sh * CELL) {
          const cx = Math.floor(bh.x / CELL);
          const cy = Math.floor(bh.y / CELL);
          if (mode === 'fill') {
            const fp = fillPreview.current;
            const key = `${cx},${cy},${code}`;
            if (fp.key !== key || fp.terrain !== L.scene.terrain) {
              const base = L.scene.terrain ?? emptyTerrain(sw, sh);
              fillPreview.current = { key, terrain: L.scene.terrain, cells: base[cy * sw + cx] === code ? [] : floodCells(base, sw, sh, cx, cy) };
            }
            preview(fillPreview.current.cells, 0.75);
          } else if (mode === 'pick') {
            const here = L.scene.terrain?.[cy * sw + cx];
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / cam.zoom;
            ctx.strokeRect(cx * CELL, cy * CELL, CELL, CELL);
            tag(ctx, terrainKind(here)?.name ?? 'Niente', bh.x, bh.y, cam.zoom);
          } else {
            preview(brushCells(sw, sh, bh.x / CELL, bh.y / CELL, mode === 'brush' || mode === 'line' ? L.options.brushSize : 1), 0.85);
          }
        }
      }

      // scenery, under everything else
      const tnow = performance.now() / 1000;
      for (const p of Object.values(L.state.props ?? {})) {
        if (p.sceneId !== L.scene.id) continue;
        const pg = gesture.current;
        const inGroup = L.group.props.includes(p.id);
        const gd = pg.kind === 'group' && pg.moved && inGroup ? groupDelta(pg) : null;
        const shown = pg.kind === 'prop' && pg.propId === p.id ? { ...p, ...propDropAt(pg, p) } : gd ? { ...p, x: p.x + gd.dx, y: p.y + gd.dy } : p;
        drawProp(ctx, shown, CELL, image(p.image), tnow, L.isGm);
        // the GM sees where a passage leads
        if (L.isGm && p.link && L.state.scenes[p.link]) tag(ctx, `→ ${L.state.scenes[p.link]!.name}`, shown.x * CELL + shown.w * CELL - 10 / cam.zoom, shown.y * CELL + 6 / cam.zoom, cam.zoom);
        if (p.id === L.selectedPropId || inGroup) {
          const c = propCorners(shown);
          ctx.beginPath();
          c.forEach((q, i) => (i ? ctx.lineTo(q.x * CELL, q.y * CELL) : ctx.moveTo(q.x * CELL, q.y * CELL)));
          ctx.closePath();
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          haloStroke(ctx, accentColor(), 2 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
        }
      }

      // the prop about to be placed, under the cursor
      const hw = hoverWorld.current;
      if (hw && L.isGm && (L.tool === 'props' || L.tool === 'light') && gesture.current.kind === 'none') {
        const kind = propKind(L.tool === 'light' ? 'light' : L.options.propKind);
        if (kind) {
          const ghost: Prop = {
            id: '__preview',
            sceneId: L.scene.id,
            kind: kind.id,
            image: null,
            x: placeAxis(hw.x / CELL, kind.w, snapNow(L)),
            y: placeAxis(hw.y / CELL, kind.h, snapNow(L)),
            w: kind.w,
            h: kind.h,
            rotation: L.tool === 'props' ? L.options.propRotation : 0,
            light: null,
            blocksVision: false,
            hidden: false,
          };
          // how far its light will reach: bright, then dim
          const light = L.tool === 'light' ? presetLight(L.scene, L.options.lightKind) : kind.light ? { bright: metresToCells(L.scene, kind.light.bright), dim: metresToCells(L.scene, kind.light.dim), color: kind.light.color } : null;
          if (light && light.dim > 0) {
            const lx = (ghost.x + ghost.w / 2) * CELL;
            const ly = (ghost.y + ghost.h / 2) * CELL;
            const col = light.color ?? '#ffe9a8';
            const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, light.dim * CELL);
            grad.addColorStop(0, hexToRgba(col, 0.32));
            grad.addColorStop(Math.min(0.999, light.bright / light.dim), hexToRgba(col, 0.2));
            grad.addColorStop(1, hexToRgba(col, 0.04));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, ly, light.dim * CELL, 0, Math.PI * 2);
            ctx.fill();
            ctx.setLineDash([6 / cam.zoom, 5 / cam.zoom]);
            ctx.beginPath();
            ctx.arc(lx, ly, light.dim * CELL, 0, Math.PI * 2);
            haloStroke(ctx, col, 1.2 / cam.zoom, cam.zoom);
            ctx.setLineDash([]);
            if (light.bright > 0) {
              ctx.beginPath();
              ctx.arc(lx, ly, light.bright * CELL, 0, Math.PI * 2);
              haloStroke(ctx, col, 1.6 / cam.zoom, cam.zoom);
            }
            const unit = L.scene.unit ?? 'ft';
            const fmt = (c: number) => String(Math.round(c * L.scene!.cellDistance * 10) / 10).replace('.', ',');
            tag(ctx, `luce ${fmt(light.bright)} + ${fmt(light.dim - light.bright)} ${unit}`, lx, ly - 10 / cam.zoom, cam.zoom);
          }
          ctx.save();
          ctx.globalAlpha = 0.6;
          drawProp(ctx, ghost, CELL, null, tnow, true);
          ctx.restore();
          ctx.beginPath();
          ctx.rect(ghost.x * CELL, ghost.y * CELL, ghost.w * CELL, ghost.h * CELL);
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          haloStroke(ctx, accentColor(), 1.5 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
        }
      }

      // the copy tool: the zone being copied, or the piece about to be put down
      if (L.isGm && L.tool === 'copy') {
        const hwc = hoverWorld.current;
        const gq = gesture.current;
        if (gq.kind === 'copyRect') {
          const x0 = Math.floor(Math.min(gq.fx, gq.tx) / CELL);
          const y0 = Math.floor(Math.min(gq.fy, gq.ty) / CELL);
          const x1 = Math.floor(Math.max(gq.fx, gq.tx) / CELL) + 1;
          const y1 = Math.floor(Math.max(gq.fy, gq.ty) / CELL) + 1;
          ctx.fillStyle = hexToRgba(accentColor(), 0.18);
          ctx.fillRect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
          ctx.beginPath();
          ctx.rect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
          ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
          haloStroke(ctx, accentColor(), 2 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
          tag(ctx, `Copia ${x1 - x0} × ${y1 - y0}`, gq.tx, gq.ty, cam.zoom);
        } else if (L.options.pieceMode === 'paste' && L.clipboard && hwc) {
          const pc = L.clipboard;
          const at = pieceAt(pc, hwc.x, hwc.y);
          ctx.save();
          ctx.globalAlpha = 0.85;
          for (let py = 0; py < pc.h; py++)
            for (let px = 0; px < pc.w; px++) {
              const code = pc.terrain[py * pc.w + px];
              if (!code || code === EMPTY_TERRAIN) continue;
              let pat = patterns.current.get(code);
              if (pat === undefined) {
                pat = ctx.createPattern(terrainSample(code), 'repeat');
                patterns.current.set(code, pat);
              }
              pat?.setTransform(new DOMMatrix().scale(CELL / 32));
              ctx.fillStyle = pat ?? '#888';
              ctx.fillRect((at.x + px) * CELL, (at.y + py) * CELL, CELL, CELL);
            }
          ctx.globalAlpha = 0.75;
          for (const p of pc.props) drawProp(ctx, { ...p, id: 'piece', sceneId: L.scene.id, rotation: p.rotation ?? 0, light: null, blocksVision: false, hidden: false, image: p.image ?? null, x: at.x + p.x, y: at.y + p.y }, CELL, image(p.image ?? null), tnow, true);
          ctx.restore();
          ctx.lineCap = 'round';
          for (const wl of pc.walls) {
            ctx.beginPath();
            ctx.moveTo((at.x + wl.x1) * CELL, (at.y + wl.y1) * CELL);
            ctx.lineTo((at.x + wl.x2) * CELL, (at.y + wl.y2) * CELL);
            haloStroke(ctx, WALL_COLORS[wl.kind], 4 / cam.zoom, cam.zoom);
          }
          ctx.lineCap = 'butt';
          for (const l of pc.labels) {
            ctx.font = `600 ${l.width * CELL}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = l.color;
            ctx.fillText(l.text, (at.x + l.x) * CELL, (at.y + l.y) * CELL);
          }
          ctx.beginPath();
          ctx.rect(at.x * CELL, at.y * CELL, pc.w * CELL, pc.h * CELL);
          ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
          haloStroke(ctx, accentColor(), 2 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
          tag(ctx, `${pc.name ?? 'Incolla'} · ${pc.w} × ${pc.h}`, (at.x + pc.w) * CELL, at.y * CELL, cam.zoom);
        }
      }

      const fogTex = fogTexture(L.scene, fogCache.current);
      if (fogTex) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        // the GM sees through the fog, players don't
        ctx.globalAlpha = L.isGm ? 0.55 : 1;
        ctx.drawImage(fogTex, 0, 0, W, H);
        ctx.restore();
      }

      const acc = accent();
      const g0 = gesture.current;
      for (const t of Object.values(L.state.templates ?? {})) {
        if (t.sceneId !== L.scene.id) continue;
        ctx.save();
        templatePath(ctx, t);
        const tc = vivid(t.color);
        ctx.fillStyle = hexToRgba(tc, 0.28);
        ctx.fill();
        if (t.id === L.selectedTemplate) ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, tc, (t.id === L.selectedTemplate ? 3 : 2) / cam.zoom, cam.zoom);
        ctx.restore();
      }
      const strokeLine = (pts: number[], color: string, width: number) => {
        if (pts.length < 4) return;
        ctx.beginPath();
        ctx.moveTo(pts[0]!, pts[1]!);
        for (let i = 2; i + 1 < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        haloStroke(ctx, vivid(color), width, cam.zoom);
      };
      for (const d of Object.values(L.state.drawings ?? {})) {
        if (d.sceneId !== L.scene.id) continue;
        if (d.text) {
          const size = d.width * CELL;
          ctx.save();
          ctx.font = `700 ${size}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(3 / cam.zoom, size * 0.18);
          ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(d.text, d.points[0]! * CELL, d.points[1]! * CELL);
          ctx.fillStyle = vivid(d.color);
          ctx.fillText(d.text, d.points[0]! * CELL, d.points[1]! * CELL);
          ctx.restore();
          continue;
        }
        ctx.save();
        strokeLine(d.points.map((v) => v * CELL), d.color, d.width * CELL);
        ctx.restore();
      }
      if (g0.kind === 'draw') {
        ctx.save();
        strokeLine(g0.points, drawColor(L), L.options.drawWidth * CELL);
        ctx.restore();
      }

      // a spell's area being placed: where it goes, and who's caught in it
      const draft = L.pendingArea ? areaDraft() : null;
      if (draft && L.pendingArea) {
        ctx.save();
        templatePath(ctx, draft);
        ctx.fillStyle = hexToRgba(acc, 0.26);
        ctx.fill();
        ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, acc, 2.5 / cam.zoom, cam.zoom);
        ctx.restore();
        const caught = tokensInArea(draft);
        for (const t of caught) {
          ctx.beginPath();
          ctx.arc((t.x + t.size / 2) * CELL, (t.y + t.size / 2) * CELL, (t.size * CELL) / 2 + 4 / cam.zoom, 0, Math.PI * 2);
          haloStroke(ctx, '#ff9f0a', 3 / cam.zoom, cam.zoom);
        }
        const hwp = hoverWorld.current!;
        const pending = (L.pendingArea.shape === 'cone' || L.pendingArea.shape === 'line') && !areaOrigin.current && !(L.pendingArea.originTokenId && L.state.tokens[L.pendingArea.originTokenId]?.sceneId === L.scene.id);
        tag(ctx, pending ? `${L.pendingArea.label}: clic sul punto di partenza` : `${L.pendingArea.label} · ${caught.length ? `${caught.length} ${caught.length === 1 ? 'creatura' : 'creature'}` : 'nessuno dentro'}`, hwp.x, hwp.y, cam.zoom);
      }

      const ini = L.state.initiative;
      const activeTokenId = ini.round > 0 ? ini.entries[ini.turn]?.tokenId : null;
      const g = gesture.current;
      const tokens = Object.values(L.state.tokens)
        .filter((t) => t.sceneId === L.scene!.id && L.options.showTokens !== false)
        .sort((a, b) => b.size - a.size);

      for (const t of tokens) {
        let px = t.x * CELL;
        let py = t.y * CELL;
        if (g.kind === 'drag' && g.tokenId === t.id) {
          px = g.wx - g.ox;
          py = g.wy - g.oy;
        }
        const grouped = L.group.tokens.includes(t.id);
        if (g.kind === 'group' && g.moved && grouped) {
          const d = groupDelta(g);
          px = (t.x + d.dx) * CELL;
          py = (t.y + d.dy) * CELL;
        }
        const size = t.size * CELL;
        const r = size / 2 - 5;
        const cx = px + size / 2;
        const cy = py + size / 2;
        ctx.save();
        ctx.globalAlpha = t.hidden ? 0.45 : 1;
        if (t.aura && t.aura.radius > 0) {
          const ac = vivid(t.aura.color);
          const ar = (t.aura.radius + t.size / 2) * CELL;
          ctx.beginPath();
          ctx.arc(cx, cy, ar, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(ac, 0.13);
          ctx.fill();
          ctx.lineWidth = 1.5 / cam.zoom;
          ctx.strokeStyle = hexToRgba(ac, 0.7);
          ctx.stroke();
        }

        // whoever owns this token is speaking in the voice chat
        if (t.ownerIds.some((id) => L.speaking[id])) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 4 / cam.zoom + 2, 0, Math.PI * 2);
          ctx.lineWidth = 3 / cam.zoom;
          ctx.strokeStyle = 'rgba(48,209,88,0.95)';
          ctx.shadowColor = '#30d158';
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        if (t.id === activeTokenId) {
          ctx.shadowColor = acc;
          ctx.shadowBlur = 24;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = t.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        const img = image(t.image);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
          ctx.clip();
          const s = Math.max((r * 2) / img.width, (r * 2) / img.height);
          ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.font = `600 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.name.slice(0, 2).toUpperCase(), cx, cy + 1);
        }

        ctx.lineWidth = t.id === L.selectedTokenId || grouped ? 4 : 2.5;
        ctx.strokeStyle = t.id === L.selectedTokenId || grouped ? acc : 'rgba(0,0,0,0.5)';
        if (t.hidden) ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (L.targets.includes(t.id)) {
          // a target: a red reticle around the token
          ctx.save();
          ctx.strokeStyle = '#ff453a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2));
            ctx.lineTo(cx + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13));
            ctx.stroke();
          }
          ctx.restore();
        }

        if (t.conditions.length) {
          // icon badges along the top edge of the token
          const shown = t.conditions.length > 6 ? t.conditions.slice(0, 5) : t.conditions;
          // readable at any zoom, never bigger than half the token
          const br = Math.min(r * 0.5, Math.max(8.5 / cam.zoom, r * 0.28));
          // badges side by side along the rim, spread no further than the upper half
          const step = Math.min((2.15 * br) / (r + 1), Math.PI / Math.max(1, shown.length));
          const start = -Math.PI / 2 - (step * (shown.length - 1 + (shown.length < t.conditions.length ? 1 : 0))) / 2;
          const badge = (i: number, draw: (x: number, y: number) => void, color: string) => {
            const a = start + i * step;
            const x = cx + Math.cos(a) * (r + 1);
            const y = cy + Math.sin(a) * (r + 1);
            ctx.beginPath();
            ctx.arc(x, y, br, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.stroke();
            draw(x, y);
          };
          shown.forEach((c, i) =>
            badge(
              i,
              (x, y) => {
                const icon = conditionImage(c, () => (dirty.current = true));
                if (icon) ctx.drawImage(icon, x - br * 0.62, y - br * 0.62, br * 1.24, br * 1.24);
              },
              CONDITION_COLORS[c] ?? '#d9534f',
            ),
          );
          if (shown.length < t.conditions.length) {
            badge(
              shown.length,
              (x, y) => {
                ctx.fillStyle = '#fff';
                ctx.font = `700 ${Math.round(br)}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`+${t.conditions.length - shown.length}`, x, y + 0.5);
              },
              '#55575f',
            );
          }
        }

        if (L.board.hpBars && t.hp && t.hp.max > 0 && canControl(t, L.me, L.isGm)) {
          const bw = size * 0.7;
          const pct = Math.max(0, Math.min(1, t.hp.current / t.hp.max));
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(cx - bw / 2, py + size - 8, bw, 6);
          ctx.fillStyle = pct > 0.5 ? '#3fb67a' : pct > 0.25 ? '#e5a50a' : '#e5484d';
          ctx.fillRect(cx - bw / 2, py + size - 8, bw * pct, 6);
        }

        const showName = L.board.tokenNames === 'always' || (L.board.tokenNames === 'hover' && (hover.current === t.id || t.id === L.selectedTokenId));
        if (showName) {
          ctx.font = '600 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const w = ctx.measureText(t.name).width + 12;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.beginPath();
          ctx.roundRect(cx - w / 2, py + size + 2, w, 20, 6);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(t.name, cx, py + size + 5);
        }
        ctx.restore();
      }

      // dragging a token: how far it goes, and whether a wall is in the way (players)
      if (g.kind === 'drag' && g.moved) {
        const t = L.state.tokens[g.tokenId];
        if (t) {
          const half = (t.size * CELL) / 2;
          const a = { x: t.x * CELL + half, y: t.y * CELL + half };
          const { x: nx, y: ny } = tokenDropAt(g, t);
          const b = { x: nx * CELL + half, y: ny * CELL + half };
          const cells = Math.max(Math.abs(nx - t.x), Math.abs(ny - t.y));
          const walls = Object.values(L.state.walls ?? {})
            .filter((w) => w.sceneId === L.scene!.id && !(w.kind === 'door' && w.open))
            .map((w) => ({ a: { x: w.x1, y: w.y1 }, b: { x: w.x2, y: w.y2 } }));
          const blocked = !L.isGm && walls.length > 0 && !lineOfSight({ x: a.x / CELL, y: a.y / CELL }, { x: b.x / CELL, y: b.y / CELL }, walls);
          const col = blocked ? '#ff5a5f' : accentColor();
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.setLineDash([10 / cam.zoom, 6 / cam.zoom]);
          haloStroke(ctx, col, 3 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
          // landing square
          ctx.beginPath();
          ctx.rect(nx * CELL, ny * CELL, t.size * CELL, t.size * CELL);
          haloStroke(ctx, col, 2 / cam.zoom, cam.zoom);
          // difficult ground costs double; in combat, what's left of the turn's walk
          const cost = moveCost(L.scene.terrain, L.scene.widthCells, L.scene.heightCells, { x: t.x + t.size / 2 - 0.5, y: t.y + t.size / 2 - 0.5 }, { x: nx + t.size / 2 - 0.5, y: ny + t.size / 2 - 0.5 });
          const fmtD = (c: number) => String(Math.round(c * L.scene!.cellDistance * 10) / 10).replace('.', ',');
          const unit = L.scene.unit ?? 'ft';
          const inCombat = L.state.initiative.round > 0 && L.state.initiative.entries.some((e) => e.tokenId === t.id);
          const speedM = inCombat ? tokenSpeed(L.state, t) : null;
          const speedCells = speedM !== null ? speedM / (L.scene.unit === 'ft' ? L.scene.cellDistance * 0.3048 : L.scene.cellDistance) : null;
          const used = (t.moved ?? 0) + Math.max(cost, Math.round(cells));
          const over = speedCells !== null && used > speedCells + 1e-6;
          const label = blocked
            ? 'C’è un muro'
            : `${fmtD(Math.max(cost, cells))} ${unit}${cost > Math.round(cells) ? ' · terreno difficile' : ''}${speedCells !== null ? ` · ${fmtD(used)}/${fmtD(speedCells)} nel turno` : ''}${over ? ' · troppo lontano' : ''}`;
          ctx.font = `700 ${14 / cam.zoom}px system-ui, sans-serif`;
          const w = ctx.measureText(label).width + 14 / cam.zoom;
          ctx.fillStyle = blocked || over ? 'rgba(120,20,24,0.9)' : 'rgba(0,0,0,0.8)';
          ctx.beginPath();
          ctx.roundRect(b.x + half + 6 / cam.zoom, b.y - 12 / cam.zoom, w, 24 / cam.zoom, 6 / cam.zoom);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, b.x + half + 13 / cam.zoom, b.y);
        }
      }

      // doors under the darkness (so players only see those in sight), then light and shadow
      const walls = Object.values(L.state.walls ?? {}).filter((w) => w.sceneId === L.scene!.id);
      const redraw = () => (dirty.current = true);
      if (!L.isGm) drawWalls(ctx, walls, cam.zoom, 'doors', hoverWall.current, null, redraw);
      if (L.scene.vision) {
        const bounds = { w: L.scene.widthCells, h: L.scene.heightCells };
        if (!L.isGm) {
          const sight = sightFor(L.state, L.me);
          const explored = exploredTexture(L.state.campaignId, L.scene.id);
          drawLighting(ctx, { cell: CELL, bounds, explored, segments: sight.segments, viewers: sight.viewers, lights: sight.lights, ambient: sight.ambient }, ctx.getTransform(), 1);
        } else if (L.options.lightPreview) {
          // what the players' tokens see, together
          const viewers = Object.values(L.state.tokens)
            .filter((t) => t.sceneId === L.scene!.id && t.ownerIds.length > 0)
            .map((t) => ({ x: t.x + t.size / 2, y: t.y + t.size / 2, darkvision: t.darkvision ?? 0 }));
          drawLighting(
            ctx,
            { cell: CELL, bounds, segments: blockingSegments(L.state, L.scene.id), viewers, lights: lightSources(L.state, L.scene.id), ambient: L.scene.ambient ?? 'bright' },
            ctx.getTransform(),
            0.7,
          );
        }
      }
      // the map's own walls only while working on walls or the map: the painting shows them already
      const gmWalls = L.tool === 'walls' || L.tool === 'terrain' ? walls : walls.filter((w) => !w.auto);
      if (L.isGm && (L.tool === 'walls' || L.scene.vision || gmWalls.length))
        drawWalls(ctx, gmWalls, cam.zoom, L.tool === 'walls' || L.scene.vision ? 'all' : 'doors', hoverWall.current, L.selectedWallId, redraw);

      if (g.kind === 'wall' && g.points.length) {
        const last = g.points[g.points.length - 1]!;
        ctx.beginPath();
        g.points.forEach((q, i) => (i ? ctx.lineTo(q.x * CELL, q.y * CELL) : ctx.moveTo(q.x * CELL, q.y * CELL)));
        ctx.moveTo(last.x * CELL, last.y * CELL);
        ctx.lineTo(snapHalf(g.tx / CELL) * CELL, snapHalf(g.ty / CELL) * CELL);
        ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, WALL_COLORS[L.options.wallKind], 3 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
        const len = Math.hypot(snapHalf(g.tx / CELL) - last.x, snapHalf(g.ty / CELL) - last.y) * L.scene.cellDistance;
        tag(ctx, `${String(Math.round(len * 10) / 10).replace('.', ',')} ${L.scene.unit ?? 'ft'}`, g.tx, g.ty, cam.zoom);
      }
      // a door, window or wall on the side of a cell, where the click would put it
      const hwall = hoverWorld.current;
      if (L.isGm && L.tool === 'walls' && L.options.wallMode === 'edge' && !L.options.wallErase && hwall && g.kind === 'none') {
        const e = nearestEdge(hwall.x / CELL, hwall.y / CELL);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.x1 * CELL, e.y1 * CELL);
        ctx.lineTo(e.x2 * CELL, e.y2 * CELL);
        haloStroke(ctx, WALL_COLORS[L.options.wallKind], 6 / cam.zoom, cam.zoom);
        ctx.lineCap = 'butt';
      }
      if (g.kind === 'room') {
        const x0 = snapHalf(Math.min(g.fx, g.tx) / CELL) * CELL;
        const y0 = snapHalf(Math.min(g.fy, g.ty) / CELL) * CELL;
        const x1 = snapHalf(Math.max(g.fx, g.tx) / CELL) * CELL;
        const y1 = snapHalf(Math.max(g.fy, g.ty) / CELL) * CELL;
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, WALL_COLORS[L.options.wallKind], 3 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
        const fmt = (px: number) => String(Math.round((px / CELL) * 10) / 10).replace('.', ',');
        tag(ctx, `${fmt(x1 - x0)} × ${fmt(y1 - y0)} caselle`, g.tx, g.ty, cam.zoom);
      }

      if (g.kind === 'fog') {
        const x0 = Math.floor(Math.min(g.fx, g.tx) / CELL);
        const y0 = Math.floor(Math.min(g.fy, g.ty) / CELL);
        const x1 = Math.floor(Math.max(g.fx, g.tx) / CELL) + 1;
        const y1 = Math.floor(Math.max(g.fy, g.ty) / CELL) + 1;
        ctx.fillStyle = L.options.fogReveal ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.45)';
        ctx.fillRect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
        ctx.beginPath();
        ctx.rect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
        haloStroke(ctx, acc, 2 / cam.zoom, cam.zoom);
      }
      if (g.kind === 'template') {
        const size = Math.max(0.5, Math.hypot(g.tx - g.fx, g.ty - g.fy) / CELL);
        const draft = { shape: L.options.shape, x: g.fx / CELL, y: g.fy / CELL, size: Math.round(size * 2) / 2, angle: Math.atan2(g.ty - g.fy, g.tx - g.fx) };
        templatePath(ctx, draft);
        ctx.fillStyle = hexToRgba(acc, 0.28);
        ctx.fill();
        haloStroke(ctx, acc, 2.5 / cam.zoom, cam.zoom);
        const unit = L.scene.unit ?? 'ft';
        const label = `${String(Math.round(draft.size * L.scene.cellDistance * 10) / 10).replace('.', ',')} ${unit}`;
        ctx.font = `700 ${14 / cam.zoom}px system-ui, sans-serif`;
        const w = ctx.measureText(label).width + 14 / cam.zoom;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(g.tx + 12 / cam.zoom, g.ty - 12 / cam.zoom, w, 24 / cam.zoom, 6 / cam.zoom);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, g.tx + 19 / cam.zoom, g.ty);
      }

      if (g.kind === 'box') {
        ctx.beginPath();
        ctx.rect(Math.min(g.fx, g.tx), Math.min(g.fy, g.ty), Math.abs(g.tx - g.fx), Math.abs(g.ty - g.fy));
        ctx.fillStyle = hexToRgba(acc, 0.12);
        ctx.fill();
        ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
        haloStroke(ctx, acc, 1.5 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
      }
      if (g.kind === 'measure') {
        const fx = Math.floor(g.fx / CELL);
        const fy = Math.floor(g.fy / CELL);
        const tx = Math.floor(g.tx / CELL);
        const ty = Math.floor(g.ty / CELL);
        const cells = Math.max(Math.abs(tx - fx), Math.abs(ty - fy));
        const a = { x: (fx + 0.5) * CELL, y: (fy + 0.5) * CELL };
        const b = { x: (tx + 0.5) * CELL, y: (ty + 0.5) * CELL };
        ctx.setLineDash([10 / cam.zoom, 6 / cam.zoom]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        haloStroke(ctx, acc, 3 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
        // end points
        for (const p of [a, b]) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 / cam.zoom, 0, Math.PI * 2);
          ctx.fillStyle = acc;
          ctx.fill();
          ctx.lineWidth = 2 / cam.zoom;
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.stroke();
        }
        const unit = L.scene.unit ?? 'ft';
        const dist = Math.round(cells * L.scene.cellDistance * 10) / 10;
        const label = `${String(dist).replace('.', ',')} ${unit}`;
        ctx.font = `700 ${14 / cam.zoom}px system-ui, sans-serif`;
        const w = ctx.measureText(label).width + 14 / cam.zoom;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(b.x + 12 / cam.zoom, b.y - 12 / cam.zoom, w, 24 / cam.zoom, 6 / cam.zoom);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, b.x + 19 / cam.zoom, b.y);
      }

      const now = performance.now();
      for (const p of L.pings) {
        const age = (now - p.at) / 2000;
        if (age >= 1) continue;
        for (let k = 0; k < 2; k++) {
          const a2 = (age + k * 0.25) % 1;
          ctx.beginPath();
          ctx.arc(p.x * CELL, p.y * CELL, (10 + a2 * 70) / Math.max(cam.zoom, 0.5), 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(p.color.length === 7 ? p.color : '#ffffff', (1 - a2) * (1 - age));
          ctx.lineWidth = 4 / cam.zoom;
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cameraRef]);

  // ---------- input ----------
  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cam = cameraRef.current!;
    return { x: (clientX - rect.left) / cam.zoom + cam.x, y: (clientY - rect.top) / cam.zoom + cam.y };
  };

  /** the spell's area as it would land now, following the pointer */
  const areaDraft = (): Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle'> | null => {
    const L = live.current;
    const pa = L.pendingArea;
    const hw = hoverWorld.current;
    if (!pa || !hw || !L.state) return null;
    const cx = hw.x / CELL;
    const cy = hw.y / CELL;
    if (pa.shape === 'cone' || pa.shape === 'line') {
      const caster = pa.originTokenId ? L.state.tokens[pa.originTokenId] : undefined;
      const o = caster && caster.sceneId === L.scene?.id ? { x: caster.x + caster.size / 2, y: caster.y + caster.size / 2 } : areaOrigin.current;
      if (!o) return { shape: pa.shape, x: cx, y: cy, size: pa.size, angle: 0 };
      return { shape: pa.shape, x: o.x, y: o.y, size: pa.size, angle: Math.atan2(cy - o.y, cx - o.x) };
    }
    // spheres and cubes sit on the corners and centres of the squares
    const snap = (v: number) => Math.round(v * 2) / 2;
    return { shape: pa.shape, x: snap(cx), y: snap(cy), size: pa.size, angle: 0 };
  };
  const tokensInArea = (d: Pick<AreaTemplate, 'shape' | 'x' | 'y' | 'size' | 'angle'>) => {
    const L = live.current;
    if (!L.state || !L.scene) return [];
    return Object.values(L.state.tokens).filter((t) => t.sceneId === L.scene!.id && (L.isGm || !t.hidden) && inTemplate(d, t.x + t.size / 2, t.y + t.size / 2));
  };
  const placeArea = () => {
    const L = live.current;
    const pa = L.pendingArea;
    if (!pa || !L.state) return;
    const caster = pa.originTokenId ? L.state.tokens[pa.originTokenId] : undefined;
    const needsPoint = (pa.shape === 'cone' || pa.shape === 'line') && !(caster && caster.sceneId === L.scene?.id);
    if (needsPoint && !areaOrigin.current && hoverWorld.current) {
      areaOrigin.current = { x: hoverWorld.current.x / CELL, y: hoverWorld.current.y / CELL };
      dirty.current = true;
      return;
    }
    const d = areaDraft();
    if (!d) return;
    dispatch({ type: 'template.create', template: { ...d, color: accentColor() } });
    const hits = tokensInArea(d);
    if (hits.length) dispatch({ type: 'chat', text: `${pa.label}: nell’area ${hits.map((t) => t.name).join(', ')}` });
    // those inside roll their saves; the damage lands by itself
    if (hits.length && pa.save) dispatch({ type: 'save.group', casterId: caster?.id ?? null, tokenIds: hits.map((t) => t.id), label: pa.label, ...pa.save });
    setPendingArea(null);
    areaOrigin.current = null;
  };

  const tokenAt = (wx: number, wy: number) => {
    const L = live.current;
    if (!L.state || !L.scene) return undefined;
    return Object.values(L.state.tokens)
      .filter((t) => t.sceneId === L.scene!.id && L.options.showTokens !== false)
      .sort((a, b) => a.size - b.size)
      .find((t) => {
        // the whole square of the token, not just its disc: corners are easy to grab
        const x0 = t.x * CELL;
        const y0 = t.y * CELL;
        const side = t.size * CELL;
        return wx >= x0 && wy >= y0 && wx <= x0 + side && wy <= y0 + side;
      });
  };

  /** eraser: delete the topmost of your drawings under the pointer */
  const eraseAt = (wx: number, wy: number) => {
    const L = live.current;
    const cam = cameraRef.current;
    if (!L.state || !L.scene || !cam) return;
    const hit = Object.values(L.state.drawings ?? {})
      .reverse()
      .find((d) => d.sceneId === L.scene!.id && (L.isGm || d.authorId === L.me) && !erased.current.has(d.id) && hitDrawing(d, wx, wy, 6 / cam.zoom));
    if (hit) {
      erased.current.add(hit.id);
      dispatch({ type: 'drawing.delete', drawingId: hit.id });
    }
  };

  const wallAt = (wx: number, wy: number, doorsOnly: boolean) => {
    const L = live.current;
    const cam = cameraRef.current;
    if (!L.state || !L.scene || !cam) return undefined;
    let best: Wall | undefined;
    let bestD = 10 / cam.zoom;
    for (const w of Object.values(L.state.walls ?? {})) {
      if (w.sceneId !== L.scene.id || w.auto || (doorsOnly && w.kind !== 'door')) continue;
      const d = distToSegment(wx, wy, w.x1 * CELL, w.y1 * CELL, w.x2 * CELL, w.y2 * CELL);
      if (d < bestD) [best, bestD] = [w, d];
    }
    return best;
  };
  const propAt = (wx: number, wy: number) => {
    const L = live.current;
    if (!L.state || !L.scene) return undefined;
    return Object.values(L.state.props ?? {})
      .reverse()
      .find((p) => p.sceneId === L.scene!.id && hitProp(p, wx / CELL, wy / CELL));
  };
  /** closes the wall chain being drawn */
  const endWalls = () => {
    if (gesture.current.kind === 'wall') {
      gesture.current = { kind: 'none' };
      dirty.current = true;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!cameraRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    const L = live.current;
    if (e.button === 2 && gesture.current.kind === 'wall') {
      endWalls();
      return;
    }
    if (e.button === 1 || e.button === 2) {
      gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: cameraRef.current.x, cy: cameraRef.current.y };
      return;
    }
    if (L.pendingArea) {
      hoverWorld.current = w;
      placeArea();
      return;
    }
    if (L.tool === 'ping' || e.altKey) {
      dispatch({ type: 'ping', x: w.x / CELL, y: w.y / CELL });
      return;
    }
    if (L.tool === 'measure') {
      gesture.current = { kind: 'measure', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
      return;
    }
    if (L.tool === 'fog' && L.isGm) {
      gesture.current = { kind: 'fog', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
      return;
    }
    if (L.tool === 'walls' && L.isGm) {
      if (L.options.wallErase) {
        const hit = wallAt(w.x, w.y, false);
        if (hit) dispatch({ type: 'wall.delete', wallId: hit.id });
        return;
      }
      const pt = { x: snapHalf(w.x / CELL), y: snapHalf(w.y / CELL) };
      if (L.options.wallMode === 'edge') {
        const edge = nearestEdge(w.x / CELL, w.y / CELL);
        dispatch({ type: 'wall.create', sceneId: L.scene?.id, walls: [{ ...edge, kind: L.options.wallKind, open: L.options.doorState === 'open', locked: L.options.doorState === 'locked' }] });
        return;
      }
      if (L.options.wallMode === 'rect') {
        gesture.current = { kind: 'room', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
        return;
      }
      const g = gesture.current;
      if (g.kind === 'wall') {
        const last = g.points[g.points.length - 1]!;
        if (last.x === pt.x && last.y === pt.y) {
          endWalls(); // clicking the last point again ends the chain
          return;
        }
        dispatch({ type: 'wall.create', sceneId: L.scene?.id, walls: [{ x1: last.x, y1: last.y, x2: pt.x, y2: pt.y, kind: L.options.wallKind, open: L.options.doorState === 'open', locked: L.options.doorState === 'locked' }] });
        g.points.push(pt);
      } else {
        gesture.current = { kind: 'wall', points: [pt], tx: w.x, ty: w.y };
      }
      dirty.current = true;
      return;
    }
    if (L.tool === 'copy' && L.isGm && L.scene) {
      if (L.options.pieceMode === 'paste' && L.clipboard && L.state) {
        const at = pieceAt(L.clipboard, w.x, w.y);
        const actions = pasteActions(L.state, L.scene.id, L.clipboard, at.x, at.y);
        if (actions.length) dispatch({ type: 'batch', actions });
      } else gesture.current = { kind: 'copyRect', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
      dirty.current = true;
      return;
    }
    if (L.tool === 'terrain' && L.isGm && L.scene) {
      const { widthCells: sw, heightCells: sh } = L.scene;
      const base = L.scene.terrain ?? emptyTerrain(sw, sh);
      const cx = w.x / CELL;
      const cy = w.y / CELL;
      if (cx < 0 || cy < 0 || cx >= sw || cy >= sh) return;
      if (L.options.terrainMode === 'pick') {
        onPickTerrain?.(base[Math.floor(cy) * sw + Math.floor(cx)] ?? EMPTY_TERRAIN);
        return;
      }
      if (L.options.terrainMode === 'fill') {
        const cells = floodCells(base, sw, sh, Math.floor(cx), Math.floor(cy));
        const next = paintCells(base, cells, L.options.terrain);
        if (next !== base) dispatch({ type: 'terrain.set', sceneId: L.scene.id, terrain: next });
        return;
      }
      if (L.options.terrainMode !== 'brush') {
        gesture.current = { kind: 'paintShape', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
      } else {
        gesture.current = { kind: 'paint', terrain: paintCells(base, brushCells(sw, sh, cx, cy, L.options.brushSize), L.options.terrain), lx: cx, ly: cy };
      }
      dirty.current = true;
      return;
    }
    if ((L.tool === 'props' || L.tool === 'light') && L.isGm && L.scene) {
      const kind = propKind(L.tool === 'light' ? 'light' : L.options.propKind);
      if (!kind) return;
      const light =
        L.tool === 'light' ? presetLight(L.scene, L.options.lightKind) : kind.light ? { bright: metresToCells(L.scene, kind.light.bright), dim: metresToCells(L.scene, kind.light.dim), color: kind.light.color } : null;
      dispatch({
        type: 'prop.create',
        sceneId: L.scene.id,
        prop: {
          kind: kind.id,
          x: placeAxis(w.x / CELL, kind.w, snapNow(L)),
          y: placeAxis(w.y / CELL, kind.h, snapNow(L)),
          w: kind.w,
          h: kind.h,
          rotation: L.tool === 'props' ? L.options.propRotation : 0,
          light,
          blocksVision: !!kind.blocksVision,
          hidden: !!kind.hiddenByDefault,
        },
      });
      return;
    }
    if (L.tool === 'draw' && L.options.drawText && !L.options.erase) {
      // the rest of the click would take the focus away from the text field
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      setTextDraft({ x: w.x / CELL, y: w.y / CELL, sx: e.clientX - rect.left, sy: e.clientY - rect.top, value: '' });
      return;
    }
    if (L.tool === 'draw') {
      if (L.options.erase) {
        gesture.current = { kind: 'erase' };
        eraseAt(w.x, w.y);
      } else gesture.current = { kind: 'draw', points: [w.x, w.y] };
      return;
    }
    if (L.tool === 'template') {
      // snap the origin to cell corners or centres, like on a real grid
      const sx = Math.round((w.x / CELL) * 2) / 2;
      const sy = Math.round((w.y / CELL) * 2) / 2;
      gesture.current = { kind: 'template', fx: sx * CELL, fy: sy * CELL, tx: w.x, ty: w.y };
      return;
    }
    const t = tokenAt(w.x, w.y);
    setSelectedTemplate(null);
    const prop0 = !t && L.isGm ? propAt(w.x, w.y) : undefined;
    // Ctrl (Cmd): mark a token as a target of attacks
    if ((e.ctrlKey || e.metaKey) && t && L.tool === 'select') {
      toggleTarget(t.id);
      return;
    }
    // Shift: add to (or take out of) a group, or draw a box around one
    if (e.shiftKey && L.tool === 'select') {
      if (t && canControl(t, L.me, L.isGm)) toggleInGroup('tokens', t.id);
      else if (prop0) toggleInGroup('props', prop0.id);
      else gesture.current = { kind: 'box', fx: w.x, fy: w.y, tx: w.x, ty: w.y };
      return;
    }
    // a member of the group drags the whole group
    const inGroup = (t && L.group.tokens.includes(t.id)) || (prop0 && L.group.props.includes(prop0.id));
    if (inGroup) {
      const a = t ? { x: t.x, y: t.y, w: t.size, h: t.size } : { x: prop0!.x, y: prop0!.y, w: prop0!.w, h: prop0!.h };
      gesture.current = { kind: 'group', anchor: a, ox: w.x - a.x * CELL, oy: w.y - a.y * CELL, wx: w.x, wy: w.y, moved: false };
      return;
    }
    if (L.group.tokens.length || L.group.props.length) setGroup({ tokens: [], props: [] });
    if (t) {
      select(t.id);
      if (canControl(t, L.me, L.isGm)) {
        gesture.current = { kind: 'drag', tokenId: t.id, ox: w.x - t.x * CELL, oy: w.y - t.y * CELL, wx: w.x, wy: w.y, moved: false };
      }
      return;
    }
    select(null);
    // doors open and close with a click (players need a token nearby: the host checks)
    const door = wallAt(w.x, w.y, true);
    if (door) {
      if (L.isGm) {
        // the GM picks the door (open, lock…) and double-clicks to open or close it
        if (e.detail >= 2) dispatch({ type: 'wall.update', wallId: door.id, patch: { open: !door.open } });
        selectWall(door.id);
      } else dispatch({ type: 'wall.update', wallId: door.id, patch: { open: !door.open } });
      return;
    }
    selectWall(null);
    if (L.isGm) {
      const prop = propAt(w.x, w.y);
      if (prop) {
        selectProp(prop.id);
        gesture.current = { kind: 'prop', propId: prop.id, ox: w.x - prop.x * CELL, oy: w.y - prop.y * CELL, wx: w.x, wy: w.y, moved: false };
        return;
      }
    }
    selectProp(null);
    const ctx = canvasRef.current?.getContext('2d');
    const tpl = ctx && Object.values(L.state?.templates ?? {}).reverse().find((x) => x.sceneId === L.scene?.id && hitTemplate(ctx, x, w.x, w.y));
    if (tpl && (L.isGm || tpl.authorId === L.me)) {
      setSelectedTemplate(tpl.id);
      return;
    }
    gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: cameraRef.current.x, cy: cameraRef.current.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    const cam = cameraRef.current;
    if (!cam) return;
    const w = toWorld(e.clientX, e.clientY);
    altDown.current = e.altKey;
    const Lm = live.current;
    if (Lm.tool === 'props' || Lm.tool === 'light' || Lm.tool === 'terrain' || Lm.tool === 'walls' || Lm.tool === 'copy' || Lm.pendingArea) {
      hoverWorld.current = w;
      dirty.current = true;
    }
    if (g.kind === 'paint' && Lm.scene) {
      // a stroke: brush dabs every half cell from the last point, so fast moves leave no gaps
      const cx = w.x / CELL;
      const cy = w.y / CELL;
      const steps = Math.max(1, Math.ceil(Math.hypot(cx - g.lx, cy - g.ly) * 2));
      const cells: number[] = [];
      for (let i = 1; i <= steps; i++) cells.push(...brushCells(Lm.scene.widthCells, Lm.scene.heightCells, g.lx + ((cx - g.lx) * i) / steps, g.ly + ((cy - g.ly) * i) / steps, Lm.options.brushSize));
      g.terrain = paintCells(g.terrain, cells, Lm.options.terrain);
      g.lx = cx;
      g.ly = cy;
      dirty.current = true;
      return;
    }
    if (g.kind === 'copyRect') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
      return;
    }
    if (g.kind === 'paintShape') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
      return;
    }
    if (g.kind === 'pan') {
      cam.x = g.cx - (e.clientX - g.sx) / cam.zoom;
      cam.y = g.cy - (e.clientY - g.sy) / cam.zoom;
      dirty.current = true;
    } else if (g.kind === 'drag') {
      g.wx = w.x;
      g.wy = w.y;
      g.moved = true;
      dirty.current = true;
    } else if (g.kind === 'prop' || g.kind === 'group') {
      g.wx = w.x;
      g.wy = w.y;
      g.moved = true;
      dirty.current = true;
    } else if (g.kind === 'box') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
    } else if (g.kind === 'wall' || g.kind === 'room') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
    } else if (g.kind === 'draw') {
      const lx = g.points[g.points.length - 2]!;
      const ly = g.points[g.points.length - 1]!;
      // skip points closer than a few screen pixels: smaller strokes, same look
      if (Math.hypot(w.x - lx, w.y - ly) * cam.zoom >= 3) {
        g.points.push(w.x, w.y);
        dirty.current = true;
      }
    } else if (g.kind === 'erase') {
      eraseAt(w.x, w.y);
    } else if (g.kind === 'measure' || g.kind === 'fog' || g.kind === 'template') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
    } else {
      const L = live.current;
      const wallHover = L.tool === 'walls' && L.options.wallErase ? wallAt(w.x, w.y, false) : L.tool === 'select' ? wallAt(w.x, w.y, true) : undefined;
      if ((wallHover?.id ?? null) !== hoverWall.current) {
        hoverWall.current = wallHover?.id ?? null;
        dirty.current = true;
      }
      const t = tokenAt(w.x, w.y);
      const id = t?.id ?? null;
      if (id !== hover.current) {
        hover.current = id;
        dirty.current = true;
        setCursor(t && canControl(t, live.current.me, live.current.isGm) ? 'grab' : 'default');
      }
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (g.kind === 'drag' && g.moved) {
      const t = live.current.state?.tokens[g.tokenId];
      if (t) dispatch({ type: 'token.move', tokenId: g.tokenId, ...tokenDropAt(g, t) });
    }
    const L = live.current;
    if (g.kind === 'fog' && L.scene) {
      const x0 = Math.floor(Math.min(g.fx, g.tx) / CELL);
      const y0 = Math.floor(Math.min(g.fy, g.ty) / CELL);
      const x1 = Math.floor(Math.max(g.fx, g.tx) / CELL) + 1;
      const y1 = Math.floor(Math.max(g.fy, g.ty) / CELL) + 1;
      if (!L.scene.fog?.enabled) dispatch({ type: 'fog.enable', sceneId: L.scene.id, enabled: true });
      dispatch({ type: 'fog.paint', sceneId: L.scene.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0, reveal: L.options.fogReveal });
    }
    if (g.kind === 'group' && g.moved && L.state) {
      const { dx, dy } = groupDelta(g);
      const r = (v: number) => Math.round(v * 100) / 100;
      const actions: GameAction[] = [];
      for (const id of L.group.tokens) {
        const t = L.state.tokens[id];
        if (t && canControl(t, L.me, L.isGm)) actions.push({ type: 'token.move', tokenId: id, x: r(t.x + dx), y: r(t.y + dy) });
      }
      if (L.isGm)
        for (const id of L.group.props) {
          const p = L.state.props?.[id];
          if (p) actions.push({ type: 'prop.update', propId: id, patch: { x: r(p.x + dx), y: r(p.y + dy) } });
        }
      if (actions.length && (dx || dy)) dispatch({ type: 'batch', actions });
    }
    if (g.kind === 'box' && L.state && L.scene) {
      const x0 = Math.min(g.fx, g.tx) / CELL;
      const x1 = Math.max(g.fx, g.tx) / CELL;
      const y0 = Math.min(g.fy, g.ty) / CELL;
      const y1 = Math.max(g.fy, g.ty) / CELL;
      const inside = (cx: number, cy: number) => cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      const tokens = Object.values(L.state.tokens)
        .filter((t) => t.sceneId === L.scene!.id && canControl(t, L.me, L.isGm) && inside(t.x + t.size / 2, t.y + t.size / 2))
        .map((t) => t.id);
      const props = L.isGm
        ? Object.values(L.state.props ?? {})
            .filter((p) => p.sceneId === L.scene!.id && inside(p.x + p.w / 2, p.y + p.h / 2))
            .map((p) => p.id)
        : [];
      setGroup({ tokens, props });
      dirty.current = true;
    }
    if (g.kind === 'prop' && g.moved) {
      const p = L.state?.props?.[g.propId];
      if (p) dispatch({ type: 'prop.update', propId: g.propId, patch: propDropAt(g, p) });
    }
    if (g.kind === 'room') {
      const x0 = snapHalf(Math.min(g.fx, g.tx) / CELL);
      const y0 = snapHalf(Math.min(g.fy, g.ty) / CELL);
      const x1 = snapHalf(Math.max(g.fx, g.tx) / CELL);
      const y1 = snapHalf(Math.max(g.fy, g.ty) / CELL);
      if (x1 > x0 && y1 > y0) {
        const k = L.options.wallKind;
        dispatch({
          type: 'wall.create',
          sceneId: L.scene?.id,
          walls: [
            { x1: x0, y1: y0, x2: x1, y2: y0, kind: k },
            { x1, y1: y0, x2: x1, y2: y1, kind: k },
            { x1: x1, y1, x2: x0, y2: y1, kind: k },
            { x1: x0, y1: y1, x2: x0, y2: y0, kind: k },
          ],
        });
      }
    }
    if (g.kind === 'paint' && L.scene && g.terrain !== (L.scene.terrain ?? emptyTerrain(L.scene.widthCells, L.scene.heightCells))) {
      dispatch({ type: 'terrain.set', sceneId: L.scene.id, terrain: g.terrain });
    }
    if (g.kind === 'copyRect' && L.scene && L.state) {
      const piece = copyPiece(L.state, L.scene.id, Math.floor(g.fx / CELL), Math.floor(g.fy / CELL), Math.floor(g.tx / CELL), Math.floor(g.ty / CELL));
      if (piece) {
        setClipboard(piece);
        onCopied?.();
      }
    }
    if (g.kind === 'paintShape' && L.scene) {
      const { widthCells: sw, heightCells: sh } = L.scene;
      const base = L.scene.terrain ?? emptyTerrain(sw, sh);
      const cells = shapeCells(L.options.terrainMode, sw, sh, { x: g.fx / CELL, y: g.fy / CELL }, { x: g.tx / CELL, y: g.ty / CELL }, L.options.brushSize);
      const next = paintCells(base, cells, L.options.terrain);
      if (next !== base) dispatch({ type: 'terrain.set', sceneId: L.scene.id, terrain: next });
    }
    if (g.kind === 'wall') return; // the chain continues with the next click
    if (g.kind === 'draw') {
      const pts = g.points.length === 2 ? [...g.points, g.points[0]! + 0.5, g.points[1]! + 0.5] : g.points;
      dispatch({ type: 'drawing.create', sceneId: L.scene?.id, points: pts.slice(0, 4000).map((v) => v / CELL), color: drawColor(L), width: L.options.drawWidth });
    }
    if (g.kind === 'erase') erased.current.clear();
    if (g.kind === 'template') {
      const size = Math.hypot(g.tx - g.fx, g.ty - g.fy) / CELL;
      if (size >= 0.5) {
        dispatch({
          type: 'template.create',
          template: { shape: L.options.shape, x: g.fx / CELL, y: g.fy / CELL, size: Math.round(size * 2) / 2, angle: Math.atan2(g.ty - g.fy, g.tx - g.fx), color: accentColor() },
        });
      }
    }
    gesture.current = { kind: 'none' };
    dirty.current = true;
  };

  const onWheel = (e: React.WheelEvent) => {
    const cam = cameraRef.current;
    if (!cam) return;
    const before = toWorld(e.clientX, e.clientY);
    cam.zoom = Math.min(4, Math.max(0.15, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
    const after = toWorld(e.clientX, e.clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    dirty.current = true;
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/') || !live.current.isGm || !scene) return;
    const w = toWorld(e.clientX, e.clientY);
    const t = tokenAt(w.x, w.y);
    const dataUrl = await readImage(file, t ? 512 : 4096);
    dispatch({ type: 'asset.add', dataUrl, attachTo: t ? { tokenId: t.id } : { sceneId: scene.id } });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // typing anywhere (fields, rich text) never reaches the map
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      const L = live.current;
      if (e.key === 'Escape' && L.pendingArea) {
        setPendingArea(null);
        areaOrigin.current = null;
        return;
      }
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (gesture.current.kind === 'wall') {
          gesture.current = { kind: 'none' };
          dirty.current = true;
          return;
        }
        if (e.key === 'Enter') return;
        clearTargets();
        setGroup({ tokens: [], props: [] });
        select(null);
        selectProp(null);
        selectWall(null);
        setSelectedTemplate(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (L.group.tokens.length || L.group.props.length) && L.state) {
        deleteGroup();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedWallId && L.isGm) {
        dispatch({ type: 'wall.delete', wallId: L.selectedWallId });
        selectWall(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedPropId && L.isGm) {
        dispatch({ type: 'prop.delete', propId: L.selectedPropId });
        selectProp(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedTemplate) {
        dispatch({ type: 'template.delete', templateId: L.selectedTemplate });
        setSelectedTemplate(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedTokenId && L.state) {
        const t = L.state.tokens[L.selectedTokenId];
        if (t && canControl(t, L.me, L.isGm)) {
          dispatch({ type: 'token.delete', tokenId: t.id });
          select(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, select, selectProp, selectWall, setGroup]);

  const toolCursor =
    tool === 'measure' || tool === 'template' || tool === 'fog' || tool === 'draw' || tool === 'walls' || tool === 'props' || tool === 'light' || tool === 'terrain' || tool === 'copy' || pendingArea
      ? 'crosshair'
      : tool === 'ping'
        ? 'cell'
        : hoverWall.current
          ? 'pointer'
          : cursor;

  return (
    <div ref={wrapRef} className="board" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <canvas
        ref={canvasRef}
        style={{ cursor: gesture.current.kind === 'pan' ? 'grabbing' : toolCursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          hoverWorld.current = null;
          dirty.current = true;
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {selectedTemplate && <div className="board-hint glass">Area selezionata · Canc per eliminarla</div>}
      {textDraft && (
        <input
          className="input board-text-input"
          style={{ left: textDraft.sx, top: textDraft.sy }}
          ref={(el) => {
            if (el && document.activeElement !== el) requestAnimationFrame(() => el.focus());
          }}
          placeholder="Scrivi e premi Invio"
          value={textDraft.value}
          onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commitText();
            if (e.key === 'Escape') setTextDraft(null);
          }}
          onBlur={commitText}
          aria-label="Testo sulla mappa"
        />
      )}
    </div>
  );
}

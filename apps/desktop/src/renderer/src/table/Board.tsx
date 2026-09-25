import { blockingSegments, lineOfSight, lightSources, propCorners, sightFor, type AreaTemplate, type Drawing, type Prop, type Scene, type TemplateShape, type Token, type Wall, type WallKind } from '@thevtt/shared';
import { exploredTexture, updateExplored } from './explored';
import { conditionImage, CONDITION_COLORS } from './conditionIcons';
import { drawLighting } from './lighting';
import { animatedProp, drawProp, metresToCells, propKind } from './props';
import { useEffect, useRef, useState } from 'react';
import { readImage } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';

export const CELL = 70;
export type Tool = 'select' | 'measure' | 'ping' | 'fog' | 'template' | 'draw' | 'walls' | 'props';

export interface ToolOptions {
  fogReveal: boolean;
  shape: TemplateShape;
  /** drawing colour; empty = the player's own colour */
  drawColor: string;
  /** stroke width in cells */
  drawWidth: number;
  erase: boolean;
  wallKind: WallKind;
  /** chain of segments, or a rectangular room by dragging */
  wallMode: 'line' | 'rect';
  wallErase: boolean;
  propKind: string;
  /** GM: see the darkness as players do */
  lightPreview: boolean;
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
function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], zoom: number, which: 'all' | 'doors', hovered: string | null) {
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
      ctx.strokeStyle = WALL_COLORS.door;
      if (w.open) ctx.setLineDash([6 / zoom, 5 / zoom]);
      ctx.stroke();
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
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (distToSegment(wx, wy, p[i]! * CELL, p[i + 1]! * CELL, p[i + 2]! * CELL, p[i + 3]! * CELL) <= (d.width * CELL) / 2 + slack) return true;
  }
  return false;
}

/** Half-angle of a 2024 cone: its width at the end equals its length. */
const CONE_HALF = Math.atan(0.5);

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
  | { kind: 'prop'; propId: string; ox: number; oy: number; wx: number; wy: number; moved: boolean };

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

export function Board({ tool, options, cameraRef }: { tool: Tool; options: ToolOptions; cameraRef: React.RefObject<Camera | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture>({ kind: 'none' });
  const images = useRef(new Map<string, HTMLImageElement>());
  const hover = useRef<string | null>(null);
  const dirty = useRef(true);
  const fogCache = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [cursor, setCursor] = useState('default');
  const erased = useRef(new Set<string>());

  const me = useApp((s) => s.user?.id ?? '');
  const { state, assets, pings, role, selectedTokenId, selectedPropId, dispatch, select, selectProp } = useTable();
  const board = useSettings((s) => s.board);
  const isGm = role === 'gm';
  const scene = state ? state.scenes[state.activeSceneId] : undefined;

  // keep latest values available to the render loop and handlers
  const live = useRef({ state, assets, pings, scene, board, selectedTokenId, selectedPropId, isGm, me, tool, options, selectedTemplate });
  live.current = { state, assets, pings, scene, board, selectedTokenId, selectedPropId, isGm, me, tool, options, selectedTemplate };
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

      // scenery, under everything else
      const tnow = performance.now() / 1000;
      for (const p of Object.values(L.state.props ?? {})) {
        if (p.sceneId !== L.scene.id) continue;
        const pg = gesture.current;
        const shown = pg.kind === 'prop' && pg.propId === p.id ? { ...p, x: snapHalf((pg.wx - pg.ox) / CELL), y: snapHalf((pg.wy - pg.oy) / CELL) } : p;
        drawProp(ctx, shown, CELL, image(p.image), tnow, L.isGm);
        if (p.id === L.selectedPropId) {
          const c = propCorners(shown);
          ctx.beginPath();
          c.forEach((q, i) => (i ? ctx.lineTo(q.x * CELL, q.y * CELL) : ctx.moveTo(q.x * CELL, q.y * CELL)));
          ctx.closePath();
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          haloStroke(ctx, accentColor(), 2 / cam.zoom, cam.zoom);
          ctx.setLineDash([]);
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
        ctx.save();
        strokeLine(d.points.map((v) => v * CELL), d.color, d.width * CELL);
        ctx.restore();
      }
      if (g0.kind === 'draw') {
        ctx.save();
        strokeLine(g0.points, drawColor(L), L.options.drawWidth * CELL);
        ctx.restore();
      }

      const ini = L.state.initiative;
      const activeTokenId = ini.round > 0 ? ini.entries[ini.turn]?.tokenId : null;
      const g = gesture.current;
      const tokens = Object.values(L.state.tokens)
        .filter((t) => t.sceneId === L.scene!.id)
        .sort((a, b) => b.size - a.size);

      for (const t of tokens) {
        let px = t.x * CELL;
        let py = t.y * CELL;
        if (g.kind === 'drag' && g.tokenId === t.id) {
          px = g.wx - g.ox;
          py = g.wy - g.oy;
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

        ctx.lineWidth = t.id === L.selectedTokenId ? 4 : 2.5;
        ctx.strokeStyle = t.id === L.selectedTokenId ? acc : 'rgba(0,0,0,0.5)';
        if (t.hidden) ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

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
          const nx = Math.round((g.wx - g.ox) / CELL);
          const ny = Math.round((g.wy - g.oy) / CELL);
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
          const dist = Math.round(cells * L.scene.cellDistance * 10) / 10;
          const label = blocked ? 'C’è un muro' : `${String(dist).replace('.', ',')} ${L.scene.unit ?? 'ft'}`;
          ctx.font = `700 ${14 / cam.zoom}px system-ui, sans-serif`;
          const w = ctx.measureText(label).width + 14 / cam.zoom;
          ctx.fillStyle = blocked ? 'rgba(120,20,24,0.9)' : 'rgba(0,0,0,0.8)';
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
      if (!L.isGm) drawWalls(ctx, walls, cam.zoom, 'doors', hoverWall.current);
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
      if (L.isGm && (L.tool === 'walls' || L.scene.vision || walls.length)) drawWalls(ctx, walls, cam.zoom, L.tool === 'walls' || L.scene.vision ? 'all' : 'doors', hoverWall.current);

      if (g.kind === 'wall' && g.points.length) {
        const last = g.points[g.points.length - 1]!;
        ctx.beginPath();
        g.points.forEach((q, i) => (i ? ctx.lineTo(q.x * CELL, q.y * CELL) : ctx.moveTo(q.x * CELL, q.y * CELL)));
        ctx.moveTo(last.x * CELL, last.y * CELL);
        ctx.lineTo(snapHalf(g.tx / CELL) * CELL, snapHalf(g.ty / CELL) * CELL);
        ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, WALL_COLORS[L.options.wallKind], 3 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
      }
      if (g.kind === 'room') {
        const x0 = snapHalf(Math.min(g.fx, g.tx) / CELL) * CELL;
        const y0 = snapHalf(Math.min(g.fy, g.ty) / CELL) * CELL;
        const x1 = snapHalf(Math.max(g.fx, g.tx) / CELL) * CELL;
        const y1 = snapHalf(Math.max(g.fy, g.ty) / CELL) * CELL;
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.setLineDash([8 / cam.zoom, 5 / cam.zoom]);
        haloStroke(ctx, WALL_COLORS.wall, 3 / cam.zoom, cam.zoom);
        ctx.setLineDash([]);
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

  const tokenAt = (wx: number, wy: number) => {
    const L = live.current;
    if (!L.state || !L.scene) return undefined;
    return Object.values(L.state.tokens)
      .filter((t) => t.sceneId === L.scene!.id)
      .sort((a, b) => a.size - b.size)
      .find((t) => {
        const r = (t.size * CELL) / 2;
        return Math.hypot(wx - (t.x * CELL + r), wy - (t.y * CELL + r)) <= r;
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
      if (w.sceneId !== L.scene.id || (doorsOnly && w.kind !== 'door')) continue;
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
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey && L.tool === 'select')) {
      gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: cameraRef.current.x, cy: cameraRef.current.y };
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
        dispatch({ type: 'wall.create', walls: [{ x1: last.x, y1: last.y, x2: pt.x, y2: pt.y, kind: L.options.wallKind }] });
        g.points.push(pt);
      } else {
        gesture.current = { kind: 'wall', points: [pt], tx: w.x, ty: w.y };
      }
      dirty.current = true;
      return;
    }
    if (L.tool === 'props' && L.isGm && L.scene) {
      const kind = propKind(L.options.propKind);
      if (!kind) return;
      const light = kind.light ? { bright: metresToCells(L.scene, kind.light.bright), dim: metresToCells(L.scene, kind.light.dim), color: kind.light.color } : null;
      dispatch({
        type: 'prop.create',
        prop: { kind: kind.id, x: snapHalf(w.x / CELL - kind.w / 2), y: snapHalf(w.y / CELL - kind.h / 2), w: kind.w, h: kind.h, light, blocksVision: !!kind.blocksVision },
      });
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
      dispatch({ type: 'wall.update', wallId: door.id, patch: { open: !door.open } });
      return;
    }
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
    if (g.kind === 'pan') {
      cam.x = g.cx - (e.clientX - g.sx) / cam.zoom;
      cam.y = g.cy - (e.clientY - g.sy) / cam.zoom;
      dirty.current = true;
    } else if (g.kind === 'drag') {
      g.wx = w.x;
      g.wy = w.y;
      g.moved = true;
      dirty.current = true;
    } else if (g.kind === 'prop') {
      g.wx = w.x;
      g.wy = w.y;
      g.moved = true;
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
      const x = Math.round((g.wx - g.ox) / CELL);
      const y = Math.round((g.wy - g.oy) / CELL);
      dispatch({ type: 'token.move', tokenId: g.tokenId, x, y });
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
    if (g.kind === 'prop' && g.moved) {
      dispatch({ type: 'prop.update', propId: g.propId, patch: { x: snapHalf((g.wx - g.ox) / CELL), y: snapHalf((g.wy - g.oy) / CELL) } });
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
          walls: [
            { x1: x0, y1: y0, x2: x1, y2: y0, kind: k },
            { x1, y1: y0, x2: x1, y2: y1, kind: k },
            { x1: x1, y1, x2: x0, y2: y1, kind: k },
            { x1: x0, y1: y1, x2: x0, y2: y0, kind: k },
          ],
        });
      }
    }
    if (g.kind === 'wall') return; // the chain continues with the next click
    if (g.kind === 'draw') {
      const pts = g.points.length === 2 ? [...g.points, g.points[0]! + 0.5, g.points[1]! + 0.5] : g.points;
      dispatch({ type: 'drawing.create', points: pts.slice(0, 4000).map((v) => v / CELL), color: drawColor(L), width: L.options.drawWidth });
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
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const L = live.current;
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (gesture.current.kind === 'wall') {
          gesture.current = { kind: 'none' };
          dirty.current = true;
          return;
        }
        if (e.key === 'Enter') return;
        select(null);
        selectProp(null);
        setSelectedTemplate(null);
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
  }, [dispatch, select, selectProp]);

  const toolCursor =
    tool === 'measure' || tool === 'template' || tool === 'fog' || tool === 'draw' || tool === 'walls' || tool === 'props'
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
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {selectedTemplate && <div className="board-hint glass">Area selezionata · Canc per eliminarla</div>}
    </div>
  );
}

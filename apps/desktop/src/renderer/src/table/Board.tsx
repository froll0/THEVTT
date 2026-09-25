import type { AreaTemplate, Scene, TemplateShape, Token } from '@thevtt/shared';
import { useEffect, useRef, useState } from 'react';
import { readImage } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';

export const CELL = 70;
export type Tool = 'select' | 'measure' | 'ping' | 'fog' | 'template';

export interface ToolOptions {
  fogReveal: boolean;
  shape: TemplateShape;
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
  | { kind: 'template'; fx: number; fy: number; tx: number; ty: number };

const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c9a227';

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

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

  const me = useApp((s) => s.user?.id ?? '');
  const { state, assets, pings, role, selectedTokenId, dispatch, select } = useTable();
  const board = useSettings((s) => s.board);
  const isGm = role === 'gm';
  const scene = state ? state.scenes[state.activeSceneId] : undefined;

  // keep latest values available to the render loop and handlers
  const live = useRef({ state, assets, pings, scene, board, selectedTokenId, isGm, me, tool, options, selectedTemplate });
  live.current = { state, assets, pings, scene, board, selectedTokenId, isGm, me, tool, options, selectedTemplate };
  dirty.current = true;

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
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c9a227';
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
      const animating = L.pings.some((p) => performance.now() - p.at < 2000);
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
      if (bg) ctx.drawImage(bg, 0, 0, W, H);

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
      for (const t of Object.values(L.state.templates ?? {})) {
        if (t.sceneId !== L.scene.id) continue;
        ctx.save();
        templatePath(ctx, t);
        ctx.fillStyle = hexToRgba(t.color.length === 7 ? t.color : '#c9a227', 0.22);
        ctx.fill();
        ctx.lineWidth = (t.id === L.selectedTemplate ? 3 : 1.5) / cam.zoom;
        ctx.strokeStyle = t.id === L.selectedTemplate ? acc : hexToRgba(t.color.length === 7 ? t.color : '#c9a227', 0.9);
        ctx.stroke();
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
          t.conditions.slice(0, 5).forEach((_, i) => {
            ctx.beginPath();
            ctx.arc(cx + r * 0.75 - i * 11, cy - r * 0.8, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#e5a50a';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
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

      if (g.kind === 'fog') {
        const x0 = Math.floor(Math.min(g.fx, g.tx) / CELL);
        const y0 = Math.floor(Math.min(g.fy, g.ty) / CELL);
        const x1 = Math.floor(Math.max(g.fx, g.tx) / CELL) + 1;
        const y1 = Math.floor(Math.max(g.fy, g.ty) / CELL) + 1;
        ctx.fillStyle = L.options.fogReveal ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.45)';
        ctx.fillRect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2 / cam.zoom;
        ctx.strokeRect(x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (y1 - y0) * CELL);
      }
      if (g.kind === 'template') {
        const size = Math.max(0.5, Math.hypot(g.tx - g.fx, g.ty - g.fy) / CELL);
        const draft = { shape: L.options.shape, x: g.fx / CELL, y: g.fy / CELL, size: Math.round(size * 2) / 2, angle: Math.atan2(g.ty - g.fy, g.tx - g.fx) };
        templatePath(ctx, draft);
        ctx.fillStyle = hexToRgba(acc.length === 7 ? acc : '#c9a227', 0.2);
        ctx.fill();
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2 / cam.zoom;
        ctx.stroke();
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
        ctx.strokeStyle = acc;
        ctx.lineWidth = 3 / cam.zoom;
        ctx.setLineDash([10 / cam.zoom, 6 / cam.zoom]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
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

  const onPointerDown = (e: React.PointerEvent) => {
    if (!cameraRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    const L = live.current;
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
    } else if (g.kind === 'measure' || g.kind === 'fog' || g.kind === 'template') {
      g.tx = w.x;
      g.ty = w.y;
      dirty.current = true;
    } else {
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
      if (e.key === 'Escape') {
        select(null);
        setSelectedTemplate(null);
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
  }, [dispatch, select]);

  const toolCursor = tool === 'measure' || tool === 'template' || tool === 'fog' ? 'crosshair' : tool === 'ping' ? 'cell' : cursor;

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

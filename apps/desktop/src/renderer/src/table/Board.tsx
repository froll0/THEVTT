import type { Token } from '@thevtt/shared';
import { useEffect, useRef, useState } from 'react';
import { readImage } from '../components/ui';
import { useApp } from '../store/app';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';

export const CELL = 70;
export type Tool = 'select' | 'measure' | 'ping';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'drag'; tokenId: string; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  | { kind: 'measure'; fx: number; fy: number; tx: number; ty: number };

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Everyone can see a token's name; HP only its owners and the GM. */
const canControl = (t: Token, me: string, gm: boolean) => gm || t.ownerIds.includes(me);

export function Board({ tool, cameraRef }: { tool: Tool; cameraRef: React.RefObject<Camera | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture>({ kind: 'none' });
  const images = useRef(new Map<string, HTMLImageElement>());
  const hover = useRef<string | null>(null);
  const dirty = useRef(true);
  const [cursor, setCursor] = useState('default');

  const me = useApp((s) => s.user?.id ?? '');
  const { state, assets, pings, role, selectedTokenId, dispatch, select } = useTable();
  const board = useSettings((s) => s.board);
  const isGm = role === 'gm';
  const scene = state ? state.scenes[state.activeSceneId] : undefined;

  // keep latest values available to the render loop and handlers
  const live = useRef({ state, assets, pings, scene, board, selectedTokenId, isGm, me, tool });
  live.current = { state, assets, pings, scene, board, selectedTokenId, isGm, me, tool };
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

      const acc = accent();
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
    const t = tokenAt(w.x, w.y);
    if (t) {
      select(t.id);
      if (canControl(t, L.me, L.isGm)) {
        gesture.current = { kind: 'drag', tokenId: t.id, ox: w.x - t.x * CELL, oy: w.y - t.y * CELL, wx: w.x, wy: w.y, moved: false };
      }
      return;
    }
    select(null);
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
    } else if (g.kind === 'measure') {
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
      if (e.key === 'Escape') select(null);
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

  const toolCursor = tool === 'measure' ? 'crosshair' : tool === 'ping' ? 'cell' : cursor;

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
    </div>
  );
}

import {
  autoRivers,
  autoSymbols,
  autoTowns,
  BIOMES,
  brushHeights,
  decodeField,
  elevation,
  encodeField,
  generateWorld,
  newId,
  paintBiome,
  placeName,
  seededRng,
  SYMBOL_KINDS,
  traceRiver,
  worldSceneCells,
  type HeightBrush,
  type LabelFont,
  type MapPackage,
  type RouteKind,
  type SymbolKind,
  type WorldLabel,
  type WorldLayer,
  type WorldMap,
  type WorldPath,
  type WorldPin,
  type WorldRegion,
  type WorldShape,
  type WorldStyle,
  type WorldSymbol,
} from '@thevtt/shared';
import {
  ArrowLeft,
  Brush,
  Dices,
  Download,
  FileDown,
  Flag,
  Hand,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  Mountain,
  MousePointer2,
  Palette as PaletteIcon,
  Redo2,
  Route as RouteIcon,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Waves,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '../components/Shell';
import { Modal, Section, Switch } from '../components/ui';
import { listMaps, saveMap, type LibraryEntry } from '../lib/mapLibrary';
import { useApp } from '../store/app';
import { download } from '../table/sceneImage';
import { saveWorld, worldFile } from './worldLibrary';
import { drawSymbol, drawWorld, FONTS, groundFor, layoutLabel, PALETTES, renderWorldImage, type GroundCache } from './worldRender';

type Tool = 'select' | 'pan' | 'terrain' | 'biome' | 'river' | 'route' | 'region' | 'symbol' | 'label' | 'pin';

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Brush }[] = [
  { id: 'select', label: 'Seleziona e sposta', key: 'V', icon: MousePointer2 },
  { id: 'pan', label: 'Sposta la vista', key: 'H', icon: Hand },
  { id: 'terrain', label: 'Modella il terreno', key: 'B', icon: Mountain },
  { id: 'biome', label: 'Dipingi i biomi', key: 'P', icon: PaletteIcon },
  { id: 'river', label: 'Fiumi', key: 'R', icon: Waves },
  { id: 'route', label: 'Strade e rotte', key: 'S', icon: RouteIcon },
  { id: 'region', label: 'Regioni e confini', key: 'G', icon: Flag },
  { id: 'symbol', label: 'Simboli', key: 'M', icon: Sparkles },
  { id: 'label', label: 'Scritte', key: 'T', icon: Type },
  { id: 'pin', label: 'Segnaposti con note', key: 'N', icon: MapPin },
];

const HEIGHT_MODES: { id: HeightBrush; label: string }[] = [
  { id: 'raise', label: 'Alza' },
  { id: 'lower', label: 'Abbassa' },
  { id: 'smooth', label: 'Ammorbidisci' },
  { id: 'flatten', label: 'Livella' },
  { id: 'roughen', label: 'Increspa' },
];

const SHAPES: { id: WorldShape; label: string; hint: string }[] = [
  { id: 'continent', label: 'Continente', hint: 'Una grande terra in mezzo al mare' },
  { id: 'pangea', label: 'Supercontinente', hint: 'Quasi tutta terra, mari interni' },
  { id: 'islands', label: 'Isole', hint: 'Alcune isole grandi' },
  { id: 'archipelago', label: 'Arcipelago', hint: 'Tante isole piccole' },
  { id: 'coast', label: 'Costa', hint: 'Terra da un lato, mare dall’altro' },
];

const STYLES: { id: WorldStyle; label: string }[] = [
  { id: 'atlas', label: 'Atlante' },
  { id: 'parchment', label: 'Pergamena' },
  { id: 'ink', label: 'Inchiostro' },
];

const LAYERS: { id: WorldLayer; label: string }[] = [
  { id: 'terrain', label: 'Terreno' },
  { id: 'relief', label: 'Rilievo' },
  { id: 'regions', label: 'Regioni' },
  { id: 'rivers', label: 'Fiumi' },
  { id: 'routes', label: 'Strade' },
  { id: 'symbols', label: 'Simboli' },
  { id: 'labels', label: 'Scritte' },
  { id: 'pins', label: 'Segnaposti' },
  { id: 'grid', label: 'Griglia' },
  { id: 'decor', label: 'Bussola, scala e titolo' },
];

const REGION_COLORS = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d68910', '#16a085', '#7f8c8d', '#b03a75'];
const LABEL_COLORS = ['#2b2620', '#3d2b18', '#1f3b5c', '#7a1f1f', '#ffffff', '#55624a'];
const PIN_COLORS = ['#e05d3c', '#e8b93c', '#3c8de0', '#4caf50', '#9b59b6', '#1d1d1f'];

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

type Selection = { id: string } | null;

interface Options {
  heightMode: HeightBrush;
  radius: number;
  strength: number;
  biome: number;
  riverAuto: boolean;
  riverWidth: number;
  routeKind: RouteKind;
  routeWidth: number;
  regionColor: string;
  symbol: SymbolKind;
  symbolSize: number;
  spray: boolean;
  erase: boolean;
  labelText: string;
  labelFont: LabelFont;
  labelSize: number;
  labelColor: string;
  pinColor: string;
}

const keepIds = (prefix: string) => (s: { id: string }) => !s.id.startsWith(prefix);

/** Keys go to a text field being typed in; sliders and switches don't count. */
export function isTyping(t: EventTarget | null): boolean {
  if (t instanceof HTMLInputElement) return !['range', 'checkbox', 'radio', 'color', 'button', 'file'].includes(t.type);
  return t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);
}

/** Where a point is from a polyline (world px). */
function distToPath(pts: [number, number][], x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

function inPolygon(pts: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

/** The topmost thing under a point. */
function hitTest(w: WorldMap, x: number, y: number, zoom: number): string | null {
  const tol = 8 / zoom;
  const hidden = w.hidden ?? {};
  if (!hidden.pins) for (const p of [...w.pins].reverse()) if (Math.hypot(p.x - x, p.y - 12 / zoom - y) < 14 / zoom) return p.id;
  if (!hidden.decor) {
    if (w.title && Math.abs(w.title.y - y) < w.title.size && Math.abs(w.title.x - x) < w.title.text.length * w.title.size * 0.35 + w.title.size) return 'title';
    if (w.compass && Math.hypot(w.compass.x - x, w.compass.y - y) < w.compass.size / 2) return 'compass';
    if (w.scaleBar && x > w.scaleBar.x - 6 && x < w.scaleBar.x + w.scaleBar.px + 6 && y > w.scaleBar.y - 6 && y < w.scaleBar.y + 24) return 'scale';
  }
  if (!hidden.labels && measureCtx) {
    for (const l of [...w.labels].reverse()) {
      const letters = layoutLabel(measureCtx, l);
      const a = (-l.rotation * Math.PI) / 180;
      const lx = (x - l.x) * Math.cos(a) - (y - l.y) * Math.sin(a);
      const ly = (x - l.x) * Math.sin(a) + (y - l.y) * Math.cos(a);
      if (letters.some((g) => Math.abs(g.x - lx) < l.size * 0.6 && Math.abs(g.y - ly) < l.size * 0.7)) return l.id;
    }
  }
  if (!hidden.symbols) for (const s of [...w.symbols].sort((a, b) => b.y - a.y)) if (Math.abs(s.x - x) < s.size * 0.6 && y < s.y + 3 && y > s.y - s.size) return s.id;
  if (!hidden.routes) for (const r of [...w.routes].reverse()) if (distToPath(r.points, x, y) < Math.max(tol, r.width)) return r.id;
  if (!hidden.rivers) for (const r of [...w.rivers].reverse()) if (distToPath(r.points, x, y) < Math.max(tol, r.width * 1.5)) return r.id;
  if (!hidden.regions) for (const r of [...w.regions].reverse()) if (inPolygon(r.points, x, y)) return r.id;
  return null;
}

function moveItem(w: WorldMap, id: string, dx: number, dy: number): WorldMap {
  const pts = (p: [number, number][]) => p.map(([x, y]) => [x + dx, y + dy] as [number, number]);
  if (id === 'title' && w.title) return { ...w, title: { ...w.title, x: w.title.x + dx, y: w.title.y + dy } };
  if (id === 'compass' && w.compass) return { ...w, compass: { ...w.compass, x: w.compass.x + dx, y: w.compass.y + dy } };
  if (id === 'scale' && w.scaleBar) return { ...w, scaleBar: { ...w.scaleBar, x: w.scaleBar.x + dx, y: w.scaleBar.y + dy } };
  return {
    ...w,
    pins: w.pins.map((p) => (p.id === id ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
    labels: w.labels.map((l) => (l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
    symbols: w.symbols.map((s) => (s.id === id ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
    rivers: w.rivers.map((r) => (r.id === id ? { ...r, points: pts(r.points) } : r)),
    routes: w.routes.map((r) => (r.id === id ? { ...r, points: pts(r.points) } : r)),
    regions: w.regions.map((r) => (r.id === id ? { ...r, points: pts(r.points) } : r)),
  };
}

/** The line (river, road or region border) with this id. */
function pathOf(w: WorldMap, id: string): { id: string; points: [number, number][]; closed: boolean } | null {
  const r = w.rivers.find((x) => x.id === id) ?? w.routes.find((x) => x.id === id);
  if (r) return { id, points: r.points, closed: false };
  const g = w.regions.find((x) => x.id === id);
  return g ? { id, points: g.points, closed: true } : null;
}

function setPathPoints(w: WorldMap, id: string, points: [number, number][]): WorldMap {
  const fix = <T extends { id: string; points: [number, number][] }>(list: T[]) => list.map((x) => (x.id === id ? { ...x, points } : x));
  return { ...w, rivers: fix(w.rivers), routes: fix(w.routes), regions: fix(w.regions) };
}

/** A new point on the stretch of the line nearest to it. */
export function insertPoint(points: [number, number][], p: [number, number], closed: boolean): [number, number][] {
  let best = 0;
  let dist = Infinity;
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const d = distToPath([points[i]!, points[(i + 1) % points.length]!], p[0], p[1]);
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return [...points.slice(0, best + 1), p, ...points.slice(best + 1)];
}

function removeItem(w: WorldMap, id: string): WorldMap {
  if (id === 'title') return { ...w, title: null };
  if (id === 'compass') return { ...w, compass: null };
  if (id === 'scale') return { ...w, scaleBar: null };
  const not = (x: { id: string }) => x.id !== id;
  return { ...w, pins: w.pins.filter(not), labels: w.labels.filter(not), symbols: w.symbols.filter(not), rivers: w.rivers.filter(not), routes: w.routes.filter(not), regions: w.regions.filter(not) };
}

/** The world as a map package for the table: its picture as the scene's background. */
export function worldPackage(w: WorldMap): MapPackage {
  const { widthCells, heightCells, cellPx } = worldSceneCells(w);
  const scale = Math.min(2, 6000 / Math.max(w.width, w.height));
  const picture = renderWorldImage(w, scale, { noGrid: true }).toDataURL('image/jpeg', 0.9);
  const km = w.scaleBar && w.scaleBar.px > 0 && /^(km|chilometri)$/i.test(w.scaleBar.unit) ? (w.scaleBar.distance / w.scaleBar.px) * cellPx : null;
  return {
    format: 'thevtt-map',
    version: 1,
    name: w.name || 'Mondo',
    scene: {
      name: w.name || 'Mondo',
      background: 'world',
      widthCells,
      heightCells,
      cellDistance: km ? Math.round(km * 1000) : 1.5,
      unit: 'm',
      showGrid: w.grid.kind !== 'none',
      grid: w.grid.kind === 'hex' ? 'hex' : 'square',
      bgCellPx: cellPx * scale,
      ambient: 'bright',
    },
    walls: [],
    props: [],
    drawings: [],
    tokens: [],
    assets: { world: picture },
  };
}

export function WorldEditor({ initial, onClose, onOpenMap }: { initial: WorldMap; onClose: () => void; onOpenMap?: (mapId: string) => void }) {
  const toast = useApp((s) => s.toast);
  const [doc, setDocState] = useState(initial);
  const docRef = useRef(doc);
  docRef.current = doc;
  // the ground being shaped lives here between strokes
  const fields = useRef({ heights: decodeField(initial.heights, initial.cols * initial.rows), biomes: decodeField(initial.biomes, initial.cols * initial.rows), version: 0 });
  const ground = useRef<GroundCache | null>(null);
  const past = useRef<WorldMap[]>([]);
  const future = useRef<WorldMap[]>([]);
  const [, bump] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [sel, setSel] = useState<Selection>(null);
  const [panel, setPanel] = useState<'tool' | 'map'>('tool');
  const [drawing, setDrawing] = useState<[number, number][]>([]);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [saved, setSaved] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [generating, setGenerating] = useState(false);
  const [opts, setOpts] = useState<Options>({
    heightMode: 'raise',
    radius: 40,
    strength: 0.5,
    biome: 2,
    riverAuto: true,
    riverWidth: 2.5,
    routeKind: 'road',
    routeWidth: 2.5,
    regionColor: REGION_COLORS[0]!,
    symbol: 'mountain',
    symbolSize: 26,
    spray: false,
    erase: false,
    labelText: '',
    labelFont: 'serif',
    labelSize: 26,
    labelColor: LABEL_COLORS[0]!,
    pinColor: PIN_COLORS[0]!,
  });
  const opt = <K extends keyof Options>(k: K, v: Options[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cam = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const dirty = useRef(true);
  const space = useRef(false);
  const gesture = useRef<{ kind: 'none' | 'pan' | 'paint' | 'move' | 'spray' | 'vertex'; sx: number; sy: number; lx: number; ly: number; moved?: boolean; start?: WorldMap; vertex?: number }>({ kind: 'none', sx: 0, sy: 0, lx: 0, ly: 0 });
  const rng = useMemo(() => seededRng(Date.now() % 100000), []);

  const redraw = () => (dirty.current = true);

  /** a new version of the map; with history, it can be undone */
  const setDoc = useCallback((next: WorldMap, history = true) => {
    if (history) {
      past.current.push(docRef.current);
      if (past.current.length > 60) past.current.shift();
      future.current = [];
    }
    docRef.current = next;
    setDocState(next);
    setSaved('dirty');
    redraw();
  }, []);

  const loadFields = (w: WorldMap) => {
    fields.current = { heights: decodeField(w.heights, w.cols * w.rows), biomes: decodeField(w.biomes, w.cols * w.rows), version: fields.current.version + 1 };
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(docRef.current);
    loadFields(prev);
    setDoc(prev, false);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(docRef.current);
    loadFields(next);
    setDoc(next, false);
  };

  // autosave a moment after the last change
  useEffect(() => {
    if (saved !== 'dirty') return;
    const t = setTimeout(() => {
      setSaved('saving');
      saveWorld(docRef.current)
        .then(() => setSaved((s) => (s === 'saving' ? 'saved' : s)))
        .catch(() => {
          setSaved('dirty');
          toast('Salvataggio del mondo non riuscito', 'error');
        });
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, saved, toast]);

  // fit the map in view at the start
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const zoom = Math.min(r.width / doc.width, r.height / doc.height) * 0.92;
    cam.current = { zoom, x: -(r.width / zoom - doc.width) / 2, y: -(r.height / zoom - doc.height) / 2 };
    redraw();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // drawing loop: only when something changed
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = wrap.getBoundingClientRect();
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        dirty.current = true;
      }
      if (!dirty.current) return;
      dirty.current = false;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-sunken') || '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const c = cam.current;
      ctx.setTransform(c.zoom * dpr, 0, 0, c.zoom * dpr, -c.x * c.zoom * dpr, -c.y * c.zoom * dpr);
      const w = docRef.current;
      ground.current = groundFor(w, ground.current, fields.current);
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w.width, w.height);
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w.width, w.height);
      ctx.clip();
      drawWorld(ctx, w, ground.current, {
        zoom: c.zoom,
        selected: sel?.id ?? null,
        drawing: drawingRef.current.length ? { kind: toolRef.current === 'river' ? 'river' : toolRef.current === 'route' ? 'route' : 'region', points: drawingRef.current, cursor: cursorRef.current } : null,
      });
      ctx.restore();
      // the brush, where it will paint
      const h = hoverRef.current;
      if (h && (toolRef.current === 'terrain' || toolRef.current === 'biome' || (toolRef.current === 'symbol' && (optsRef.current.spray || optsRef.current.erase)))) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5 / c.zoom;
        ctx.setLineDash([4 / c.zoom, 3 / c.zoom]);
        ctx.beginPath();
        ctx.arc(h[0], h[1], optsRef.current.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (h && toolRef.current === 'symbol' && !optsRef.current.spray && !optsRef.current.erase) {
        ctx.globalAlpha = 0.6;
        drawSymbol(ctx, { kind: optsRef.current.symbol, x: h[0], y: h[1], size: optsRef.current.symbolSize }, PALETTES[w.style], w.style);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sel]);

  // the live values the loop and the handlers read
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const drawingRef = useRef(drawing);
  drawingRef.current = drawing;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const hoverRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    redraw();
  }, [tool, opts, drawing, cursor, doc]);

  const toWorld = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    const c = cam.current;
    return [(e.clientX - r.left) / c.zoom + c.x, (e.clientY - r.top) / c.zoom + c.y];
  };

  const finishPath = () => {
    const pts = drawingRef.current;
    const w = docRef.current;
    const o = optsRef.current;
    setDrawing([]);
    setCursor(null);
    if (toolRef.current === 'region') {
      if (pts.length < 3) return;
      const id = newId();
      setDoc({ ...w, regions: [...w.regions, { id, name: placeName(rng, 'region'), color: o.regionColor, points: pts, fill: 0.18, border: 'dashed' }] });
      setSel({ id });
      return;
    }
    if (pts.length < 2) return;
    const id = newId();
    if (toolRef.current === 'river') setDoc({ ...w, rivers: [...w.rivers, { id, points: pts, width: o.riverWidth }] });
    else setDoc({ ...w, routes: [...w.routes, { id, points: pts, width: o.routeWidth, kind: o.routeKind }] });
    setSel({ id });
  };

  const paintAt = (x: number, y: number) => {
    const w = docRef.current;
    const o = optsRef.current;
    const f = fields.current;
    const cx = x / w.res - 0.5;
    const cy = y / w.res - 0.5;
    const r = o.radius / w.res;
    if (toolRef.current === 'terrain') {
      const target = gesture.current.start ? decodeField(gesture.current.start.heights, w.cols * w.rows)[Math.max(0, Math.min(w.rows - 1, Math.round(gesture.current.sy / w.res))) * w.cols + Math.max(0, Math.min(w.cols - 1, Math.round(gesture.current.sx / w.res)))] : 128;
      brushHeights(f.heights, w.cols, w.rows, cx, cy, r, o.heightMode, o.strength, target, w.seed + f.version);
    } else paintBiome(f.biomes, w.cols, w.rows, cx, cy, r, o.biome);
    f.version++;
    redraw();
  };

  const sprayAt = (x: number, y: number) => {
    const w = docRef.current;
    const o = optsRef.current;
    if (o.erase) {
      const before = w.symbols.length;
      const symbols = w.symbols.filter((s) => Math.hypot(s.x - x, s.y - y) > o.radius);
      if (symbols.length !== before) {
        docRef.current = { ...w, symbols };
        setDocState(docRef.current);
        redraw();
      }
      return;
    }
    const add: WorldSymbol[] = [];
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * o.radius;
      const sx = x + Math.cos(a) * d;
      const sy = y + Math.sin(a) * d;
      if (w.symbols.some((s) => Math.hypot(s.x - sx, s.y - sy) < o.symbolSize * 0.45) || add.some((s) => Math.hypot(s.x - sx, s.y - sy) < o.symbolSize * 0.45)) continue;
      add.push({ id: newId(), kind: o.symbol, x: sx, y: sy, size: o.symbolSize * (0.8 + rng() * 0.4), flip: rng() < 0.5 });
    }
    if (add.length) {
      docRef.current = { ...w, symbols: [...w.symbols, ...add] };
      setDocState(docRef.current);
      redraw();
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = toWorld(e);
    const g = gesture.current;
    Object.assign(g, { sx: x, sy: y, lx: e.clientX, ly: e.clientY, moved: false, start: docRef.current });
    if (e.button === 1 || e.button === 2 || space.current || toolRef.current === 'pan') {
      g.kind = 'pan';
      return;
    }
    if (e.button !== 0) return;
    const w = docRef.current;
    const o = optsRef.current;
    switch (toolRef.current) {
      case 'select': {
        // a point of the selected line: drag it, Alt+click takes it away, double click on the line adds one
        const cur = selRef.current ? pathOf(w, selRef.current.id) : null;
        if (cur) {
          const z = cam.current.zoom;
          const vi = cur.points.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 8 / z);
          if (vi >= 0) {
            if (e.altKey) {
              if (cur.points.length > (cur.closed ? 3 : 2)) setDoc(setPathPoints(w, cur.id, cur.points.filter((_, i) => i !== vi)));
              return;
            }
            g.kind = 'vertex';
            g.vertex = vi;
            return;
          }
          if (e.detail >= 2 && distToPath(cur.closed ? [...cur.points, cur.points[0]!] : cur.points, x, y) < 10 / z) {
            setDoc(setPathPoints(w, cur.id, insertPoint(cur.points, [x, y], cur.closed)));
            return;
          }
        }
        const id = hitTest(w, x, y, cam.current.zoom);
        selRef.current = id ? { id } : null;
        setSel(selRef.current);
        g.kind = id ? 'move' : 'pan';
        if (id) setPanel('tool');
        return;
      }
      case 'terrain':
      case 'biome':
        g.kind = 'paint';
        paintAt(x, y);
        return;
      case 'symbol':
        if (o.spray || o.erase) {
          g.kind = 'spray';
          sprayAt(x, y);
          return;
        }
        {
          setDoc({ ...w, symbols: [...w.symbols, { id: newId(), kind: o.symbol, x, y, size: o.symbolSize }] });
        }
        return;
      case 'river':
        if (o.riverAuto) {
          const pts = traceRiver(w, fields.current.heights, x, y);
          if (pts.length < 3) return toast('Da qui l’acqua non scorre: parti più in alto, sulla terra', 'error');
          const id = newId();
          setDoc({ ...w, rivers: [...w.rivers, { id, points: pts, width: o.riverWidth }] });
          setSel({ id });
          return;
        }
        if (e.detail >= 2) return finishPath();
        setDrawing((d) => [...d, [x, y]]);
        return;
      case 'route':
      case 'region':
        if (e.detail >= 2) return finishPath();
        setDrawing((d) => [...d, [x, y]]);
        return;
      case 'label': {
        const id = newId();
        const text = o.labelText.trim() || placeName(rng);
        const label: WorldLabel = { id, text, x, y, size: o.labelSize, color: o.labelColor, font: o.labelFont, rotation: 0, curve: 0, spacing: o.labelSize > 30 ? 0.25 : 0.05, italic: o.labelFont === 'serif' && o.labelSize < 22, caps: o.labelSize > 30 };
        setDoc({ ...w, labels: [...w.labels, label] });
        setSel({ id });
        opt('labelText', '');
        return;
      }
      case 'pin': {
        const id = newId();
        setDoc({ ...w, pins: [...w.pins, { id, x, y, title: 'Nuovo luogo', text: '', color: o.pinColor }] });
        setSel({ id });
        return;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    const [x, y] = toWorld(e);
    hoverRef.current = [x, y];
    if (drawingRef.current.length) setCursor([x, y]);
    redraw();
    if (g.kind === 'none') return;
    const dxs = e.clientX - g.lx;
    const dys = e.clientY - g.ly;
    if (Math.abs(dxs) + Math.abs(dys) > 2) g.moved = true;
    if (g.kind === 'pan') {
      cam.current.x -= dxs / cam.current.zoom;
      cam.current.y -= dys / cam.current.zoom;
    } else if (g.kind === 'vertex' && selRef.current && g.vertex !== undefined) {
      const cur = pathOf(docRef.current, selRef.current.id);
      if (cur) {
        const pts = cur.points.map((p, i) => (i === g.vertex ? ([x, y] as [number, number]) : p));
        docRef.current = setPathPoints(docRef.current, cur.id, pts);
        setDocState(docRef.current);
      }
    } else if (g.kind === 'move' && selRef.current) {
      const z = cam.current.zoom;
      const next = moveItem(docRef.current, selRef.current.id, dxs / z, dys / z);
      docRef.current = next;
      setDocState(next);
    } else if (g.kind === 'paint') {
      // fill the gap between two events
      const [px, py] = toWorld({ clientX: g.lx, clientY: g.ly });
      const steps = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / Math.max(4, optsRef.current.radius / 3)));
      for (let i = 1; i <= steps; i++) paintAt(px + ((x - px) * i) / steps, py + ((y - py) * i) / steps);
    } else if (g.kind === 'spray') sprayAt(x, y);
    g.lx = e.clientX;
    g.ly = e.clientY;
  };

  const onPointerUp = () => {
    const g = gesture.current;
    const start = g.start;
    if (g.kind === 'paint' && start) {
      // the stroke becomes one step to undo
      const f = fields.current;
      past.current.push(start);
      future.current = [];
      const next = { ...docRef.current, heights: encodeField(f.heights), biomes: encodeField(f.biomes) };
      docRef.current = next;
      setDocState(next);
      setSaved('dirty');
    } else if (((g.kind === 'move' || g.kind === 'vertex') && g.moved) || g.kind === 'spray') {
      if (start && start !== docRef.current) {
        past.current.push(start);
        future.current = [];
        setSaved('dirty');
      }
    }
    g.kind = 'none';
    g.start = undefined;
    bump((n) => n + 1);
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const c = cam.current;
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const wx = mx / c.zoom + c.x;
    const wy = my / c.zoom + c.y;
    const zoom = Math.max(0.1, Math.min(8, c.zoom * Math.exp(-e.deltaY * 0.0015)));
    cam.current = { zoom, x: wx - mx / zoom, y: wy - my / zoom };
    redraw();
  };

  // keys: tools, undo, delete, finishing a line
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      if (e.key === ' ' && !typing) {
        space.current = e.type === 'keydown';
        e.preventDefault();
        return;
      }
      if (e.type !== 'keydown' || typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') finishPath();
      if (e.key === 'Escape') {
        if (drawingRef.current.length) {
          setDrawing([]);
          setCursor(null);
        } else setSel(null);
      }
      if (e.key === 'Backspace' && drawingRef.current.length) {
        setDrawing((d) => d.slice(0, -1));
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selRef.current) {
        setDoc(removeItem(docRef.current, selRef.current.id));
        setSel(null);
        return;
      }
      if (e.key === '[' || e.key === ']') setOpts((o) => ({ ...o, radius: Math.max(5, Math.min(300, o.radius * (e.key === ']' ? 1.25 : 0.8))) }));
      const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (t) {
        setTool(t.id);
        setPanel('tool');
        setDrawing([]);
        if (t.id !== 'select') setSel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const selRef = useRef(sel);
  selRef.current = sel;

  const update = (patch: Partial<WorldMap>) => setDoc({ ...docRef.current, ...patch });

  const exportImage = () => {
    const c = renderWorldImage(docRef.current, 2);
    c.toBlob((b) => {
      if (!b) return toast('Immagine troppo grande per questo computer', 'error');
      download(URL.createObjectURL(b), `${docRef.current.name || 'Mondo'}.png`);
    }, 'image/png');
  };

  const toTable = async () => {
    try {
      await saveWorld(docRef.current);
      await saveMap(worldPackage(docRef.current));
      toast('Nella libreria delle mappe: al tavolo la trovi in Scena › Libreria', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Non riuscito', 'error');
    }
  };

  const toolInfo = TOOLS.find((t) => t.id === tool)!;
  // what was just placed (or picked) shows its settings, except while scattering symbols
  const editingSel = !!sel && tool !== 'symbol' && tool !== 'terrain' && tool !== 'biome';
  const status = saved === 'saved' ? 'Salvato' : saved === 'saving' ? 'Salvo…' : 'Da salvare';

  return (
    <div className="shell studio">
      <TopBar>
        <div className="studio-top row">
          <button className="btn ghost sm" onClick={async () => {
            if (saved !== 'saved') await saveWorld(docRef.current).catch(() => undefined);
            onClose();
          }}>
            <ArrowLeft size={14} /> Mappe
          </button>
          <input className="input studio-name" value={doc.name} onChange={(e) => update({ name: e.target.value.slice(0, 80) })} aria-label="Nome del mondo" placeholder="Nome del mondo" />
          <span className="faint tiny">{status}</span>
          <div className="grow" />
          <button className="btn ghost sm icon" onClick={undo} disabled={!past.current.length} title="Annulla (Ctrl+Z)" aria-label="Annulla">
            <Undo2 size={15} />
          </button>
          <button className="btn ghost sm icon" onClick={redo} disabled={!future.current.length} title="Ripeti (Ctrl+Y)" aria-label="Ripeti">
            <Redo2 size={15} />
          </button>
          <button className="btn sm" onClick={() => setGenerating(true)} title="Nuove terre, fiumi, monti e città">
            <Wand2 size={14} /> Genera
          </button>
          <button className="btn ghost sm icon" onClick={exportImage} title="Esporta un’immagine PNG in alta risoluzione" aria-label="Esporta immagine">
            <ImageIcon size={15} />
          </button>
          <button className="btn ghost sm icon" onClick={() => {
            const f = worldFile(docRef.current);
            download(f.href, f.name);
          }} title="Esporta il mondo come file, da passare a un altro master o tenere da parte" aria-label="Esporta file">
            <FileDown size={15} />
          </button>
          <button className="btn primary sm" onClick={() => void toTable()} title="Lo mette nella libreria delle mappe, pronto per una scena al tavolo">
            <Download size={14} /> Usa al tavolo
          </button>
        </div>
      </TopBar>
      <div className="studio-body">
        <div className="studio-rail" role="toolbar" aria-label="Strumenti del mondo">
          {TOOLS.map((t) => (
            <button key={t.id} className={`btn ghost icon ${tool === t.id ? 'active' : ''}`} onClick={() => {
              setTool(t.id);
              setPanel('tool');
              setDrawing([]);
              if (t.id !== 'select') setSel(null);
            }} title={`${t.label} (${t.key})`} aria-label={t.label} aria-pressed={tool === t.id}>
              <t.icon size={17} />
            </button>
          ))}
        </div>
        <div className="studio-canvas" ref={wrapRef} onContextMenu={(e) => e.preventDefault()}>
          <canvas
            ref={canvasRef}
            data-testid="world-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              hoverRef.current = null;
              redraw();
            }}
            onWheel={onWheel}
            style={{ cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
          />
          <div className="studio-hint tiny">
            {toolHint(tool, opts, drawing.length)} · rotella per lo zoom, tasto destro o spazio per spostare la vista
          </div>
        </div>
        <aside className="studio-panel">
          <div className="seg row" style={{ alignSelf: 'stretch' }}>
            <button className={panel === 'tool' ? 'on' : ''} onClick={() => setPanel('tool')}>
              {editingSel ? 'Selezione' : toolInfo.label}
            </button>
            <button className={panel === 'map' ? 'on' : ''} onClick={() => setPanel('map')}>
              Mappa
            </button>
          </div>
          {panel === 'tool' ? (
            editingSel && sel ? (
              <SelectionPanel w={doc} id={sel.id} setDoc={setDoc} onDelete={() => {
                setDoc(removeItem(doc, sel.id));
                setSel(null);
              }} rng={rng} onOpenMap={onOpenMap && (async (mapId) => {
                await saveWorld(docRef.current).catch(() => undefined);
                onOpenMap(mapId);
              })} />
            ) : (
              <ToolPanel tool={tool} opts={opts} opt={opt} drawing={drawing.length} onFinish={finishPath} rng={rng} />
            )
          ) : (
            <MapPanel w={doc} update={update} fields={fields} setDoc={setDoc} rng={rng} />
          )}
        </aside>
      </div>
      {generating && (
        <GenerateDialog
          w={doc}
          onClose={() => setGenerating(false)}
          onGenerate={(next) => {
            loadFields(next);
            setDoc(next);
            setGenerating(false);
            setSel(null);
          }}
        />
      )}
    </div>
  );
}

function toolHint(tool: Tool, o: Options, points: number): string {
  switch (tool) {
    case 'select':
      return 'Clic per scegliere, trascina per spostare, Canc per togliere · sulle linee: trascina i punti, Alt+clic ne toglie uno, doppio clic ne aggiunge';
    case 'pan':
      return 'Trascina per spostare la vista';
    case 'terrain':
      return `${HEIGHT_MODES.find((m) => m.id === o.heightMode)!.label}: trascina sulla mappa · [ ] cambia la misura`;
    case 'biome':
      return 'Trascina per dipingere il bioma · [ ] cambia la misura';
    case 'river':
      return o.riverAuto ? 'Clic dove nasce: l’acqua scende da sola fino al mare' : points ? `${points} punti · doppio clic o Invio per finire, Backspace toglie l’ultimo` : 'Clic per ogni punto del fiume';
    case 'route':
    case 'region':
      return points ? `${points} punti · doppio clic o Invio per finire, Esc annulla` : tool === 'route' ? 'Clic per ogni punto della strada' : 'Clic per ogni vertice del confine';
    case 'symbol':
      return o.erase ? 'Trascina per cancellare i simboli' : o.spray ? 'Trascina per spargere i simboli' : 'Clic per mettere il simbolo';
    case 'label':
      return 'Clic dove va la scritta (senza testo, un nome inventato)';
    case 'pin':
      return 'Clic per un segnaposto, con titolo e note';
  }
}

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="studio-slider">
      <span className="row between small">
        <span>{label}</span>
        <span className="faint">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div className="row wrap" style={{ gap: 4 }} role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} className={`studio-swatch ${value === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: altro colore`} className="studio-color" />
    </div>
  );
}

function ToolPanel({ tool, opts, opt, drawing, onFinish, rng }: { tool: Tool; opts: Options; opt: <K extends keyof Options>(k: K, v: Options[K]) => void; drawing: number; onFinish: () => void; rng: () => number }) {
  const groups = [...new Set(SYMBOL_KINDS.map((s) => s.group))];
  return (
    <div className="col" style={{ gap: 'var(--s3)' }}>
      {(tool === 'terrain' || tool === 'biome' || (tool === 'symbol' && (opts.spray || opts.erase))) && <Slider label="Misura del pennello" value={Math.round(opts.radius)} min={5} max={300} step={1} onChange={(v) => opt('radius', v)} />}
      {tool === 'terrain' && (
        <>
          <div className="row wrap" style={{ gap: 4 }}>
            {HEIGHT_MODES.map((m) => (
              <button key={m.id} className={`chip ${opts.heightMode === m.id ? 'on' : ''}`} onClick={() => opt('heightMode', m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <Slider label="Forza" value={opts.strength} min={0.05} max={1} step={0.05} onChange={(v) => opt('strength', v)} format={(v) => `${Math.round(v * 100)}%`} />
          <span className="faint tiny">Alza fa emergere terre e monti dal mare, Abbassa scava golfi e laghi. Livella porta tutto all’altezza del punto da cui parti.</span>
        </>
      )}
      {tool === 'biome' && (
        <div className="studio-biomes">
          <button className={`chip ${opts.biome === 0 ? 'on' : ''}`} onClick={() => opt('biome', 0)}>
            Automatico
          </button>
          {BIOMES.map((b) => (
            <button key={b.id} className={`chip ${opts.biome === b.id ? 'on' : ''}`} onClick={() => opt('biome', b.id)}>
              <span className="studio-dot" style={{ background: b.atlas }} /> {b.name}
            </button>
          ))}
          <span className="faint tiny">Automatico lascia decidere ad altezza, umidità e latitudine. Sul mare i biomi non si vedono.</span>
        </div>
      )}
      {tool === 'river' && (
        <>
          <label className="row small">
            <Switch on={opts.riverAuto} onChange={(v) => opt('riverAuto', v)} label="Fiume automatico" />
            Segue la discesa fino al mare
          </label>
          <Slider label="Larghezza" value={opts.riverWidth} min={0.5} max={10} step={0.5} onChange={(v) => opt('riverWidth', v)} />
        </>
      )}
      {tool === 'route' && (
        <>
          <div className="row wrap" style={{ gap: 4 }}>
            {(
              [
                ['road', 'Strada'],
                ['trail', 'Sentiero'],
                ['sea', 'Rotta marittima'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={`chip ${opts.routeKind === k ? 'on' : ''}`} onClick={() => opt('routeKind', k)}>
                {l}
              </button>
            ))}
          </div>
          <Slider label="Larghezza" value={opts.routeWidth} min={0.5} max={10} step={0.5} onChange={(v) => opt('routeWidth', v)} />
        </>
      )}
      {tool === 'region' && <Swatches colors={REGION_COLORS} value={opts.regionColor} onChange={(c) => opt('regionColor', c)} label="Colore della regione" />}
      {(tool === 'river' || tool === 'route' || tool === 'region') && drawing > 0 && (
        <button className="btn sm" onClick={onFinish}>
          Finisci ({drawing} punti)
        </button>
      )}
      {tool === 'symbol' && (
        <>
          <div className="row wrap" style={{ gap: 4 }}>
            <button className={`chip ${!opts.spray && !opts.erase ? 'on' : ''}`} onClick={() => { opt('spray', false); opt('erase', false); }}>
              Uno alla volta
            </button>
            <button className={`chip ${opts.spray && !opts.erase ? 'on' : ''}`} onClick={() => { opt('spray', true); opt('erase', false); }}>
              Spargi
            </button>
            <button className={`chip ${opts.erase ? 'on' : ''}`} onClick={() => opt('erase', true)}>
              Cancella
            </button>
          </div>
          <Slider label="Grandezza" value={opts.symbolSize} min={8} max={80} step={1} onChange={(v) => opt('symbolSize', v)} />
          {groups.map((g) => (
            <div key={g} className="col" style={{ gap: 4 }}>
              <b className="tiny muted">{g}</b>
              <div className="studio-symbols">
                {SYMBOL_KINDS.filter((s) => s.group === g).map((s) => (
                  <button key={s.id} className={`studio-symbol ${opts.symbol === s.id ? 'on' : ''}`} onClick={() => { opt('symbol', s.id); opt('erase', false); }} title={s.name} aria-label={s.name}>
                    <SymbolThumb kind={s.id} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {tool === 'label' && (
        <>
          <div className="row" style={{ gap: 4 }}>
            <input className="input grow" value={opts.labelText} onChange={(e) => opt('labelText', e.target.value)} placeholder="Testo (vuoto: un nome inventato)" aria-label="Testo della scritta" />
            <button className="btn ghost sm icon" title="Un nome inventato" aria-label="Nome inventato" onClick={() => opt('labelText', placeName(rng, (['city', 'region', 'sea', 'mountains', 'forest', 'river'] as const)[Math.floor(rng() * 6)]))}>
              <Dices size={14} />
            </button>
          </div>
          <FontPicker value={opts.labelFont} onChange={(f) => opt('labelFont', f)} />
          <Slider label="Grandezza" value={opts.labelSize} min={8} max={120} step={1} onChange={(v) => opt('labelSize', v)} />
          <Swatches colors={LABEL_COLORS} value={opts.labelColor} onChange={(c) => opt('labelColor', c)} label="Colore della scritta" />
        </>
      )}
      {tool === 'pin' && <Swatches colors={PIN_COLORS} value={opts.pinColor} onChange={(c) => opt('pinColor', c)} label="Colore del segnaposto" />}
      {tool === 'select' && <span className="faint small">Clicca su qualcosa della mappa per cambiarlo. Con «Mappa» qui sopra cambi stile, mare, griglia e livelli.</span>}
      {tool === 'pan' && <span className="faint small">Trascina per spostarti. La rotella fa lo zoom con qualsiasi strumento.</span>}
    </div>
  );
}

function FontPicker({ value, onChange }: { value: LabelFont; onChange: (f: LabelFont) => void }) {
  return (
    <div className="row wrap" style={{ gap: 4 }}>
      {(
        [
          ['serif', 'Classico'],
          ['script', 'Calligrafico'],
          ['sans', 'Moderno'],
        ] as const
      ).map(([f, l]) => (
        <button key={f} className={`chip ${value === f ? 'on' : ''}`} style={{ fontFamily: FONTS[f] }} onClick={() => onChange(f)}>
          {l}
        </button>
      ))}
    </div>
  );
}

const thumbs = new Map<string, string>();
function SymbolThumb({ kind }: { kind: SymbolKind }) {
  let url = thumbs.get(kind);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = 44;
    c.height = 44;
    const ctx = c.getContext('2d')!;
    drawSymbol(ctx, { kind, x: 22, y: 36, size: 28 }, PALETTES.atlas, 'atlas');
    url = c.toDataURL();
    thumbs.set(kind, url);
  }
  return <img src={url} alt="" width={36} height={36} />;
}

function SelectionPanel({ w, id, setDoc, onDelete, rng, onOpenMap }: { w: WorldMap; id: string; setDoc: (w: WorldMap) => void; onDelete: () => void; rng: () => number; onOpenMap?: (mapId: string) => void }) {
  const [maps, setMaps] = useState<LibraryEntry[]>([]);
  useEffect(() => void listMaps().then(setMaps), []);
  const label = w.labels.find((l) => l.id === id);
  const sym = w.symbols.find((s) => s.id === id);
  const pin = w.pins.find((p) => p.id === id);
  const region = w.regions.find((r) => r.id === id);
  const river = w.rivers.find((r) => r.id === id);
  const route = w.routes.find((r) => r.id === id);
  const setIn = <T extends { id: string }>(key: 'labels' | 'symbols' | 'pins' | 'regions' | 'rivers' | 'routes', patch: Partial<T>) => setDoc({ ...w, [key]: (w[key] as unknown as T[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const del = (
    <button className="btn ghost sm danger-text" onClick={onDelete}>
      <Trash2 size={13} /> Togli
    </button>
  );
  if (label)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <div className="row" style={{ gap: 4 }}>
          <input className="input grow" value={label.text} onChange={(e) => setIn<WorldLabel>('labels', { text: e.target.value })} aria-label="Testo" />
          <button className="btn ghost sm icon" title="Un nome inventato" aria-label="Nome inventato" onClick={() => setIn<WorldLabel>('labels', { text: placeName(rng) })}>
            <Dices size={14} />
          </button>
        </div>
        <FontPicker value={label.font} onChange={(f) => setIn<WorldLabel>('labels', { font: f })} />
        <Slider label="Grandezza" value={label.size} min={8} max={160} step={1} onChange={(v) => setIn<WorldLabel>('labels', { size: v })} />
        <Slider label="Rotazione" value={label.rotation} min={-180} max={180} step={1} onChange={(v) => setIn<WorldLabel>('labels', { rotation: v })} format={(v) => `${v}°`} />
        <Slider label="Curvatura" value={label.curve} min={-1} max={1} step={0.05} onChange={(v) => setIn<WorldLabel>('labels', { curve: v })} format={(v) => (v === 0 ? 'dritta' : v > 0 ? 'ad arco' : 'a conca')} />
        <Slider label="Spaziatura" value={label.spacing} min={0} max={1.5} step={0.05} onChange={(v) => setIn<WorldLabel>('labels', { spacing: v })} />
        <div className="row" style={{ gap: 12 }}>
          <label className="row small">
            <Switch on={!!label.italic} onChange={(v) => setIn<WorldLabel>('labels', { italic: v })} label="Corsivo" /> Corsivo
          </label>
          <label className="row small">
            <Switch on={!!label.caps} onChange={(v) => setIn<WorldLabel>('labels', { caps: v })} label="Maiuscolo" /> Maiuscolo
          </label>
        </div>
        <Swatches colors={LABEL_COLORS} value={label.color} onChange={(c) => setIn<WorldLabel>('labels', { color: c })} label="Colore" />
        {del}
      </div>
    );
  if (sym)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <b className="small">{SYMBOL_KINDS.find((k) => k.id === sym.kind)?.name}</b>
        <input className="input" value={sym.name ?? ''} onChange={(e) => setIn<WorldSymbol>('symbols', { name: e.target.value || undefined })} placeholder="Nome scritto sotto (facoltativo)" aria-label="Nome del luogo" />
        <select className="select" value={sym.kind} onChange={(e) => setIn<WorldSymbol>('symbols', { kind: e.target.value as SymbolKind })} aria-label="Simbolo">
          {SYMBOL_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <Slider label="Grandezza" value={Math.round(sym.size)} min={6} max={120} step={1} onChange={(v) => setIn<WorldSymbol>('symbols', { size: v })} />
        <label className="row small">
          <Switch on={!!sym.flip} onChange={(v) => setIn<WorldSymbol>('symbols', { flip: v })} label="Specchiato" /> Specchiato
        </label>
        {del}
      </div>
    );
  if (pin)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <input className="input" value={pin.title} onChange={(e) => setIn<WorldPin>('pins', { title: e.target.value })} aria-label="Titolo del segnaposto" />
        <textarea className="input" rows={6} value={pin.text} onChange={(e) => setIn<WorldPin>('pins', { text: e.target.value })} placeholder="Note: chi ci vive, cosa si trova, segreti…" aria-label="Note del segnaposto" />
        <Swatches colors={PIN_COLORS} value={pin.color} onChange={(c) => setIn<WorldPin>('pins', { color: c })} label="Colore" />
        <label className="field">
          <span>Mappa del luogo</span>
          <select className="select" value={pin.mapId ?? ''} onChange={(e) => setIn<WorldPin>('pins', { mapId: e.target.value || undefined })} aria-label="Mappa del luogo">
            <option value="">Nessuna</option>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        {pin.mapId && onOpenMap && maps.some((m) => m.id === pin.mapId) && (
          <button className="btn sm" onClick={() => onOpenMap(pin.mapId!)}>
            <MapIcon size={13} /> Apri la mappa del luogo
          </button>
        )}
        {del}
      </div>
    );
  if (region)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <input className="input" value={region.name} onChange={(e) => setIn<WorldRegion>('regions', { name: e.target.value })} aria-label="Nome della regione" />
        <Swatches colors={REGION_COLORS} value={region.color} onChange={(c) => setIn<WorldRegion>('regions', { color: c })} label="Colore" />
        <Slider label="Riempimento" value={region.fill} min={0} max={0.8} step={0.02} onChange={(v) => setIn<WorldRegion>('regions', { fill: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <div className="row wrap" style={{ gap: 4 }}>
          {(
            [
              ['dashed', 'Tratteggiato'],
              ['solid', 'Continuo'],
              ['none', 'Nessun bordo'],
            ] as const
          ).map(([b, l]) => (
            <button key={b} className={`chip ${region.border === b ? 'on' : ''}`} onClick={() => setIn<WorldRegion>('regions', { border: b })}>
              {l}
            </button>
          ))}
        </div>
        <button
          className="btn ghost sm"
          onClick={() => {
            // the name over the region's middle
            const cx = region.points.reduce((s, p) => s + p[0], 0) / region.points.length;
            const cy = region.points.reduce((s, p) => s + p[1], 0) / region.points.length;
            setDoc({ ...w, labels: [...w.labels, { id: newId(), text: region.name, x: cx, y: cy, size: 30, color: '#3d2b18', font: 'serif', rotation: 0, curve: 0.15, spacing: 0.3, caps: true }] });
          }}
        >
          <Type size={13} /> Scrivi il nome sulla mappa
        </button>
        {del}
      </div>
    );
  if (river || route) {
    const key = river ? 'rivers' : 'routes';
    const p = (river ?? route)!;
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <b className="small">{river ? 'Fiume' : 'Strada'}</b>
        <input className="input" value={p.name ?? ''} onChange={(e) => setIn<WorldPath>(key, { name: e.target.value || undefined })} placeholder="Nome (facoltativo)" aria-label="Nome" />
        {route && (
          <div className="row wrap" style={{ gap: 4 }}>
            {(
              [
                ['road', 'Strada'],
                ['trail', 'Sentiero'],
                ['sea', 'Rotta marittima'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={`chip ${(route.kind ?? 'road') === k ? 'on' : ''}`} onClick={() => setIn<WorldPath>('routes', { kind: k })}>
                {l}
              </button>
            ))}
          </div>
        )}
        <Slider label="Larghezza" value={p.width} min={0.5} max={12} step={0.5} onChange={(v) => setIn<WorldPath>(key, { width: v })} />
        {del}
      </div>
    );
  }
  if (id === 'title' && w.title)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <input className="input" value={w.title.text} onChange={(e) => setDoc({ ...w, title: { ...w.title!, text: e.target.value } })} aria-label="Titolo della mappa" />
        <Slider label="Grandezza" value={w.title.size} min={14} max={120} step={1} onChange={(v) => setDoc({ ...w, title: { ...w.title!, size: v } })} />
        {del}
      </div>
    );
  if (id === 'scale' && w.scaleBar)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <label className="field">
          <span>Distanza</span>
          <input className="input num" type="number" min={1} value={w.scaleBar.distance} onChange={(e) => setDoc({ ...w, scaleBar: { ...w.scaleBar!, distance: Math.max(1, Number(e.target.value) || 1) } })} />
        </label>
        <label className="field">
          <span>Unità</span>
          <input className="input" value={w.scaleBar.unit} onChange={(e) => setDoc({ ...w, scaleBar: { ...w.scaleBar!, unit: e.target.value.slice(0, 20) } })} placeholder="km, leghe, giorni di cammino" />
        </label>
        <Slider label="Lunghezza della barra" value={w.scaleBar.px} min={40} max={600} step={5} onChange={(v) => setDoc({ ...w, scaleBar: { ...w.scaleBar!, px: v } })} format={(v) => `${v} px`} />
        <span className="faint tiny">In chilometri, la scala dà anche la distanza delle caselle quando il mondo va al tavolo.</span>
        {del}
      </div>
    );
  if (id === 'compass' && w.compass)
    return (
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <Slider label="Grandezza" value={w.compass.size} min={40} max={400} step={5} onChange={(v) => setDoc({ ...w, compass: { ...w.compass!, size: v } })} />
        {del}
      </div>
    );
  return <span className="faint small">Niente di selezionato.</span>;
}

function MapPanel({ w, update, fields, setDoc, rng }: { w: WorldMap; update: (p: Partial<WorldMap>) => void; fields: React.MutableRefObject<{ heights: Uint8Array; biomes: Uint8Array; version: number }>; setDoc: (w: WorldMap) => void; rng: () => number }) {
  const land = useMemo(() => {
    const h = fields.current.heights;
    let n = 0;
    for (let i = 0; i < h.length; i++) if (elevation(h[i]!, w.seaLevel) >= 0) n++;
    return n / h.length;
  }, [w.seaLevel, w.heights]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (l: WorldLayer) => update({ hidden: { ...(w.hidden ?? {}), [l]: !w.hidden?.[l] } });
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Stile">
        <div className="seg row">
          {STYLES.map((s) => (
            <button key={s.id} className={w.style === s.id ? 'on' : ''} onClick={() => update({ style: s.id })}>
              {s.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Mare">
        <Slider label="Livello del mare" value={w.seaLevel} min={0.2} max={0.8} step={0.01} onChange={(v) => update({ seaLevel: v })} format={() => `${Math.round(land * 100)}% di terra`} />
      </Section>
      <Section title="Livelli">
        <div className="col" style={{ gap: 4 }}>
          {LAYERS.map((l) => (
            <label key={l.id} className="row small between">
              {l.label}
              <Switch on={!w.hidden?.[l.id]} onChange={() => toggle(l.id)} label={l.label} />
            </label>
          ))}
        </div>
      </Section>
      <Section title="Griglia">
        <div className="seg row">
          {(
            [
              ['none', 'Nessuna'],
              ['hex', 'Esagoni'],
              ['square', 'Quadrati'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={w.grid.kind === k ? 'on' : ''} onClick={() => update({ grid: { ...w.grid, kind: k } })}>
              {l}
            </button>
          ))}
        </div>
        {w.grid.kind !== 'none' && (
          <>
            <Slider label="Misura delle caselle" value={w.grid.size} min={16} max={200} step={2} onChange={(v) => update({ grid: { ...w.grid, size: v } })} format={(v) => `${v} px`} />
            <Slider label="Visibilità" value={w.grid.opacity} min={0.05} max={0.8} step={0.05} onChange={(v) => update({ grid: { ...w.grid, opacity: v } })} format={(v) => `${Math.round(v * 100)}%`} />
            <span className="faint tiny">Al tavolo diventa la griglia della scena: con gli esagoni ci si muove per esagoni.</span>
          </>
        )}
      </Section>
      <Section title="Ornamenti">
        <div className="col" style={{ gap: 4 }}>
          <label className="row small between">
            Rosa dei venti
            <Switch on={!!w.compass} onChange={(v) => update({ compass: v ? { x: w.width - 110, y: w.height - 130, size: 150 } : null })} label="Rosa dei venti" />
          </label>
          <label className="row small between">
            Scala
            <Switch on={!!w.scaleBar} onChange={(v) => update({ scaleBar: v ? { x: 40, y: w.height - 50, px: 200, distance: 100, unit: 'km' } : null })} label="Scala" />
          </label>
          <label className="row small between">
            Titolo
            <Switch on={!!w.title} onChange={(v) => update({ title: v ? { text: w.name || 'Il mondo', x: w.width / 2, y: 50, size: 34 } : null })} label="Titolo" />
          </label>
        </div>
      </Section>
      <Section title="Aggiunte automatiche">
        <div className="col" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => setDoc({ ...w, rivers: [...w.rivers, ...autoRivers(w, fields.current.heights, 6, w.seed + Math.floor(rng() * 1000))] })}>
            <Waves size={13} /> Aggiungi fiumi
          </button>
          <button className="btn sm" onClick={() => setDoc({ ...w, symbols: [...w.symbols.filter(keepIds('auto-')), ...autoSymbols(w, fields.current.heights, fields.current.biomes)] })} title="Rifà monti, colline e boschi dei simboli automatici; quelli messi a mano restano">
            <Mountain size={13} /> Monti e boschi
          </button>
          <button className="btn sm" onClick={() => setDoc({ ...w, symbols: [...w.symbols.filter(keepIds('town-')), ...autoTowns(w, fields.current.heights, 10, w.seed + Math.floor(rng() * 1000))] })} title="Rifà città e villaggi automatici, con nomi inventati">
            <Sparkles size={13} /> Città e villaggi
          </button>
          <button className="btn ghost sm" onClick={() => setDoc({ ...w, symbols: w.symbols.filter((s) => !s.id.startsWith('auto-')) })}>
            Togli i simboli automatici
          </button>
        </div>
      </Section>
    </div>
  );
}

function GenerateDialog({ w, onClose, onGenerate }: { w: WorldMap; onClose: () => void; onGenerate: (next: WorldMap) => void }) {
  const [shape, setShape] = useState<WorldShape>('continent');
  const [land, setLand] = useState(0.4);
  const [rough, setRough] = useState(0.5);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [rivers, setRivers] = useState(true);
  const [decor, setDecor] = useState(true);
  const [towns, setTowns] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const build = () => {
    let next = generateWorld(w, { seed, shape, land, roughness: rough });
    const h = decodeField(next.heights, next.cols * next.rows);
    const b = decodeField(next.biomes, next.cols * next.rows);
    next = {
      ...next,
      rivers: rivers ? autoRivers(next, h, Math.round(4 + land * 10)) : [],
      symbols: [...w.symbols.filter((s) => !s.id.startsWith('auto-') && !s.id.startsWith('town-')), ...(decor ? autoSymbols(next, h, b) : []), ...(towns ? autoTowns(next, h, Math.round(6 + land * 12)) : [])],
    };
    return next;
  };
  useEffect(() => {
    // a quick look before replacing the map
    const t = setTimeout(() => {
      const small = { ...build(), hidden: { labels: true, pins: true, decor: true, grid: true } };
      setPreview(renderWorldImage(small, Math.min(1, 420 / Math.max(w.width, w.height))).toDataURL('image/jpeg', 0.85));
    }, 120);
    return () => clearTimeout(t);
  }, [shape, land, rough, seed, rivers, decor, towns]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal
      title="Genera il mondo"
      onClose={onClose}
      wide
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={() => onGenerate(build())}>
            Usa questa terra
          </button>
        </>
      }
    >
      <div className="studio-gen">
        <div className="col" style={{ gap: 'var(--s3)' }}>
          <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {SHAPES.map((s) => (
              <button key={s.id} className={`option ${shape === s.id ? 'on' : ''}`} onClick={() => setShape(s.id)}>
                <b>{s.label}</b>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
          <Slider label="Terre emerse" value={land} min={0.1} max={0.8} step={0.02} onChange={setLand} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Coste frastagliate" value={rough} min={0} max={1} step={0.05} onChange={setRough} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="row" style={{ gap: 6 }}>
            <label className="field grow">
              <span>Seme</span>
              <input className="input num" type="number" value={seed} onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} aria-label="Seme" />
            </label>
            <button className="btn sm" style={{ alignSelf: 'flex-end' }} onClick={() => setSeed(Math.floor(Math.random() * 100000))}>
              <Dices size={14} /> Un altro
            </button>
          </div>
          <label className="row small">
            <Switch on={rivers} onChange={setRivers} label="Fiumi" /> Fiumi
          </label>
          <label className="row small">
            <Switch on={decor} onChange={setDecor} label="Monti e boschi" /> Monti, colline e boschi
          </label>
          <label className="row small">
            <Switch on={towns} onChange={setTowns} label="Città e villaggi" /> Città e villaggi con i nomi
          </label>
          <span className="faint tiny">Il terreno e i biomi dipinti vengono rifatti; scritte, regioni, strade, segnaposti e simboli messi a mano restano. Si può sempre annullare.</span>
        </div>
        <div className="studio-gen-preview">{preview ? <img src={preview} alt="Anteprima del mondo" /> : <span className="faint small">Anteprima…</span>}</div>
      </div>
    </Modal>
  );
}

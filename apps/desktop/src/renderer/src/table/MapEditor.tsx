import { brushCells, EMPTY_TERRAIN, packScene, rotatePiece, TERRAINS, type MapPiece, type Ambient, type GameState, type Prop, type Scene, type WallKind } from '@thevtt/shared';
import {
  Armchair,
  BrickWall,
  Check,
  ClipboardPaste,
  Copy,
  Circle,
  Download,
  Eraser,
  Eye,
  ImagePlus,
  Library,
  Lightbulb,
  MousePointer2,
  Paintbrush,
  PaintBucket,
  Pipette,
  Plus,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  RotateCw,
  Search,
  Slash,
  Spline,
  Square,
  Type,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, readImage, Switch } from '../components/ui';
import { useTable } from '../store/table';
import type { ToolOptions } from './Board';
import { MapGenerator } from './MapGenerator';
import { MapLibrary } from './MapLibrary';
import { MapAlignment } from './Panels';
import { drawProp, LIGHT_PRESETS, PROP_KINDS, propKind } from './props';
import { download, renderPackage } from './sceneImage';
import { STAMPS } from './stamps';
import { renderTerrain, terrainSample } from './terrainRender';

/** What the GM works with in the map editor. Labels are text drawn on the map. */
export type EditorTool = 'select' | 'terrain' | 'walls' | 'props' | 'light' | 'labels' | 'copy';

export const EDITOR_TOOLS: { id: EditorTool; label: string; key: string; icon: typeof Paintbrush }[] = [
  { id: 'select', label: 'Seleziona e sposta', key: 'V', icon: MousePointer2 },
  { id: 'terrain', label: 'Terreno', key: 'B', icon: Paintbrush },
  { id: 'walls', label: 'Muri, porte e finestre', key: 'W', icon: BrickWall },
  { id: 'props', label: 'Oggetti di scena', key: 'O', icon: Armchair },
  { id: 'light', label: 'Luci', key: 'L', icon: Lightbulb },
  { id: 'labels', label: 'Scritte sulla mappa', key: 'T', icon: Type },
  { id: 'copy', label: 'Copia, incolla e stanze pronte', key: 'C', icon: Copy },
];

const TERRAIN_MODES: { id: ToolOptions['terrainMode']; label: string; hint: string; icon: typeof Paintbrush }[] = [
  { id: 'brush', label: 'Pennello', hint: 'Trascina per dipingere', icon: Paintbrush },
  { id: 'line', label: 'Linea', hint: 'Trascina: una striscia dritta (strade, fiumi, corridoi)', icon: Slash },
  { id: 'rect', label: 'Rettangolo', hint: 'Trascina: un rettangolo pieno (stanze)', icon: Square },
  { id: 'ellipse', label: 'Ellisse', hint: 'Trascina: un ovale pieno (laghi, radure, caverne)', icon: Circle },
  { id: 'fill', label: 'Riempi', hint: 'Clic: riempie la zona dello stesso terreno (vedi l’anteprima prima di cliccare)', icon: PaintBucket },
  { id: 'pick', label: 'Contagocce', hint: 'Clic su un punto della mappa per prenderne il terreno', icon: Pipette },
];

const TERRAIN_GROUPS: { title: string; codes: string[] }[] = [
  { title: 'Pavimenti', codes: ['s', 'w', 't', 'c'] },
  { title: 'Natura', codes: ['g', 'd', 'e', 'a', 'n'] },
  { title: 'Acqua e pericoli', codes: ['q', 'p', 'l', 'v'] },
  { title: 'Roccia', codes: ['r'] },
];

const PROP_GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Arredi', ids: ['table', 'chair', 'bed', 'bookshelf', 'rug', 'crate', 'barrel', 'chest'] },
  { title: 'Passaggi tra i piani', ids: ['stairs', 'ladder', 'trapdoor'] },
  { title: 'Pietra', ids: ['pillar', 'statue', 'altar', 'well'] },
  { title: 'All’aperto', ids: ['tree', 'bush', 'rock', 'bridge', 'cart', 'tent', 'fence'] },
  { title: 'Fuochi', ids: ['campfire', 'torch', 'brazier'] },
  { title: 'Trappole (nascoste ai giocatori)', ids: ['trap'] },
];

const LABEL_SIZES = [
  { width: 0.05, name: 'Piccola', px: 13 },
  { width: 0.08, name: 'Media', px: 18 },
  { width: 0.16, name: 'Grande', px: 26 },
] as const;
const LABEL_COLORS = ['#ffffff', '#1d1d1f', '#ffd166', '#ff6b6b', '#7ad1ff', '#9be7a0'];

/** A picture of a built-in prop, as it looks on the map. */
const propThumbs = new Map<string, string>();
function propThumb(kindId: string, rotation = 0, size = 64): string {
  const key = `${kindId}:${rotation}:${size}`;
  let url = propThumbs.get(key);
  if (!url) {
    const k = propKind(kindId);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    if (k) {
      const cell = (size * 0.8) / Math.max(k.w, k.h, 1);
      const p: Prop = { id: 't', sceneId: 't', kind: k.id, image: null, x: size / 2 / cell - k.w / 2, y: size / 2 / cell - k.h / 2, w: k.w, h: k.h, rotation, light: null, blocksVision: false, hidden: false };
      drawProp(ctx, p, cell, null, 0.4, true);
    }
    url = c.toDataURL();
    propThumbs.set(key, url);
  }
  return url;
}

/** The brush, drawn with the ground it paints. */
function BrushPreview({ code, size }: { code: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const n = 9;
    const px = 12;
    cv.width = n * px;
    cv.height = n * px;
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, cv.width, cv.height);
    const cells = new Set(brushCells(n, n, n / 2, n / 2, size));
    const pat = code === EMPTY_TERRAIN ? null : c.createPattern(terrainSample(code), 'repeat');
    pat?.setTransform(new DOMMatrix().scale(px / 32));
    for (let i = 0; i < n * n; i++) {
      const x = i % n;
      const y = (i - x) / n;
      c.fillStyle = cells.has(i) ? (pat ?? 'rgba(255,90,90,0.5)') : 'rgba(127,127,127,0.12)';
      c.fillRect(x * px + 0.5, y * px + 0.5, px - 1, px - 1);
    }
  }, [code, size]);
  return <canvas ref={ref} className="ed-brush-preview" aria-hidden />;
}

/** The scene as a PNG: map image, painted ground, scenery and labels. */
async function exportScene(state: GameState, scene: Scene, assets: Record<string, string>) {
  const canvas = await renderPackage(packScene(state, scene.id, assets), 8000);
  download(canvas.toDataURL('image/png'), `${scene.name}.png`);
}

/** The left rail of the editor: only the tools that make a map. */
export function EditorRail({
  tool,
  setTool,
  options,
  setOptions,
  undoRedo,
}: {
  tool: EditorTool;
  setTool: (t: EditorTool) => void;
  options: ToolOptions;
  setOptions: (o: ToolOptions) => void;
  undoRedo: (which: 'undo' | 'redo') => void;
}) {
  const state = useTable((s) => s.state);
  const undo = state?.history?.undo ?? [];
  const redo = state?.history?.redo ?? [];
  return (
    <div className="float rail glass editor-rail" role="toolbar" aria-label="Strumenti dell’editor">
      {EDITOR_TOOLS.map((t) => (
        <button key={t.id} className={`tool ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)} title={`${t.label} (${t.key})`} aria-label={t.label} aria-pressed={tool === t.id}>
          <t.icon size={16} />
        </button>
      ))}
      <span className="sep" />
      <button className="tool" disabled={!undo.length} onClick={() => undoRedo('undo')} title={undo.length ? `Annulla: ${undo[0]} (Ctrl+Z)` : 'Niente da annullare'} aria-label="Annulla">
        <Undo2 size={16} />
      </button>
      <button className="tool" disabled={!redo.length} onClick={() => undoRedo('redo')} title={redo.length ? `Ripeti: ${redo[0]} (Ctrl+Y)` : 'Niente da ripetere'} aria-label="Ripeti">
        <Redo2 size={16} />
      </button>
      <span className="sep" />
      <button className={`tool ${options.showTokens ? 'active' : ''}`} onClick={() => setOptions({ ...options, showTokens: !options.showTokens })} title={options.showTokens ? 'Token visibili: nascondili per lavorare sulla mappa' : 'Token nascosti nell’editor'} aria-label="Mostra i token" aria-pressed={options.showTokens}>
        <Eye size={16} />
      </button>
    </div>
  );
}

/** Which scene, and whether the players are looking at it. */
export function EditorBanner({ onExit }: { onExit: () => void }) {
  const { state, editorSceneId, dispatch } = useTable();
  if (!state || !editorSceneId) return null;
  const scene = state.scenes[editorSceneId];
  const live = editorSceneId === state.activeSceneId;
  return (
    <div className="float editor-banner glass" role="status">
      <span className="editor-badge">Editor</span>
      <span className="ellipsis">
        <b>{scene?.name}</b> · {live ? 'i giocatori vedono le modifiche dal vivo' : `lavori in privato: i giocatori sono su «${state.scenes[state.activeSceneId]?.name ?? '?'}»`}
      </span>
      {!live && (
        <button className="btn sm" onClick={() => dispatch({ type: 'scene.activate', sceneId: editorSceneId })} title="Porta i giocatori su questa scena">
          <Eye size={13} /> Mostra ai giocatori
        </button>
      )}
      <button className="btn sm primary" onClick={onExit} title="Torna al gioco (E)">
        <Check size={13} /> Fine
      </button>
    </div>
  );
}

/** The right side of the editor: the options of the tool in hand, with previews, and the scene. */
export function EditorPanel({ tool, options, setOptions }: { tool: EditorTool; options: ToolOptions; setOptions: (o: ToolOptions) => void }) {
  const { state, assets, editorSceneId, setEditor, dispatch } = useTable();
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [library, setLibrary] = useState(false);
  if (!state || !editorSceneId) return null;
  const scene = state.scenes[editorSceneId];
  if (!scene) return null;
  const set = (patch: Partial<ToolOptions>) => setOptions({ ...options, ...patch });
  const upd = (patch: Partial<Scene>) => dispatch({ type: 'scene.update', sceneId: scene.id, patch });

  return (
    <div className="panel-body col editor-panel">
      <div className="row" style={{ gap: 6 }}>
        <select className="select grow" value={scene.id} onChange={(e) => setEditor(e.target.value)} aria-label="Scena da modificare">
          {Object.values(state.scenes).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.id === state.activeSceneId ? ' · in gioco' : ''}
            </option>
          ))}
        </select>
        <button className="btn sm icon" onClick={() => setCreating(true)} title="Nuova scena vuota" aria-label="Nuova scena vuota">
          <Plus size={14} />
        </button>
        <button className="btn sm icon" onClick={() => setGenerating(true)} title="Genera una mappa" aria-label="Genera una mappa">
          <Wand2 size={14} />
        </button>
        <button className="btn sm icon" onClick={() => setLibrary(true)} title="Libreria di mappe: salva questa, o usane una già pronta" aria-label="Libreria di mappe">
          <Library size={14} />
        </button>
      </div>
      {library && <MapLibrary sceneId={scene.id} onClose={() => setLibrary(false)} onUsed={(id) => setEditor(id)} />}
      {creating && <NewScene onClose={() => setCreating(false)} />}
      {generating && <MapGenerator onClose={() => setGenerating(false)} activate={false} onCreated={(id) => setEditor(id)} />}

      <div className="section-title">{EDITOR_TOOLS.find((t) => t.id === tool)?.label}</div>
      {tool === 'select' && (
        <p className="small muted">
          Clic su un oggetto, una porta o una luce per modificarli; trascina per spostarli, Maiusc+trascina per prenderne tanti. Canc li elimina. Le scritte si cancellano con la gomma dello strumento Scritte.
        </p>
      )}

      {tool === 'terrain' && (
        <>
          <div className="ed-modes" role="radiogroup" aria-label="Come dipingere">
            {TERRAIN_MODES.map((m) => (
              <button key={m.id} role="radio" aria-checked={options.terrainMode === m.id} className={`ed-mode ${options.terrainMode === m.id ? 'on' : ''}`} onClick={() => set({ terrainMode: m.id })} title={m.hint}>
                <m.icon size={16} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <p className="faint tiny">{TERRAIN_MODES.find((m) => m.id === options.terrainMode)?.hint}</p>
          {(options.terrainMode === 'brush' || options.terrainMode === 'line') && (
            <div className="ed-brush">
              <BrushPreview code={options.terrain} size={options.brushSize} />
              <label className="col grow" style={{ gap: 4 }}>
                <span className="small">
                  Pennello: {options.brushSize} {options.brushSize === 1 ? 'casella' : 'caselle'}
                </span>
                <input type="range" min={1} max={9} step={1} value={options.brushSize} onChange={(e) => set({ brushSize: Number(e.target.value) })} aria-label="Misura del pennello" />
                <span className="faint tiny">[ e ] per cambiarla al volo</span>
              </label>
            </div>
          )}
          {TERRAIN_GROUPS.map((g) => (
            <div key={g.title} className="col" style={{ gap: 6 }}>
              <span className="ed-group">{g.title}</span>
              <div className="ed-grid" role="radiogroup" aria-label={g.title}>
                {g.codes.map((code) => {
                  const t = TERRAINS.find((k) => k.code === code)!;
                  return (
                    <button key={code} role="radio" aria-checked={options.terrain === code} aria-label={t.name} className={`ed-tile ${options.terrain === code ? 'on' : ''}`} onClick={() => set({ terrain: code, terrainMode: options.terrainMode === 'pick' ? 'brush' : options.terrainMode })}>
                      <span className="ed-swatch" style={{ backgroundImage: `url(${terrainSampleUrl(code)})` }} />
                      <span className="ed-name">{t.name}</span>
                    </button>
                  );
                })}
                {g.title === 'Roccia' && (
                  <button role="radio" aria-checked={options.terrain === EMPTY_TERRAIN} aria-label="Gomma" className={`ed-tile ${options.terrain === EMPTY_TERRAIN ? 'on' : ''}`} onClick={() => set({ terrain: EMPTY_TERRAIN })} title="Toglie il terreno: si vede l’immagine della scena, se c’è">
                    <span className="ed-swatch ed-eraser">
                      <Eraser size={18} />
                    </span>
                    <span className="ed-name">Gomma</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="row between">
            <span className="small" title="La roccia, e i bordi delle stanze dipinte sul vuoto, diventano muri che bloccano vista e movimento">
              Muri automatici dalla mappa
            </span>
            <Switch on={scene.autoWalls !== false} onChange={(autoWalls) => upd({ autoWalls })} label="Muri automatici" />
          </div>
          {scene.autoWalls !== false && (
            <div className="row between">
              <span className="small" title="Pietra, legno e marmo sono pavimenti di un edificio: contro erba, terra, acqua o una strada selciata prendono il muro. Le porte si mettono con lo strumento Muri.">
                Muri attorno agli edifici
              </span>
              <Switch on={scene.buildingWalls !== false} onChange={(buildingWalls) => upd({ buildingWalls })} label="Muri attorno agli edifici" />
            </div>
          )}
          {scene.terrain && (
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'terrain.set', sceneId: scene.id, terrain: null })}>
              Cancella tutto il terreno
            </button>
          )}
        </>
      )}

      {tool === 'walls' && (
        <>
          <div className="ed-grid three" role="radiogroup" aria-label="Cosa costruire">
            {(
              [
                ['wall', 'Muro', 'Blocca vista, luce e passaggio'],
                ['door', 'Porta', 'Si apre con un clic; anche a chiave'],
                ['window', 'Finestra', 'Lascia passare vista e luce, non le persone'],
              ] as [WallKind, string, string][]
            ).map(([kind, name, hint]) => (
              <button key={kind} role="radio" aria-checked={!options.wallErase && options.wallKind === kind} aria-label={name} title={hint} className={`ed-tile ${!options.wallErase && options.wallKind === kind ? 'on' : ''}`} onClick={() => set({ wallKind: kind, wallErase: false, wallMode: kind === 'wall' ? options.wallMode : 'edge' })}>
                <span className={`ed-swatch ed-wall ${kind}`} />
                <span className="ed-name">{name}</span>
              </button>
            ))}
          </div>
          <div className="ed-modes" role="radiogroup" aria-label="Come costruire">
            {(
              [
                ['edge', 'Sul lato', 'Clic vicino al lato di una casella: ci va lì (ideale per porte e finestre)', RectangleHorizontal],
                ['line', 'Linea', 'Clic dopo clic; Invio, Esc o tasto destro per finire', Spline],
                ['rect', 'Stanza', 'Trascina: quattro muri attorno a un rettangolo', Square],
              ] as const
            ).map(([id, label, hint, Icon]) => (
              <button key={id} role="radio" aria-checked={!options.wallErase && options.wallMode === id} className={`ed-mode ${!options.wallErase && options.wallMode === id ? 'on' : ''}`} onClick={() => set({ wallMode: id, wallErase: false })} title={hint}>
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
            <button role="radio" aria-checked={options.wallErase} className={`ed-mode ${options.wallErase ? 'on' : ''}`} onClick={() => set({ wallErase: !options.wallErase })} title="Clic su un muro, una porta o una finestra per toglierla">
              <Eraser size={16} />
              <span>Gomma</span>
            </button>
          </div>
          {options.wallKind === 'door' && !options.wallErase && (
            <Field label="Le nuove porte sono">
              <div className="seg" role="radiogroup" aria-label="Nuove porte">
                {(
                  [
                    ['closed', 'Chiuse'],
                    ['open', 'Aperte'],
                    ['locked', 'A chiave'],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} role="radio" aria-checked={options.doorState === id} className={options.doorState === id ? 'on' : ''} onClick={() => set({ doorState: id })}>
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <p className="faint tiny">
            {options.wallErase ? 'I muri della mappa dipinta non si cancellano qui: ridipingi il pavimento.' : 'Una porta messa su un muro della mappa dipinta gli apre il suo spazio.'}
          </p>
          <div className="row between">
            <span className="small">Muri automatici dalla mappa</span>
            <Switch on={scene.autoWalls !== false} onChange={(autoWalls) => upd({ autoWalls })} label="Muri automatici" />
          </div>
          {scene.autoWalls !== false && (
            <div className="row between">
              <span className="small" title="Pietra, legno e marmo sono pavimenti di un edificio: contro erba, terra, acqua o una strada selciata prendono il muro. Le porte si mettono con lo strumento Muri.">
                Muri attorno agli edifici
              </span>
              <Switch on={scene.buildingWalls !== false} onChange={(buildingWalls) => upd({ buildingWalls })} label="Muri attorno agli edifici" />
            </div>
          )}
          {Object.values(state.walls ?? {}).some((w) => w.sceneId === scene.id && !w.auto) && (
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'wall.clear', sceneId: scene.id })}>
              Cancella i muri messi a mano
            </button>
          )}
        </>
      )}

      {tool === 'props' && <PropPalette options={options} set={set} />}

      {tool === 'copy' && <PiecePanel options={options} set={set} />}

      {tool === 'light' && (
        <>
          <div className="ed-lights" role="radiogroup" aria-label="Luce da posare">
            {LIGHT_PRESETS.filter((l) => l.id !== 'none').map((l) => {
              const max = 36;
              return (
                <button key={l.id} role="radio" aria-checked={options.lightKind === l.id} className={`ed-light ${options.lightKind === l.id ? 'on' : ''}`} onClick={() => set({ lightKind: l.id })} aria-label={l.name} title={l.name}>
                  <svg viewBox="-20 -20 40 40" aria-hidden>
                    <circle r={(l.dim / max) * 19} fill={l.color ?? '#ffe9a8'} opacity="0.25" />
                    <circle r={(l.bright / max) * 19} fill={l.color ?? '#ffe9a8'} opacity="0.65" />
                    <circle r="1.6" fill="#fff" />
                  </svg>
                  <span className="ed-name">{l.name.replace(/ \(.*/, '')}</span>
                  <span className="faint tiny">
                    {String(l.bright).replace('.', ',')} m + {String(l.dim - l.bright).replace('.', ',')} m
                  </span>
                </button>
              );
            })}
          </div>
          <p className="faint tiny">Clic sulla mappa per posarla: l’anteprima mostra fin dove arriva. Le luci dei token si impostano nel loro pannello.</p>
          <div className="row between">
            <span className="small" title="Ogni giocatore vede solo ciò che vedono i suoi token">Visione dinamica</span>
            <Switch on={!!scene.vision} onChange={(vision) => upd({ vision })} label="Visione dinamica" />
          </div>
          {scene.vision && (
            <>
              <Field label="Luce ambientale">
                <div className="seg" role="radiogroup" aria-label="Luce ambientale">
                  {(
                    [
                      ['bright', 'Giorno'],
                      ['dim', 'Penombra'],
                      ['dark', 'Buio'],
                    ] as [Ambient, string][]
                  ).map(([a, label]) => (
                    <button key={a} role="radio" aria-checked={(scene.ambient ?? 'bright') === a} className={(scene.ambient ?? 'bright') === a ? 'on' : ''} onClick={() => upd({ ambient: a })}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="row between">
                <span className="small" title="Luci e ombre come le vedono i giocatori dai loro token">Anteprima come i giocatori</span>
                <Switch on={options.lightPreview} onChange={(lightPreview) => set({ lightPreview })} label="Anteprima come i giocatori" />
              </div>
            </>
          )}
        </>
      )}

      {tool === 'labels' && (
        <>
          <div className="ed-label-preview" style={{ color: options.drawColor || '#ffffff', fontSize: LABEL_SIZES.find((s) => s.width === options.drawWidth)?.px ?? 18 }}>
            Taverna del Grifone
          </div>
          <Field label="Grandezza">
            <div className="seg" role="radiogroup" aria-label="Grandezza delle scritte">
              {LABEL_SIZES.map((s) => (
                <button key={s.width} role="radio" aria-checked={options.drawWidth === s.width && !options.erase} className={options.drawWidth === s.width && !options.erase ? 'on' : ''} onClick={() => set({ drawWidth: s.width, erase: false })}>
                  {s.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="row" style={{ gap: 6 }}>
            {LABEL_COLORS.map((c) => (
              <button key={c} className={`swatch ${(options.drawColor || '#ffffff') === c && !options.erase ? 'active on' : ''}`} style={{ background: c }} onClick={() => set({ drawColor: c, erase: false })} aria-label={`Colore ${c}`} />
            ))}
            <span className="vsep" />
            <button className={`btn sm ${options.erase ? 'primary' : ''}`} onClick={() => set({ erase: !options.erase })} title="Trascina sulle scritte per cancellarle">
              <Eraser size={13} /> Gomma
            </button>
          </div>
          <p className="faint tiny">Clic sulla mappa e scrivi; Invio per confermare. I giocatori le vedono come parte della mappa.</p>
        </>
      )}

      <div className="section-title" style={{ marginTop: 10 }}>
        Scena
      </div>
      <Field label="Nome">
        <input className="input" defaultValue={scene.name} key={`n-${scene.id}-${scene.name}`} onBlur={(e) => e.target.value.trim() && e.target.value !== scene.name && upd({ name: e.target.value })} />
      </Field>
      <div className="row">
        <Field label="Larghezza">
          <input className="input" type="number" min={1} max={200} defaultValue={scene.widthCells} key={`w-${scene.id}-${scene.widthCells}`} onBlur={(e) => Number(e.target.value) !== scene.widthCells && upd({ widthCells: Number(e.target.value) })} />
        </Field>
        <Field label="Altezza">
          <input className="input" type="number" min={1} max={200} defaultValue={scene.heightCells} key={`h-${scene.id}-${scene.heightCells}`} onBlur={(e) => Number(e.target.value) !== scene.heightCells && upd({ heightCells: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="row">
        <Field label="Ogni casella">
          <input className="input" type="number" step={0.5} min={0.1} defaultValue={scene.cellDistance} key={`d-${scene.id}-${scene.cellDistance}`} onBlur={(e) => upd({ cellDistance: Number(e.target.value) })} />
        </Field>
        <Field label="Unità">
          <select className="select" value={scene.unit ?? 'ft'} onChange={(e) => upd({ unit: e.target.value as 'm' | 'ft' })}>
            <option value="m">metri</option>
            <option value="ft">piedi</option>
          </select>
        </Field>
      </div>
      <div className="row between">
        <span className="small">Griglia visibile</span>
        <Switch on={scene.showGrid} onChange={(showGrid) => upd({ showGrid })} label="Griglia visibile" />
      </div>
      <label className="btn sm">
        <ImagePlus size={14} /> {scene.background ? 'Cambia immagine di sfondo' : 'Immagine di sfondo'}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) dispatch({ type: 'asset.add', dataUrl: await readImage(f), attachTo: { sceneId: scene.id } });
          }}
        />
      </label>
      {scene.background && (
        <>
          <button className="btn ghost sm" onClick={() => upd({ background: null })}>
            <X size={13} /> Togli l’immagine
          </button>
          <MapAlignment scene={scene} />
        </>
      )}
      <button className="btn sm" onClick={() => void exportScene(state, scene, assets)} title="Salva la mappa come immagine PNG (senza muri né token)">
        <Download size={14} /> Esporta come immagine
      </button>
    </div>
  );
}

const sampleUrls = new Map<string, string>();
function terrainSampleUrl(code: string): string {
  let u = sampleUrls.get(code);
  if (!u) {
    u = terrainSample(code).toDataURL();
    sampleUrls.set(code, u);
  }
  return u;
}

function PropPalette({ options, set }: { options: ToolOptions; set: (p: Partial<ToolOptions>) => void }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PROP_GROUPS.map((g) => ({ ...g, ids: g.ids.filter((id) => !needle || propKind(id)?.name.toLowerCase().includes(needle)) })).filter((g) => g.ids.length);
  }, [q]);
  const current = propKind(options.propKind);
  const rotate = (d: number) => set({ propRotation: (((options.propRotation + d) % 360) + 360) % 360 });
  return (
    <>
      <div className="ed-prop-current">
        <img src={propThumb(options.propKind, options.propRotation, 96)} alt="" />
        <div className="col grow" style={{ gap: 4 }}>
          <b>{current?.name}</b>
          <span className="faint tiny">
            {current ? `${String(current.w).replace('.', ',')} × ${String(current.h).replace('.', ',')} caselle` : ''}
            {current?.light ? ' · fa luce' : ''}
            {current?.blocksVision ? ' · blocca la vista' : ''}
          </span>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn sm icon" onClick={() => rotate(-90)} title="Ruota a sinistra" aria-label="Ruota a sinistra">
              <RotateCcw size={13} />
            </button>
            <button className="btn sm icon" onClick={() => rotate(90)} title="Ruota a destra (R)" aria-label="Ruota a destra">
              <RotateCw size={13} />
            </button>
            <span className="faint tiny">{options.propRotation}°</span>
          </div>
        </div>
      </div>
      <label className="search-field">
        <Search size={14} />
        <input className="input" placeholder="Cerca un oggetto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca un oggetto" />
      </label>
      {groups.map((g) => (
        <div key={g.title} className="col" style={{ gap: 6 }}>
          <span className="ed-group">{g.title}</span>
          <div className="ed-grid" role="radiogroup" aria-label={g.title}>
            {g.ids.map((id) => (
              <button key={id} role="radio" aria-checked={options.propKind === id} aria-label={propKind(id)?.name} className={`ed-tile ${options.propKind === id ? 'on' : ''}`} onClick={() => set({ propKind: id })}>
                <img className="ed-swatch" src={propThumb(id)} alt="" />
                <span className="ed-name">{propKind(id)?.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!groups.length && <p className="faint small">Nessun oggetto con questo nome.</p>}
      <p className="faint tiny">Clic sulla mappa per posarlo; Alt per posarlo fuori griglia. Per un’immagine tua, trascinala sulla mappa con lo strumento Seleziona.</p>
    </>
  );
}

/** A blank scene, ready to paint. */
function NewScene({ onClose }: { onClose: () => void }) {
  const { state, dispatch, setEditor } = useTable();
  const [name, setName] = useState('');
  const [size, setSize] = useState<[number, number]>([30, 20]);
  const [ground, setGround] = useState<string>(EMPTY_TERRAIN);
  const create = () => {
    const id = `ed-${Math.random().toString(36).slice(2, 12)}`;
    const [w, h] = size;
    dispatch({
      type: 'batch',
      actions: [
        { type: 'scene.create', name: name.trim() || `Mappa ${Object.keys(state?.scenes ?? {}).length + 1}`, id },
        { type: 'scene.update', sceneId: id, patch: { widthCells: w, heightCells: h, cellDistance: 1.5, unit: 'm' } },
        ...(ground !== EMPTY_TERRAIN ? [{ type: 'terrain.set' as const, sceneId: id, terrain: ground.repeat(w * h) }] : []),
      ],
    });
    setEditor(id);
    onClose();
  };
  return (
    <div className="ed-new col">
      <input className="input" autoFocus placeholder="Nome della scena" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} aria-label="Nome della nuova scena" />
      <div className="seg" role="radiogroup" aria-label="Dimensione">
        {(
          [
            [20, 15, 'Piccola'],
            [30, 20, 'Media'],
            [45, 30, 'Grande'],
          ] as const
        ).map(([w, h, label]) => (
          <button key={label} role="radio" aria-checked={size[0] === w} className={size[0] === w ? 'on' : ''} onClick={() => setSize([w, h])} title={`${w} × ${h} caselle`}>
            {label}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="radiogroup" aria-label="Si parte da">
        {([EMPTY_TERRAIN, 'r', 'g', 's'] as const).map((code) => (
          <button key={code} role="radio" aria-checked={ground === code} className={`ed-start ${ground === code ? 'on' : ''}`} onClick={() => setGround(code)}>
            {code === EMPTY_TERRAIN ? <span className="ed-swatch ed-blank" /> : <span className="ed-swatch" style={{ backgroundImage: `url(${terrainSampleUrl(code)})` }} />}
            <span className="tiny">{code === EMPTY_TERRAIN ? 'Vuota' : code === 'r' ? 'Tutta roccia' : code === 'g' ? 'Prato' : 'Pietra'}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
        <button className="btn ghost sm" onClick={onClose}>
          Annulla
        </button>
        <button className="btn primary sm" onClick={create}>
          Crea e modifica
        </button>
      </div>
    </div>
  );
}

/** A piece of map as a small picture, for the copy tool's panel. */
function PiecePreview({ piece }: { piece: MapPiece }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const px = Math.max(6, Math.min(28, Math.floor(300 / Math.max(piece.w, piece.h))));
    cv.width = piece.w * px;
    cv.height = piece.h * px;
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, cv.width, cv.height);
    if (/[^.]/.test(piece.terrain)) c.drawImage(renderTerrain(piece.terrain, piece.w, piece.h, 3, px), 0, 0);
    for (const p of piece.props) drawProp(c, { ...p, id: 'p', sceneId: 'p', rotation: p.rotation ?? 0, light: null, blocksVision: false, hidden: false, image: null }, px, null, 0.4, true);
    c.lineCap = 'round';
    for (const w of piece.walls) {
      c.strokeStyle = w.kind === 'door' ? '#5ec8ff' : w.kind === 'window' ? '#9be7c4' : '#ffb347';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w.x1 * px, w.y1 * px);
      c.lineTo(w.x2 * px, w.y2 * px);
      c.stroke();
    }
  }, [piece]);
  return <canvas ref={ref} className="piece-preview" aria-label="Anteprima del pezzo da incollare" />;
}

const stampThumbs = new Map<string, string>();
function stampThumb(p: MapPiece): string {
  let u = stampThumbs.get(p.name ?? '');
  if (!u) {
    const px = Math.floor(96 / Math.max(p.w, p.h));
    const cv = document.createElement('canvas');
    cv.width = p.w * px;
    cv.height = p.h * px;
    const c = cv.getContext('2d')!;
    c.drawImage(renderTerrain(p.terrain.replace(/\./g, 'g'), p.w, p.h, 5, px), 0, 0);
    for (const pr of p.props) drawProp(c, { ...pr, id: 'p', sceneId: 'p', rotation: pr.rotation ?? 0, light: null, blocksVision: false, hidden: false, image: null }, px, null, 0.4, true);
    u = cv.toDataURL();
    stampThumbs.set(p.name ?? '', u);
  }
  return u;
}

/** Copy a zone of the map and put it down elsewhere, or use a ready-made room. */
function PiecePanel({ options, set }: { options: ToolOptions; set: (p: Partial<ToolOptions>) => void }) {
  const { clipboard, setClipboard } = useTable();
  return (
    <>
      <div className="ed-modes" role="radiogroup" aria-label="Copia o incolla">
        <button role="radio" aria-checked={options.pieceMode === 'copy'} className={`ed-mode ${options.pieceMode === 'copy' ? 'on' : ''}`} onClick={() => set({ pieceMode: 'copy' })}>
          <Copy size={16} />
          <span>Copia una zona</span>
        </button>
        <button role="radio" aria-checked={options.pieceMode === 'paste'} disabled={!clipboard} className={`ed-mode ${options.pieceMode === 'paste' ? 'on' : ''}`} onClick={() => set({ pieceMode: 'paste' })}>
          <ClipboardPaste size={16} />
          <span>Incolla</span>
        </button>
      </div>
      <p className="faint tiny">
        {options.pieceMode === 'copy'
          ? 'Trascina sulla mappa: terreno, muri e porte, oggetti e scritte di quella zona vengono copiati.'
          : 'Clic sulla mappa per incollarlo dove vedi l’anteprima (anche più volte). R lo ruota. Un Ctrl+Z lo toglie.'}
      </p>
      {clipboard && (
        <div className="col piece-box">
          <PiecePreview piece={clipboard} />
          <div className="row between">
            <span className="small">
              {clipboard.name ?? 'Zona copiata'} · {clipboard.w} × {clipboard.h}
            </span>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn sm" onClick={() => setClipboard(rotatePiece(clipboard))} title="Ruota di un quarto (R)">
                <RotateCw size={13} /> Ruota
              </button>
              <button className="btn sm ghost icon" onClick={() => (setClipboard(null), set({ pieceMode: 'copy' }))} aria-label="Svuota" title="Svuota">
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
      <span className="ed-group">Stanze pronte</span>
      <div className="ed-grid three" role="list" aria-label="Stanze pronte">
        {STAMPS.map((st) => (
          <button
            key={st.name}
            role="listitem"
            aria-label={st.name}
            className={`ed-tile ${clipboard?.name === st.name ? 'on' : ''}`}
            onClick={() => {
              setClipboard(st);
              set({ pieceMode: 'paste' });
            }}
          >
            <img className="ed-swatch stamp" src={stampThumb(st)} alt="" />
            <span className="ed-name">{st.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

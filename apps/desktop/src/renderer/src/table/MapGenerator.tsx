import { generateMap, mapToTerrain, newId, type GameAction, type GeneratedMap, type MapKind, type Prop } from '@thevtt/shared';
import { Dices } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Modal, Switch } from '../components/ui';
import { useTable } from '../store/table';
import { renderTerrain, terrainSeed } from './terrainRender';
import { drawProp, metresToCells, propKind } from './props';

const KINDS: { id: MapKind; label: string; name: string; hint: string }[] = [
  { id: 'dungeon', label: 'Dungeon', name: 'Dungeon', hint: 'Stanze e corridoi, porte, torce. Buio: serve luce.' },
  { id: 'cave', label: 'Caverna', name: 'Caverna', hint: 'Gallerie naturali, pozze d’acqua, rocce. Buio.' },
  { id: 'wilderness', label: 'All’aperto', name: 'Radura', hint: 'Bosco, sentiero e uno stagno. Pieno giorno.' },
];

const SIZES = [
  { id: 's', label: 'Piccola', w: 24, h: 18 },
  { id: 'm', label: 'Media', w: 34, h: 24 },
  { id: 'l', label: 'Grande', w: 46, h: 32 },
] as const;

const SCENE_UNITS = { cellDistance: 1.5, unit: 'm' as const };

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** The GM picks a kind of place and gets a playable scene: picture, walls, doors, lights and scenery. */
export function MapGenerator({ onClose, activate = true, onCreated }: { onClose: () => void; activate?: boolean; onCreated?: (sceneId: string) => void }) {
  const { dispatch, state } = useTable();
  const [kind, setKind] = useState<MapKind>('dungeon');
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('m');
  const [density, setDensity] = useState(0.5);
  const [doors, setDoors] = useState(true);
  const [lights, setLights] = useState(true);
  const [furniture, setFurniture] = useState(true);
  const [seed, setSeed] = useState(randomSeed);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);

  const dims = SIZES.find((s) => s.id === size)!;
  const map = useMemo(() => generateMap({ kind, width: dims.w, height: dims.h, seed, density, doors, lights, furniture }), [kind, dims.w, dims.h, seed, density, doors, lights, furniture]);
  // the scene's id is chosen now: the preview is painted exactly as the table will paint it
  const sceneId = useMemo(() => `gen-${newId()}`, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  const terrain = useMemo(() => mapToTerrain(map), [map]);
  const info = KINDS.find((k) => k.id === kind)!;
  const count = Object.values(state?.scenes ?? {}).filter((s) => s.name.startsWith(info.name)).length;
  const sceneName = name.trim() || `${info.name} ${count + 1}`;

  // a small live preview, with the walls and scenery on top
  useEffect(() => {
    const cv = preview.current;
    if (!cv) return;
    const cell = Math.floor(Math.min(560 / map.width, 360 / map.height));
    const img = renderTerrain(terrain, map.width, map.height, terrainSeed(sceneId), cell);
    cv.width = img.width;
    cv.height = img.height;
    const c = cv.getContext('2d')!;
    c.drawImage(img, 0, 0);
    for (const p of map.props) {
      const k = propKind(p.kind);
      if (k) drawProp(c, { ...asProp(p, k.w, k.h), light: null }, cell, null, 0, true);
    }
    c.lineCap = 'round';
    for (const w of map.walls) {
      c.strokeStyle = w.kind === 'door' ? '#5ec8ff' : 'rgba(255,190,90,0.85)';
      c.lineWidth = w.kind === 'door' ? 3 : 1.5;
      c.beginPath();
      c.moveTo(w.x1 * cell, w.y1 * cell);
      c.lineTo(w.x2 * cell, w.y2 * cell);
      c.stroke();
    }
  }, [map, terrain, sceneId]);

  const create = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    const id = sceneId;
    const actions: GameAction[] = [
      { type: 'scene.create', name: sceneName, id },
      ...(activate ? [{ type: 'scene.activate' as const, sceneId: id }] : []),
      {
        type: 'scene.update',
        sceneId: id,
        patch: { widthCells: map.width, heightCells: map.height, ...SCENE_UNITS, showGrid: true, vision: kind !== 'wilderness', ambient: kind === 'wilderness' ? 'bright' : 'dark', autoWalls: true },
      },
      // a painted map, so the GM can keep working on it: its walls come with it, the doors are placed
      { type: 'terrain.set', sceneId: id, terrain },
    ];
    const doors = map.walls.filter((w) => w.kind === 'door');
    if (doors.length) actions.push({ type: 'wall.create', sceneId: id, walls: doors.map((w) => ({ ...w })) });
    for (const p of map.props) {
      const k = propKind(p.kind);
      if (!k) continue;
      const light = k.light ? { bright: metresToCells(SCENE_UNITS, k.light.bright), dim: metresToCells(SCENE_UNITS, k.light.dim), color: k.light.color } : null;
      actions.push({ type: 'prop.create', sceneId: id, prop: { kind: k.id, x: p.x, y: p.y, w: k.w, h: k.h, light, blocksVision: !!k.blocksVision } });
    }
    dispatch({ type: 'batch', actions });
    onCreated?.(id);
    onClose();
  };

  return (
    <Modal
      title="Genera una mappa"
      wide
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void create()}>
            {busy ? 'Creo la scena…' : 'Crea la scena'}
          </button>
        </>
      }
    >
      <div className="mapgen">
        <div className="mapgen-preview">
          <canvas ref={preview} aria-label="Anteprima della mappa" />
          <button className="btn sm mapgen-reroll" onClick={() => setSeed(randomSeed())} title="Un’altra mappa con le stesse impostazioni">
            <Dices size={14} /> Un’altra
          </button>
        </div>
        <div className="mapgen-options">
          <div className="seg" role="radiogroup" aria-label="Tipo di luogo">
            {KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <p className="faint small">{info.hint}</p>
          <Field label="Nome della scena">
            <input className="input" value={name} placeholder={sceneName} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="seg" role="radiogroup" aria-label="Dimensione">
            {SIZES.map((s) => (
              <button key={s.id} role="radio" aria-checked={size === s.id} className={size === s.id ? 'on' : ''} onClick={() => setSize(s.id)} title={`${s.w} × ${s.h} caselle`}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="col" style={{ gap: 4 }}>
            <span className="small muted">{kind === 'dungeon' ? 'Stanze' : kind === 'cave' ? 'Spazio e rocce' : 'Bosco'}</span>
            <input type="range" min={0} max={1} step={0.05} value={density} onChange={(e) => setDensity(Number(e.target.value))} aria-label="Densità" />
          </label>
          <div className="mapgen-switches">
            {kind === 'dungeon' && (
              <div className="row between">
                <span>Porte</span>
                <Switch on={doors} onChange={setDoors} label="Porte" />
              </div>
            )}
            <div className="row between">
              <span>{kind === 'wilderness' ? 'Fuoco da campo' : 'Luci'}</span>
              <Switch on={lights} onChange={setLights} label="Luci" />
            </div>
            {kind !== 'wilderness' && (
              <div className="row between">
                <span>Arredi e tesori</span>
                <Switch on={furniture} onChange={setFurniture} label="Arredi e tesori" />
              </div>
            )}
          </div>
          <p className="faint tiny">
            {map.width} × {map.height} caselle · {map.walls.filter((w) => w.kind === 'wall').length} muri · {map.walls.filter((w) => w.kind === 'door').length} porte · {map.props.length} oggetti. {activate ? 'La scena nuova diventa quella attiva. ' : ''}Si può ritoccare nell’editor.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function asProp(p: GeneratedMap['props'][number], w: number, h: number): Prop {
  return { id: 'preview', sceneId: 'preview', kind: p.kind, image: null, x: p.x, y: p.y, w, h, rotation: 0, light: null, blocksVision: false, hidden: false };
}

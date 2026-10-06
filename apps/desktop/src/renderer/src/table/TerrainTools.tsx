import { EMPTY_TERRAIN, TERRAINS, type Scene } from '@thevtt/shared';
import { BrickWall, Eraser, Paintbrush, PaintBucket, Square, Trash2 } from 'lucide-react';
import { useTable } from '../store/table';
import type { ToolOptions } from './Board';
import { renderTerrain } from './terrainRender';

/** a little square of each ground, painted the way the board paints it */
const thumbs = new Map<string, string>();
function thumb(code: string): string {
  let url = thumbs.get(code);
  if (!url) {
    url = renderTerrain(code.repeat(9), 3, 3, 7, 20).toDataURL();
    thumbs.set(code, url);
  }
  return url;
}

const SIZES = [1, 2, 3, 5] as const;

/** The GM's map painting tools: ground, brush, rectangle, bucket, and the walls that follow. */
export function TerrainTools({ scene, options, setOptions }: { scene: Scene; options: ToolOptions; setOptions: (o: ToolOptions) => void }) {
  const dispatch = useTable((s) => s.dispatch);
  const set = (patch: Partial<ToolOptions>) => setOptions({ ...options, ...patch });
  const erasing = options.terrain === EMPTY_TERRAIN;
  const current = TERRAINS.find((t) => t.code === options.terrain);
  const autoWalls = scene.autoWalls !== false;

  return (
    <div className="float tool-options glass terrain-tools" role="toolbar" aria-label="Dipingi la mappa">
      <div className="terrain-row">
        <button className={`tool wide ${options.terrainMode === 'brush' ? 'active' : ''}`} onClick={() => set({ terrainMode: 'brush' })} title="Pennello: trascina per dipingere">
          <Paintbrush size={14} /> Pennello
        </button>
        <button className={`tool wide ${options.terrainMode === 'rect' ? 'active' : ''}`} onClick={() => set({ terrainMode: 'rect' })} title="Rettangolo: trascina per riempire un’area (una stanza)">
          <Square size={14} /> Rettangolo
        </button>
        <button className={`tool wide ${options.terrainMode === 'fill' ? 'active' : ''}`} onClick={() => set({ terrainMode: 'fill' })} title="Secchiello: clic per riempire una zona uguale">
          <PaintBucket size={14} /> Riempi
        </button>
        {options.terrainMode === 'brush' && (
          <>
            <span className="vsep" />
            {SIZES.map((n) => (
              <button key={n} className={`tool ${options.brushSize === n ? 'active' : ''}`} onClick={() => set({ brushSize: n })} title={`Pennello di ${n} ${n === 1 ? 'casella' : 'caselle'}`} aria-label={`Pennello ${n}`}>
                <span className="stroke-dot" style={{ width: 3 + n * 2.4, height: 3 + n * 2.4 }} />
              </button>
            ))}
          </>
        )}
        <span className="vsep" />
        <button className={`tool ${erasing ? 'active' : ''}`} onClick={() => set({ terrain: EMPTY_TERRAIN })} title="Gomma: toglie il terreno (resta l’immagine della scena, se c’è)" aria-label="Gomma">
          <Eraser size={15} />
        </button>
        <button
          className={`tool wide ${autoWalls ? 'active' : ''}`}
          aria-pressed={autoWalls}
          onClick={() => dispatch({ type: 'scene.update', sceneId: scene.id, patch: { autoWalls: !autoWalls } })}
          title="Muri automatici: la roccia e i bordi delle stanze bloccano vista e movimento. Le porte si mettono con lo strumento Muri."
        >
          <BrickWall size={14} /> Muri automatici
        </button>
        {scene.terrain && (
          <button className="tool" onClick={() => dispatch({ type: 'terrain.set', sceneId: scene.id, terrain: null })} title="Cancella tutta la mappa dipinta (si può annullare)" aria-label="Cancella la mappa dipinta">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="terrain-row terrain-palette" role="radiogroup" aria-label="Terreno">
        {TERRAINS.map((t) => (
          <button
            key={t.code}
            role="radio"
            aria-checked={options.terrain === t.code}
            aria-label={t.name}
            title={t.name}
            className={`terrain-swatch ${options.terrain === t.code ? 'on' : ''}`}
            style={{ backgroundImage: `url(${thumb(t.code)})` }}
            onClick={() => set({ terrain: t.code })}
          />
        ))}
        <span className="terrain-name small">{erasing ? 'Gomma' : current?.name}</span>
      </div>
    </div>
  );
}

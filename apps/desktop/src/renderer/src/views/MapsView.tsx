import {
  autoRivers,
  autoSymbols,
  autoTowns,
  createWorld,
  decodeField,
  generateWorld,
  newId,
  WORLD_FILE_EXT,
  WORLD_SIZES,
  type MapPackage,
  type WorldMap,
  type WorldShape,
} from '@thevtt/shared';
import { Copy, Download, Globe2, Map as MapIcon, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NewCard } from '../components/Cards';
import { Modal, PageHeader } from '../components/ui';
import { deleteMap, listMaps, loadMap, mapFile, readMapFile, saveMap, updateMap, type LibraryEntry } from '../lib/mapLibrary';
import { useApp } from '../store/app';
import { SceneStudio } from '../studio/SceneStudio';
import { WorldEditor } from '../studio/WorldEditor';
import { deleteWorld, listWorlds, loadWorld, readWorldFile, saveWorld, worldFile, type WorldEntry } from '../studio/worldLibrary';
import { download } from '../table/sceneImage';

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The map studio's library: the worlds and the maps for the table, kept on
 * this computer for every campaign. From here they open in the studio, go to
 * other GMs as files, or come in from theirs.
 */
export function MapsView() {
  const { go, toast } = useApp();
  const [worlds, setWorlds] = useState<WorldEntry[] | null>(null);
  const [maps, setMaps] = useState<LibraryEntry[] | null>(null);
  const [q, setQ] = useState('');
  const [newWorld, setNewWorld] = useState(false);
  const [newScene, setNewScene] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'world' | 'scene'; id: string; name: string } | null>(null);
  const reload = () => {
    void listWorlds().then(setWorlds);
    void listMaps().then(setMaps);
  };
  useEffect(reload, []);
  const needle = q.trim().toLowerCase();
  const shownWorlds = useMemo(() => (worlds ?? []).filter((w) => !needle || w.name.toLowerCase().includes(needle)), [worlds, needle]);
  const shownMaps = useMemo(() => (maps ?? []).filter((m) => !needle || m.name.toLowerCase().includes(needle)), [maps, needle]);

  const importFiles = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      try {
        if (file.name.endsWith(`.${WORLD_FILE_EXT}`)) {
          // a copy of someone else's world gets its own id
          const w = await readWorldFile(file);
          await saveWorld({ ...w, id: newId() });
          toast(`Mondo «${w.name}» aggiunto`, 'success');
        } else {
          const pkg = await readMapFile(file);
          await saveMap(pkg);
          toast(`Mappa «${pkg.name}» aggiunta`, 'success');
        }
      } catch (e) {
        toast(`${file.name}: ${e instanceof Error ? e.message : 'file non valido'}`, 'error');
      }
    }
    reload();
  };

  const remove = async () => {
    if (!confirm) return;
    if (confirm.kind === 'world') await deleteWorld(confirm.id);
    else await deleteMap(confirm.id);
    setConfirm(null);
    reload();
  };

  return (
    <div className="page wide">
      <PageHeader seed={21} title="Mappe" subtitle="Il tavolo del cartografo: mondi da esplorare e mappe per le sessioni, pronti per ogni campagna.">
        <div className="row" style={{ position: 'relative' }}>
          <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
          <input className="input" style={{ paddingLeft: 30, width: 200 }} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca nelle mappe" />
        </div>
        <label className="btn ghost" title={`Un mondo (.${WORLD_FILE_EXT}), una mappa di TheVTT o di Dungeondraft, Dungeon Alchemist e simili (.dd2vtt, .uvtt)`}>
          <Upload size={14} /> Importa
          <input type="file" accept=".thevtt-world,.thevtt-map,.dd2vtt,.uvtt,.df2vtt,application/json" multiple hidden aria-label="Importa mappe" onChange={(e) => void importFiles(e.target.files).then(() => (e.target.value = ''))} />
        </label>
      </PageHeader>

      <section className="col" style={{ gap: 'var(--s3)' }}>
        <div className="row between">
          <h2 className="row" style={{ gap: 8 }}>
            <Globe2 size={18} /> Mondi
          </h2>
          <button className="btn" onClick={() => setNewWorld(true)}>
            Nuovo mondo
          </button>
        </div>
        <div className="tile-grid">
          {shownWorlds.map((w) => (
            <div key={w.id} className="tile clickable map-tile" onClick={() => go({ name: 'studio', kind: 'world', id: w.id })}>
              <div className="tile-cover" style={{ backgroundImage: `url(${w.thumb})` }} />
              <div className="tile-body">
                <span className="tile-title ellipsis">{w.name}</span>
                <span className="meta">
                  {w.width}×{w.height} · {when(w.savedAt)}
                </span>
                <div className="row map-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost sm icon" title="Apri nello studio" aria-label={`Apri ${w.name}`} onClick={() => go({ name: 'studio', kind: 'world', id: w.id })}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn ghost sm icon"
                    title="Duplica"
                    aria-label={`Duplica ${w.name}`}
                    onClick={async () => {
                      const full = await loadWorld(w.id);
                      if (!full) return;
                      await saveWorld({ ...full, id: newId(), name: `${full.name} (copia)` });
                      reload();
                    }}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn ghost sm icon"
                    title="Esporta come file"
                    aria-label={`Esporta ${w.name}`}
                    onClick={async () => {
                      const full = await loadWorld(w.id);
                      if (!full) return;
                      const f = worldFile(full);
                      download(f.href, f.name);
                    }}
                  >
                    <Download size={13} />
                  </button>
                  <button className="btn ghost sm icon" title="Elimina" aria-label={`Elimina ${w.name}`} onClick={() => setConfirm({ kind: 'world', id: w.id, name: w.name })}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {worlds && !needle && <NewCard label={worlds.length ? 'Nuovo mondo' : 'Crea il tuo primo mondo'} onClick={() => setNewWorld(true)} />}
        </div>
      </section>

      <section className="col" style={{ gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
        <div className="row between">
          <h2 className="row" style={{ gap: 8 }}>
            <MapIcon size={18} /> Mappe per il tavolo
          </h2>
          <button className="btn" onClick={() => setNewScene(true)}>
            Nuova mappa
          </button>
        </div>
        <p className="muted small">Dungeon, città, radure: terreno, muri e porte, luci e oggetti. Al tavolo si usano da Scena › Libreria.</p>
        <div className="tile-grid">
          {shownMaps.map((m) => (
            <div key={m.id} className="tile clickable map-tile" onClick={() => go({ name: 'studio', kind: 'scene', id: m.id })}>
              <div className="tile-cover" style={{ backgroundImage: `url(${m.thumb})` }} />
              <div className="tile-body">
                <span className="tile-title ellipsis">{m.name}</span>
                <span className="meta">
                  {m.info.width}×{m.info.height} caselle · {when(m.savedAt)}
                </span>
                <div className="row map-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost sm icon" title="Apri nello studio" aria-label={`Apri ${m.name}`} onClick={() => go({ name: 'studio', kind: 'scene', id: m.id })}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn ghost sm icon"
                    title="Duplica"
                    aria-label={`Duplica ${m.name}`}
                    onClick={async () => {
                      const pkg = await loadMap(m.id);
                      if (!pkg) return;
                      await saveMap({ ...pkg, name: `${pkg.name} (copia)`, scene: { ...pkg.scene, name: `${pkg.name} (copia)` } });
                      reload();
                    }}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn ghost sm icon"
                    title="Esporta come file"
                    aria-label={`Esporta ${m.name}`}
                    onClick={async () => {
                      const pkg = await loadMap(m.id);
                      if (!pkg) return;
                      const f = mapFile(pkg);
                      download(f.href, f.name);
                    }}
                  >
                    <Download size={13} />
                  </button>
                  <button className="btn ghost sm icon" title="Elimina" aria-label={`Elimina ${m.name}`} onClick={() => setConfirm({ kind: 'scene', id: m.id, name: m.name })}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {maps && !needle && <NewCard label={maps.length ? 'Nuova mappa' : 'Crea la tua prima mappa'} onClick={() => setNewScene(true)} />}
        </div>
      </section>

      {newWorld && <NewWorldDialog onClose={() => setNewWorld(false)} onCreated={(id) => go({ name: 'studio', kind: 'world', id })} />}
      {newScene && <NewSceneDialog onClose={() => setNewScene(false)} onCreated={(id) => go({ name: 'studio', kind: 'scene', id })} />}
      {confirm && (
        <Modal
          title={`Eliminare «${confirm.name}»?`}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Annulla
              </button>
              <button className="btn danger" onClick={() => void remove()}>
                Elimina
              </button>
            </>
          }
        >
          <p className="small muted">Le scene già create con questa mappa nelle campagne restano. Si può recuperare solo da un backup.</p>
        </Modal>
      )}
    </div>
  );
}

const START_SHAPES: { id: WorldShape | 'empty'; label: string }[] = [
  { id: 'continent', label: 'Continente' },
  { id: 'islands', label: 'Isole' },
  { id: 'archipelago', label: 'Arcipelago' },
  { id: 'coast', label: 'Costa' },
  { id: 'pangea', label: 'Supercontinente' },
  { id: 'empty', label: 'Solo mare' },
];

function NewWorldDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [size, setSize] = useState<(typeof WORLD_SIZES)[number]['id']>('continent');
  const [shape, setShape] = useState<WorldShape | 'empty'>('continent');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const s = WORLD_SIZES.find((x) => x.id === size)!;
    const seed = Math.floor(Math.random() * 100000);
    let w: WorldMap = createWorld({ id: newId(), name: name.trim() || 'Nuovo mondo', width: s.width, height: s.height, seed });
    if (shape !== 'empty') {
      w = generateWorld(w, { seed, shape, land: shape === 'pangea' ? 0.6 : shape === 'archipelago' ? 0.25 : 0.4, roughness: 0.5 });
      const h = decodeField(w.heights, w.cols * w.rows);
      const b = decodeField(w.biomes, w.cols * w.rows);
      w = { ...w, rivers: autoRivers(w, h, 7), symbols: [...autoSymbols(w, h, b), ...autoTowns(w, h, 10)], compass: { x: w.width - 110, y: w.height - 130, size: 150 } };
    }
    await saveWorld(w);
    onCreated(w.id);
  };
  return (
    <Modal
      title="Nuovo mondo"
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void create()}>
            {busy ? 'Creo il mondo…' : 'Crea'}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 'var(--s4)' }}>
        <label className="field">
          <span>Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Le Terre di Mezzo… o quasi" autoFocus />
        </label>
        <div className="col" style={{ gap: 6 }}>
          <span className="small muted">Grandezza</span>
          <div className="seg row">
            {WORLD_SIZES.map((s) => (
              <button key={s.id} className={size === s.id ? 'on' : ''} onClick={() => setSize(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <span className="small muted">Per cominciare</span>
          <div className="row wrap" style={{ gap: 4 }}>
            {START_SHAPES.map((s) => (
              <button key={s.id} className={`chip ${shape === s.id ? 'on' : ''}`} onClick={() => setShape(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <span className="faint tiny">Terre, fiumi, monti, boschi e città fatti al momento: poi si modella tutto a mano, o si rigenera con «Genera».</span>
        </div>
      </div>
    </Modal>
  );
}

function NewSceneDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [w, setW] = useState(30);
  const [h, setH] = useState(20);
  const create = async () => {
    const label = name.trim() || 'Nuova mappa';
    const pkg: MapPackage = {
      format: 'thevtt-map',
      version: 1,
      name: label,
      scene: { name: label, background: null, widthCells: w, heightCells: h, cellDistance: 1.5, unit: 'm', showGrid: true },
      walls: [],
      props: [],
      drawings: [],
      tokens: [],
      assets: {},
    };
    const id = newId();
    await updateMap(id, pkg);
    onCreated(id);
  };
  return (
    <Modal
      title="Nuova mappa per il tavolo"
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={() => void create()}>
            Crea
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 'var(--s4)' }}>
        <label className="field">
          <span>Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="La cripta sotto il mulino" autoFocus />
        </label>
        <div className="row" style={{ gap: 'var(--s3)' }}>
          <label className="field grow">
            <span>Larghezza (caselle)</span>
            <input className="input num" type="number" min={5} max={200} value={w} onChange={(e) => setW(Math.max(5, Math.min(200, Number(e.target.value) || 5)))} />
          </label>
          <label className="field grow">
            <span>Altezza (caselle)</span>
            <input className="input num" type="number" min={5} max={200} value={h} onChange={(e) => setH(Math.max(5, Math.min(200, Number(e.target.value) || 5)))} />
          </label>
        </div>
        <span className="faint tiny">Dentro trovi anche il generatore di dungeon, caverne e terre selvagge, e le stanze pronte.</span>
      </div>
    </Modal>
  );
}

/** A world or a map open in the studio, full screen like the table. */
export function StudioView({ kind, id }: { kind: 'world' | 'scene'; id: string }) {
  const { go, toast } = useApp();
  const [world, setWorld] = useState<WorldMap | null>(null);
  const [pkg, setPkg] = useState<MapPackage | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    if (kind === 'world') void loadWorld(id).then((w) => alive && (w ? setWorld(w) : setMissing(true)));
    else void loadMap(id).then((p) => alive && (p ? setPkg(p) : setMissing(true)));
    return () => {
      alive = false;
    };
  }, [kind, id]);
  useEffect(() => {
    if (missing) {
      toast('Questa mappa non si trova più sul disco', 'error');
      go({ name: 'maps' });
    }
  }, [missing]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => go({ name: 'maps' });
  if (kind === 'world') return world ? <WorldEditor initial={world} onClose={close} onOpenMap={(mapId) => go({ name: 'studio', kind: 'scene', id: mapId })} /> : <div className="stage-message"><div className="spinner" /></div>;
  return pkg ? <SceneStudio entryId={id} pkg={pkg} onClose={close} /> : <div className="stage-message"><div className="spinner" /></div>;
}

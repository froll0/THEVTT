import { newId, type GameAction } from '@thevtt/shared';
import { warhammer } from '@thevtt/systems';
import { Castle, Route, Skull } from 'lucide-react';
import { useApp } from '../store/app';
import { useState } from 'react';
import { useTable } from '../store/table';

const MODES = ['a piedi', 'a cavallo', 'in carrozza', 'su un barcone lungo il fiume', 'con una carovana'];
const ROAD_HAZARDS = warhammer.HAZARDS.filter((h) => h.group === 'Pericoli di Viaggio');

/**
 * GM, Warhammer: a journey a day at a time. Each day the clock moves on and,
 * with a Hazard, the characters' tokens on the map test Sopravvivenza.
 */
export function TravelPanel() {
  const { state, dispatch } = useTable();
  const [from, setFrom] = useState('Talagaad');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState(MODES[0]!);
  const [days, setDays] = useState(3);
  const [hazard, setHazard] = useState<string>(ROAD_HAZARDS[0]?.name ?? '');
  if (!state) return null;
  const t = state.travel;
  const party = Object.values(state.tokens).filter((x) => x.sceneId === state.activeSceneId && x.pool && (x.characterId || x.ownerIds.length));
  const day = () => {
    const h = ROAD_HAZARDS.find((x) => x.name === hazard);
    dispatch({
      type: 'travel.day',
      tokenIds: party.map((x) => x.id),
      hazard: h ? { label: h.name, grade: h.grade, condition: h.condition, noWound: h.noWound } : undefined,
    });
  };
  return (
    <div className="panel-body col travel">
      <TalagaadStart />
      <span className="section-title">Viaggio</span>
      {!t ? (
        <>
          <div className="fields two">
            <label className="field">
              <span>Da</span>
              <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span>A</span>
              <input className="input" placeholder="Küsel" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="fields two">
            <label className="field">
              <span>Come</span>
              <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Giorni previsti</span>
              <input className="input num" type="number" min={0} max={365} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} />
            </label>
          </div>
          <button className="btn primary" disabled={!to.trim()} onClick={() => dispatch({ type: 'travel.set', travel: { from, to, mode, days } })}>
            <Route size={14} /> Si parte
          </button>
          <p className="faint tiny">
            Metti la mappa regionale (Libreria di mappe → Mappe del manuale) e i token dei personaggi: ogni giorno l’orologio avanza e, se c’è un Pericolo, ognuno tira Sopravvivenza. Un mezzo di Trasporto si paga con il suo Status (Guida del Giocatore).
          </p>
        </>
      ) : (
        <>
          <div className="travel-card">
            <b>
              {t.from ? `${t.from} → ` : ''}
              {t.to}
            </b>
            <span className="small muted">
              {t.mode} · giorno {t.day}
              {t.days ? ` di ${t.days}` : ''}
            </span>
            {t.days > 0 && (
              <div className="progress">
                <i style={{ width: `${Math.min(100, (t.day / t.days) * 100)}%` }} />
              </div>
            )}
          </div>
          <label className="field">
            <span>Pericolo di oggi</span>
            <select className="select" value={hazard} onChange={(e) => setHazard(e.target.value)}>
              <option value="">Nessuno: una giornata tranquilla</option>
              {ROAD_HAZARDS.map((h) => (
                <option key={h.name} value={h.name}>
                  {h.name} (Grado {h.grade})
                </option>
              ))}
            </select>
          </label>
          <span className="faint tiny">
            {hazard ? (party.length ? `Tirano Sopravvivenza: ${party.map((x) => x.name).join(', ')}` : 'Nessun personaggio sulla mappa: metti i loro token per far tirare Sopravvivenza.') : 'Nessuna prova oggi.'}
          </span>
          <button className="btn primary" onClick={day}>
            <Route size={14} /> Un giorno di viaggio
          </button>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'pool.dayEnd' })} title="Tempra contro le infezioni per chi è stato ferito oggi, Volontà per chi è stato esposto al Caos">
              Fine della giornata
            </button>
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'travel.set', travel: null })}>
              Arrivati
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** GM, Warhammer: Talagaad ready as a scene, and a Tetro Presagio prepared to start the campaign. */
export function TalagaadStart() {
  const { state, dispatch } = useTable();
  const toast = useApp((s) => s.toast);
  if (!state) return null;
  const hasTown = Object.values(state.scenes).some((sc) => sc.name === 'Talagaad');
  const createTown = () => {
    const id = `tal-${newId()}`;
    const { w, h } = warhammer.TALAGAAD_SIZE;
    const actions: GameAction[] = [
      { type: 'scene.create', name: 'Talagaad', id },
      { type: 'scene.update', sceneId: id, patch: { widthCells: w, heightCells: h, autoWalls: false, showGrid: false, cellDistance: 50, unit: 'm', daylight: true } },
      { type: 'terrain.set', sceneId: id, terrain: warhammer.talagaadTerrain() },
      ...warhammer.QUARTERS.map((q): GameAction => ({ type: 'zone.create', sceneId: id, zone: { name: q.name, x: q.x, y: q.y, w: q.w, h: q.h, color: q.color } })),
    ];
    dispatch({ type: 'batch', actions });
    toast('Talagaad è una nuova scena: la trovi tra le scene', 'success');
  };
  const prepare = (o: warhammer.Omen) => {
    dispatch({
      type: 'batch',
      actions: [
        { type: 'note.create', note: { title: `Tetro Presagio: ${o.name}`, body: warhammer.omenNote(o), shared: 'private' } },
        { type: 'quest.save', quest: { title: o.name, description: o.hook, status: 'active', visible: false, objectives: o.objectives.map((text) => ({ id: newId(), text, done: false })) } },
      ],
    });
    toast(`«${o.name}»: nota per il master e missione nascosta pronte`, 'success');
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="section-title">Talagaad</span>
      <button className="btn" disabled={hasTown} onClick={createTown} title="Una scena con i quartieri del porto come Zone, il Talabec e il Viadotto del Mago">
        <Castle size={14} /> {hasTown ? 'La scena di Talagaad c’è già' : 'Crea la scena di Talagaad'}
      </button>
      <span className="section-title">Tetri Presagi per iniziare</span>
      {warhammer.OMENS.map((o) => (
        <div key={o.id} className="omen-card">
          <b>{o.name}</b>
          <span className="small muted">{o.hook}</span>
          <div className="row between">
            <span className="faint tiny">Guida del Gamemaster, p. {o.page}</span>
            <button className="btn sm" onClick={() => prepare(o)}>
              <Skull size={13} /> Prepara
            </button>
          </div>
        </div>
      ))}
      <span className="faint tiny">«Prepara» scrive una nota solo per te (riassunto, sviluppi, Tetri Richiami) e una missione nascosta con gli obiettivi: la mostri ai giocatori quando serve.</span>
    </div>
  );
}

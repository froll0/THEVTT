import { describeRoll, isNat, type Ambient, type Light, type LogEntry, type Note, type Prop, type Scene, type Token, type TokenPatch } from '@thevtt/shared';
import { cellsToMetres, LIGHT_PRESETS, metresToCells, propKind } from './props';
import { dnd5e, getSystem } from '@thevtt/systems';
import { ConditionIcon } from '../components/ConditionIcon';
import { ChevronLeft, Copy, Dices, RotateCcw, RotateCw, ChevronRight, Eye, EyeOff, ImagePlus, Lock, MapPinned, Plus, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, readImage, Switch } from '../components/ui';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { useWindows } from '../store/windows';
import { getSystemUi } from '../systems';

/** Initiative bonus of a token: from its character sheet or its bestiary entry. */
export function initiativeModifier(state: NonNullable<ReturnType<typeof useTable.getState>['state']>, t: Token): number {
  const system = getSystem(state.systemId);
  const character = t.characterId ? state.characters[t.characterId] : undefined;
  if (character && system) return system.tokenDefaults(character.data).initiativeModifier;
  if (t.monsterId) return getSystemUi(state.systemId)?.monsterInitiative?.(t.monsterId) ?? 0;
  return 0;
}

const time = (ts: number) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// ---------- chat & dice log ----------

function LogLine({
  e,
  meId,
  onRoll,
  target,
}: {
  e: LogEntry;
  meId: string;
  onRoll: (formula: string, label: string) => void;
  /** selected token that this roll can be applied to */
  target?: { name: string; apply: (delta: number) => void };
}) {
  if (e.kind === 'system') return <div className="log-system">{e.text}</div>;
  const mine = e.authorId === meId;
  if (e.kind === 'card' && e.card) {
    const c = e.card;
    return (
      <div className="log-card">
        <div className="row between small">
          <b>{e.authorName}</b>
          <span className="faint tiny">
            {e.private && <Lock size={10} />} {time(e.ts)}
          </span>
        </div>
        <div className="card-title">{c.title}</div>
        {c.subtitle && <div className="faint tiny">{c.subtitle}</div>}
        {c.tags && c.tags.length > 0 && (
          <div className="card-tags">
            {c.tags.filter(Boolean).map((t, i) => (
              <span key={i} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
        {c.body && (
          <details className="card-body" open={c.body.length < 220}>
            <summary className="faint tiny">Descrizione</summary>
            <p className="selectable">{c.body}</p>
          </details>
        )}
        {c.rolls && c.rolls.length > 0 && (
          <div className="row wrap" style={{ gap: 4 }}>
            {c.rolls.map((r, i) => (
              <button key={i} className="btn sm" onClick={() => onRoll(r.formula, `${c.title} · ${r.label}`)}>
                <Dices size={13} /> {r.label} <span className="mono faint">{r.formula}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (e.kind === 'roll' && e.blind && !e.roll) {
    return (
      <div className="log-roll">
        <div className="row between small">
          <span>
            <b>{e.authorName}</b> {e.label && <span className="muted">· {e.label}</span>}
          </span>
          <span className="faint">{time(e.ts)}</span>
        </div>
        <div className="row between">
          <span className="faint small">Tiro alla cieca: il risultato lo vede solo il master</span>
          <span className="roll-total">?</span>
        </div>
      </div>
    );
  }
  if (e.kind === 'roll' && e.roll) {
    const crit = isNat(e.roll, 20) && e.roll.parts.some((p) => p.type === 'dice' && p.sides === 20);
    const fumble = isNat(e.roll, 1) && e.roll.parts.some((p) => p.type === 'dice' && p.sides === 20);
    return (
      <div className={`log-roll ${crit ? 'crit' : ''} ${fumble ? 'fumble' : ''}`}>
        <div className="row between small">
          <span>
            <b>{e.authorName}</b> {e.label && <span className="muted">· {e.label}</span>}
          </span>
          <span className="faint">
            {e.blind ? <span className="badge">alla cieca</span> : e.private && <Lock size={10} />} {time(e.ts)}
          </span>
        </div>
        <div className="row between">
          <span className="mono faint small">
            {e.roll.formula} → {describeRoll(e.roll).replace(/~(\d+)~/g, '($1)')}
          </span>
          <span className="roll-total">{e.roll.total}</span>
        </div>
        {target && e.roll.total > 0 && (
          <div className="roll-apply">
            <span className="faint tiny ellipsis">a {target.name}:</span>
            <button className="btn ghost sm" title="Infliggi come danni" onClick={() => target.apply(-e.roll!.total)}>
              −{e.roll.total}
            </button>
            <button className="btn ghost sm" title="Metà danni (tiro salvezza riuscito)" onClick={() => target.apply(-Math.floor(e.roll!.total / 2))}>
              −½
            </button>
            <button className="btn ghost sm" title="Cura" onClick={() => target.apply(e.roll!.total)}>
              +{e.roll.total}
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`log-chat ${mine ? 'mine' : ''}`}>
      <div className="small">
        <b className="who">{e.authorName}</b> <span className="faint tiny">{time(e.ts)}</span> {e.private && <span className="badge">privato</span>}
      </div>
      <div className="log-text">{e.text}</div>
    </div>
  );
}

export function ChatPanel() {
  const { state, dispatch, role, selectedTokenId } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const log = state?.log ?? [];
  const sel = selectedTokenId ? state?.tokens[selectedTokenId] : undefined;
  // damage or heal the selected token straight from a roll (GM, or the token's owner)
  const target =
    sel?.hp && (role === 'gm' || sel.ownerIds.includes(meId))
      ? {
          name: sel.name,
          apply: (delta: number) => {
            const hp = sel.hp!;
            dispatch({ type: 'token.update', tokenId: sel.id, patch: { hp: { ...hp, current: Math.min(hp.max, Math.max(0, hp.current + delta)) } } });
          },
        }
      : undefined;

  useEffect(() => {
    // braces matter: recent Chromium returns a Promise from scrollIntoView, which React would take for a cleanup
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const m = /^\/(r|roll|gr|br)\s+(.+)$/i.exec(t);
    const kind = m?.[1]!.toLowerCase();
    if (m) dispatch({ type: 'roll', formula: m[2]!, private: kind === 'gr', blind: kind === 'br' });
    else if (/^\/gm\s+/i.test(t)) dispatch({ type: 'chat', text: t.replace(/^\/gm\s+/i, ''), private: true });
    else dispatch({ type: 'chat', text: t });
    setText('');
  };

  return (
    <div className="panel-body chat">
      <div className="log">
        {log.length === 0 && <p className="faint small center">Nessun messaggio. Prova /r 1d20+5</p>}
        {log.map((e) => (
          <LogLine key={e.id} e={e} meId={meId} onRoll={(formula, label) => dispatch({ type: 'roll', formula, label })} target={target} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          className="input"
          value={text}
          placeholder={role === 'gm' ? 'Messaggio, /r 2d6+3, /gr tiro nascosto' : 'Messaggio, /r 1d20+4, /br alla cieca, /gm al master'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
      </div>
    </div>
  );
}

// ---------- initiative ----------

export function InitiativePanel() {
  const { state, dispatch, role } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  if (!state) return null;
  const ini = state.initiative;
  const isGm = role === 'gm';
  const current = ini.entries[ini.turn];
  const myTurn = !!current?.tokenId && !!state.tokens[current.tokenId]?.ownerIds.includes(meId);

  return (
    <div className="panel-body col">
      <div className="row between">
        <span className="muted small">{ini.round > 0 ? `Round ${ini.round}` : 'Combattimento non iniziato'}</span>
        <div className="row">
          {isGm && (
            <button className="btn ghost sm icon" onClick={() => dispatch({ type: 'initiative.prev' })} aria-label="Turno precedente">
              <ChevronLeft size={15} />
            </button>
          )}
          {(isGm || (myTurn && ini.round > 0)) && (
            <button className="btn primary sm" disabled={!ini.entries.length} onClick={() => dispatch({ type: 'initiative.next' })}>
              {ini.round === 0 ? 'Inizia' : myTurn && !isGm ? 'Fine turno' : 'Avanti'} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="initiative">
        {ini.entries.map((e, i) => {
          const t = e.tokenId ? state.tokens[e.tokenId] : undefined;
          return (
            <div key={e.id} className={`ini-row ${ini.round > 0 && i === ini.turn ? 'active' : ''}`}>
              <span className="ini-dot" style={{ background: t?.color ?? 'var(--fg-faint)' }} />
              <span className="grow ellipsis">{e.name}</span>
              {isGm ? (
                <input
                  key={e.value}
                  className="input ini-value"
                  type="number"
                  defaultValue={e.value}
                  onBlur={(ev) => Number(ev.target.value) !== e.value && dispatch({ type: 'initiative.set', entryId: e.id, value: Number(ev.target.value) })}
                />
              ) : (
                <b>{e.value}</b>
              )}
              {isGm && (
                <button className="btn ghost sm icon" onClick={() => dispatch({ type: 'initiative.remove', entryId: e.id })} aria-label="Rimuovi">
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
        {!ini.entries.length && <p className="faint small">Seleziona un token e premi «Iniziativa», oppure aggiungi una voce.</p>}
      </div>
      {isGm && (
        <>
          <button
            className="btn sm"
            onClick={() => {
              const already = new Set(ini.entries.map((e) => e.tokenId));
              for (const t of Object.values(state.tokens)) {
                if (t.sceneId !== state.activeSceneId || already.has(t.id)) continue;
                dispatch({ type: 'initiative.add', name: t.name, tokenId: t.id, modifier: initiativeModifier(state, t) });
              }
            }}
          >
            <Swords size={14} /> Tira per tutti i token
          </button>
          <div className="row">
            <input className="input grow" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" style={{ width: 64 }} placeholder="Val" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
            <button
              className="btn sm icon"
              disabled={!name.trim()}
              onClick={() => {
                dispatch({ type: 'initiative.add', name: name.trim(), value: value === '' ? undefined : Number(value) });
                setName('');
                setValue('');
              }}
              aria-label="Aggiungi"
            >
              <Plus size={14} />
            </button>
          </div>
          {ini.entries.length > 0 && (
            <button className="btn ghost sm danger" onClick={() => dispatch({ type: 'initiative.clear' })}>
              Termina combattimento
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------- character sheet ----------

/** Dock tab: the characters at the table (the GM's all of them, a player's own). Each opens in its own window. */
export function SheetPanel() {
  const { state, role } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const open = useWindows((s) => s.open);
  const windows = useWindows((s) => s.windows);
  const isGm = role === 'gm';
  const characters = useMemo(() => Object.values(state?.characters ?? {}), [state?.characters]);
  if (!state) return null;
  const system = getSystem(state.systemId);
  if (!system) return <div className="panel-body muted small">Sistema di gioco non supportato.</div>;
  const assigned = state.players[meId]?.characterId;
  const list = [...characters].sort((a, b) => Number(b.id === assigned) - Number(a.id === assigned));

  return (
    <div className="panel-body col">
      {list.length === 0 && (
        <p className="muted small">{isGm ? 'Nessun personaggio al tavolo. I giocatori li assegnano dalla pagina della campagna.' : 'Non hai un personaggio in questa campagna. Assegnalo dalla pagina della campagna.'}</p>
      )}
      <div className="char-list">
        {list.map((c) => {
          const d = system.tokenDefaults(c.data);
          const portrait = (c.data as { portrait?: string } | null)?.portrait;
          const owner = state.players[c.ownerId];
          const isOpen = windows.some((w) => w.id === `sheet:${c.id}`);
          return (
            <button key={c.id} className={`char-row ${isOpen ? 'active' : ''}`} onClick={() => open('sheet', c.id, c.name)} title="Apri la scheda in una finestra">
              <span className="portrait" style={{ width: 34, height: 34, backgroundImage: portrait ? `url(${portrait})` : undefined, borderColor: owner?.color }}>
                {!portrait && (c.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="col grow" style={{ gap: 0, minWidth: 0 }}>
                <b className="ellipsis">{c.name}</b>
                <span className="faint tiny ellipsis">
                  {system.headline?.(c.data) ?? ''}
                  {isGm ? ` · ${owner?.displayName ?? '—'}` : ''}
                </span>
              </span>
              {d.hp && (
                <span className="char-stat" title="Punti ferita">
                  <small>PF</small>
                  {d.hp.current}/{d.hp.max}
                </span>
              )}
              {d.ac != null && (
                <span className="char-stat" title="Classe armatura">
                  <small>CA</small>
                  {d.ac}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {list.length > 0 && <p className="faint tiny">Le schede si aprono in finestre che puoi spostare, allargare e ridurre.</p>}
    </div>
  );
}

/** Contents of a character sheet window. */
export function SheetWindow({ characterId, width, placeAt }: { characterId: string; width: number; placeAt: () => { x: number; y: number } }) {
  const { state, dispatch, role } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  if (!state) return null;
  const selected = state.characters[characterId];
  const system = getSystem(state.systemId);
  const ui = getSystemUi(state.systemId);
  if (!selected || !system || !ui) return <p className="muted small">Questo personaggio non è più al tavolo.</p>;
  const isGm = role === 'gm';
  const onMap = Object.values(state.tokens).find((t) => t.characterId === selected.id && t.sceneId === state.activeSceneId);
  const place = () => {
    const d = system.tokenDefaults(selected.data);
    const owner = state.players[selected.ownerId];
    dispatch({
      type: 'token.create',
      token: {
        name: selected.name,
        characterId: selected.id,
        ...placeAt(),
        size: d.size,
        hp: d.hp,
        ac: d.ac,
        ownerIds: [selected.ownerId],
        color: owner?.color,
        darkvision: d.darkvision && state.scenes[state.activeSceneId] ? metresToCells(state.scenes[state.activeSceneId]!, d.darkvision) : 0,
      },
    });
  };
  return (
    <div className="col">
      {!onMap && (isGm || selected.ownerId === meId) && (
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={place}>
          <MapPinned size={14} /> Metti sulla mappa
        </button>
      )}
      <ui.Sheet
        data={selected.data}
        compact={width < 620}
        editable={isGm || selected.ownerId === meId}
        onChange={(data) => {
          dispatch({ type: 'character.update', characterId: selected.id, data });
          // keep the linked token in sync
          const d = system.tokenDefaults(data);
          for (const t of Object.values(state.tokens)) {
            if (t.characterId === selected.id && d.hp) dispatch({ type: 'token.update', tokenId: t.id, patch: { hp: d.hp } });
          }
        }}
        onRoll={(formula, label) => dispatch({ type: 'roll', formula, label: `${selected.name} · ${label}` })}
        onShare={(card) => dispatch({ type: 'card', card: { ...card, subtitle: [selected.name, card.subtitle].filter(Boolean).join(' · ') } })}
      />
    </div>
  );
}

// ---------- bestiary (GM) ----------

export function BestiaryPanel({ placeAt }: { placeAt: () => { x: number; y: number } }) {
  const { state, dispatch } = useTable();
  if (!state) return null;
  const ui = getSystemUi(state.systemId);
  if (!ui?.Bestiary) return <div className="panel-body muted small">Nessun bestiario per questo sistema.</div>;
  return (
    <div className="panel-body">
      <ui.Bestiary
        onAdd={(token) => {
          const scene = state.scenes[state.activeSceneId];
          const darkvision = token.darkvision && scene ? metresToCells(scene, token.darkvision) : 0;
          useTable.getState().selectNextToken();
          dispatch({ type: 'token.create', token: { ...token, darkvision, ...placeAt(), color: '#8b8b93' } });
        }}
        onRoll={(formula, label) => dispatch({ type: 'roll', formula, label, private: true })}
      />
    </div>
  );
}

// ---------- scenes (GM) ----------

export function ScenePanel() {
  const { state, dispatch } = useTable();
  const [newName, setNewName] = useState('');
  if (!state) return null;
  const active = state.scenes[state.activeSceneId]!;

  return (
    <div className="panel-body col">
      <div className="section-title">Scene</div>
      <div className="initiative">
        {Object.values(state.scenes).map((s) => (
          <div key={s.id} className={`ini-row ${s.id === state.activeSceneId ? 'active' : ''}`}>
            <span className="grow ellipsis">{s.name}</span>
            {s.id !== state.activeSceneId && (
              <button className="btn ghost sm" onClick={() => dispatch({ type: 'scene.activate', sceneId: s.id })}>
                Attiva
              </button>
            )}
            {Object.keys(state.scenes).length > 1 && (
              <button className="btn ghost sm icon" onClick={() => dispatch({ type: 'scene.delete', sceneId: s.id })} aria-label="Elimina scena">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="row">
        <input className="input grow" placeholder="Nuova scena" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn sm icon" disabled={!newName.trim()} onClick={() => { dispatch({ type: 'scene.create', name: newName }); setNewName(''); }} aria-label="Crea scena">
          <Plus size={14} />
        </button>
      </div>

      <div className="section-title" style={{ marginTop: 8 }}>Scena attiva</div>
      <Field label="Nome">
        <input className="input" defaultValue={active.name} key={`n-${active.id}`} onBlur={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { name: e.target.value } })} />
      </Field>
      <div className="row">
        <Field label="Larghezza (celle)">
          <input className="input" type="number" min={1} max={200} defaultValue={active.widthCells} key={`w-${active.id}-${active.widthCells}`} onBlur={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { widthCells: Number(e.target.value) } })} />
        </Field>
        <Field label="Altezza (celle)">
          <input className="input" type="number" min={1} max={200} defaultValue={active.heightCells} key={`h-${active.id}-${active.heightCells}`} onBlur={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { heightCells: Number(e.target.value) } })} />
        </Field>
      </div>
      <div className="row">
        <Field label="Distanza per casella">
          <input
            className="input"
            type="number"
            step={0.5}
            min={0.1}
            defaultValue={active.cellDistance}
            key={`d-${active.id}-${active.cellDistance}`}
            onBlur={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { cellDistance: Number(e.target.value) } })}
          />
        </Field>
        <Field label="Unità">
          <select className="select" value={active.unit ?? 'ft'} onChange={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { unit: e.target.value as 'm' | 'ft' } })}>
            <option value="m">metri</option>
            <option value="ft">piedi</option>
          </select>
        </Field>
      </div>
      <div className="row between">
        <span className="small" title="Ogni giocatore vede solo ciò che vedono i suoi token: i muri e l'oscurità nascondono il resto">Visione dinamica</span>
        <Switch on={!!active.vision} onChange={(vision) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { vision } })} />
      </div>
      {active.vision && (
        <Field label="Luce ambientale">
          <select className="select" value={active.ambient ?? 'bright'} onChange={(e) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { ambient: e.target.value as Ambient } })}>
            <option value="bright">Giorno: tutto illuminato</option>
            <option value="dim">Penombra: crepuscolo, luna piena</option>
            <option value="dark">Buio: solo luci e scurovisione</option>
          </select>
        </Field>
      )}
      <div className="row between">
        <span className="small">Nebbia di guerra</span>
        <Switch on={!!active.fog?.enabled} onChange={(enabled) => dispatch({ type: 'fog.enable', sceneId: active.id, enabled })} />
      </div>
      <div className="row between">
        <span className="small">Griglia visibile</span>
        <Switch on={active.showGrid} onChange={(showGrid) => dispatch({ type: 'scene.update', sceneId: active.id, patch: { showGrid } })} />
      </div>
      <label className="btn">
        <ImagePlus size={15} /> {active.background ? 'Cambia mappa' : 'Carica mappa'}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) dispatch({ type: 'asset.add', dataUrl: await readImage(f), attachTo: { sceneId: active.id } });
          }}
        />
      </label>
      {active.background && (
        <button className="btn ghost sm" onClick={() => dispatch({ type: 'scene.update', sceneId: active.id, patch: { background: null } })}>
          Rimuovi mappa
        </button>
      )}
      {active.background && <MapAlignment scene={active} />}
      <p className="faint small">Suggerimento: trascina un'immagine sul tavolo per usarla come mappa, o su un token per dargli un ritratto.</p>
    </div>
  );
}

const sharedLabel = (n: Note, players: Record<string, { displayName: string }>) =>
  n.shared === 'all' ? 'Tutti' : n.shared === 'private' ? 'Privata' : n.shared.map((id) => players[id]?.displayName ?? '?').join(', ') || 'Privata';

/** Lines a map's own grid up with the table's: pixels per square, shift, scene size. */
function MapAlignment({ scene }: { scene: Scene }) {
  const { dispatch, assets } = useTable();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const src = scene.background ? assets[scene.background] : undefined;
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);
  const upd = (patch: Partial<Scene>) => dispatch({ type: 'scene.update', sceneId: scene.id, patch });
  const px = scene.bgCellPx ?? null;
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row between">
        <span className="small" title="Se la mappa ha già una griglia disegnata, allineala a quella del tavolo">Griglia della mappa</span>
        <Switch on={px !== null} onChange={(on) => upd({ bgCellPx: on ? Math.round((size?.w ?? 1400) / scene.widthCells) : null })} />
      </div>
      {px !== null && (
        <>
          <div className="row">
            <Field label="Pixel per casella">
              <input className="input" type="number" min={4} value={px} onChange={(e) => upd({ bgCellPx: Number(e.target.value) || px })} />
            </Field>
            <Field label="Sposta X">
              <input className="input" type="number" step={0.05} value={scene.bgOffsetX ?? 0} onChange={(e) => upd({ bgOffsetX: Number(e.target.value) })} />
            </Field>
            <Field label="Sposta Y">
              <input className="input" type="number" step={0.05} value={scene.bgOffsetY ?? 0} onChange={(e) => upd({ bgOffsetY: Number(e.target.value) })} />
            </Field>
          </div>
          {size && (
            <button className="btn sm" onClick={() => upd({ widthCells: Math.ceil(size.w / px), heightCells: Math.ceil(size.h / px) })}>
              Adatta la scena alla mappa ({Math.ceil(size.w / px)} × {Math.ceil(size.h / px)} caselle)
            </button>
          )}
          <p className="faint tiny">Conta i quadretti della mappa: pixel per casella = larghezza dell’immagine ({size?.w ?? '…'} px) ÷ numero di quadretti in orizzontale.</p>
        </>
      )}
    </div>
  );
}

export function NotesPanel() {
  const { state, dispatch, role, assets } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  /** ids known when we asked for a new note: the first new one of ours gets opened */
  const pending = useRef<Set<string> | null>(null);
  const notesMap = state?.notes;
  useEffect(() => {
    const before = pending.current;
    if (!before) return;
    const created = Object.values(notesMap ?? {}).find((n) => n.authorId === meId && !before.has(n.id));
    if (created) {
      pending.current = null;
      setOpenId(created.id);
    }
  }, [notesMap, meId]);
  if (!state) return null;
  const isGm = role === 'gm';
  // the GM technically holds every note; players' private ones stay out of sight
  const notes = Object.values(state.notes ?? {})
    .filter((n) => n.authorId === meId || n.shared === 'all' || (Array.isArray(n.shared) && n.shared.includes(meId)) || (isGm && n.authorId === state.gmId))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const q = query.trim().toLowerCase();
  const shown = q ? notes.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(q)) : notes;
  const open = notes.find((n) => n.id === openId);

  const create = () => {
    pending.current = new Set(notes.map((n) => n.id));
    dispatch({ type: 'note.create', note: { title: 'Nuova nota' } });
  };

  if (open) return <NoteEditor key={open.id} note={open} canEdit={isGm || open.authorId === meId} onBack={() => setOpenId(null)} image={open.image ? assets[open.image] : undefined} />;

  return (
    <div className="panel-body col">
      <div className="row">
        <input className="input grow" placeholder="Cerca nelle note" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn sm" onClick={create}>
          <Plus size={14} /> Nuova
        </button>
      </div>
      {shown.length === 0 && (
        <p className="faint small">
          {q ? 'Nessuna nota trovata.' : isGm ? 'Scrivi appunti segreti o prepara dispense (lettere, mappe, indizi) da mostrare ai giocatori quando serve.' : 'Qui trovi le dispense del master e i tuoi appunti.'}
        </p>
      )}
      <div className="note-list">
        {shown.map((n) => (
          <button key={n.id} className="note-row" onClick={() => setOpenId(n.id)}>
            {n.image && assets[n.image] ? <span className="note-thumb" style={{ backgroundImage: `url(${assets[n.image]})` }} /> : null}
            <span className="col grow" style={{ gap: 0, minWidth: 0 }}>
              <b className="ellipsis">{n.title || 'Senza titolo'}</b>
              <span className="faint tiny ellipsis">{n.body.slice(0, 90) || '—'}</span>
            </span>
            <span className={`badge ${n.shared === 'private' ? '' : 'live'}`} title="Chi può leggerla">
              {n.shared === 'private' ? <EyeOff size={10} /> : <Eye size={10} />}{' '}
              {n.authorId !== meId ? (state.players[n.authorId]?.displayName ?? 'Master') : sharedLabel(n, state.players)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteEditor({ note, canEdit, onBack, image }: { note: Note; canEdit: boolean; onBack: () => void; image?: string }) {
  const { state, dispatch } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!canEdit || (title === note.title && body === note.body)) return;
    const t = setTimeout(() => dispatch({ type: 'note.update', noteId: note.id, patch: { title, body } }), 600);
    return () => clearTimeout(t);
  }, [title, body]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const players = Object.values(state.players).filter((p) => p.id !== meId);
  // pending edits go out together with the sharing, so players never get a half-written note
  const setShared = (shared: Note['shared']) => dispatch({ type: 'note.update', noteId: note.id, patch: { shared, title, body } });
  const picked = Array.isArray(note.shared) ? note.shared : [];

  return (
    <div className="panel-body col">
      <div className="row between">
        <button className="btn ghost sm" onClick={onBack}>
          <ChevronLeft size={14} /> Note
        </button>
        {canEdit && (
          <button
            className="btn ghost sm icon danger"
            aria-label="Elimina nota"
            onClick={() => {
              dispatch({ type: 'note.delete', noteId: note.id });
              onBack();
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {canEdit ? (
        <input className="input bare note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
      ) : (
        <h3 className="note-title">{note.title}</h3>
      )}
      {canEdit && (
        <div className="col" style={{ gap: 6 }}>
          <span className="section-title">Chi può leggerla</span>
          <div className="seg">
            <button className={note.shared === 'private' ? 'on' : ''} onClick={() => setShared('private')}>
              <EyeOff size={12} /> Solo io
            </button>
            <button className={note.shared === 'all' ? 'on' : ''} onClick={() => setShared('all')}>
              <Eye size={12} /> Tutti
            </button>
            <button className={Array.isArray(note.shared) ? 'on' : ''} onClick={() => setShared(picked.length ? picked : [])} disabled={!players.length}>
              <UserPlus size={12} /> Alcuni
            </button>
          </div>
          {Array.isArray(note.shared) && (
            <div className="row wrap" style={{ gap: 4 }}>
              {players.map((p) => {
                const on = picked.includes(p.id);
                return (
                  <button key={p.id} className={`chip ${on ? 'on' : ''}`} onClick={() => setShared(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                    <span className="ini-dot" style={{ background: p.color }} /> {p.displayName}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {image ? (
        <div className="note-image">
          <img src={image} alt="" onClick={() => setZoom(true)} />
          {canEdit && (
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'note.update', noteId: note.id, patch: { image: null } })}>
              Rimuovi immagine
            </button>
          )}
        </div>
      ) : (
        canEdit && (
          <label className="btn sm" style={{ alignSelf: 'flex-start' }}>
            <ImagePlus size={14} /> Aggiungi immagine
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) dispatch({ type: 'asset.add', dataUrl: await readImage(f, 2400), attachTo: { noteId: note.id } });
              }}
            />
          </label>
        )
      )}
      {canEdit ? (
        <textarea className="textarea note-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Scrivi qui…" />
      ) : (
        <p className="selectable note-read">{note.body}</p>
      )}
      {zoom && image && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={image} alt="" />
        </div>
      )}
    </div>
  );
}

// ---------- selected token ----------

/** Light carried by a token or a prop: presets in metres, stored in cells. */
function LightFields({ scene, light, onChange }: { scene: Scene; light: Light | null; onChange: (l: Light | null) => void }) {
  const preset =
    LIGHT_PRESETS.find((p) => (p.dim === 0 && !light) || (light && Math.abs(metresToCells(scene, p.bright) - light.bright) < 0.05 && Math.abs(metresToCells(scene, p.dim) - light.dim) < 0.05))?.id ??
    (light ? 'custom' : 'none');
  return (
    <Field label="Luce">
      <select
        className="select"
        value={preset}
        onChange={(e) => {
          const p = LIGHT_PRESETS.find((x) => x.id === e.target.value);
          if (!p) return;
          onChange(p.dim ? { bright: metresToCells(scene, p.bright), dim: metresToCells(scene, p.dim), ...(p.color ? { color: p.color } : {}) } : null);
        }}
      >
        {LIGHT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {preset === 'custom' && <option value="custom">Personalizzata</option>}
      </select>
    </Field>
  );
}

const AURA_RADII = [0, 1.5, 3, 4.5, 6, 9, 18];

/** A circle around the token: radius in metres from its edge, any colour. */
function AuraFields({ scene, aura, onChange }: { scene: Scene; aura: { radius: number; color: string } | null; onChange: (a: { radius: number; color: string } | null) => void }) {
  const metres = aura ? cellsToMetres(scene, aura.radius) : 0;
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Field label="Aura">
        <select
          className="select"
          value={AURA_RADII.includes(metres) ? metres : 'custom'}
          onChange={(e) => {
            const m = Number(e.target.value);
            onChange(m ? { radius: metresToCells(scene, m), color: aura?.color ?? '#c9a227' } : null);
          }}
        >
          {AURA_RADII.map((m) => (
            <option key={m} value={m}>
              {m ? `${String(m).replace('.', ',')} m` : 'Nessuna'}
            </option>
          ))}
          {!AURA_RADII.includes(metres) && <option value="custom">{String(metres).replace('.', ',')} m</option>}
        </select>
      </Field>
      {aura && <input type="color" aria-label="Colore dell'aura" value={aura.color} onChange={(e) => onChange({ ...aura, color: e.target.value })} />}
    </div>
  );
}

/** GM: the selected piece of scenery. */
export function PropInspector({ prop }: { prop: Prop }) {
  const { state, dispatch, selectProp } = useTable();
  if (!state) return null;
  const scene = state.scenes[prop.sceneId];
  const upd = (patch: Partial<Prop>) => dispatch({ type: 'prop.update', propId: prop.id, patch });
  const kind = propKind(prop.kind);
  return (
    <div className="inspector glass">
      <div className="row between">
        <input className="input bare inspector-name" defaultValue={prop.label ?? kind?.name ?? 'Oggetto'} key={prop.id + (prop.label ?? '')} onBlur={(e) => upd({ label: e.target.value })} />
        <button className="btn ghost sm icon" onClick={() => selectProp(null)} aria-label="Chiudi">
          <X size={14} />
        </button>
      </div>
      <div className="row">
        <Field label="Larghezza">
          <input className="input" type="number" step={0.5} min={0.25} value={prop.w} onChange={(e) => upd({ w: Number(e.target.value) })} />
        </Field>
        <Field label="Altezza">
          <input className="input" type="number" step={0.5} min={0.25} value={prop.h} onChange={(e) => upd({ h: Number(e.target.value) })} />
        </Field>
        <Field label="Rotazione">
          <div className="row" style={{ gap: 2 }}>
            <button className="btn sm icon" aria-label="Ruota a sinistra" onClick={() => upd({ rotation: prop.rotation - 45 })}>
              <RotateCcw size={13} />
            </button>
            <span className="small num" style={{ width: 34, textAlign: 'center' }}>
              {prop.rotation}°
            </span>
            <button className="btn sm icon" aria-label="Ruota a destra" onClick={() => upd({ rotation: prop.rotation + 45 })}>
              <RotateCw size={13} />
            </button>
          </div>
        </Field>
      </div>
      {scene && <LightFields scene={scene} light={prop.light} onChange={(light) => upd({ light })} />}
      <div className="row between">
        <span className="small">Blocca la vista</span>
        <Switch on={prop.blocksVision} onChange={(blocksVision) => upd({ blocksVision })} />
      </div>
      <div className="row between">
        <span className="small">Nascosto ai giocatori</span>
        <Switch on={prop.hidden} onChange={(hidden) => upd({ hidden })} />
      </div>
      <div className="row wrap">
        <label className="btn sm">
          <ImagePlus size={14} /> Immagine
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) dispatch({ type: 'asset.add', dataUrl: await readImage(f, 1024), attachTo: { propId: prop.id } });
            }}
          />
        </label>
        <button className="btn sm" onClick={() => dispatch({ type: 'prop.create', prop: { ...prop, x: prop.x + 0.5, y: prop.y + 0.5 } })}>
          <Copy size={13} /> Duplica
        </button>
        <button
          className="btn ghost sm danger"
          onClick={() => {
            dispatch({ type: 'prop.delete', propId: prop.id });
            selectProp(null);
          }}
        >
          <Trash2 size={13} /> Elimina
        </button>
      </div>
    </div>
  );
}

export function TokenInspector({ token }: { token: Token }) {
  const { state, dispatch, role, select } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const isGm = role === 'gm';
  if (!state) return null;
  const canEdit = isGm || token.ownerIds.includes(meId);
  const system = getSystem(state.systemId);
  const upd = (patch: TokenPatch) =>
    dispatch({ type: 'token.update', tokenId: token.id, patch });
  const iniMod = initiativeModifier(state, token);
  const ui = getSystemUi(state.systemId);
  const inInitiative = state.initiative.entries.some((e) => e.tokenId === token.id);

  return (
    <div className="inspector glass">
      <div className="row between">
        <input className="input bare inspector-name" disabled={!canEdit} defaultValue={token.name} key={token.id + token.name} onBlur={(e) => e.target.value !== token.name && upd({ name: e.target.value })} />
        <button className="btn ghost sm icon" onClick={() => select(null)} aria-label="Chiudi">
          <X size={14} />
        </button>
      </div>
      {canEdit ? (
        <>
          <div className="row">
            <Field label="PF">
              <div className="row" style={{ gap: 4 }}>
                <input className="input" type="number" value={token.hp?.current ?? ''} placeholder="—" onChange={(e) => upd({ hp: { current: Number(e.target.value), max: token.hp?.max ?? Number(e.target.value) } })} />
                <span className="faint">/</span>
                <input className="input" type="number" value={token.hp?.max ?? ''} placeholder="—" disabled={!isGm} onChange={(e) => upd({ hp: { current: token.hp?.current ?? Number(e.target.value), max: Number(e.target.value) } })} />
              </div>
            </Field>
            {isGm && (
              <Field label="CA">
                <input className="input" type="number" style={{ width: 60 }} value={token.ac ?? ''} onChange={(e) => upd({ ac: e.target.value === '' ? null : Number(e.target.value) })} />
              </Field>
            )}
          </div>
          <div className="row">
            <Field label="Colore">
              <input type="color" value={token.color} onChange={(e) => upd({ color: e.target.value })} />
            </Field>
            {isGm && (
              <Field label="Taglia">
                <select className="select" value={token.size} onChange={(e) => upd({ size: Number(e.target.value) })}>
                  <option value={1}>Media / Piccola</option>
                  <option value={2}>Grande</option>
                  <option value={3}>Enorme</option>
                  <option value={4}>Mastodontica</option>
                </select>
              </Field>
            )}
          </div>
          {state.scenes[token.sceneId] && <LightFields scene={state.scenes[token.sceneId]!} light={token.light ?? null} onChange={(light) => upd({ light })} />}
          {state.scenes[token.sceneId] && <AuraFields scene={state.scenes[token.sceneId]!} aura={token.aura ?? null} onChange={(aura) => upd({ aura })} />}
          {isGm && state.scenes[token.sceneId] && (
            <Field label={`Scurovisione (${state.scenes[token.sceneId]!.unit ?? 'ft'})`}>
              <input
                className="input"
                type="number"
                min={0}
                step={state.scenes[token.sceneId]!.cellDistance}
                style={{ width: 90 }}
                value={token.darkvision ? cellsToMetres(state.scenes[token.sceneId]!, token.darkvision) : 0}
                onChange={(e) => upd({ darkvision: metresToCells(state.scenes[token.sceneId]!, Number(e.target.value) || 0) })}
              />
            </Field>
          )}
          {system && (
            <div className="row wrap" style={{ gap: 4 }}>
              {system.conditions.map((c) => (
                <button
                  key={c}
                  className={`chip ${token.conditions.includes(c) ? 'on' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                  title={dnd5e.CONDITION_INFO[c]}
                  onClick={() => upd({ conditions: token.conditions.includes(c) ? token.conditions.filter((x) => x !== c) : [...token.conditions, c] })}
                >
                  <ConditionIcon name={c} /> {c}
                </button>
              ))}
            </div>
          )}
          {isGm && (
            <>
              {/* not a <label>: it would give every chip the same accessible name */}
              <div className="field">
                <span>Controllato da</span>
                <div className="row wrap" style={{ gap: 4 }}>
                  {Object.values(state.players).map((p) => (
                    <button
                      key={p.id}
                      className={`chip ${token.ownerIds.includes(p.id) ? 'on' : ''}`}
                      style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                      onClick={() => upd({ ownerIds: token.ownerIds.includes(p.id) ? token.ownerIds.filter((x) => x !== p.id) : [...token.ownerIds, p.id] })}
                    >
                      <UserPlus size={11} /> {p.displayName}
                    </button>
                  ))}
                  {!Object.keys(state.players).length && <span className="faint small">Nessun giocatore</span>}
                </div>
              </div>
              <div className="row">
                <button className="btn sm" onClick={() => upd({ hidden: !token.hidden })}>
                  {token.hidden ? <Eye size={14} /> : <EyeOff size={14} />} {token.hidden ? 'Rivela' : 'Nascondi'}
                </button>
                <label className="btn sm">
                  <ImagePlus size={14} /> Ritratto
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) dispatch({ type: 'asset.add', dataUrl: await readImage(f, 512), attachTo: { tokenId: token.id } });
                    }}
                  />
                </label>
              </div>
            </>
          )}
          {isGm && token.monsterId && ui?.StatBlock && (
            <details>
              <summary className="small muted" style={{ cursor: 'pointer' }}>
                Scheda del mostro
              </summary>
              <div style={{ paddingTop: 8 }}>
                <ui.StatBlock monsterId={token.monsterId} onRoll={(formula, label) => dispatch({ type: 'roll', formula, label, private: true })} />
              </div>
            </details>
          )}
          <div className="row">
            <button
              className="btn sm grow"
              disabled={inInitiative}
              onClick={() => dispatch({ type: 'initiative.add', name: token.name, tokenId: token.id, modifier: iniMod })}
            >
              <Swords size={14} /> {inInitiative ? 'In iniziativa' : 'Tira iniziativa'}
            </button>
            <button
              className="btn sm icon danger"
              onClick={() => {
                dispatch({ type: 'token.delete', tokenId: token.id });
                select(null);
              }}
              aria-label="Rimuovi token"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      ) : (
        <p className="muted small">{token.conditions.length ? token.conditions.join(', ') : 'Nessuna condizione visibile.'}</p>
      )}
    </div>
  );
}

// ---------- dice bar ----------

export function DiceBar() {
  const { dispatch, role } = useTable();
  const [mod, setMod] = useState(0);
  const [hidden, setHidden] = useState(false);
  const r = (sides: number, label?: string, adv?: 'adv' | 'dis') => {
    const base = adv ? `2d20${adv === 'adv' ? 'kh1' : 'kl1'}` : `1d${sides}`;
    const formula = mod ? `${base}${mod > 0 ? '+' : ''}${mod}` : base;
    dispatch({ type: 'roll', formula, label, private: hidden });
  };
  return (
    <div className="dicebar glass">
      {[4, 6, 8, 10, 12, 20, 100].map((d) => (
        <button key={d} className="die" onClick={() => r(d)} title={`Tira 1d${d}`}>
          d{d}
        </button>
      ))}
      <span className="sep" />
      <button className="die wide" onClick={() => r(20, 'Vantaggio', 'adv')} title="2d20, tieni il più alto">
        VAN
      </button>
      <button className="die wide" onClick={() => r(20, 'Svantaggio', 'dis')} title="2d20, tieni il più basso">
        SVA
      </button>
      <span className="sep" />
      <button className="die" onClick={() => setMod(mod - 1)}>−</button>
      <span className="mod-value">{mod >= 0 ? `+${mod}` : mod}</span>
      <button className="die" onClick={() => setMod(mod + 1)}>+</button>
      {role === 'gm' && (
        <>
          <span className="sep" />
          <button className={`die wide ${hidden ? 'on' : ''}`} onClick={() => setHidden(!hidden)} title="Tiri nascosti ai giocatori">
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </>
      )}
    </div>
  );
}

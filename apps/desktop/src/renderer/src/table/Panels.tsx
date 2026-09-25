import { describeRoll, isNat, type LogEntry, type Token, type TokenPatch } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { ChevronLeft, ChevronRight, Eye, EyeOff, ImagePlus, Lock, MapPinned, Plus, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, readImage, Switch } from '../components/ui';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { getSystemUi } from '../systems';

const time = (ts: number) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// ---------- chat & dice log ----------

function LogLine({ e, meId }: { e: LogEntry; meId: string }) {
  if (e.kind === 'system') return <div className="log-system">{e.text}</div>;
  const mine = e.authorId === meId;
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
            {e.private && <Lock size={10} />} {time(e.ts)}
          </span>
        </div>
        <div className="row between">
          <span className="mono faint small">
            {e.roll.formula} → {describeRoll(e.roll).replace(/~(\d+)~/g, '($1)')}
          </span>
          <span className="roll-total">{e.roll.total}</span>
        </div>
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
  const { state, dispatch, role } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const log = state?.log ?? [];

  useEffect(() => {
    // braces matter: recent Chromium returns a Promise from scrollIntoView, which React would take for a cleanup
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const m = /^\/(r|roll|gr)\s+(.+)$/i.exec(t);
    if (m) dispatch({ type: 'roll', formula: m[2]!, private: m[1]!.toLowerCase() === 'gr' });
    else if (/^\/gm\s+/i.test(t)) dispatch({ type: 'chat', text: t.replace(/^\/gm\s+/i, ''), private: true });
    else dispatch({ type: 'chat', text: t });
    setText('');
  };

  return (
    <div className="panel-body chat">
      <div className="log">
        {log.length === 0 && <p className="faint small center">Nessun messaggio. Prova /r 1d20+5</p>}
        {log.map((e) => (
          <LogLine key={e.id} e={e} meId={meId} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          className="input"
          value={text}
          placeholder={role === 'gm' ? 'Messaggio, /r 2d6+3, /gr tiro nascosto' : 'Messaggio, /r 1d20+4, /gm al master'}
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

export function SheetPanel({ placeAt }: { placeAt: () => { x: number; y: number } }) {
  const { state, dispatch, role } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const isGm = role === 'gm';
  const characters = useMemo(() => Object.values(state?.characters ?? {}), [state?.characters]);
  const mine = characters.find((c) => c.ownerId === meId && state?.players[meId]?.characterId === c.id);
  const [pick, setPick] = useState<string>('');
  const selected = isGm ? characters.find((c) => c.id === pick) ?? characters[0] : mine;
  if (!state) return null;
  const system = getSystem(state.systemId);
  const ui = getSystemUi(state.systemId);

  if (!selected || !system || !ui) {
    return (
      <div className="panel-body">
        <p className="muted small">{isGm ? 'Nessun personaggio al tavolo.' : 'Non hai un personaggio in questa campagna. Assegnalo dalla pagina della campagna.'}</p>
      </div>
    );
  }

  const onMap = Object.values(state.tokens).find((t) => t.characterId === selected.id && t.sceneId === state.activeSceneId);
  const place = () => {
    const d = system.tokenDefaults(selected.data);
    const owner = state.players[selected.ownerId];
    dispatch({
      type: 'token.create',
      token: { name: selected.name, characterId: selected.id, ...placeAt(), size: d.size, hp: d.hp, ac: d.ac, ownerIds: [selected.ownerId], color: owner?.color },
    });
  };

  return (
    <div className="panel-body col">
      {isGm && characters.length > 1 && (
        <select className="select" value={selected.id} onChange={(e) => setPick(e.target.value)}>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {state.players[c.ownerId]?.displayName ?? '—'}
            </option>
          ))}
        </select>
      )}
      <ui.Sheet
        data={selected.data}
        compact
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
      />
      {!onMap && (
        <button className="btn" onClick={place}>
          <MapPinned size={15} /> Metti sulla mappa
        </button>
      )}
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
      <p className="faint small">Suggerimento: trascina un'immagine sul tavolo per usarla come mappa, o su un token per dargli un ritratto.</p>
    </div>
  );
}

export function NotesPanel() {
  const { state, dispatch } = useTable();
  const [text, setText] = useState(state?.gmNotes ?? '');
  useEffect(() => {
    const t = setTimeout(() => text !== state?.gmNotes && dispatch({ type: 'notes.update', text }), 600);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="panel-body col" style={{ height: '100%' }}>
      <p className="faint small">Visibili solo a te. Salvate automaticamente.</p>
      <textarea className="textarea grow" style={{ resize: 'none' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Segreti, PNG, indizi…" />
    </div>
  );
}

// ---------- selected token ----------

export function TokenInspector({ token }: { token: Token }) {
  const { state, dispatch, role, select } = useTable();
  const meId = useApp((s) => s.user?.id ?? '');
  const isGm = role === 'gm';
  if (!state) return null;
  const canEdit = isGm || token.ownerIds.includes(meId);
  const system = getSystem(state.systemId);
  const upd = (patch: TokenPatch) =>
    dispatch({ type: 'token.update', tokenId: token.id, patch });
  const character = token.characterId ? state.characters[token.characterId] : undefined;
  const iniMod = character && system ? system.tokenDefaults(character.data).initiativeModifier : 0;
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
          {system && (
            <div className="row wrap" style={{ gap: 4 }}>
              {system.conditions.map((c) => (
                <button
                  key={c}
                  className={`chip ${token.conditions.includes(c) ? 'on' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                  onClick={() => upd({ conditions: token.conditions.includes(c) ? token.conditions.filter((x) => x !== c) : [...token.conditions, c] })}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {isGm && (
            <>
              <Field label="Controllato da">
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
              </Field>
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

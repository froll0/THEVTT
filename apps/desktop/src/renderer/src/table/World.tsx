import { mergePool, newId, roll, worldTime, type GameAction, type Quest } from '@thevtt/shared';
import { dnd5e, getSystem, warhammer } from '@thevtt/systems';
import { BedDouble, ChevronLeft, Clock, Coffee, Dices, Eye, EyeOff, Moon, Plus, Sun, Sunrise, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Modal, Popover, Switch } from '../components/ui';
import { useApp } from '../store/app';
import { useTable } from '../store/table';

const START = 8 * 60;
const STEPS: [string, number][] = [
  ['+10 min', 10],
  ['+1 ora', 60],
  ['+8 ore', 480],
  ['+1 giorno', 1440],
];

/** The world's day and hour, for everyone; the GM moves it on. */
export function WorldClock() {
  const world = useTable((s) => s.state?.world);
  const isGm = useTable((s) => s.role === 'gm');
  const dispatch = useTable((s) => s.dispatch);
  const scene = useTable((s) => (s.state ? s.state.scenes[s.state.activeSceneId] : undefined));
  const minutes = world?.minutes ?? START;
  const t = worldTime(minutes);
  const [day, setDay] = useState(String(t.day));
  const [clock, setClock] = useState(t.clock);
  // the fields follow the clock as it moves on
  useEffect(() => {
    setDay(String(t.day));
    setClock(t.clock);
  }, [t.day, t.clock]);
  // players see it once the GM has started the clock
  if (!world && !isGm) return null;
  const Icon = t.light === 'bright' ? Sun : t.light === 'dim' ? Sunrise : Moon;
  const label = `Giorno ${t.day} · ${t.clock}`;
  const chip = (toggle?: () => void) => (
    <button className="badge world-chip" data-light={t.light} onClick={toggle} title={`${label}, ${t.part}`} aria-label={`Ora del mondo: ${label}`}>
      <Icon size={11} /> {label}
    </button>
  );
  if (!isGm) return chip();
  // the whole party rests: every sheet at the table gets its long rest, every token its hit points
  const longRest = () => {
    const st = useTable.getState().state;
    if (!st) return;
    const actions: GameAction[] = [{ type: 'rest', kind: 'long' }];
    for (const ch of Object.values(st.characters)) {
      if (ch.systemId !== 'dnd5e-2024') continue;
      const data = dnd5e.longRest(dnd5e.normalize(ch.data));
      actions.push({ type: 'character.update', characterId: ch.id, data });
      const max = dnd5e.maxHp(data);
      for (const t of Object.values(st.tokens)) if (t.characterId === ch.id) actions.push({ type: 'token.update', tokenId: t.id, patch: { hp: { current: max, max } } });
    }
    dispatch({ type: 'batch', actions });
  };
  // success pools: the whole party catches its breath, sleeps, or starts a session
  const poolRest = (kind: 'breath' | 'night' | 'session') => {
    const st = useTable.getState().state;
    if (!st) return;
    const actions: GameAction[] = kind === 'night' ? [{ type: 'time.advance', minutes: 480 }] : [];
    for (const ch of Object.values(st.characters)) {
      if (ch.systemId !== 'wtow') continue;
      const c = warhammer.normalize(ch.data);
      const data = kind === 'breath' ? warhammer.catchBreath(c) : kind === 'night' ? warhammer.nightRest(c) : warhammer.newSession(c);
      actions.push({ type: 'character.update', characterId: ch.id, data });
      const pool = warhammer.characterPool(data);
      for (const t of Object.values(st.tokens)) {
        if (t.characterId !== ch.id) continue;
        const drop = kind === 'session' ? [] : kind === 'night' ? ['Barcollante', 'Prono', 'Esausto'] : ['Barcollante', 'Prono'];
        actions.push({ type: 'token.update', tokenId: t.id, patch: { pool: mergePool(t.pool, pool), conditions: t.conditions.filter((k) => !drop.includes(k)) } });
      }
    }
    dispatch({ type: 'batch', actions });
  };
  const pool = getSystem(useTable.getState().state?.systemId ?? '')?.table === 'pool';
  const set = () => {
    const [h, m] = clock.split(':').map(Number);
    const d = Math.max(1, Math.round(Number(day) || 1));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    dispatch({ type: 'time.set', minutes: (d - 1) * 1440 + Math.max(0, Math.min(23, h!)) * 60 + Math.max(0, Math.min(59, m!)) });
  };
  return (
    <Popover
      align="left"
      width={280}
      trigger={(_, toggle) =>
        chip(toggle)
      }
    >
      {() => (
        <div className="col" style={{ padding: 'var(--s3)', gap: 10 }} aria-label="Orologio del mondo">
          <div className="row between">
            <b>
              <Clock size={13} /> {label}
            </b>
            <span className="faint small">{t.part}</span>
          </div>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {STEPS.map(([name, n]) => (
              <button key={n} className="chip" onClick={() => dispatch({ type: 'time.advance', minutes: n })}>
                {name}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <input className="input" style={{ width: 64 }} type="number" min={1} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Giorno" />
            <input className="input" style={{ width: 90 }} type="time" value={clock} onChange={(e) => setClock(e.target.value)} aria-label="Ora" />
            <button className="btn sm" onClick={set}>
              Imposta
            </button>
          </div>
          {scene && (
            <label className="row between small">
              <span>La luce di «{scene.name}» segue l’ora</span>
              <Switch on={!!scene.daylight} onChange={(v) => dispatch({ type: 'scene.update', sceneId: scene.id, patch: { daylight: v } })} label="La luce segue l’ora" />
            </label>
          )}
          <span className="faint tiny">Per le scene all’aperto: giorno dalle 7 alle 19, penombra all’alba e al tramonto, buio di notte.</span>
          {pool ? (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            <button className="chip" onClick={() => poolRest('breath')} title="Fine dello scontro: tutte le Ferite medicate, le più lievi guarite, la magia si disperde">
              <Coffee size={12} /> Riprendere Fiato
            </button>
            <button className="chip" onClick={() => poolRest('night')} title="Otto ore: guariscono anche le Ferite da Notte di Riposo">
              <BedDouble size={12} /> Notte di Riposo
            </button>
            <button className="chip" onClick={() => poolRest('session')} title="Il Fato speso torna a tutti">
              <Dices size={12} /> Nuova sessione
            </button>
            <button
              className="chip"
              onClick={() => dispatch({ type: 'pool.dayEnd' })}
              title="Tempra contro le infezioni per chi è stato ferito oggi, Volontà per chi è stato esposto al Caos"
            >
              <Moon size={12} /> Fine della giornata
            </button>
          </div>
          ) : (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            <button className="chip" onClick={() => dispatch({ type: 'rest', kind: 'short' })} title="Un’ora: ognuno può spendere i suoi dadi vita">
              <Coffee size={12} /> Riposo breve
            </button>
            <button className="chip" onClick={() => longRest()} title="Otto ore: PF, slot, dadi vita e risorse tornano">
              <BedDouble size={12} /> Riposo lungo
            </button>
          </div>
          )}
        </div>
      )}
    </Popover>
  );
}

const STATUS: Record<Quest['status'], string> = { active: 'In corso', done: 'Compiuta', failed: 'Fallita' };

/** Quests: the GM writes them, the players follow those they know about. */
export function QuestsPanel() {
  const { state, dispatch, role } = useTable();
  const [openId, setOpenId] = useState<string | null>(null);
  const isGm = role === 'gm';
  if (!state) return null;
  const order = { active: 0, done: 1, failed: 2 } as const;
  const quests = Object.values(state.quests ?? {}).sort((a, b) => order[a.status] - order[b.status] || b.updatedAt - a.updatedAt);
  const open = quests.find((q) => q.id === openId);
  if (open && isGm) return <QuestEditor quest={open} onBack={() => setOpenId(null)} />;

  const create = () => {
    const id = newId();
    dispatch({ type: 'quest.save', quest: { id, title: 'Nuova missione', objectives: [] } });
    setOpenId(id);
  };

  return (
    <div className="panel-body col">
      {isGm && (
        <button className="btn sm" onClick={create}>
          <Plus size={14} /> Nuova missione
        </button>
      )}
      {quests.length === 0 && <p className="faint small">{isGm ? 'Scrivi le missioni del gruppo, con i loro obiettivi. Rendile visibili quando i giocatori ne vengono a sapere.' : 'Ancora nessuna missione.'}</p>}
      <div className="col quest-list" style={{ gap: 8 }}>
        {quests.map((q) => {
          const done = q.objectives.filter((o) => o.done).length;
          return (
            <div key={q.id} className={`quest-card ${q.status}`} role={isGm ? 'button' : undefined} tabIndex={isGm ? 0 : undefined} onClick={() => isGm && setOpenId(q.id)} onKeyDown={(e) => isGm && e.key === 'Enter' && setOpenId(q.id)}>
              <div className="row between">
                <b className="ellipsis">{q.title}</b>
                <span className="row" style={{ gap: 6 }}>
                  {isGm && (q.visible ? <Eye size={12} aria-label="Visibile ai giocatori" /> : <EyeOff size={12} aria-label="Nascosta ai giocatori" />)}
                  <span className={`quest-status ${q.status}`}>{STATUS[q.status]}</span>
                </span>
              </div>
              {q.description && <p className="small faint quest-desc">{q.description}</p>}
              {q.objectives.length > 0 && (
                <>
                  <ul className="quest-objectives">
                    {q.objectives.map((o) => (
                      <li key={o.id} className={o.done ? 'done' : ''}>
                        <input
                          type="checkbox"
                          checked={o.done}
                          disabled={!isGm}
                          aria-label={o.text}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => dispatch({ type: 'quest.save', quest: { id: q.id, title: q.title, objectives: q.objectives.map((x) => (x.id === o.id ? { ...x, done: e.target.checked } : x)) } })}
                        />
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="quest-progress" aria-label={`${done} obiettivi su ${q.objectives.length}`}>
                    <span style={{ width: `${(done / q.objectives.length) * 100}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestEditor({ quest, onBack }: { quest: Quest; onBack: () => void }) {
  const dispatch = useTable((s) => s.dispatch);
  const toast = useApp((s) => s.toast);
  const [title, setTitle] = useState(quest.title);
  const [description, setDescription] = useState(quest.description);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState(false);
  const save = (patch: Partial<Quest>) => dispatch({ type: 'quest.save', quest: { id: quest.id, title, ...patch } });
  const addObjective = () => {
    const text = next.trim();
    if (!text) return;
    save({ objectives: [...quest.objectives, { id: newId(), text, done: false }] });
    setNext('');
  };
  return (
    <div className="panel-body col" aria-label="Modifica la missione">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => (save({ title, description }), onBack())}>
          <ChevronLeft size={14} /> Missioni
        </button>
        <label className="row small" style={{ gap: 6 }}>
          Visibile ai giocatori
          <Switch on={quest.visible} onChange={(v) => save({ visible: v })} label="Visibile ai giocatori" />
        </label>
      </div>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save({ title })} aria-label="Titolo della missione" placeholder="Titolo" />
      <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => save({ description })} aria-label="Descrizione della missione" placeholder="Chi l’ha affidata, cosa si sa, la ricompensa…" />
      <div className="seg row" role="radiogroup" aria-label="Stato">
        {(Object.keys(STATUS) as Quest['status'][]).map((st) => (
          <button key={st} role="radio" aria-checked={quest.status === st} className={quest.status === st ? 'on' : ''} onClick={() => save({ status: st })}>
            {STATUS[st]}
          </button>
        ))}
      </div>
      <span className="ed-group">Obiettivi</span>
      <ul className="quest-objectives edit">
        {quest.objectives.map((o) => (
          <li key={o.id} className={o.done ? 'done' : ''}>
            <input type="checkbox" checked={o.done} aria-label={o.text} onChange={(e) => save({ objectives: quest.objectives.map((x) => (x.id === o.id ? { ...x, done: e.target.checked } : x)) })} />
            <span className="grow">{o.text}</span>
            <button className="icon-btn" onClick={() => save({ objectives: quest.objectives.filter((x) => x.id !== o.id) })} aria-label={`Togli ${o.text}`}>
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          addObjective();
        }}
      >
        <input className="input grow" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nuovo obiettivo" aria-label="Nuovo obiettivo" />
        <button className="btn sm" type="submit" disabled={!next.trim()}>
          <Plus size={13} /> Aggiungi
        </button>
      </form>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        {confirm ? (
          <button
            className="btn sm danger"
            onClick={() => {
              dispatch({ type: 'quest.delete', questId: quest.id });
              toast('Missione eliminata');
              onBack();
            }}
          >
            Elimina davvero
          </button>
        ) : (
          <button className="btn sm ghost" onClick={() => setConfirm(true)}>
            <Trash2 size={13} /> Elimina
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A short rest called by the GM: each player spends hit dice for their own
 * character, rolled at the table and healing the token (the sheet follows).
 */
export function RestPrompt() {
  const rest = useTable((s) => s.state?.rest);
  const me = useApp((s) => s.user?.id ?? '');
  const seen = useRef(rest?.id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!rest || rest.id === seen.current) return;
    seen.current = rest.id;
    if (rest.kind === 'short') setOpen(true);
  }, [rest]);
  const state = useTable((s) => s.state);
  if (!open || !state) return null;
  const mine = Object.values(state.characters).filter((ch) => ch.ownerId === me && ch.systemId === 'dnd5e-2024');
  if (!mine.length) return null;
  return <ShortRest characterId={mine[0]!.id} onClose={() => setOpen(false)} />;
}

function ShortRest({ characterId, onClose }: { characterId: string; onClose: () => void }) {
  const { state, dispatch } = useTable();
  const [dice, setDice] = useState(1);
  const ch = state?.characters[characterId];
  if (!state || !ch) return null;
  const c = dnd5e.normalize(ch.data);
  const cls = dnd5e.getClass(c);
  const available = c.level - c.hitDiceUsed;
  const n = Math.max(0, Math.min(available, dice));
  const con = dnd5e.abilityMod(c, 'con');
  const formula = cls && n ? `${n}d${cls.hitDie}${con ? `${con > 0 ? '+' : ''}${con * n}` : ''}` : '';
  const token = Object.values(state.tokens).find((t) => t.characterId === ch.id);
  const hp = token?.hp?.current ?? dnd5e.currentHp(c);
  const max = dnd5e.maxHp(c);
  const go = () => {
    // resources first, then the healing: rolled at the table on the token when it's on the map
    if (!formula) {
      dispatch({ type: 'character.update', characterId: ch.id, data: dnd5e.shortRest(c, 0, 0) });
    } else if (token) {
      dispatch({ type: 'character.update', characterId: ch.id, data: dnd5e.shortRest(c, n, 0) });
      dispatch({ type: 'hp.roll', formula, heal: true, tokenIds: [token.id], label: `Dadi vita · ${ch.name}` });
    } else {
      const r = roll(formula);
      dispatch({ type: 'character.update', characterId: ch.id, data: dnd5e.shortRest(c, n, Math.max(0, r.total)) });
      dispatch({ type: 'chat', text: `${ch.name} spende ${n} dadi vita e recupera ${Math.max(0, r.total)} PF` });
    }
    onClose();
  };
  return (
    <Modal
      title={`Riposo breve · ${ch.name}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Più tardi
          </button>
          <button className="btn primary" onClick={go}>
            {formula ? (
              <>
                <Dices size={14} /> Tira {formula}
              </>
            ) : (
              'Riposa senza dadi'
            )}
          </button>
        </>
      }
    >
      <p className="muted small">Il master ha chiamato un riposo breve. Spendi dadi vita per recuperare PF; le risorse che si ricaricano col riposo breve tornano disponibili.</p>
      <div className="row" style={{ gap: 8 }}>
        <span className="small">PF {hp}/{max}</span>
        <span className="faint small">· dadi vita {available}/{c.level} (d{cls?.hitDie ?? '?'})</span>
      </div>
      <label className="row small" style={{ gap: 8 }}>
        Dadi da spendere
        <input className="input num" type="number" min={0} max={available} value={n} style={{ width: 70 }} onChange={(e) => setDice(Number(e.target.value) || 0)} aria-label="Dadi vita da spendere" />
      </label>
    </Modal>
  );
}

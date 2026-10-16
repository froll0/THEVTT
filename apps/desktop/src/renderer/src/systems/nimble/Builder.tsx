import { roll } from '@thevtt/shared';
import { nimbleRules as n } from '@thevtt/systems';
import { Check, Dices, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { BuilderProps } from '..';
import { NimbleSheet } from './Sheet';

type C = n.NimbleCharacter;
type Set = (patch: Partial<C>) => void;
const { STATS, STAT_INFO, SKILLS, SKILL_INFO } = n;
type ArrayId = keyof typeof n.STAT_ARRAYS;

interface Step {
  id: string;
  label: string;
  done: (c: C) => boolean;
}

const sameValues = (a: number[], b: number[]) => [...a].sort().join() === [...b].sort().join();

const STEPS: Step[] = [
  { id: 'class', label: 'Classe', done: (c) => !!c.classId },
  { id: 'ancestry', label: 'Stirpe', done: (c) => !!c.ancestryId && (n.ancestryOf(c)?.bonus.saves !== 'neutral-to-adv' || !!c.extraSave) },
  { id: 'background', label: 'Background', done: (c) => !!c.backgroundId },
  { id: 'stats', label: 'Caratteristiche', done: (c) => c.array === 'custom' || sameValues(STATS.map((s) => c.stats[s]), n.STAT_ARRAYS[c.array].values) },
  { id: 'skills', label: 'Abilità', done: (c) => n.skillPointsUsed(c) === n.skillPointsTotal(c) },
  { id: 'gear', label: 'Equipaggiamento', done: (c) => c.items.length > 0 || c.gold > 0 },
  { id: 'details', label: 'Dettagli', done: (c) => !!c.name.trim() },
  { id: 'summary', label: 'Riepilogo', done: () => false },
];

export function NimbleBuilder({ value, onChange }: BuilderProps<C>) {
  const c = n.normalize(value);
  const set: Set = (patch) => onChange({ ...c, ...patch });
  const [stepId, setStepId] = useState(STEPS[0]!.id);
  const index = Math.max(0, STEPS.findIndex((s) => s.id === stepId));
  const step = STEPS[index]!;
  const issues = n.validate(c);
  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      <div className="stepper">
        {STEPS.map((s) => (
          <button key={s.id} className={s.id === step.id ? 'active' : ''} onClick={() => setStepId(s.id)}>
            {s.done(c) && s.id !== step.id ? <Check size={13} className="check" /> : null}
            {s.label}
          </button>
        ))}
      </div>

      {step.id === 'class' && <ClassStep c={c} set={set} />}
      {step.id === 'ancestry' && <AncestryStep c={c} set={set} />}
      {step.id === 'background' && <BackgroundStep c={c} set={set} />}
      {step.id === 'stats' && <StatsStep c={c} set={set} />}
      {step.id === 'skills' && <SkillsStep c={c} set={set} />}
      {step.id === 'gear' && <GearStep c={c} set={set} />}
      {step.id === 'details' && <DetailsStep c={c} set={set} />}
      {step.id === 'summary' && (
        <div className="col" style={{ gap: 'var(--s4)' }}>
          {issues.length > 0 ? (
            <div className="issues">
              <b className="small">Da sistemare</b>
              {issues.map((i) => (
                <span key={i}>• {i}</span>
              ))}
            </div>
          ) : (
            <span className="badge live" style={{ width: 'fit-content' }}>
              <Check size={12} /> Eroe pronto
            </span>
          )}
          <NimbleSheet data={c} editable={false} onChange={onChange} onRoll={() => undefined} />
        </div>
      )}

      <div className="row between" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)' }}>
        <button className="btn ghost" disabled={index === 0} onClick={() => setStepId(STEPS[index - 1]!.id)}>
          Indietro
        </button>
        {index < STEPS.length - 1 && (
          <button className="btn" onClick={() => setStepId(STEPS[index + 1]!.id)}>
            Avanti: {STEPS[index + 1]!.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Classe */

/** the array laid out: the best values on the key stats, then the secondary ones */
function arrange(cls: n.ClassDef | undefined, values: number[]): Record<n.StatId, number> {
  const order: n.StatId[] = cls ? [...cls.keyStats, ...cls.secondaryStats] : [...STATS];
  const sorted = [...values].sort((a, b) => b - a);
  const out = { str: 0, dex: 0, int: 0, wil: 0 };
  order.forEach((s, i) => (out[s] = sorted[i] ?? 0));
  return out;
}

function ClassStep({ c, set }: { c: C; set: Set }) {
  const cls = n.classOf(c);
  const pick = (x: n.ClassDef) => {
    if (x.id === c.classId) return;
    set({
      classId: x.id,
      subclassId: null,
      choices: {},
      extraSchool: null,
      extraSave: null,
      items: [],
      gold: 0,
      stats: c.array === 'custom' ? c.stats : arrange(x, n.STAT_ARRAYS[c.array].values),
    });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {n.CLASSES.map((x) => (
          <button key={x.id} className={`option ${c.classId === x.id ? 'on' : ''}`} onClick={() => pick(x)}>
            <b>{x.name}</b>
            <small>{x.tagline}</small>
            <span className="faint">
              {x.keyStats.map((s) => STAT_INFO[s].short).join('/')} · d{x.hitDie} · {'●'.repeat(x.complexity)}
              {'○'.repeat(Math.max(0, 3 - x.complexity))}
            </span>
          </button>
        ))}
      </div>
      {cls && (
        <div className="detail">
          <b>{cls.name}</b>
          <span className="small">
            Caratteristiche chiave: {cls.keyStats.map((s) => STAT_INFO[s].name).join(' e ')} · secondarie: {cls.secondaryStats.map((s) => STAT_INFO[s].name).join(' e ')}
          </span>
          <span className="small">
            PF iniziali {cls.startHp} · Dado Vita d{cls.hitDie} · TS favorito {STAT_INFO[cls.saves.adv].name}, sfavorito {STAT_INFO[cls.saves.dis].name}
          </span>
          <span className="small">
            Armature: {cls.armorText} · Armi: {cls.weaponsText}
          </span>
          {cls.magic && (
            <span className="small">
              Magia: {cls.magic.schools.map((s) => n.SCHOOLS[s].name).join(', ')}
              {cls.magic.mana ? ` · mana ${cls.magic.mana.times > 1 ? `(${STAT_INFO[cls.magic.mana.stat].short}×${cls.magic.mana.times})+LIV` : `${STAT_INFO[cls.magic.mana.stat].short}+LIV`}, dal livello 2` : ' · niente mana'}
            </span>
          )}
          <div className="col" style={{ gap: 4, marginTop: 6 }}>
            {cls.features
              .filter((f) => f.level === 1)
              .map((f) => (
                <span key={f.name} className="small">
                  <b>{f.name}.</b> {f.text}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Stirpe */

function AncestryStep({ c, set }: { c: C; set: Set }) {
  const a = n.ancestryOf(c);
  const cls = n.classOf(c);
  const pick = (x: n.AncestryDef) => {
    const langs = c.languages.filter((l) => l !== a?.bonus.language);
    set({ ancestryId: x.id, extraSave: null, languages: x.bonus.language && !langs.includes(x.bonus.language) ? [...langs, x.bonus.language] : langs });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {[false, true].map((exotic) => (
        <div key={String(exotic)} className="col" style={{ gap: 6 }}>
          <b className="small muted">{exotic ? 'Stirpi esotiche' : 'Stirpi comuni'}</b>
          <div className="option-grid">
            {n.ANCESTRIES.filter((x) => !!x.exotic === exotic).map((x) => (
              <button key={x.id} className={`option ${c.ancestryId === x.id ? 'on' : ''}`} onClick={() => pick(x)}>
                <b>{x.name}</b>
                <small>{x.trait.name}</small>
                <span className="faint">Taglia {x.size}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {a && (
        <div className="detail">
          <b>{a.name}</b>
          <span className="small muted">{a.text}</span>
          <span className="small">
            <b>{a.trait.name}.</b> {a.trait.text}
          </span>
          {a.bonus.saves === 'neutral-to-adv' && (
            <label className="row small">
              <span className="muted">TS neutro che diventa favorito</span>
              <select className="select" value={c.extraSave ?? ''} onChange={(e) => set({ extraSave: (e.target.value || null) as n.StatId | null })} aria-label="TS favorito in più">
                <option value="">—</option>
                {STATS.filter((s) => !cls || (s !== cls.saves.adv && s !== cls.saves.dis)).map((s) => (
                  <option key={s} value={s}>
                    {STAT_INFO[s].name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Background */

function BackgroundStep({ c, set }: { c: C; set: Set }) {
  const b = n.backgroundOf(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {n.BACKGROUNDS.map((x) => (
          <button key={x.id} className={`option ${c.backgroundId === x.id ? 'on' : ''}`} onClick={() => set({ backgroundId: x.id })}>
            <b>{x.name}</b>
            <small>{x.text.length > 90 ? `${x.text.slice(0, 88)}…` : x.text}</small>
            {x.req && <span className="faint">{x.req}</span>}
          </button>
        ))}
      </div>
      {b && (
        <div className="detail">
          <b>{b.name}</b>
          <span className="small">{b.text}</span>
          {b.req && <span className="small muted">Requisito: {b.req}</span>}
        </div>
      )}
      <div className="col" style={{ gap: 6 }}>
        <div className="row between">
          <b className="small">Motivazione</b>
          <button className="btn ghost sm" onClick={() => set({ motivation: n.MOTIVATIONS[roll(`1d${n.MOTIVATIONS.length}`).total - 1]! })}>
            <Dices size={13} /> A caso
          </button>
        </div>
        <select className="select" value={n.MOTIVATIONS.includes(c.motivation) ? c.motivation : ''} onChange={(e) => e.target.value && set({ motivation: e.target.value })} aria-label="Motivazione dalla lista">
          <option value="">Scegli dalla lista…</option>
          {n.MOTIVATIONS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input className="input" value={c.motivation} onChange={(e) => set({ motivation: e.target.value })} placeholder="…o scrivi la tua" aria-label="Motivazione" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Caratteristiche */

function StatsStep({ c, set }: { c: C; set: Set }) {
  const cls = n.classOf(c);
  const values = c.array === 'custom' ? null : n.STAT_ARRAYS[c.array].values;
  // picking a value for a stat swaps it with the stat that had it
  const assign = (s: n.StatId, v: number) => {
    const other = STATS.find((x) => x !== s && c.stats[x] === v && c.stats[s] !== v);
    set({ stats: { ...c.stats, [s]: v, ...(other ? { [other]: c.stats[s] } : {}) } });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {(Object.keys(n.STAT_ARRAYS) as ArrayId[]).map((id) => (
          <button key={id} className={`option ${c.array === id ? 'on' : ''}`} onClick={() => set({ array: id, stats: arrange(cls, n.STAT_ARRAYS[id].values) })}>
            <b>{n.STAT_ARRAYS[id].name}</b>
            <small>{n.STAT_ARRAYS[id].values.map(n.fmt).join(', ')}</small>
          </button>
        ))}
        <button className={`option ${c.array === 'custom' ? 'on' : ''}`} onClick={() => set({ array: 'custom' })}>
          <b>Libera</b>
          <small>Valori decisi col master</small>
        </button>
      </div>
      <div className="col" style={{ gap: 6 }}>
        {STATS.map((s) => {
          const role = cls?.keyStats.includes(s) ? 'chiave' : cls?.secondaryStats.includes(s) ? 'secondaria' : '';
          const kind = n.saveKind(c, s);
          return (
            <div key={s} className="row" style={{ gap: 8 }}>
              <span className="grow small">
                <b>{STAT_INFO[s].name}</b> <span className="faint tiny">{role}</span>
                {kind !== 'neutral' && <span className="faint tiny"> · TS {kind === 'adv' ? 'favorito' : 'sfavorito'}</span>}
              </span>
              {values ? (
                <select className="select" style={{ width: 80 }} value={c.stats[s]} onChange={(e) => assign(s, Number(e.target.value))} aria-label={STAT_INFO[s].name}>
                  {[...new Set(values)].map((v) => (
                    <option key={v} value={v}>
                      {n.fmt(v)}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input num" type="number" min={-3} max={6} value={c.stats[s]} onChange={(e) => set({ stats: { ...c.stats, [s]: Math.max(-3, Math.min(6, Number(e.target.value) || 0)) } })} style={{ width: 80 }} aria-label={STAT_INFO[s].name} />
              )}
            </div>
          );
        })}
      </div>
      <span className="faint tiny">{STATS.map((s) => `${STAT_INFO[s].short}: ${STAT_INFO[s].text}`).join(' ')}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- Abilità */

function SkillsStep({ c, set }: { c: C; set: Set }) {
  const free = n.skillPointsTotal(c) - n.skillPointsUsed(c);
  const setPoints = (k: n.SkillId, v: number) => set({ skillPoints: { ...c.skillPoints, [k]: Math.max(0, v) } });
  return (
    <div className="col" style={{ gap: 'var(--s3)' }}>
      <span className="small">
        Ogni abilità parte dalla sua caratteristica. Hai <b>{n.skillPointsTotal(c)}</b> punti da distribuire (ne restano <b>{free}</b>); nessuna abilità supera +12.
      </span>
      <div className="rows">
        {SKILLS.map((k) => {
          const pts = c.skillPoints[k] ?? 0;
          const v = n.skillValue(c, k);
          return (
            <div key={k} className="r" title={SKILL_INFO[k].text}>
              <span className="grow">
                {SKILL_INFO[k].name} <span className="faint tiny">{STAT_INFO[SKILL_INFO[k].stat].short}</span>
              </span>
              <button className="btn ghost sm icon" aria-label={`${SKILL_INFO[k].name} meno uno`} disabled={pts <= 0} onClick={() => setPoints(k, pts - 1)}>
                <Minus size={11} />
              </button>
              <span className="faint tiny" style={{ minWidth: 16, textAlign: 'center' }}>
                {pts}
              </span>
              <button className="btn ghost sm icon" aria-label={`${SKILL_INFO[k].name} più uno`} disabled={free <= 0 || v >= 12} onClick={() => setPoints(k, pts + 1)}>
                <Plus size={11} />
              </button>
              <b style={{ minWidth: 28, textAlign: 'right' }}>{n.fmt(v)}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Equipaggiamento */

function GearStep({ c, set }: { c: C; set: Set }) {
  const cls = n.classOf(c);
  const kit = cls ? n.startingItems(cls) : [];
  const usingKit = c.items.length > 0;
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {!cls && <span className="faint small">Scegli prima una classe.</span>}
      {cls && (
        <div className="option-grid">
          <button className={`option ${usingKit ? 'on' : ''}`} onClick={() => set({ items: n.startingItems(cls), gold: 0 })}>
            <b>Equipaggiamento della classe</b>
            <small>{kit.map((i) => i.name).join(', ')}</small>
          </button>
          <button className={`option ${!usingKit && c.gold > 0 ? 'on' : ''}`} onClick={() => set({ items: [], gold: 50 })}>
            <b>50 monete d’oro</b>
            <small>Compri quello che vuoi dalla scheda (Inventario)</small>
          </button>
        </div>
      )}
      {usingKit && (
        <div className="detail">
          <b className="small">Nello zaino</b>
          {c.items.map((i) => (
            <span key={i.id} className="small">
              • {i.name}
              {i.equipped ? ' (indossata)' : ''}
            </span>
          ))}
          <span className="faint tiny">
            Spazi: {n.slotsUsed(c)}/{n.inventorySlots(c)} · Armatura {n.armorValue(c)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Dettagli */

function DetailsStep({ c, set }: { c: C; set: Set }) {
  const extra = Math.max(0, c.stats.int);
  const chosen = c.languages.filter((l) => l !== 'Comune' && l !== n.ancestryOf(c)?.bonus.language).length;
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="fields">
        <label className="field">
          <span>Nome</span>
          <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Brunna Spaccaferro" />
        </label>
      </div>
      <div className="col" style={{ gap: 6 }}>
        <b className="small">Lingue</b>
        <span className="faint tiny">
          Conosci il Comune (e la lingua della tua stirpe, se ne ha una) più tante lingue quanta è la tua INT: {extra} (scelte {chosen}).
        </span>
        <div className="row wrap" style={{ gap: 4 }}>
          {n.LANGUAGES.map((l) => (
            <button key={l.name} className={`chip sm ${c.languages.includes(l.name) ? 'on' : ''}`} title={l.who} onClick={() => set({ languages: c.languages.includes(l.name) ? c.languages.filter((x) => x !== l.name) : [...c.languages, l.name] })}>
              {l.name}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Note</span>
        <textarea className="input" rows={3} value={c.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Aspetto, carattere, legami con gli altri eroi…" />
      </label>
    </div>
  );
}

import { roll } from '@thevtt/shared';
import { warhammer as w } from '@thevtt/systems';
import { Check, Dices, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { BuilderProps } from '..';
import { WtowSheet } from './Sheet';

type C = w.WtowCharacter;
type Set = (patch: Partial<C>) => void;
const { CHARACTERISTICS, CHAR_INFO, SKILLS, SKILL_INFO } = w;

const d = (sides: number) => roll(`1d${sides}`).total;

/** Rolled steps are worth 1 PE each, chosen ones nothing. */
function rolledPatch(c: C, step: string, rolled: boolean): Partial<C> {
  const had = c.rolled.includes(step);
  if (rolled === had) return {};
  return { rolled: rolled ? [...c.rolled, step] : c.rolled.filter((x) => x !== step), xp: { ...c.xp, total: Math.max(0, c.xp.total + (rolled ? 1 : -1)) } };
}

/** "Regni degli Elfi Silvani, Boschi, Regno di Bretonnia o Branchi Bercianti" → the plain items */
const loreItems = (text: string) =>
  text
    .split(/,(?![^(]*\))/)
    .map((x) => x.trim())
    .filter(Boolean);

interface Step {
  id: string;
  label: string;
  done: (c: C) => boolean;
  show?: (c: C) => boolean;
}

const STEPS: Step[] = [
  { id: 'lineage', label: 'Stirpe', done: (c) => !!c.lineage },
  { id: 'chars', label: 'Caratteristiche', done: (c) => c.boosts.length === 3 && new Set(c.boosts).size === 3 },
  { id: 'career', label: 'Carriera', done: (c) => !!w.getCareer(c) },
  {
    id: 'skills',
    label: 'Abilità',
    done: (c) => {
      const l = w.getLineage(c);
      return !!l && c.careerSkills.length === 4 && c.lineageSkills.filter((s) => !l.skills.includes(s)).length === l.chooseSkills;
    },
  },
  { id: 'talents', label: 'Talenti', done: (c) => c.talents.length > 0 },
  { id: 'magic', label: 'Incantesimi', show: (c) => w.mageLevel(c) > 0, done: (c) => c.magic.spells.length >= 3 },
  { id: 'lore', label: 'Saperi', done: (c) => c.lore.length > 0 },
  { id: 'gear', label: 'Equipaggiamento', done: (c) => c.weapons.length > 0 || !!c.gear },
  { id: 'finish', label: 'Tocchi finali', done: (c) => !!c.finish },
  { id: 'details', label: 'Dettagli', done: (c) => !!c.name.trim() },
  { id: 'summary', label: 'Riepilogo', done: () => false },
];

export function WtowBuilder({ value, onChange }: BuilderProps<C>) {
  const c = w.normalize(value);
  const set: Set = (patch) => onChange({ ...c, ...patch });
  const steps = STEPS.filter((s) => !s.show || s.show(c));
  const [stepId, setStepId] = useState(steps[0]!.id);
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[index]!;
  const issues = w.validate(c);

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      <div className="stepper">
        {steps.map((s) => (
          <button key={s.id} className={s.id === step.id ? 'active' : ''} onClick={() => setStepId(s.id)}>
            {s.done(c) && s.id !== step.id ? <Check size={13} className="check" /> : null}
            {s.label}
          </button>
        ))}
      </div>
      {c.xp.total > 0 && <span className="faint tiny">PE dai tiri casuali: {c.rolled.length} · PE totali {c.xp.total}</span>}

      {step.id === 'lineage' && <LineageStep c={c} set={set} />}
      {step.id === 'chars' && <CharsStep c={c} set={set} />}
      {step.id === 'career' && <CareerStep c={c} set={set} />}
      {step.id === 'skills' && <SkillsStep c={c} set={set} />}
      {step.id === 'talents' && <TalentsStep c={c} set={set} />}
      {step.id === 'magic' && <SpellsStep c={c} set={set} />}
      {step.id === 'lore' && <LoreStep c={c} set={set} />}
      {step.id === 'gear' && <GearStep c={c} set={set} />}
      {step.id === 'finish' && <FinishStep c={c} set={set} />}
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
              <Check size={12} /> Personaggio pronto
            </span>
          )}
          <WtowSheet data={c} editable={false} onChange={onChange} onRoll={() => undefined} />
        </div>
      )}

      <div className="row between" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)' }}>
        <button className="btn ghost" disabled={index === 0} onClick={() => setStepId(steps[index - 1]!.id)}>
          Indietro
        </button>
        {index < steps.length - 1 && (
          <button className="btn" onClick={() => setStepId(steps[index + 1]!.id)}>
            Avanti: {steps[index + 1]!.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Stirpe */

function LineageStep({ c, set }: { c: C; set: Set }) {
  const pick = (id: w.LineageId, rolled: boolean) => {
    const l = w.LINEAGES.find((x) => x.id === id)!;
    const career = w.getCareer(c);
    set({
      lineage: id,
      lineageSkills: [],
      // the lineage's own talents come with it
      talents: (l.fixedTalents ?? []).map((n) => ({ id: w.talentByName(n)!.id })),
      lore: loreItems(l.lore.join(', ')).filter((x) => !/ o |a scelta/.test(x)),
      career: career && career.lineages && !career.lineages.includes(id) ? null : c.career,
      ...rolledPatch(c, 'lineage', rolled),
    });
  };
  const l = w.getLineage(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row">
        <button
          className="btn ghost sm"
          onClick={() => {
            const n = d(10);
            pick(w.RANDOM_LINEAGE.find(([lo, hi]) => n >= lo && n <= hi)![2], true);
          }}
        >
          <Dices size={14} /> Tira a caso (+1 PE)
        </button>
      </div>
      <div className="option-grid">
        {w.LINEAGES.map((x) => (
          <button key={x.id} className={`option ${c.lineage === x.id ? 'on' : ''}`} onClick={() => pick(x.id, false)}>
            <b>{x.name}</b>
            <small>
              {CHARACTERISTICS.map((k) => `${CHAR_INFO[k].short} ${w.BASE_CHARS[x.species][k]}`).join(' · ')}
            </small>
            <span className="faint">Fato {x.fate}</span>
          </button>
        ))}
      </div>
      {l && (
        <div className="detail">
          <b>{l.name}</b>
          <span className="small">
            Abilità a 3: {l.skills.map((s) => SKILL_INFO[s].name).join(', ') || '—'}
            {l.chooseSkills ? ` più ${l.chooseSkills} a scelta` : ''}
          </span>
          <span className="small">Saperi: {l.lore.join(', ')}</span>
          <span className="small">
            Talenti: {l.talentRolls === 1 ? 'un tiro' : 'due tiri'} sulla tabella{l.fixedTalents ? `; in più ${l.fixedTalents.join(' e ')}` : ''}. {l.talentNote ?? ''}
          </span>
          <span className="faint tiny">Massimi: {CHARACTERISTICS.map((k) => `${CHAR_INFO[k].short} ${w.MAX_CHARS[l.species][k]}`).join(' · ')}</span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Caratteristiche */

function CharsStep({ c, set }: { c: C; set: Set }) {
  const l = w.getLineage(c);
  const toggle = (k: w.CharId | 'fato') => {
    const has = c.boosts.includes(k);
    const boosts = has ? c.boosts.filter((b) => b !== k) : c.boosts.length < 3 ? [...c.boosts, k] : c.boosts;
    set({ boosts, ...rolledPatch(c, 'chars', false) });
  };
  const randomize = () => {
    const picked: (w.CharId | 'fato')[] = [];
    let choice = 0;
    // three different results; a 10 is a free choice
    for (let guard = 0; picked.length + choice < 3 && guard < 50; guard++) {
      const r = w.CHAR_MOD_TABLE[d(10) - 1]!;
      if (r === 'scelta') choice++;
      else if (!picked.includes(r)) picked.push(r);
    }
    set({ boosts: picked, ...rolledPatch(c, 'chars', true) });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <p className="small muted">
        La Stirpe dà i valori di partenza; tre +1 a Caratteristiche diverse (o al Fato) li personalizzano. Tirando si guadagna 1 PE (un 10 è a scelta).
      </p>
      <div className="row">
        <button className="btn ghost sm" onClick={randomize} disabled={!l}>
          <Dices size={14} /> Tira i tre +1 (+1 PE)
        </button>
        <span className="faint small">{3 - c.boosts.length > 0 ? `Ne mancano ${3 - c.boosts.length}` : 'Tutti assegnati'}</span>
      </div>
      <div className="wtow-boosts">
        {CHARACTERISTICS.map((k) => (
          <button key={k} className={`option ${c.boosts.includes(k) ? 'on' : ''}`} onClick={() => toggle(k)} disabled={!l}>
            <small>{CHAR_INFO[k].name}</small>
            <b>{w.characteristic(c, k)}</b>
            <span className="faint">{c.boosts.includes(k) ? '+1' : ''}</span>
          </button>
        ))}
        <button className={`option ${c.boosts.includes('fato') ? 'on' : ''}`} onClick={() => toggle('fato')} disabled={!l}>
          <small>Fato</small>
          <b>{w.fateMax(c)}</b>
          <span className="faint">{c.boosts.includes('fato') ? '+1' : ''}</span>
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Carriera */

function CareerStep({ c, set }: { c: C; set: Set }) {
  const l = w.getLineage(c);
  const pick = (id: string, rolled: boolean) => {
    const career = w.CAREERS.find((x) => x.id === id)!;
    const extra = loreItems(career.lore).filter((x) => !/ o |a scelta|uno a scelta|\(…\)/.test(x));
    const lineageLore = l ? loreItems(l.lore.join(', ')).filter((x) => !/ o |a scelta/.test(x)) : [];
    set({
      career: id,
      careerSkills: [],
      lore: [...new Set([...lineageLore, ...extra])],
      gear: career.gear,
      resources: career.resources,
      coins: { bronzo: { owned: 0, spent: 0 }, argento: { owned: 0, spent: 0 }, oro: { owned: 0, spent: 0 }, [career.status]: { owned: 3, spent: 0 } },
      ...rolledPatch(c, 'career', rolled),
    });
  };
  const career = w.getCareer(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {!l && <p className="muted small">Scegli prima la Stirpe.</p>}
      <div className="row">
        <button
          className="btn ghost sm"
          disabled={!l}
          onClick={() => {
            const n = d(100);
            const found = w.CAREERS.find((x) => {
              const r = x.random[l!.id];
              return r && n >= r[0] && n <= r[1];
            });
            if (found) pick(found.id, true);
          }}
        >
          <Dices size={14} /> Tira d100 (+1 PE)
        </button>
      </div>
      <div className="option-grid">
        {w.CAREERS.map((x) => {
          const allowed = !l || !x.lineages || x.lineages.includes(l.id);
          return (
            <button key={x.id} className={`option ${c.career === x.id ? 'on' : ''}`} disabled={!allowed} onClick={() => pick(x.id, false)} title={allowed ? undefined : 'Non aperta alla tua Stirpe'}>
              <b>{x.name}</b>
              <small>{x.primary.map((k) => CHAR_INFO[k].short).join(' · ')}</small>
              <span className="faint">{w.STATUS_LABEL[x.status]}</span>
            </button>
          );
        })}
      </div>
      {career && (
        <div className="detail">
          <b>
            {career.name} · Status {w.STATUS_LABEL[career.status]}
          </b>
          <span className="small">Caratteristiche Primarie (migliorarle costa 1 PE in meno): {career.primary.map((k) => CHAR_INFO[k].name).join(', ')}</span>
          <span className="small">+1 a quattro tra: {career.skills.map((s) => SKILL_INFO[s].name).join(', ')}</span>
          <span className="small">Saperi: {career.lore}</span>
          <span className="small">Averi: {career.gear}</span>
          <span className="small">Risorse: {career.resources}</span>
          <span className="small">Contatti: {career.contacts}</span>
          <span className="small">
            <b>{career.talent.name}</b>: {career.talent.text}
          </span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Abilità */

function SkillsStep({ c, set }: { c: C; set: Set }) {
  const l = w.getLineage(c);
  const career = w.getCareer(c);
  if (!l || !career) return <p className="muted small">Scegli prima Stirpe e Carriera.</p>;
  const chosen = c.lineageSkills.filter((s) => !l.skills.includes(s));
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {l.chooseSkills > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <span className="small">
            <b>Stirpe</b>: porta a 3 {l.chooseSkills} abilità a scelta ({chosen.length}/{l.chooseSkills})
          </span>
          <div className="row wrap" style={{ gap: 4 }}>
            {SKILLS.filter((s) => !l.skills.includes(s)).map((s) => {
              const on = chosen.includes(s);
              return (
                <button
                  key={s}
                  className={`chip sm ${on ? 'on' : ''}`}
                  disabled={!on && chosen.length >= l.chooseSkills}
                  onClick={() => set({ lineageSkills: on ? c.lineageSkills.filter((x) => x !== s) : [...c.lineageSkills, s], finishSkills: [] })}
                >
                  {SKILL_INFO[s].name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="col" style={{ gap: 6 }}>
        <span className="small">
          <b>Carriera</b>: +1 a quattro tra queste ({c.careerSkills.length}/4)
        </span>
        <div className="row wrap" style={{ gap: 4 }}>
          {career.skills.map((s) => {
            const on = c.careerSkills.includes(s);
            return (
              <button
                key={s}
                className={`chip sm ${on ? 'on' : ''}`}
                disabled={!on && c.careerSkills.length >= 4}
                onClick={() => set({ careerSkills: on ? c.careerSkills.filter((x) => x !== s) : [...c.careerSkills, s], finishSkills: [] })}
              >
                {SKILL_INFO[s].name}
              </button>
            );
          })}
        </div>
      </div>
      <SkillTable c={c} />
    </div>
  );
}

function SkillTable({ c }: { c: C }) {
  return (
    <div className="wtow-skilltable">
      {SKILLS.map((s) => (
        <div key={s} className="row between small">
          <span>
            {SKILL_INFO[s].name} <span className="faint tiny">{CHAR_INFO[SKILL_INFO[s].char].short}</span>
          </span>
          <b>{w.skill(c, s)}</b>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Talenti */

function TalentsStep({ c, set }: { c: C; set: Set }) {
  const l = w.getLineage(c);
  if (!l) return <p className="muted small">Scegli prima la Stirpe.</p>;
  const fixed = new Set((l.fixedTalents ?? []).map((n) => w.talentByName(n)!.id));
  // elves swap one of their two rolls for Riflessi Fulminei
  const swap = l.id === 'alto-elfo' || l.id === 'elfo-silvano' ? 1 : 0;
  const picks = l.talentRolls - swap + (c.finish === 'talent' ? 1 : 0);
  const optional = l.id === 'bretonniano' ? 'Codice d’Onore' : l.id === 'nano' ? 'Resistenza Magica' : null;
  const table = [...l.talentTable, ...(optional ? [optional] : [])].map((n) => w.talentByName(n)!).filter(Boolean);
  const chosen = c.talents.filter((t) => !fixed.has(t.id));
  const toggle = (id: string) => {
    const on = chosen.some((t) => t.id === id);
    const next = on ? c.talents.filter((t) => t.id !== id) : chosen.length < picks ? [...c.talents, { id }] : c.talents;
    set({ talents: next, ...rolledPatch(c, 'talents', false) });
  };
  const randomize = () => {
    const ids = new Set<string>();
    for (let guard = 0; ids.size < picks && guard < 60; guard++) {
      const t = w.talentByName(l.talentTable[d(10) - 1]!)!;
      if (!fixed.has(t.id)) ids.add(t.id);
    }
    set({ talents: [...[...fixed].map((id) => ({ id })), ...[...ids].map((id) => ({ id }))] });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <p className="small muted">
        {picks === 1 ? 'Un Talento' : `${picks} Talenti`} dalla tabella della Stirpe{fixed.size ? `, più ${[...fixed].map((id) => w.talentInfo(id)?.name).join(' e ')}` : ''}. {l.talentNote ?? ''}
      </p>
      <div className="row">
        <button className="btn ghost sm" onClick={randomize}>
          <Dices size={14} /> Tira sulla tabella
        </button>
        <span className="faint small">
          {chosen.length}/{picks}
        </span>
      </div>
      <div className="col" style={{ gap: 6 }}>
        {table.map((t) => {
          const on = chosen.some((x) => x.id === t.id);
          const isFixed = fixed.has(t.id);
          return (
            <button key={t.id} className={`option ${on || isFixed ? 'on' : ''}`} disabled={isFixed || (!on && chosen.length >= picks)} onClick={() => toggle(t.id)} style={{ textAlign: 'left' }}>
              <b>
                {t.name} <span className="faint small">· {t.req}</span>
              </b>
              <small>{t.text}</small>
            </button>
          );
        })}
      </div>
      {chosen.some((t) => ['odio', 'codice-donore', 'lignaggio-segreto'].includes(t.id)) && (
        <div className="col" style={{ gap: 4 }}>
          {chosen
            .filter((t) => ['odio', 'codice-donore', 'lignaggio-segreto'].includes(t.id))
            .map((t) => (
              <label key={t.id} className="row small">
                <span style={{ width: 160 }}>{w.talentInfo(t.id)?.name}</span>
                <input
                  className="input grow"
                  placeholder={t.id === 'odio' ? 'Chi odi?' : t.id === 'codice-donore' ? 'Il tuo giuramento' : 'Il segreto della tua nascita'}
                  value={t.note ?? ''}
                  onChange={(e) => set({ talents: c.talents.map((x) => (x.id === t.id ? { ...x, note: e.target.value } : x)) })}
                />
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Incantesimi */

function SpellsStep({ c, set }: { c: C; set: Set }) {
  const lores = w.MAGIC_LORES.filter((x) => c.lore.includes(x));
  const [lore, setLore] = useState<w.MagicLore>(lores[0] ?? 'Magia da Battaglia');
  const toggle = (id: string) => {
    const on = c.magic.spells.some((s) => s.id === id);
    set({ magic: { ...c.magic, spells: on ? c.magic.spells.filter((s) => s.id !== id) : [...c.magic.spells, { id, memorized: c.career === 'fattucchiere' }] } });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <p className="small muted">
        {c.career === 'fattucchiere' ? 'Il Fattucchiere ha memorizzato 3 incantesimi' : 'Il Mago Arcano ha un grimorio con 3 incantesimi'} del suo Sapere Magico. Ricordati di aggiungere il
        Sapere Magico nel passo dei Saperi.
      </p>
      <div className="row wrap" style={{ gap: 4 }}>
        {w.MAGIC_LORES.map((x) => (
          <button key={x} className={`chip sm ${lore === x ? 'on' : ''}`} onClick={() => setLore(x)}>
            {x}
            {c.lore.includes(x) ? ' ✓' : ''}
          </button>
        ))}
        {!c.lore.includes(lore) && (
          <button className="chip sm" onClick={() => set({ lore: [...c.lore, lore] })}>
            <Plus size={11} /> Impara {lore}
          </button>
        )}
      </div>
      <div className="col" style={{ gap: 6 }}>
        {w.SPELLS.filter((s) => s.lore === lore).map((s) => {
          const on = c.magic.spells.some((x) => x.id === s.id);
          return (
            <button key={s.id} className={`option ${on ? 'on' : ''}`} style={{ textAlign: 'left' }} onClick={() => toggle(s.id)}>
              <b>
                {s.name} <span className="faint small">VM {s.vm} · {s.target} · {s.range} · {s.duration}</span>
              </b>
              <small>{s.text}</small>
            </button>
          );
        })}
      </div>
      <span className="faint small">Scelti: {c.magic.spells.length}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ Saperi */

function LoreStep({ c, set }: { c: C; set: Set }) {
  const [text, setText] = useState('');
  const l = w.getLineage(c);
  const career = w.getCareer(c);
  const add = (x: string) => {
    const v = x.trim();
    if (v && !c.lore.includes(v)) set({ lore: [...c.lore, v] });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="detail">
        {l && <span className="small">Dalla Stirpe: {l.lore.join(', ')}</span>}
        {career && <span className="small">Dalla Carriera: {career.lore}</span>}
        <span className="faint tiny">Dove c’è una scelta (o, a scelta, …) aggiungi tu il Sapere giusto. Un Sapere doppio non dà nulla in più.</span>
      </div>
      <div className="row wrap" style={{ gap: 4 }}>
        {c.lore.map((x) => (
          <span key={x} className="chip sm on">
            {x}
            <button className="btn ghost icon" style={{ width: 16, height: 16 }} aria-label={`Togli ${x}`} onClick={() => set({ lore: c.lore.filter((y) => y !== x) })}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="row">
        <input className="input grow" list="wtow-lore" placeholder="Aggiungi un Sapere (es. Città (Talagaad))" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (add(text), setText(''))} />
        <datalist id="wtow-lore">
          {w.ALL_LORE.map((x) => (
            <option key={x} value={x.replace(' (…)', ' ()')} />
          ))}
        </datalist>
        <button className="btn sm" disabled={!text.trim()} onClick={() => (add(text), setText(''))}>
          <Plus size={13} />
        </button>
      </div>
      {w.LORE_GROUPS.map((g) => (
        <div key={g.id} className="col" style={{ gap: 4 }}>
          <span className="small">
            <b>{g.name}</b> <span className="faint tiny">{g.text}</span>
          </span>
          <div className="row wrap" style={{ gap: 4 }}>
            {g.items.map((x) => (
              <button key={x} className={`chip sm ${c.lore.includes(x) ? 'on' : ''}`} onClick={() => (x.includes('(…)') ? setText(x.replace('(…)', '(')) : c.lore.includes(x) ? set({ lore: c.lore.filter((y) => y !== x) }) : add(x))}>
                {x}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- Equipaggiamento */

function GearStep({ c, set }: { c: C; set: Set }) {
  const [adding, setAdding] = useState('');
  const career = w.getCareer(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {career && (
        <div className="detail">
          <span className="small">
            <b>Averi della Carriera</b>: {career.gear}
          </span>
          <span className="faint tiny">Dove c’è una scelta (o) prendi uno degli oggetti. Aggiungi qui le armi per usarle dalla scheda.</span>
        </div>
      )}
      <div className="col" style={{ gap: 4 }}>
        {c.weapons.map((wp, i) => {
          const a = w.attackProfile(c, wp);
          return (
            <div key={i} className="row small">
              <b className="grow">{a.name}</b>
              <span className="faint">
                {a.range} · {a.damage ?? '—'} Danni
              </span>
              <button className="btn ghost sm icon" aria-label="Togli" onClick={() => set({ weapons: c.weapons.filter((_, j) => j !== i) })}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
        <div className="row">
          <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Aggiungi un’arma…</option>
            {w.WEAPONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {x.status ? w.STATUS_LABEL[x.status] : '—'} · {x.damage ?? '—'} · {x.range}
              </option>
            ))}
          </select>
          <button
            className="btn sm"
            disabled={!adding}
            onClick={() => {
              const def = w.WEAPONS.find((x) => x.id === adding)!;
              set({ weapons: [...c.weapons, { ref: def.id, name: def.name }] });
              setAdding('');
            }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        <select className="select grow" value={c.armour ?? ''} onChange={(e) => set({ armour: e.target.value || null })}>
          <option value="">Vestiti senza armatura</option>
          {w.ARMOURS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.bonus ? ` (R+${a.bonus})` : ''}
            </option>
          ))}
        </select>
        <label className="row small">
          <input type="checkbox" checked={c.shield} onChange={(e) => set({ shield: e.target.checked })} /> Scudo
        </label>
        <span className="faint small">Resilienza {w.resilience(c)}</span>
      </div>
      <label className="col small">
        Averi
        <textarea className="input" rows={3} value={c.gear} onChange={(e) => set({ gear: e.target.value })} />
      </label>
      <label className="col small">
        Risorse {career && <span className="faint tiny">(una tra: {career.resources})</span>}
        <textarea className="input" rows={2} value={c.resources} onChange={(e) => set({ resources: e.target.value })} />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------ Tocchi finali */

function FinishStep({ c, set }: { c: C; set: Set }) {
  const choose = (finish: C['finish']) => set({ finish, finishSkills: finish === 'skills' ? c.finishSkills : [] });
  const base = (s: w.SkillId) => w.skill({ ...c, finishSkills: [] }, s);
  const toggle = (s: w.SkillId) => {
    const on = c.finishSkills.includes(s);
    if (on) return set({ finishSkills: c.finishSkills.filter((x) => x !== s) });
    // one skill from 3 to 4, or two from 2 to 3
    if (base(s) === 3) return set({ finishSkills: [s] });
    if (base(s) === 2) return set({ finishSkills: [...c.finishSkills.filter((x) => base(x) === 2), s].slice(-2) });
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        <button className={`option ${c.finish === 'skills' ? 'on' : ''}`} onClick={() => choose('skills')}>
          <b>Abilità</b>
          <small>Un’Abilità da 3 a 4, oppure due da 2 a 3.</small>
        </button>
        <button className={`option ${c.finish === 'talent' ? 'on' : ''}`} onClick={() => choose('talent')}>
          <b>Un altro Talento</b>
          <small>Un tiro in più sulla tabella della Stirpe (lo scegli nel passo dei Talenti).</small>
        </button>
        <button className={`option ${c.finish === 'resource' ? 'on' : ''}`} onClick={() => choose('resource')}>
          <b>Una Risorsa</b>
          <small>Un tiro sulla tabella delle Risorse Casuali del tuo Status: annotala tra le Risorse.</small>
        </button>
      </div>
      {c.finish === 'resource' && <ResourceRoll c={c} set={set} />}
      {c.finish === 'skills' && (
        <div className="row wrap" style={{ gap: 4 }}>
          {SKILLS.filter((s) => base(s) === 2 || base(s) === 3).map((s) => (
            <button key={s} className={`chip sm ${c.finishSkills.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)}>
              {SKILL_INFO[s].name} {base(s)}→{base(s) + 1}
            </button>
          ))}
        </div>
      )}
      <p className="faint small">Poi: Velocità Normale, Resilienza = Resistenza + armatura ({w.resilience(c)}), e si comincia giocando il Tetro Presagio.</p>
    </div>
  );
}

/** Risorse Casuali: d100 sulla colonna del proprio Status, o di quella sopra per 1 PE. */
function ResourceRoll({ c, set }: { c: C; set: Set }) {
  const status = w.statusOf(c);
  const [last, setLast] = useState<string | null>(null);
  const go = (up: boolean) => {
    const st = up ? w.statusAbove(status) : status;
    const n = d(100);
    const res = w.resourceFor(st, n);
    setLast(`${n}: ${res} (${w.STATUS_LABEL[st]})`);
    set({ resources: [c.resources.trim(), res].filter(Boolean).join('\n'), ...(up ? { xp: { ...c.xp, spent: c.xp.spent + 1 } } : {}) });
  };
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => go(false)}>
          <Dices size={14} /> Tira d100 ({w.STATUS_LABEL[status]})
        </button>
        {status !== 'oro' && (
          <button className="btn ghost sm" onClick={() => go(true)} title="Le risorse sopra il tuo Status vengono spesso confiscate o rubate">
            <Dices size={14} /> Status {w.STATUS_LABEL[w.statusAbove(status)]} (1 PE)
          </button>
        )}
      </div>
      {last && <span className="small">{last}: aggiunta alle Risorse.</span>}
      <div className="rows tiny wtow-table">
        {w.RANDOM_RESOURCES.map((r) => (
          <div key={r.min} className="r">
            <b style={{ width: 52 }}>
              {String(r.min).padStart(2, '0')}-{r.max === 100 ? '00' : r.max}
            </b>
            <span className={`grow ${status === 'bronzo' ? '' : 'muted'}`}>{r.bronzo}</span>
            <span className={`grow ${status === 'argento' ? '' : 'muted'}`}>{r.argento}</span>
            <span className={`grow ${status === 'oro' ? '' : 'muted'}`}>{r.oro}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Contatti: d100 sulla tabella di un gruppo, o la scelta di un rapporto. */
function ContactPicker({ c, set }: { c: C; set: Set }) {
  const career = w.getCareer(c);
  const named = w.CONTACTS.filter((g) => career?.contacts.toLowerCase().includes(g.name.toLowerCase()));
  const groups = named.length ? named : w.CONTACTS;
  const [group, setGroup] = useState(groups[0]!.name);
  const g = w.CONTACTS.find((x) => x.name === group) ?? groups[0]!;
  const add = (contact: w.Contact, row: w.ContactRow) =>
    set({ contacts: [...c.contacts.filter((x) => x.name.trim()), { name: `${contact.name} (${contact.role})`, bond: row.text }] });
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row wrap" style={{ gap: 6 }}>
        <select className="select" value={g.name} onChange={(e) => setGroup(e.target.value)} aria-label="Gruppo di Contatti">
          {w.CONTACTS.map((x) => (
            <option key={x.name} value={x.name}>
              {x.name}
              {named.includes(x) ? ' ★' : ''}
            </option>
          ))}
        </select>
        <button
          className="btn sm"
          onClick={() => {
            const r = w.contactFor(g, d(100));
            add(r.contact, r.row);
          }}
        >
          <Dices size={14} /> Tira d100
        </button>
      </div>
      <div className="col wtow-contacts" style={{ gap: 4, maxHeight: 220, overflow: 'auto' }}>
        {g.contacts.map((ct) => (
          <div key={ct.name} className="col" style={{ gap: 2 }}>
            <span className="small">
              <b>{ct.name}</b> <span className="muted">{ct.role}</span> <span className="faint tiny">({ct.archetype})</span>
            </span>
            {ct.rows.map((r) => (
              <button key={r.min} className="r ghost-row tiny" style={{ textAlign: 'left' }} onClick={() => add(ct, r)} title="Scegli questo rapporto">
                <b style={{ width: 44 }}>
                  {String(r.min).padStart(2, '0')}-{r.max === 100 ? '00' : r.max}
                </b>
                <span className="muted">{r.text}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Dettagli */

function DetailsStep({ c, set }: { c: C; set: Set }) {
  const career = w.getCareer(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <label className="col small">
        Nome
        <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Gunter Krebs" />
      </label>
      <div className="col small" style={{ gap: 4 }}>
        <span>
          Contatti <span className="faint tiny">(due, dalle tabelle di {career?.contacts ?? 'Contatti della Carriera'})</span>
        </span>
        {c.contacts.map((ct, i) => (
          <div key={i} className="row">
            <input className="input grow" value={ct.name} placeholder="Nome" onChange={(e) => set({ contacts: c.contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <input className="input grow" value={ct.bond} placeholder="Legame" onChange={(e) => set({ contacts: c.contacts.map((x, j) => (j === i ? { ...x, bond: e.target.value } : x)) })} />
            <button className="btn ghost sm icon" aria-label="Togli" onClick={() => set({ contacts: c.contacts.filter((_, j) => j !== i) })}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ contacts: [...c.contacts, { name: '', bond: '' }] })}>
          <Plus size={12} /> Contatto
        </button>
        <ContactPicker c={c} set={set} />
      </div>
      <label className="col small">
        Tetro Presagio <span className="faint tiny">L’evento che unisce il gruppo e come affronterai l’antagonista.</span>
        <textarea className="input" rows={3} value={c.omen} onChange={(e) => set({ omen: e.target.value })} />
      </label>
      <label className="col small">
        Aspetto, storia, legami
        <textarea className="input" rows={4} value={c.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </div>
  );
}

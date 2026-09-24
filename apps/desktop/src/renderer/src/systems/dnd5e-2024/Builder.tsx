import { dnd5e } from '@thevtt/systems';
import { Check, ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { Field, readImage, Switch, Tabs } from '../../components/ui';
import type { BuilderProps } from '..';

type C = dnd5e.Dnd5eCharacter;
type Ability = dnd5e.Ability;
type Skill = dnd5e.Skill;
const { ABILITIES, ABILITY_LABELS, SKILLS, SKILL_IDS, CLASSES, SPECIES, BACKGROUNDS, ARMORS, STANDARD_ARRAY, POINT_BUY_BUDGET, ALIGNMENTS, CUSTOM_BACKGROUND_ID } = dnd5e;

const STEPS = ['Classe', 'Origine', 'Caratteristiche', 'Abilità', 'Dettagli', 'Riepilogo'] as const;

const toggle = <T,>(list: T[], item: T, max: number): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : list.length < max ? [...list, item] : list;

export function Dnd5eBuilder({ value: c, onChange }: BuilderProps<C>) {
  const [step, setStep] = useState(0);
  const set = (patch: Partial<C>) => onChange({ ...c, ...patch });
  const cls = dnd5e.getClass(c);
  const species = dnd5e.getSpecies(c);
  const bg = dnd5e.getBackground(c);
  const done = [!!cls, !!species && !!bg, Object.keys(c.backgroundBonus).length > 0, !!cls && c.classSkills.length === cls.skillChoices, !!c.name, false];

  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="stepper">
        {STEPS.map((s, i) => (
          <button key={s} className={`${i === step ? 'active' : ''} ${done[i] && i !== step ? 'done' : ''}`} onClick={() => setStep(i)}>
            <b>{done[i] && i !== step ? <Check size={12} /> : i + 1}</b>
            {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="option-grid">
          {CLASSES.map((k) => (
            <button
              key={k.id}
              className={`option ${c.classId === k.id ? 'on' : ''}`}
              onClick={() => set({ classId: k.id, classSkills: c.classId === k.id ? c.classSkills : [] })}
            >
              <b>{k.name}</b>
              <small>{k.description}</small>
              <small className="faint">
                d{k.hitDie} · TS {k.saves.map((a) => ABILITY_LABELS[a].short).join(', ')}
              </small>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="col" style={{ gap: 'var(--s4)' }}>
          <div className="section-title">Specie</div>
          <div className="option-grid">
            {SPECIES.map((s) => (
              <button
                key={s.id}
                className={`option ${c.speciesId === s.id ? 'on' : ''}`}
                onClick={() => set({ speciesId: s.id, size: s.sizes[0]!, speciesSkills: c.speciesId === s.id ? c.speciesSkills : [] })}
              >
                <b>{s.name}</b>
                <small>{s.traits.join(' · ')}</small>
                <small className="faint">
                  {s.speed} ft{s.darkvision ? ` · Scurovisione ${s.darkvision} ft` : ''}
                </small>
              </button>
            ))}
          </div>
          {species && species.sizes.length > 1 && (
            <Field label="Taglia">
              <Tabs value={c.size} onChange={(size) => set({ size })} options={species.sizes.map((s) => ({ id: s, label: s === 'small' ? 'Piccola' : 'Media' }))} />
            </Field>
          )}

          <div className="section-title">Background</div>
          <div className="option-grid">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} className={`option ${c.backgroundId === b.id ? 'on' : ''}`} onClick={() => set({ backgroundId: b.id, backgroundBonus: {} })}>
                <b>{b.name}</b>
                <small>{b.skills.map((s) => SKILLS[s].name).join(', ')}</small>
                <small className="faint">
                  {b.abilities.map((a) => ABILITY_LABELS[a].short).join(' / ')} · {b.feat}
                </small>
              </button>
            ))}
            <button className={`option ${c.backgroundId === CUSTOM_BACKGROUND_ID ? 'on' : ''}`} onClick={() => set({ backgroundId: CUSTOM_BACKGROUND_ID, backgroundBonus: {} })}>
              <b>Personalizzato</b>
              <small>Costruisci il tuo background con il master.</small>
              <small className="faint">3 caratteristiche · 2 abilità</small>
            </button>
          </div>
          {c.backgroundId === CUSTOM_BACKGROUND_ID && (
            <div className="card col">
              <span className="muted small">Caratteristiche (3)</span>
              <div className="row wrap">
                {ABILITIES.map((a) => (
                  <button
                    key={a}
                    className={`chip ${c.customBackground.abilities.includes(a) ? 'on' : ''}`}
                    onClick={() => set({ customBackground: { ...c.customBackground, abilities: toggle(c.customBackground.abilities, a, 3) }, backgroundBonus: {} })}
                  >
                    {ABILITY_LABELS[a].name}
                  </button>
                ))}
              </div>
              <span className="muted small">Abilità (2)</span>
              <div className="row wrap">
                {SKILL_IDS.map((s) => (
                  <button
                    key={s}
                    className={`chip ${c.customBackground.skills.includes(s) ? 'on' : ''}`}
                    onClick={() => set({ customBackground: { ...c.customBackground, skills: toggle(c.customBackground.skills, s, 2) } })}
                  >
                    {SKILLS[s].name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && <AbilityStep c={c} set={set} />}

      {step === 3 && (
        <div className="col" style={{ gap: 'var(--s4)' }}>
          {!cls ? (
            <p className="muted">Scegli prima una classe.</p>
          ) : (
            <>
              <div className="section-title">
                Abilità di classe · {c.classSkills.length}/{cls.skillChoices}
              </div>
              <div className="row wrap">
                {(cls.skillList ?? SKILL_IDS).map((s) => {
                  const fromBg = bg?.skills.includes(s);
                  return (
                    <button
                      key={s}
                      disabled={fromBg}
                      title={fromBg ? 'Già data dal background' : undefined}
                      className={`chip ${c.classSkills.includes(s) || fromBg ? 'on' : ''}`}
                      onClick={() => set({ classSkills: toggle(c.classSkills, s, cls.skillChoices) })}
                    >
                      {SKILLS[s].name} <span className="faint small">{ABILITY_LABELS[SKILLS[s].ability].short}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {species?.skillChoice && (
            <>
              <div className="section-title">
                Abilità della specie ({species.name}) · {c.speciesSkills.length}/{species.skillChoice.count}
              </div>
              <div className="row wrap">
                {(species.skillChoice.from ?? SKILL_IDS).map((s) => {
                  const taken = bg?.skills.includes(s) || c.classSkills.includes(s);
                  return (
                    <button
                      key={s}
                      disabled={taken}
                      className={`chip ${c.speciesSkills.includes(s) || taken ? 'on' : ''}`}
                      onClick={() => set({ speciesSkills: toggle(c.speciesSkills, s, species.skillChoice!.count) })}
                    >
                      {SKILLS[s].name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="col" style={{ gap: 'var(--s4)' }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--s4)' }}>
            <label
              className="avatar"
              style={{
                width: 96,
                height: 96,
                borderRadius: 'calc(var(--radius) + 4px)',
                background: c.portrait ? `center/cover url(${c.portrait})` : 'var(--bg-sunken)',
                border: '1px dashed var(--border-strong)',
                cursor: 'pointer',
                color: 'var(--fg-muted)',
              }}
              title="Ritratto"
            >
              {!c.portrait && <ImagePlus size={22} />}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) set({ portrait: await readImage(f, 256) });
                }}
              />
            </label>
            <div className="col grow">
              <Field label="Nome">
                <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Come ti chiamano?" />
              </Field>
              <div className="row">
                <Field label="Livello">
                  <input className="input" type="number" min={1} max={20} value={c.level} onChange={(e) => set({ level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
                </Field>
                <Field label="Allineamento">
                  <select className="select" value={c.alignment} onChange={(e) => set({ alignment: e.target.value })}>
                    <option value="">—</option>
                    {ALIGNMENTS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
          <div className="row">
            <Field label="Armatura">
              <select className="select" value={c.armorId} onChange={(e) => set({ armorId: e.target.value })}>
                {ARMORS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.category !== 'none' ? ` (CA ${a.base}${a.maxDex === 0 ? '' : a.maxDex ? ' + DES max 2' : ' + DES'})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <label className="row" style={{ marginTop: 22 }}>
              <Switch on={c.shield} onChange={(shield) => set({ shield })} label="Scudo" /> Scudo (+2 CA)
            </label>
          </div>
          <Field label="Note, aspetto e storia">
            <textarea className="textarea" rows={6} value={c.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 5 && <Summary c={c} />}

      <div className="row between">
        <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Indietro
        </button>
        {step < STEPS.length - 1 && (
          <button className="btn" onClick={() => setStep(step + 1)}>
            Avanti
          </button>
        )}
      </div>
    </div>
  );
}

function AbilityStep({ c, set }: { c: C; set: (p: Partial<C>) => void }) {
  const bg = dnd5e.getBackground(c);
  const setMethod = (m: dnd5e.AbilityMethod) => {
    const base =
      m === 'pointbuy'
        ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
        : m === 'standard'
          ? { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
          : c.baseScores;
    set({ abilityMethod: m, baseScores: base });
  };
  const setScore = (a: Ability, v: number) => {
    if (c.abilityMethod === 'standard') {
      // swap with the ability that currently holds that value
      const other = ABILITIES.find((x) => x !== a && c.baseScores[x] === v);
      const next = { ...c.baseScores, [a]: v };
      if (other) next[other] = c.baseScores[a];
      set({ baseScores: next });
    } else set({ baseScores: { ...c.baseScores, [a]: v } });
  };
  const rollAll = () => {
    const r = () => {
      const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((x, y) => x - y);
      return d[1]! + d[2]! + d[3]!;
    };
    set({ abilityMethod: 'manual', baseScores: { str: r(), dex: r(), con: r(), int: r(), wis: r(), cha: r() } });
  };
  const spent = dnd5e.pointBuyCost(c.baseScores);
  const bonusMode = Object.values(c.backgroundBonus).includes(2) ? '2-1' : Object.keys(c.backgroundBonus).length ? '1-1-1' : null;

  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row between wrap">
        <Tabs
          value={c.abilityMethod}
          onChange={setMethod}
          options={[
            { id: 'standard', label: 'Serie standard' },
            { id: 'pointbuy', label: 'Acquisto a punti' },
            { id: 'manual', label: 'Tiro / manuale' },
          ]}
        />
        {c.abilityMethod === 'pointbuy' && (
          <span className={spent > POINT_BUY_BUDGET ? 'error-text' : 'muted'}>
            Punti: {spent}/{POINT_BUY_BUDGET}
          </span>
        )}
        {c.abilityMethod === 'manual' && (
          <button className="btn sm" onClick={rollAll}>
            Tira 4d6 (scarta il minore)
          </button>
        )}
      </div>
      <div className="abilities">
        {ABILITIES.map((a) => {
          const total = dnd5e.abilityScore(c, a);
          const bonus = c.backgroundBonus[a] ?? 0;
          return (
            <div className="ability" key={a}>
              <span className="label">{ABILITY_LABELS[a].short}</span>
              <span className="score">{total}</span>
              <span className="mod">{dnd5e.fmtMod(dnd5e.mod(total))}</span>
              {c.abilityMethod === 'standard' ? (
                <select className="select" value={c.baseScores[a]} onChange={(e) => setScore(a, Number(e.target.value))}>
                  {STANDARD_ARRAY.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type="number"
                  min={c.abilityMethod === 'pointbuy' ? 8 : 3}
                  max={c.abilityMethod === 'pointbuy' ? 15 : 18}
                  value={c.baseScores[a]}
                  onChange={(e) => setScore(a, Number(e.target.value))}
                />
              )}
              <span className="faint small">{bonus ? `base ${c.baseScores[a]} +${bonus}` : `base ${c.baseScores[a]}`}</span>
            </div>
          );
        })}
      </div>

      <div className="card col">
        <b>Aumenti del background{bg ? ` (${bg.name})` : ''}</b>
        {!bg || bg.abilities.length !== 3 ? (
          <p className="muted small">Scegli un background per distribuire +2/+1 oppure +1/+1/+1.</p>
        ) : (
          <>
            <div className="row">
              <Tabs
                value={bonusMode ?? '2-1'}
                onChange={(m) =>
                  set({ backgroundBonus: m === '1-1-1' ? Object.fromEntries(bg.abilities.map((a) => [a, 1])) : { [bg.abilities[0]!]: 2, [bg.abilities[1]!]: 1 } })
                }
                options={[
                  { id: '2-1', label: '+2 / +1' },
                  { id: '1-1-1', label: '+1 / +1 / +1' },
                ]}
              />
            </div>
            {bonusMode === '2-1' && (
              <div className="row wrap">
                {(['+2', '+1'] as const).map((label, idx) => {
                  const val = idx === 0 ? 2 : 1;
                  const current = (Object.entries(c.backgroundBonus).find(([, v]) => v === val)?.[0] ?? '') as Ability | '';
                  return (
                    <Field key={label} label={label}>
                      <select
                        className="select"
                        value={current}
                        onChange={(e) => {
                          const a = e.target.value as Ability;
                          const next: Partial<Record<Ability, number>> = {};
                          const otherVal = val === 2 ? 1 : 2;
                          const other = Object.entries(c.backgroundBonus).find(([, v]) => v === otherVal)?.[0] as Ability | undefined;
                          if (other && other !== a) next[other] = otherVal;
                          next[a] = val;
                          set({ backgroundBonus: next });
                        }}
                      >
                        {bg.abilities.map((a) => (
                          <option key={a} value={a}>
                            {ABILITY_LABELS[a].name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  );
                })}
              </div>
            )}
            {!bonusMode && <p className="muted small">Scegli come distribuire gli aumenti.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Summary({ c }: { c: C }) {
  const issues = dnd5e.validate(c);
  const lines = dnd5e.dnd5e2024.summary(c);
  const profs = [...dnd5e.skillProficiencies(c)].map((s: Skill) => SKILLS[s].name);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {issues.length > 0 ? (
        <div className="issues">
          {issues.map((i) => (
            <span key={i}>• {i}</span>
          ))}
        </div>
      ) : (
        <div className="badge live" style={{ width: 'fit-content' }}>
          <Check size={12} /> Personaggio pronto
        </div>
      )}
      <div className="stat-grid">
        {lines.map((l) => (
          <div className="stat" key={l.label}>
            <small>{l.label}</small>
            <b>{l.value}</b>
          </div>
        ))}
      </div>
      <p className="muted small">{dnd5e.abilityLine(c)}</p>
      <p className="muted small">Competenze: {profs.join(', ') || '—'}</p>
      {dnd5e.getSpecies(c) && <p className="muted small">Tratti: {dnd5e.getSpecies(c)!.traits.join(', ')}</p>}
    </div>
  );
}

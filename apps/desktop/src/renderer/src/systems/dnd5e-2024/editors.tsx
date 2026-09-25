import { dnd5e } from '@thevtt/systems';
import type { ChatCard } from '@thevtt/shared';
import { ImagePlus, MessageSquareShare, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Field, readImage, Section, Switch, Tabs } from '../../components/ui';

type C = dnd5e.Dnd5eCharacter;
type Ability = dnd5e.Ability;
type Skill = dnd5e.Skill;
export type Set = (patch: Partial<C>) => void;

const {
  ABILITIES,
  ABILITY_LABELS,
  SKILLS,
  SKILL_IDS,
  CLASSES,
  SPECIES,
  BACKGROUNDS,
  FEATS,
  ORIGIN_FEATS,
  WEAPONS,
  ARMORS,
  GEAR,
  PROPERTY_LABELS,
  MASTERIES,
  DAMAGE_TYPES,
  SCHOOLS,
  STANDARD_ARRAY,
  POINT_BUY_BUDGET,
  ALIGNMENTS,
  LANGUAGES,
  CUSTOM_BACKGROUND_ID,
} = dnd5e;

export const toggle = <T,>(list: T[], item: T, max: number): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : list.length < max ? [...list, item] : max === 1 ? [item] : list;

const ARMOR_LABEL: Record<string, string> = { light: 'leggere', medium: 'medie', heavy: 'pesanti', shield: 'scudi' };
const abilityList = (xs: Ability[]) => xs.map((a) => ABILITY_LABELS[a].short).join(', ');

export function Counter({ have, need }: { have: number; need: number }) {
  return (
    <span className={`badge ${have === need ? 'live' : ''}`}>
      {have}/{need}
    </span>
  );
}

function Traits({ items }: { items: { name: string; description: string; level?: number }[] }) {
  return (
    <>
      {items.map((t) => (
        <div className="trait" key={t.name + (t.level ?? '')}>
          <b>
            {t.name}
            {t.level && t.level > 1 ? ` (${t.level}°)` : ''}.
          </b>{' '}
          <span className="muted">{t.description}</span>
        </div>
      ))}
    </>
  );
}

// ---------- class ----------

export function ClassPicker({ c, set }: { c: C; set: Set }) {
  const cls = dnd5e.getClass(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {CLASSES.map((k) => (
          <button
            key={k.id}
            className={`option ${c.classId === k.id ? 'on' : ''}`}
            onClick={() =>
              c.classId !== k.id &&
              set({ classId: k.id, subclassId: null, classSkills: [], expertise: [], choices: {}, masteries: [], cantrips: [], spells: [], startingEquipment: { ...c.startingEquipment, classOption: null } })
            }
          >
            <b>{k.name}</b>
            <small>{k.description}</small>
            <span className="faint">
              d{k.hitDie} · {abilityList(k.primary)}
              {k.spellcasting ? ' · incantatore' : ''}
            </span>
          </button>
        ))}
      </div>
      {cls && (
        <div className="detail">
          <b>{cls.name}</b>
          <div className="trait">
            <b>Dado vita.</b> <span className="muted">d{cls.hitDie}</span> · <b>Tiri salvezza.</b> <span className="muted">{abilityList(cls.saves)}</span>
          </div>
          <div className="trait">
            <b>Armature.</b> <span className="muted">{cls.armor.length ? cls.armor.map((a) => ARMOR_LABEL[a]).join(', ') : 'nessuna'}</span> · <b>Armi.</b>{' '}
            <span className="muted">
              semplici
              {cls.martial === true ? ' e da guerra' : cls.martial === 'finesseOrLight' ? ', da guerra accurate o leggere' : cls.martial === 'light' ? ', da guerra leggere' : ''}
            </span>
            {cls.tools && (
              <>
                {' '}
                · <b>Strumenti.</b> <span className="muted">{cls.tools}</span>
              </>
            )}
          </div>
          {cls.spellcasting && (
            <div className="trait">
              <b>Incantesimi.</b>{' '}
              <span className="muted">
                {ABILITY_LABELS[cls.spellcasting.ability].name},{' '}
                {cls.spellcasting.type === 'full' ? 'incantatore completo' : cls.spellcasting.type === 'half' ? 'mezzo incantatore' : 'magia del patto'}
              </span>
            </div>
          )}
          <Traits items={cls.features.filter((f) => f.level <= 3)} />
        </div>
      )}
    </div>
  );
}

// ---------- species ----------

export function SpeciesPicker({ c, set }: { c: C; set: Set }) {
  const sp = dnd5e.getSpecies(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {SPECIES.map((s) => (
          <button
            key={s.id}
            className={`option ${c.speciesId === s.id ? 'on' : ''}`}
            onClick={() => c.speciesId !== s.id && set({ speciesId: s.id, size: s.sizes[0]!, speciesSkills: [], speciesChoices: {}, originFeat: null })}
          >
            <b>{s.name}</b>
            <small>{s.description}</small>
            <span className="faint">
              {dnd5e.fmtMeters(s.speed)}
              {s.darkvision ? ` · scurovisione ${dnd5e.fmtMeters(s.darkvision)}` : ''}
            </span>
          </button>
        ))}
      </div>
      {sp && (
        <div className="detail">
          <b>{sp.name}</b>
          <Traits items={sp.traits} />
          {sp.sizes.length > 1 && (
            <div className="row">
              <span className="small muted">Taglia</span>
              <Tabs value={c.size} onChange={(size) => set({ size })} options={sp.sizes.map((s) => ({ id: s, label: s === 'small' ? 'Piccola' : 'Media' }))} />
            </div>
          )}
          {sp.choice && (
            <div className="col" style={{ marginTop: 6 }}>
              <span className="small muted">{sp.choice.label}</span>
              <div className="option-grid">
                {sp.choice.options.map((o) => (
                  <button
                    key={o.id}
                    className={`option ${c.speciesChoices[sp.choice!.key] === o.id ? 'on' : ''}`}
                    onClick={() => set({ speciesChoices: { ...c.speciesChoices, [sp.choice!.key]: o.id } })}
                  >
                    <b>{o.name}</b>
                    <small>{o.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- background ----------

export function BackgroundPicker({ c, set }: { c: C; set: Set }) {
  const bg = dnd5e.getBackground(c);
  const feat = bg?.feat ? dnd5e.featById(bg.feat) : undefined;
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="option-grid">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            className={`option ${c.backgroundId === b.id ? 'on' : ''}`}
            onClick={() => c.backgroundId !== b.id && set({ backgroundId: b.id, backgroundBonus: {}, startingEquipment: { ...c.startingEquipment, backgroundOption: null } })}
          >
            <b>{b.name}</b>
            <small>{b.description}</small>
            <span className="faint">
              {abilityList(b.abilities)} · {b.skills.map((s) => SKILLS[s].name).join(', ')}
            </span>
          </button>
        ))}
        <button className={`option ${c.backgroundId === CUSTOM_BACKGROUND_ID ? 'on' : ''}`} onClick={() => set({ backgroundId: CUSTOM_BACKGROUND_ID, backgroundBonus: {} })}>
          <b>Personalizzato</b>
          <small>Costruisci il background insieme al master.</small>
          <span className="faint">3 caratteristiche · 2 abilità · 1 talento</span>
        </button>
      </div>
      {bg && c.backgroundId !== CUSTOM_BACKGROUND_ID && (
        <div className="detail">
          <b>{bg.name}</b>
          <div className="trait">
            <b>Caratteristiche.</b> <span className="muted">{abilityList(bg.abilities)}</span>
          </div>
          <div className="trait">
            <b>Abilità.</b> <span className="muted">{bg.skills.map((s) => SKILLS[s].name).join(', ')}</span> · <b>Strumenti.</b> <span className="muted">{bg.tool}</span>
          </div>
          {feat && (
            <div className="trait">
              <b>Talento: {feat.name}.</b> <span className="muted">{feat.description}</span>
            </div>
          )}
        </div>
      )}
      {c.backgroundId === CUSTOM_BACKGROUND_ID && (
        <div className="detail">
          <span className="small muted">Caratteristiche (3)</span>
          <div className="row wrap">
            {ABILITIES.map((a) => (
              <button
                key={a}
                className={`chip sm ${c.customBackground.abilities.includes(a) ? 'on' : ''}`}
                onClick={() => set({ customBackground: { ...c.customBackground, abilities: toggle(c.customBackground.abilities, a, 3) }, backgroundBonus: {} })}
              >
                {ABILITY_LABELS[a].name}
              </button>
            ))}
          </div>
          <span className="small muted">Abilità (2)</span>
          <div className="row wrap">
            {SKILL_IDS.map((s) => (
              <button key={s} className={`chip sm ${c.customBackground.skills.includes(s) ? 'on' : ''}`} onClick={() => set({ customBackground: { ...c.customBackground, skills: toggle(c.customBackground.skills, s, 2) } })}>
                {SKILLS[s].name}
              </button>
            ))}
          </div>
          <span className="small muted">Talento di origine</span>
          <div className="row wrap">
            {ORIGIN_FEATS.map((f) => (
              <button key={f.id} className={`chip sm ${c.choices.customBackgroundFeat?.[0] === f.id ? 'on' : ''}`} title={f.description} onClick={() => set({ choices: { ...c.choices, customBackgroundFeat: [f.id] } })}>
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- abilities ----------

export function AbilitiesEditor({ c, set }: { c: C; set: Set }) {
  const bg = dnd5e.getBackground(c);
  const setMethod = (m: dnd5e.AbilityMethod) => {
    const base =
      m === 'pointbuy' ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } : m === 'standard' ? { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } : c.baseScores;
    set({ abilityMethod: m, baseScores: base });
  };
  const setScore = (a: Ability, v: number) => {
    if (c.abilityMethod === 'standard') {
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
  const suggested = dnd5e.getClass(c)?.primary ?? [];

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
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
            {spent}/{POINT_BUY_BUDGET} punti
          </span>
        )}
        {c.abilityMethod === 'manual' && (
          <button className="btn sm" onClick={rollAll}>
            Tira 4d6 e scarta il più basso
          </button>
        )}
      </div>
      <div className="abilities">
        {ABILITIES.map((a) => {
          const total = dnd5e.abilityScore(c, a);
          const bonus = (c.backgroundBonus[a] ?? 0) + c.advancements.filter((x) => x.level <= c.level).reduce((n, x) => n + (x.asi[a] ?? 0), 0);
          return (
            <div className="ability" key={a} style={suggested.includes(a) ? { borderColor: 'var(--border-strong)' } : undefined}>
              <span className="label">
                {ABILITY_LABELS[a].short}
                {suggested.includes(a) ? ' ★' : ''}
              </span>
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
              <span className="faint tiny">{bonus ? `base ${c.baseScores[a]} +${bonus}` : `base ${c.baseScores[a]}`}</span>
            </div>
          );
        })}
      </div>
      {suggested.length > 0 && <p className="faint small">★ caratteristiche principali della classe.</p>}

      <Section title={`Aumenti del background${bg ? ` · ${bg.name}` : ''}`}>
        {!bg || bg.abilities.length !== 3 ? (
          <p className="muted small">Scegli un background per distribuire +2/+1 oppure +1/+1/+1.</p>
        ) : (
          <div className="row wrap" style={{ gap: 'var(--s3)' }}>
            <Tabs
              value={bonusMode ?? ''}
              onChange={(m) => set({ backgroundBonus: m === '1-1-1' ? Object.fromEntries(bg.abilities.map((a) => [a, 1])) : { [bg.abilities[0]!]: 2, [bg.abilities[1]!]: 1 } })}
              options={[
                { id: '2-1', label: '+2 / +1' },
                { id: '1-1-1', label: '+1 / +1 / +1' },
              ]}
            />
            {bonusMode === '2-1' &&
              ([2, 1] as const).map((val) => {
                const current = (Object.entries(c.backgroundBonus).find(([, v]) => v === val)?.[0] ?? '') as Ability | '';
                return (
                  <label key={val} className="row small">
                    +{val}
                    <select
                      className="select"
                      style={{ width: 150 }}
                      value={current}
                      onChange={(e) => {
                        const a = e.target.value as Ability;
                        const otherVal = val === 2 ? 1 : 2;
                        const other = Object.entries(c.backgroundBonus).find(([, v]) => v === otherVal)?.[0] as Ability | undefined;
                        const next: Partial<Record<Ability, number>> = {};
                        if (other && other !== a) next[other] = otherVal;
                        else if (other === a) next[bg.abilities.find((x) => x !== a)!] = otherVal;
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
                  </label>
                );
              })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- skills, expertise, languages ----------

export function SkillsEditor({ c, set }: { c: C; set: Set }) {
  const cls = dnd5e.getClass(c);
  const sp = dnd5e.getSpecies(c);
  const bg = dnd5e.getBackground(c);
  const profs = dnd5e.skillProficiencies(c);
  const expertiseMax = dnd5e.expertiseCount(c);
  const expertiseFrom = cls?.expertise?.find((e) => e.from)?.from;
  const [lang, setLang] = useState('');

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      {!cls ? (
        <p className="muted">Scegli prima una classe.</p>
      ) : (
        <Section title={<span className="row">Abilità di classe <Counter have={c.classSkills.length} need={cls.skillChoices} /></span>}>
          <div className="row wrap">
            {(cls.skillList ?? SKILL_IDS).map((s) => {
              const fromBg = bg?.skills.includes(s);
              return (
                <button
                  key={s}
                  disabled={fromBg}
                  title={fromBg ? 'Già data dal background' : undefined}
                  className={`chip sm ${c.classSkills.includes(s) || fromBg ? 'on' : ''}`}
                  onClick={() => set({ classSkills: toggle(c.classSkills, s, cls.skillChoices), expertise: c.expertise.filter((x) => x !== s || c.classSkills.includes(s) === false) })}
                >
                  {SKILLS[s].name} <span className="faint">{ABILITY_LABELS[SKILLS[s].ability].short}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}
      {sp?.skillChoice && (
        <Section title={<span className="row">Abilità della specie <Counter have={c.speciesSkills.length} need={sp.skillChoice.count} /></span>}>
          <div className="row wrap">
            {(sp.skillChoice.from ?? SKILL_IDS).map((s) => {
              const taken = bg?.skills.includes(s) || c.classSkills.includes(s);
              return (
                <button key={s} disabled={taken} className={`chip sm ${c.speciesSkills.includes(s) || taken ? 'on' : ''}`} onClick={() => set({ speciesSkills: toggle(c.speciesSkills, s, sp.skillChoice!.count) })}>
                  {SKILLS[s].name}
                </button>
              );
            })}
          </div>
        </Section>
      )}
      {expertiseMax > 0 && (
        <Section title={<span className="row">Maestria (competenza raddoppiata) <Counter have={c.expertise.length} need={expertiseMax} /></span>}>
          <div className="row wrap">
            {[...profs]
              .filter((s) => !expertiseFrom || expertiseFrom.includes(s))
              .map((s) => (
                <button key={s} className={`chip sm ${c.expertise.includes(s) ? 'on' : ''}`} onClick={() => set({ expertise: toggle(c.expertise, s, expertiseMax) })}>
                  {SKILLS[s].name}
                </button>
              ))}
          </div>
        </Section>
      )}
      <Section title="Altre competenze nelle abilità" action={<span className="faint small">da talenti (Abile), sottoclassi o dal master</span>}>
        <div className="row wrap">
          {SKILL_IDS.filter((s) => !profs.has(s) || c.extraSkills.includes(s)).map((s) => (
            <button key={s} className={`chip sm ${c.extraSkills.includes(s) ? 'on' : ''}`} onClick={() => set({ extraSkills: toggle(c.extraSkills, s, 18) })}>
              {SKILLS[s].name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Lingue" action={<span className="faint small">Comune + due a scelta</span>}>
        <div className="row wrap">
          {c.languages.map((l) => (
            <button key={l} className="chip sm on" onClick={() => set({ languages: c.languages.filter((x) => x !== l) })} title="Rimuovi">
              {l} ×
            </button>
          ))}
          <select className="select" style={{ width: 200 }} value={lang} onChange={(e) => { if (e.target.value) set({ languages: [...c.languages, e.target.value] }); setLang(''); }}>
            <option value="">Aggiungi lingua…</option>
            {[...LANGUAGES.standard, ...LANGUAGES.rare].filter((l) => !c.languages.includes(l)).map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </Section>
    </div>
  );
}

// ---------- level, subclass, ASI/feats, class choices, masteries ----------

export function ProgressionEditor({ c, set, allowLevel }: { c: C; set: Set; allowLevel?: boolean }) {
  const cls = dnd5e.getClass(c);
  const sp = dnd5e.getSpecies(c);
  if (!cls) return <p className="muted">Scegli prima una classe.</p>;
  const choices = dnd5e.classChoices(c);
  const masteryMax = dnd5e.masteryCount(c);
  const masteryWeapons = WEAPONS.filter((w) => dnd5e.weaponProficient(c, w) && (cls.id !== 'barbarian' || w.kind === 'melee'));

  const setAdvancement = (level: number, patch: Partial<dnd5e.Advancement>) => {
    const others = c.advancements.filter((a) => a.level !== level);
    const current = c.advancements.find((a) => a.level === level) ?? { level, feat: '', asi: {} };
    set({ advancements: [...others, { ...current, ...patch }].sort((a, b) => a.level - b.level) });
  };

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      {allowLevel && (
        <Section title="Livello">
          <div className="row">
            <input className="input" style={{ width: 80 }} type="number" min={1} max={20} value={c.level} onChange={(e) => set({ level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
            <span className="muted small">Per i livelli oltre il primo i punti ferita usano il valore medio; puoi cambiarlo salendo di livello dalla scheda.</span>
          </div>
        </Section>
      )}

      {c.level >= cls.subclassLevel && (
        <Section title={cls.subclassLabel}>
          <div className="option-grid">
            {cls.subclasses.map((s) => (
              <button key={s.id} className={`option ${c.subclassId === s.id ? 'on' : ''}`} onClick={() => set({ subclassId: s.id })}>
                <b>{s.name}</b>
                <small>{s.description}</small>
                <span className="faint">{s.features.map((f) => f.name).join(' · ')}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {choices.map((ch) => {
        const max = dnd5e.choiceCount(c, ch);
        const have = c.choices[ch.key] ?? [];
        return (
          <Section key={ch.key} title={<span className="row">{ch.label} <Counter have={have.length} need={max} /></span>}>
            <div className="option-grid">
              {ch.options
                .filter((o) => !o.level || o.level <= c.level)
                .map((o) => (
                  <button key={o.id} className={`option ${have.includes(o.id) ? 'on' : ''}`} onClick={() => set({ choices: { ...c.choices, [ch.key]: toggle(have, o.id, max) } })}>
                    <b>{o.name}</b>
                    <small>{o.description}</small>
                  </button>
                ))}
            </div>
          </Section>
        );
      })}

      {sp?.originFeat && (
        <Section title="Talento di origine (Versatile)">
          <div className="option-grid">
            {ORIGIN_FEATS.map((f) => (
              <button key={f.id} className={`option ${c.originFeat === f.id ? 'on' : ''}`} onClick={() => set({ originFeat: f.id })}>
                <b>{f.name}</b>
                <small>{f.description}</small>
              </button>
            ))}
          </div>
        </Section>
      )}

      {dnd5e.asiLevels(c).map((lvl) => {
        const adv = c.advancements.find((a) => a.level === lvl) ?? { level: lvl, feat: '', asi: {} };
        const feats = FEATS.filter((f) => (f.category === 'general' && (f.level ?? 4) <= lvl) || (f.category === 'epicBoon' && lvl >= 19) || f.category === 'origin');
        const feat = dnd5e.featById(adv.feat);
        const asiTotal = Object.values(adv.asi).reduce((a, b) => a + (b ?? 0), 0);
        const asiAllowed = adv.feat === 'abilityScoreImprovement' ? 2 : feat?.abilityIncrease ? 1 : 0;
        return (
          <Section key={lvl} title={`${lvl}° livello · aumento o talento`}>
            <select className="select" style={{ maxWidth: 360 }} value={adv.feat} onChange={(e) => setAdvancement(lvl, { feat: e.target.value, asi: {} })}>
              <option value="">Scegli…</option>
              {feats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {feat && <p className="muted small">{feat.description}</p>}
            {asiAllowed > 0 && (
              <div className="row wrap">
                {(feat?.abilityIncrease ?? ABILITIES).map((a) => {
                  const v = adv.asi[a] ?? 0;
                  return (
                    <div key={a} className="row small" style={{ gap: 4 }}>
                      <span className="muted">{ABILITY_LABELS[a].short}</span>
                      <button className="btn sm icon" disabled={v === 0} onClick={() => setAdvancement(lvl, { asi: { ...adv.asi, [a]: v - 1 } })}>
                        −
                      </button>
                      <b className="num">+{v}</b>
                      <button className="btn sm icon" disabled={asiTotal >= asiAllowed} onClick={() => setAdvancement(lvl, { asi: { ...adv.asi, [a]: v + 1 } })}>
                        +
                      </button>
                    </div>
                  );
                })}
                <span className="faint small">
                  {asiTotal}/{asiAllowed}
                </span>
              </div>
            )}
          </Section>
        );
      })}

      {masteryMax > 0 && (
        <Section title={<span className="row">Maestria nelle armi <Counter have={c.masteries.length} need={masteryMax} /></span>}>
          <div className="row wrap">
            {masteryWeapons.map((w) => (
              <button
                key={w.id}
                className={`chip sm ${c.masteries.includes(w.id) ? 'on' : ''}`}
                title={`${MASTERIES[w.mastery].name}: ${MASTERIES[w.mastery].description}`}
                onClick={() => set({ masteries: toggle(c.masteries, w.id, masteryMax) })}
              >
                {w.name} <span className="faint">{MASTERIES[w.mastery].name}</span>
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------- spells ----------

export function SpellsEditor({ c, set }: { c: C; set: Set }) {
  const sc = dnd5e.spellcasting(c);
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const always = new Set(dnd5e.alwaysPrepared(c));
  const available = useMemo(() => dnd5e.availableSpells(c), [c.classId, c.level]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sc) return <p className="muted">Questa classe non lancia incantesimi.</p>;
  const cantrips = available.filter((s) => s.level === 0);
  const leveled = available.filter((s) => s.level > 0 && !always.has(s.id));
  const q = query.trim().toLowerCase();
  const visible = (list: dnd5e.SpellDef[]) => list.filter((s) => (filter === 'all' || s.level === filter) && (!q || s.name.toLowerCase().includes(q)));

  const SpellChip = ({ s, on, onClick, disabled }: { s: dnd5e.SpellDef; on: boolean; onClick?: () => void; disabled?: boolean }) => (
    <button className={`option ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} style={{ gap: 2 }}>
      <span className="row between">
        <b>{s.name}</b>
        <span className="faint tiny">
          {s.level ? `${s.level}°` : 'trucchetto'} · {SCHOOLS[s.school]}
        </span>
      </span>
      <small>{s.description}</small>
      <span className="faint">
        {s.time} · {s.range}
        {s.concentration ? ' · concentrazione' : ''}
        {s.ritual ? ' · rituale' : ''}
      </span>
    </button>
  );

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      <div className="stat-row">
        <div className="stat">
          <small>Caratteristica</small>
          <b>{ABILITY_LABELS[sc.ability].short}</b>
        </div>
        <div className="stat">
          <small>CD</small>
          <b>{sc.saveDc}</b>
        </div>
        <div className="stat">
          <small>Attacco</small>
          <b>{dnd5e.fmtMod(sc.attack)}</b>
        </div>
        <div className="stat">
          <small>{sc.pact ? 'Slot del patto' : 'Slot'}</small>
          <b className="small">{sc.pact ? `${sc.pact.count} × ${sc.pact.level}°` : sc.slots.map((n, i) => `${n}×${i + 1}°`).join(' ')}</b>
        </div>
      </div>

      {always.size > 0 && (
        <Section title="Sempre preparati">
          <div className="row wrap">
            {[...always].map((id) => {
              const s = dnd5e.spellById(id);
              return s ? (
                <span key={id} className="chip sm on" title={s.description}>
                  {s.name}
                </span>
              ) : null;
            })}
          </div>
        </Section>
      )}

      <div className="row wrap">
        <div className="row grow" style={{ position: 'relative', minWidth: 200 }}>
          <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Cerca incantesimo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" style={{ width: 160 }} value={String(filter)} onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Tutti i livelli</option>
          {sc.cantripsKnown > 0 && <option value="0">Trucchetti</option>}
          {Array.from({ length: sc.maxSpellLevel }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}° livello
            </option>
          ))}
        </select>
      </div>

      {sc.cantripsKnown > 0 && (filter === 'all' || filter === 0) && (
        <Section title={<span className="row">Trucchetti <Counter have={c.cantrips.length} need={sc.cantripsKnown} /></span>}>
          <div className="option-grid">
            {visible(cantrips).map((s) => (
              <SpellChip key={s.id} s={s} on={c.cantrips.includes(s.id)} onClick={() => set({ cantrips: toggle(c.cantrips, s.id, sc.cantripsKnown) })} />
            ))}
          </div>
        </Section>
      )}
      {filter !== 0 && (
        <Section title={<span className="row">Incantesimi preparati <Counter have={c.spells.length} need={sc.prepared} /></span>}>
          <div className="option-grid">
            {visible(leveled).map((s) => (
              <SpellChip key={s.id} s={s} on={c.spells.includes(s.id)} onClick={() => set({ spells: toggle(c.spells, s.id, sc.prepared) })} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------- equipment & inventory ----------

export function StartingEquipment({ c, onChange }: { c: C; onChange: (next: C) => void }) {
  const cls = dnd5e.getClass(c);
  const bg = dnd5e.getBackground(c);
  const pick = (classOption: number | null, backgroundOption: 'a' | 'b' | null) => onChange(dnd5e.applyStartingEquipment(c, classOption, backgroundOption));
  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      {cls && (
        <Section title={`Dalla classe · ${cls.name}`}>
          <div className="option-grid">
            {cls.equipment.map((o, i) => (
              <button key={i} className={`option ${c.startingEquipment.classOption === i ? 'on' : ''}`} onClick={() => pick(i, c.startingEquipment.backgroundOption)}>
                <b>Opzione {String.fromCharCode(65 + i)}</b>
                <small>{o.label}</small>
              </button>
            ))}
          </div>
        </Section>
      )}
      {bg && bg.id !== CUSTOM_BACKGROUND_ID && (
        <Section title={`Dal background · ${bg.name}`}>
          <div className="option-grid">
            <button className={`option ${c.startingEquipment.backgroundOption === 'a' ? 'on' : ''}`} onClick={() => pick(c.startingEquipment.classOption, 'a')}>
              <b>Opzione A</b>
              <small>
                {bg.equipment.a.map((k) => `${k.qty && k.qty > 1 ? `${k.qty} × ` : ''}${dnd5e.itemName(k.item)}`).join(', ')} e {bg.equipment.aGold} mo
              </small>
            </button>
            <button className={`option ${c.startingEquipment.backgroundOption === 'b' ? 'on' : ''}`} onClick={() => pick(c.startingEquipment.classOption, 'b')}>
              <b>Opzione B</b>
              <small>{bg.equipment.bGold} mo</small>
            </button>
          </div>
        </Section>
      )}
      <InventoryEditor c={c} set={(patch) => onChange({ ...c, ...patch })} />
    </div>
  );
}

export function InventoryEditor({ c, set, readOnly, onShare }: { c: C; set: Set; readOnly?: boolean; onShare?: (card: ChatCard) => void }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const weight = dnd5e.carriedWeight(c);
  const capacity = dnd5e.carryingCapacity(c);
  const q = query.trim().toLowerCase();
  const catalog = useMemo(
    () => [
      ...WEAPONS.map((w) => ({ id: w.id, name: w.name, kind: `${w.category === 'simple' ? 'Arma semplice' : 'Arma da guerra'} · ${w.damage} ${DAMAGE_TYPES[w.damageType]}` })),
      ...ARMORS.map((a) => ({ id: a.id, name: a.name, kind: a.category === 'shield' ? 'Scudo · +2 CA' : `Armatura ${ARMOR_LABEL[a.category] ?? ''} · CA ${a.base}` })),
      ...GEAR.map((g) => ({ id: g.id, name: g.name, kind: 'Equipaggiamento' })),
    ],
    [],
  );
  const results = q ? catalog.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 30) : catalog.slice(0, 30);
  const update = (uid: string, patch: Partial<dnd5e.InventoryItem>) => {
    let items = c.inventory.map((i) => (i.uid === uid ? { ...i, ...patch } : i));
    // one body armour at a time
    const changed = items.find((i) => i.uid === uid);
    const arm = changed?.ref ? dnd5e.armorById(changed.ref) : undefined;
    if (patch.equipped && arm && arm.category !== 'shield') {
      items = items.map((i) => {
        const a = i.ref ? dnd5e.armorById(i.ref) : undefined;
        return i.uid !== uid && a && a.category !== 'shield' ? { ...i, equipped: false } : i;
      });
    }
    set({ inventory: items });
  };
  const describe = (i: dnd5e.InventoryItem): ReactNode => {
    const w = i.ref ? dnd5e.weaponById(i.ref) : undefined;
    const a = i.ref ? dnd5e.armorById(i.ref) : undefined;
    if (w) return `${w.damage}${w.versatile ? ` (${w.versatile})` : ''} ${DAMAGE_TYPES[w.damageType]} · ${w.properties.map((p) => PROPERTY_LABELS[p]).join(', ') || '—'} · ${MASTERIES[w.mastery].name}`;
    if (a) return a.category === 'shield' ? '+2 CA' : `CA ${a.base}${a.maxDex === null ? ' + Des' : a.maxDex ? ' + Des (max 2)' : ''}${a.strength ? ` · For ${a.strength}` : ''}${a.stealthDisadvantage ? ' · Svantaggio Furtività' : ''}`;
    return i.notes && !i.notes.startsWith('Equipaggiamento iniziale') ? i.notes : null;
  };

  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section
        title={`Inventario · ${weight} / ${capacity} lb`}
        action={
          !readOnly && (
            <button className="btn sm" onClick={() => setAdding(!adding)}>
              <Plus size={14} /> Aggiungi
            </button>
          )
        }
      >
        {adding && (
          <div className="col">
            <input className="input" autoFocus placeholder="Cerca armi, armature, oggetti…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="search-results">
              {results.map((r) => (
                <button key={r.id} onClick={() => set({ inventory: [...c.inventory, dnd5e.makeItem(r.id)] })}>
                  <span className="grow">{r.name}</span>
                  <span className="faint small">{r.kind}</span>
                </button>
              ))}
              {query.trim() && (
                <button onClick={() => set({ inventory: [...c.inventory, { uid: dnd5e.newUid(), ref: null, name: query.trim(), qty: 1, weight: 0, equipped: false }] })}>
                  <Plus size={13} /> Oggetto personalizzato «{query.trim()}»
                </button>
              )}
            </div>
          </div>
        )}
        {c.inventory.length === 0 ? (
          <div className="empty">Inventario vuoto.</div>
        ) : (
          <div>
            {c.inventory.map((i) => {
              const equippable = !!(i.ref && (dnd5e.weaponById(i.ref) || dnd5e.armorById(i.ref)));
              return (
                <div key={i.uid} className="inv-row">
                  {equippable ? <Switch on={i.equipped} onChange={(equipped) => !readOnly && update(i.uid, { equipped })} label="Equipaggiato" /> : <span style={{ width: 32 }} />}
                  <div className="col" style={{ gap: 0, minWidth: 0 }}>
                    {readOnly ? (
                      <span className="ellipsis">{i.name}</span>
                    ) : (
                      <input className="input bare" value={i.name} onChange={(e) => update(i.uid, { name: e.target.value })} />
                    )}
                    {describe(i) && <span className="faint tiny ellipsis">{describe(i)}</span>}
                  </div>
                  <input className="input num" type="number" min={0} value={i.qty} disabled={readOnly} onChange={(e) => update(i.uid, { qty: Math.max(0, Number(e.target.value) || 0) })} title="Quantità" />
                  <span className="faint tiny num">{Math.round(i.weight * i.qty * 10) / 10} lb</span>
                  <span className="row" style={{ gap: 0 }}>
                    {onShare && (
                      <button
                        className="btn ghost sm icon"
                        title="Mostra in chat"
                        aria-label="Mostra in chat"
                        onClick={() => {
                          const d = describe(i);
                          onShare({ title: i.name, subtitle: i.qty > 1 ? `× ${i.qty}` : undefined, body: typeof d === 'string' ? d : undefined });
                        }}
                      >
                        <MessageSquareShare size={13} />
                      </button>
                    )}
                    {!readOnly && (
                      <button className="btn ghost sm icon" aria-label="Rimuovi" onClick={() => set({ inventory: c.inventory.filter((x) => x.uid !== i.uid) })}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Monete">
        <div className="coins">
          {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map((k) => (
            <label key={k}>
              {{ pp: 'Platino', gp: 'Oro', ep: 'Electrum', sp: 'Argento', cp: 'Rame' }[k]}
              <input className="input num" type="number" min={0} value={c.currency[k]} disabled={readOnly} onChange={(e) => set({ currency: { ...c.currency, [k]: Math.max(0, Number(e.target.value) || 0) } })} />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------- details ----------

export function DetailsEditor({ c, set }: { c: C; set: Set }) {
  const d = c.details;
  const setD = (patch: Partial<C['details']>) => set({ details: { ...d, ...patch } });
  const text = (key: keyof C['details'], label: string, rows = 3, placeholder?: string) => (
    <Field label={label}>
      <textarea className="textarea" rows={rows} value={d[key]} placeholder={placeholder} onChange={(e) => setD({ [key]: e.target.value })} />
    </Field>
  );
  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--s4)' }}>
        <label
          className="portrait"
          style={{ width: 104, height: 104, backgroundImage: c.portrait ? `url(${c.portrait})` : undefined, cursor: 'pointer', border: c.portrait ? undefined : '1px dashed var(--border-strong)' }}
          title="Ritratto"
        >
          {!c.portrait && <ImagePlus size={22} />}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) set({ portrait: await readImage(f, 320) });
            }}
          />
        </label>
        <div className="col grow">
          <Field label="Nome">
            <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Come ti chiamano?" />
          </Field>
          <div className="fields">
            <Field label="Allineamento">
              <select className="select" value={c.alignment} onChange={(e) => set({ alignment: e.target.value })}>
                <option value="">—</option>
                {ALIGNMENTS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Fede">
              <input className="input" value={d.faith} onChange={(e) => setD({ faith: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>
      <Section title="Aspetto">
        <div className="fields">
          {(
            [
              ['gender', 'Genere'],
              ['age', 'Età'],
              ['height', 'Altezza'],
              ['weight', 'Peso'],
              ['eyes', 'Occhi'],
              ['hair', 'Capelli'],
              ['skin', 'Carnagione'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <input className="input" value={d[k]} onChange={(e) => setD({ [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        {text('appearance', 'Descrizione', 3, 'Come appare a chi lo incontra per la prima volta?')}
      </Section>
      <Section title="Personalità">
        <div className="fields">
          {text('traits', 'Tratti', 2)}
          {text('ideals', 'Ideali', 2)}
          {text('bonds', 'Legami', 2)}
          {text('flaws', 'Difetti', 2)}
        </div>
      </Section>
      <Section title="Storia">
        {text('backstory', 'Background', 6, 'Da dove viene, cosa cerca, cosa teme…')}
        {text('allies', 'Alleati e organizzazioni', 3)}
        {text('notes', 'Note', 3)}
      </Section>
    </div>
  );
}

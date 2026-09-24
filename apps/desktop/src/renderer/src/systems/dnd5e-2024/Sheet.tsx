import { dnd5e } from '@thevtt/systems';
import { Heart, Minus, Plus, Shield, Skull } from 'lucide-react';
import { useState } from 'react';
import type { SheetProps } from '..';

type C = dnd5e.Dnd5eCharacter;
const { ABILITIES, ABILITY_LABELS, SKILLS, SKILL_IDS } = dnd5e;
const d20 = (b: number) => `1d20${b >= 0 ? '+' : ''}${b}`;

/** Compact, click-to-roll character sheet used at the table. */
export function Dnd5eSheet({ data: c, editable, onChange, onRoll }: SheetProps<C>) {
  const [delta, setDelta] = useState(1);
  const max = dnd5e.maxHp(c);
  const current = dnd5e.currentHp(c);
  const setHp = (hp: Partial<C['hp']>) => onChange({ ...c, hp: { ...c.hp, ...hp } });
  const profs = dnd5e.skillProficiencies(c);
  const cls = dnd5e.getClass(c);
  const sc = dnd5e.spellcasting(c);

  const damage = (n: number) => {
    const fromTemp = Math.min(c.hp.temp, n);
    setHp({ temp: c.hp.temp - fromTemp, current: Math.max(0, current - (n - fromTemp)) });
  };

  return (
    <div className="sheet">
      <div className="row">
        {c.portrait && <div className="avatar" style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: `center/cover url(${c.portrait})` }} />}
        <div className="grow">
          <b>{c.name}</b>
          <div className="muted small">
            {dnd5e.getSpecies(c)?.name} · {cls?.name} {c.level}
          </div>
        </div>
      </div>

      <div className="sheet-vitals">
        <div className="stat">
          <small>
            <Heart size={11} /> PF
          </small>
          <b>
            {current}
            <span className="faint">/{max}</span>
            {c.hp.temp > 0 && <span style={{ color: 'var(--accent)' }}> +{c.hp.temp}</span>}
          </b>
        </div>
        <div className="stat">
          <small>
            <Shield size={11} /> CA
          </small>
          <b>{dnd5e.armorClass(c)}</b>
        </div>
        <button className="stat clickable-stat" onClick={() => onRoll(d20(dnd5e.initiativeBonus(c)), 'Iniziativa')}>
          <small>Iniziativa</small>
          <b>{dnd5e.fmtMod(dnd5e.initiativeBonus(c))}</b>
        </button>
        <div className="stat">
          <small>Velocità</small>
          <b>{dnd5e.getSpecies(c)?.speed ?? 30}</b>
        </div>
      </div>

      {editable && (
        <div className="row">
          <input className="input" type="number" min={1} value={delta} onChange={(e) => setDelta(Math.max(1, Number(e.target.value) || 1))} style={{ width: 70 }} />
          <button className="btn sm grow" onClick={() => damage(delta)}>
            <Minus size={13} /> Danno
          </button>
          <button className="btn sm grow" onClick={() => setHp({ current: Math.min(max, current + delta) })}>
            <Plus size={13} /> Cura
          </button>
          <button className="btn sm" onClick={() => setHp({ temp: delta })} title="Punti ferita temporanei">
            Temp
          </button>
        </div>
      )}

      {current === 0 && (
        <div className="card col" style={{ padding: 'var(--s3)' }}>
          <div className="row between">
            <span className="row small">
              <Skull size={14} /> Tiri salvezza contro morte
            </span>
            <button className="btn sm" onClick={() => onRoll('1d20', 'Tiro salvezza contro morte')}>
              Tira
            </button>
          </div>
          {(['successes', 'failures'] as const).map((k) => (
            <div className="row small" key={k}>
              <span className="grow muted">{k === 'successes' ? 'Successi' : 'Fallimenti'}</span>
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  disabled={!editable}
                  className={`pip ${c.deathSaves[k] > i ? (k === 'successes' ? 'ok' : 'ko') : ''}`}
                  onClick={() => onChange({ ...c, deathSaves: { ...c.deathSaves, [k]: c.deathSaves[k] > i ? i : i + 1 } })}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="sheet-abilities">
        {ABILITIES.map((a) => {
          const m = dnd5e.abilityMod(c, a);
          const save = dnd5e.saveBonus(c, a);
          const prof = cls?.saves.includes(a);
          return (
            <div key={a} className="sheet-ability">
              <button onClick={() => onRoll(d20(m), `Prova di ${ABILITY_LABELS[a].name}`)} title="Prova di caratteristica">
                <small>{ABILITY_LABELS[a].short}</small>
                <b>{dnd5e.fmtMod(m)}</b>
                <span className="faint">{dnd5e.abilityScore(c, a)}</span>
              </button>
              <button className={`save ${prof ? 'prof' : ''}`} onClick={() => onRoll(d20(save), `Tiro salvezza su ${ABILITY_LABELS[a].name}`)} title="Tiro salvezza">
                TS {dnd5e.fmtMod(save)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="sheet-skills">
        {SKILL_IDS.map((s) => {
          const b = dnd5e.skillBonus(c, s);
          return (
            <button key={s} onClick={() => onRoll(d20(b), SKILLS[s].name)} className={profs.has(s) ? 'prof' : ''}>
              <span className="dot" />
              <span className="grow ellipsis">{SKILLS[s].name}</span>
              <span className="faint small">{ABILITY_LABELS[SKILLS[s].ability].short}</span>
              <b>{dnd5e.fmtMod(b)}</b>
            </button>
          );
        })}
      </div>

      <div className="muted small">
        Competenza {dnd5e.fmtMod(dnd5e.proficiencyBonus(c.level))} · Percezione passiva {dnd5e.passivePerception(c)}
        {sc && ` · CD incantesimi ${sc.saveDc} · Attacco ${dnd5e.fmtMod(sc.attack)}`}
      </div>
    </div>
  );
}

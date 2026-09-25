import { roll } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BestiaryProps, StatBlockProps } from '..';

const { MONSTERS, ABILITIES, ABILITY_LABELS } = dnd5e;
const d20 = (b: number) => `1d20${b >= 0 ? '+' : ''}${b}`;

export function Dnd5eBestiary({ onAdd, onRoll }: BestiaryProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [rollHp, setRollHp] = useState(false);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MONSTERS.filter((m) => !q || m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)).sort((a, b) => dnd5e.crValue(a.cr) - dnd5e.crValue(b.cr));
  }, [query]);
  const add = (m: dnd5e.MonsterDef) => {
    const hp = rollHp ? Math.max(1, roll(m.hp.dice).total) : m.hp.average;
    const size = m.size === 'Grande' ? 2 : m.size === 'Enorme' ? 3 : m.size === 'Mastodontica' ? 4 : 1;
    onAdd({ name: m.name, monsterId: m.id, hp: { current: hp, max: hp }, ac: m.ac, size });
  };
  return (
    <div className="col">
      <div className="row" style={{ position: 'relative' }}>
        <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
        <input className="input" style={{ paddingLeft: 30 }} placeholder="Cerca mostro o tipo" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <label className="row small muted">
        <input type="checkbox" checked={rollHp} onChange={(e) => setRollHp(e.target.checked)} /> Tira i punti ferita
      </label>
      <div className="rows">
        {list.map((m) => (
          <div key={m.id}>
            <div className="r">
              <button className="grow" style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }} onClick={() => setOpen(open === m.id ? null : m.id)}>
                <span>{m.name}</span> <span className="faint tiny">· GS {m.cr} · {m.type}</span>
              </button>
              <button className="btn sm icon" title="Aggiungi al tavolo" onClick={() => add(m)}>
                <Plus size={13} />
              </button>
            </div>
            {open === m.id && (
              <div style={{ padding: '4px 0 12px' }}>
                <StatBlock monsterId={m.id} onRoll={onRoll} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ monsterId, onRoll }: StatBlockProps) {
  const m = dnd5e.monsterById(monsterId);
  if (!m) return null;
  const mod = (a: dnd5e.Ability) => dnd5e.monsterMod(m.abilities[a]);
  return (
    <div className="col small" style={{ gap: 6 }}>
      <div className="muted">
        {m.size} · {m.type} · GS {m.cr} ({m.xp} PE)
      </div>
      <div className="row wrap" style={{ gap: 'var(--s3)' }}>
        <span>
          <b>CA</b> {m.ac}
        </span>
        <span>
          <b>PF</b> {m.hp.average} ({m.hp.dice})
        </span>
        <span>
          <b>Velocità</b> {m.speed}
        </span>
      </div>
      <div className="ab-grid">
        {ABILITIES.map((a) => (
          <div key={a} className="ab">
            <button onClick={() => onRoll(d20(mod(a)), `${m.name} · ${ABILITY_LABELS[a].name}`)}>
              <small>{ABILITY_LABELS[a].short}</small>
              <b>{dnd5e.fmtMod(mod(a))}</b>
              <span className="score">{m.abilities[a]}</span>
            </button>
          </div>
        ))}
      </div>
      {m.senses && <div className="muted">{m.senses}</div>}
      {m.traits?.map((t) => (
        <div key={t.name}>
          <b>{t.name}.</b> <span className="muted">{t.description}</span>
        </div>
      ))}
      {m.actions.map((a) => (
        <div key={a.name} className="attack" style={{ gridTemplateColumns: '1fr auto auto' }}>
          <b>
            {a.name}
            {a.recharge ? <span className="faint tiny"> (ricarica {a.recharge})</span> : null}
          </b>
          {a.attack !== undefined ? (
            <button className="btn sm" onClick={() => onRoll(d20(a.attack!), `${m.name} · ${a.name}`)}>
              {dnd5e.fmtMod(a.attack)}
            </button>
          ) : a.save ? (
            <span className="badge">
              TS {ABILITY_LABELS[a.save.ability].short} {a.save.dc}
            </span>
          ) : (
            <span />
          )}
          {a.damage ? (
            <button className="btn sm" onClick={() => onRoll(a.damage!, `${m.name} · ${a.name} · danni ${a.damageType ?? ''}`)}>
              {a.damage}
            </button>
          ) : (
            <span />
          )}
          <div className="meta">
            {[a.reach, a.damageType, a.save && a.attack !== undefined ? `TS ${ABILITY_LABELS[a.save.ability].short} CD ${a.save.dc}` : null, a.description].filter(Boolean).join(' · ')}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Dnd5eStatBlock = StatBlock;

export function dnd5eMonsterInitiative(monsterId: string): number {
  const m = dnd5e.monsterById(monsterId);
  return m ? dnd5e.monsterMod(m.abilities.dex) : 0;
}

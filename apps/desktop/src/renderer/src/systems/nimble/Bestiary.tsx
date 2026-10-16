import { nimbleRules as n } from '@thevtt/systems';
import { Crown, Dices, Plus, Search, Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BestiaryProps, StatBlockProps } from '..';

type M = n.MonsterDef;

/** the attack a monster rolls: the Primary Die on the first term; minions and flunkies never crit */
export function monsterFormula(m: M, damage: string): string {
  const flags = m.minion || m.flunky ? 'x' : '';
  return /^\d*d\d+/i.test(damage) ? damage.replace(/^(\d*d\d+)/i, `$1n${flags}`) : damage;
}

/** The token a monster becomes on the map. */
export function monsterToken(m: M, name = m.name) {
  const hp = m.hp ?? 1;
  return {
    name,
    monsterId: m.id,
    size: n.SIZES[m.size]?.cells ?? 1,
    hp: { current: hp, max: hp },
    ac: null,
    nimble: { armor: m.armor === 'none' ? null : m.armor, minion: m.minion || undefined },
  };
}

const ARMOR_SHORT: Record<n.MonsterArmor, string> = { none: '', M: 'Armatura media', H: 'Armatura pesante' };

export function NimbleBestiary({ onAdd, onRoll, partyLevels = [] }: BestiaryProps) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [kind, setKind] = useState<'all' | 'minion' | 'legendary'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<Record<string, number>>({});
  const groups = useMemo(() => [...new Set(n.ALL_MONSTERS.map((m) => m.group))], []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return n.ALL_MONSTERS.filter(
      (m) =>
        (!group || m.group === group) &&
        (kind === 'all' || (kind === 'minion' ? m.minion : m.legendary)) &&
        (!needle || m.name.toLowerCase().includes(needle) || m.en.toLowerCase().includes(needle) || m.group.toLowerCase().includes(needle)),
    );
  }, [q, group, kind]);
  const picked = Object.entries(encounter).filter(([, k]) => k > 0);
  const diff = n.encounterDifficulty(
    partyLevels,
    picked.flatMap(([id, k]) => Array<number>(k).fill(n.levelValue(n.getMonster(id)?.level ?? '0'))),
  );
  const addOne = (id: string, d: number) => setEncounter((e) => ({ ...e, [id]: Math.max(0, (e[id] ?? 0) + d) }));
  return (
    <div className="col" style={{ gap: 'var(--s3)' }}>
      <div className="row" style={{ position: 'relative' }}>
        <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
        <input className="input" style={{ paddingLeft: 30 }} placeholder="Cerca un mostro…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="seg row" style={{ alignSelf: 'flex-start' }}>
        {(
          [
            ['all', 'Tutti'],
            ['minion', 'Gregari'],
            ['legendary', 'Leggendari'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
      </div>
      <select className="select" value={group ?? ''} onChange={(e) => setGroup(e.target.value || null)} aria-label="Famiglia">
        <option value="">Tutte le famiglie</option>
        {groups.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      {picked.length > 0 && (
        <div className="detail" style={{ padding: 8 }}>
          <div className="row between">
            <b className="small">Scontro</b>
            <span className="small">
              {partyLevels.length ? (
                <>
                  Difficoltà: <b>{diff.label}</b> <span className="faint tiny">(livelli dei mostri / degli eroi: {diff.ratio.toFixed(2)})</span>
                </>
              ) : (
                <span className="faint">Nessun eroe al tavolo per pesarlo</span>
              )}
            </span>
          </div>
          {picked.map(([id, k]) => (
            <div key={id} className="row between small">
              <span>
                {k}× {n.getMonster(id)?.name}
              </span>
              <span className="row" style={{ gap: 2 }}>
                <button className="btn ghost sm icon" aria-label="Uno in meno" onClick={() => addOne(id, -1)}>
                  −
                </button>
                <button className="btn ghost sm icon" aria-label="Uno in più" onClick={() => addOne(id, 1)}>
                  +
                </button>
              </span>
            </div>
          ))}
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            {onAdd && (
              <button
                className="btn sm"
                onClick={() => {
                  let i = 0;
                  for (const [id, k] of picked) {
                    const m = n.getMonster(id)!;
                    for (let j = 0; j < k; j++) onAdd(monsterToken(m, k > 1 ? `${m.name} ${j + 1}` : m.name), i++);
                  }
                  setEncounter({});
                }}
              >
                <Plus size={13} /> Metti tutti sulla mappa
              </button>
            )}
            <button className="btn ghost sm" onClick={() => setEncounter({})}>
              Svuota
            </button>
          </div>
        </div>
      )}
      <div className="col" style={{ gap: 4 }}>
        {list.map((m) => (
          <div key={m.id} className="detail" style={{ padding: 8 }}>
            <div className="row between">
              <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start' }} onClick={() => setOpen(open === m.id ? null : m.id)}>
                {m.legendary && <Crown size={12} className="muted" />}
                <b>{m.name}</b>
                <span className="faint tiny">
                  Liv. {m.level} · {m.minion ? 'gregario' : `${m.hp ?? '—'} PF`}
                  {m.armor !== 'none' ? ` · ${m.armor === 'M' ? 'Media' : 'Pesante'}` : ''}
                </span>
              </button>
              <button className="btn ghost sm" title="Aggiungi allo scontro" onClick={() => addOne(m.id, 1)}>
                <Swords size={13} />
              </button>
              {onAdd && (
                <button className="btn sm" title="Metti sulla mappa" onClick={() => onAdd(monsterToken(m))}>
                  <Plus size={13} />
                </button>
              )}
            </div>
            {open === m.id && <MonsterBlock m={m} onRoll={onRoll} />}
          </div>
        ))}
        {list.length === 0 && <span className="faint small">Nessun mostro trovato.</span>}
      </div>
    </div>
  );
}

export function MonsterBlock({ m, onRoll, onAttack }: { m: M; onRoll?: (formula: string, label: string) => void; onAttack?: StatBlockProps['onNimbleAttack'] }) {
  const attack = (a: n.MonsterAction) => {
    if (!a.damage) return;
    const formula = monsterFormula(m, a.damage);
    const label = `${m.name} · ${a.name}`;
    for (let i = 0; i < (a.times ?? 1); i++) {
      if (onAttack?.({ name: label, formula })) continue;
      onRoll?.(formula, label);
    }
  };
  const meta = [
    `Livello ${m.level}`,
    n.SIZES[m.size]?.name,
    m.minion ? 'Gregario: muore con qualsiasi danno, non fa critici' : `${m.hp ?? '—'} PF`,
    m.flunky ? 'Tirapiedi: non fa critici' : '',
    ARMOR_SHORT[m.armor],
    m.armorNote ?? '',
    `Velocità ${m.speed ?? 6}`,
    m.fly ? `Volo ${m.fly}` : '',
    m.burrow ? `Scavo ${m.burrow}` : '',
    m.saves ? `TS ${m.saves}` : '',
  ].filter(Boolean);
  return (
    <div className="col selectable" style={{ gap: 6, marginTop: 6 }}>
      <span className="faint tiny">
        {meta.join(' · ')} <i>({m.en})</i>
      </span>
      {m.armor !== 'none' && <span className="tiny muted">{n.MONSTER_ARMOR[m.armor].text} Critici e tiri salvezza la ignorano.</span>}
      {m.traits.map((t) => (
        <span key={t.name} className="small">
          <b>{t.name}.</b> {t.text}
        </span>
      ))}
      {m.actionsNote && <i className="small">{m.actionsNote}</i>}
      {m.actions.map((a) => (
        <div key={a.name} className="row between small" style={{ alignItems: 'flex-start', gap: 6 }}>
          <span className="grow">
            <b>
              {a.name}
              {a.times && a.times > 1 ? ` (${a.times}×)` : ''}
            </b>
            {a.damage ? ` ${a.damage}` : ''}
            {a.range ? ` · Gittata ${a.range}` : ''}
            {a.reach ? ` · Portata ${a.reach}` : ''}
            {a.text ? ` — ${a.text}` : ''}
          </span>
          {a.damage && (onRoll || onAttack) && (
            <button className="btn ghost sm" title={monsterFormula(m, a.damage)} onClick={() => attack(a)}>
              {onAttack ? <Swords size={12} /> : <Dices size={12} />} {monsterFormula(m, a.damage)}
            </button>
          )}
        </div>
      ))}
      {m.bloodied && (
        <span className="small">
          <b>Sanguinante.</b> {m.bloodied}
        </span>
      )}
      {m.lastStand && (
        <span className="small">
          <b>Ultima resistenza.</b> {m.lastStand}
        </span>
      )}
    </div>
  );
}

export function NimbleStatBlock({ monsterId, onRoll, onNimbleAttack }: StatBlockProps) {
  const m = n.getMonster(monsterId);
  if (!m) return <span className="faint small">Mostro sconosciuto.</span>;
  return (
    <>
      {onNimbleAttack && <span className="faint tiny">Segna i bersagli (Ctrl+clic) e premi un attacco: il tavolo tira e chiede agli eroi se Difendersi.</span>}
      <MonsterBlock m={m} onRoll={onRoll} onAttack={onNimbleAttack} />
    </>
  );
}

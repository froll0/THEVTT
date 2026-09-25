import { roll } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { Copy, Download, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BestiaryProps, StatBlockProps } from '..';
import { useApp } from '../../store/app';
import { HOMEBREW_PREFIX, useHomebrew } from '../../store/homebrew';
import { MonsterEditor } from './MonsterEditor';

const { MONSTERS, ABILITIES, ABILITY_LABELS } = dnd5e;
const d20 = (b: number) => `1d20${b >= 0 ? '+' : ''}${b}`;


const SYSTEM_ID = 'dnd5e-2024';

/** SRD entry or one of this user's homebrew creatures. */
export function resolveMonster(id: string): dnd5e.MonsterDef | undefined {
  if (id.startsWith(HOMEBREW_PREFIX)) {
    const hb = useHomebrew.getState().monsters.find((m) => m.id === id);
    return hb ? { ...(hb.data as dnd5e.MonsterDef), id } : undefined;
  }
  return dnd5e.monsterById(id);
}

function useMonsters() {
  const homebrew = useHomebrew((s) => s.monsters);
  return useMemo(
    () => [
      ...MONSTERS.map((m) => ({ m, own: false })),
      ...homebrew.filter((h) => h.systemId === SYSTEM_ID).map((h) => ({ m: { ...(h.data as dnd5e.MonsterDef), id: h.id }, own: true })),
    ],
    [homebrew],
  );
}

type Source = 'all' | 'srd' | 'own';

export function Dnd5eBestiary({ onAdd, onRoll }: BestiaryProps) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<Source>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [rollHp, setRollHp] = useState(false);
  const [editing, setEditing] = useState<dnd5e.MonsterDef | null>(null);
  const all = useMonsters();
  const { saveMonster, deleteMonster } = useHomebrew();
  const toast = useApp((s) => s.toast);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(({ own }) => source === 'all' || (source === 'own') === own)
      .filter(({ m }) => !q || m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || `gs ${m.cr}` === q)
      .sort((a, b) => dnd5e.crValue(a.m.cr) - dnd5e.crValue(b.m.cr) || a.m.name.localeCompare(b.m.name));
  }, [query, source, all]);
  const add = (m: dnd5e.MonsterDef) => {
    const hp = rollHp ? Math.max(1, roll(m.hp.dice).total) : m.hp.average;
    onAdd?.({ name: m.name, monsterId: m.id, hp: { current: hp, max: hp }, ac: m.ac, size: dnd5e.sizeCells(m.size), darkvision: dnd5e.monsterDarkvision(m) });
  };
  const save = (m: dnd5e.MonsterDef) => {
    const { id, ...data } = m;
    const saved = saveMonster(SYSTEM_ID, data, id.startsWith(HOMEBREW_PREFIX) ? id : undefined);
    setEditing(null);
    setSource((s) => (s === 'srd' ? 'all' : s));
    setOpen(saved);
    toast(`«${m.name}» salvata`, 'success');
  };
  const exportAll = () => {
    const own = all.filter((x) => x.own).map((x) => x.m);
    const blob = new Blob([JSON.stringify({ thevtt: 'monsters', systemId: SYSTEM_ID, monsters: own }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'creature-thevtt.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as { monsters?: dnd5e.MonsterDef[] };
      const items = (parsed.monsters ?? []).filter((m) => m && typeof m.name === 'string' && Array.isArray(m.actions));
      for (const m of items) {
        const { id: _id, ...data } = { ...dnd5e.blankMonster(), ...m };
        saveMonster(SYSTEM_ID, data);
      }
      toast(items.length ? `${items.length} creature importate` : 'Nessuna creatura nel file', items.length ? 'success' : 'error');
      if (items.length) setSource('own');
    } catch {
      toast('File non valido', 'error');
    }
  };

  return (
    <div className="col">
      <div className="row">
        <div className="row grow" style={{ position: 'relative' }}>
          <Search size={14} className="faint" style={{ position: 'absolute', left: 10 }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Cerca per nome, tipo o «gs 3»" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn sm" onClick={() => setEditing(dnd5e.blankMonster())}>
          <Plus size={14} /> Nuova
        </button>
      </div>
      <div className="row between">
        <div className="seg">
          {(
            [
              ['all', 'Tutte'],
              ['srd', 'SRD'],
              ['own', 'Mie'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={source === id ? 'on' : ''} onClick={() => setSource(id)}>
              {label}
            </button>
          ))}
        </div>
        {onAdd && (
          <label className="row small muted">
            <input type="checkbox" checked={rollHp} onChange={(e) => setRollHp(e.target.checked)} /> Tira i PF
          </label>
        )}
      </div>
      {source === 'own' && (
        <div className="row">
          <button className="btn ghost sm" disabled={!all.some((x) => x.own)} onClick={exportAll}>
            <Download size={13} /> Esporta
          </button>
          <label className="btn ghost sm">
            <Upload size={13} /> Importa
            <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0]).then(() => (e.target.value = ''))} />
          </label>
        </div>
      )}
      {list.length === 0 && <p className="faint small">{source === 'own' ? 'Nessuna creatura personalizzata. Creane una o duplica un mostro dell’SRD.' : 'Nessun risultato.'}</p>}
      <div className="rows">
        {list.map(({ m, own }) => (
          <div key={m.id}>
            <div className="r">
              <button className="grow" style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, color: 'inherit' }} onClick={() => setOpen(open === m.id ? null : m.id)}>
                <span>{m.name}</span> <span className="faint tiny">· GS {m.cr} · {m.type}</span> {own && <span className="tag">mia</span>}
              </button>
              {onAdd && (
                <button className="btn sm icon" title="Aggiungi al tavolo" onClick={() => add(m)}>
                  <Plus size={13} />
                </button>
              )}
            </div>
            {open === m.id && (
              <div style={{ padding: '4px 0 12px' }} className="col">
                <StatBlock monsterId={m.id} onRoll={onRoll} />
                <div className="row">
                  <button className="btn ghost sm" onClick={() => setEditing(own ? m : { ...structuredClone(m), id: '', name: `${m.name} (variante)` })}>
                    {own ? <Pencil size={13} /> : <Copy size={13} />} {own ? 'Modifica' : 'Duplica e modifica'}
                  </button>
                  {own && (
                    <button
                      className="btn ghost sm danger"
                      onClick={() => {
                        deleteMonster(m.id);
                        setOpen(null);
                      }}
                    >
                      <Trash2 size={13} /> Elimina
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {editing && <MonsterEditor initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StatBlock({ monsterId, onRoll }: StatBlockProps) {
  useHomebrew((s) => s.monsters);
  const m = resolveMonster(monsterId);
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
  const m = resolveMonster(monsterId);
  return m ? dnd5e.monsterMod(m.abilities.dex) : 0;
}

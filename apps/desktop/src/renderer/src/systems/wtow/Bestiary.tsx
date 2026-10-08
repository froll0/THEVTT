import { warhammer as w } from '@thevtt/systems';
import { Dices, Pencil, Plus, Search, Sword, Swords, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BestiaryProps, StatBlockProps } from '..';
import { HOMEBREW_PREFIX, useHomebrew } from '../../store/homebrew';
import { NpcEditor } from './NpcEditor';

/** A profile from the Guida del Gamemaster, or one of the GM's own. */
export function findNpc(id: string | null | undefined): w.Npc | undefined {
  if (!id) return undefined;
  if (id.startsWith(HOMEBREW_PREFIX)) {
    const hb = useHomebrew.getState().monsters.find((m) => m.id === id && m.systemId === 'wtow');
    const n = hb ? w.normalizeNpc(hb.data) : null;
    return n ? { ...n, id } : undefined;
  }
  return w.getNpc(id);
}

const TYPES: w.NpcType[] = ['Servitore', 'Bruto', 'Campione', 'Mostruosità'];
const SKILL_NAMES = w.SKILL_INFO;

/** The token a creature becomes on the map. */
export function npcToken(n: w.Npc, name = n.name) {
  const pool = w.npcPool(n);
  return {
    name,
    monsterId: n.id,
    size: n.type === 'Mostruosità' ? (/(Gigante|Drago)/.test(n.name) ? 3 : 2) : /Ogre|Troll|Minotauro|Orso|Cervo|Semigrifone/.test(n.name) ? 2 : 1,
    hp: n.maxWounds ? { current: n.maxWounds, max: n.maxWounds } : null,
    ac: null,
    pool: pool ?? undefined,
  };
}

export function vehicleToken(v: w.Vehicle) {
  return { name: v.name, size: 2, hp: { current: v.breakdowns, max: v.breakdowns }, ac: null, pool: w.vehiclePool(v) };
}

export function WtowBestiary({ onAdd, onRoll }: BestiaryProps) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<w.NpcType | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [editing, setEditing] = useState<w.Npc | null>(null);
  const homebrew = useHomebrew((s) => s.monsters);
  const { saveMonster, deleteMonster } = useHomebrew();
  const own = useMemo(
    () =>
      homebrew
        .filter((h) => h.systemId === 'wtow')
        .map((h) => {
          const n = w.normalizeNpc(h.data);
          return n ? { ...n, id: h.id } : null;
        })
        .filter((n): n is w.Npc => !!n),
    [homebrew],
  );
  const groups = useMemo(() => [...new Set([...own.map((n) => n.group), ...w.NPC_GROUPS, 'Veicoli'])], [own]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...own, ...w.NPCS].filter((n) => (!type || n.type === type) && (!group || n.group === group) && (!needle || n.name.toLowerCase().includes(needle) || n.group.toLowerCase().includes(needle)));
  }, [q, type, group, own]);
  const vehicles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (type || (group && group !== 'Veicoli')) return [];
    return w.VEHICLES.filter((v) => !needle || v.name.toLowerCase().includes(needle) || 'veicoli'.includes(needle));
  }, [q, type, group]);
  return (
    <div className="col" style={{ gap: 'var(--s3)' }}>
      <div className="row">
        <Search size={14} className="muted" />
        <input className="input grow" placeholder="Cerca un PNG…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="row wrap" style={{ gap: 4 }}>
        {TYPES.map((t) => (
          <button key={t} className={`chip sm ${type === t ? 'on' : ''}`} onClick={() => setType(type === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>
      <select className="select" value={group ?? ''} onChange={(e) => setGroup(e.target.value || null)} aria-label="Gruppo">
        <option value="">Tutti i gruppi</option>
        {groups.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(w.blankNpc())}>
        <Plus size={13} /> Nuovo PNG
      </button>
      <div className="col" style={{ gap: 4 }}>
        {list.map((n) => (
          <div key={n.id} className="detail" style={{ padding: 8 }}>
            <div className="row between">
              <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start' }} onClick={() => setOpen(open === n.id ? null : n.id)}>
                <b>{n.name}</b>
                <span className="faint tiny">
                  {n.type} · Res {n.resilience ?? '—'}
                  {n.maxWounds && n.maxWounds > 1 ? ` · ${n.maxWounds} Ferite` : ''}
                </span>
              </button>
              {n.id.startsWith(HOMEBREW_PREFIX) && (
                <>
                  <button className="btn ghost sm icon" aria-label={`Modifica ${n.name}`} onClick={() => setEditing(n)}>
                    <Pencil size={12} />
                  </button>
                  <button className="btn ghost sm icon" aria-label={`Elimina ${n.name}`} onClick={() => confirm(`Eliminare «${n.name}»?`) && deleteMonster(n.id)}>
                    <Trash2 size={12} />
                  </button>
                </>
              )}
              {onAdd && (
                <button
                  className="btn sm"
                  title="Metti sulla mappa"
                  onClick={() => {
                    for (let i = 0; i < count; i++) onAdd(npcToken(n, count > 1 ? `${n.name} ${i + 1}` : n.name), i);
                  }}
                >
                  <Plus size={13} />
                </button>
              )}
            </div>
            {open === n.id && <NpcBlock npc={n} onRoll={onRoll} />}
          </div>
        ))}
        {vehicles.map((v) => (
          <div key={v.id} className="detail" style={{ padding: 8 }}>
            <div className="row between">
              <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start' }} onClick={() => setOpen(open === v.id ? null : v.id)}>
                <b>{v.name}</b>
                <span className="faint tiny">
                  {v.kind} · Res {v.resilience}
                  {v.armoured ? ' (corazzato)' : ''} · {v.breakdowns} Guasti
                </span>
              </button>
              {onAdd && (
                <button className="btn sm" title="Metti sulla mappa" onClick={() => onAdd(vehicleToken(v))}>
                  <Plus size={13} />
                </button>
              )}
            </div>
            {open === v.id && (
              <div className="col small" style={{ gap: 2 }}>
                <span>
                  <b>Velocità</b> {v.speedText ?? v.speed} · <b>Speronamento</b> {v.ram ?? '—'} · {v.crew}
                </span>
                <span className="muted">{v.text}</span>
                <span className="faint tiny">Gli attacchi contro un veicolo non si possono contrapporre; è immune alle Condizioni tranne In Fiamme. Ogni «Ferita» è un Guasto.</span>
              </div>
            )}
          </div>
        ))}
        {!list.length && !vehicles.length && <span className="faint small">Nessun PNG trovato.</span>}
      </div>
      {onAdd && (
        <label className="row small">
          <span className="muted">Quanti</span>
          <input className="input num" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} style={{ width: 60 }} />
        </label>
      )}
      {editing && (
        <NpcEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(n) => {
            const id = saveMonster('wtow', n, editing.id.startsWith(HOMEBREW_PREFIX) ? editing.id : undefined);
            setEditing(null);
            setOpen(id);
          }}
        />
      )}
      <p className="faint tiny">
        Un gruppo appena creato regge tanti Servitori quanti sono i PG; 1-2 Bruti sono già una sfida; un Campione è il culmine di un’avventura; una Mostruosità è quasi sempre fatale.
      </p>
    </div>
  );
}

export function NpcBlock({ npc: n, onRoll, onAttack }: { npc: w.Npc; onRoll: (formula: string, label: string) => void; onAttack?: (a: w.NpcAttack) => boolean }) {
  const skills = Object.entries(n.skills)
    .map(([k, v]) => `${SKILL_NAMES[k as w.SkillId].name} ${v}`)
    .join(', ');
  return (
    <div className="col wtow-npc" style={{ gap: 6 }}>
      <div className="wtow-npc-chars">
        {w.CHARACTERISTICS.map((k) => (
          <div key={k}>
            <small>{w.CHAR_INFO[k].short}</small>
            <b>{n.chars[k]}</b>
          </div>
        ))}
      </div>
      <span className="small">
        <b>Velocità</b> {n.speed} · <b>Resilienza</b> {n.resilience ?? '—'}
        {n.armoured ? ' (corazzato)' : ''} · <b>{n.type}</b>
      </span>
      {n.track && (
        <div className="row wrap small" style={{ gap: 4 }}>
          {n.track.map((r) => (
            <span key={r.at} className="chip sm">
              {r.at}: {r.effect}
            </span>
          ))}
        </div>
      )}
      <span className="small">
        <b>Abilità</b> {skills}
        {skills ? ', ' : ''}Altre {n.other}
      </span>
      <div className="col" style={{ gap: 2 }}>
        {onAttack && n.type === 'Mostruosità' && n.attacks.length > 1 && (
          <button
            className="btn sm"
            style={{ alignSelf: 'flex-start' }}
            title="Una Mostruosità usa tutti i suoi attacchi, ognuno con la sua prova contrapposta"
            onClick={() => {
              for (const a of n.attacks) if (!onAttack(a)) break;
            }}
          >
            <Swords size={12} /> Tutti gli attacchi
          </button>
        )}
        {n.attacks.map((a) => (
          <div key={a.name} className="row small" style={{ gap: 6 }}>
            <button
              className="btn ghost sm grow"
              style={{ justifyContent: 'flex-start' }}
              title={onAttack ? 'Attacca il bersaglio segnato (o tira e basta)' : 'Tira'}
              onClick={() => (onAttack?.(a) ? undefined : onRoll(a.dice < 1 ? '1d10s1' : `${a.dice}d10s${a.target}`, a.name))}
            >
              <Sword size={12} />
              <span className="grow" style={{ textAlign: 'left' }}>
                {a.name} <span className="faint tiny">· {a.range}</span>
              </span>
              <span className="faint tiny">
                {a.dice}d/{a.target}
              </span>
              <b>{a.damage == null ? '—' : `D ${a.damage}`}</b>
            </button>
          </div>
        ))}
        {n.attacks.some((a) => a.traits) && (
          <span className="faint tiny">
            {n.attacks
              .filter((a) => a.traits)
              .map((a) => `${a.name}: ${a.traits}`)
              .join(' · ')}
          </span>
        )}
      </div>
      <div className="row wrap small" style={{ gap: 4 }}>
        <span className="muted">Protezione</span>
        {n.protection.map((p) => (
          <button key={p.skill} className="btn ghost sm" onClick={() => onRoll(`${p.dice}d10s${p.target}`, `${n.name} · ${p.skill}`)}>
            <Dices size={11} /> {p.skill} {p.dice}d/{p.target}
            {p.shield ? ' (scudo)' : ''}
          </button>
        ))}
      </div>
      {n.abilities.map((a) => (
        <span key={a.name} className="small">
          <b>{a.name}.</b> {a.text}
        </span>
      ))}
      {n.mage && (
        <div className="col" style={{ gap: 2 }}>
          <span className="small">
            <b>Mago di Livello {n.mage.level}.</b>{' '}
            <button className="btn ghost sm" onClick={() => onRoll(`${n.chars.ra}d10s${n.skills.volonta ?? n.other}m`, `${n.name} · Prova di Magia`)}>
              <Dices size={11} /> Prova di Magia
            </button>
          </span>
          {n.mage.spells.map((s) => (
            <span key={s.name} className="small">
              <i>{s.name}</i> (VM {s.vm}): {s.text}
            </span>
          ))}
        </div>
      )}
      {n.gear && <span className="faint tiny">Averi tipici: {n.gear}</span>}
    </div>
  );
}

export function WtowStatBlock({ monsterId, onRoll, onAttack }: StatBlockProps) {
  useHomebrew((s) => s.monsters);
  const n = findNpc(monsterId);
  if (!n) return <p className="faint small">Profilo sconosciuto.</p>;
  return (
    <NpcBlock
      npc={n}
      onRoll={onRoll}
      onAttack={
        onAttack
          ? (a) =>
              onAttack({
                name: a.name,
                dice: a.dice,
                target: a.target,
                damage: a.damage,
                ranged: /Media|Lunga|Estrema/.test(a.range) || /Arco|Balestra|Pistola|Archibugio|Moschetto/i.test(a.name),
                optimal: /Media|Lunga|Estrema/.test(a.range) ? a.range : undefined,
                ignoresArmour: a.ignoresArmour,
                condition: a.damage == null ? (/Prono/.test(a.traits ?? '') ? 'Prono' : /Esausto/.test(a.traits ?? '') ? 'Esausto' : /Ostacolato/.test(a.traits ?? '') ? 'Ostacolato' : 'Barcollante') : undefined,
              })
          : undefined
      }
    />
  );
}

import { dnd5e } from '@thevtt/systems';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field, Modal } from '../../components/ui';

type M = dnd5e.MonsterDef;
type Action = dnd5e.MonsterAction;
const { ABILITIES, ABILITY_LABELS, MONSTER_SIZES, CHALLENGE_RATINGS } = dnd5e;

const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
const listOf = (v: string) => {
  const out = v.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return out.length ? out : undefined;
};

/** A list of actions (also legendary and lair ones), each with its attack, damage and save. */
function ActionList({ title, add, list, onChange, m, legendary }: { title: string; add: string; list: Action[]; onChange: (l: Action[]) => void; m: M; legendary?: boolean }) {
  const prof = dnd5e.crProficiency(m.cr);
  const setAction = (i: number, patch: Partial<Action>) => onChange(list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <>
      <div className="row between">
        <span className="section-title">{title}</span>
        <button className="btn ghost sm" onClick={() => onChange([...list, { name: '', attack: prof + dnd5e.monsterMod(m.abilities.str), damage: '1d6', damageType: 'contundenti', reach: '1,5 m' }])}>
          <Plus size={13} /> {add}
        </button>
      </div>
      {list.map((a, i) => (
        <div key={i} className="editor-item">
          <div className="row">
            <input className="input grow" placeholder="Nome (es. Morso)" value={a.name} onChange={(e) => setAction(i, { name: e.target.value })} />
            {legendary && (
              <label className="row small" style={{ gap: 4 }}>
                costa
                <input className="input num" type="number" min={1} max={3} style={{ width: 54 }} value={a.cost ?? 1} onChange={(e) => setAction(i, { cost: Math.max(1, Number(e.target.value) || 1) })} aria-label="Costo" />
              </label>
            )}
            <button className="btn ghost sm icon" aria-label="Rimuovi azione" onClick={() => onChange(list.filter((_, j) => j !== i))}>
              <Trash2 size={13} />
            </button>
          </div>
          <div className="grid-4">
            <Field label="Bonus attacco">
              <input className="input" type="number" value={a.attack ?? ''} placeholder="—" onChange={(e) => setAction(i, { attack: num(e.target.value) })} />
            </Field>
            <Field label="Danni">
              <input className="input mono" value={a.damage ?? ''} placeholder="2d6+3" onChange={(e) => setAction(i, { damage: e.target.value || undefined })} />
            </Field>
            <Field label="Tipo di danno">
              <input className="input" value={a.damageType ?? ''} placeholder="taglienti" onChange={(e) => setAction(i, { damageType: e.target.value || undefined })} />
            </Field>
            <Field label="Portata / gittata">
              <input className="input" value={a.reach ?? ''} placeholder="1,5 m" onChange={(e) => setAction(i, { reach: e.target.value || undefined })} />
            </Field>
          </div>
          <div className="grid-4">
            <Field label="Tiro salvezza">
              <select
                className="select"
                value={a.save?.ability ?? ''}
                onChange={(e) => setAction(i, { save: e.target.value ? { ability: e.target.value as dnd5e.Ability, dc: a.save?.dc ?? 8 + prof + dnd5e.monsterMod(m.abilities.con) } : undefined })}
              >
                <option value="">Nessuno</option>
                {ABILITIES.map((ab) => (
                  <option key={ab} value={ab}>
                    {ABILITY_LABELS[ab].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CD">
              <input className="input" type="number" disabled={!a.save} value={a.save?.dc ?? ''} onChange={(e) => a.save && setAction(i, { save: { ...a.save, dc: Number(e.target.value) || 0 } })} />
            </Field>
            <Field label="Ricarica">
              <input className="input" value={a.recharge ?? ''} placeholder="5-6" onChange={(e) => setAction(i, { recharge: e.target.value || undefined })} />
            </Field>
            <label className="row small" style={{ gap: 6, alignSelf: 'end' }}>
              <input type="checkbox" disabled={!a.save} checked={!!a.save && !a.noHalf} onChange={(e) => setAction(i, { noHalf: !e.target.checked || undefined })} /> Metà se supera
            </label>
          </div>
          <textarea className="textarea" rows={2} placeholder="Effetti aggiuntivi" value={a.description ?? ''} onChange={(e) => setAction(i, { description: e.target.value || undefined })} />
        </div>
      ))}
    </>
  );
}

/** Homebrew creature editor: every field of a stat block, starting blank or from a copy. */
export function MonsterEditor({ initial, onSave, onClose }: { initial: M; onSave: (m: M) => void; onClose: () => void }) {
  const [m, setM] = useState<M>(() => structuredClone(initial));
  const set = (patch: Partial<M>) => setM((cur) => ({ ...cur, ...patch }));
  const traits = m.traits ?? [];
  const avg = dnd5e.averageOf(m.hp.dice);
  const prof = dnd5e.crProficiency(m.cr);

  return (
    <Modal
      title={initial.id ? `Modifica «${initial.name}»` : 'Nuova creatura'}
      wide
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" disabled={!m.name.trim()} onClick={() => onSave({ ...m, name: m.name.trim(), xp: dnd5e.xpForCr(m.cr) })}>
            Salva creatura
          </button>
        </>
      }
    >
      <div className="col monster-editor">
        <div className="grid-3">
          <Field label="Nome">
            <input className="input" value={m.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
          <Field label="Taglia">
            <select className="select" value={m.size} onChange={(e) => set({ size: e.target.value as M['size'] })}>
              {MONSTER_SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <input className="input" value={m.type} onChange={(e) => set({ type: e.target.value })} placeholder="es. Non morto" />
          </Field>
        </div>
        <div className="grid-4">
          <Field label="Classe armatura">
            <input className="input" type="number" value={m.ac} onChange={(e) => set({ ac: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Dadi vita">
            <input className="input mono" value={m.hp.dice} onChange={(e) => set({ hp: { dice: e.target.value, average: dnd5e.averageOf(e.target.value) ?? m.hp.average } })} placeholder="4d8+4" />
          </Field>
          <Field label={`PF medi${avg !== null && avg !== m.hp.average ? ` (media ${avg})` : ''}`}>
            <input className="input" type="number" value={m.hp.average} onChange={(e) => set({ hp: { ...m.hp, average: Number(e.target.value) || 0 } })} />
          </Field>
          <Field label="Grado di sfida">
            <select className="select" value={m.cr} onChange={(e) => set({ cr: e.target.value })}>
              {CHALLENGE_RATINGS.map((cr) => (
                <option key={cr} value={cr}>
                  {cr} ({dnd5e.xpForCr(cr)} PE)
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Velocità">
            <input className="input" value={m.speed} onChange={(e) => set({ speed: e.target.value })} placeholder="9 m, volare 18 m" />
          </Field>
          <Field label="Sensi">
            <input className="input" value={m.senses ?? ''} onChange={(e) => set({ senses: e.target.value || undefined })} placeholder="Scurovisione 18 m" />
          </Field>
        </div>
        <div className="ab-edit">
          {ABILITIES.map((a) => (
            <label key={a}>
              <small>{ABILITY_LABELS[a].short}</small>
              <input className="input num" type="number" min={1} max={30} value={m.abilities[a]} onChange={(e) => set({ abilities: { ...m.abilities, [a]: Number(e.target.value) || 1 } })} />
              <span className="faint tiny">{dnd5e.fmtMod(dnd5e.monsterMod(m.abilities[a]))}</span>
            </label>
          ))}
        </div>

        <div className="row between">
          <span className="section-title">Tratti</span>
          <button className="btn ghost sm" onClick={() => set({ traits: [...traits, { name: '', description: '' }] })}>
            <Plus size={13} /> Tratto
          </button>
        </div>
        {traits.map((t, i) => (
          <div key={i} className="editor-item">
            <div className="row">
              <input className="input grow" placeholder="Nome (es. Resistenza leggendaria)" value={t.name} onChange={(e) => set({ traits: traits.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <button className="btn ghost sm icon" aria-label="Rimuovi tratto" onClick={() => set({ traits: traits.filter((_, j) => j !== i) })}>
                <Trash2 size={13} />
              </button>
            </div>
            <textarea className="textarea" rows={2} placeholder="Descrizione" value={t.description} onChange={(e) => set({ traits: traits.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
          </div>
        ))}

        <ActionList title="Azioni" add="Azione" list={m.actions} onChange={(actions) => set({ actions })} m={m} />

        <span className="section-title">Difese</span>
        <div className="grid-3">
          {(
            [
              ['resistances', 'Resistenze (metà danni)'],
              ['immunities', 'Immunità (nessun danno)'],
              ['vulnerabilities', 'Vulnerabilità (doppi)'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <input className="input" defaultValue={(m[k] ?? []).join(', ')} placeholder="fuoco, veleno" onBlur={(e) => set({ [k]: listOf(e.target.value) })} />
            </Field>
          ))}
        </div>

        <div className="row between">
          <span className="section-title">Azioni leggendarie</span>
          <label className="row small" style={{ gap: 6 }}>
            per round
            <input
              className="input num"
              type="number"
              min={0}
              max={5}
              style={{ width: 60 }}
              value={m.legendary?.uses ?? 0}
              onChange={(e) => {
                const uses = Math.max(0, Math.min(5, Number(e.target.value) || 0));
                set({ legendary: uses ? { uses, actions: m.legendary?.actions ?? [] } : undefined });
              }}
              aria-label="Azioni leggendarie per round"
            />
          </label>
        </div>
        {m.legendary && <ActionList title="" add="Azione leggendaria" list={m.legendary.actions} onChange={(actions) => set({ legendary: { ...m.legendary!, actions } })} m={m} legendary />}
        <ActionList title="Azioni di tana (iniziativa 20)" add="Azione di tana" list={m.lair ?? []} onChange={(lair) => set({ lair: lair.length ? lair : undefined })} m={m} />
        <p className="faint tiny">Bonus di competenza per GS {m.cr}: +{prof}. Le creature personalizzate restano su questo computer.</p>
      </div>
    </Modal>
  );
}

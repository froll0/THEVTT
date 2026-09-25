import { dnd5e } from '@thevtt/systems';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field, Modal } from '../../components/ui';

type M = dnd5e.MonsterDef;
type Action = dnd5e.MonsterAction;
const { ABILITIES, ABILITY_LABELS, MONSTER_SIZES, CHALLENGE_RATINGS } = dnd5e;

const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

/** Homebrew creature editor: every field of a stat block, starting blank or from a copy. */
export function MonsterEditor({ initial, onSave, onClose }: { initial: M; onSave: (m: M) => void; onClose: () => void }) {
  const [m, setM] = useState<M>(() => structuredClone(initial));
  const set = (patch: Partial<M>) => setM((cur) => ({ ...cur, ...patch }));
  const setAction = (i: number, patch: Partial<Action>) => set({ actions: m.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
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

        <div className="row between">
          <span className="section-title">Azioni</span>
          <button className="btn ghost sm" onClick={() => set({ actions: [...m.actions, { name: '', attack: prof + dnd5e.monsterMod(m.abilities.str), damage: '1d6', damageType: 'contundenti', reach: '1,5 m' }] })}>
            <Plus size={13} /> Azione
          </button>
        </div>
        {m.actions.map((a, i) => (
          <div key={i} className="editor-item">
            <div className="row">
              <input className="input grow" placeholder="Nome (es. Morso)" value={a.name} onChange={(e) => setAction(i, { name: e.target.value })} />
              <button className="btn ghost sm icon" aria-label="Rimuovi azione" onClick={() => set({ actions: m.actions.filter((_, j) => j !== i) })}>
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
              <span />
            </div>
            <textarea className="textarea" rows={2} placeholder="Effetti aggiuntivi" value={a.description ?? ''} onChange={(e) => setAction(i, { description: e.target.value || undefined })} />
          </div>
        ))}
        <p className="faint tiny">Bonus di competenza per GS {m.cr}: +{prof}. Le creature personalizzate restano su questo computer.</p>
      </div>
    </Modal>
  );
}

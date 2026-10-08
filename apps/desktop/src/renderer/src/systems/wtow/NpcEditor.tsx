import { warhammer as w } from '@thevtt/systems';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../../components/ui';

const TYPES: w.NpcType[] = ['Servitore', 'Bruto', 'Campione', 'Mostruosità'];
const SKILL_LABELS = Object.fromEntries(w.SKILLS.map((s) => [w.SKILL_INFO[s].name, s])) as Record<string, w.SkillId>;

/** "Mischia 4, Volontà 3" ↔ the skills map */
const skillsText = (n: w.Npc) =>
  Object.entries(n.skills)
    .map(([k, v]) => `${w.SKILL_INFO[k as w.SkillId].name} ${v}`)
    .join(', ');

function parseSkills(text: string): Partial<Record<w.SkillId, number>> {
  const out: Partial<Record<w.SkillId, number>> = {};
  for (const part of text.split(',')) {
    const m = /^\s*(.+?)\s+(\d+)\s*$/.exec(part);
    const id = m && SKILL_LABELS[m[1]!.trim()];
    if (id) out[id] = Number(m![2]);
  }
  return out;
}

/** A creature of the GM's own, in the same shape as the Guida del Gamemaster's. */
export function NpcEditor({ initial, onSave, onClose }: { initial: w.Npc; onSave: (n: w.Npc) => void; onClose: () => void }) {
  const [n, setN] = useState<w.Npc>(initial);
  const [skills, setSkills] = useState(skillsText(initial));
  const set = (patch: Partial<w.Npc>) => setN({ ...n, ...patch });
  const num = (v: string, d = 0) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
  const tracked = n.type === 'Bruto' || n.type === 'Mostruosità';
  const save = () => {
    const out = w.normalizeNpc({ ...n, skills: parseSkills(skills) });
    if (out) onSave(out);
  };
  return (
    <Modal
      title={initial.name ? `Modifica ${initial.name}` : 'Nuovo PNG'}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn" disabled={!n.name.trim()} onClick={save}>
            Salva
          </button>
        </>
      }
    >
      <div className="col npc-editor" style={{ gap: 'var(--s3)' }}>
        <div className="row" style={{ gap: 6 }}>
          <input className="input grow" placeholder="Nome" aria-label="Nome del PNG" value={n.name} onChange={(e) => set({ name: e.target.value })} />
          <input className="input" placeholder="Gruppo" aria-label="Gruppo" value={n.group} onChange={(e) => set({ group: e.target.value })} style={{ width: 140 }} />
        </div>
        <div className="row wrap" style={{ gap: 4 }}>
          {TYPES.map((t) => (
            <button key={t} className={`chip sm ${n.type === t ? 'on' : ''}`} onClick={() => set({ type: t, maxWounds: t === 'Servitore' ? 1 : t === 'Campione' ? null : (n.maxWounds ?? 3) })}>
              {t}
            </button>
          ))}
        </div>
        <div className="wtow-npc-chars">
          {w.CHARACTERISTICS.map((k) => (
            <label key={k} className="col">
              <small>{w.CHAR_INFO[k].short}</small>
              <input className="input num" type="number" min={0} max={10} value={n.chars[k]} onChange={(e) => set({ chars: { ...n.chars, [k]: num(e.target.value) } })} aria-label={w.CHAR_INFO[k].name} />
            </label>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <label className="row small" style={{ gap: 4 }}>
            Velocità
            <select className="select" value={n.speed} onChange={(e) => set({ speed: e.target.value as w.Npc['speed'] })}>
              {['Lenta', 'Normale', 'Veloce'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="row small" style={{ gap: 4 }}>
            Resilienza
            <input className="input num" type="number" min={0} max={30} value={n.resilience ?? 0} onChange={(e) => set({ resilience: num(e.target.value, 3) })} style={{ width: 56 }} />
          </label>
          <label className="row small" style={{ gap: 4 }}>
            <input type="checkbox" checked={n.armoured} onChange={(e) => set({ armoured: e.target.checked })} /> Corazzato
          </label>
          {tracked && (
            <label className="row small" style={{ gap: 4 }}>
              Ferite per sconfiggerlo
              <input className="input num" type="number" min={1} max={30} value={n.maxWounds ?? 3} onChange={(e) => set({ maxWounds: num(e.target.value, 3) })} style={{ width: 56 }} />
            </label>
          )}
        </div>
        {tracked && (
          <label className="col small" style={{ gap: 2 }}>
            Tracciato delle Ferite <span className="faint tiny">una riga per soglia: «1-2 Ferite: Diventa Esausto»</span>
            <textarea
              className="input"
              rows={3}
              value={(n.track ?? []).map((r) => `${r.at}: ${r.effect}`).join('\n')}
              onChange={(e) =>
                set({
                  track: e.target.value
                    .split('\n')
                    .map((l) => l.split(':'))
                    .filter((p) => p[0]!.trim())
                    .map(([at, ...rest]) => ({ at: at!.trim(), effect: rest.join(':').trim() || '—' })),
                })
              }
            />
          </label>
        )}
        <label className="col small" style={{ gap: 2 }}>
          Abilità <span className="faint tiny">«Mischia 4, Volontà 3»; le altre valgono</span>
          <div className="row" style={{ gap: 6 }}>
            <input className="input grow" value={skills} onChange={(e) => setSkills(e.target.value)} aria-label="Abilità" />
            <input className="input num" type="number" min={1} max={6} value={n.other} onChange={(e) => set({ other: num(e.target.value, 2) })} aria-label="Altre abilità" style={{ width: 56 }} />
          </div>
        </label>

        <div className="col small" style={{ gap: 4 }}>
          <b>Attacchi</b>
          {n.attacks.map((a, i) => {
            const upd = (patch: Partial<w.NpcAttack>) => set({ attacks: n.attacks.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="row wrap" style={{ gap: 4 }}>
                <input className="input grow" placeholder="Nome" value={a.name} onChange={(e) => upd({ name: e.target.value })} aria-label="Nome dell’attacco" />
                <input className="input" placeholder="Ravvicinata" value={a.range} onChange={(e) => upd({ range: e.target.value })} aria-label="Portata" style={{ width: 110 }} />
                <input className="input num" type="number" min={0} max={20} value={a.dice} onChange={(e) => upd({ dice: num(e.target.value) })} aria-label="Dadi" title="Dadi" style={{ width: 48 }} />
                <input className="input num" type="number" min={1} max={10} value={a.target} onChange={(e) => upd({ target: num(e.target.value, 3) })} aria-label="Soglia" title="Soglia" style={{ width: 48 }} />
                <input
                  className="input num"
                  placeholder="—"
                  value={a.damage ?? ''}
                  onChange={(e) => upd({ damage: e.target.value === '' ? null : num(e.target.value) })}
                  aria-label="Danno"
                  title="Danno (vuoto: infligge una Condizione)"
                  style={{ width: 48 }}
                />
                <button className="btn ghost sm icon" aria-label="Togli l’attacco" onClick={() => set({ attacks: n.attacks.filter((_, j) => j !== i) })}>
                  <Trash2 size={12} />
                </button>
                <input className="input" style={{ width: '100%' }} placeholder="Tratti (ignora l’armatura, infligge Prono…)" value={a.traits ?? ''} onChange={(e) => upd({ traits: e.target.value || undefined, ignoresArmour: /ignora l.armatura/i.test(e.target.value) || undefined })} />
              </div>
            );
          })}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ attacks: [...n.attacks, { name: 'Attacco', range: 'Ravvicinata', dice: 3, target: 3, damage: 3 }] })}>
            <Plus size={12} /> Attacco
          </button>
        </div>

        <div className="col small" style={{ gap: 4 }}>
          <b>Protezione</b>
          {n.protection.map((p, i) => {
            const upd = (patch: Partial<w.NpcProtection>) => set({ protection: n.protection.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="row" style={{ gap: 4 }}>
                <select className="select" value={p.skill} onChange={(e) => upd({ skill: e.target.value as w.NpcProtection['skill'] })} aria-label="Abilità di Protezione">
                  {['Atletica', 'Difesa', 'Furtività'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <input className="input num" type="number" min={0} max={20} value={p.dice} onChange={(e) => upd({ dice: num(e.target.value) })} aria-label="Dadi di Protezione" style={{ width: 48 }} />
                <input className="input num" type="number" min={1} max={10} value={p.target} onChange={(e) => upd({ target: num(e.target.value, 2) })} aria-label="Soglia di Protezione" style={{ width: 48 }} />
                <label className="row small">
                  <input type="checkbox" checked={!!p.shield} onChange={(e) => upd({ shield: e.target.checked || undefined })} /> scudo
                </label>
                <button className="btn ghost sm icon" aria-label="Togli" disabled={n.protection.length < 2} onClick={() => set({ protection: n.protection.filter((_, j) => j !== i) })}>
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          {n.protection.length < 3 && (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ protection: [...n.protection, { skill: 'Difesa', dice: 3, target: 3 }] })}>
              <Plus size={12} /> Protezione
            </button>
          )}
        </div>

        <div className="col small" style={{ gap: 4 }}>
          <b>Capacità</b>
          <span className="faint tiny">Per una Mostruosità, una Capacità con «(Reazione)» nel nome è quella che scatta al posto di una Ferita.</span>
          {n.abilities.map((a, i) => (
            <div key={i} className="col" style={{ gap: 2 }}>
              <div className="row" style={{ gap: 4 }}>
                <input className="input grow" placeholder="Nome" value={a.name} onChange={(e) => set({ abilities: n.abilities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Nome della capacità" />
                <button className="btn ghost sm icon" aria-label="Togli la capacità" onClick={() => set({ abilities: n.abilities.filter((_, j) => j !== i) })}>
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea className="input" rows={2} value={a.text} onChange={(e) => set({ abilities: n.abilities.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} aria-label="Testo della capacità" />
            </div>
          ))}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ abilities: [...n.abilities, { name: '', text: '' }] })}>
            <Plus size={12} /> Capacità
          </button>
        </div>
        <label className="col small" style={{ gap: 2 }}>
          Averi tipici
          <input className="input" value={n.gear ?? ''} onChange={(e) => set({ gear: e.target.value || undefined })} />
        </label>
      </div>
    </Modal>
  );
}

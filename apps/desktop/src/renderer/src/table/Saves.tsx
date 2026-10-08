import type { Ability } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTable } from '../store/table';

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** GM: several tokens roll the same saving throw, and take the damage of failing it. */
export function GroupSaveForm({ tokenIds }: { tokenIds: string[] }) {
  const dispatch = useTable((s) => s.dispatch);
  const [open, setOpen] = useState(false);
  const [ability, setAbility] = useState<Ability>('dex');
  const [dc, setDc] = useState(13);
  const [damage, setDamage] = useState('');
  const [damageType, setDamageType] = useState('');
  const [half, setHalf] = useState(true);
  const [label, setLabel] = useState('');
  if (!open)
    return (
      <button className="btn sm" onClick={() => setOpen(true)}>
        <ShieldCheck size={13} /> Tiro salvezza
      </button>
    );
  return (
    <form
      className="col group-save"
      aria-label="Tiro salvezza di gruppo"
      onSubmit={(e) => {
        e.preventDefault();
        const name = label.trim() || `TS ${dnd5e.ABILITY_LABELS[ability].name}`;
        dispatch({ type: 'save.group', tokenIds, ability, dc, label: name, damage: damage.trim() || undefined, damageType: damageType || undefined, half });
        setOpen(false);
      }}
    >
      <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cosa (es. Trappola di fuoco)" aria-label="Nome del tiro salvezza" />
      <div className="row" style={{ gap: 6 }}>
        <select className="select" value={ability} onChange={(e) => setAbility(e.target.value as Ability)} aria-label="Caratteristica">
          {ABILITIES.map((a) => (
            <option key={a} value={a}>
              {dnd5e.ABILITY_LABELS[a].name}
            </option>
          ))}
        </select>
        <label className="row small" style={{ gap: 4 }}>
          CD
          <input className="input num" type="number" min={1} max={40} style={{ width: 60 }} value={dc} onChange={(e) => setDc(Number(e.target.value) || 10)} aria-label="Classe difficoltà" />
        </label>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <input className="input" style={{ width: 100 }} value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="Danni: 4d6" aria-label="Danni" />
        <select className="select" value={damageType} onChange={(e) => setDamageType(e.target.value)} aria-label="Tipo di danno">
          <option value="">tipo…</option>
          {Object.values(dnd5e.DAMAGE_TYPES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {damage.trim() && (
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} /> Chi lo supera subisce metà danni
        </label>
      )}
      <div className="row" style={{ gap: 6 }}>
        <button className="btn primary sm" type="submit">
          Tira per {tokenIds.length}
        </button>
        <button className="btn ghost sm" type="button" onClick={() => setOpen(false)}>
          Annulla
        </button>
      </div>
    </form>
  );
}

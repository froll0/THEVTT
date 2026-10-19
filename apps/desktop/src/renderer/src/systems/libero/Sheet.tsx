import { roll, newId } from '@thevtt/shared';
import { free as f } from '@thevtt/systems';
import { Dices, Minus, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Section } from '../../components/ui';
import type { BuilderProps, SheetProps } from '..';

type C = f.FreeCharacter;

/** fields grouped under their heading, in order */
function groups<T extends { group?: string }>(list: T[]): [string, T[]][] {
  const out = new Map<string, T[]>();
  for (const x of list) {
    const k = x.group ?? '';
    out.set(k, [...(out.get(k) ?? []), x]);
  }
  return [...out];
}

/** a formula the dice can roll once the fields are put in? */
function formulaError(c: C, formula: string): string | null {
  const resolved = f.resolveFormula(c, formula);
  if (/@[a-z]/i.test(resolved)) return 'Usa un campo che non esiste';
  try {
    roll(resolved, () => 1);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Formula non valida';
  }
}

export function FreeSheet({ data, editable, onChange, onRoll, compact }: SheetProps<C>) {
  const c = f.normalize(data);
  const set = (patch: Partial<C>) => onChange({ ...c, ...patch });
  const [structure, setStructure] = useState(false);
  const setField = (id: string, patch: Partial<f.FreeField>) => set({ fields: c.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const tracks = c.fields.filter((x) => x.kind === 'track');
  const others = c.fields.filter((x) => x.kind !== 'track');
  return (
    <div className="sheet free">
      <div className="sheet-head">
        <div className="portrait" style={{ width: compact ? 44 : 64, height: compact ? 44 : 64, fontSize: 22 }}>
          {(c.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          {compact ? <b>{c.name}</b> : <h2 className="ellipsis">{c.name || 'Senza nome'}</h2>}
          <div className="muted small ellipsis">{c.concept || 'Sistema libero'}</div>
        </div>
        {editable && (
          <button className={`btn ghost sm ${structure ? 'active' : ''}`} onClick={() => setStructure(!structure)} title="Aggiungi, togli o rinomina campi e tiri">
            <Settings2 size={13} /> {structure ? 'Fine' : 'Struttura'}
          </button>
        )}
      </div>

      {structure && editable ? (
        <StructureEditor c={c} set={set} />
      ) : (
        <>
          {tracks.length > 0 && (
            <div className="stat-row">
              {tracks.map((x) => (
                <div key={x.id} className="stat" title={x.role === 'hp' ? 'Segue i punti ferita del token' : undefined}>
                  <small>{x.label}</small>
                  <div className="row" style={{ gap: 4 }}>
                    {editable && (
                      <button className="btn ghost sm icon" aria-label={`${x.label} meno uno`} onClick={() => setField(x.id, { value: Math.max(0, x.value - 1) })}>
                        <Minus size={11} />
                      </button>
                    )}
                    <b>
                      {x.value}
                      <span className="faint">/{x.max ?? 0}</span>
                    </b>
                    {editable && (
                      <button className="btn ghost sm icon" aria-label={`${x.label} più uno`} onClick={() => setField(x.id, { value: Math.min(x.max ?? 999, x.value + 1) })}>
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {groups(others).map(([g, list]) => (
            <Section key={g || '-'} title={g || 'Scheda'}>
              <div className="free-fields">
                {list.map((x) => (
                  <label key={x.id} className={`free-field ${x.kind === 'text' ? 'wide' : ''}`}>
                    <span>{x.label}</span>
                    {x.kind === 'text' ? (
                      editable ? (
                        <input className="input" value={x.text ?? ''} onChange={(e) => setField(x.id, { text: e.target.value })} />
                      ) : (
                        <b className="small">{x.text || '—'}</b>
                      )
                    ) : editable ? (
                      <input className="input num" type="number" value={x.value} onChange={(e) => setField(x.id, { value: Number(e.target.value) || 0 })} aria-label={x.label} />
                    ) : (
                      <b>{x.value}</b>
                    )}
                  </label>
                ))}
              </div>
            </Section>
          ))}
          {c.rolls.length > 0 && (
            <Section title="Tiri">
              {groups(c.rolls).map(([g, list]) => (
                <div key={g || '-'} className="col" style={{ gap: 4, marginBottom: 6 }}>
                  {g && <span className="faint tiny">{g}</span>}
                  <div className="row wrap" style={{ gap: 4 }}>
                    {list.map((x) => {
                      const formula = f.resolveFormula(c, x.formula);
                      const bad = formulaError(c, x.formula);
                      return (
                        <button key={x.id} className="chip" disabled={!!bad} title={bad ?? `${x.formula} → ${formula}`} onClick={() => onRoll(formula, x.label)}>
                          <Dices size={12} /> {x.label} <span className="faint tiny">{formula}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Section>
          )}
          {(['inventory', 'notes'] as const).map((k) => (
            <Section key={k} title={k === 'inventory' ? 'Equipaggiamento' : 'Note'}>
              {editable ? <textarea className="input" rows={k === 'notes' ? 4 : 3} value={c[k]} onChange={(e) => set({ [k]: e.target.value })} /> : <p className="small pre">{c[k] || '—'}</p>}
            </Section>
          ))}
        </>
      )}
    </div>
  );
}

function StructureEditor({ c, set }: { c: C; set: (patch: Partial<C>) => void }) {
  const field = (id: string, patch: Partial<f.FreeField>) => set({ fields: c.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const rollAt = (id: string, patch: Partial<f.FreeRoll>) => set({ rolls: c.rolls.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Campi">
        <div className="col" style={{ gap: 6 }}>
          {c.fields.map((x) => (
            <div key={x.id} className="free-edit-row">
              <input className="input" value={x.label} onChange={(e) => field(x.id, { label: e.target.value })} aria-label="Nome del campo" placeholder="Nome" />
              <select className="select" value={x.kind} onChange={(e) => field(x.id, { kind: e.target.value as f.FieldKind, max: e.target.value === 'track' ? (x.max ?? 10) : undefined })} aria-label="Tipo">
                <option value="number">Numero</option>
                <option value="track">Tracciato</option>
                <option value="text">Testo</option>
              </select>
              {x.kind === 'track' ? (
                <input className="input num" type="number" value={x.max ?? 10} onChange={(e) => field(x.id, { max: Number(e.target.value) || 0 })} aria-label="Massimo" title="Massimo" />
              ) : (
                <span />
              )}
              <input className="input" value={x.group ?? ''} onChange={(e) => field(x.id, { group: e.target.value || undefined })} aria-label="Gruppo" placeholder="Gruppo" />
              <select className="select" value={x.role ?? ''} onChange={(e) => field(x.id, { role: (e.target.value || undefined) as f.FreeField['role'] })} aria-label="Uso al tavolo" title="Cosa ne fa il tavolo">
                <option value="">—</option>
                <option value="hp">Punti ferita</option>
                <option value="defense">Difesa (CA)</option>
                <option value="initiative">Iniziativa</option>
              </select>
              <button className="btn ghost sm icon" aria-label={`Togli ${x.label}`} onClick={() => set({ fields: c.fields.filter((y) => y.id !== x.id) })}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ fields: [...c.fields, { id: newId(), label: 'Nuovo campo', kind: 'number', value: 0 }] })}>
            <Plus size={12} /> Campo
          </button>
          <span className="faint tiny">I campi numerici si usano nelle formule col loro nome: «Forza» diventa @forza.</span>
        </div>
      </Section>
      <Section title="Tiri">
        <div className="col" style={{ gap: 6 }}>
          {c.rolls.map((x) => {
            const bad = formulaError(c, x.formula);
            return (
              <div key={x.id} className="col" style={{ gap: 2 }}>
                <div className="free-edit-row rolls">
                  <input className="input" value={x.label} onChange={(e) => rollAt(x.id, { label: e.target.value })} aria-label="Nome del tiro" placeholder="Nome" />
                  <input className="input" value={x.formula} onChange={(e) => rollAt(x.id, { formula: e.target.value })} aria-label="Formula" placeholder="1d20+@forza" spellCheck={false} />
                  <input className="input" value={x.group ?? ''} onChange={(e) => rollAt(x.id, { group: e.target.value || undefined })} aria-label="Gruppo del tiro" placeholder="Gruppo" />
                  <button className="btn ghost sm icon" aria-label={`Togli ${x.label}`} onClick={() => set({ rolls: c.rolls.filter((y) => y.id !== x.id) })}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <span className={`tiny ${bad ? 'danger-text' : 'faint'}`}>{bad ?? `→ ${f.resolveFormula(c, x.formula)}`}</span>
              </div>
            );
          })}
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ rolls: [...c.rolls, { id: newId(), label: 'Nuovo tiro', formula: '1d20' }] })}>
            <Plus size={12} /> Tiro
          </button>
          <span className="faint tiny">Formule: 1d20+@forza · 2d6 · (@corpo+@lotta)d6h5 conta i dadi da 5 in su · 3d10s4 quelli fino a 4 · 1d100.</span>
        </div>
      </Section>
    </div>
  );
}

/** Creation: a template, a name, then the sheet itself. */
export function FreeBuilder({ value, onChange }: BuilderProps<C>) {
  const c = f.normalize(value);
  const set = (patch: Partial<C>) => onChange({ ...c, ...patch });
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Da dove partire">
        <div className="option-grid">
          {f.TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`option ${c.template === t.id ? 'on' : ''}`}
              onClick={() => c.template !== t.id && onChange({ ...f.createCharacter(t.id), name: c.name, concept: c.concept, notes: c.notes, inventory: c.inventory })}
            >
              <b>{t.name}</b>
              <small>{t.text}</small>
            </button>
          ))}
        </div>
      </Section>
      <div className="fields">
        <label className="field">
          <span>Nome</span>
          <input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ilda di Roccanera" />
        </label>
        <label className="field">
          <span>Chi è, in una riga</span>
          <input className="input" value={c.concept} onChange={(e) => set({ concept: e.target.value })} placeholder="Cacciatrice di taglie in pensione" />
        </label>
      </div>
      <FreeSheet data={c} editable onChange={(d) => onChange(d)} onRoll={() => undefined} />
    </div>
  );
}

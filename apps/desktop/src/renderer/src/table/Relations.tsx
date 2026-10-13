import { newId, relationLayout, standingLabel, type RelationKind, type RelationNode } from '@thevtt/shared';
import { Eye, EyeOff, Link2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field, Switch } from '../components/ui';
import { useTable } from '../store/table';

const KINDS: { id: RelationKind; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'pg', label: 'Personaggio' },
  { id: 'fazione', label: 'Fazione' },
  { id: 'luogo', label: 'Luogo' },
];

const W = 340;
const H = 320;

/** Who's who: a map of people, factions and places, and what ties them. */
export function RelationsPanel() {
  const state = useTable((s) => s.state);
  const role = useTable((s) => s.role);
  const dispatch = useTable((s) => s.dispatch);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkTo, setLinkTo] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  if (!state) return null;
  const isGm = role === 'gm';
  const rel = state.relations ?? { nodes: {}, links: {} };
  const nodes = Object.values(rel.nodes);
  const links = Object.values(rel.links);
  const at = relationLayout(nodes, W, H);
  const node = selected ? rel.nodes[selected] : undefined;
  const save = (patch: Partial<RelationNode>) => node && dispatch({ type: 'relation.node', node: { ...node, ...patch } });

  const add = () => {
    const id = newId();
    dispatch({ type: 'relation.node', node: { id, name: 'Nuovo PNG', kind: 'png' } });
    setSelected(id);
  };

  return (
    <div className="col relations" style={{ gap: 8 }}>
      {isGm && (
        <button className="btn sm" onClick={add}>
          <Plus size={14} /> Aggiungi persona, fazione o luogo
        </button>
      )}
      {!nodes.length ? (
        <p className="faint small">{isGm ? 'Chi serve chi, chi odia chi, a chi il gruppo deve un favore: costruisci la rete della campagna e mostrane ai giocatori quello che scoprono.' : 'Il master non ha ancora mostrato nessuno.'}</p>
      ) : (
        <svg className="relations-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mappa delle relazioni">
          {links.map((l) => {
            const a = at[l.from];
            const b = at[l.to];
            if (!a || !b) return null;
            return (
              <g key={l.id} className={l.visible ? '' : 'hidden-link'}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                {l.label && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle">
                    {l.label}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = at[n.id]!;
            const square = n.kind === 'fazione' || n.kind === 'luogo';
            return (
              <g key={n.id} className={`rnode ${selected === n.id ? 'on' : ''} ${n.visible ? '' : 'secret'}`} onClick={() => setSelected(n.id === selected ? null : n.id)} role="button" aria-label={n.name}>
                {square ? <rect x={p.x - 14} y={p.y - 14} width={28} height={28} rx={6} fill={n.color} /> : <circle cx={p.x} cy={p.y} r={14} fill={n.color} />}
                <text x={p.x} y={p.y + 28} textAnchor="middle" className="rname">
                  {n.name}
                </text>
                {n.kind === 'fazione' && (
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="rstanding">
                    {(n.standing ?? 0) > 0 ? `+${n.standing}` : (n.standing ?? 0)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {node && !isGm && (
        <div className="relation-card">
          <b>{node.name}</b>
          <span className="faint tiny">
            {KINDS.find((k) => k.id === node.kind)?.label}
            {node.kind === 'fazione' && ` · ${standingLabel(node.standing)}`}
          </span>
          {node.note && <p className="small">{node.note}</p>}
        </div>
      )}
      {node && isGm && (
        <div className="relation-card col" style={{ gap: 6 }} role="group" aria-label={`Scheda di ${node.name}`}>
          <div className="row" style={{ gap: 6 }}>
            <input className="input grow" value={node.name} onChange={(e) => save({ name: e.target.value })} aria-label="Nome" />
            <input type="color" value={node.color} onChange={(e) => save({ color: e.target.value })} aria-label="Colore" />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <select className="select" value={node.kind} onChange={(e) => save({ kind: e.target.value as RelationKind })} aria-label="Tipo">
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <label className="row small" style={{ gap: 6 }}>
              <Switch on={node.visible} onChange={(v) => save({ visible: v })} label="Visibile ai giocatori" />
              {node.visible ? <Eye size={13} /> : <EyeOff size={13} />} {node.visible ? 'La conoscono' : 'Segreta'}
            </label>
          </div>
          {node.kind === 'fazione' && (
            <Field label={`Rapporto col gruppo: ${standingLabel(node.standing)}`}>
              <input type="range" min={-3} max={3} step={1} value={node.standing ?? 0} onChange={(e) => save({ standing: Number(e.target.value) })} aria-label="Rapporto col gruppo" />
            </Field>
          )}
          <textarea className="input" rows={3} value={node.note} onChange={(e) => save({ note: e.target.value })} aria-label="Note" placeholder="Chi è, cosa vuole, cosa sa il gruppo" />
          <b className="small">Legami</b>
          {links
            .filter((l) => l.from === node.id || l.to === node.id)
            .map((l) => {
              const other = rel.nodes[l.from === node.id ? l.to : l.from];
              return (
                <div key={l.id} className="row small" style={{ gap: 6 }}>
                  <span className="grow">
                    {l.from === node.id ? '→' : '←'} {other?.name} {l.label && <i className="faint">({l.label})</i>}
                  </span>
                  <Switch on={l.visible} onChange={(v) => dispatch({ type: 'relation.link', link: { ...l, visible: v } })} label={`Legame con ${other?.name} visibile`} />
                  <button className="btn ghost sm icon" aria-label="Togli legame" onClick={() => dispatch({ type: 'relation.delete', id: l.id })}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          <div className="row" style={{ gap: 4 }}>
            <select className="select" value={linkTo} onChange={(e) => setLinkTo(e.target.value)} aria-label="Collega a">
              <option value="">Collega a…</option>
              {nodes
                .filter((n) => n.id !== node.id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
            <input className="input grow" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="odia, serve, ama…" aria-label="Che legame" />
            <button
              className="btn sm icon"
              aria-label="Aggiungi legame"
              disabled={!linkTo}
              onClick={() => {
                dispatch({ type: 'relation.link', link: { from: node.id, to: linkTo, label: linkLabel.trim() } });
                setLinkTo('');
                setLinkLabel('');
              }}
            >
              <Link2 size={14} />
            </button>
          </div>
          <button
            className="btn ghost sm danger-text"
            onClick={() => {
              dispatch({ type: 'relation.delete', id: node.id });
              setSelected(null);
            }}
          >
            <Trash2 size={13} /> Elimina {node.name}
          </button>
        </div>
      )}
    </div>
  );
}

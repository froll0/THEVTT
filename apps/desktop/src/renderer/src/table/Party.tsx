import { award, canLevelUp, getSystem } from '@thevtt/systems';
import { Award, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTable } from '../store/table';

const FIRST = ['PF', 'CA', 'Percezione passiva', 'CD incantesimi', 'Resilienza', 'Ferite', 'Iniziativa'];
const rank = (label: string) => (FIRST.includes(label) ? FIRST.indexOf(label) : FIRST.length);

/**
 * GM: the whole party at a glance (the numbers that matter at the table, the
 * conditions on their tokens), and experience or a milestone for everyone.
 */
export function PartyOverview() {
  const state = useTable((s) => s.state);
  const dispatch = useTable((s) => s.dispatch);
  const [open, setOpen] = useState(true);
  const [xp, setXp] = useState(0);
  if (!state) return null;
  const system = getSystem(state.systemId);
  const sheets = Object.values(state.players)
    .map((p) => (p.characterId ? state.characters[p.characterId] : undefined))
    .filter((c): c is NonNullable<typeof c> => !!c);
  if (!system || !sheets.length) return null;
  const dnd = state.systemId === 'dnd5e-2024';

  const reward = (r: { xp?: number; milestone?: boolean }) => {
    const lines: string[] = [];
    for (const ch of sheets) {
      const out = award(state.systemId, ch.data, r);
      dispatch({ type: 'character.update', characterId: ch.id, data: out.data });
      lines.push(`${ch.name}: ${out.note}`);
    }
    dispatch({ type: 'card', card: { title: r.milestone ? 'Traguardo raggiunto' : 'Punti esperienza', body: lines.join('\n') } });
    setXp(0);
  };

  return (
    <div className="party col" role="region" aria-label="Il gruppo">
      <button className="ghost-row row" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <b className="small">Il gruppo · {sheets.length}</b>
      </button>
      {open && (
        <>
          <div className="party-grid">
            {sheets.map((ch) => {
              // the numbers, not who they are (the GM knows that)
              const lines = system
                .summary(ch.data)
                .filter((l) => !['Classe', 'Specie', 'Background', 'Stirpe', 'Carriera', 'Concetto', 'Livello'].includes(l.label))
                // what a GM checks first
                .sort((a, b) => rank(a.label) - rank(b.label))
                .slice(0, 5);
              const token = Object.values(state.tokens).find((t) => t.characterId === ch.id && t.sceneId === state.activeSceneId);
              return (
                <div key={ch.id} className="party-card" role="group" aria-label={ch.name}>
                  <div className="row between">
                    <b className="ellipsis">{ch.name}</b>
                    {dnd && canLevelUp(ch.data) && <span className="party-level">sale di livello</span>}
                  </div>
                  {token?.hp && (
                    <div className="party-hp" title="Punti ferita del token">
                      <span style={{ width: `${Math.max(0, Math.min(100, (token.hp.current / Math.max(1, token.hp.max)) * 100))}%` }} />
                      <i>
                        {token.hp.current}/{token.hp.max}
                      </i>
                    </div>
                  )}
                  <div className="party-stats">
                    {lines.map((l) => (
                      <span key={l.label} title={l.label}>
                        <span className="faint">{l.label}</span> {l.value}
                      </span>
                    ))}
                  </div>
                  {!!token?.conditions.length && <span className="tiny warn-text">{token.conditions.join(', ')}</span>}
                </div>
              );
            })}
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            <input className="input" type="number" min={0} step={50} style={{ width: 90 }} value={xp || ''} placeholder="PE" onChange={(e) => setXp(Math.max(0, Number(e.target.value) || 0))} aria-label="Punti esperienza a testa" />
            <button className="btn sm" disabled={!xp} onClick={() => reward({ xp })} title="Gli stessi punti a ogni personaggio al tavolo">
              <Award size={14} /> Assegna a tutti
            </button>
            {(dnd || state.systemId === 'nimble') && (
              <button className="btn ghost sm" onClick={() => reward({ milestone: true })} title="Un livello in più per tutti, senza contare i punti">
                Traguardo: un livello
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

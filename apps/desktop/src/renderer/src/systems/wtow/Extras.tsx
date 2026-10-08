import { describeRoll, roll, successes, type ChatCard, type RollResult } from '@thevtt/shared';
import { warhammer as w } from '@thevtt/systems';
import { Dices, Gem, Landmark, Minus, Plus, Skull, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Section } from '../../components/ui';
import { useApp } from '../../store/app';
import type { SheetTable } from '..';

type C = w.WtowCharacter;
type Set = (patch: Partial<C>) => void;
const { SKILLS, SKILL_INFO } = w;
const rid = () => Math.random().toString(36).slice(2, 10);

/** Roll and read the result: in the table's chat when there, on the sheet (a toast) otherwise. */
export async function rollTest(table: SheetTable | undefined, formula: string, label: string): Promise<RollResult | null> {
  if (table?.rollFor) return table.rollFor(formula, label);
  try {
    const r = roll(formula);
    const hits = successes(r);
    useApp.getState().toast(`${label}: ${hits !== null ? `${hits} ${hits === 1 ? 'successo' : 'successi'}` : r.total}  (${describeRoll(r).replace(/~(\d+)~/g, '($1)')})`);
    return r;
  } catch {
    return null;
  }
}

/** Dice that came up failures in a pool roll (after rerolls). */
export function failuresOf(r: RollResult): number {
  return r.parts.reduce((n, p) => n + (p.type === 'dice' && p.target !== undefined ? p.rolls.filter((d) => !d.success && !d.dropped).length : 0), 0);
}

/* ---------------------------------------------------------- Oggetti magici */

export function MagicItemsSection({ c, editable, set }: { c: C; editable: boolean; set: Set }) {
  const [adding, setAdding] = useState('');
  const setItem = (id: string, patch: Partial<w.WtowMagicItem>) => set({ items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <Section title="Oggetti magici">
      <div className="col" style={{ gap: 6 }}>
        {c.items.map((it) => {
          const def = w.magicItem(it.ref);
          const wielded = c.weapons.some((x) => x.ref === it.ref);
          return (
            <div key={it.id} className="col magic-item" style={{ gap: 2 }}>
              <div className="row" style={{ gap: 6 }}>
                <Gem size={13} className="muted" />
                <b className="small grow">{it.name}</b>
                {def && <span className="faint tiny">{def.kind}</span>}
                {it.charges !== undefined && (
                  <span className="row" style={{ gap: 2 }} title="Cariche o usi">
                    <button className="btn ghost sm icon" aria-label="Una carica in meno" disabled={!editable || it.charges < 1} onClick={() => setItem(it.id, { charges: it.charges! - 1 })}>
                      <Minus size={11} />
                    </button>
                    <b className="small">{it.charges}</b>
                    <button className="btn ghost sm icon" aria-label="Una carica in più" disabled={!editable} onClick={() => setItem(it.id, { charges: it.charges! + 1 })}>
                      <Plus size={11} />
                    </button>
                  </span>
                )}
                {editable && def?.weapon && !wielded && (
                  <button className="btn ghost sm" title="Tra le armi, per attaccare dalla scheda" onClick={() => set({ weapons: [...c.weapons, { ref: def.id, name: def.name }] })}>
                    Impugna
                  </button>
                )}
                {editable && def?.consumable && (
                  <button className="btn ghost sm" title="Si consuma" onClick={() => set({ items: c.items.filter((x) => x.id !== it.id) })}>
                    Usa
                  </button>
                )}
                {editable && (
                  <button
                    className="btn ghost sm icon"
                    aria-label="Togli"
                    onClick={() => set({ items: c.items.filter((x) => x.id !== it.id), weapons: c.weapons.filter((x) => !it.ref || x.ref !== it.ref) })}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              {def && (
                <span className="small muted">
                  {def.weapon ? `${def.weapon.range} · Danno ${def.weapon.damage} · ${def.weapon.hands}M · ` : def.resilience ? `Resilienza ${def.resilience} · ` : ''}
                  {def.traits}
                </span>
              )}
              {editable ? (
                <input className="input" placeholder="Note (da dove viene, chi lo cerca…)" value={it.note ?? ''} onChange={(e) => setItem(it.id, { note: e.target.value || undefined })} />
              ) : (
                it.note && <span className="faint tiny">{it.note}</span>
              )}
            </div>
          );
        })}
        {!c.items.length && <span className="faint small">Nessun oggetto magico.</span>}
        {editable && (
          <div className="row" style={{ gap: 6 }}>
            <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Aggiungi un oggetto magico">
              <option value="">Aggiungi un oggetto magico…</option>
              {w.MAGIC_ITEM_KINDS.map((k) => (
                <optgroup key={k} label={k}>
                  {w.MAGIC_ITEMS.filter((m) => m.kind === k).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">Un altro oggetto…</option>
            </select>
            <button
              className="btn sm"
              disabled={!adding}
              onClick={() => {
                const def = w.magicItem(adding);
                const name = def?.name ?? prompt('Nome dell’oggetto')?.trim();
                if (!name) return;
                set({ items: [...c.items, { id: rid(), ref: def?.id, name, charges: def?.charges }] });
                setAdding('');
              }}
            >
              <Plus size={13} />
            </button>
          </div>
        )}
        <p className="faint tiny">Le armature magiche contano al posto di quella normale se sono migliori; un solo Talismano alla volta funziona.</p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Banca */

export function BankSection({ c, editable, set }: { c: C; editable: boolean; set: Set }) {
  return (
    <Section title="In banca">
      <div className="col" style={{ gap: 4 }}>
        {(['bronzo', 'argento', 'oro'] as const).map((k) => (
          <div key={k} className="row small" style={{ gap: 6 }}>
            <Landmark size={12} className="muted" />
            <b style={{ width: 64 }}>{w.STATUS_LABEL[k]}</b>
            <b>{c.bank[k]}</b>
            {editable && (
              <button
                className="btn ghost sm"
                disabled={c.bank[k] < 1}
                title="Ritirare non richiede Prove"
                onClick={() => set({ bank: { ...c.bank, [k]: c.bank[k] - 1 }, coins: { ...c.coins, [k]: { ...c.coins[k], owned: c.coins[k].owned + 1 } } })}
              >
                Ritira una
              </button>
            )}
          </div>
        ))}
        <span className="faint tiny">Si deposita con l’Attività Visitare la Banca dell’Intermezzo.</span>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- Cavalcatura */

export function MountSection({ c, editable, set }: { c: C; editable: boolean; set: Set }) {
  const m = w.mountOf(c);
  return (
    <Section title="Cavalcatura">
      <select className="select" disabled={!editable} value={c.mount ?? ''} onChange={(e) => set({ mount: e.target.value || null })} aria-label="Cavalcatura">
        <option value="">A piedi</option>
        {w.MOUNTS.map((x) => (
          <option key={x.id} value={x.id}>
            In sella: {x.name}
          </option>
        ))}
      </select>
      {m && <p className="small muted">{m.text} In sella cavaliere e cavalcatura sono un solo combattente; smontare fa parte del movimento.</p>}
    </Section>
  );
}

/* ------------------------------------------------------------- Corruzione */

export function CorruptionTab({ c, editable, set, onTest }: { c: C; editable: boolean; set: Set; onTest: (label: string, dice: number, target: number) => void }) {
  const cor = c.corruption;
  const setCor = (patch: Partial<C['corruption']>) => set({ corruption: { ...cor, ...patch } });
  const path = w.CORRUPTION_PATHS.find((p) => p.id === cor.path);
  const will = w.pool(c, 'volonta');
  const [gift, setGift] = useState('');
  const stageText = path && cor.stage !== 'puro' ? (path[cor.stage as 'vulnerabile' | 'offuscato' | 'macchiato' | 'dannato'] as string) : null;
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Stadio">
        <div className="row wrap" style={{ gap: 4 }}>
          {w.CORRUPTION_STAGES.map((s) => (
            <button key={s.id} className={`chip sm ${cor.stage === s.id ? 'on' : ''}`} disabled={!editable} onClick={() => setCor({ stage: s.id })}>
              {s.id !== 'puro' && <Skull size={11} />} {s.name}
            </button>
          ))}
        </div>
        <p className="small muted">{w.CORRUPTION_STAGES.find((s) => s.id === cor.stage)?.text}</p>
      </Section>
      <Section title="Esposizione al Caos">
        <p className="small muted">Alla fine di un giorno di esposizione, una Prova di Volontà ({will.dice}d/{will.target}); fallendo il master sceglie Esausto, Distratto o Assordato e si diventa Vulnerabili.</p>
        <div className="rows small">
          {w.EXPOSURES.map((e, i) => (
            <div key={e.name} className="r">
              <b style={{ width: 92 }}>{e.name}</b>
              <span className="muted grow">{e.examples}</span>
              {i < 3 ? (
                <button className="btn ghost sm" onClick={() => onTest(`Volontà contro il Caos (${e.name})`, will.dice - i, will.target)}>
                  <Dices size={12} /> {e.penalty}
                </button>
              ) : (
                <span className="faint tiny">{e.penalty}</span>
              )}
            </div>
          ))}
        </div>
      </Section>
      {cor.stage !== 'puro' && (
        <Section title="Sentiero verso la Corruzione">
          <select className="select" disabled={!editable} value={cor.path ?? ''} onChange={(e) => setCor({ path: e.target.value || null })} aria-label="Sentiero">
            <option value="">Lo sceglie il master…</option>
            {w.CORRUPTION_PATHS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {path && (
            <div className="col" style={{ gap: 6, marginTop: 6 }}>
              <span className="faint tiny">Vittime favorite: {path.victims}</span>
              {stageText && <p className="small">{stageText}</p>}
              {(cor.stage === 'offuscato' || cor.stage === 'macchiato' || cor.stage === 'dannato') && (
                <div className="col" style={{ gap: 4 }}>
                  <span className="small muted">Doni</span>
                  <div className="row wrap" style={{ gap: 4 }}>
                    {path.gifts.map((g) => (
                      <button
                        key={g.name}
                        className={`chip sm ${cor.gifts.includes(g.name) ? 'on' : ''}`}
                        disabled={!editable}
                        title={g.text}
                        onClick={() => setCor({ gifts: cor.gifts.includes(g.name) ? cor.gifts.filter((x) => x !== g.name) : [...cor.gifts, g.name] })}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
            {cor.gifts
              .filter((g) => !path?.gifts.some((x) => x.name === g))
              .map((g) => (
                <span key={g} className="chip sm on">
                  {g}
                  {editable && (
                    <button className="btn ghost sm icon" aria-label={`Togli ${g}`} onClick={() => setCor({ gifts: cor.gifts.filter((x) => x !== g) })}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </span>
              ))}
          </div>
          {editable && (
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <input className="input grow" placeholder="Un altro dono o mutazione" value={gift} onChange={(e) => setGift(e.target.value)} />
              <button
                className="btn sm icon"
                aria-label="Aggiungi il dono"
                disabled={!gift.trim()}
                onClick={() => {
                  setCor({ gifts: [...cor.gifts, gift.trim()] });
                  setGift('');
                }}
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </Section>
      )}
      <Section title="Note del master">
        {editable ? <textarea className="input" rows={3} value={cor.notes} onChange={(e) => setCor({ notes: e.target.value })} /> : <p className="small pre">{cor.notes || '—'}</p>}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------- Intermezzo */

interface Done {
  activity: string;
  skill: string;
  successes: number;
  failures: number;
  text: string;
}

export function IntermezzoTab({ c, editable, set, table, onShare }: { c: C; editable: boolean; set: Set; table?: SheetTable; onShare?: (card: ChatCard) => void }) {
  const allowed = w.activitiesAllowed(c);
  const [activity, setActivity] = useState(w.ACTIVITIES[0]!.id);
  const [skill, setSkill] = useState<w.SkillId>('memoria');
  const [bonus, setBonus] = useState(0);
  const [project, setProject] = useState('');
  const [done, setDone] = useState<Done[]>([]);
  const [overtime, setOvertime] = useState(0);
  const [busy, setBusy] = useState(false);
  const act = w.ACTIVITIES.find((a) => a.id === activity)!;
  const left = allowed - done.length;
  const status = w.statusOf(c);
  const skills = act.skills.length ? [...act.skills, ...SKILLS.filter((s) => !act.skills.includes(s))] : SKILLS;
  const chosen = skills.includes(skill) ? skill : skills[0]!;
  const p = w.pool(c, chosen);
  const projectFor = (name: string) => c.projects.find((x) => x.name.toLowerCase() === name.toLowerCase());
  const need = act.id === 'creare-avere' ? (status === 'oro' ? 8 : status === 'argento' ? 4 : 2) : (act.extended ?? 4);

  const run = async () => {
    setBusy(true);
    const formula = w.testFormula(p.dice, p.target, { mod: bonus });
    const r = await rollTest(table, formula, `${act.name} (${SKILL_INFO[chosen].name})`);
    setBusy(false);
    if (!r) return;
    const got = successes(r) ?? 0;
    const failures = failuresOf(r) + (act.effect === 'train' ? 1 : 0);
    let next = w.activityFailures(c, chosen, failures);
    let text = got > 0 ? 'Riuscita.' : 'Fallita.';
    if (act.effect === 'overtime') {
      setOvertime(overtime + (got > 0 ? 2 : 1));
      text = got > 0 ? '+2 Monete per la prossima avventura.' : '+1 Moneta per la prossima avventura.';
    }
    if (act.effect === 'heal' && got > 0) {
      next = w.restAndRecover(next);
      text = 'Guarisce una Ferita e tutte le Ferite Purulente.';
    }
    if (act.effect === 'bank') {
      const m = next.coins[status];
      const deposit = Math.min(got, Math.max(0, m.owned - m.spent));
      next = { ...next, coins: { ...next.coins, [status]: { ...m, spent: m.spent + deposit } }, bank: { ...next.bank, [status]: next.bank[status] + deposit } };
      text = `${deposit} Monete ${w.STATUS_LABEL[status]} in banca${got >= 3 ? ' (con 3 successi anche una di Status superiore, se ce l’hai)' : ''}; il resto se ne va in commissioni.`;
    }
    if (act.extended || act.id === 'creare-avere' || act.id === 'investire') {
      const name = (project.trim() || act.name).slice(0, 60);
      const old = projectFor(name);
      const have = (old?.have ?? 0) + got;
      const req = old?.need ?? need;
      const rest = next.projects.filter((x) => x !== old && x.name.toLowerCase() !== name.toLowerCase());
      if (have >= req) {
        next = { ...next, projects: rest };
        text = `«${name}» completata (${have}/${req}).`;
        if (act.effect === 'fate') next = { ...next, fate: { ...next.fate, burned: Math.max(0, next.fate.burned - 1) } };
        if (act.effect === 'lore' && project.trim() && !next.lore.includes(project.trim())) next = { ...next, lore: [...next.lore, project.trim()] };
      } else {
        next = { ...next, projects: [...rest, { id: old?.id ?? rid(), name, need: req, have }] };
        text = `«${name}»: ${have}/${req} successi.`;
      }
      if (act.effect === 'fate') next = { ...next, fate: { ...next.fate, spent: next.fate.spent + 1 } };
    }
    const rose = w.skill(next, chosen) > w.skill(c, chosen);
    if (rose) text += ` ${SKILL_INFO[chosen].name} sale a ${w.skill(next, chosen)}!`;
    set(next);
    setDone([...done, { activity: act.name, skill: SKILL_INFO[chosen].name, successes: got, failures, text }]);
    setBonus(0);
  };

  const rollEvent = async () => {
    const r = await rollTest(table, '1d100', 'Evento di Talagaad');
    if (!r) return;
    const e = w.eventFor(r.total);
    const card: ChatCard = { title: 'Evento di Talagaad', subtitle: `d100: ${r.total}`, body: `${e.text}\nContatti coinvolti: ${e.contacts.join(', ')}` };
    if (onShare) onShare(card);
    else useApp.getState().toast(e.text.slice(0, 160));
  };

  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="small">
          Sessioni dall’ultimo Intermezzo: <b>{c.sessions}</b>
        </span>
        {editable && (
          <span className="row" style={{ gap: 2 }}>
            <button className="btn ghost sm icon" aria-label="Una sessione in meno" disabled={c.sessions < 1} onClick={() => set({ sessions: c.sessions - 1 })}>
              <Minus size={11} />
            </button>
            <button className="btn ghost sm icon" aria-label="Una sessione in più" onClick={() => set({ sessions: c.sessions + 1 })}>
              <Plus size={11} />
            </button>
          </span>
        )}
        <span className="faint small">
          Attività: {done.length}/{allowed}
        </span>
        <button className="btn ghost sm" onClick={rollEvent} title="La tabella degli Eventi di Talagaad (Guida del Gamemaster)">
          <Dices size={12} /> Evento di Talagaad
        </button>
      </div>

      {editable && (
        <Section title="Attività">
          <div className="col" style={{ gap: 6 }}>
            <select className="select" value={activity} onChange={(e) => setActivity(e.target.value)} aria-label="Attività">
              {w.ACTIVITIES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.extended ? ` (Prolungata, ${a.extended})` : ''}
                </option>
              ))}
            </select>
            <p className="small muted">{act.text}</p>
            <div className="row wrap" style={{ gap: 6 }}>
              <select className="select grow" value={chosen} onChange={(e) => setSkill(e.target.value as w.SkillId)} aria-label="Abilità">
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {SKILL_INFO[s].name} {w.pool(c, s).dice}d/{w.pool(c, s).target}
                    {act.skills.includes(s) ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <span className="row small" style={{ gap: 2 }} title="Dadi bonus (una bottega, un Contatto, un alleato che Supporta…)">
                <button className="btn ghost sm icon" aria-label="Un dado bonus in meno" onClick={() => setBonus(Math.max(0, bonus - 1))}>
                  <Minus size={11} />
                </button>
                <b>+{bonus}d</b>
                <button className="btn ghost sm icon" aria-label="Un dado bonus in più" onClick={() => setBonus(Math.min(p.dice, bonus + 1))}>
                  <Plus size={11} />
                </button>
              </span>
            </div>
            {(act.extended || act.id === 'creare-avere' || act.id === 'investire') && (
              <input
                className="input"
                placeholder={act.effect === 'lore' ? 'Il Sapere da studiare' : act.id === 'creare-avere' ? 'L’avere da creare' : 'Su cosa (un incantesimo, un affare…)'}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                list="wtow-projects"
              />
            )}
            <datalist id="wtow-projects">
              {c.projects.map((x) => (
                <option key={x.id} value={x.name} />
              ))}
            </datalist>
            <button className="btn" disabled={busy || left < 1} onClick={() => void run()}>
              <Dices size={14} /> {left < 1 ? 'Attività finite per questo Intermezzo' : `Tira ${w.testFormula(p.dice, p.target, { mod: bonus })}`}
            </button>
            <span className="faint tiny">Ogni fallimento si segna sull’Abilità: superato il suo valore, sale di 1 (fino a 6).</span>
          </div>
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Fatto in questo Intermezzo">
          <div className="rows small">
            {done.map((d, i) => (
              <div key={i} className="r">
                <b style={{ width: 150 }}>{d.activity}</b>
                <span className="muted grow">
                  {d.skill}: {d.successes} successi, {d.failures} fallimenti segnati. {d.text}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {c.projects.length > 0 && (
        <Section title="Prove Prolungate in corso">
          <div className="rows small">
            {c.projects.map((x) => (
              <div key={x.id} className="r">
                <span className="grow">{x.name}</span>
                <b>
                  {x.have}/{x.need}
                </b>
                {editable && (
                  <button className="btn ghost sm icon" aria-label={`Abbandona ${x.name}`} onClick={() => set({ projects: c.projects.filter((y) => y.id !== x.id) })}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {editable && (
        <Section title="Rivedere le finanze">
          <p className="small muted">
            Si comincia la prossima avventura con tre Monete {w.STATUS_LABEL[status]}
            {overtime ? ` più ${overtime} dagli straordinari` : ''}; quelle non spese o depositate vanno perse.
          </p>
          <button
            className="btn sm"
            onClick={() => {
              set(w.resetCoins(c, overtime));
              setDone([]);
              setOvertime(0);
            }}
          >
            Chiudi l’Intermezzo
          </button>
        </Section>
      )}
    </div>
  );
}

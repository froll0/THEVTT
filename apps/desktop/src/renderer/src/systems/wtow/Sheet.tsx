import { successes, type ChatCard } from '@thevtt/shared';
import { warhammer as w } from '@thevtt/systems';
import { BookOpen, Dices, Flame, HeartCrack, MessageSquareShare, Minus, Plus, Shield, Sparkles, Sword, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Modal, Section, Switch } from '../../components/ui';
import type { SheetProps, SheetTable } from '..';
import { BankSection, CorruptionTab, IntermezzoTab, MagicItemsSection, MountSection, rollTest } from './Extras';

type C = w.WtowCharacter;
type Set = (patch: Partial<C>) => void;
type Roll = (formula: string, label: string) => void;
const { CHARACTERISTICS, CHAR_INFO, SKILLS, SKILL_INFO } = w;

/** A test waiting for its options: bonus dice, Gloriosa, Tetra. */
interface PendingTest {
  label: string;
  dice: number;
  target: number;
  /** a magic test: nines are kept */
  magic?: boolean;
  /** attack: what happens on a hit */
  attack?: w.AttackProfile;
  /** the weapon on the sheet (to mark it as fired) */
  weapon?: number;
}

const rid = () => Math.random().toString(36).slice(2, 10);

export function WtowSheet({ data, editable, onChange, onRoll, onShare, compact, table }: SheetProps<C> & { compact?: boolean }) {
  const c = w.normalize(data);
  const set: Set = (patch) => onChange({ ...c, ...patch });
  const [tab, setTab] = useState<'tests' | 'combat' | 'talents' | 'magic' | 'faith' | 'gear' | 'notes' | 'chaos' | 'downtime' | 'advance'>('tests');
  const [pending, setPending] = useState<PendingTest | null>(null);
  const mage = w.mageLevel(c);
  const faith = w.faithRank(c);
  const prot = w.protection(c).best;
  const conditions = table?.token ? table.token.conditions : c.conditions;
  const setConditions = (list: string[]) => (table?.token ? table.token.setConditions(list) : set({ conditions: list }));
  const exhausted = conditions.includes('Esausto');
  const distracted = conditions.includes('Distratto');
  const blinded = conditions.includes('Accecato');

  const test = (label: string, dice: number, target: number, extra: Partial<PendingTest> = {}) => setPending({ label, dice, target, ...extra });

  const tabs = [
    { id: 'tests', label: 'Prove' },
    { id: 'combat', label: 'Combattimento' },
    { id: 'talents', label: 'Talenti e Saperi' },
    { id: 'magic', label: 'Magia', show: mage > 0 || c.talents.some((t) => t.id === 'tocco-dei-venti') },
    { id: 'faith', label: 'Fede', show: faith > 0 },
    { id: 'gear', label: 'Averi' },
    { id: 'notes', label: 'Note' },
    { id: 'downtime', label: 'Intermezzo' },
    { id: 'chaos', label: 'Corruzione' },
    { id: 'advance', label: 'PE', show: editable },
  ] as const;

  return (
    <div className="sheet wtow">
      <div className="sheet-head">
        <div className="portrait" style={{ width: compact ? 44 : 64, height: compact ? 44 : 64, fontSize: 22 }}>
          {(c.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          {compact ? <b>{c.name}</b> : <h2 className="ellipsis">{c.name || 'Senza nome'}</h2>}
          <div className="muted small ellipsis">
            {w.headline(c)} · Status {w.statusLabel(c)}
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat" title="Resistenza più armatura: i Danni oltre questo valore causano una Ferita">
          <small>
            <Shield size={10} /> Resilienza
          </small>
          <b>{w.resilience(c)}</b>
        </div>
        <button className="stat" title="La riserva con cui ti opponi agli attacchi" onClick={() => test(`Protezione (${prot.label})`, prot.dice, prot.target)}>
          <small>Protezione</small>
          <b className="small">
            {prot.label} {prot.dice}d/{prot.target}
          </b>
        </button>
        <div className="stat">
          <small>Fato</small>
          <b>
            {w.fateLeft(c)}
            <span className="faint">/{w.fateMax(c)}</span>
          </b>
        </div>
        <div className="stat">
          <small>Ferite</small>
          <b>{c.wounds.length}</b>
        </div>
        <div className="stat" title={w.mountOf(c) ? `In sella: ${w.mountOf(c)!.name}` : undefined}>
          <small>Velocità</small>
          <b className="small">{w.speedOf(c)}</b>
        </div>
        {!compact && (
          <div className="stat">
            <small>PE</small>
            <b>{w.xpLeft(c)}</b>
          </div>
        )}
      </div>

      {editable && (
        <div className="row wrap small" style={{ gap: 6 }}>
          <span className="muted">Fato:</span>
          <button className="btn ghost sm" disabled={w.fateLeft(c) < 1} onClick={() => set({ fate: { ...c.fate, spent: c.fate.spent + 1 } })} title="Spendi: Prova Gloriosa, seconda Azione o copertura in Ritirata">
            Spendi
          </button>
          <button
            className="btn ghost sm"
            disabled={w.fateMax(c) < 1}
            title="Brucia (per sempre): Successo Assoluto, Colpo di Striscio o Ultima Resistenza"
            onClick={() => confirm('Bruciare un punto Fato? Il massimo cala di 1 per sempre.') && set({ fate: { burned: c.fate.burned + 1, spent: Math.max(0, c.fate.spent - 1) } })}
          >
            <Flame size={12} /> Brucia
          </button>
          <button className="btn ghost sm" disabled={c.fate.spent === 0} onClick={() => set({ fate: { ...c.fate, spent: 0 } })} title="All’inizio della sessione il Fato speso torna">
            Nuova sessione
          </button>
        </div>
      )}

      <ConditionBar conditions={conditions} editable={editable} onChange={setConditions} />

      <div className="sheet-tabs">
        {tabs
          .filter((t) => !('show' in t) || t.show)
          .map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
      </div>

      {tab === 'tests' && <TestsTab c={c} editable={editable} set={set} onTest={test} />}
      {tab === 'combat' && <CombatTab c={c} editable={editable} set={set} onTest={test} onRoll={onRoll} table={table} />}
      {tab === 'talents' && <TalentsTab c={c} onShare={onShare} />}
      {tab === 'magic' && <MagicTab c={c} editable={editable} set={set} onRoll={onRoll} onShare={onShare} table={table} onTest={test} />}
      {tab === 'faith' && <FaithTab c={c} editable={editable} set={set} onShare={onShare} onTest={test} />}
      {tab === 'gear' && <GearTab c={c} editable={editable} set={set} />}
      {tab === 'notes' && <NotesTab c={c} editable={editable} set={set} />}
      {tab === 'downtime' && <IntermezzoTab c={c} editable={editable} set={set} table={table} onShare={onShare} />}
      {tab === 'chaos' && <CorruptionTab c={c} editable={editable} set={set} onTest={test} />}
      {tab === 'advance' && editable && <AdvanceTab c={c} set={set} />}

      {pending && (
        <TestModal
          test={pending}
          state={{ exhausted, distracted, blinded, fate: editable ? w.fateLeft(c) : 0 }}
          onClose={() => setPending(null)}
          onRoll={(formula, label, o) => {
            // a gun that needs reloading is empty after the shot
            const fired = pending.weapon !== undefined && c.weapons[pending.weapon] && w.reloadNeed(c.weapons[pending.weapon]!) > 0;
            const patch: Partial<C> = {};
            if (o.fate) patch.fate = { ...c.fate, spent: c.fate.spent + 1 };
            if (fired) patch.weapons = c.weapons.map((x, i) => (i === pending.weapon ? { ...x, loaded: false, reloading: undefined } : x));
            if (Object.keys(patch).length) set(patch);
            if (pending.attack && table?.poolAttack) {
              const a = pending.attack;
              const ranged = a.skill === 'tiro' || a.skill === 'lancio';
              // the formula already holds the dice after bonuses and the floor of one die
              const m = /^(\d+)d10s(\d+)/.exec(formula);
              const sent = table.poolAttack({
                name: a.name,
                dice: Number(m?.[1] ?? 1),
                target: Number(m?.[2] ?? 1),
                damage: a.staggerOnly ? null : a.damage,
                ranged,
                ignoresArmour: a.ignoresArmour,
                vsArmoured: a.vsArmoured,
                glorious: o.glorious,
                grim: o.grim,
                unopposed: o.unopposed,
                charge: !ranged && o.charge,
                optimal: ranged ? a.range : undefined,
              });
              if (sent) return setPending(null);
            }
            onRoll(formula, label);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Condizioni */

function ConditionBar({ conditions, editable, onChange }: { conditions: string[]; editable: boolean; onChange: (c: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="row wrap" style={{ gap: 4 }}>
      {conditions.map((k) => (
        <span key={k} className="chip sm on" title={w.CONDITION_INFO[k] ?? k}>
          {k}
          {editable && (
            <button className="btn ghost icon" style={{ width: 16, height: 16 }} aria-label={`Togli ${k}`} onClick={() => onChange(conditions.filter((x) => x !== k))}>
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {editable && (
        <button className="chip sm" onClick={() => setOpen(!open)}>
          <Plus size={11} /> Condizione
        </button>
      )}
      {open && (
        <div className="row wrap" style={{ gap: 4, width: '100%' }}>
          {w.CONDITIONS.filter((k) => !conditions.includes(k)).map((k) => (
            <button key={k} className="chip sm" title={w.CONDITION_INFO[k]} onClick={() => (onChange([...conditions, k]), setOpen(false))}>
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Prove */

function TestModal({
  test,
  state,
  onClose,
  onRoll,
}: {
  test: PendingTest;
  state: { exhausted: boolean; distracted: boolean; blinded: boolean; fate: number };
  onClose: () => void;
  onRoll: (formula: string, label: string, o: { mod: number; glorious: boolean; grim: boolean; fate: boolean; unopposed: boolean; charge: boolean }) => void;
}) {
  const [bonus, setBonus] = useState(0);
  const [penalty, setPenalty] = useState(state.distracted ? 1 : 0);
  const [glorious, setGlorious] = useState(false);
  const [fate, setFate] = useState(false);
  const [grim, setGrim] = useState(state.blinded);
  const [unopposed, setUnopposed] = useState(false);
  const [charge, setCharge] = useState(false);
  const melee = !!test.attack && test.attack.skill !== 'tiro' && test.attack.skill !== 'lancio';
  // Esausto: no bonus dice, no Gloriosa unless Fato pays for it
  const mod = (state.exhausted ? 0 : bonus) - penalty;
  const isGlorious = (glorious && !state.exhausted) || fate;
  const formula = w.testFormula(test.dice, test.target, { mod, glorious: isGlorious, grim, magic: test.magic });
  const label = `${test.label}${isGlorious && !grim ? ' (Gloriosa)' : ''}${grim && !isGlorious ? ' (Tetra)' : ''}`;
  const stepper = (v: number, setV: (n: number) => void, max: number) => (
    <span className="row" style={{ gap: 4 }}>
      <button className="btn ghost sm icon" onClick={() => setV(Math.max(0, v - 1))} aria-label="meno">
        <Minus size={12} />
      </button>
      <b style={{ width: 18, textAlign: 'center' }}>{v}</b>
      <button className="btn ghost sm icon" onClick={() => setV(Math.min(max, v + 1))} aria-label="più">
        <Plus size={12} />
      </button>
    </span>
  );
  return (
    <Modal
      title={test.label}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn" onClick={() => onRoll(formula, label, { mod, glorious: isGlorious, grim, fate, unopposed, charge })}>
            <Dices size={14} /> {test.attack ? 'Attacca' : 'Tira'} {formula}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <p className="small muted">
          {test.dice} dadi, successo con {test.target} o meno. 1 successo è Marginale, 2 un Successo, 3+ un Successo Totale.
          {test.magic ? ' I 9 vanno nella Riserva degli Incidenti Magici e non si ritirano.' : ''}
        </p>
        <div className="row between small">
          <span>Dadi bonus (Saperi, Aiuto, Talenti…)</span>
          {stepper(bonus, setBonus, Math.max(0, test.dice))}
        </div>
        {state.exhausted && <span className="faint tiny">Esausto: niente dadi bonus.</span>}
        <div className="row between small">
          <span>Penalità (Difficile -1d, Ardua -2d{state.distracted ? ', Distratto' : ''})</span>
          {stepper(penalty, setPenalty, 6)}
        </div>
        <label className="row between small">
          <span>Gloriosa: ritiri i fallimenti</span>
          <Switch on={glorious} onChange={setGlorious} label="Gloriosa" />
        </label>
        {state.fate > 0 && (
          <label className="row between small">
            <span>Spendi Fato per renderla Gloriosa</span>
            <Switch on={fate} onChange={setFate} label="Spendi Fato" />
          </label>
        )}
        <label className="row between small">
          <span>Tetra: ritiri i successi{state.blinded ? ' (Accecato)' : ''}</span>
          <Switch on={grim} onChange={setGrim} label="Tetra" />
        </label>
        {test.attack && (
          <>
            <label className="row between small">
              <span>Senza opposizione (sorpresa, bersaglio inerme)</span>
              <Switch on={unopposed} onChange={setUnopposed} label="Senza opposizione" />
            </label>
            {melee && (
              <label className="row between small">
                <span>In Carica (+1d)</span>
                <Switch on={charge} onChange={setCharge} label="In Carica" />
              </label>
            )}
            <span className="faint tiny">
              Con un bersaglio segnato sulla mappa il tavolo tira anche la sua Protezione e applica Danni, Barcollante e Ferite. Aggiunge da solo +1d per la Carica, la superiorità
              numerica nella Zona e la posizione sopraelevata (o il bersaglio Prono); a distanza -1d fuori Portata Ottimale, contro la copertura o un bersaglio Prono.
            </span>
          </>
        )}
      </div>
    </Modal>
  );
}

function TestsTab({ c, editable, set, onTest }: { c: C; editable: boolean; set: Set; onTest: (label: string, dice: number, target: number) => void }) {
  return (
    <div className="wtow-chars">
      {CHARACTERISTICS.map((k) => {
        const primary = w.getCareer(c)?.primary.includes(k);
        return (
          <div key={k} className="wtow-char">
            <div className="row between">
              <span className="small">
                <b>{CHAR_INFO[k].short}</b> <span className="muted">{CHAR_INFO[k].name}</span>
                {primary && (
                  <span className="badge" style={{ marginLeft: 4 }} title="Caratteristica Primaria della Carriera">
                    P
                  </span>
                )}
              </span>
              <b className="wtow-char-val">{w.characteristic(c, k)}</b>
            </div>
            {SKILLS.filter((s) => SKILL_INFO[s].char === k).map((s) => {
              const p = w.pool(c, s);
              const marks = c.marks[s] ?? 0;
              return (
                <div key={s} className="row" style={{ gap: 6 }}>
                  <button className="r grow wtow-skill" title={SKILL_INFO[s].text} onClick={() => onTest(SKILL_INFO[s].name, p.dice, p.target)}>
                    <span className="grow ellipsis">{SKILL_INFO[s].name}</span>
                    <span className="faint tiny">
                      {p.dice}d/{p.target}
                    </span>
                    <b>{w.skill(c, s)}</b>
                  </button>
                  <span className="pips" title="Fallimenti segnati negli Intermezzi: superato il valore dell’Abilità, sale di 1">
                    {Array.from({ length: w.skill(c, s) + 1 }, (_, i) => (
                      <button
                        key={i}
                        disabled={!editable}
                        className={`pip sm ${marks > i ? 'ko' : ''}`}
                        onClick={() => (i === marks ? set(w.markFailure(c, s)) : set({ marks: { ...c.marks, [s]: i < marks ? i : i + 1 } }))}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- Combattimento */

function CombatTab({ c, editable, set, onTest, onRoll, table }: { c: C; editable: boolean; set: Set; onTest: (l: string, d: number, t: number, x?: Partial<PendingTest>) => void; onRoll: Roll; table?: SheetTable }) {
  const [adding, setAdding] = useState('');
  const athletics = w.protection(c).athletics;
  const defence = w.protection(c).defence;
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Armi">
        <div className="rows">
          {c.weapons.map((wp, i) => {
            const a = w.attackProfile(c, wp);
            const reload = w.reloadNeed(wp);
            const empty = reload > 0 && wp.loaded === false;
            return (
              <div key={i} className="r">
                <button
                  className="btn ghost sm grow"
                  style={{ justifyContent: 'flex-start' }}
                  disabled={empty}
                  onClick={() => onTest(a.name, a.pool.dice, a.pool.target, { attack: a, weapon: i })}
                  title={empty ? 'Scarica: va ricaricata' : a.traits}
                >
                  <Sword size={13} />
                  <span className="grow ellipsis" style={{ textAlign: 'left' }}>
                    {a.name}
                    <span className="faint tiny"> · {a.range}</span>
                  </span>
                  <span className="faint tiny">
                    {SKILL_INFO[a.skill].name} {a.pool.dice}d/{a.pool.target}
                  </span>
                  <b>{a.staggerOnly ? 'Barc.' : a.damage == null ? '—' : `D ${a.damage}`}</b>
                </button>
                {empty && (
                  <button
                    className="btn sm"
                    disabled={!editable}
                    title={`Prova Prolungata di Destrezza: ${reload} successi, una Prova per Azione`}
                    onClick={async () => {
                      const d = w.pool(c, 'destrezza');
                      const r = await rollTest(table, w.testFormula(d.dice, d.target), `Ricarica ${a.name}`);
                      if (!r) return;
                      const have = (wp.reloading ?? 0) + (successes(r) ?? 0);
                      set({ weapons: c.weapons.map((x, j) => (j === i ? (have >= reload ? { ...x, loaded: undefined, reloading: undefined } : { ...x, reloading: have }) : x)) });
                    }}
                  >
                    Ricarica {wp.reloading ?? 0}/{reload}
                  </button>
                )}
                {editable && (
                  <button className="btn ghost sm icon" aria-label="Togli" onClick={() => set({ weapons: c.weapons.filter((_, j) => j !== i) })}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {!c.weapons.length && <span className="faint small">Nessuna arma: il pugno attacca con Muscoli e fa Barcollare.</span>}
        </div>
        {editable && (
          <div className="row" style={{ marginTop: 6 }}>
            <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Aggiungi un’arma…</option>
              {(['mischia', 'distanza', 'lancio'] as const).map((k) => (
                <optgroup key={k} label={{ mischia: 'Da mischia', distanza: 'A distanza', lancio: 'Da lancio' }[k]}>
                  {w.WEAPONS.filter((x) => x.kind === k).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.damage ?? '—'} · {x.range}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className="btn sm"
              disabled={!adding}
              onClick={() => {
                const def = w.WEAPONS.find((x) => x.id === adding)!;
                set({ weapons: [...c.weapons, { ref: def.id, name: def.name }] });
                setAdding('');
              }}
            >
              <Plus size={13} />
            </button>
          </div>
        )}
        <p className="faint tiny">
          Clic su un’arma: con un bersaglio segnato (Ctrl+clic) il tavolo risolve l’attacco contrapposto. Danni = arma + successi in più; sopra la Resilienza è una Ferita, altrimenti
          Barcollante. Un attacco in mischia fallito ti rende Barcollante.
        </p>
      </Section>

      <Section title="Difesa">
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={() => onTest('Atletica (schivare)', athletics.dice, athletics.target)}>
            Atletica {athletics.dice}d/{athletics.target}
          </button>
          <button className="btn ghost sm" onClick={() => onTest('Difesa (parare)', defence.dice, defence.target)}>
            Difesa {defence.dice}d/{defence.target}
          </button>
          <span className="faint tiny">Resilienza {w.resilience(c)} · senza armatura {w.characteristic(c, 'r')}</span>
        </div>
      </Section>

      <MountSection c={c} editable={editable} set={set} />

      <WoundsSection c={c} editable={editable} set={set} onRoll={onRoll} table={table} />

      <Section title="Azioni in combattimento">
        <div className="rows small">
          {[
            ['Aiutare', 'Una Prova: ogni successo dà +1d all’alleato.'],
            ['Attaccare', 'Mischia, Tiro, Lancio o Muscoli contro la Protezione del bersaglio.'],
            ['Improvvisare', 'Qualunque altra cosa, con la Prova adatta.'],
            ['Manovrare', 'Scattare (2 Zone), Caricare (+1d in mischia), Muoversi Silenziosamente o con Cautela.'],
            ['Mirare', 'Prova di Percezione: ogni successo +1d al prossimo tiro.'],
            ['Recuperare', 'Togli Barcollante o Prono, oppure una Prova per un’altra Condizione o per medicare una Ferita.'],
          ].map(([k, v]) => (
            <div key={k} className="r">
              <b style={{ width: 92 }}>{k}</b>
              <span className="muted">{v}</span>
            </div>
          ))}
          <div className="r">
            <span className="faint tiny">In più un movimento gratuito di una Zona (due se Veloce). Spendendo Fato una seconda Azione.</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function WoundsSection({ c, editable, set, onRoll, table }: { c: C; editable: boolean; set: Set; onRoll: Roll; table?: SheetTable }) {
  const [custom, setCustom] = useState('');
  const dice = w.woundDice(c);
  return (
    <Section
      title={
        <span className="row" style={{ gap: 6 }}>
          <HeartCrack size={14} /> Ferite
        </span>
      }
      action={
        editable && (
          <button
            className="btn ghost sm"
            title={`Tira ${dice}d10 sulla tabella delle Ferite`}
            onClick={() => (table?.token ? table.token.woundRoll() : onRoll(`${dice}d10`, 'Tabella delle Ferite'))}
          >
            <Dices size={13} /> Tabella ({dice}d10)
          </button>
        )
      }
    >
      <div className="rows">
        {c.wounds.map((wd) => (
          <div key={wd.id} className="r" title={wd.text}>
            <span className="grow">
              <b className="small">{wd.name}</b>
              {wd.festering && <span className="badge" style={{ marginLeft: 4 }}>Purulenta</span>}
              {wd.text && (
                <div className="faint tiny">
                  {wd.text}
                  {wd.heal ? ` Guarisce: ${wd.heal}.` : ''}
                </div>
              )}
            </span>
            {editable && (
              <>
                <label className="row tiny" title="Medicata: non aggiunge dadi alla tabella delle Ferite">
                  <Switch on={wd.treated} onChange={(treated) => set({ wounds: c.wounds.map((x) => (x.id === wd.id ? { ...x, treated } : x)) })} label="Medicata" />
                  medicata
                </label>
                <button className="btn ghost sm icon" title="Guarita" aria-label="Guarita" onClick={() => set({ wounds: c.wounds.filter((x) => x.id !== wd.id) })}>
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        ))}
        {!c.wounds.length && <span className="faint small">Nessuna Ferita.</span>}
      </div>
      {editable && (
        <div className="row" style={{ marginTop: 6 }}>
          <select className="select grow" value={custom} onChange={(e) => setCustom(e.target.value)}>
            <option value="">Annota una Ferita…</option>
            {w.WOUND_TABLE.map((r) => (
              <option key={r.name} value={r.name}>
                {r.min === r.max ? r.min : `${r.min}-${r.max > 30 ? '+' : r.max}`} · {r.name}
              </option>
            ))}
          </select>
          <button
            className="btn sm"
            disabled={!custom}
            onClick={() => {
              const r = w.WOUND_TABLE.find((x) => x.name === custom)!;
              set({ wounds: [...c.wounds, { id: rid(), name: r.name, text: r.text, heal: r.heal, treated: false }] });
              setCustom('');
            }}
          >
            <Plus size={13} />
          </button>
        </div>
      )}
      <p className="faint tiny">
        1d10 più un dado per Ferita non medicata. Si medica Recuperando con Memoria (automatico con Anatomia) o dopo la battaglia Riprendendo Fiato. A fine giornata Prova di Tempra
        contro l’infezione.
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------ Talenti */

function shareButton(onShare: ((c: ChatCard) => void) | undefined, card: () => ChatCard) {
  if (!onShare) return null;
  return (
    <button className="btn ghost sm icon share" title="Mostra in chat" aria-label="Mostra in chat" onClick={() => onShare(card())}>
      <MessageSquareShare size={13} />
    </button>
  );
}

function TalentsTab({ c, onShare }: { c: C; onShare?: (card: ChatCard) => void }) {
  const career = w.getCareer(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {career && (
        <Section title="Talento di Carriera">
          <div className="detail">
            <div className="row between">
              <b>{career.talent.name}</b>
              {shareButton(onShare, () => ({ title: career.talent.name, subtitle: `Talento di Carriera · ${career.name}`, body: career.talent.text }))}
            </div>
            <span className="small">{career.talent.text}</span>
          </div>
        </Section>
      )}
      <Section title="Talenti">
        <div className="col" style={{ gap: 6 }}>
          {c.talents.map((p) => {
            const t = w.talentInfo(p.id);
            return (
              <div key={p.id} className="detail">
                <div className="row between">
                  <b>
                    {t?.name ?? p.id}
                    {(p.rank ?? 1) > 1 ? ` ${p.rank}` : ''}
                    {p.note ? ` (${p.note})` : ''}
                  </b>
                  {t && shareButton(onShare, () => ({ title: t.name, subtitle: `Talento · ${t.req}`, body: t.text }))}
                </div>
                <span className="small">{t?.text}</span>
              </div>
            );
          })}
          {!c.talents.length && <span className="faint small">Nessun Talento.</span>}
        </div>
      </Section>
      <Section title="Saperi">
        <div className="row wrap" style={{ gap: 4 }}>
          {c.lore.map((l) => (
            <span key={l} className="chip sm">
              <BookOpen size={11} /> {l}
            </span>
          ))}
          {!c.lore.length && <span className="faint small">Nessun Sapere.</span>}
        </div>
        <p className="faint tiny">Un Sapere dà +1d, permette Prove altrimenti impossibili o le rende automatiche (mai bonus agli attacchi, salvo Ammazzamostri).</p>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------- Magia */

function MagicTab({
  c,
  editable,
  set,
  onRoll,
  onShare,
  table,
  onTest,
}: {
  c: C;
  editable: boolean;
  set: Set;
  onRoll: Roll;
  onShare?: (card: ChatCard) => void;
  table?: SheetTable;
  onTest: (l: string, d: number, t: number, x?: Partial<PendingTest>) => void;
}) {
  const level = w.mageLevel(c);
  const will = w.pool(c, 'volonta');
  const [extra, setExtra] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState('');
  const known = w.knownSpells(c);
  const armoured = w.isArmoured(c);
  const mg = c.magic;
  const setMagic = (patch: Partial<C['magic']>) => set({ magic: { ...mg, ...patch } });
  const cast = async () => {
    const formula = w.testFormula(will.dice, will.target, { mod: extra, grim: armoured, magic: true });
    if (!table?.rollFor) {
      onTest('Prova di Magia', will.dice, will.target, { magic: true });
      return;
    }
    setBusy(true);
    const r = await table.rollFor(formula, 'Prova di Magia');
    setBusy(false);
    if (!r) return;
    const nines = r.parts.reduce((n, p) => n + (p.type === 'dice' ? (p.nines ?? 0) : 0), 0);
    // dice bought by mixing the winds go into the pool as well
    const pool = mg.pool + nines + extra;
    setMagic({ progress: mg.progress + (successes(r) ?? 0), pool });
    setExtra(0);
  };
  const miscast = pool(mg.pool, level);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="stat-row">
        <div className="stat">
          <small>Livello da Mago</small>
          <b>{level}</b>
        </div>
        <div className="stat" title="Successi accumulati nella Prova Prolungata di Volontà">
          <small>Successi</small>
          <b>{mg.progress}</b>
        </div>
        <div className={`stat ${miscast === 'danger' ? 'danger' : ''}`} title="Dadi Incidente Magico: se superano il Livello da Mago, Incidente">
          <small>Incidenti</small>
          <b>
            {mg.pool}
            <span className="faint">/{level}</span>
          </b>
        </div>
      </div>
      {miscast !== 'ok' && (
        <div className="callout warn small">{miscast === 'omen' ? 'Presagio di Sventura: il potere è visibile a tutti.' : 'La Riserva supera il tuo Livello: Incidente Magico!'}</div>
      )}
      {editable && (
        <div className="col" style={{ gap: 6 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <button className="btn sm" disabled={busy} onClick={cast}>
              <Sparkles size={13} /> Prova di Magia ({w.testFormula(will.dice, will.target, { mod: extra, grim: armoured, magic: true })})
            </button>
            <span className="row small" title="Mischiare i Venti: ogni dado in più va anche nella Riserva degli Incidenti">
              Mischia i Venti
              <button className="btn ghost sm icon" onClick={() => setExtra(Math.max(0, extra - 1))} aria-label="meno">
                <Minus size={12} />
              </button>
              <b>{extra}</b>
              <button className="btn ghost sm icon" onClick={() => setExtra(Math.min(will.dice, extra + 1))} aria-label="più">
                <Plus size={12} />
              </button>
            </span>
          </div>
          {armoured && <span className="faint tiny">Con armatura o scudo le Prove di Magia sono Tetre.</span>}
          <div className="row wrap" style={{ gap: 6 }}>
            <button
              className="btn ghost sm"
              disabled={mg.pool < 1}
              onClick={() => {
                onRoll(`${mg.pool}d10`, 'Incidente Magico');
                setMagic({ pool: 0, progress: 0 });
              }}
            >
              <Flame size={12} /> Tira l’Incidente ({mg.pool}d10)
            </button>
            <button className="btn ghost sm" disabled={mg.pool < 1} onClick={() => setMagic({ pool: mg.pool - 1 })} title="Recuperare: un dado in meno nella Riserva">
              Recupera −1
            </button>
            <button className="btn ghost sm" onClick={() => setMagic({ pool: 0, progress: 0 })} title="A fine scontro le energie si disperdono senza danni">
              Disperdi
            </button>
            <button className="btn ghost sm" disabled={mg.progress < 1} onClick={() => setMagic({ progress: 0 })}>
              Azzera i successi
            </button>
          </div>
        </div>
      )}

      <Section title="Incantesimi">
        <div className="col" style={{ gap: 6 }}>
          {known.map(({ id, memorized, spell }) => {
            const s = spell!;
            const ready = mg.progress >= s.vm;
            return (
              <div key={id} className="detail">
                <div className="row between">
                  <b>
                    {s.name} <span className="faint small">VM {s.vm}</span>
                  </b>
                  <span className="row" style={{ gap: 4 }}>
                    {editable && ready && (
                      <button
                        className="btn sm"
                        title="Lancia: la Potenza è il numero di successi dell’ultima Prova"
                        onClick={() => {
                          onShare?.({ title: s.name, subtitle: `${s.lore} · VM ${s.vm} · lanciato`, tags: [s.target, s.range, s.duration], body: s.text });
                          setMagic({ progress: 0 });
                        }}
                      >
                        Lancia
                      </button>
                    )}
                    {shareButton(onShare, () => ({ title: s.name, subtitle: `${s.lore} · VM ${s.vm}`, tags: [s.target, s.range, s.duration], body: s.text }))}
                    {editable && (
                      <button className="btn ghost sm icon" aria-label="Togli" onClick={() => setMagic({ spells: mg.spells.filter((x) => x.id !== id) })}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </div>
                <span className="faint tiny">
                  {s.lore} · {s.target} · {s.range} · {s.duration}
                  {editable ? (
                    <label className="row tiny" style={{ display: 'inline-flex', marginLeft: 8 }}>
                      <input type="checkbox" checked={memorized} onChange={(e) => setMagic({ spells: mg.spells.map((x) => (x.id === id ? { ...x, memorized: e.target.checked } : x)) })} /> memorizzato
                    </label>
                  ) : memorized ? (
                    ' · memorizzato'
                  ) : (
                    ' · dal grimorio'
                  )}
                </span>
                <span className="small">{s.text}</span>
              </div>
            );
          })}
          {!known.length && <span className="faint small">Nessun incantesimo.</span>}
        </div>
        {editable && (
          <div className="row" style={{ marginTop: 6 }}>
            <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Aggiungi un incantesimo…</option>
              {w.MAGIC_LORES.map((l) => (
                <optgroup key={l} label={l}>
                  {w.SPELLS.filter((s) => s.lore === l && !mg.spells.some((x) => x.id === s.id)).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (VM {s.vm})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className="btn sm"
              disabled={!adding}
              onClick={() => {
                setMagic({ spells: [...mg.spells, { id: adding, memorized: false }] });
                setAdding('');
              }}
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </Section>

      <Section title="Incantesimi improvvisati">
        <div className="rows small">
          {w.IMPROVISED.map((r) => (
            <div key={r.level} className="r">
              <b style={{ width: 86 }}>{r.level}</b>
              <span className="faint" style={{ width: 40 }}>
                VM {r.vm}
              </span>
              <span className="muted grow">
                {r.damage} · {r.req}
              </span>
            </div>
          ))}
          {w.IMPROVISED_MODS.map((m) => (
            <div key={m} className="r faint tiny">
              {m}
            </div>
          ))}
        </div>
      </Section>
      {editable && (
        <Section title="Effetti degli Incidenti Magici">
          <textarea className="input" rows={2} value={mg.effects} onChange={(e) => setMagic({ effects: e.target.value })} />
        </Section>
      )}
    </div>
  );
}

function pool(dice: number, level: number): 'ok' | 'omen' | 'danger' {
  if (dice > level) return 'danger';
  if (level > 0 && dice === level) return 'omen';
  return 'ok';
}

/* -------------------------------------------------------------- Fede */

function FaithTab({ c, editable, set, onShare, onTest }: { c: C; editable: boolean; set: Set; onShare?: (card: ChatCard) => void; onTest: (l: string, d: number, t: number) => void }) {
  const rank = w.faithRank(c);
  const god = w.GODS.find((g) => g.id === c.faith.god);
  const will = w.pool(c, 'volonta');
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row">
        <span className="small muted">Divinità</span>
        <select className="select grow" disabled={!editable} value={c.faith.god ?? ''} onChange={(e) => set({ faith: { god: e.target.value || null } })}>
          <option value="">Scegli…</option>
          {w.GODS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} · {g.domain}
            </option>
          ))}
        </select>
      </div>
      {god && (
        <>
          <div className="detail">
            <b>Favore di {god.name}</b>
            <span className="small">{god.favour}</span>
            <span className="faint tiny">Sapere Preferito: {god.lore}</span>
          </div>
          <Section title="Precetti">
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {god.precepts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Section>
          {rank >= 2 && (
            <Section title="Preghiere">
              <div className="col" style={{ gap: 6 }}>
                {god.prayers.map((p) => (
                  <div key={p.name} className="detail">
                    <div className="row between">
                      <b>{p.name}</b>
                      <span className="row" style={{ gap: 4 }}>
                        {/Volontà/.test(p.text) && (
                          <button className="btn ghost sm" onClick={() => onTest(`${p.name} (Volontà)`, will.dice, will.target)}>
                            <Dices size={12} />
                          </button>
                        )}
                        {shareButton(onShare, () => ({ title: p.name, subtitle: `Preghiera di ${god.name}`, body: p.text }))}
                      </span>
                    </div>
                    <span className="small">{p.text}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {rank >= 3 && (
            <div className="detail">
              <b>Miracolo</b>
              <span className="small">{god.miracle}</span>
              <span className="faint tiny">Uno solo: per un altro serve di nuovo il Talento Fede. Concordalo col GM.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Averi */

function GearTab({ c, editable, set }: { c: C; editable: boolean; set: Set }) {
  const status = w.statusOf(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row wrap" style={{ gap: 'var(--s3)' }}>
        <label className="row small">
          <span className="muted">Status</span>
          <select className="select" disabled={!editable} value={c.status ?? ''} onChange={(e) => set({ status: (e.target.value || null) as C['status'] })}>
            <option value="">Della Carriera ({w.STATUS_LABEL[w.getCareer(c)?.status ?? 'bronzo']})</option>
            {(['bronzo', 'argento', 'oro'] as const).map((s) => (
              <option key={s} value={s}>
                {w.STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="row small">
          <span className="muted">Velocità</span>
          <select className="select" disabled={!editable} value={c.speed} onChange={(e) => set({ speed: e.target.value as C['speed'] })}>
            {['Lenta', 'Normale', 'Veloce'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <Section title="Monete">
        <div className="col" style={{ gap: 4 }}>
          {(['bronzo', 'argento', 'oro'] as const).map((k) => {
            const m = c.coins[k];
            return (
              <div key={k} className="row small" style={{ gap: 6 }}>
                <b style={{ width: 64 }}>{w.STATUS_LABEL[k]}</b>
                <span className="pips">
                  {Array.from({ length: Math.max(m.owned, 1) }, (_, i) => (
                    <button
                      key={i}
                      disabled={!editable || i >= m.owned}
                      className={`pip ${i < m.spent ? 'used' : i < m.owned ? 'ok' : ''}`}
                      title={i < m.spent ? 'Spesa' : 'Da spendere'}
                      onClick={() => set({ coins: { ...c.coins, [k]: { ...m, spent: i < m.spent ? i : i + 1 } } })}
                    />
                  ))}
                </span>
                {editable && (
                  <span className="row" style={{ gap: 2 }}>
                    <button className="btn ghost sm icon" aria-label="Una in meno" onClick={() => set({ coins: { ...c.coins, [k]: { owned: Math.max(0, m.owned - 1), spent: Math.min(m.spent, Math.max(0, m.owned - 1)) } } })}>
                      <Minus size={11} />
                    </button>
                    <button className="btn ghost sm icon" aria-label="Una in più" onClick={() => set({ coins: { ...c.coins, [k]: { ...m, owned: m.owned + 1 } } })}>
                      <Plus size={11} />
                    </button>
                  </span>
                )}
              </div>
            );
          })}
          {editable && (
            <button
              className="btn ghost sm"
              style={{ alignSelf: 'flex-start' }}
              title="All’inizio di ogni avventura: tre Monete del tuo Status"
              onClick={() => set({ coins: { bronzo: { owned: 0, spent: 0 }, argento: { owned: 0, spent: 0 }, oro: { owned: 0, spent: 0 }, [status]: { owned: 3, spent: 0 } } })}
            >
              Nuova avventura: 3 Monete {w.STATUS_LABEL[status]}
            </button>
          )}
        </div>
        <p className="faint tiny">Gli averi di Status inferiore al tuo sono gratuiti; Mercanteggiare è Fascino contro Volontà.</p>
      </Section>
      <BankSection c={c} editable={editable} set={set} />
      <MagicItemsSection c={c} editable={editable} set={set} />
      <Section title="Armatura">
        <div className="row wrap" style={{ gap: 6 }}>
          <select className="select grow" disabled={!editable} value={c.armour ?? ''} onChange={(e) => set({ armour: e.target.value || null })}>
            <option value="">Nessuna</option>
            {w.ARMOURS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.bonus ? ` (R+${a.bonus})` : ''}
              </option>
            ))}
          </select>
          <label className="row small">
            <Switch on={c.shield} onChange={(shield) => editable && set({ shield })} label="Scudo" /> Scudo (+1)
          </label>
        </div>
        {w.armourOf(c)?.traits && <span className="faint tiny">{w.armourOf(c)!.traits}</span>}
      </Section>
      {(['gear', 'resources'] as const).map((k) => (
        <Section key={k} title={k === 'gear' ? 'Averi' : 'Risorse'}>
          {editable ? <textarea className="input" rows={3} value={c[k]} onChange={(e) => set({ [k]: e.target.value })} /> : <p className="small pre">{c[k] || '—'}</p>}
        </Section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Note */

const NOTE_FIELDS: { key: 'omen' | 'others' | 'extended' | 'clues' | 'favours' | 'notes'; label: string }[] = [
  { key: 'omen', label: 'Tetro Presagio' },
  { key: 'others', label: 'Altri personaggi' },
  { key: 'extended', label: 'Prove Prolungate' },
  { key: 'clues', label: 'Tracce e Indizi' },
  { key: 'favours', label: 'Favori Dovuti' },
  { key: 'notes', label: 'Note' },
];

function NotesTab({ c, editable, set }: { c: C; editable: boolean; set: Set }) {
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Contatti">
        <div className="col" style={{ gap: 4 }}>
          {c.contacts.map((ct, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              {editable ? (
                <>
                  <input className="input grow" value={ct.name} placeholder="Nome" onChange={(e) => set({ contacts: c.contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <input className="input grow" value={ct.bond} placeholder="Legame" onChange={(e) => set({ contacts: c.contacts.map((x, j) => (j === i ? { ...x, bond: e.target.value } : x)) })} />
                  <button className="btn ghost sm icon" aria-label="Togli" onClick={() => set({ contacts: c.contacts.filter((_, j) => j !== i) })}>
                    <Trash2 size={12} />
                  </button>
                </>
              ) : (
                <span className="small">
                  <b>{ct.name}</b> {ct.bond && <span className="muted">· {ct.bond}</span>}
                </span>
              )}
            </div>
          ))}
          {editable && (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ contacts: [...c.contacts, { name: '', bond: '' }] })}>
              <Plus size={12} /> Contatto
            </button>
          )}
        </div>
      </Section>
      {NOTE_FIELDS.map((f) => (
        <Section key={f.key} title={f.label}>
          {editable ? <textarea className="input" rows={f.key === 'notes' ? 5 : 2} value={c[f.key]} onChange={(e) => set({ [f.key]: e.target.value })} /> : <p className="small pre">{c[f.key] || '—'}</p>}
        </Section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- Avanzamento */

function AdvanceTab({ c, set }: { c: C; set: Set }) {
  const left = w.xpLeft(c);
  const [talent, setTalent] = useState('');
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row small" style={{ gap: 6 }}>
        <span className="muted">PE guadagnati</span>
        <button className="btn ghost sm icon" aria-label="meno" onClick={() => set({ xp: { ...c.xp, total: Math.max(c.xp.spent, c.xp.total - 1) } })}>
          <Minus size={12} />
        </button>
        <b>{c.xp.total}</b>
        <button className="btn ghost sm icon" aria-label="più" onClick={() => set({ xp: { ...c.xp, total: c.xp.total + 1 } })}>
          <Plus size={12} />
        </button>
        <span className="muted">· spesi {c.xp.spent} · da spendere</span>
        <b>{left}</b>
      </div>
      <p className="faint tiny">1 PE a sessione (2 per una grande vittoria). Si spendono negli Intermezzi.</p>
      <Section title="Caratteristiche">
        <div className="rows">
          {CHARACTERISTICS.map((k) => {
            const cost = w.charCost(c, k);
            const max = w.maxCharacteristic(c, k);
            const v = w.characteristic(c, k);
            return (
              <div key={k} className="r">
                <span className="grow small">
                  {CHAR_INFO[k].name} <span className="faint">(max {max})</span>
                </span>
                <b>{v}</b>
                <button
                  className="btn ghost sm"
                  disabled={v >= max || cost > left}
                  onClick={() => set({ advances: { ...c.advances, [k]: (c.advances[k] ?? 0) + 1 }, xp: { ...c.xp, spent: c.xp.spent + cost } })}
                >
                  +1 ({cost} PE)
                </button>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Nuovo Talento">
        <div className="row">
          <select className="select grow" value={talent} onChange={(e) => setTalent(e.target.value)}>
            <option value="">Scegli…</option>
            {w.TALENTS.filter((t) => !t.creationOnly).map((t) => {
              const why = w.talentBlocked(c, t);
              return (
                <option key={t.id} value={t.id} disabled={!!why}>
                  {t.name} · {w.talentCost(c, t)} PE{why ? ` — ${why}` : ''}
                </option>
              );
            })}
          </select>
          <button
            className="btn sm"
            disabled={!talent || w.talentCost(c, w.TALENTS.find((t) => t.id === talent)!) > left}
            onClick={() => {
              const t = w.TALENTS.find((x) => x.id === talent)!;
              const have = c.talents.find((x) => x.id === t.id);
              const talents = have ? c.talents.map((x) => (x.id === t.id ? { ...x, rank: (x.rank ?? 1) + 1 } : x)) : [...c.talents, { id: t.id }];
              set({ talents, xp: { ...c.xp, spent: c.xp.spent + w.talentCost(c, t) } });
              setTalent('');
            }}
          >
            Prendi
          </button>
        </div>
        {talent && <p className="small">{w.TALENTS.find((t) => t.id === talent)?.text}</p>}
        <p className="faint tiny">Fede richiede anche una prova di devozione; Mago può arrivare a 4 gradi.</p>
      </Section>
      <Section title="Intermezzo">
        <p className="small muted">
          Un’Attività per ogni sessione dall’ultimo Intermezzo (massimo 3): Allenare Abilità, Studiare Sapere, Riposare e Rimettersi, Propiziare il Fato… Segna i fallimenti
          nella scheda Prove: quando superano il valore dell’Abilità, questa sale di 1.
        </p>
        <button
          className="btn ghost sm"
          disabled={c.fate.spent === 0 && c.coins[w.statusOf(c)].owned === 3 && c.coins[w.statusOf(c)].spent === 0}
          onClick={() => {
            const st = w.statusOf(c);
            set({ fate: { ...c.fate, spent: 0 }, coins: { ...c.coins, [st]: { owned: 3, spent: 0 } }, magic: { ...c.magic, pool: 0, progress: 0 } });
          }}
        >
          Pronto per la prossima avventura
        </button>
      </Section>
    </div>
  );
}

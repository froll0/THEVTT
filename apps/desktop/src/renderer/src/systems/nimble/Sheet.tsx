import { roll, type ChatCard, type RollResult } from '@thevtt/shared';
import { nimbleRules as n } from '@thevtt/systems';
import { ArrowUpCircle, Dices, Heart, MessageSquareShare, Minus, Moon, Plus, Shield, Skull, Sparkles, Sun, Swords, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Modal, Section, Switch } from '../../components/ui';
import { PrintPart } from '../../components/Print';
import type { SheetProps, SheetTable } from '..';

type C = n.NimbleCharacter;
type Set = (patch: Partial<C>) => void;
type Roll = (formula: string, label: string) => void;
type Share = ((card: ChatCard) => void) | undefined;
const { STATS, STAT_INFO, SKILLS, SKILL_INFO } = n;
const rid = () => Math.random().toString(36).slice(2, 10);

/** Advantage (n > 0) or disadvantage (n < 0) on the Primary Die of a formula. */
export function withEdge(formula: string, edge: number): string {
  if (!edge || !/^\d*d\d+n/i.test(formula)) return formula;
  return formula.replace(/^(\d*d\d+n)/i, `$1${edge > 0 ? 'a' : 'd'}${Math.abs(edge)}`);
}

/** a d20 test with advantage or disadvantage */
const d20Edge = (base: string, edge: number) => {
  if (!edge) return base;
  const m = /^(?:1d20|2d20k[hl]1)(.*)$/.exec(base);
  const rest = m ? m[1] : '';
  const kind = base.startsWith('2d20kh1') ? 1 : base.startsWith('2d20kl1') ? -1 : 0;
  const total = kind + edge;
  return total === 0 ? `1d20${rest}` : `${1 + Math.abs(total)}d20${total > 0 ? 'kh1' : 'kl1'}${rest}`;
};

const SAVE_MARK: Record<n.SaveKind, string> = { adv: ' ▲', dis: ' ▼', neutral: '' };

function ShareButton({ onShare, card }: { onShare: Share; card: () => ChatCard }) {
  if (!onShare) return null;
  return (
    <button
      type="button"
      className="btn ghost sm icon share"
      title="Mostra in chat"
      aria-label="Mostra in chat"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onShare(card());
      }}
    >
      <MessageSquareShare size={13} />
    </button>
  );
}

export function spellCard(c: C, s: n.SpellDef): ChatCard {
  const f = n.spellFormula(c, s);
  const school = n.SCHOOLS[s.school].name;
  return {
    title: s.name,
    subtitle: `${s.tier === 0 ? 'Trucchetto' : `Grado ${s.tier}`} · ${school} · ${n.TARGET_LABEL[s.target]}`,
    tags: [
      typeof s.actions === 'number' ? `${s.actions} ${s.actions === 1 ? 'azione' : 'azioni'}` : s.actions,
      s.range ? `Gittata ${s.range}` : '',
      s.reach ? `Portata ${s.reach}` : '',
      s.save ? `TS ${STAT_INFO[s.save].short} CD ${10 + n.keyStat(c)}` : '',
      s.concentration ? `Concentrazione: ${s.concentration}` : '',
      s.reaction ? 'Reazione' : '',
    ].filter(Boolean),
    body: [s.text, s.upcast ? `Potenziare: ${s.upcast}` : '', s.highLevels ? `Ai livelli alti: ${s.highLevels}` : ''].filter(Boolean).join('\n\n'),
    rolls: f ? [{ label: 'Danni', formula: f }] : [],
  };
}

/** what a list of Hit Dice rolled: their values (from the chat roll when there is one) */
async function rollDice(formula: string, label: string, table: SheetTable | undefined): Promise<number[]> {
  const r: RollResult | null = table?.rollFor ? await table.rollFor(formula, label) : roll(formula);
  const out: number[] = [];
  for (const p of (r ?? roll(formula)).parts) if (p.type === 'dice') for (const d of p.rolls) if (!d.dropped) out.push(d.value);
  return out;
}

export function NimbleSheet({ data, editable, onChange, onRoll, onShare, compact, table, print }: SheetProps<C>) {
  const c = n.normalize(data);
  const set: Set = (patch) => onChange({ ...c, ...patch });
  const cls = n.classOf(c);
  const sub = n.subclassOf(c);
  const [tab, setTab] = useState<Tab>('main');
  const [delta, setDelta] = useState(1);
  const [levelUp, setLevelUp] = useState(false);
  const [resting, setResting] = useState(false);
  const max = n.maxHp(c);
  const hp = n.currentHp(c);
  const wounds = n.maxWounds(c);
  const dying = hp === 0;
  const todo = editable ? pending(c) : [];
  const spells = n.knownSpells(c);
  const hasMagic = !!cls?.magic || spells.length > 0 || c.utilitySpells.length > 0;

  const setHp = (current: number, temp = c.hp.temp) => set({ hp: { current: current >= max ? null : Math.max(0, current), temp: Math.max(0, temp) } });
  const damage = (amount: number) => {
    const fromTemp = Math.min(c.hp.temp, amount);
    const rest = amount - fromTemp;
    // at 0 HP a hit is a Wound more; the first time down too
    if (dying && rest > 0) return set({ hp: { current: 0, temp: c.hp.temp - fromTemp }, wounds: Math.min(wounds, c.wounds + 2) });
    const next = hp - rest;
    if (next <= 0) return set({ hp: { current: 0, temp: c.hp.temp - fromTemp }, wounds: Math.min(wounds, c.wounds + 1) });
    setHp(next, c.hp.temp - fromTemp);
  };

  const tabs: { id: Tab; label: string; show?: boolean }[] = [
    { id: 'main', label: 'Principale' },
    { id: 'attacks', label: 'Attacchi' },
    { id: 'spells', label: 'Incantesimi', show: hasMagic },
    { id: 'features', label: 'Privilegi' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'notes', label: 'Eroe' },
  ];
  const show = (t: Tab) => (print ? tabs.some((x) => x.id === t && x.show !== false) : tab === t);
  const tabLabel = (t: Tab) => tabs.find((x) => x.id === t)?.label ?? t;

  return (
    <div className="sheet nimble">
      <div className="sheet-head">
        <div className="portrait" style={{ width: compact ? 44 : 64, height: compact ? 44 : 64, backgroundImage: c.portrait ? `url(${c.portrait})` : undefined, fontSize: 22 }}>
          {!c.portrait && (c.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          {compact ? <b>{c.name}</b> : <h2 className="ellipsis">{c.name || 'Senza nome'}</h2>}
          <div className="muted small ellipsis">
            {n.headline(c) || 'Nimble'}
            {sub ? ` · ${sub.name}` : ''}
            {n.backgroundOf(c) ? ` · ${n.backgroundOf(c)!.name}` : ''}
          </div>
        </div>
        {editable && c.level < 20 && cls && (
          <button className={`btn sm ${c.milestone ? 'primary level-ready' : ''}`} onClick={() => setLevelUp(true)} title="Sali di livello">
            <ArrowUpCircle size={14} /> {compact ? '' : 'Livello'}
          </button>
        )}
      </div>

      {todo.length > 0 && (
        <div className="issues todo">
          <b className="small">Da completare</b>
          {todo.map((t) => (
            <span key={t} className="small">
              • {t}
            </span>
          ))}
        </div>
      )}

      <div className="col" style={{ gap: 6 }}>
        <div className="hp-box">
          <Heart size={16} className="muted" />
          <span className="hp-value">
            {hp}
            <span className="faint">/{max}</span>
          </span>
          {c.hp.temp > 0 && <span className="badge accent">+{c.hp.temp} temp</span>}
          <div className="grow" />
          {editable && (
            <div className="row" style={{ gap: 4 }}>
              <input className="input num" type="number" min={1} value={delta} onChange={(e) => setDelta(Math.max(1, Number(e.target.value) || 1))} style={{ width: 58, height: 28 }} aria-label="Quantità" />
              <button className="btn sm" onClick={() => damage(delta)} title="Danno">
                <Minus size={13} />
              </button>
              <button className="btn sm" onClick={() => setHp(hp + delta)} title="Cura">
                <Plus size={13} />
              </button>
              <button className="btn sm" onClick={() => set({ hp: { ...c.hp, temp: delta } })} title="Punti ferita temporanei">
                Temp
              </button>
            </div>
          )}
        </div>
        <div className="hp-bar">
          <i style={{ width: `${max ? (hp / max) * 100 : 0}%`, background: hp / max > 0.5 ? 'var(--success)' : hp / max > 0.25 ? 'var(--warning)' : 'var(--danger)' }} />
        </div>
        <div className="row small" style={{ gap: 8 }}>
          <span className="muted grow">
            Ferite {c.wounds}/{wounds}
          </span>
          <span className="pips" aria-label="Ferite">
            {Array.from({ length: wounds }, (_, i) => (
              <button key={i} disabled={!editable} className={`pip ${c.wounds > i ? 'ko' : ''}`} title={`${i + 1} Ferite`} onClick={() => set({ wounds: c.wounds > i ? i : i + 1 })} />
            ))}
          </span>
        </div>
      </div>

      {(dying || c.wounds >= wounds) && (
        <div className="callout warn small">
          <Skull size={14} />
          {c.wounds >= wounds
            ? 'Le Ferite hanno raggiunto il massimo: l’eroe è morto.'
            : 'Morente: hai al massimo 1 azione per turno; ogni danno che subisci è +2 Ferite (+3 se è un critico). Una cura qualsiasi ti rimette in piedi.'}
        </div>
      )}

      <div className="stat-row">
        <div className="stat" title="Difendersi toglie questo valore dai danni">
          <small>
            <Shield size={10} /> Armatura
          </small>
          <b>{n.armorValue(c)}</b>
        </div>
        <button className="stat" onClick={() => onRoll(n.initiativeFormula(c), 'Iniziativa')} title={n.initiativeFormula(c)}>
          <small>Iniziativa</small>
          <b>{n.fmt(n.initiativeBonus(c))}</b>
        </button>
        <div className="stat">
          <small>Velocità</small>
          <b>{n.speed(c)}</b>
        </div>
        <div className="stat">
          <small>Dadi Vita</small>
          <b className="small">
            {n.maxHitDice(c) - c.hitDiceSpent}/{n.maxHitDice(c)} d{n.hitDie(c)}
          </b>
        </div>
        {n.manaMax(c) > 0 && (
          <div className="stat">
            <small>Mana</small>
            <b className="small">
              {n.manaLeft(c)}/{n.manaMax(c)}
            </b>
          </div>
        )}
        {!compact && (
          <div className="stat">
            <small>Spazi</small>
            <b className={`small ${n.slotsUsed(c) > n.inventorySlots(c) ? 'danger-text' : ''}`}>
              {n.slotsUsed(c)}/{n.inventorySlots(c)}
            </b>
          </div>
        )}
      </div>

      <div className="sheet-tabs no-print">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
      </div>

      {show('main') && (
        <PrintPart label={tabLabel('main')} print={print}>
          <MainTab c={c} set={set} editable={editable} onRoll={onRoll} onRest={() => setResting(true)} onSafeRest={() => onChange(n.safeRest(c))} />
        </PrintPart>
      )}
      {show('attacks') && (
        <PrintPart label={tabLabel('attacks')} print={print}>
          <AttacksTab c={c} onRoll={onRoll} table={table} />
        </PrintPart>
      )}
      {show('spells') && hasMagic && (
        <PrintPart label={tabLabel('spells')} print={print}>
          <SpellsTab c={c} set={set} editable={editable} onRoll={onRoll} onShare={onShare} table={table} />
        </PrintPart>
      )}
      {show('features') && (
        <PrintPart label={tabLabel('features')} print={print}>
          <FeaturesTab c={c} set={set} editable={editable} onShare={onShare} />
        </PrintPart>
      )}
      {show('inventory') && (
        <PrintPart label={tabLabel('inventory')} print={print}>
          <InventoryTab c={c} set={set} editable={editable} onRoll={onRoll} />
        </PrintPart>
      )}
      {show('notes') && (
        <PrintPart label={tabLabel('notes')} print={print}>
          <NotesTab c={c} set={set} editable={editable} />
        </PrintPart>
      )}

      {levelUp && (
        <LevelUpModal
          c={c}
          table={table}
          onClose={() => setLevelUp(false)}
          onConfirm={(next) => {
            onChange(next);
            setLevelUp(false);
          }}
        />
      )}
      {resting && (
        <FieldRestModal
          c={c}
          table={table}
          onClose={() => setResting(false)}
          onConfirm={(next) => {
            onChange(next);
            setResting(false);
          }}
        />
      )}
    </div>
  );
}

type Tab = 'main' | 'attacks' | 'spells' | 'features' | 'inventory' | 'notes';

/** what's still to choose: skill points, the subclass, the class lists */
export function pending(c: C): string[] {
  const out: string[] = [];
  const free = n.skillPointsTotal(c) - n.skillPointsUsed(c);
  if (free > 0) out.push(`${free === 1 ? 'Un punto abilità' : `${free} punti abilità`} da assegnare`);
  if (c.level >= 3 && n.classOf(c) && !c.subclassId) out.push('Scegli una sottoclasse');
  for (const ch of n.choicesDue(c)) if (ch.picked < ch.due) out.push(`${ch.name}: ${ch.due - ch.picked} da scegliere`);
  if (n.ancestryOf(c)?.bonus.saves === 'neutral-to-adv' && !c.extraSave) out.push('Infernide: scegli il TS che diventa favorito');
  if (n.classOf(c)?.magic?.extraSchool && !c.extraSchool) out.push('Scegli la seconda scuola di magia');
  if (c.level >= 19 && !c.boons.some((b) => n.BOONS.some((x) => x.tier === 'epic' && x.name === b))) out.push('Scegli un Dono epico');
  return out;
}

/* ------------------------------------------------------------- Principale */

function MainTab({ c, set, editable, onRoll, onRest, onSafeRest }: { c: C; set: Set; editable: boolean; onRoll: Roll; onRest: () => void; onSafeRest: () => void }) {
  const [edge, setEdge] = useState(0);
  const free = n.skillPointsTotal(c) - n.skillPointsUsed(c);
  const resources = n.resourcesOf(c);
  const setPoints = (k: n.SkillId, v: number) => set({ skillPoints: { ...c.skillPoints, [k]: Math.max(0, v) } });
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <EdgePicker edge={edge} setEdge={setEdge} />
      <div className="ab-grid">
        {STATS.map((s) => {
          const kind = n.saveKind(c, s);
          return (
            <div key={s} className="ab">
              <button onClick={() => onRoll(d20Edge(n.d20(c.stats[s]), edge), `Prova di ${STAT_INFO[s].name}`)} title={STAT_INFO[s].text}>
                <small>{STAT_INFO[s].short}</small>
                <b>{n.fmt(c.stats[s])}</b>
              </button>
              <button
                className={`save ${kind === 'adv' ? 'prof' : ''}`}
                onClick={() => onRoll(d20Edge(n.saveFormula(c, s), edge), `TS su ${STAT_INFO[s].name}`)}
                title={kind === 'adv' ? 'TS favorito: con vantaggio' : kind === 'dis' ? 'TS sfavorito: con svantaggio' : 'TS neutro'}
              >
                TS {n.fmt(c.stats[s])}
                {SAVE_MARK[kind]}
              </button>
            </div>
          );
        })}
      </div>
      <Section title={`Abilità${editable && free !== 0 ? ` · ${free} punti liberi` : ''}`}>
        <div className="rows">
          {SKILLS.map((k) => {
            const v = n.skillValue(c, k);
            const pts = c.skillPoints[k] ?? 0;
            return (
              <div key={k} className="r">
                <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start', textAlign: 'left', gap: 8 }} onClick={() => onRoll(d20Edge(n.d20(v), edge), SKILL_INFO[k].name)} title={SKILL_INFO[k].text}>
                  <span className={`dot ${pts > 0 ? 'prof' : ''}`} />
                  <span className="grow ellipsis">{SKILL_INFO[k].name}</span>
                  <span className="faint tiny">{STAT_INFO[SKILL_INFO[k].stat].short}</span>
                </button>
                {editable && (
                  <>
                    <button className="btn ghost sm icon" aria-label={`${SKILL_INFO[k].name} meno uno`} disabled={pts <= 0} onClick={() => setPoints(k, pts - 1)}>
                      <Minus size={11} />
                    </button>
                    <button className="btn ghost sm icon" aria-label={`${SKILL_INFO[k].name} più uno`} disabled={free <= 0 || v >= 12} onClick={() => setPoints(k, pts + 1)}>
                      <Plus size={11} />
                    </button>
                  </>
                )}
                <b style={{ minWidth: 28, textAlign: 'right' }}>{n.fmt(v)}</b>
              </div>
            );
          })}
        </div>
      </Section>
      {resources.length > 0 && (
        <Section title="Risorse di classe">
          <div className="rows small">
            {resources.map((r) => {
              const spent = c.resources[r.id] ?? 0;
              return (
                <div key={r.id} className="r">
                  <span className="grow">
                    {r.name}
                    {r.die ? ` (${r.die})` : ''}
                    <span className="faint tiny"> · {r.reset === 'encounter' ? 'per scontro' : r.reset === 'day' ? 'al giorno' : 'per Riposo sicuro'}</span>
                  </span>
                  {r.die && (
                    <button className="btn ghost sm icon" title={`Tira 1${r.die}`} onClick={() => onRoll(`1${r.die}`, r.name)}>
                      <Dices size={12} />
                    </button>
                  )}
                  <span className="pips">
                    {Array.from({ length: Math.min(r.max, 20) }, (_, i) => (
                      <button key={i} disabled={!editable} className={`pip ${i < r.max - spent ? 'ok' : ''}`} onClick={() => set({ resources: { ...c.resources, [r.id]: i < r.max - spent ? r.max - i : r.max - i - 1 } })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      {editable && (
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn sm" onClick={onRest} disabled={n.maxHitDice(c) - c.hitDiceSpent <= 0} title="Spendi Dadi Vita per recuperare PF">
            <Sun size={13} /> Riposo sul campo
          </button>
          <button className="btn sm" onClick={() => confirm('Riposo sicuro: tornano PF, Dadi Vita, mana e risorse, e guarisci 1 Ferita. Procedere?') && onSafeRest()}>
            <Moon size={13} /> Riposo sicuro
          </button>
        </div>
      )}
      <Section title="Lingue">
        <span className="small">{c.languages.join(', ') || '—'}</span>
      </Section>
    </div>
  );
}

function EdgePicker({ edge, setEdge }: { edge: number; setEdge: (n: number) => void }) {
  return (
    <div className="row small" style={{ gap: 6 }}>
      <span className="muted">Prossimi tiri:</span>
      <div className="seg row">
        {[-2, -1, 0, 1, 2].map((e) => (
          <button key={e} className={edge === e ? 'on' : ''} onClick={() => setEdge(e)} title={e > 0 ? `Vantaggio ${e}` : e < 0 ? `Svantaggio ${-e}` : 'Normale'}>
            {e > 0 ? `V${e}` : e < 0 ? `S${-e}` : '—'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Attacchi */

function AttacksTab({ c, onRoll, table }: { c: C; onRoll: Roll; table?: SheetTable }) {
  const [edge, setEdge] = useState(0);
  const list = n.attacks(c).filter((a) => a.source !== 'spell');
  const go = (a: n.NimbleAttack) => {
    const formula = withEdge(a.formula, edge);
    if (table?.nimbleAttack?.({ name: a.name, formula, damageType: a.type || undefined, area: a.area })) return;
    onRoll(formula, a.name);
  };
  return (
    <div className="col" style={{ gap: 'var(--s3)' }}>
      <EdgePicker edge={edge} setEdge={setEdge} />
      <span className="faint tiny">
        Il dado primario (il primo) decide: con 1 manchi, col massimo è un critico che esplode. {table?.nimbleAttack ? 'Segna un bersaglio (Ctrl+clic) e il tavolo applica armatura, gregari e attacchi affrettati.' : ''}
      </span>
      <div className="rows">
        {list.map((a) => (
          <div key={a.id} className="r" style={{ alignItems: 'flex-start' }}>
            <div className="grow col" style={{ gap: 2, minWidth: 0 }}>
              <b className="small">{a.name}</b>
              <span className="faint tiny">{a.detail}</span>
            </div>
            <button className="btn sm" onClick={() => go(a)} title={withEdge(a.formula, edge)}>
              <Swords size={12} /> {withEdge(a.formula, edge)}
            </button>
          </div>
        ))}
      </div>
      <Section title="Azioni e reazioni">
        <div className="rows small">
          {n.GLOSSARY.filter((g) => ['Azioni eroiche', 'Valutare', 'Reazioni eroiche', 'Difendersi', 'Interporsi', 'Attacco d’opportunità', 'Aiutare', 'Attacchi affrettati'].includes(g.it)).map((g) => (
            <div key={g.it} className="r" style={{ alignItems: 'flex-start' }}>
              <b style={{ minWidth: 120 }}>{g.it}</b>
              <span className="grow muted">{g.text}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------ Incantesimi */

function SpellsTab({ c, set, editable, onRoll, onShare, table }: { c: C; set: Set; editable: boolean; onRoll: Roll; onShare: Share; table?: SheetTable }) {
  const cls = n.classOf(c);
  const magic = cls?.magic;
  const spells = n.knownSpells(c);
  const tier = n.highestTier(c);
  const left = n.manaLeft(c);
  const [extra, setExtra] = useState(0);
  const [edge, setEdge] = useState(0);
  const utilities = n.UTILITY_SPELLS.filter((s) => n.schoolsKnown(c).includes(s.school));
  const cast = (s: n.SpellDef) => {
    const up = s.tier > 0 ? Math.max(0, Math.min(extra, tier - s.tier)) : 0;
    const cost = s.tier > 0 ? s.tier + up : 0;
    if (cost > 0 && n.manaMax(c) > 0) {
      if (cost > left) return alert(`Mana insufficiente: servono ${cost}, ne restano ${left}.`);
      set({ manaSpent: c.manaSpent + cost });
    }
    const f = n.spellFormula(c, s, up);
    if (!f) return onShare?.(spellCard(c, s));
    const formula = withEdge(f, edge);
    if (table?.nimbleAttack?.({ name: s.name, formula, damageType: s.damageType, area: s.target !== 'single', ignoreArmor: !!s.save })) return;
    onRoll(formula, s.name);
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {magic && (
        <div className="row wrap small" style={{ gap: 'var(--s3)' }}>
          <span>
            Scuole: <b>{n.schoolsKnown(c).map((s) => n.SCHOOLS[s].name).join(', ') || '—'}</b>
          </span>
          <span>
            Grado massimo: <b>{tier}</b>
          </span>
          <span>
            CD: <b>{10 + n.keyStat(c)}</b>
          </span>
          {n.manaMax(c) > 0 && (
            <span className="row" style={{ gap: 4 }}>
              Mana{' '}
              <b>
                {left}/{n.manaMax(c)}
              </b>
              {editable && (
                <>
                  <button className="btn ghost sm icon" aria-label="Mana meno uno" disabled={left <= 0} onClick={() => set({ manaSpent: c.manaSpent + 1 })}>
                    <Minus size={11} />
                  </button>
                  <button className="btn ghost sm icon" aria-label="Mana più uno" disabled={c.manaSpent <= 0} onClick={() => set({ manaSpent: c.manaSpent - 1 })}>
                    <Plus size={11} />
                  </button>
                </>
              )}
            </span>
          )}
          {!magic.mana && cls?.id === 'shadowmancer' && <span className="faint">Niente mana: il Patrono ti presta il suo potere.</span>}
        </div>
      )}
      {magic && (magic.extraSchool || c.subclassId === 'sky-storm') && editable && (
        <label className="row small">
          <span className="muted">{magic.extraSchool ? 'Seconda scuola' : 'Scuola in più'}</span>
          <select className="select" value={c.extraSchool ?? ''} onChange={(e) => set({ extraSchool: (e.target.value || null) as n.SchoolId | null })}>
            <option value="">—</option>
            {(Object.keys(n.SCHOOLS) as n.SchoolId[])
              .filter((s) => !magic.schools.includes(s) && (magic.extraSchool || s === 'ice' || s === 'radiant'))
              .map((s) => (
                <option key={s} value={s}>
                  {n.SCHOOLS[s].name}
                </option>
              ))}
          </select>
        </label>
      )}
      <div className="row wrap" style={{ gap: 'var(--s3)' }}>
        <EdgePicker edge={edge} setEdge={setEdge} />
        {tier > 1 && (
          <label className="row small" title="Mana in più per un effetto più forte, fino al grado sbloccato">
            <Zap size={12} className="muted" /> Potenziare +
            <input className="input num" type="number" min={0} max={tier - 1} value={extra} onChange={(e) => setExtra(Math.max(0, Math.min(tier - 1, Number(e.target.value) || 0)))} style={{ width: 52, height: 26 }} aria-label="Mana per potenziare" />
          </label>
        )}
      </div>
      {spells.length === 0 && <span className="faint small">Nessun incantesimo per ora{magic ? ` (dal livello ${magic.cantripsAt})` : ''}.</span>}
      {[...new Set(spells.map((s) => s.tier))].map((t) => (
        <Section key={t} title={t === 0 ? 'Trucchetti' : `Grado ${t}`}>
          <div className="col" style={{ gap: 4 }}>
            {spells
              .filter((s) => s.tier === t)
              .map((s) => (
                <details key={s.id} className="detail" style={{ padding: 8 }}>
                  <summary className="row between" style={{ cursor: 'pointer' }}>
                    <span className="grow">
                      <b className="small">{s.name}</b>{' '}
                      <span className="faint tiny">
                        {n.SCHOOLS[s.school].name} · {typeof s.actions === 'number' ? `${s.actions} az.` : s.actions} · {n.TARGET_LABEL[s.target]}
                        {s.range ? ` · Gittata ${s.range}` : ''}
                        {s.reach ? ` · Portata ${s.reach}` : ''}
                      </span>
                    </span>
                    <ShareButton onShare={onShare} card={() => spellCard(c, s)} />
                    <button
                      className="btn sm"
                      onClick={(e) => {
                        e.preventDefault();
                        cast(s);
                      }}
                      title={n.spellFormula(c, s, Math.max(0, Math.min(extra, tier - s.tier))) ?? 'Lancia'}
                    >
                      <Sparkles size={12} /> {s.tier > 0 ? `${s.tier + Math.max(0, Math.min(extra, tier - s.tier))} mana` : 'Lancia'}
                    </button>
                  </summary>
                  <p className="small" style={{ marginTop: 6 }}>
                    {s.text}
                  </p>
                  {s.save && (
                    <span className="small">
                      TS su {STAT_INFO[s.save].name}, CD {10 + n.keyStat(c)}
                    </span>
                  )}
                  {s.upcast && <p className="small muted">Potenziare: {s.upcast}</p>}
                  {s.highLevels && <p className="small muted">Ai livelli alti: {s.highLevels}</p>}
                  {s.concentration && <p className="small muted">Concentrazione: {s.concentration}</p>}
                </details>
              ))}
          </div>
        </Section>
      ))}
      {(utilities.length > 0 || c.utilitySpells.length > 0) && (
        <Section title="Incantesimi di utilità">
          <div className="col" style={{ gap: 4 }}>
            {n.utilityKnown(c).map((s) => (
              <div key={s.id} className="detail" style={{ padding: 8 }}>
                <div className="row between">
                  <b className="small">{s.name}</b>
                  <span className="row" style={{ gap: 2 }}>
                    <ShareButton onShare={onShare} card={() => spellCard(c, s)} />
                    {editable && (
                      <button className="btn ghost sm icon" aria-label={`Togli ${s.name}`} onClick={() => set({ utilitySpells: c.utilitySpells.filter((x) => x !== s.id) })}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </div>
                <span className="small">{s.text}</span>
              </div>
            ))}
            {editable && (
              <select className="select" value="" onChange={(e) => e.target.value && set({ utilitySpells: [...c.utilitySpells, e.target.value] })} aria-label="Aggiungi un incantesimo di utilità">
                <option value="">Aggiungi un incantesimo di utilità…</option>
                {utilities
                  .filter((s) => !c.utilitySpells.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({n.SCHOOLS[s.school].name})
                    </option>
                  ))}
              </select>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Privilegi */

function FeaturesTab({ c, set, editable, onShare }: { c: C; set: Set; editable: boolean; onShare: Share }) {
  const cls = n.classOf(c);
  const anc = n.ancestryOf(c);
  const bg = n.backgroundOf(c);
  const due = n.choicesDue(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {cls && c.level >= 3 && (
        <Section title="Sottoclasse">
          {editable ? (
            <select className="select" value={c.subclassId ?? ''} onChange={(e) => set({ subclassId: e.target.value || null })} aria-label="Sottoclasse">
              <option value="">Scegli…</option>
              {cls.subclasses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.story ? ' (di storia)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <b className="small">{n.subclassOf(c)?.name ?? '—'}</b>
          )}
        </Section>
      )}
      {anc && (
        <Section title={`Stirpe: ${anc.name}`}>
          <div className="small">
            <b>{anc.trait.name}.</b> {anc.trait.text}
          </div>
          {anc.bonus.saves === 'neutral-to-adv' && editable && (
            <label className="row small" style={{ marginTop: 6 }}>
              <span className="muted">TS che diventa favorito</span>
              <select className="select" value={c.extraSave ?? ''} onChange={(e) => set({ extraSave: (e.target.value || null) as n.StatId | null })}>
                <option value="">—</option>
                {STATS.filter((s) => !cls || (s !== cls.saves.adv && s !== cls.saves.dis)).map((s) => (
                  <option key={s} value={s}>
                    {STAT_INFO[s].name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Section>
      )}
      {bg && (
        <Section title={`Background: ${bg.name}`}>
          <span className="small">{bg.text}</span>
        </Section>
      )}
      {due.map((ch) => {
        const def = cls!.choices.find((x) => x.id === ch.id)!;
        const picked = c.choices[ch.id] ?? [];
        return (
          <Section key={ch.id} title={`${ch.name} (${ch.picked}/${ch.due})`}>
            <div className="col" style={{ gap: 4 }}>
              {picked.map((id) => {
                const o = def.options.find((x) => x.id === id);
                if (!o) return null;
                return (
                  <div key={id} className="detail" style={{ padding: 8 }}>
                    <div className="row between">
                      <b className="small">{o.name}</b>
                      <span className="row" style={{ gap: 2 }}>
                        <ShareButton onShare={onShare} card={() => ({ title: o.name, subtitle: ch.name, body: o.text })} />
                        {editable && (
                          <button className="btn ghost sm icon" aria-label={`Togli ${o.name}`} onClick={() => set({ choices: { ...c.choices, [ch.id]: picked.filter((x) => x !== id) } })}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </span>
                    </div>
                    <span className="small">{o.text}</span>
                  </div>
                );
              })}
              {editable && picked.length < ch.due && (
                <select className="select" value="" onChange={(e) => e.target.value && set({ choices: { ...c.choices, [ch.id]: [...picked, e.target.value] } })} aria-label={`Scegli: ${ch.name}`}>
                  <option value="">Scegli…</option>
                  {def.options
                    .filter((o) => !picked.includes(o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id} title={o.text}>
                        {o.name}
                        {o.req ? ` (${o.req})` : ''}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </Section>
        );
      })}
      <Section title="Privilegi di classe">
        <div className="col" style={{ gap: 4 }}>
          {n.featuresUpTo(c).map((f, i) => (
            <div key={`${f.level}-${f.name}-${i}`} className="detail" style={{ padding: 8 }}>
              <div className="row between">
                <b className="small">
                  {f.name} <span className="faint tiny">liv. {f.level}</span>
                </b>
                <ShareButton onShare={onShare} card={() => ({ title: f.name, subtitle: `${cls?.name ?? ''} · livello ${f.level}`, body: f.text })} />
              </div>
              <span className="small">{f.text}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Doni">
        <div className="col" style={{ gap: 4 }}>
          {c.boons.map((b) => {
            const def = n.BOONS.find((x) => x.name === b);
            return (
              <div key={b} className="row between small">
                <span>
                  <b>{b}</b> {def ? <span className="muted">{def.text}</span> : null}
                </span>
                {editable && (
                  <button className="btn ghost sm icon" aria-label={`Togli ${b}`} onClick={() => set({ boons: c.boons.filter((x) => x !== b) })}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {editable && (
            <select className="select" value="" onChange={(e) => e.target.value && set({ boons: [...c.boons, e.target.value] })} aria-label="Aggiungi un dono">
              <option value="">Aggiungi un dono…</option>
              {(['minor', 'major', 'epic'] as const).map((t) => (
                <optgroup key={t} label={t === 'minor' ? 'Minori' : t === 'major' ? 'Maggiori' : 'Epici'}>
                  {n.BOONS.filter((b) => b.tier === t && !c.boons.includes(b.name)).map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}: {b.text}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {c.boons.length > 0 && <span className="faint tiny">Gli effetti dei doni si segnano a mano nelle correzioni (scheda Eroe).</span>}
        </div>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------- Inventario */

function itemFromRef(ref: string): n.NimbleItem | null {
  const w = n.findWeapon(ref);
  if (w) return { id: rid(), ref, name: w.name, slots: w.twoHanded ? 2 : 1, qty: 1 };
  const a = n.findArmor(ref) ?? n.findShield(ref);
  if (a) return { id: rid(), ref, name: a.name, slots: 1, qty: 1 };
  const g = n.GEAR.find((x) => x.id === ref);
  if (g) return { id: rid(), ref, name: g.name, slots: g.slots ?? 1, qty: 1 };
  return null;
}

function itemInfo(it: n.NimbleItem): string {
  const w = n.findWeapon(it.ref);
  if (w) return [w.damage, n.STAT_INFO[w.stat].short, w.type, ...w.props].join(' · ');
  const a = n.findArmor(it.ref) ?? n.findShield(it.ref);
  if (a) return `${n.ARMOR_KINDS[a.kind]} · Armatura ${a.base}${a.dexMax === null ? '' : a.dexMax === Number.POSITIVE_INFINITY ? '+DES' : `+DES (max ${a.dexMax})`}${a.reqStr ? ` · FOR ${a.reqStr}` : ''}`;
  return n.GEAR.find((x) => x.id === it.ref)?.text ?? it.notes ?? '';
}

function InventoryTab({ c, set, editable, onRoll }: { c: C; set: Set; editable: boolean; onRoll: Roll }) {
  const [custom, setCustom] = useState('');
  const setItem = (id: string, patch: Partial<n.NimbleItem>) => set({ items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const add = (it: n.NimbleItem | null) => it && set({ items: [...c.items, it] });
  const cls = n.classOf(c);
  const warn = (it: n.NimbleItem) => {
    const a = n.findArmor(it.ref) ?? n.findShield(it.ref);
    const w = n.findWeapon(it.ref);
    const req = a?.reqStr ?? w?.reqStr;
    if (req && c.stats.str < req) return `Serve FOR ${req}`;
    if (a && cls && !cls.armor.includes(a.kind)) return 'Senza addestramento';
    if (w && !n.proficient(c, w)) return 'Senza competenza: niente critici';
    return '';
  };
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="row small wrap" style={{ gap: 'var(--s3)' }}>
        <span>
          Spazi:{' '}
          <b className={n.slotsUsed(c) > n.inventorySlots(c) ? 'danger-text' : ''}>
            {n.slotsUsed(c)}/{n.inventorySlots(c)}
          </b>
        </span>
        {(['gold', 'silver'] as const).map((k) => (
          <label key={k} className="row" style={{ gap: 4 }}>
            <span className="muted">{k === 'gold' ? 'mo' : 'ma'}</span>
            {editable ? <input className="input num" type="number" min={0} value={c[k]} onChange={(e) => set({ [k]: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 72, height: 26 }} aria-label={k === 'gold' ? 'Monete d’oro' : 'Monete d’argento'} /> : <b>{c[k]}</b>}
          </label>
        ))}
      </div>
      <div className="col" style={{ gap: 4 }}>
        {c.items.length === 0 && <span className="faint small">Zaino vuoto.</span>}
        {c.items.map((it) => {
          const g = n.GEAR.find((x) => x.id === it.ref);
          const wearable = !!(n.findArmor(it.ref) ?? n.findShield(it.ref));
          const w = warn(it);
          return (
            <div key={it.id} className="detail" style={{ padding: 8 }}>
              <div className="row between" style={{ gap: 6 }}>
                {editable ? <input className="input grow" value={it.name} onChange={(e) => setItem(it.id, { name: e.target.value })} aria-label="Nome dell’oggetto" style={{ height: 28 }} /> : <b className="small grow">{it.name}</b>}
                {wearable && (
                  <label className="row tiny" style={{ gap: 4 }} title="Indossata">
                    <Switch on={!!it.equipped} onChange={(v) => editable && setItem(it.id, { equipped: v || undefined })} label={`Indossa ${it.name}`} />
                  </label>
                )}
                {g?.heal && (
                  <button className="btn ghost sm icon" title={`Bevi: cura ${g.heal}`} onClick={() => onRoll(g.heal!, it.name)}>
                    <Heart size={12} />
                  </button>
                )}
                {editable ? (
                  <input className="input num" type="number" min={1} value={it.qty} onChange={(e) => setItem(it.id, { qty: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 52, height: 28 }} aria-label="Quantità" title="Quantità" />
                ) : (
                  it.qty > 1 && <span className="small">×{it.qty}</span>
                )}
                <span className="faint tiny" title="Spazi">
                  {it.slots * Math.max(1, it.qty)} sp.
                </span>
                {editable && (
                  <button className="btn ghost sm icon" aria-label={`Togli ${it.name}`} onClick={() => set({ items: c.items.filter((x) => x.id !== it.id) })}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <span className="faint tiny">
                {itemInfo(it)}
                {w ? <span className="danger-text"> · {w}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      {editable && (
        <div className="col" style={{ gap: 6 }}>
          <select className="select" value="" onChange={(e) => add(itemFromRef(e.target.value))} aria-label="Aggiungi dalla lista">
            <option value="">Aggiungi dalla lista…</option>
            <optgroup label="Armi">
              {n.WEAPONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.damage}, {w.cost} mo)
                </option>
              ))}
            </optgroup>
            <optgroup label="Armature">
              {n.ARMORS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({n.ARMOR_KINDS[a.kind]}, {a.cost} mo)
                </option>
              ))}
            </optgroup>
            <optgroup label="Scudi">
              {n.SHIELDS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (+{a.base}, {a.cost} mo)
                </option>
              ))}
            </optgroup>
            <optgroup label="Equipaggiamento">
              {n.GEAR.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.cost < 1 ? `${Math.round(g.cost * 10)} ma` : `${g.cost} mo`})
                </option>
              ))}
            </optgroup>
          </select>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!custom.trim()) return;
              add({ id: rid(), name: custom.trim(), slots: 1, qty: 1 });
              setCustom('');
            }}
          >
            <input className="input grow" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Oggetto libero…" aria-label="Oggetto libero" />
            <button className="btn sm" type="submit">
              <Plus size={12} /> Aggiungi
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Eroe */

const BONUS_LABELS: [keyof C['bonus'], string][] = [
  ['armor', 'Armatura'],
  ['speed', 'Velocità'],
  ['initiative', 'Iniziativa'],
  ['hp', 'PF massimi'],
  ['mana', 'Mana'],
  ['wounds', 'Ferite massime'],
];

function NotesTab({ c, set, editable }: { c: C; set: Set; editable: boolean }) {
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Motivazione">{editable ? <input className="input" value={c.motivation} onChange={(e) => set({ motivation: e.target.value })} aria-label="Motivazione" /> : <span className="small">{c.motivation || '—'}</span>}</Section>
      <Section title="Lingue">
        {editable ? (
          <div className="row wrap" style={{ gap: 4 }}>
            {n.LANGUAGES.map((l) => (
              <button key={l.name} className={`chip sm ${c.languages.includes(l.name) ? 'on' : ''}`} title={l.who} onClick={() => set({ languages: c.languages.includes(l.name) ? c.languages.filter((x) => x !== l.name) : [...c.languages, l.name] })}>
                {l.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="small">{c.languages.join(', ') || '—'}</span>
        )}
      </Section>
      {editable && (
        <Section title="Correzioni a mano">
          <div className="free-fields">
            {BONUS_LABELS.map(([k, label]) => (
              <label key={k} className="free-field">
                <span>{label}</span>
                <input className="input num" type="number" value={c.bonus[k]} onChange={(e) => set({ bonus: { ...c.bonus, [k]: Number(e.target.value) || 0 } })} aria-label={`Correzione ${label}`} />
              </label>
            ))}
          </div>
          <span className="faint tiny">Per oggetti magici, doni e tutto ciò che la scheda non conosce.</span>
        </Section>
      )}
      <Section title="Note">{editable ? <textarea className="input" rows={5} value={c.notes} onChange={(e) => set({ notes: e.target.value })} aria-label="Note" /> : <p className="small pre">{c.notes || '—'}</p>}</Section>
    </div>
  );
}

/* ------------------------------------------------------- Livello e riposi */

function LevelUpModal({ c, table, onClose, onConfirm }: { c: C; table?: SheetTable; onClose: () => void; onConfirm: (next: C) => void }) {
  const next = c.level + 1;
  const die = n.hitDie(c);
  const inc = n.statIncreaseAt(c, next);
  const [hpRoll, setHpRoll] = useState<number | null>(null);
  const [stats, setStats] = useState<n.StatId[]>([]);
  const need = inc ? (inc.kind === 'any2' ? 2 : 1) : 0;
  const features = n.featuresUpTo({ ...c, level: next }).filter((f) => f.level === next);
  const toggle = (s: n.StatId) => setStats(stats.includes(s) ? stats.filter((x) => x !== s) : need === 1 ? [s] : stats.length < need ? [...stats, s] : stats);
  return (
    <Modal
      title={`Livello ${next}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" disabled={hpRoll === null || stats.length < need} onClick={() => onConfirm(n.levelUp(c, hpRoll!, stats))}>
            Sali di livello
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 'var(--s4)' }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="small grow">PF massimi: tira il Dado Vita (d{die}) con vantaggio.</span>
          <button
            className="btn sm"
            onClick={async () => {
              const r = await rollDice(`2d${die}kh1`, `Dado Vita per il livello ${next}`, table);
              setHpRoll(Math.max(...r, 1));
            }}
          >
            <Dices size={13} /> Tira 2d{die}
          </button>
          <input className="input num" type="number" min={1} max={die} value={hpRoll ?? ''} onChange={(e) => setHpRoll(Math.max(1, Math.min(die, Number(e.target.value) || 1)))} style={{ width: 60 }} aria-label="Risultato del Dado Vita" />
        </div>
        <span className="small muted">Ottieni anche 1 Dado Vita e 1 punto abilità.</span>
        {inc && (
          <div className="col" style={{ gap: 6 }}>
            <span className="small">{inc.kind === 'key' ? '+1 a una caratteristica chiave:' : inc.kind === 'secondary' ? '+1 a una caratteristica secondaria:' : '+1 a due caratteristiche qualsiasi:'}</span>
            <div className="row wrap" style={{ gap: 4 }}>
              {inc.stats.map((s) => (
                <button key={s} className={`chip ${stats.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)}>
                  {STAT_INFO[s].name} {n.fmt(c.stats[s])}
                </button>
              ))}
            </div>
          </div>
        )}
        {features.length > 0 && (
          <div className="col" style={{ gap: 4 }}>
            <b className="small">Nuovi privilegi</b>
            {features.map((f) => (
              <span key={f.name} className="small">
                <b>{f.name}.</b> {f.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function FieldRestModal({ c, table, onClose, onConfirm }: { c: C; table?: SheetTable; onClose: () => void; onConfirm: (next: C) => void }) {
  const left = n.maxHitDice(c) - c.hitDiceSpent;
  const die = n.hitDie(c);
  const [count, setCount] = useState(1);
  const [camp, setCamp] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Riposo sul campo"
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn primary"
            disabled={busy || count < 1}
            onClick={async () => {
              setBusy(true);
              const rolled = camp ? Array<number>(count).fill(die) : await rollDice(`${count}d${die}`, 'Riposo sul campo', table);
              onConfirm(n.fieldRest(c, rolled, camp).character);
            }}
          >
            {camp ? 'Accampati' : `Tira ${count}d${die}`}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 'var(--s3)' }}>
        <span className="small">
          Dadi Vita disponibili: {left} (d{die}). Ognuno cura il risultato + FOR ({n.fmt(c.stats.str)}).
        </span>
        <label className="row small">
          <span className="grow">Quanti ne spendi</span>
          <input className="input num" type="number" min={1} max={left} value={count} onChange={(e) => setCount(Math.max(1, Math.min(left, Number(e.target.value) || 1)))} style={{ width: 60 }} aria-label="Dadi Vita da spendere" />
        </label>
        <label className="row small">
          <Switch on={camp} onChange={setCamp} label="Accamparsi" />
          <span>Accamparsi (8 ore con cibo e sonno): ogni dado vale il massimo</span>
        </label>
      </div>
    </Modal>
  );
}

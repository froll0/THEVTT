import { roll, type ChatCard } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { ArrowUpCircle, Dices, Heart, MessageSquareShare, Minus, Moon, Plus, Shield, Skull, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { Modal, Section, Switch } from '../../components/ui';
import type { SheetProps } from '..';
import { DetailsEditor, InventoryEditor } from './editors';

type C = dnd5e.Dnd5eCharacter;
const { ABILITIES, ABILITY_LABELS, SKILLS, SKILL_IDS, SCHOOLS } = dnd5e;
const d20 = (b: number) => `1d20${b >= 0 ? '+' : ''}${b}`;
const addDice = (base: string, extra: string | undefined, times: number) => (extra && times > 0 ? `${base}+${Array(times).fill(extra).join('+')}` : base);

type Tab = 'main' | 'combat' | 'spells' | 'features' | 'inventory' | 'details';
type Share = ((card: ChatCard) => void) | undefined;

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

/** Chat card for a spell, with the rolls it needs at the given caster's numbers. */
function spellCard(c: C, sc: dnd5e.Spellcasting, s: dnd5e.SpellDef): ChatCard {
  const castMod = dnd5e.abilityMod(c, sc.ability);
  const rolls: ChatCard['rolls'] = [];
  if (s.attack) rolls.push({ label: 'Attacco', formula: d20(sc.attack) });
  const dmg = s.level === 0 ? dnd5e.cantripDice(c, s) : s.damage;
  if (dmg) rolls.push({ label: 'Danni', formula: s.addMod ? `${dmg}+${castMod}` : dmg });
  if (s.heal) rolls.push({ label: 'Cura', formula: s.addMod ? `${s.heal}+${castMod}` : s.heal });
  return {
    title: s.name,
    subtitle: `${s.level === 0 ? 'Trucchetto' : `${s.level}° livello`} · ${SCHOOLS[s.school]}${s.concentration ? ' · concentrazione' : ''}${s.ritual ? ' · rituale' : ''}${s.save ? ` · TS ${ABILITY_LABELS[s.save].name} CD ${sc.saveDc}` : ''}`,
    tags: [s.time, s.range, s.components, s.duration],
    body: s.description + (s.upcast && s.level > 0 ? `\n\nAi livelli superiori: +${s.upcast} per ogni livello dello slot sopra il ${s.level}°.` : ''),
    rolls,
  };
}

export function Dnd5eSheet({ data, editable, onChange, onRoll, onShare, compact }: SheetProps<C> & { compact?: boolean }) {
  const c = dnd5e.normalize(data);
  const set = (patch: Partial<C>) => onChange({ ...c, ...patch });
  const sc = dnd5e.spellcasting(c);
  const [tab, setTab] = useState<Tab>('main');
  const [delta, setDelta] = useState(1);
  const [levelUp, setLevelUp] = useState(false);
  const [resting, setResting] = useState(false);
  const cls = dnd5e.getClass(c);
  const sub = dnd5e.getSubclass(c);
  const max = dnd5e.maxHp(c);
  const hp = dnd5e.currentHp(c);
  const todo = editable ? dnd5e.pending(c) : [];

  const setHp = (current: number, temp = c.hp.temp) => set({ hp: { current: current >= max ? null : Math.max(0, current), temp: Math.max(0, temp) } });
  const damage = (n: number) => {
    const fromTemp = Math.min(c.hp.temp, n);
    setHp(hp - (n - fromTemp), c.hp.temp - fromTemp);
  };

  const tabs: { id: Tab; label: string; show?: boolean }[] = [
    { id: 'main', label: 'Principale' },
    { id: 'combat', label: 'Combattimento' },
    { id: 'spells', label: 'Incantesimi', show: !!sc },
    { id: 'features', label: 'Privilegi' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'details', label: 'Personaggio' },
  ];

  return (
    <div className="sheet">
      <div className="sheet-head">
        <div className="portrait" style={{ width: compact ? 44 : 64, height: compact ? 44 : 64, backgroundImage: c.portrait ? `url(${c.portrait})` : undefined, fontSize: 22 }}>
          {!c.portrait && (c.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className={compact ? '' : 'row'}>
            {compact ? <b>{c.name}</b> : <h2 className="ellipsis">{c.name || 'Senza nome'}</h2>}
          </div>
          <div className="muted small ellipsis">
            {dnd5e.headline(c)}
            {sub ? ` · ${sub.name}` : ''}
            {c.alignment ? ` · ${c.alignment}` : ''}
          </div>
        </div>
        {editable && c.level < 20 && cls && (
          <button className="btn sm" onClick={() => setLevelUp(true)} title="Sali di livello">
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
              <input className="input num" type="number" min={1} value={delta} onChange={(e) => setDelta(Math.max(1, Number(e.target.value) || 1))} style={{ width: 58, height: 28 }} />
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
      </div>

      {hp === 0 && (
        <div className="callout warn" style={{ flexDirection: 'column' }}>
          <div className="row between">
            <span className="row small">
              <Skull size={14} /> Tiri salvezza contro morte
            </span>
            <button className="btn sm" onClick={() => onRoll('1d20', 'Tiro salvezza contro morte')}>
              Tira
            </button>
          </div>
          {(['successes', 'failures'] as const).map((k) => (
            <div className="row small" key={k}>
              <span className="grow muted">{k === 'successes' ? 'Successi' : 'Fallimenti'}</span>
              <span className="pips">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    disabled={!editable}
                    className={`pip ${c.deathSaves[k] > i ? (k === 'successes' ? 'ok' : 'ko') : ''}`}
                    onClick={() => set({ deathSaves: { ...c.deathSaves, [k]: c.deathSaves[k] > i ? i : i + 1 } })}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="stat-row">
        <div className="stat">
          <small>
            <Shield size={10} /> CA
          </small>
          <b>{dnd5e.armorClass(c)}</b>
        </div>
        <button className="stat" onClick={() => onRoll(d20(dnd5e.initiativeBonus(c)), 'Iniziativa')}>
          <small>Iniziativa</small>
          <b>{dnd5e.fmtMod(dnd5e.initiativeBonus(c))}</b>
        </button>
        <div className="stat">
          <small>Velocità</small>
          <b>{dnd5e.fmtMeters(dnd5e.speed(c))}</b>
        </div>
        <div className="stat">
          <small>Competenza</small>
          <b>{dnd5e.fmtMod(dnd5e.proficiencyBonus(c.level))}</b>
        </div>
        {!compact && (
          <div className="stat">
            <small>Perc. passiva</small>
            <b>{dnd5e.passivePerception(c)}</b>
          </div>
        )}
        <div className="stat">
          <small>Dadi vita</small>
          <b className="small">
            {c.level - c.hitDiceUsed}/{c.level} d{cls?.hitDie ?? '?'}
          </b>
        </div>
      </div>
      <div className="row wrap small" style={{ gap: 'var(--s4)' }}>
        <label className="row">
          <Switch on={c.inspiration} onChange={(inspiration) => editable && set({ inspiration })} label="Ispirazione eroica" />
          <Sparkles size={13} className="muted" /> Ispirazione
        </label>
        <label className="row">
          <span className="muted">Indebolimento</span>
          <select className="select" style={{ width: 60, height: 26 }} disabled={!editable} value={c.exhaustion} onChange={(e) => set({ exhaustion: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {dnd5e.darkvision(c) > 0 && <span className="muted">Scurovisione {dnd5e.fmtMeters(dnd5e.darkvision(c))}</span>}
      </div>

      <div className="sheet-tabs">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
      </div>

      {tab === 'main' && <MainTab c={c} onRoll={onRoll} />}
      {tab === 'combat' && <CombatTab c={c} editable={editable} set={set} onRoll={onRoll} onShare={onShare} onRest={() => setResting(true)} onLongRest={() => onChange(dnd5e.longRest(c))} />}
      {tab === 'spells' && sc && <SpellsTab c={c} sc={sc} editable={editable} set={set} onRoll={onRoll} onShare={onShare} />}
      {tab === 'features' && <FeaturesTab c={c} onShare={onShare} />}
      {tab === 'inventory' && <InventoryEditor c={c} set={set} readOnly={!editable} onShare={onShare} />}
      {tab === 'details' && (editable && !compact ? <DetailsEditor c={c} set={set} /> : <DetailsView c={c} />)}

      {levelUp && <LevelUpModal c={c} onClose={() => setLevelUp(false)} onConfirm={(r) => { onChange(dnd5e.levelUp(c, r)); setLevelUp(false); }} />}
      {resting && <ShortRestModal c={c} onClose={() => setResting(false)} onConfirm={(dice, healed) => { onChange(dnd5e.shortRest(c, dice, healed)); setResting(false); }} />}
    </div>
  );
}

function MainTab({ c, onRoll }: { c: C; onRoll: (f: string, l: string) => void }) {
  const profs = dnd5e.skillProficiencies(c);
  const cls = dnd5e.getClass(c);
  const armor = [...dnd5e.armorTraining(c)].map((a) => ({ light: 'leggere', medium: 'medie', heavy: 'pesanti', shield: 'scudi' })[a]);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="ab-grid">
        {ABILITIES.map((a) => {
          const m = dnd5e.abilityMod(c, a);
          const save = dnd5e.saveBonus(c, a);
          const prof = dnd5e.saveProficient(c, a);
          return (
            <div key={a} className="ab">
              <button onClick={() => onRoll(d20(m - 2 * c.exhaustion), `Prova di ${ABILITY_LABELS[a].name}`)} title="Prova di caratteristica">
                <small>{ABILITY_LABELS[a].short}</small>
                <b>{dnd5e.fmtMod(m)}</b>
                <span className="score">{dnd5e.abilityScore(c, a)}</span>
              </button>
              <button className={`save ${prof ? 'prof' : ''}`} onClick={() => onRoll(d20(save), `TS su ${ABILITY_LABELS[a].name}`)} title="Tiro salvezza">
                TS {dnd5e.fmtMod(save)}
              </button>
            </div>
          );
        })}
      </div>
      <Section title="Abilità">
        <div className="rows">
          {SKILL_IDS.map((s) => {
            const b = dnd5e.skillBonus(c, s);
            const exp = c.expertise.includes(s);
            return (
              <button key={s} className="r" onClick={() => onRoll(d20(b), SKILLS[s].name)}>
                <span className={`dot ${exp ? 'exp' : profs.has(s) ? 'prof' : ''}`} title={exp ? 'Maestria' : profs.has(s) ? 'Competente' : undefined} />
                <span className="grow ellipsis">{SKILLS[s].name}</span>
                <span className="faint tiny">{ABILITY_LABELS[SKILLS[s].ability].short}</span>
                <b>{dnd5e.fmtMod(b)}</b>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Competenze">
        <div className="rows small">
          <div className="r">
            <span className="muted" style={{ width: 90 }}>Armature</span>
            <span>{armor.length ? armor.join(', ') : 'nessuna'}</span>
          </div>
          <div className="r">
            <span className="muted" style={{ width: 90 }}>Armi</span>
            <span>
              semplici
              {cls?.martial === true || dnd5e.hasChoice(c, 'divineOrder', 'protector') || dnd5e.hasChoice(c, 'primalOrder', 'warden')
                ? ' e da guerra'
                : cls?.martial === 'finesseOrLight'
                  ? ', da guerra accurate o leggere'
                  : cls?.martial === 'light'
                    ? ', da guerra leggere'
                    : ''}
            </span>
          </div>
          {(cls?.tools || dnd5e.getBackground(c)?.tool) && (
            <div className="r">
              <span className="muted" style={{ width: 90 }}>Strumenti</span>
              <span>{[cls?.tools, dnd5e.getBackground(c)?.tool].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="r">
            <span className="muted" style={{ width: 90 }}>Lingue</span>
            <span>{c.languages.join(', ') || '—'}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function CombatTab({
  c,
  editable,
  set,
  onRoll,
  onShare,
  onRest,
  onLongRest,
}: {
  c: C;
  editable: boolean;
  set: (p: Partial<C>) => void;
  onRoll: (f: string, l: string) => void;
  onShare: Share;
  onRest: () => void;
  onLongRest: () => void;
}) {
  const attacks = dnd5e.attacks(c);
  const res = dnd5e.resources(c);
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <Section title="Attacchi">
        <div>
          {attacks.map((a) => (
            <div key={a.id} className="attack">
              <div className="row" style={{ gap: 2, minWidth: 0 }}>
                <b className="ellipsis">{a.name}</b>
                <ShareButton
                  onShare={onShare}
                  card={() => ({
                    title: a.name,
                    subtitle: `${a.damageType} · ${a.range}${a.versatile ? ` · a due mani ${a.versatile}` : ''}`,
                    body: a.mastery ? `Maestria ${a.mastery.name}: ${a.mastery.description}` : undefined,
                    rolls: [
                      { label: 'Attacco', formula: d20(a.bonus) },
                      { label: 'Danni', formula: a.damage },
                    ],
                  })}
                />
              </div>
              <button className="btn sm" onClick={() => onRoll(d20(a.bonus), `${a.name} · attacco`)}>
                {dnd5e.fmtMod(a.bonus)}
              </button>
              <button className="btn sm" onClick={() => onRoll(a.damage, `${a.name} · danni ${a.damageType}`)} title={a.versatile ? `A due mani: ${a.versatile}` : undefined}>
                {a.damage}
              </button>
              <div className="meta">
                {a.damageType} · {a.range}
                {a.versatile ? ` · a due mani ${a.versatile}` : ''}
                {a.mastery && (
                  <span title={a.mastery.description}>
                    {' '}
                    · maestria: <b>{a.mastery.name}</b>
                  </span>
                )}
                {a.notes.includes('non competente') && <span style={{ color: 'var(--warning)' }}> · non competente</span>}
              </div>
            </div>
          ))}
        </div>
      </Section>
      {res.length > 0 && (
        <Section title="Risorse">
          <div className="rows">
            {res.map((r) => (
              <div key={r.id} className="r">
                <span className="grow">
                  {r.name}
                  {r.die ? <span className="faint small"> · {r.die}</span> : null}
                </span>
                {r.max > 0 && r.max <= 12 ? (
                  <span className="pips">
                    {Array.from({ length: r.max }, (_, i) => (
                      <button
                        key={i}
                        disabled={!editable}
                        className={`pip ${i < r.used ? 'used' : ''}`}
                        title={i < r.used ? 'Usato' : 'Disponibile'}
                        onClick={() => set({ resourcesUsed: { ...c.resourcesUsed, [r.id]: i < r.used ? i : i + 1 } })}
                      />
                    ))}
                  </span>
                ) : r.max > 12 ? (
                  <span className="row small" style={{ gap: 4 }}>
                    <input
                      className="input num"
                      style={{ width: 60, height: 26 }}
                      type="number"
                      disabled={!editable}
                      value={r.max - r.used}
                      onChange={(e) => set({ resourcesUsed: { ...c.resourcesUsed, [r.id]: Math.max(0, Math.min(r.max, r.max - (Number(e.target.value) || 0))) } })}
                    />
                    <span className="faint">/ {r.max}</span>
                  </span>
                ) : null}
                <span className="faint tiny" style={{ width: 44, textAlign: 'right' }}>
                  {r.max > 0 ? (r.recharge === 'short' ? 'r. breve' : 'r. lungo') : ''}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {editable && (
        <div className="row">
          <button className="btn sm" onClick={onRest}>
            <Sun size={14} /> Riposo breve
          </button>
          <button className="btn sm" onClick={onLongRest}>
            <Moon size={14} /> Riposo lungo
          </button>
        </div>
      )}
    </div>
  );
}

function SpellsTab({
  c,
  sc,
  editable,
  set,
  onRoll,
  onShare,
}: {
  c: C;
  sc: dnd5e.Spellcasting;
  editable: boolean;
  set: (p: Partial<C>) => void;
  onRoll: (f: string, l: string) => void;
  onShare: Share;
}) {
  const spells = dnd5e.knownSpells(c);
  const always = new Set(dnd5e.alwaysPrepared(c));
  const levels = [...new Set(spells.map((s) => s.level))].sort((a, b) => a - b);
  const castMod = dnd5e.abilityMod(c, sc.ability);

  const slotsLeft = (lvl: number) => (sc.pact ? (lvl <= sc.pact.level ? sc.pact.count - c.pactSlotsUsed : 0) : (sc.slots[lvl - 1] ?? 0) - (c.spellSlotsUsed[lvl - 1] ?? 0));
  const lowestSlot = (lvl: number) => {
    if (sc.pact) return slotsLeft(sc.pact.level) > 0 && lvl <= sc.pact.level ? sc.pact.level : null;
    for (let l = lvl; l <= sc.slots.length; l++) if (slotsLeft(l) > 0) return l;
    return null;
  };

  const cast = (s: dnd5e.SpellDef, slot: number | null) => {
    if (s.level > 0 && slot) {
      if (sc.pact) set({ pactSlotsUsed: c.pactSlotsUsed + 1 });
      else set({ spellSlotsUsed: c.spellSlotsUsed.map((u, i) => (i === slot - 1 ? u + 1 : u)) });
    }
    const up = slot ? slot - s.level : 0;
    const label = `${s.name}${slot && slot > s.level ? ` (${slot}°)` : ''}`;
    if (s.attack) onRoll(d20(sc.attack), `${label} · attacco con incantesimo`);
    const dmg = s.level === 0 ? dnd5e.cantripDice(c, s) : s.damage ? addDice(s.damage, s.upcast, up) : undefined;
    if (dmg) onRoll(s.addMod ? `${dmg}+${castMod}` : dmg, `${label} · danni${s.save ? ` (TS ${ABILITY_LABELS[s.save].short} CD ${sc.saveDc})` : ''}`);
    if (s.heal) onRoll(s.addMod ? `${addDice(s.heal, s.upcast, up)}+${castMod}` : addDice(s.heal, s.upcast, up), `${label} · cura`);
    if (!s.attack && !dmg && !s.heal) onRoll('0', `${label}${s.save ? ` · TS ${ABILITY_LABELS[s.save].name} CD ${sc.saveDc}` : ' · lanciato'}`);
  };

  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      <div className="stat-row">
        <div className="stat">
          <small>CD</small>
          <b>{sc.saveDc}</b>
        </div>
        <button className="stat" onClick={() => onRoll(d20(sc.attack), 'Attacco con incantesimo')}>
          <small>Attacco</small>
          <b>{dnd5e.fmtMod(sc.attack)}</b>
        </button>
        <div className="stat">
          <small>Caratteristica</small>
          <b>{ABILITY_LABELS[sc.ability].short}</b>
        </div>
      </div>
      <Section title={sc.pact ? 'Slot del patto (riposo breve)' : 'Slot incantesimo'}>
        <div className="rows">
          {sc.pact ? (
            <div className="r">
              <span className="grow">{sc.pact.level}° livello</span>
              <span className="pips">
                {Array.from({ length: sc.pact.count }, (_, i) => (
                  <button key={i} disabled={!editable} className={`pip ${i < c.pactSlotsUsed ? 'used' : ''}`} onClick={() => set({ pactSlotsUsed: i < c.pactSlotsUsed ? i : i + 1 })} />
                ))}
              </span>
            </div>
          ) : (
            sc.slots.map((n, idx) => (
              <div key={idx} className="r">
                <span className="grow">{idx + 1}° livello</span>
                <span className="pips">
                  {Array.from({ length: n }, (_, i) => (
                    <button
                      key={i}
                      disabled={!editable}
                      className={`pip ${i < (c.spellSlotsUsed[idx] ?? 0) ? 'used' : ''}`}
                      onClick={() => set({ spellSlotsUsed: c.spellSlotsUsed.map((u, j) => (j === idx ? (i < u ? i : i + 1) : u)) })}
                    />
                  ))}
                </span>
              </div>
            ))
          )}
        </div>
      </Section>
      {levels.map((lvl) => (
        <Section key={lvl} title={lvl === 0 ? 'Trucchetti' : `${lvl}° livello`}>
          <div>
            {spells
              .filter((s) => s.level === lvl)
              .map((s) => {
                const slot = s.level === 0 ? null : lowestSlot(s.level);
                return (
                  <details key={s.id} className="spell">
                    <summary>
                      <span className="grow">
                        {s.name}
                        {always.has(s.id) && <span className="faint tiny"> · sempre preparato</span>}
                      </span>
                      {s.concentration && <span className="tag" title="Concentrazione">C</span>}
                      {s.ritual && <span className="tag" title="Rituale">R</span>}
                      <ShareButton onShare={onShare} card={() => spellCard(c, sc, s)} />
                      <button
                        className="btn sm"
                        disabled={!editable || (s.level > 0 && !slot)}
                        title={s.level > 0 && !slot ? 'Nessuno slot disponibile' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          cast(s, slot);
                        }}
                      >
                        Lancia{slot && slot > s.level ? ` (${slot}°)` : ''}
                      </button>
                    </summary>
                    <div className="body">
                      <div className="faint tiny">
                        {SCHOOLS[s.school]} · {s.time} · {s.range} · {s.components} · {s.duration}
                      </div>
                      {s.description}
                      {s.upcast && s.level > 0 && <div className="faint tiny">Ai livelli superiori: +{s.upcast} per ogni livello dello slot sopra il {s.level}°.</div>}
                    </div>
                  </details>
                );
              })}
          </div>
        </Section>
      ))}
      {spells.length === 0 && <p className="muted small">Nessun incantesimo preparato. Sceglili dalla pagina del personaggio.</p>}
    </div>
  );
}

function FeaturesTab({ c, onShare }: { c: C; onShare: Share }) {
  const list = dnd5e.features(c);
  const groups = [...new Set(list.map((f) => f.source))];
  return (
    <div className="col" style={{ gap: 'var(--s4)' }}>
      {groups.map((g) => (
        <Section key={g} title={g}>
          <div>
            {list
              .filter((f) => f.source === g)
              .map((f, i) => (
                <details key={f.name + i} className="feature">
                  <summary>
                    <span className="grow">{f.name}</span>
                    {f.level > 1 && <span className="faint tiny">{f.level}°</span>}
                    <ShareButton onShare={onShare} card={() => ({ title: f.name, subtitle: f.source, body: f.description })} />
                  </summary>
                  <p>{f.description}</p>
                </details>
              ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

function DetailsView({ c }: { c: C }) {
  const d = c.details;
  const phys = [
    ['Età', d.age],
    ['Altezza', d.height],
    ['Peso', d.weight],
    ['Occhi', d.eyes],
    ['Capelli', d.hair],
    ['Carnagione', d.skin],
  ].filter(([, v]) => v);
  const blocks: [string, string][] = [
    ['Aspetto', d.appearance],
    ['Tratti', d.traits],
    ['Ideali', d.ideals],
    ['Legami', d.bonds],
    ['Difetti', d.flaws],
    ['Storia', d.backstory],
    ['Alleati', d.allies],
    ['Note', d.notes],
  ];
  return (
    <div className="col selectable" style={{ gap: 'var(--s3)' }}>
      {phys.length > 0 && <p className="muted small">{phys.map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
      {blocks
        .filter(([, v]) => v.trim())
        .map(([k, v]) => (
          <Section key={k} title={k}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{v}</p>
          </Section>
        ))}
      {!phys.length && !blocks.some(([, v]) => v.trim()) && <p className="muted small">Nessun dettaglio ancora.</p>}
    </div>
  );
}

function LevelUpModal({ c, onClose, onConfirm }: { c: C; onClose: () => void; onConfirm: (hpRoll: number | null) => void }) {
  const cls = dnd5e.getClass(c)!;
  const next = c.level + 1;
  const [rolled, setRolled] = useState<number | null>(null);
  const avg = dnd5e.averageHitDie(cls.hitDie);
  const con = dnd5e.abilityMod(c, 'con');
  const extra = dnd5e.getSpecies(c)?.hpPerLevel ?? 0;
  const gained = [...cls.features.filter((f) => f.level === next), ...(dnd5e.getSubclass(c)?.features.filter((f) => f.level === next) ?? [])];
  const preview = { ...c, level: next };
  const notes: string[] = [];
  if (next === cls.subclassLevel) notes.push(`Scegli ${cls.subclassLabel.toLowerCase()}`);
  if (cls.asiLevels.includes(next)) notes.push('Aumento dei punteggi di caratteristica o talento');
  const scNow = dnd5e.spellcasting(c);
  const scNext = dnd5e.spellcasting(preview);
  if (scNow && scNext) {
    if (scNext.prepared > scNow.prepared) notes.push(`+${scNext.prepared - scNow.prepared} incantesimi preparati`);
    if (scNext.cantripsKnown > scNow.cantripsKnown) notes.push(`+${scNext.cantripsKnown - scNow.cantripsKnown} trucchetti`);
    if (scNext.maxSpellLevel > scNow.maxSpellLevel) notes.push(`Incantesimi di ${scNext.maxSpellLevel}° livello`);
  }
  if (dnd5e.masteryCount(preview) > dnd5e.masteryCount(c)) notes.push('Una maestria nelle armi in più');
  if (dnd5e.proficiencyBonus(next) > dnd5e.proficiencyBonus(c.level)) notes.push(`Bonus di competenza ${dnd5e.fmtMod(dnd5e.proficiencyBonus(next))}`);

  return (
    <Modal
      title={`${cls.name} di ${next}° livello`}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={() => onConfirm(rolled)}>
            Sali di livello
          </button>
        </>
      }
    >
      <div className="col">
        <span className="section-title">Punti ferita</span>
        <div className="row wrap">
          <button className={`chip ${rolled === null ? 'on' : ''}`} onClick={() => setRolled(null)}>
            Valore medio: {avg} + {con + extra} = {Math.max(1, avg + con + extra)}
          </button>
          <button className={`chip ${rolled !== null ? 'on' : ''}`} onClick={() => setRolled(roll(`1d${cls.hitDie}`).total)}>
            <Dices size={13} /> {rolled !== null ? `Tirato: ${rolled} + ${con + extra} = ${Math.max(1, rolled + con + extra)}` : `Tira 1d${cls.hitDie}`}
          </button>
        </div>
      </div>
      {gained.length > 0 && (
        <div className="col">
          <span className="section-title">Nuovi privilegi</span>
          {gained.map((f) => (
            <div key={f.name} className="small">
              <b>{f.name}.</b> <span className="muted">{f.description}</span>
            </div>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="col">
          <span className="section-title">Da scegliere o aggiornare</span>
          {notes.map((n) => (
            <span key={n} className="small">
              • {n}
            </span>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ShortRestModal({ c, onClose, onConfirm }: { c: C; onClose: () => void; onConfirm: (dice: number, healed: number) => void }) {
  const cls = dnd5e.getClass(c)!;
  const available = c.level - c.hitDiceUsed;
  const [dice, setDice] = useState(Math.min(1, available));
  const [healed, setHealed] = useState<number | null>(null);
  const con = dnd5e.abilityMod(c, 'con');
  return (
    <Modal
      title="Riposo breve"
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={() => onConfirm(healed === null ? 0 : dice, healed ?? 0)}>
            Riposa
          </button>
        </>
      }
    >
      <p className="muted small">Spendi dadi vita per recuperare punti ferita. Le risorse che si ricaricano con il riposo breve tornano disponibili.</p>
      <div className="row">
        <span className="small">Dadi vita (d{cls.hitDie}) da spendere</span>
        <input className="input num" type="number" min={0} max={available} value={dice} style={{ width: 70 }} onChange={(e) => { setDice(Math.max(0, Math.min(available, Number(e.target.value) || 0))); setHealed(null); }} />
        <span className="faint small">disponibili {available}</span>
      </div>
      {dice > 0 && (
        <div className="row">
          <button
            className="btn sm"
            onClick={() => {
              const formula = `${dice}d${cls.hitDie}${con ? (con > 0 ? `+${con * dice}` : `${con * dice}`) : ''}`;
              const r = roll(formula);
              setHealed(Math.max(0, r.total));
            }}
          >
            Tira {dice}d{cls.hitDie}
            {con ? ` ${con > 0 ? '+' : ''}${con * dice}` : ''}
          </button>
          {healed !== null && <b>Recuperi {healed} PF</b>}
        </div>
      )}
    </Modal>
  );
}

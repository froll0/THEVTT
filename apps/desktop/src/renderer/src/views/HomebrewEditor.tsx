import type { Campaign } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field, Modal, Switch } from '../components/ui';
import { useApp } from '../store/app';

type Tab = 'spells' | 'feats' | 'subclasses' | 'items';
const TABS: { id: Tab; label: string }[] = [
  { id: 'spells', label: 'Incantesimi' },
  { id: 'feats', label: 'Talenti' },
  { id: 'subclasses', label: 'Sottoclassi' },
  { id: 'items', label: 'Oggetti magici' },
];

const rid = () => `${dnd5e.HOMEBREW_ID}${Math.random().toString(36).slice(2, 10)}`;
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_NAMES: Record<(typeof ABILITIES)[number], string> = { str: 'Forza', dex: 'Destrezza', con: 'Costituzione', int: 'Intelligenza', wis: 'Saggezza', cha: 'Carisma' };

/**
 * GM: the campaign's own D&D content. Saved with the campaign, so the
 * players' sheets and builder see it too.
 */
export function HomebrewEditor({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { api, run, upsertCampaign } = useApp();
  const [hb, setHb] = useState<dnd5e.DndHomebrew>(() => dnd5e.cleanHomebrew(campaign.homebrew ?? {}));
  const [tab, setTab] = useState<Tab>('spells');
  const [open, setOpen] = useState<string | null>(null);
  const save = () =>
    run(async () => {
      upsertCampaign(await api.updateCampaign(campaign.id, { homebrew: dnd5e.cleanHomebrew(hb) }));
      onClose();
    }, 'Homebrew salvato: i giocatori lo vedono nelle loro schede');

  const list: { id: string; name: string; sub: string }[] =
    tab === 'spells'
      ? hb.spells.map((s) => ({ id: s.id, name: s.name, sub: s.level ? `livello ${s.level}` : 'trucchetto' }))
      : tab === 'feats'
        ? hb.feats.map((f) => ({ id: f.id, name: f.name, sub: f.category }))
        : tab === 'subclasses'
          ? hb.subclasses.map((e) => ({ id: e.subclass.id, name: e.subclass.name, sub: dnd5e.classById(e.classId)?.name ?? '' }))
          : hb.items.map((i) => ({ id: i.id, name: i.name, sub: i.magicBonus ? `+${i.magicBonus}` : `${i.cost} mo` }));

  const add = () => {
    const id = rid();
    if (tab === 'spells') setHb({ ...hb, spells: [...hb.spells, { id, name: 'Nuovo incantesimo', level: 1, school: 'evo', classes: [], time: '1 azione', range: '18 m', components: 'V, S', duration: 'Istantanea', concentration: false, ritual: false, description: '' }] });
    if (tab === 'feats') setHb({ ...hb, feats: [...hb.feats, { id, name: 'Nuovo talento', category: 'general', level: 4, description: '' }] });
    if (tab === 'subclasses') setHb({ ...hb, subclasses: [...hb.subclasses, { classId: 'fighter', subclass: { id, name: 'Nuova sottoclasse', description: '', features: [{ level: 3, name: '', description: '' }] } }] });
    if (tab === 'items') setHb({ ...hb, items: [...hb.items, { id, name: 'Nuovo oggetto', weight: 1, cost: 100, description: '' }] });
    setOpen(id);
  };
  const remove = (id: string) => {
    setHb({ spells: hb.spells.filter((x) => x.id !== id), feats: hb.feats.filter((x) => x.id !== id), subclasses: hb.subclasses.filter((x) => x.subclass.id !== id), items: hb.items.filter((x) => x.id !== id) });
    setOpen(null);
  };

  const spell = hb.spells.find((s) => s.id === open);
  const feat = hb.feats.find((f) => f.id === open);
  const sub = hb.subclasses.find((e) => e.subclass.id === open);
  const item = hb.items.find((i) => i.id === open);
  const setSpell = (p: Partial<dnd5e.SpellDef>) => setHb({ ...hb, spells: hb.spells.map((s) => (s.id === open ? { ...s, ...p } : s)) });
  const setFeat = (p: Partial<dnd5e.FeatDef>) => setHb({ ...hb, feats: hb.feats.map((f) => (f.id === open ? { ...f, ...p } : f)) });
  const setSub = (p: Partial<(typeof hb.subclasses)[number]>) => setHb({ ...hb, subclasses: hb.subclasses.map((e) => (e.subclass.id === open ? { ...e, ...p } : e)) });
  const setItem = (p: Partial<dnd5e.HomebrewItem>) => setHb({ ...hb, items: hb.items.map((i) => (i.id === open ? { ...i, ...p } : i)) });

  return (
    <Modal
      title="Homebrew della campagna"
      wide
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={save}>
            Salva
          </button>
        </>
      }
    >
      <div className="seg" role="tablist" aria-label="Tipo di homebrew">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => (setTab(t.id), setOpen(null))}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="homebrew">
        <div className="col homebrew-list" style={{ gap: 4 }}>
          <button className="btn sm" onClick={add}>
            <Plus size={14} /> Nuovo
          </button>
          {list.map((x) => (
            <button key={x.id} className={`ghost-row col ${open === x.id ? 'active' : ''}`} onClick={() => setOpen(x.id)}>
              <b className="ellipsis">{x.name}</b>
              <span className="faint tiny">{x.sub}</span>
            </button>
          ))}
          {!list.length && <span className="faint small">Ancora niente.</span>}
        </div>
        <div className="col grow" style={{ gap: 8, minWidth: 0 }}>
          {spell && (
            <>
              <Field label="Nome">
                <input className="input" value={spell.name} onChange={(e) => setSpell({ name: e.target.value })} aria-label="Nome dell’incantesimo" />
              </Field>
              <div className="fields two">
                <Field label="Livello (0 = trucchetto)">
                  <input className="input" type="number" min={0} max={9} value={spell.level} onChange={(e) => setSpell({ level: Number(e.target.value) || 0 })} aria-label="Livello" />
                </Field>
                <Field label="Scuola">
                  <select className="select" value={spell.school} onChange={(e) => setSpell({ school: e.target.value as dnd5e.SpellSchool })}>
                    {Object.entries(dnd5e.SCHOOLS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tempo di lancio">
                  <input className="input" value={spell.time} onChange={(e) => setSpell({ time: e.target.value })} />
                </Field>
                <Field label="Gittata">
                  <input className="input" value={spell.range} onChange={(e) => setSpell({ range: e.target.value })} />
                </Field>
                <Field label="Componenti">
                  <input className="input" value={spell.components} onChange={(e) => setSpell({ components: e.target.value })} />
                </Field>
                <Field label="Durata">
                  <input className="input" value={spell.duration} onChange={(e) => setSpell({ duration: e.target.value })} />
                </Field>
                <Field label="Danni (es. 8d6)">
                  <input className="input" value={spell.damage ?? ''} onChange={(e) => setSpell({ damage: e.target.value || undefined })} aria-label="Danni" />
                </Field>
                <Field label="Tipo di danno">
                  <select className="select" value={spell.damageType ?? ''} onChange={(e) => setSpell({ damageType: (e.target.value || undefined) as dnd5e.DamageType | undefined })}>
                    <option value="">—</option>
                    {Object.entries(dnd5e.DAMAGE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tiro salvezza">
                  <select className="select" value={spell.save ?? ''} onChange={(e) => setSpell({ save: (e.target.value || undefined) as dnd5e.SpellDef['save'] })}>
                    <option value="">nessuno</option>
                    {ABILITIES.map((a) => (
                      <option key={a} value={a}>
                        {ABILITY_NAMES[a]}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="row small" style={{ gap: 6, alignSelf: 'end' }}>
                  <Switch on={!!spell.attack} onChange={(v) => setSpell({ attack: v || undefined })} label="Tiro per colpire" /> Tiro per colpire
                </label>
              </div>
              <div className="row wrap" style={{ gap: 10 }}>
                <label className="row small" style={{ gap: 6 }}>
                  <Switch on={spell.concentration} onChange={(v) => setSpell({ concentration: v })} label="Concentrazione" /> Concentrazione
                </label>
                <label className="row small" style={{ gap: 6 }}>
                  <Switch on={spell.ritual} onChange={(v) => setSpell({ ritual: v })} label="Rituale" /> Rituale
                </label>
              </div>
              <Field label="Classi che lo conoscono">
                <div className="row wrap" style={{ gap: 4 }}>
                  {dnd5e.CLASSES.map((c) => (
                    <button key={c.id} className={`chip ${spell.classes.includes(c.id) ? 'on' : ''}`} onClick={() => setSpell({ classes: spell.classes.includes(c.id) ? spell.classes.filter((x) => x !== c.id) : [...spell.classes, c.id] })}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Descrizione">
                <textarea className="input" rows={6} value={spell.description} onChange={(e) => setSpell({ description: e.target.value })} aria-label="Descrizione" />
              </Field>
            </>
          )}
          {feat && (
            <>
              <Field label="Nome">
                <input className="input" value={feat.name} onChange={(e) => setFeat({ name: e.target.value })} aria-label="Nome del talento" />
              </Field>
              <div className="fields two">
                <Field label="Tipo">
                  <select className="select" value={feat.category} onChange={(e) => setFeat({ category: e.target.value as dnd5e.FeatCategory })}>
                    <option value="origin">Origine</option>
                    <option value="general">Generale</option>
                    <option value="fightingStyle">Stile di combattimento</option>
                    <option value="epicBoon">Dono epico</option>
                  </select>
                </Field>
                <Field label="Livello minimo">
                  <input className="input" type="number" min={1} max={20} value={feat.level ?? 1} onChange={(e) => setFeat({ level: Number(e.target.value) || 1 })} />
                </Field>
              </div>
              <Field label="Caratteristiche che aumenta di 1">
                <div className="row wrap" style={{ gap: 4 }}>
                  {ABILITIES.map((a) => (
                    <button key={a} className={`chip ${feat.abilityIncrease?.includes(a) ? 'on' : ''}`} onClick={() => setFeat({ abilityIncrease: feat.abilityIncrease?.includes(a) ? feat.abilityIncrease.filter((x) => x !== a) : [...(feat.abilityIncrease ?? []), a] })}>
                      {ABILITY_NAMES[a]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Descrizione">
                <textarea className="input" rows={6} value={feat.description} onChange={(e) => setFeat({ description: e.target.value })} aria-label="Descrizione" />
              </Field>
            </>
          )}
          {sub && (
            <>
              <div className="fields two">
                <Field label="Nome">
                  <input className="input" value={sub.subclass.name} onChange={(e) => setSub({ subclass: { ...sub.subclass, name: e.target.value } })} aria-label="Nome della sottoclasse" />
                </Field>
                <Field label="Classe">
                  <select className="select" value={sub.classId} onChange={(e) => setSub({ classId: e.target.value })} aria-label="Classe">
                    {dnd5e.CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Descrizione">
                <textarea className="input" rows={2} value={sub.subclass.description} onChange={(e) => setSub({ subclass: { ...sub.subclass, description: e.target.value } })} />
              </Field>
              <b className="small">Privilegi</b>
              {sub.subclass.features.map((ft, i) => {
                const setFt = (p: Partial<dnd5e.Feature>) => setSub({ subclass: { ...sub.subclass, features: sub.subclass.features.map((x, j) => (j === i ? { ...x, ...p } : x)) } });
                return (
                  <div key={i} className="col homebrew-feature" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input" type="number" min={1} max={20} style={{ width: 70 }} value={ft.level} onChange={(e) => setFt({ level: Number(e.target.value) || 1 })} aria-label="Livello del privilegio" />
                      <input className="input grow" value={ft.name} placeholder="Nome del privilegio" onChange={(e) => setFt({ name: e.target.value })} aria-label="Nome del privilegio" />
                      <button className="btn ghost sm icon" aria-label="Togli privilegio" onClick={() => setSub({ subclass: { ...sub.subclass, features: sub.subclass.features.filter((_, j) => j !== i) } })}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <textarea className="input" rows={2} value={ft.description} onChange={(e) => setFt({ description: e.target.value })} aria-label="Cosa fa" />
                  </div>
                );
              })}
              <button className="btn ghost sm" onClick={() => setSub({ subclass: { ...sub.subclass, features: [...sub.subclass.features, { level: 3, name: '', description: '' }] } })}>
                <Plus size={14} /> Privilegio
              </button>
            </>
          )}
          {item && (
            <>
              <Field label="Nome">
                <input className="input" value={item.name} onChange={(e) => setItem({ name: e.target.value })} aria-label="Nome dell’oggetto" />
              </Field>
              <div className="fields two">
                <Field label="Bonus magico (+1/+3)">
                  <input className="input" type="number" min={0} max={3} value={item.magicBonus ?? 0} onChange={(e) => setItem({ magicBonus: Number(e.target.value) || undefined })} />
                </Field>
                <Field label="Prezzo (mo)">
                  <input className="input" type="number" min={0} value={item.cost} onChange={(e) => setItem({ cost: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="Peso (lb)">
                  <input className="input" type="number" min={0} value={item.weight} onChange={(e) => setItem({ weight: Number(e.target.value) || 0 })} />
                </Field>
              </div>
              <Field label="Descrizione">
                <textarea className="input" rows={6} value={item.description} onChange={(e) => setItem({ description: e.target.value })} aria-label="Descrizione" />
              </Field>
            </>
          )}
          {open && (
            <button className="btn ghost sm danger-text" style={{ alignSelf: 'flex-start' }} onClick={() => remove(open)}>
              <Trash2 size={13} /> Elimina
            </button>
          )}
          {!open && <p className="faint small">Scegli una voce a sinistra o creane una nuova. Incantesimi, talenti, sottoclassi e oggetti compaiono nella scheda, nella creazione dei personaggi e nel compendio, per tutti i giocatori della campagna.</p>}
        </div>
      </div>
    </Modal>
  );
}

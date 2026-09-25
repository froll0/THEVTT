import { dnd5e } from '@thevtt/systems';
import type { ReactNode } from 'react';
import type { CompendiumEntry } from '..';
import { Dnd5eStatBlock } from './Bestiary';

const { ABILITY_LABELS, SCHOOLS, SKILLS, DAMAGE_TYPES, PROPERTY_LABELS, MASTERIES } = dnd5e;

/** Tiny renderer for the rules text format: paragraphs, "- " bullets, "## " headings, "a | b" tables. */
export function RuleText({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <div className="rule-text selectable">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const out: ReactNode[] = [];
        let k = 0;
        while (k < lines.length) {
          const line = lines[k]!;
          if (line.startsWith('## ')) {
            out.push(<h4 key={k}>{line.slice(3)}</h4>);
            k++;
          } else if (line.startsWith('- ')) {
            const items: string[] = [];
            while (k < lines.length && lines[k]!.startsWith('- ')) items.push(lines[k++]!.slice(2));
            out.push(
              <ul key={k}>
                {items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>,
            );
          } else if (line.includes(' | ')) {
            const rows: string[][] = [];
            while (k < lines.length && lines[k]!.includes(' | ')) rows.push(lines[k++]!.split(' | '));
            out.push(
              <table key={k} className="rule-table">
                <tbody>
                  {rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, n) => (
                        <td key={n}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>,
            );
          } else {
            const para: string[] = [];
            while (k < lines.length && !lines[k]!.startsWith('- ') && !lines[k]!.startsWith('## ') && !lines[k]!.includes(' | ')) para.push(lines[k++]!);
            out.push(<p key={k}>{para.join(' ')}</p>);
          }
        }
        return <div key={i}>{out}</div>;
      })}
    </div>
  );
}

const Meta = ({ items }: { items: [string, ReactNode][] }) => (
  <dl className="meta-list">
    {items
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
  </dl>
);

const fmtList = (xs: string[]) => xs.join(', ');
const ab = (a: dnd5e.Ability) => ABILITY_LABELS[a].name;
const metres = (m: number) => `${String(m).replace('.', ',')} m`;
const spellLevel = (l: number) => (l === 0 ? 'Trucchetto' : `${l}° livello`);

function entries(homebrew: { id: string; data: unknown }[]): CompendiumEntry[] {
  const out: CompendiumEntry[] = [];

  for (const r of dnd5e.RULES) {
    out.push({ id: `rule:${r.id}`, category: 'Regole', title: r.title, subtitle: r.category, text: `${r.title} ${r.category} ${r.body}`, render: () => <RuleText body={r.body} />, card: () => ({ title: r.title, subtitle: r.category, body: r.body.replace(/^## /gm, '').replace(/ \| /g, ': ') }) });
  }

  for (const [name, text] of Object.entries(dnd5e.CONDITION_INFO)) {
    out.push({ id: `cond:${name}`, category: 'Condizioni', title: name, text: `${name} ${text}`, render: () => <RuleText body={text} />, card: () => ({ title: name, subtitle: 'Condizione', body: text }) });
  }

  const classNames = new Map(dnd5e.CLASSES.map((c) => [c.id, c.name]));
  for (const s of dnd5e.SPELLS) {
    const classes = s.classes.map((c) => classNames.get(c) ?? c);
    const tags = [s.time, s.range, s.components, s.duration];
    out.push({
      id: `spell:${s.id}`,
      category: 'Incantesimi',
      title: s.name,
      subtitle: `${spellLevel(s.level)} · ${SCHOOLS[s.school]}${s.concentration ? ' · C' : ''}${s.ritual ? ' · R' : ''}`,
      text: `${s.name} ${SCHOOLS[s.school]} ${spellLevel(s.level)} ${classes.join(' ')} ${s.description}`,
      render: ({ onRoll }) => (
        <div className="col">
          <Meta
            items={[
              ['Livello', `${spellLevel(s.level)} · ${SCHOOLS[s.school]}`],
              ['Tempo di lancio', s.time + (s.ritual ? ' o rituale' : '')],
              ['Gittata', s.range],
              ['Componenti', s.components],
              ['Durata', (s.concentration ? 'Concentrazione, ' : '') + s.duration],
              ['Tiro salvezza', s.save ? ab(s.save) : undefined],
              ['Danni', s.damage ? `${s.damage} ${s.damageType ? DAMAGE_TYPES[s.damageType] : ''}` : undefined],
              ['Classi', fmtList(classes)],
            ]}
          />
          <p className="selectable">{s.description}</p>
          {s.upcast && s.level > 0 && <p className="faint small">Ai livelli superiori: +{s.upcast} per ogni livello dello slot sopra il {s.level}°.</p>}
          {onRoll && (s.damage || s.heal) && (
            <div className="row">
              {s.damage && (
                <button className="btn sm" onClick={() => onRoll(s.damage!, `${s.name} · danni`)}>
                  Tira danni {s.damage}
                </button>
              )}
              {s.heal && (
                <button className="btn sm" onClick={() => onRoll(s.heal!, `${s.name} · cura`)}>
                  Tira cura {s.heal}
                </button>
              )}
            </div>
          )}
        </div>
      ),
      card: () => ({
        title: s.name,
        subtitle: `${spellLevel(s.level)} · ${SCHOOLS[s.school]}${s.concentration ? ' · concentrazione' : ''}`,
        tags,
        body: s.description,
        rolls: [...(s.damage ? [{ label: 'Danni', formula: s.damage }] : []), ...(s.heal ? [{ label: 'Cura', formula: s.heal }] : [])],
      }),
    });
  }

  const monsters = [...dnd5e.MONSTERS, ...homebrew.map((h) => ({ ...(h.data as dnd5e.MonsterDef), id: h.id }))];
  for (const m of monsters) {
    out.push({
      id: `monster:${m.id}`,
      category: 'Mostri',
      title: m.name,
      subtitle: `GS ${m.cr} · ${m.type}`,
      text: `${m.name} ${m.type} gs ${m.cr} ${(m.traits ?? []).map((t) => t.name).join(' ')} ${m.actions.map((a) => a.name).join(' ')}`,
      render: ({ onRoll }) => <Dnd5eStatBlock monsterId={m.id} onRoll={onRoll ?? (() => undefined)} />,
    });
  }

  for (const c of dnd5e.CLASSES) {
    out.push({
      id: `class:${c.id}`,
      category: 'Classi',
      title: c.name,
      subtitle: `d${c.hitDie} · ${c.primary.map(ab).join(' o ')}`,
      text: `${c.name} ${c.description} ${c.features.map((f) => f.name).join(' ')} ${c.subclasses.map((s) => s.name).join(' ')}`,
      render: () => (
        <div className="col">
          <p className="selectable">{c.description}</p>
          <Meta
            items={[
              ['Dado vita', `d${c.hitDie}`],
              ['Caratteristica primaria', c.primary.map(ab).join(' o ')],
              ['Tiri salvezza', c.saves.map(ab).join(', ')],
              ['Abilità', `${c.skillChoices} a scelta tra ${c.skillList ? c.skillList.map((k) => SKILLS[k].name).join(', ') : 'tutte'}`],
              ['Armature', c.armor.length ? c.armor.map((a) => ({ light: 'leggere', medium: 'medie', heavy: 'pesanti', shield: 'scudi' })[a]).join(', ') : 'nessuna'],
              ['Armi', c.martial === true ? 'semplici e da guerra' : c.martial ? 'semplici e alcune da guerra' : 'semplici'],
              ['Incantatore', c.spellcasting ? `${ab(c.spellcasting.ability)} (${{ full: 'completo', half: 'a metà', pact: 'magia del patto' }[c.spellcasting.type]})` : undefined],
            ]}
          />
          <h4>Privilegi</h4>
          {c.features.map((f, i) => (
            <details key={i} className="feature">
              <summary>
                <span className="grow">{f.name}</span>
                <span className="faint tiny">{f.level}°</span>
              </summary>
              <p>{f.description}</p>
            </details>
          ))}
          <h4>{c.subclassLabel}</h4>
          {c.subclasses.map((s) => (
            <details key={s.id} className="feature">
              <summary>
                <span className="grow">{s.name}</span>
              </summary>
              <p>{s.description}</p>
              {s.features.map((f, i) => (
                <p key={i}>
                  <b>
                    {f.name} ({f.level}°).
                  </b>{' '}
                  {f.description}
                </p>
              ))}
            </details>
          ))}
        </div>
      ),
    });
  }

  for (const sp of dnd5e.SPECIES) {
    out.push({
      id: `species:${sp.id}`,
      category: 'Specie',
      title: sp.name,
      subtitle: `Velocità ${metres(sp.speed)}`,
      text: `${sp.name} ${sp.description} ${sp.traits.map((t) => `${t.name} ${t.description}`).join(' ')}`,
      render: () => (
        <div className="col">
          <p className="selectable">{sp.description}</p>
          <Meta
            items={[
              ['Taglia', sp.sizes.map((z) => (z === 'small' ? 'Piccola' : 'Media')).join(' o ')],
              ['Velocità', metres(sp.speed)],
              ['Scurovisione', sp.darkvision ? metres(sp.darkvision) : undefined],
            ]}
          />
          {sp.traits.map((t) => (
            <p key={t.name} className="selectable">
              <b>{t.name}.</b> {t.description}
            </p>
          ))}
          {sp.choice && (
            <>
              <h4>{sp.choice.label}</h4>
              {sp.choice.options.map((o) => (
                <p key={o.id} className="selectable">
                  <b>{o.name}.</b> {o.description}
                </p>
              ))}
            </>
          )}
        </div>
      ),
    });
  }

  for (const b of dnd5e.BACKGROUNDS) {
    out.push({
      id: `bg:${b.id}`,
      category: 'Background',
      title: b.name,
      subtitle: b.skills.map((k) => SKILLS[k].name).join(', '),
      text: `${b.name} ${b.description}`,
      render: () => (
        <div className="col">
          <p className="selectable">{b.description}</p>
          <Meta
            items={[
              ['Caratteristiche', b.abilities.map(ab).join(', ')],
              ['Abilità', b.skills.map((k) => SKILLS[k].name).join(', ')],
              ['Talento', dnd5e.featById(b.feat)?.name ?? b.feat],
              ['Strumento', b.tool],
              ['Equipaggiamento', `${b.equipment.a.map((i) => `${i.qty && i.qty > 1 ? `${i.qty} ` : ''}${dnd5e.itemName(i.item)}`).join(', ')} e ${b.equipment.aGold} mo, oppure ${b.equipment.bGold} mo`],
            ]}
          />
        </div>
      ),
    });
  }

  const featCat = { origin: 'Origine', general: 'Generale', fightingStyle: 'Stile di combattimento', epicBoon: 'Dono epico' } as const;
  for (const f of dnd5e.FEATS) {
    out.push({
      id: `feat:${f.id}`,
      category: 'Talenti',
      title: f.name,
      subtitle: `${featCat[f.category]}${f.level ? ` · dal ${f.level}° livello` : ''}`,
      text: `${f.name} ${featCat[f.category]} ${f.description}`,
      render: () => (
        <div className="col">
          <Meta
            items={[
              ['Categoria', featCat[f.category]],
              ['Prerequisito', f.level ? `livello ${f.level}` : undefined],
              ['Aumento', f.abilityIncrease ? `+1 a ${f.abilityIncrease.map(ab).join(', ')}` : undefined],
              ['Ripetibile', f.repeatable ? 'sì' : undefined],
            ]}
          />
          <p className="selectable">{f.description}</p>
        </div>
      ),
      card: () => ({ title: f.name, subtitle: `Talento · ${featCat[f.category]}`, body: f.description }),
    });
  }

  for (const w of dnd5e.WEAPONS) {
    const mastery = MASTERIES[w.mastery];
    out.push({
      id: `weapon:${w.id}`,
      category: 'Equipaggiamento',
      title: w.name,
      subtitle: `${w.damage} ${DAMAGE_TYPES[w.damageType]} · arma ${w.category === 'simple' ? 'semplice' : 'da guerra'}`,
      text: `${w.name} arma ${w.properties.map((p) => PROPERTY_LABELS[p]).join(' ')} ${mastery.name}`,
      render: () => (
        <div className="col">
          <Meta
            items={[
              ['Categoria', `${w.category === 'simple' ? 'Semplice' : 'Da guerra'}, ${w.kind === 'melee' ? 'mischia' : 'distanza'}`],
              ['Danni', `${w.damage} ${DAMAGE_TYPES[w.damageType]}${w.versatile ? ` (${w.versatile} a due mani)` : ''}`],
              ['Proprietà', w.properties.map((p) => PROPERTY_LABELS[p]).join(', ') || '—'],
              ['Gittata', w.range ? `${metres(w.range[0])} / ${metres(w.range[1])}` : undefined],
              ['Maestria', mastery.name],
              ['Peso', `${w.weight} lb`],
              ['Costo', `${w.cost} mo`],
            ]}
          />
          <p className="selectable">
            <b>{mastery.name}.</b> {mastery.description}
          </p>
        </div>
      ),
    });
  }
  for (const a of dnd5e.ARMORS) {
    out.push({
      id: `armor:${a.id}`,
      category: 'Equipaggiamento',
      title: a.name,
      subtitle: a.category === 'shield' ? '+2 CA' : `CA ${a.base}${a.maxDex === null ? ' + Des' : a.maxDex ? ' + Des (max 2)' : ''}`,
      text: `${a.name} armatura`,
      render: () => (
        <Meta
          items={[
            ['Tipo', { none: '—', light: 'Leggera', medium: 'Media', heavy: 'Pesante', shield: 'Scudo' }[a.category]],
            ['Classe armatura', a.category === 'shield' ? '+2' : `${a.base}${a.maxDex === null ? ' + mod. Des' : a.maxDex ? ' + mod. Des (max 2)' : ''}`],
            ['Forza richiesta', a.strength],
            ['Furtività', a.stealthDisadvantage ? 'Svantaggio' : undefined],
            ['Peso', `${a.weight} lb`],
            ['Costo', `${a.cost} mo`],
          ]}
        />
      ),
    });
  }
  for (const [id, m] of Object.entries(MASTERIES)) {
    out.push({ id: `mastery:${id}`, category: 'Equipaggiamento', title: `Maestria: ${m.name}`, subtitle: 'Proprietà di maestria', text: `${m.name} maestria ${m.description}`, render: () => <p className="selectable">{m.description}</p> });
  }
  return out;
}

export const dnd5eCompendium = {
  categories: ['Regole', 'Condizioni', 'Incantesimi', 'Mostri', 'Classi', 'Specie', 'Background', 'Talenti', 'Equipaggiamento'],
  entries,
};

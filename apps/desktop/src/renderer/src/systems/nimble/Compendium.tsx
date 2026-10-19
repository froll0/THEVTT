import { nimbleRules as n } from '@thevtt/systems';
import type { CompendiumEntry } from '..';
import { Meta, RuleText } from '../dnd5e-2024/Compendium';
import { MonsterBlock } from './Bestiary';

const { STAT_INFO } = n;

/** The rules in brief, in our own words, with the module's terms: the books have the full text. */
const RULES: { id: string; category: string; title: string; body: string }[] = [
  {
    id: 'basi',
    category: 'Regole',
    title: 'Le basi',
    body: `Quattro caratteristiche: Forza (FOR), Destrezza (DES), Intelligenza (INT) e Volontà (VOL), di solito tra −1 e +3 al livello 1. Ogni classe ha due caratteristiche chiave (CHIAVE è la più alta delle due) e due secondarie.

## Prove e tiri salvezza
- Prova di abilità: 1d20 + abilità contro una CD (facile 8, media 12, impegnativa 15, molto difficile 18, estrema 20+).
- Tiro salvezza (TS): 1d20 + caratteristica. Ogni eroe ha un TS favorito (con vantaggio), uno sfavorito (con svantaggio) e due neutri. Un 1 fallisce sempre, un 20 riesce sempre.
- Gli effetti degli eroi hanno CD 10+CHIAVE, salvo diversa indicazione.

## Vantaggio e svantaggio
Vantaggio X: tira X dadi in più e scarta i più bassi. Svantaggio X: scarta i più alti. A parità si scarta da sinistra. Ogni vantaggio annulla uno svantaggio.`,
  },
  {
    id: 'attacchi',
    category: 'Combattimento',
    title: 'Attaccare: il dado primario',
    body: `Gli attacchi non tirano per colpire: si tirano subito i danni.

- Il dado più a sinistra è il dado primario.
- Con 1 sul dado primario l’attacco manca: niente danni.
- Col massimo è un critico esplosivo: ritira il dado primario e aggiungilo, di nuovo a ogni massimo. Le armi Brutali aggiungono un dado in più a ogni esplosione.
- Senza competenza nell’arma: niente critici.
- Vantaggio e svantaggio si applicano ai dadi dell’attacco: si tirano dadi in più e si scartano i più bassi (o i più alti), poi il primo rimasto è il dado primario.
- Attacchi ad area o a più bersagli: un solo tiro per tutti, non mancano e non fanno critici.

## Attacchi affrettati
Ogni attacco dopo il primo nello stesso turno ha uno svantaggio cumulativo (il secondo svantaggio 1, il terzo svantaggio 2…). Al tavolo lo conta da solo.

## Armatura dei mostri
- Nessuna: subisce tutti i danni.
- Media: solo i dadi, i modificatori positivi non contano (quelli negativi sì).
- Pesante: metà dei dadi, per eccesso, senza modificatori.
- Critici, tiri salvezza e vulnerabilità ignorano l’armatura.

## Gregari
Muoiono con qualsiasi danno e non fanno critici. Più gregari che attaccano lo stesso eroe contano come un solo attacco.`,
  },
  {
    id: 'azioni',
    category: 'Combattimento',
    title: 'Turno, azioni e reazioni',
    body: `## Iniziativa
1d20 + Iniziativa (di solito DES). Il risultato dice con quante azioni cominci il primo round:

Risultato | Azioni
1–9 (una cifra) | 1
10–19 (due cifre) | 2
20 o più (o un 20 naturale) | 3

Di norma gli eroi agiscono per primi, nell’ordine che preferiscono; i mostri per ultimi.

## Azioni eroiche
Nel tuo turno hai 3 azioni (tornano tutte alla fine del turno): Attaccare, Lanciare un incantesimo, Muoversi (fino alla velocità), Valutare.

## Valutare
Prova di abilità CD 12 per Fare una domanda, Creare un’apertura (+1 al prossimo dado primario contro il bersaglio, questo round) o Anticipare il pericolo (−1 ai dadi primari contro di te, questo round). Mai due volte con la stessa abilità nello stesso scontro.

## Reazioni eroiche
Costano 1 azione, fuori dal tuo turno, ciascuna al massimo una volta per round (le spendi dalle azioni del turno dopo):
- Difendersi: riduci il danno di un attacco del valore della tua Armatura.
- Interporsi: se una creatura entro 2 caselle sta per essere colpita, spingila via e diventa tu il bersaglio.
- Attacco d’opportunità: in mischia, con svantaggio, contro un nemico adiacente che si allontana. Solo gli eroi.
- Aiutare: dai vantaggio al tiro di un alleato, se spieghi come.

Al tavolo, quando un mostro colpisce un eroe, in chat compaiono i pulsanti «Difenditi» e «Subisci»: l’eroe (o il master) sceglie.`,
  },
  {
    id: 'ferite',
    category: 'Combattimento',
    title: 'PF, Ferite e morte',
    body: `- Sanguinante: a metà dei PF o meno.
- A 0 PF l’eroe prende 1 Ferita e diventa Morente: al massimo 1 azione per turno; attaccare o lanciare un incantesimo costa 1 Ferita, salvo un TS su FOR CD 10.
- Morente: ogni danno subito è +2 Ferite (+3 se è un critico).
- Con 6 Ferite (o il massimo della tua scheda) l’eroe muore.
- Una cura qualsiasi rimette in piedi un Morente.
- Un Riposo sicuro guarisce 1 Ferita.

Al tavolo le Ferite si segnano da sole sul token e sulla scheda.`,
  },
  {
    id: 'riposi',
    category: 'Regole',
    title: 'Riposi',
    body: `## Riposo sul campo
- Riprendere fiato (10 minuti): spendi Dadi Vita, tirali e aggiungi FOR a ciascuno.
- Accamparsi (8 ore con cibo e sonno): ogni Dado Vita vale il massimo + FOR.

## Riposo sicuro
In un luogo davvero sicuro (una locanda, una casa): tornano tutti i PF, i Dadi Vita, il mana e le risorse di classe; guarisci 1 Ferita. Un alloggio lussuoso dà anche un dono temporaneo (1d8).`,
  },
  {
    id: 'magia',
    category: 'Regole',
    title: 'Magia',
    body: `Sei scuole: Fuoco, Ghiaccio, Fulmine, Vento, Radiante e Necrotica.

- Trucchetti: costano 0 mana e crescono ogni 5 livelli.
- Incantesimi di grado 1–9: costano tanto mana quanto il grado. Il grado massimo dipende dal livello.
- Potenziare: spendi mana in più (fino al grado sbloccato) per un effetto più forte.
- Mana: (CHIAVE×3)+LIV per Mago, Pastore, Mutatempesta e Tessicanto; VOL+LIV per il Giurato; l’Ombromante non ha mana e usa il potere del Patrono. Il mana arriva dal livello 2.
- Gli incantesimi a bersaglio singolo che fanno danni seguono le regole del dado primario; quelli ad area non mancano e non fanno critici.
- Concentrazione: se subisci un critico, TS su FOR CD 10 o la perdi; la perdi a 0 PF o da Inerme.`,
  },
  {
    id: 'inventario',
    category: 'Regole',
    title: 'Inventario e monete',
    body: `Hai 10+FOR spazi.

Oggetto | Spazi
Arma a una mano, scudo, armatura indossata | 1
Arma a due mani, armatura non indossata | 2
500 monete d’oro | 1
Pozioni | ½ ciascuna

10 monete d’argento (ma) = 1 moneta d’oro (mo).`,
  },
  {
    id: 'dadi',
    category: 'Regole',
    title: 'I dadi al tavolo',
    body: `Formule che il tavolo capisce:

Formula | Significato
1d8n+2 | attacco col dado primario (manca con 1, critico esplosivo col massimo)
1d8na1+2 | con vantaggio 1
1d8nd2+2 | con svantaggio 2
1d12nv | arma Brutale
1d6nx | senza competenza: niente critici
dd6 | d66: decine e unità, non manca e non fa critici
2d20kh1+3 | TS favorito (vantaggio)

Nei risultati, 💥 segna i dadi aggiunti dai critici.`,
  },
];

function rulesEntries(): CompendiumEntry[] {
  const out: CompendiumEntry[] = RULES.map((r) => ({ id: `nimble-${r.id}`, category: r.category, title: r.title, text: r.body, render: () => <RuleText body={r.body} />, card: () => ({ title: r.title, subtitle: 'Nimble', body: r.body }) }));

  for (const c of n.CONDITIONS) {
    const text = n.CONDITION_INFO[c] ?? '';
    out.push({ id: `nimble-cond-${c}`, category: 'Condizioni', title: c, text, render: () => <p className="small">{text}</p>, card: () => ({ title: c, subtitle: 'Condizione', body: text }) });
  }
  for (const g of n.GLOSSARY) {
    out.push({ id: `nimble-term-${g.en}`, category: 'Glossario', title: g.it, subtitle: g.en, text: `${g.en} ${g.text}`, render: () => <p className="small">{g.text}</p> });
  }
  for (const s of n.STATS) {
    const i = STAT_INFO[s];
    out.push({ id: `nimble-stat-${s}`, category: 'Glossario', title: `${i.name} (${i.short})`, subtitle: i.en, text: i.text, render: () => <p className="small">{i.text}</p> });
  }
  for (const k of n.SKILLS) {
    const i = n.SKILL_INFO[k];
    out.push({ id: `nimble-skill-${k}`, category: 'Glossario', title: i.name, subtitle: `Abilità · ${STAT_INFO[i.stat].short} · ${i.en}`, text: i.text, render: () => <p className="small">{i.text}</p> });
  }

  for (const c of n.CLASSES) {
    const features = c.features.map((f) => `- Liv. ${f.level} · ${f.name}: ${f.text}`).join('\n');
    const lists = c.choices.map((ch) => `## ${ch.name} (livelli ${ch.at.join(', ')})\n${ch.options.map((o) => `- ${o.name}${o.req ? ` (${o.req})` : ''}: ${o.text}`).join('\n')}`).join('\n\n');
    const subs = c.subclasses.map((s) => `## ${s.name}${s.story ? ' (sottoclasse di storia)' : ''}\n${s.text ? `${s.text}\n` : ''}${s.features.map((f) => `- Liv. ${f.level} · ${f.name}: ${f.text}`).join('\n')}`).join('\n\n');
    const body = `${c.tagline}\n\n## Privilegi\n${features}${lists ? `\n\n${lists}` : ''}\n\n${subs}`;
    out.push({
      id: `nimble-class-${c.id}`,
      category: 'Classi',
      title: c.name,
      subtitle: c.en,
      text: body,
      render: () => (
        <>
          <Meta
            items={[
              ['Caratteristiche chiave', c.keyStats.map((s) => STAT_INFO[s].name).join(', ')],
              ['Secondarie', c.secondaryStats.map((s) => STAT_INFO[s].name).join(', ')],
              ['Dado Vita', `d${c.hitDie}`],
              ['PF iniziali', c.startHp],
              ['TS', `${STAT_INFO[c.saves.adv].short} favorito, ${STAT_INFO[c.saves.dis].short} sfavorito`],
              ['Armature', c.armorText],
              ['Armi', c.weaponsText],
              ['Magia', c.magic ? c.magic.schools.map((s) => n.SCHOOLS[s].name).join(', ') : ''],
            ]}
          />
          <RuleText body={body} />
        </>
      ),
    });
  }

  for (const a of n.ANCESTRIES) {
    out.push({
      id: `nimble-anc-${a.id}`,
      category: 'Stirpi',
      title: a.name,
      subtitle: `${a.exotic ? 'Esotica' : 'Comune'} · taglia ${a.size}`,
      text: `${a.en} ${a.text} ${a.trait.text}`,
      render: () => (
        <>
          <p className="small muted">{a.text}</p>
          <p className="small">
            <b>{a.trait.name}.</b> {a.trait.text}
          </p>
        </>
      ),
      card: () => ({ title: a.name, subtitle: 'Stirpe', body: `${a.trait.name}. ${a.trait.text}` }),
    });
  }
  for (const b of n.BACKGROUNDS) {
    out.push({ id: `nimble-bg-${b.id}`, category: 'Background', title: b.name, subtitle: b.en, text: b.text, render: () => <p className="small">{b.text}{b.req ? ` (Requisito: ${b.req})` : ''}</p>, card: () => ({ title: b.name, subtitle: 'Background', body: b.text }) });
  }

  const spell = (s: n.SpellDef, kind: string) => {
    const body = [s.text, s.upcast ? `Potenziare: ${s.upcast}` : '', s.highLevels ? `Ai livelli alti: ${s.highLevels}` : ''].filter(Boolean).join('\n\n');
    out.push({
      id: `nimble-spell-${s.id}`,
      category: 'Incantesimi',
      title: s.name,
      subtitle: `${kind} · ${n.SCHOOLS[s.school].name}`,
      text: `${s.en} ${body}`,
      render: ({ onRoll }) => (
        <>
          <Meta
            items={[
              ['Scuola', n.SCHOOLS[s.school].name],
              ['Grado', s.tier === 0 ? 'Trucchetto' : s.tier],
              ['Azioni', s.actions],
              ['Bersaglio', n.TARGET_LABEL[s.target]],
              ['Gittata', s.range],
              ['Portata', s.reach],
              ['Danni', s.damage ? `${s.damage.replace(/@key/g, 'CHIAVE').replace(/@int/g, 'INT').replace(/@wil/g, 'VOL')} ${s.damageType ?? ''}` : ''],
              ['TS', s.save ? STAT_INFO[s.save].name : ''],
              ['Concentrazione', s.concentration],
              ['Solo', s.only ? n.getClass(s.only)?.name : ''],
            ]}
          />
          <RuleText body={body} />
          {onRoll && s.damage && !/@/.test(s.damage) && (
            <button className="btn sm" onClick={() => onRoll(s.target === 'single' ? s.damage!.replace(/^(\d*d\d+)/, '$1n') : s.damage!, s.name)}>
              Tira i danni
            </button>
          )}
        </>
      ),
      card: () => ({ title: s.name, subtitle: `${kind} · ${n.SCHOOLS[s.school].name}`, body }),
    });
  };
  for (const s of n.SPELLS) spell(s, s.tier === 0 ? 'Trucchetto' : `Grado ${s.tier}`);
  for (const s of n.UTILITY_SPELLS) spell(s, 'Utilità');
  for (const s of n.SECRET_SPELLS) spell(s, 'Segreto');
  for (const [id, s] of Object.entries(n.SCHOOLS)) out.push({ id: `nimble-school-${id}`, category: 'Incantesimi', title: `Scuola: ${s.name}`, subtitle: s.en, text: s.text, render: () => <p className="small">{s.text}</p> });

  for (const w of [...n.WEAPONS, n.UNARMED]) {
    out.push({
      id: `nimble-weapon-${w.id}`,
      category: 'Armi',
      title: w.name,
      subtitle: `${w.damage} ${w.type}`,
      text: w.props.join(' '),
      render: () => <Meta items={[['Danni', `${w.damage} + ${STAT_INFO[w.stat].short}`], ['Tipo', w.type], ['Proprietà', w.props.join(', ')], ['FOR richiesta', w.reqStr], ['Costo', w.cost ? `${w.cost} mo` : '']]} />,
    });
  }
  for (const a of [...n.ARMORS, ...n.SHIELDS]) {
    out.push({
      id: `nimble-armor-${a.id}`,
      category: 'Armature',
      title: a.name,
      subtitle: n.ARMOR_KINDS[a.kind],
      text: n.ARMOR_KINDS[a.kind],
      render: () => (
        <Meta
          items={[
            ['Tipo', n.ARMOR_KINDS[a.kind]],
            ['Armatura', `${a.kind === 'shield' ? '+' : ''}${a.base}${a.dexMax === null ? '' : a.dexMax === Number.POSITIVE_INFINITY ? ' + DES' : ` + DES (max ${a.dexMax})`}`],
            ['FOR richiesta', a.reqStr],
            ['Costo', `${a.cost} mo`],
          ]}
        />
      ),
    });
  }
  for (const g of n.GEAR) {
    out.push({ id: `nimble-gear-${g.id}`, category: 'Equipaggiamento', title: g.name, subtitle: g.cost < 1 ? `${Math.round(g.cost * 10)} ma` : `${g.cost} mo`, text: g.text, render: () => <p className="small">{g.text}</p> });
  }
  const prices = `Grado | Pergamena | Bacchetta\n${n.SCROLL_PRICES.map((p, i) => `${i === 0 ? 'Trucchetto' : i} | ${p} mo | ${n.WAND_PRICES[i]} mo`).join('\n')}`;
  out.push({ id: 'nimble-scroll-prices', category: 'Oggetti magici', title: 'Pergamene e bacchette: prezzi', text: prices, render: () => <RuleText body={prices} /> });
  const rarity = `Rarità | Livelli | Prezzo\n${Object.values(n.RARITY).map((r) => `${r.name} | ${r.levels} | ${r.price}`).join('\n')}`;
  out.push({ id: 'nimble-rarity', category: 'Oggetti magici', title: 'Rarità', text: rarity, render: () => <RuleText body={rarity} /> });
  for (const m of n.MAGIC_ITEMS) {
    const r = m.rarity === 'varies' ? 'Varia' : n.RARITY[m.rarity]?.name;
    out.push({ id: `nimble-item-${m.id}`, category: 'Oggetti magici', title: m.name, subtitle: r, text: m.text, render: () => <p className="small">{m.text}</p>, card: () => ({ title: m.name, subtitle: `Oggetto magico · ${r}`, body: m.text }) });
  }
  for (const w of n.WANDS) {
    const body = `${n.RARITY[w.rarity]?.name} · ${w.tier === 0 ? 'trucchetto' : `grado ${w.tier}`} · ${w.charges} cariche.\n\nRicarica: ${w.recharge}`;
    out.push({ id: `nimble-wand-${w.name}`, category: 'Oggetti magici', title: w.name, subtitle: 'Bacchetta', text: body, render: () => <RuleText body={body} /> });
  }

  for (const t of ['minor', 'major', 'epic'] as const) {
    const label = t === 'minor' ? 'Doni minori' : t === 'major' ? 'Doni maggiori' : 'Doni epici';
    const body = n.BOONS.filter((b) => b.tier === t)
      .map((b) => `- ${b.name}: ${b.text}`)
      .join('\n');
    out.push({ id: `nimble-boons-${t}`, category: 'Doni', title: label, text: body, render: () => <RuleText body={body} /> });
  }
  const lodging = `d8 | Dono\n${n.LODGING_BOONS.map((b, i) => `${i + 1} | ${b}`).join('\n')}`;
  out.push({ id: 'nimble-lodging', category: 'Doni', title: 'Alloggio lussuoso', subtitle: 'Fino al prossimo Riposo sicuro', text: lodging, render: () => <RuleText body={lodging} /> });

  for (const m of n.ALL_MONSTERS) {
    out.push({ id: `nimble-monster-${m.id}`, category: 'Bestiario', title: m.name, subtitle: `${m.group} · livello ${m.level}`, text: `${m.en} ${m.traits.map((t) => t.text).join(' ')}`, render: ({ onRoll }) => <MonsterBlock m={m} onRoll={onRoll} /> });
  }
  const builder = `Livello | PF (nessuna/media/pesante) | Danni per round | Attacco | CD\n${n.MONSTER_BUILDER.map((r) => `${r.level} | ${r.hp}/${r.hpM}/${r.hpH} | ${r.dmg} | ${r.attack} | ${r.dc}`).join('\n')}\n\n## Difficoltà degli scontri\nSomma i livelli dei mostri e confrontala con quella degli eroi: meno della metà è facile, fino a circa pari è difficile, oltre è mortale.\n\n## Capacità da aggiungere\n${n.MONSTER_ABILITIES.map((a) => `- ${a.name}: ${a.text}`).join('\n')}`;
  out.push({ id: 'nimble-monster-builder', category: 'Creare mostri', title: 'Tabella per creare mostri', text: builder, render: () => <RuleText body={builder} /> });
  return out;
}

export const nimbleCompendium = {
  categories: ['Regole', 'Combattimento', 'Condizioni', 'Glossario', 'Classi', 'Stirpi', 'Background', 'Incantesimi', 'Armi', 'Armature', 'Equipaggiamento', 'Oggetti magici', 'Doni', 'Bestiario', 'Creare mostri'],
  entries: () => rulesEntries(),
};

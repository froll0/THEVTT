import { RETREAT_TABLE, VEHICLE_FAULTS } from '@thevtt/shared';
import { warhammer as w } from '@thevtt/systems';
import type { ReactNode } from 'react';
import type { CompendiumEntry } from '..';
import { RuleText } from '../dnd5e-2024/Compendium';
import { NpcBlock } from './Bestiary';

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

/** The rules in brief, in our own words: the books have the full text. */
const RULES: { id: string; category: string; title: string; body: string }[] = [
  {
    id: 'prove',
    category: 'Regole',
    title: 'Prove',
    body: `Si tirano tanti d10 quanto la Caratteristica; ogni dado pari o sotto l’Abilità è un successo (lo 0 vale 10).

0 | Fallimento
1 | Successo Marginale: ce la fai, ma il GM può aggiungere una Complicazione
2 | Successo
3+ | Successo Totale: un effetto in più

## Dadi bonus e penalità
Saperi, Aiuto, Talenti e circostanze danno +1d o -1d (Difficile) / -2d (Ardua). I dadi bonus non superano la Caratteristica (al massimo si raddoppia la riserva). Sotto un dado se ne tira uno che riesce solo con 1.

## Gloriosa e Tetra
- Gloriosa: si ritirano i fallimenti, una volta.
- Tetra: si ritirano i successi, una volta.
- Non si cumulano: se valgono entrambe, si annullano.`,
  },
  {
    id: 'contrapposte',
    category: 'Regole',
    title: 'Prove Contrapposte, Prolungate e Aiuto',
    body: `## Contrapposte
Vince chi ha più successi. Nei pareggi vince chi ha iniziato o chi cambia lo stato delle cose (negli attacchi l’attaccante); se nessuno ha successi falliscono entrambi.

## Prolungate
Si accumulano successi Prova dopo Prova: 4 è un compito impegnativo, 8 una vera sfida, 12+ un’impresa.

## Aiutare
Chi aiuta fa una Prova: ogni suo successo dà +1d a chi agisce, entro il solito massimo.`,
  },
  {
    id: 'fato',
    category: 'Regole',
    title: 'Fato',
    body: `## Spendere (torna a ogni sessione)
- Rendere Gloriosa una Prova.
- Fare una seconda Azione nel turno.
- Coprire la Ritirata dei compagni.

## Bruciare (il massimo cala per sempre)
- Successo Assoluto: la Prova riesce come Successo Totale.
- Colpo di Striscio: annulli una Ferita appena subita.
- Ultima Resistenza: resti in piedi per un ultimo gesto eroico.`,
  },
  {
    id: 'zone',
    category: 'Combattimento',
    title: 'Zone e distanze',
    body: `Il campo di battaglia è diviso in Zone (una stanza, un cortile, un tratto di strada). Le distanze si contano in Zone:

Ravvicinata | a portata di braccio
Corta | nella stessa Zona
Media | una Zona più in là
Lunga | due Zone
Estrema | tre o più Zone

Ogni turno c’è un movimento gratuito di una Zona (due se Veloce); con l’Azione Manovrare si Scatta per una Zona in più (e un’altra con Atletica, o si diventa Barcollanti). Chi è Lento non può Manovrare per andare oltre.

Sulla mappa il GM disegna le Zone con lo strumento apposito; il righello mostra la distanza in fasce e, in combattimento, il tavolo conta le Zone percorse da ognuno.`,
  },
  {
    id: 'turni',
    category: 'Combattimento',
    title: 'Turni e Azioni',
    body: `Si gioca a schieramenti: prima tutti i PG (nell’ordine che preferiscono), poi tutti i nemici. In un’imboscata comincia chi la tende.

Ogni personaggio ha un movimento gratuito e una Azione:
- Aiutare: dai dadi bonus a un alleato.
- Attaccare: una Prova di Mischia, Tiro, Lancio o Muscoli.
- Improvvisare: qualunque altra cosa.
- Manovrare: Scattare (due Zone), Caricare (+1d all’attacco in mischia), Muoversi Silenziosamente o con Cautela.
- Mirare: Percezione, ogni successo +1d al prossimo tiro.
- Recuperare: togli Barcollante o Prono, o fai una Prova per un’altra Condizione o per medicare.

Spendendo Fato si ottiene una seconda Azione.`,
  },
  {
    id: 'attacchi',
    category: 'Combattimento',
    title: 'Attacchi, Danni e Ferite',
    body: `L’attacco è una Prova Contrapposta contro la Protezione del difensore (Atletica, oppure Difesa se armato in mischia, o con uno scudo anche contro il Tiro). I pareggi vanno all’attaccante.

Danni = Danno dell’arma + successi oltre quelli del difensore (tutti, se non si oppone).
- Danni oltre la Resilienza: una Ferita.
- Danni fino alla Resilienza: Barcollante. Chi lo era già sceglie se Arretrare, cadere Prono o subire una Ferita.
- Un attacco in mischia fallito rende Barcollante l’attaccante.

## Modificatori tipici
In mischia +1d caricando, in superiorità numerica o da posizione sopraelevata. A distanza -1d fuori dalla Portata Ottimale, contro chi è al riparo o Prono.

## Resilienza
Resistenza più armatura (leggera +1, pesante +2, piastre +3) e scudo (+1). Le armi che ignorano l’armatura guardano solo la Resistenza.`,
  },
  {
    id: 'ferite',
    category: 'Combattimento',
    title: 'Ferite e guarigione',
    body: `Chi subisce una Ferita tira 1d10 più un dado per ogni Ferita non medicata e consulta la tabella delle Ferite. Una Ferita toglie Barcollante.

## PNG
- Servitori: sconfitti alla prima Ferita.
- Bruti e Mostruosità: reggono qualche Ferita, come dice il loro profilo, senza tirare sulla tabella.
- Campioni: tirano sulla tabella come i personaggi.

## Guarire
- Medicare: Recuperando con Memoria (automatico con Anatomia) o Riprendendo Fiato dopo lo scontro. Una Ferita medicata non aggiunge più dadi.
- Riprendere Fiato, Una Notte di Riposo, Riposare e Rimettersi (Attività dell’Intermezzo): dipende dalla Ferita. Le più gravi vogliono un’operazione.
- Infezioni: a fine giornata Tempra; con meno successi delle Ferite subite quel giorno arriva una Ferita Purulenta.`,
  },
  {
    id: 'ritirata',
    category: 'Combattimento',
    title: 'Arretrare e Ritirata',
    body: `Arretrare: una volta per round ci si sposta in una Zona adiacente lontano da chi ci incalza. Arretrando in una Zona con nemici si diventa Atterriti.

## Ritirata
Se sono tutti d’accordo, i giocatori suonano la ritirata all’inizio del round. Uno di loro spende Fato e fa da retroguardia; se il gruppo non ha più Fato, il GM esige un prezzo in sangue (una Ferita), materiali (un avere prezioso) o sventura.

Se il nemico insegue, ognuno tenta una Prova di Atletica (qualcuno può riuscire da solo grazie ai Saperi). Per ogni fallimento si tira 1d10 e si sommano i risultati sulla tabella «Si Salvi Chi Può!». Al tavolo: «Ritirata» nel pannello dell’iniziativa.`,
  },
  {
    id: 'terreno',
    category: 'Combattimento',
    title: 'Terreno Difficile, copertura e Pericoli',
    body: `## Terreno Difficile
Chi lo attraversa nel suo turno tenta una Prova di Atletica: fallendo cade Prono subito dopo. In quel turno non può tirare Atletica per una Zona in più Scattando o Caricando. Alcuni Saperi Ambientali e Muoversi con Cautela evitano la Prova.

## Copertura e buio
-1d ai tiri contro chi è dietro un riparo o nascosto alla vista. Al buio non si vede nulla oltre la Distanza Media.

## Pericoli
Chi è esposto a un Pericolo tenta una Prova: fallendo subisce una Ferita e una Condizione adatta. I Pericoli con un grado si evitano con altrettanti successi; fallendo si tirano sulla tabella delle Ferite tanti dadi quanti i successi mancanti (più quelli per le Ferite non medicate).

Al tavolo il master segna le Zone con Terreno Difficile, Copertura, posizione sopraelevata e Pericoli: in combattimento il tavolo tira da solo Atletica e la prova contro il Pericolo per chi entra, e a fine turno per chi resta in una Zona che brucia.`,
  },
  {
    id: 'cavalcature',
    category: 'Combattimento',
    title: 'Cavalcature e veicoli',
    body: `## In sella
Cavaliere e cavalcatura sono un’unica entità con le Capacità del cavaliere e quelle in più della bestia (un Cavallo: +1 Resilienza e Velocità Veloce). Manovre complicate: Atletica; una cavalcatura spaventata: Comando. Si attacca con le proprie armi o con quelle della cavalcatura. Gli attacchi colpiscono il cavaliere, che si oppone normalmente; una Mostruosità cavalcata si può attaccare a parte. Cadendo Prono si viene disarcionati.

## Veicoli
Senza conducente non si muovono. Si muovono nel turno del conducente alla loro Velocità; gli Speronamenti si fanno solo Caricando (Destrezza del conducente per i carri). Contro un veicolo ogni successo va a segno (non ci si può opporre) ed è immune alle Condizioni tranne In Fiamme. I Danni oltre la Resilienza sono Guasti: superato il massimo è distrutto (chi è a bordo è Barcollante e Prono), altrimenti si tira sulla tabella dei Guasti.`,
  },
  {
    id: 'magia',
    category: 'Magia',
    title: 'Lanciare incantesimi',
    body: `Serve il Talento Mago (il grado è il Livello da Mago) e un Sapere Magico.

- La Prova di Magia è una Prova Prolungata di Volontà, un’Azione per Prova: si accumulano successi fino al VM dell’incantesimo, poi lo si lancia e i successi si azzerano.
- La Potenza è il numero di successi dell’ultima Prova.
- Saltare una Prova durante il lancio aggiunge un dado Incidente Magico.
- Con armatura o scudo le Prove di Magia sono Tetre.

## La Regola del Nove
Ogni 9 va nella Riserva degli Incidenti Magici (e non si ritira, nemmeno con una Prova Gloriosa). Quando la Riserva supera il Livello da Mago avviene un Incidente: si tirano tutti quei dadi, si sommano e si legge la tabella. Con la Riserva pari al Livello il potere diventa visibile a tutti (Presagio di Sventura).

## Mischiare i Venti
Un Mago Umano può aggiungere dadi bonus alla Prova di Magia: ognuno va anche nella Riserva.

Recuperare toglie un dado dalla Riserva; a fine scontro si svuota senza danni.`,
  },
  {
    id: 'fede',
    category: 'Fede',
    title: 'Fede, Preghiere e Miracoli',
    body: `Il Talento Fede (solo Imperiali, non per chi usa la magia) si prende fino a tre volte, ogni volta dopo una prova di devozione:
- Primo grado: il Favore del dio.
- Secondo: le sue Preghiere, recitate ad alta voce, che durano qualche minuto o fino a fine scontro.
- Terzo: un Miracolo, una volta sola, concordato col GM.

Chi viola i precetti perde i benefici finché non fa ammenda; chi li viola di continuo li perde per sempre.`,
  },
  {
    id: 'intermezzo',
    category: 'Regole',
    title: 'Intermezzi e avanzamento',
    body: `Dopo ogni sessione 1 PE (2 per una vittoria importante). Negli Intermezzi si spendono:
- Caratteristica +1: costa il nuovo valore (1 in meno se Primaria della Carriera).
- Talento: il suo costo.

Ogni Intermezzo dà un’Attività per sessione giocata dall’ultimo (massimo 3): Allenare Abilità, Assistere Contatto, Cambiare Carriera, Creare Avere, Dare Prova di Forza, Esplorare le Terre Selvagge, Fare gli Straordinari, Formalizzare o Memorizzare Incantesimo, Investire Denaro, Propiziare il Fato, Raccogliere Informazioni, Riposare e Rimettersi, Studiare Sapere, Supportare Alleato, Tenere un Basso Profilo, Visitare la Banca.

I fallimenti nelle Prove delle Attività si segnano accanto all’Abilità: quando superano il suo valore, l’Abilità sale di 1 e i segni si azzerano.`,
  },
  {
    id: 'status',
    category: 'Regole',
    title: 'Status e Monete',
    body: `Ogni personaggio ha uno Status (Bronzo, Argento, Oro) dato dalla Carriera. All’inizio di ogni avventura ha tre Monete del suo Status; gli averi di Status inferiore sono gratuiti, quelli del suo costano una Moneta, quelli superiori vanno conquistati.

Comportarsi secondo le aspettative del proprio Status dà +1d nelle Prove sociali, tradirle -1d. Mercanteggiare è Fascino contro Volontà.`,
  },
  {
    id: 'sociali',
    category: 'Regole',
    title: 'Interazioni sociali e indagini',
    body: `- Distrarre: Comando o Fascino, il bersaglio diventa Distratto.
- Analizzare: Percezione, si scopre qualcosa di vero sul bersaglio.
- Convincere: Comando o Fascino contro Volontà.

Nelle indagini si cercano Tracce; con il Sapere giusto gli Indizi si trovano senza Prove.`,
  },
];

function rulesEntries(): CompendiumEntry[] {
  const out: CompendiumEntry[] = RULES.map((r) => ({
    id: `wtow-rule-${r.id}`,
    category: r.category,
    title: r.title,
    text: r.body,
    render: () => <RuleText body={r.body} />,
    card: () => ({ title: r.title, body: r.body.replace(/^## /gm, '') }),
  }));

  for (const k of w.CONDITIONS) {
    out.push({
      id: `wtow-cond-${k}`,
      category: 'Condizioni',
      title: k,
      text: w.CONDITION_INFO[k] ?? '',
      render: () => <p className="small">{w.CONDITION_INFO[k]}</p>,
      card: () => ({ title: k, subtitle: 'Condizione', body: w.CONDITION_INFO[k] }),
    });
  }

  for (const l of w.LINEAGES) {
    const body = [
      `Caratteristiche: ${w.CHARACTERISTICS.map((k) => `${w.CHAR_INFO[k].short} ${w.BASE_CHARS[l.species][k]}`).join(', ')}, Fato ${l.fate}.`,
      `Massimi: ${w.CHARACTERISTICS.map((k) => `${w.CHAR_INFO[k].short} ${w.MAX_CHARS[l.species][k]}`).join(', ')}.`,
      `Abilità a 3: ${l.skills.map((s) => w.SKILL_INFO[s].name).join(', ') || '—'}${l.chooseSkills ? ` più ${l.chooseSkills} a scelta` : ''}.`,
      `Saperi: ${l.lore.join(', ')}.`,
      `Talenti (d10): ${l.talentTable.map((t, i) => `${i + 1} ${t}`).join(', ')}. ${l.talentNote ?? ''}${l.fixedTalents ? ` Sempre: ${l.fixedTalents.join(', ')}.` : ''}`,
    ].join('\n\n');
    out.push({ id: `wtow-lineage-${l.id}`, category: 'Stirpi', title: l.name, text: body, render: () => <RuleText body={body} />, card: () => ({ title: l.name, subtitle: 'Stirpe', body }) });
  }

  for (const c of w.CAREERS) {
    out.push({
      id: `wtow-career-${c.id}`,
      category: 'Carriere',
      title: c.name,
      subtitle: w.STATUS_LABEL[c.status],
      text: `${c.talent.name} ${c.talent.text} ${c.lore} ${c.gear}`,
      render: () => (
        <>
          <Meta
            items={[
              ['Status', w.STATUS_LABEL[c.status]],
              ['Stirpi', c.lineages ? c.lineages.map((id) => w.LINEAGES.find((l) => l.id === id)!.plural).join(', ') : 'Tutte'],
              ['Primarie', c.primary.map((k) => w.CHAR_INFO[k].name).join(', ')],
              ['+1 a quattro tra', c.skills.map((s) => w.SKILL_INFO[s].name).join(', ')],
              ['Saperi', c.lore],
              ['Averi', c.gear],
              ['Risorse', c.resources],
              ['Contatti', c.contacts],
            ]}
          />
          <p className="small">
            <b>{c.talent.name}.</b> {c.talent.text}
          </p>
        </>
      ),
      card: () => ({ title: c.name, subtitle: `Carriera · ${w.STATUS_LABEL[c.status]}`, body: `${c.talent.name}: ${c.talent.text}` }),
    });
  }

  for (const t of w.TALENTS) {
    out.push({
      id: `wtow-talent-${t.id}`,
      category: 'Talenti',
      title: t.name,
      subtitle: `${t.cost} PE`,
      text: `${t.req} ${t.text}`,
      render: () => (
        <>
          <Meta items={[['Costo', `${t.cost} PE${t.ranks ? ` (fino a ${t.ranks} gradi)` : ''}`], ['Requisiti', t.req]]} />
          <p className="small">{t.text}</p>
        </>
      ),
      card: () => ({ title: t.name, subtitle: `Talento · ${t.cost} PE · ${t.req}`, body: t.text }),
    });
  }

  for (const g of w.LORE_GROUPS) {
    out.push({
      id: `wtow-lore-${g.id}`,
      category: 'Saperi',
      title: `Saperi ${g.name}`,
      text: `${g.text} ${g.items.join(' ')}`,
      render: () => <RuleText body={`${g.text}\n\n${g.items.map((x) => `- ${x}`).join('\n')}`} />,
    });
  }

  for (const x of w.WEAPONS) {
    out.push({
      id: `wtow-weapon-${x.id}`,
      category: 'Armi',
      title: x.name,
      subtitle: x.kind === 'mischia' ? 'Da mischia' : x.kind === 'distanza' ? 'A distanza' : 'Da lancio',
      text: x.traits,
      render: () => (
        <Meta
          items={[
            ['Status', x.status ? w.STATUS_LABEL[x.status] : '—'],
            [x.kind === 'mischia' ? 'Portata massima' : 'Portata ottimale', x.range],
            ['Danno', x.damage ?? '—'],
            ['Mani', x.hands === 2 ? 'Due' : 'Una'],
            ['Tratti', x.traits],
          ]}
        />
      ),
    });
  }
  for (const a of [...w.ARMOURS, w.SHIELD]) {
    out.push({
      id: `wtow-armour-${a.id}`,
      category: 'Armature',
      title: a.name,
      text: a.traits,
      render: () => <Meta items={[['Status', w.STATUS_LABEL[a.status]], ['Resilienza', a.bonus ? `+${a.bonus}` : 'R'], ['Tratti', a.traits]]} />,
    });
  }

  for (const s of w.SPELLS) {
    out.push({
      id: `wtow-spell-${s.id}`,
      category: 'Incantesimi',
      title: s.name,
      subtitle: `${s.lore} · VM ${s.vm}`,
      text: `${s.lore} ${s.text}`,
      render: () => (
        <>
          <Meta items={[['Sapere', s.lore], ['VM', s.vm], ['Bersaglio', s.target], ['Portata', s.range], ['Durata', s.duration]]} />
          <p className="small">{s.text}</p>
        </>
      ),
      card: () => ({ title: s.name, subtitle: `${s.lore} · VM ${s.vm}`, tags: [s.target, s.range, s.duration], body: s.text }),
    });
  }

  for (const g of w.GODS) {
    const body = `${g.domain}. Sapere Preferito: ${g.lore}.\n\n## Precetti\n${g.precepts.map((p) => `- ${p}`).join('\n')}\n\n## Favore\n${g.favour}\n\n## Preghiere\n${g.prayers.map((p) => `- ${p.name}: ${p.text}`).join('\n')}\n\n## Miracoli\n${g.miracle}`;
    out.push({ id: `wtow-god-${g.id}`, category: 'Fede', title: g.name, subtitle: g.domain, text: body, render: () => <RuleText body={body} />, card: () => ({ title: g.name, subtitle: g.domain, body: g.favour }) });
  }

  for (const n of w.NPCS) {
    out.push({
      id: `wtow-npc-${n.id}`,
      category: 'Bestiario',
      title: n.name,
      subtitle: `${n.type} · ${n.group}`,
      text: `${n.group} ${n.abilities.map((a) => `${a.name} ${a.text}`).join(' ')}`,
      render: ({ onRoll }) => <NpcBlock npc={n} onRoll={onRoll ?? (() => undefined)} />,
    });
  }

  const wounds = w.WOUND_TABLE.map((r) => `${r.min === r.max ? r.min : r.max > 30 ? `${r.min}+` : `${r.min}-${r.max}`} | ${r.name} | ${r.text} | ${r.heal}`).join('\n');
  out.push({
    id: 'wtow-table-wounds',
    category: 'Tabelle',
    title: 'Tabella delle Ferite',
    text: wounds,
    render: ({ onRoll }) => (
      <>
        {onRoll && (
          <button className="btn sm" onClick={() => onRoll('1d10', 'Tabella delle Ferite')}>
            Tira 1d10
          </button>
        )}
        <RuleText body={`Si tira 1d10 più un d10 per ogni Ferita non medicata.\n\n${wounds}`} />
      </>
    ),
  });
  const miscasts = w.MISCAST_TABLE.map((r) => `${r.min === r.max ? r.min : r.max > 40 ? `${r.min}+` : `${r.min}-${r.max}`} | ${r.text}`).join('\n');
  out.push({
    id: 'wtow-table-miscast',
    category: 'Tabelle',
    title: 'Incidenti Magici',
    text: miscasts,
    render: () => <RuleText body={`Si tirano tutti i dadi della Riserva e si sommano.\n\n${miscasts}`} />,
  });
  // the dice tables of the Guida del Giocatore and the Guida del Gamemaster
  const dRange = (min: number, max: number) => (min === max ? String(min) : max >= 100 ? (min === 100 ? '00' : `${min}-00`) : `${min}-${max}`);
  const retreat = RETREAT_TABLE.map((r) => `${r.max > 30 ? `${r.min}+` : `${r.min}-${r.max}`} | ${r.name} | ${r.text}`).join('\n');
  out.push({
    id: 'wtow-table-retreat',
    category: 'Tabelle',
    title: 'Si Salvi Chi Può!',
    text: retreat,
    render: () => <RuleText body={`1d10 per ogni personaggio che fallisce la Prova di Atletica, sommati.\n\n${retreat}`} />,
  });
  const faults = VEHICLE_FAULTS.map((r) => `${dRange(r.min, r.max)} | ${r.name} | ${r.text}`).join('\n');
  out.push({ id: 'wtow-table-faults', category: 'Tabelle', title: 'Guasti dei Veicoli', text: faults, render: () => <RuleText body={`1d10 quando un Guasto non distrugge il veicolo.\n\n${faults}`} /> });
  const hazards = w.HAZARDS.map((h) => `${h.name} | ${h.skill} | ${h.frequency} | ${h.grade} | ${h.noWound ? '' : 'Ferita, '}${h.condition ?? ''}`).join('\n');
  out.push({ id: 'wtow-table-hazards', category: 'Tabelle', title: 'Esempi di Pericolo', text: hazards, render: () => <RuleText body={`Pericolo | Prova | Frequenza | Grado | Fallendo\n${hazards}`} /> });
  const resources = w.RANDOM_RESOURCES.map((r) => `${dRange(r.min, r.max)} | ${r.bronzo} | ${r.argento} | ${r.oro}`).join('\n');
  out.push({
    id: 'wtow-table-resources',
    category: 'Tabelle',
    title: 'Risorse Casuali',
    text: resources,
    render: ({ onRoll }) => (
      <>
        {onRoll && (
          <button className="btn sm" onClick={() => onRoll('1d100', 'Risorse Casuali')}>
            Tira 1d100
          </button>
        )}
        <RuleText body={`d100 | Bronzo | Argento | Oro\n${resources}\n\nSpendendo 1 PE si tira sulla colonna di uno Status più alto (ma queste risorse vengono spesso confiscate o rubate).`} />
      </>
    ),
  });
  const vehicles = w.VEHICLES.map((v) => `${v.name} | ${v.speedText ?? v.speed} | ${v.resilience}${v.armoured ? ' (corazzato)' : ''} | ${v.breakdowns} | ${v.ram ?? '—'} | ${v.crew}`).join('\n');
  out.push({
    id: 'wtow-table-vehicles',
    category: 'Combattimento',
    title: 'Carri e imbarcazioni',
    text: vehicles,
    render: () => (
      <RuleText
        body={`Veicolo | Velocità | Resilienza | Guasti | Speronamento | Equipaggio\n${vehicles}\n\n## Conduzione\n${w.VEHICLE_HANDLING.map((h) => `${h.vehicle} | ${h.situation} | ${h.skill}`).join('\n')}`}
      />
    ),
  });
  for (const m of w.MOUNTS) out.push({ id: `wtow-mount-${m.id}`, category: 'Combattimento', title: m.name, subtitle: 'Cavalcatura', text: m.text, render: () => <p className="small">{m.text}</p> });

  for (const g of w.CONTACTS) {
    const body = g.contacts.map((c) => `## ${c.name}\n${c.role} (Archetipo: ${c.archetype})\n\n${c.rows.map((r) => `${dRange(r.min, r.max)} | ${r.text}`).join('\n')}`).join('\n\n');
    out.push({
      id: `wtow-contacts-${g.name}`,
      category: 'Talagaad',
      title: `Contatti: ${g.name}`,
      text: body,
      render: ({ onRoll }) => (
        <>
          {onRoll && (
            <button className="btn sm" onClick={() => onRoll('1d100', `Contatti · ${g.name}`)}>
              Tira 1d100
            </button>
          )}
          <RuleText body={body} />
        </>
      ),
    });
  }
  const events = w.TALAGAAD_EVENTS.map((e) => `${dRange(e.min, e.max)} | ${e.text} | ${e.contacts.join(', ')}`).join('\n');
  out.push({
    id: 'wtow-table-events',
    category: 'Talagaad',
    title: 'Eventi di Talagaad',
    text: events,
    render: ({ onRoll }) => (
      <>
        {onRoll && (
          <button className="btn sm" onClick={() => onRoll('1d100', 'Evento di Talagaad')}>
            Tira 1d100
          </button>
        )}
        <RuleText body={`Ogni Intermezzo comincia con un Evento, spesso legato ai Contatti dei personaggi.\n\nd100 | Evento | Contatti coinvolti\n${events}`} />
      </>
    ),
  });
  for (const x of w.SETTING) out.push({ id: `wtow-setting-${x.name}`, category: 'Talagaad', title: x.name, subtitle: x.group, text: x.text, render: () => <p className="small">{x.text}</p> });

  for (const a of w.ACTIVITIES) {
    out.push({
      id: `wtow-activity-${a.id}`,
      category: 'Intermezzo',
      title: a.name,
      subtitle: a.skills.length ? a.skills.map((s) => w.SKILL_INFO[s].name).join(', ') : 'Qualsiasi Abilità',
      text: a.text,
      render: () => (
        <>
          <Meta items={[['Abilità suggerite', a.skills.length ? a.skills.map((s) => w.SKILL_INFO[s].name).join(', ') : 'Qualsiasi'], ['Prova Prolungata', a.extended ? `${a.extended} successi` : '']]} />
          <p className="small">{a.text}</p>
        </>
      ),
      card: () => ({ title: a.name, subtitle: 'Attività dell’Intermezzo', body: a.text }),
    });
  }

  for (const m of w.MAGIC_ITEMS) {
    out.push({
      id: `wtow-item-${m.id}`,
      category: 'Oggetti Magici',
      title: m.name,
      subtitle: m.kind,
      text: `${m.traits} ${m.text}`,
      render: () => (
        <>
          <Meta
            items={[
              ['Tipo', m.kind],
              ['Portata', m.weapon?.range],
              ['Danno', m.weapon?.damage],
              ['Mani', m.weapon ? (m.weapon.hands === 2 ? 'Due' : 'Una') : undefined],
              ['Resilienza', m.resilience],
              ['Tratti', m.traits],
            ]}
          />
          <p className="small">{m.text}</p>
        </>
      ),
      card: () => ({ title: m.name, subtitle: `Oggetto magico · ${m.kind}`, body: `${m.traits}\n\n${m.text}` }),
    });
  }

  const exposure = `Al termine di un giorno di esposizione si tenta una Prova di Volontà con la penalità del caso (se ce ne sono diverse, la peggiore). Fallendo, il GM sceglie una Condizione (Esausto, Distratto o Assordato) e il personaggio diventa Vulnerabile.

Esposizione | Penalità | Esempi
${w.EXPOSURES.map((e) => `${e.name} | ${e.penalty} | ${e.examples}`).join('\n')}

## Gli stadi
${w.CORRUPTION_STAGES.filter((x) => x.id !== 'puro').map((x) => `- ${x.name}: ${x.text}`).join('\n')}

Al tavolo il master segna l’esposizione nel pannello del token; «Fine della giornata» nell’orologio del mondo fa tirare a tutti.`;
  out.push({ id: 'wtow-corruption', category: 'Corruzione', title: 'Esposizione e stadi', text: exposure, render: () => <RuleText body={exposure} /> });
  for (const p of w.CORRUPTION_PATHS) {
    const body = `Vittime favorite: ${p.victims}.\n\n## Vulnerabile\n${p.vulnerabile}\n\n## Offuscato\n${p.offuscato}\n\n${p.gifts.map((g) => `- ${g.name}: ${g.text}`).join('\n')}\n\n## Macchiato\n${p.macchiato}\n\n## Dannato\n${p.dannato}`;
    out.push({ id: `wtow-path-${p.id}`, category: 'Corruzione', title: p.name, subtitle: 'Sentiero verso la Corruzione', text: body, render: () => <RuleText body={body} /> });
  }

  const improvised = `${w.IMPROVISED.map((r) => `${r.level} | VM ${r.vm} | ${r.req} | ${r.damage}`).join('\n')}\n\n${w.IMPROVISED_MODS.map((m) => `- ${m}`).join('\n')}\n\nFormalizzare un incantesimo improvvisato ne dimezza il VM.`;
  out.push({ id: 'wtow-table-improvised', category: 'Magia', title: 'Incantesimi improvvisati', text: improvised, render: () => <RuleText body={improvised} /> });
  return out;
}

export const wtowCompendium = {
  categories: [
    'Regole',
    'Combattimento',
    'Condizioni',
    'Stirpi',
    'Carriere',
    'Talenti',
    'Saperi',
    'Armi',
    'Armature',
    'Oggetti Magici',
    'Magia',
    'Incantesimi',
    'Fede',
    'Intermezzo',
    'Corruzione',
    'Talagaad',
    'Bestiario',
    'Tabelle',
  ],
  entries: () => rulesEntries(),
};

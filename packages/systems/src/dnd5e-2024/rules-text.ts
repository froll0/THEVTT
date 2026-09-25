/**
 * Core rules of the 2024 edition, summarised in Italian from the System
 * Reference Document 5.2 (CC-BY-4.0). Distances in metres.
 *
 * Body format: paragraphs separated by blank lines, "- " for bullets,
 * "## " for sub-headings, "|" separated rows for small tables.
 */

export interface RuleArticle {
  id: string;
  title: string;
  category: string;
  body: string;
}

export const RULES: RuleArticle[] = [
  // ---------- come si gioca ----------
  {
    id: 'd20-tests',
    category: 'Come si gioca',
    title: 'Prove d20',
    body: `Quando l’esito di un’azione è incerto si tira un d20: è una prova d20. Ce ne sono tre tipi: prove di caratteristica, tiri salvezza e tiri per colpire.

Si tira il d20, si aggiungono il modificatore della caratteristica e, se si è competenti, il bonus di competenza, più eventuali altri bonus o penalità. Se il totale è pari o superiore alla Classe Difficoltà (CD) o alla Classe Armatura (CA) del bersaglio, la prova riesce.

## Classi Difficoltà tipiche
Molto facile | 5
Facile | 10
Media | 15
Difficile | 20
Molto difficile | 25
Quasi impossibile | 30`,
  },
  {
    id: 'abilities',
    category: 'Come si gioca',
    title: 'Caratteristiche e modificatori',
    body: `Ogni creatura ha sei caratteristiche: Forza, Destrezza, Costituzione, Intelligenza, Saggezza e Carisma, con un punteggio da 1 a 30 (10-11 è la media umana).

Il modificatore è (punteggio − 10) ÷ 2, arrotondato per difetto: 8-9 → −1, 10-11 → +0, 12-13 → +1, 14-15 → +2, 16-17 → +3, 18-19 → +4, 20 → +5.

- Forza: potenza fisica, atletica, attacchi in mischia.
- Destrezza: agilità, riflessi, equilibrio, CA senza armatura pesante.
- Costituzione: salute e resistenza, punti ferita.
- Intelligenza: ragionamento e memoria.
- Saggezza: percezione e intuito.
- Carisma: forza di personalità.`,
  },
  {
    id: 'advantage',
    category: 'Come si gioca',
    title: 'Vantaggio e Svantaggio',
    body: `Con Vantaggio tiri due d20 e tieni il più alto; con Svantaggio tieni il più basso.

Più fonti di Vantaggio non si sommano: ne hai al massimo uno. Se hai sia Vantaggio sia Svantaggio sullo stesso tiro, si annullano e tiri un solo d20.

Il Vantaggio o lo Svantaggio può venire da capacità, incantesimi, condizioni o dal master quando la situazione lo giustifica.`,
  },
  {
    id: 'proficiency',
    category: 'Come si gioca',
    title: 'Bonus di competenza',
    body: `Il bonus di competenza si aggiunge alle prove d20 che riguardano cose in cui sei addestrato: abilità, armi, strumenti, tiri salvezza e attacchi con incantesimi.

Livello 1-4 | +2
Livello 5-8 | +3
Livello 9-12 | +4
Livello 13-16 | +5
Livello 17-20 | +6

Il bonus si aggiunge una sola volta a un tiro. La Maestria (Expertise) lo raddoppia per le abilità scelte.`,
  },
  {
    id: 'saving-throws',
    category: 'Come si gioca',
    title: 'Tiri salvezza',
    body: `Un tiro salvezza (TS) rappresenta il tentativo di resistere a un pericolo: un veleno, un incantesimo, una trappola. Tiri un d20 e aggiungi il modificatore della caratteristica richiesta, più la competenza se la tua classe ce l’ha in quel TS.

La CD di un effetto di una creatura è di solito 8 + modificatore di caratteristica + bonus di competenza.`,
  },
  {
    id: 'heroic-inspiration',
    category: 'Come si gioca',
    title: 'Ispirazione eroica',
    body: `Se hai Ispirazione eroica puoi spenderla per ritirare un d20 appena tirato, tenendo il nuovo risultato. Non ne puoi avere più di una alla volta.

Il master la assegna per aver interpretato bene il personaggio o compiuto qualcosa di eroico; alcune capacità (come il tratto Intraprendente degli umani) la concedono dopo un riposo lungo.`,
  },
  {
    id: 'skills',
    category: 'Come si gioca',
    title: 'Abilità',
    body: `Le abilità sono aspetti specifici di una caratteristica. Con la competenza in un’abilità aggiungi il bonus di competenza alle prove che la usano.

- Forza: Atletica.
- Destrezza: Acrobazia, Furtività, Rapidità di mano.
- Intelligenza: Arcano, Indagare, Natura, Religione, Storia.
- Saggezza: Addestrare animali, Intuizione, Medicina, Percezione, Sopravvivenza.
- Carisma: Inganno, Intimidire, Intrattenere, Persuasione.

Il master può chiedere una prova con un’abilità abbinata a una caratteristica diversa (per esempio Forza (Intimidire)).`,
  },

  // ---------- esplorazione ----------
  {
    id: 'movement',
    category: 'Esplorazione',
    title: 'Movimento e terreno',
    body: `La Velocità indica quanti metri puoi percorrere in un turno. Puoi dividere il movimento prima e dopo l’azione.

- Terreno difficile: ogni metro costa un metro in più (1,5 m di movimento per ogni casella da 1,5 m diventa 3 m).
- Strisciare, arrampicarsi e nuotare costano 1 m in più per metro, se non hai una Velocità apposita.
- Salto in lungo: con rincorsa di 3 m salti tanti metri quanti 0,3 × il tuo punteggio di Forza; da fermo la metà.
- Salto in alto: con rincorsa 0,9 m + 0,3 × il modificatore di Forza; da fermo la metà.
- Alzarsi da Prono costa metà della Velocità.`,
  },
  {
    id: 'travel',
    category: 'Esplorazione',
    title: 'Viaggio',
    body: `Il ritmo di viaggio determina quanta strada fa il gruppo.

Veloce | 6 km/ora, 45 km/giorno | Svantaggio a Percezione e Sopravvivenza
Normale | 4,5 km/ora, 36 km/giorno | —
Lento | 3 km/ora, 27 km/giorno | Vantaggio a Percezione e Sopravvivenza; si può procedere Furtivi

Dopo 8 ore di marcia, ogni ora in più richiede un TS su Costituzione (CD 10 + 1 per ora extra) o si guadagna un livello di Indebolimento.`,
  },
  {
    id: 'vision',
    category: 'Esplorazione',
    title: 'Luce e visione',
    body: `- Luce intensa: si vede normalmente.
- Penombra: area Leggermente oscurata, Svantaggio alle prove di Percezione basate sulla vista.
- Oscurità: area Pesantemente oscurata; sei di fatto Accecato.

- Scurovisione: entro la sua portata vedi nella penombra come in luce intensa e nell’oscurità come in penombra (senza colori).
- Vista cieca: percepisci ciò che ti circonda senza vedere, entro la portata.
- Vista pura: vedi nell’oscurità normale e magica, le creature invisibili e le illusioni, entro la portata.`,
  },
  {
    id: 'hiding',
    category: 'Esplorazione',
    title: 'Nascondersi',
    body: `Con l’azione Nascondersi fai una prova di Destrezza (Furtività) con CD 15, mentre sei Pesantemente oscurato o dietro Copertura totale o tre quarti, e fuori dalla vista dei nemici.

Se riesci diventi Invisibile finché non fai rumore, attacchi, lanci un incantesimo con componente verbale o un nemico ti trova. Il totale della prova è la CD per trovarti con Saggezza (Percezione).`,
  },
  {
    id: 'hazards',
    category: 'Esplorazione',
    title: 'Pericoli: cadute, soffocamento, fame',
    body: `- Caduta: 1d6 danni contundenti ogni 3 m di caduta, fino a 20d6; atterri Prono.
- Trattenere il fiato: 1 + modificatore di Costituzione minuti (minimo 30 secondi). Poi hai un numero di round pari al modificatore di Costituzione (minimo 1): all’inizio del turno successivo scendi a 0 PF.
- Senza cibo né acqua: ogni giorno senza cibo oltre i 3 + mod. Cos, o senza acqua a sufficienza, guadagni Indebolimento.`,
  },
  {
    id: 'resting',
    category: 'Esplorazione',
    title: 'Riposo breve e riposo lungo',
    body: `## Riposo breve
Almeno 1 ora di attività leggere. Puoi spendere Dadi Vita: per ognuno tiri il dado, aggiungi il modificatore di Costituzione e recuperi quei PF. Alcune capacità si ricaricano.

## Riposo lungo
Almeno 8 ore, di cui almeno 6 di sonno. Alla fine recuperi tutti i PF e tutti i Dadi Vita spesi, gli slot incantesimo e le capacità, e riduci di 1 l’Indebolimento. Puoi fare un solo riposo lungo ogni 24 ore; se viene interrotto da 1 ora di combattimento o fatica, non ha effetto.`,
  },

  // ---------- combattimento ----------
  {
    id: 'combat-order',
    category: 'Combattimento',
    title: 'Iniziativa e sorpresa',
    body: `All’inizio di un combattimento ognuno tira l’iniziativa: una prova di Destrezza. Si agisce in ordine dal più alto al più basso; un round dura circa 6 secondi.

Chi è sorpreso tira l’iniziativa con Svantaggio. In caso di parità tra giocatori decidono loro, tra mostri il master; tra un personaggio e un mostro decide il master.`,
  },
  {
    id: 'your-turn',
    category: 'Combattimento',
    title: 'Il tuo turno',
    body: `Nel tuo turno puoi muoverti fino alla tua Velocità e compiere un’azione. Inoltre:

- Un’azione bonus, se una capacità o un incantesimo te la concede.
- Una reazione per round, anche nel turno di altri (per esempio un attacco di opportunità).
- Un’interazione gratuita con un oggetto (estrarre un’arma, aprire una porta) durante il movimento o l’azione.
- Parlare brevemente.`,
  },
  {
    id: 'actions',
    category: 'Combattimento',
    title: 'Azioni',
    body: `- Attacco: un attacco con un’arma o senz’armi (più attacchi con Attacco extra).
- Scatto: guadagni movimento extra pari alla tua Velocità.
- Disimpegno: il tuo movimento non provoca attacchi di opportunità per il resto del turno.
- Schivata: fino al tuo prossimo turno gli attacchi contro di te hanno Svantaggio e hai Vantaggio ai TS su Destrezza (non se sei Incapacitato o a Velocità 0).
- Aiuto: dai Vantaggio alla prossima prova di un alleato, o al suo prossimo attacco contro un nemico entro 1,5 m da te.
- Nascondersi: prova di Destrezza (Furtività), vedi «Nascondersi».
- Influenzare: prova di Carisma o Saggezza per cambiare l’atteggiamento di una creatura.
- Magia: lanci un incantesimo, usi un oggetto magico o una capacità magica.
- Preparare: scegli un’azione e un innesco; quando l’innesco avviene la compi come reazione.
- Cercare: prova di Saggezza (Intuizione, Medicina, Percezione o Sopravvivenza).
- Studiare: prova di Intelligenza (Arcano, Indagare, Natura, Religione o Storia).
- Utilizzare un oggetto: usi un oggetto che richiede un’azione.`,
  },
  {
    id: 'attack-rolls',
    category: 'Combattimento',
    title: 'Tiri per colpire e colpi critici',
    body: `Tiro per colpire: d20 + modificatore di caratteristica (Forza in mischia, Destrezza a distanza o con armi Accurate) + competenza se sei competente nell’arma. Se eguagli o superi la CA del bersaglio lo colpisci.

- 20 naturale: colpo critico, colpisci sempre e tiri due volte i dadi dei danni dell’attacco.
- 1 naturale: manchi sempre.
- Attaccare un bersaglio che non vedi ti dà Svantaggio; attaccare chi non ti vede ti dà Vantaggio.
- Attacco a distanza con un nemico entro 1,5 m da te: Svantaggio.
- Oltre la gittata normale e fino a quella lunga: Svantaggio.`,
  },
  {
    id: 'cover',
    category: 'Combattimento',
    title: 'Copertura',
    body: `Mezza copertura | +2 alla CA e ai TS su Destrezza | un muretto, un mobile, un’altra creatura
Tre quarti | +5 alla CA e ai TS su Destrezza | una feritoia, un grosso tronco
Totale | non puoi essere bersaglio diretto | completamente nascosto

Se un bersaglio è dietro più fonti di copertura conta solo la più protettiva.`,
  },
  {
    id: 'opportunity-attacks',
    category: 'Combattimento',
    title: 'Attacchi di opportunità',
    body: `Quando una creatura ostile che vedi esce dalla tua portata, puoi usare la reazione per fare un attacco in mischia contro di lei, subito prima che esca.

Non provocano attacchi di opportunità: il Disimpegno, il teletrasporto e l’essere spostati senza usare il proprio movimento, azione o reazione.`,
  },
  {
    id: 'two-weapons',
    category: 'Combattimento',
    title: 'Combattere con due armi',
    body: `Quando attacchi con un’arma con la proprietà Leggera, puoi fare un attacco extra come azione bonus con un’altra arma Leggera nell’altra mano. A quell’attacco extra non aggiungi il modificatore di caratteristica ai danni, a meno che sia negativo.

La maestria Graffiare (Nick) permette di fare l’attacco extra come parte dell’azione Attacco invece che come azione bonus.`,
  },
  {
    id: 'grapple-shove',
    category: 'Combattimento',
    title: 'Lotta e spinta',
    body: `Sono attacchi senz’armi speciali, al posto di un attacco dell’azione Attacco. Il bersaglio deve essere al massimo di una taglia più grande di te ed entro portata.

- Afferrare: il bersaglio fa un TS su Forza o Destrezza (a sua scelta) con CD 8 + mod. Forza + competenza. Se fallisce è Afferrato. Per liberarsi usa un’azione per una prova di Forza (Atletica) o Destrezza (Acrobazia) contro la stessa CD.
- Spingere: stesso TS; se fallisce lo spingi di 1,5 m o lo fai cadere Prono.

Muovere una creatura afferrata costa 1 m in più per metro, se non è di due o più taglie più piccola.`,
  },
  {
    id: 'damage',
    category: 'Combattimento',
    title: 'Danni, resistenze e guarigione',
    body: `I danni riducono i punti ferita. Ogni attacco o effetto indica il tipo di danno.

- Resistenza: il danno di quel tipo è dimezzato (per difetto).
- Vulnerabilità: il danno di quel tipo è raddoppiato.
- Immunità: non subisci quel tipo di danno.
- Si applicano prima i modificatori, poi la resistenza, poi la vulnerabilità.

## Punti ferita temporanei
Assorbono i danni per primi e non si sommano: se ne ricevi altri scegli se tenere i vecchi o i nuovi. Spariscono dopo un riposo lungo.

## Guarigione
Non puoi superare il massimo dei PF. Una creatura a 0 PF che recupera anche 1 PF torna cosciente.`,
  },
  {
    id: 'dying',
    category: 'Combattimento',
    title: 'Cadere a 0 PF',
    body: `Se scendi a 0 PF e il danno rimanente è pari o superiore al tuo massimo di PF, muori sul colpo. Altrimenti sei Privo di sensi e devi fare i tiri salvezza contro la morte.

## Tiri salvezza contro la morte
All’inizio di ogni tuo turno tiri un d20 senza modificatori: 10 o più è un successo, meno di 10 un fallimento. Tre successi: sei stabile. Tre fallimenti: muori.

- 1 naturale: conta come due fallimenti.
- 20 naturale: recuperi 1 PF.
- Subire danni a 0 PF: un fallimento (due se è un critico); se il danno eguaglia il massimo dei PF, muori.

## Stabilizzare
Un’azione e una prova di Saggezza (Medicina) CD 10 stabilizzano una creatura. Una creatura stabile recupera 1 PF dopo 1d4 ore.`,
  },
  {
    id: 'mounted-underwater',
    category: 'Combattimento',
    title: 'In sella e sott’acqua',
    body: `## In sella
Montare o smontare costa metà della Velocità. Una cavalcatura addestrata si muove al tuo turno e può solo Scattare, Disimpegnarsi o Schivare. Se la cavalcatura viene spostata contro la sua volontà, fai un TS su Destrezza CD 10 per non cadere.

## Sott’acqua
Senza Velocità di nuoto, gli attacchi con armi da mischia hanno Svantaggio salvo che con pugnali, giavellotti, lance, spade corte e tridenti. Gli attacchi a distanza oltre la gittata normale mancano; entro la gittata hanno Svantaggio (non con balestre, reti e armi da lancio). Le creature immerse hanno resistenza al fuoco.`,
  },

  // ---------- magia ----------
  {
    id: 'casting',
    category: 'Magia',
    title: 'Lanciare un incantesimo',
    body: `Ogni incantesimo indica tempo di lancio, gittata, componenti e durata.

- Tempo di lancio: azione, azione bonus, reazione o più tempo. Puoi spendere un solo slot per turno.
- Componenti: V (verbale, devi poter parlare), S (somatica, una mano libera), M (materiale: un focus o una borsa per componenti, salvo componenti con costo o consumate).
- Durata: istantanea, un tempo fissato o finché non viene dissolto.

## Attacchi e TS degli incantesimi
Attacco con incantesimo: d20 + mod. della caratteristica da incantatore + competenza. CD del TS: 8 + mod. della caratteristica da incantatore + competenza.`,
  },
  {
    id: 'slots',
    category: 'Magia',
    title: 'Slot incantesimo e livelli superiori',
    body: `Per lanciare un incantesimo di 1° livello o superiore spendi uno slot di quel livello o più alto. Molti incantesimi lanciati con uno slot superiore hanno effetti maggiori, indicati alla voce «Usare uno slot di livello superiore».

I trucchetti non usano slot e i loro danni crescono ai livelli 5, 11 e 17 del personaggio.

Gli slot si recuperano con un riposo lungo; quelli della Magia del patto del warlock anche con un riposo breve.`,
  },
  {
    id: 'concentration',
    category: 'Magia',
    title: 'Concentrazione',
    body: `Alcuni incantesimi richiedono concentrazione per restare attivi. Puoi concentrarti su un solo incantesimo alla volta: iniziarne un altro che la richiede termina il primo.

La concentrazione si interrompe se diventi Incapacitato o muori. Quando subisci danni fai un TS su Costituzione con CD 10 o metà del danno subito (il più alto, massimo 30); se lo fallisci la perdi.`,
  },
  {
    id: 'rituals',
    category: 'Magia',
    title: 'Rituali',
    body: `Un incantesimo con l’etichetta Rituale può essere lanciato come rituale se lo hai preparato: il tempo di lancio aumenta di 10 minuti e non spendi uno slot. Non si può lanciare come rituale a un livello superiore.`,
  },
  {
    id: 'areas',
    category: 'Magia',
    title: 'Aree d’effetto',
    body: `- Cono: si allarga dal punto di origine; la larghezza in ogni punto è pari alla distanza dall’origine.
- Cubo: l’origine sta su una faccia del cubo.
- Cilindro: l’origine è il centro di un cerchio alla base o in cima.
- Emanazione: si estende dalla creatura o dall’oggetto in tutte le direzioni e si muove con esso.
- Linea: si estende dall’origine in linea retta per la lunghezza indicata.
- Sfera: si estende dall’origine in tutte le direzioni.

Sul tavolo usa lo strumento «Aree d’effetto» (A) per disegnarle.`,
  },

  // ---------- glossario ----------
  {
    id: 'damage-types',
    category: 'Glossario',
    title: 'Tipi di danno',
    body: `- Acido, Freddo, Fuoco, Fulmine, Tuono: energie elementali.
- Contundenti, Perforanti, Taglienti: armi e attacchi fisici.
- Forza: pura energia magica.
- Necrotici: energia che consuma la vita.
- Psichici: attacchi alla mente.
- Radiosi: luce sacra e divina.
- Veleno: tossine e gas.`,
  },
  {
    id: 'sizes',
    category: 'Glossario',
    title: 'Taglie delle creature',
    body: `Minuscola | 0,75 × 0,75 m | 4 per casella
Piccola | 1,5 × 1,5 m | 1 casella
Media | 1,5 × 1,5 m | 1 casella
Grande | 3 × 3 m | 2 × 2 caselle
Enorme | 4,5 × 4,5 m | 3 × 3 caselle
Mastodontica | 6 × 6 m | 4 × 4 caselle

Puoi attraversare lo spazio di un alleato o di una creatura di due taglie diverse dalla tua; è terreno difficile.`,
  },
  {
    id: 'exhaustion',
    category: 'Glossario',
    title: 'Indebolimento',
    body: `L’Indebolimento si accumula in livelli, da 1 a 6.

- Ogni livello: −2 a tutte le prove d20 e −1,5 m di Velocità.
- Al 6° livello muori.
- Un riposo lungo riduce l’Indebolimento di 1 livello.`,
  },
  {
    id: 'weapon-properties',
    category: 'Glossario',
    title: 'Proprietà delle armi',
    body: `- Accurata: usi Forza o Destrezza per colpire e per i danni.
- Da lancio: puoi lanciarla per un attacco a distanza con la stessa caratteristica.
- Due mani: serve impugnarla con entrambe le mani.
- Leggera: permette l’attacco extra quando combatti con due armi.
- Munizioni: serve una munizione per attaccare; ne recuperi metà dopo lo scontro.
- Pesante: Svantaggio se la tua Forza (mischia) o Destrezza (distanza) è inferiore a 13.
- Portata: aggiunge 1,5 m alla portata.
- Ricarica: un solo colpo per azione, azione bonus o reazione.
- Versatile: a due mani usa il dado di danno maggiore indicato.`,
  },
];

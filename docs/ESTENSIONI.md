# Estensioni

Un’estensione è un file `.js` che aggiungi dalle **Impostazioni → Estensioni**:
dal **catalogo** integrato, **da un link** (un file `.js` su qualsiasi sito
https, anche GitHub o un gist), da un file o incollando il codice. Prima di
aggiungerla vedi cosa può fare e tutto il suo codice. Resta spenta finché non
la attivi, e gira solo mentre sei al tavolo.

## Cosa può fare, a colpo d’occhio

L’app legge il codice e mostra cosa usa: osservare il tavolo, scrivere in chat,
tirare dadi, agire al tavolo (`dispatch`), aggiungere comandi o pulsanti,
lavorare da sola con dei timer, collegarsi a **internet**. Le ultime due, e
le azioni al tavolo, sono evidenziate: un’estensione che va online può mandare
fuori quello che vede.

Per condividerne una basta metterla online (per esempio in un gist) e passare
il link: chi la aggiunge la legge prima di attivarla.

## Il laboratorio

**Impostazioni → Estensioni → Crea nel laboratorio** (o la matita accanto a
un’estensione) apre un editor fatto per scriverle:

- **suggerimenti mentre scrivi**: dopo `thevtt.`, `state.` o `entry.` compare
  quello che puoi usare, con la spiegazione; scegliendolo si inserisce già
  pronto, con i campi da riempire (Tab passa al successivo). Scrivendo
  `comando`, `pulsante` o `quando` arriva il blocco intero;
- **controlli immediati**: parentesi o virgolette mancanti, nomi di `thevtt`
  che non esistono, intestazione senza nome;
- **modelli** da cui partire (critici, araldo dei turni, borsa del bottino,
  colpo rapido, segnalini) e **frammenti** da inserire con un clic;
- l’**intestazione** si compila anche da un modulo (nome, descrizione,
  versione);
- un **banco di prova**: un tavolo finto ma con le regole vere (tu da master,
  Lia giocatrice, una guerriera e due goblin in iniziativa). L’estensione gira
  lì mentre scrivi: i suoi pulsanti e comandi si provano subito, e si può far
  succedere qualcosa (Lia tira, un 20 o un 1 naturale, il turno che passa). La
  console mostra messaggi, tiri, avvisi, errori e `thevtt.log`;
- una **guida** dell’API con un pulsante per inserire ogni voce;
- `Ctrl+S` (`⌘S` su Mac) salva tra le tue estensioni, **Esporta** la scarica come `.js`.

## Cosa può fare

L’estensione gira in un *worker* separato dall’app: non vede la pagina, i dati
salvati, le password né il resto del computer. Vede il tavolo **come lo vedi
tu** (da master: tutto) e agisce con le **stesse azioni** dei tuoi clic, che il
tavolo controlla come sempre: un giocatore non può muovere i token degli altri
nemmeno con un’estensione. Può collegarsi a internet come una pagina web, e
non può fare più di 20 azioni al secondo.

## Intestazione

```js
// @name Meteo casuale
// @description Tira il tempo ogni mattina
// @version 1.0
```

Un’estensione con lo stesso nome di una già installata la aggiorna.

## L’oggetto `thevtt`

| | |
|---|---|
| `thevtt.state` | il tavolo come lo vedi tu |
| `thevtt.on('state', fn)` | a ogni cambiamento del tavolo: `fn(state)` |
| `thevtt.on('log', fn)` | a ogni riga nuova in chat (messaggi, tiri, schede): `fn(entry)` |
| `thevtt.on('turn', fn)` | quando l’iniziativa passa al prossimo: `fn(entry, state)` |
| `thevtt.command(nome, descrizione, fn)` | un comando di chat: `/nome argomenti` chiama `fn(argomenti, state)` |
| `thevtt.button(etichetta, fn)` | un pulsante sulla barra delle macro |
| `thevtt.chat(testo)` | scrive in chat |
| `thevtt.roll(formula, etichetta)` | tira i dadi (`2d6+3`, `4d6kh3`…) |
| `thevtt.card({ title, subtitle, body, tags, rolls })` | una scheda in chat |
| `thevtt.dispatch(azione)` | qualsiasi azione del tavolo (vedi `packages/shared/src/game/actions.ts`) |
| `thevtt.toast(testo)` | un avviso in basso |
| `thevtt.log(...valori)` | una riga nella console del laboratorio (anche `console.log`); al tavolo non si vede |

## Esempio

```js
// @name Turni ad alta voce
// @description Annuncia in chat di chi è il turno
// @version 1.0

thevtt.on('turn', (entry) => {
  if (entry) thevtt.chat(`Tocca a ${entry.name}!`);
});

thevtt.command('moneta', 'Testa o croce', () => thevtt.chat(Math.random() < 0.5 ? 'Testa!' : 'Croce!'));
```

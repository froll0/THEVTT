# Architettura

## Principi

1. **Il master è l'host.** Durante una sessione tutto ciò che riguarda il gioco — validazione delle
   azioni, tiri di dado, stato del tavolo, mappe — gira sul computer del master
   (`GameHost` in `packages/shared`). Lo stato viene salvato in locale
   (`<userData>/data/table-<campaignId>.json`) e ripreso alla sessione successiva.
2. **Il server è social + relay.** Conserva account, amicizie, campagne, inviti e schede dei
   personaggi; durante la sessione inoltra messaggi opachi tra master e giocatori senza leggerli.
3. **Il regolamento è un plugin.** Il core (tavolo, dadi, iniziativa, social) non conosce regole
   specifiche. Ogni sistema fornisce una parte logica (`packages/systems`) e una parte UI
   (`apps/desktop/src/renderer/src/systems`).
4. **L'interfaccia è guidata da variabili CSS.** Tutte le impostazioni di aspetto scrivono token
   (`--accent`, `--radius`, `--space`, `--font`, …) su `:root`; il CSS personalizzato dell'utente
   può sovrascrivere qualsiasi cosa.

## Flusso di una sessione

```
Giocatore                     Server (relay)                     Master (host)
    |  session.join  ------------> |                                  |
    |                              | --- session.peer(joined) ------> |
    |  relay.host {hello} -------> | --- relay {from, hello} -------> | GameHost.connect()
    |                              | <-- relay.peer {asset…, state} - | vista filtrata
    | <--------- relay {state} --- |                                  |
    |  relay.host {action} ------> | --- relay {from, action} ------> | valida, tira, applica
    | <--------- relay {state} --- | <-- relay.peer (a ciascuno) ---- |
```

- Ogni giocatore riceve una **vista filtrata** (`viewFor`): niente token nascosti, niente tiri
  privati altrui, niente note del master, solo la scena attiva.
- Le immagini (mappe, ritratti) sono **asset** separati dallo stato: il master li invia una sola
  volta per giocatore, poi lo stato li referenzia per id.
- Se il master si disconnette, il server chiude la sessione; i giocatori restano "in attesa" e si
  ricollegano automaticamente quando la sessione riparte.
- Quando cambia una scheda al tavolo, il master la sincronizza sul server (il master può
  modificare le schede dei personaggi seduti nella sua campagna).

## Permessi al tavolo

| Azione                              | Master | Giocatore                                   |
| ----------------------------------- | ------ | ------------------------------------------- |
| Scene, mappe, note, asset           | ✓      | —                                           |
| Creare token                        | ✓      | solo il proprio personaggio, una volta      |
| Muovere / eliminare token           | ✓      | solo token che controlla                    |
| Modificare token                    | ✓      | PF, condizioni, colore, nome dei propri     |
| Tiri e chat                         | ✓      | ✓ (privati visibili solo al master)         |
| Iniziativa                          | ✓      | aggiunge i propri token, chiude il suo turno |
| Scheda personaggio                  | ✓      | solo la propria                             |

## Aggiungere un sistema di gioco

1. In `packages/systems/src/<id>/` implementa `GameSystem` (`types.ts`): creazione,
   validazione, riepilogo, tiri rapidi, valori di default del token, condizioni.
2. Registralo in `packages/systems/src/index.ts` con `registerSystem`.
3. In `apps/desktop/src/renderer/src/systems/<id>/` crea `Builder` (creazione guidata) e `Sheet`
   (scheda al tavolo) e aggiungili a `systems/index.ts`.

Il server non ha bisogno di modifiche: memorizza solo `systemId` e i dati della scheda in JSON.

## Server

- Fastify + `ws`, database `node:sqlite` (nessuna dipendenza nativa), migrazioni in `db.ts`.
- Password con scrypt, token opachi (salvati come hash SHA-256, validità 30 giorni).
- WebSocket su `/ws?token=…`: presenza, notifiche, sessioni e relay (payload fino a 16 MB).

## Desktop

- Electron con `contextIsolation` e `sandbox`; il preload espone solo `window.thevtt`
  (controlli finestra, archivio JSON locale, info app).
- Il renderer funziona anche in un normale browser (`pnpm dev:web`), usando `localStorage` al
  posto dell'archivio locale: comodo per sviluppo e test.

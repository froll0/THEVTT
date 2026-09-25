# Architettura

## Principi

1. **Il master è l'host.** Durante una sessione tutto ciò che riguarda il gioco — validazione delle
   azioni, tiri di dado, stato del tavolo, mappe — gira sul computer del master
   (`GameHost` in `packages/shared`). Lo stato viene salvato in locale
   (`<userData>/data/table-<campaignId>.json`) e ripreso alla sessione successiva.
2. **Il server è social + signaling (+ relay di riserva)** e gira dentro l'app di chi lo ospita
   (`apps/desktop/src/main/hosted-server.ts`), oppure in modo autonomo (`thevtt-server.mjs`). Conserva account, amicizie, campagne,
   inviti e schede dei personaggi; durante la sessione mette in contatto master e giocatori per la
   connessione diretta e, solo se questa non è possibile, inoltra messaggi opachi senza leggerli.
3. **Il regolamento è un plugin.** Il core (tavolo, dadi, iniziativa, social) non conosce regole
   specifiche. Ogni sistema fornisce una parte logica (`packages/systems`) e una parte UI
   (`apps/desktop/src/renderer/src/systems`).
4. **L'interfaccia è guidata da variabili CSS.** Tutte le impostazioni di aspetto scrivono token
   (`--accent`, `--radius`, `--space`, `--font`, …) su `:root`; il CSS personalizzato dell'utente
   può sovrascrivere qualsiasi cosa.

## Flusso di una sessione

Il giocatore entra subito tramite relay (così gioca da subito), e in parallelo apre la connessione
diretta. Appena il data channel è aperto, entrambi i lati passano su di esso.

```
Giocatore                     Server                              Master (host)
    |  session.join  ------------> |                                  |
    |  relay.host {hello} -------> | --- relay {from, hello} -------> | GameHost.connect()
    | <--------- relay {state} --- | <-- relay.peer {asset…, state} - | vista filtrata
    |                              |                                  |
    |  rtc.signal {offer} -------> | --- rtc.signal {from, offer} --> | PeerLink (answerer)
    | <------- rtc.signal {answer, candidati ICE} ------------------- |
    |                                                                  |
    | ======== WebRTC data channel "game" (DTLS, affidabile) ========= |
    |  {action} ---------------------------------------------------->  | valida, tira, applica
    | <---------------------------------------------- {asset…, state}  |
```

- **Trasporto** (`apps/desktop/src/renderer/src/lib/p2p.ts`): un `PeerLink` per giocatore sul master,
  uno verso il master sul giocatore. I messaggi grandi (mappe) sono spezzati in frame da 60 KB
  (`packages/shared/src/frames.ts`) e inviati con controllo del buffer.
- **Ripiego**: se il canale non si apre entro 12 s o cade, i messaggi tornano sul relay senza
  interruzioni; il giocatore ritenta fino a 3 volte. Il master può anche rifiutare le connessioni
  dirette (impostazione "Connessione diretta").
- **Ordine**: ogni stato inviato ha un numero di revisione crescente; durante il passaggio
  relay → diretto il giocatore scarta gli snapshot più vecchi di quello già ricevuto.
- **Sicurezza**: il server inoltra il signaling solo tra l'host della sessione e i giocatori seduti
  a quel tavolo, quindi ogni link è legato a un utente autenticato. Il canale è cifrato (DTLS).
- **ICE**: il client chiede i server STUN/TURN a `GET /rtc/config` (configurabili con
  `THEVTT_ICE_SERVERS`).

- Ogni giocatore riceve una **vista filtrata** (`viewFor`): niente token nascosti o sotto la
  nebbia di guerra (tranne i propri), niente tiri privati altrui, niente note del master, solo
  la scena attiva.
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
   (scheda) e, se serve, `Bestiary`/`StatBlock`; registrali in `systems/index.ts`.

Il server non ha bisogno di modifiche: memorizza solo `systemId` e i dati della scheda in JSON.

## Server ospitato nell'app

- Il processo principale di Electron esegue lo stesso server Fastify (Node 24 include
  `node:sqlite`), con i dati nella cartella utente e la configurazione in `server-config.json`.
- UPnP (`apps/server/src/upnp.ts`): scoperta SSDP del router, `AddPortMapping` (con ripiego su
  lease a tempo e rinnovo), IP esterno, rimozione alla chiusura; rilevamento CGNAT.
- Alla chiusura dell'app il server e la mappatura della porta si chiudono entro 3 secondi.

## Server

- Fastify + `ws`, database `node:sqlite` (nessuna dipendenza nativa), migrazioni in `db.ts`.
- Password con scrypt, token opachi (salvati come hash SHA-256, validità 30 giorni).
- WebSocket su `/ws?token=…`: presenza, notifiche, sessioni, signaling WebRTC e relay (payload fino a 16 MB).

## Desktop

- Electron con `contextIsolation` e `sandbox`; il preload espone solo `window.thevtt`
  (controlli finestra, archivio JSON locale, info app).
- Il renderer funziona anche in un normale browser (`pnpm dev:web`), usando `localStorage` al
  posto dell'archivio locale: comodo per sviluppo e test.

## Test

- `pnpm test`: unità (dadi, `GameHost`, nebbia e aree, regole D&D, UPnP contro un router finto,
  server REST + WebSocket).
- `pnpm e2e`: Playwright guida due istanze Electron reali (profili separati con
  `THEVTT_USER_DATA`): server ospitato, amicizia, invito, sessione con collegamento diretto,
  tiri dalla scheda, bestiario, nebbia, aree; più il percorso di creazione del personaggio.
  Gira anche nel CI con Xvfb.

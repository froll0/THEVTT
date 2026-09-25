# TheVTT

Virtual tabletop **desktop** con launcher social: account, amici, inviti, campagne e personaggi.
Durante la sessione **l'hosting è affidato al master**: regole, tiri di dado, stato del tavolo e mappe
vivono sul suo computer, e i giocatori si collegano **direttamente** a lui (WebRTC). Il server centrale
gestisce la parte social, mette in contatto master e giocatori e fa da relay solo quando la connessione
diretta non è possibile.

Il motore non è legato a un gioco: i regolamenti sono plugin. Il primo è **D&D 5.5 (2024)**, basato
sul System Reference Document 5.2 (CC-BY-4.0).

## Cosa c'è già

**Tutto in uno**
- Un solo programma: chi ospita attiva il server dentro l'app con un clic ("Ospito io"), gli
  amici si uniscono con il **codice del gruppo** ("Mi unisco"). Niente terminale, niente router
- Collegamento automatico senza aprire porte (tunnel Cloudflare) e codice del gruppo permanente;
  in alternativa apertura della porta via UPnP o rete di casa
- Connessione diretta master ↔ giocatori (WebRTC) con ripiego automatico sul server

**Launcher**
- Account, amici con presenza online, notifiche (campanella), campagne, inviti
- **Chat** fuori dal tavolo: messaggi privati tra amici e chat di ogni campagna, con non letti
- **Prossima sessione**: il master fissa data e ora, i giocatori rispondono (ci sono / forse / non
  posso), promemoria in Home
- Interfaccia minimal: navigazione nella barra del titolo, elenchi senza riquadri, temi
- **Compendio** consultabile e ricercabile: regole (SRD 5.2 riassunto in italiano), condizioni,
  incantesimi, mostri, classi, specie, background, talenti, equipaggiamento

**Personaggi D&D 5.5 (2024)** — dati SRD 5.2, in italiano, distanze in metri
- Creazione guidata: classe, specie (con lignaggi e ascendenze), background (o personalizzato),
  caratteristiche (serie standard, punti, tiro), abilità, maestrie, lingue, sottoclasse,
  aumenti/talenti, scelte di classe (ordini, stili, suppliche, metamagia…), incantesimi,
  equipaggiamento iniziale, aspetto e personalità
- 12 classi con privilegi dal 1° al 20° livello e sottoclassi, 219 incantesimi, armi con
  proprietà e maestria, armature, oggetti, talenti
- Scheda: PF con danni/cure/temporanei, CA dall'equipaggiamento, attacchi calcolati, risorse
  (Ira, Ispirazione bardica, Punti focus…), slot e lancio incantesimi con dadi automatici,
  privilegi, inventario con monete e peso, riposi breve e lungo, passaggio di livello
- Salvataggio automatico; le schede vecchie vengono aggiornate da sole

**Tavolo** (ospitato dal master)
- Mappa con griglia, pan/zoom, mappe caricate o trascinate, più scene
- Token con PF, CA, taglia, condizioni (con spiegazione), ritratti, token nascosti
- **Muri, porte e finestre** tracciati sulla griglia (a catena o come stanze); le porte si aprono
  con un clic, i muri fermano i token dei giocatori
- **Luci dinamiche e visione**: ogni giocatore vede solo ciò che vedono i suoi token, con luce
  ambientale (giorno, penombra, buio), torce e lanterne su token e oggetti, scurovisione, ombre
  sui muri e memoria delle zone già esplorate; anteprima "vista giocatori" per il master
- **Oggetti di scena**: casse, tavoli, falò, colonne, alberi… o immagini proprie, sotto i token;
  si spostano, ruotano, illuminano, bloccano la vista o restano nascosti
- **Aure** attorno ai token; mappe con griglia propria allineabili a quella del tavolo
- **Nebbia di guerra**: il master scopre e copre a pennellate; i giocatori non ricevono nemmeno
  i token sotto la nebbia
- **Aree d'effetto**: sfera, cono, linea, cubo, con misura in metri
- **Bestiario**: 140 creature SRD dal GS 0 al 30, più un editor di creature personalizzate
  (da zero o duplicando un mostro), import/export
- **Dadi 3D** che rotolano sul tavolo (il risultato lo decide sempre l'host), disattivabili
- **Musica** condivisa: il master carica una scaletta, suona per tutti in sincrono, volume a testa
- **Note e dispense**: private, per tutti o per alcuni giocatori, con immagini; avviso a chi le riceve
- **Disegno a mano libera** con colori, spessori e gomma
- Righello, ping, dadi autoritativi (vantaggio/svantaggio, tiri nascosti per il master, tiri alla
  cieca per i giocatori), chat con comandi e **schede** di incantesimi, attacchi, privilegi e
  oggetti inviate dalla scheda con i pulsanti per tirare
- Iniziativa con round e turni, tiro per tutti i token con i modificatori giusti
- Danni, metà danni o cure di un tiro applicati al token selezionato con un clic
- Schede e voci del compendio in **finestre** spostabili, ridimensionabili e riducibili; ogni
  giocatore riceve solo le proprie schede, il master l'elenco

**Personalizzazione**
- Temi (Ossidiana, Grafite, Carta, Pergamena…), modalità chiara/scura, accento, carattere,
  dimensione, angoli, densità, pannelli traslucidi, animazioni ridotte
- Pannello del tavolo a sinistra o destra, colori di tavolo e griglia, nomi dei token
- CSS personalizzato, import/export del tema

## Installazione (per giocare)

Gli installer vengono generati automaticamente da GitHub Actions (workflow **Installer**):

- **Versioni ufficiali**: pagina *Releases* del repository, un file per sistema.
- **Ultima build di sviluppo**: tab *Actions* → workflow *Installer* → ultima esecuzione →
  sezione *Artifacts* (serve essere loggati su GitHub).

| Sistema | File | Note |
| ------- | ---- | ---- |
| Windows | `TheVTT-Setup-x.y.z.exe` | L'app non è ancora firmata: alla schermata blu di Windows clicca *Ulteriori informazioni* → *Esegui comunque*. |
| macOS   | `TheVTT-x.y.z-mac-arm64.dmg` (Apple Silicon) o `-x64.dmg` (Intel) | App non firmata: dopo averla copiata in Applicazioni, se macOS dice che è danneggiata esegui `xattr -cr /Applications/TheVTT.app` nel Terminale. |
| Linux   | `.AppImage` (qualsiasi distro) o `.deb` (Debian/Ubuntu) | Per l'AppImage: `chmod +x` e avvio con doppio clic. |

### Giocare con gli amici

Ogni gruppo usa **un solo server** (account, amici, campagne). Ci sono tre modi:

1. **Ospito io** (consigliato). Il master sceglie *Ospito io* alla prima apertura: il server parte
   dentro l'app e, con il *collegamento automatico*, diventa raggiungibile da internet senza toccare
   il router (tunnel gratuito di Cloudflare, `cloudflared` viene scaricato al primo uso). L'app
   mostra un **codice del gruppo** (es. `HKM3-RD4S-P2YL-F3FR`) che non cambia mai: gli amici scelgono
   *Mi unisco* e lo inseriscono. Il codice pubblica l'indirizzo del momento, firmato, su un servizio
   di messaggi pubblico (ntfy.sh): nessuno può spacciarsi per il tuo server. Il master deve tenere
   TheVTT aperto mentre si gioca.
2. **Stessa rete di casa**: gli amici inseriscono l'indirizzo locale mostrato in *Impostazioni → Server*.
3. **Server sempre acceso** (per gruppi che vogliono essere indipendenti dal PC del master): un
   piccolo VPS, un Raspberry Pi o un NAS con Docker.

   ```bash
   docker build -t thevtt-server .
   docker run -d -p 4477:4477 -v thevtt-data:/data --restart unless-stopped thevtt-server
   ```

   Oppure senza Docker: scarica `thevtt-server.mjs` dalla Release, installa Node.js 22.13+ e
   `node thevtt-server.mjs`. Serve un indirizzo raggiungibile (porta 4477 aperta o un proxy https).

Note sul collegamento automatico: i tunnel Cloudflare senza account sono gratuiti ma senza garanzia
di disponibilità; se non funziona, l'app riprova da sola e restano UPnP e la rete di casa. Il
servizio dei codici si cambia con la variabile `THEVTT_RENDEZVOUS` (un server ntfy proprio).

Per preimpostare l'indirizzo negli installer, crea la variabile di repository
`THEVTT_SERVER_URL` (*Settings → Secrets and variables → Actions → Variables*).

### Pubblicare una versione

```bash
git tag v0.2.0
git push origin v0.2.0
```

Il workflow genera gli installer con quella versione e crea la Release con tutti i file.

In alternativa, senza usare git: tab *Actions* → *Installer* → *Run workflow*, scrivi la versione
(es. `v0.2.0`) nel campo *Versione da pubblicare*. GitHub crea il tag e la Release sull'ultimo commit.

## Struttura

```
apps/
  desktop/   Electron + React: launcher e tavolo (il master fa da host)
  server/    Server social e relay (Fastify, WebSocket, SQLite)
packages/
  shared/    Contratti API e realtime, dadi, GameHost autoritativo
  systems/   Interfaccia dei sistemi di gioco + D&D 5.5 (2024)
docs/
  ARCHITECTURE.md
```

## Avvio in sviluppo

Richiede Node 22.13+ e pnpm 10.

```bash
pnpm install
pnpm dev:server      # server su http://localhost:4477
pnpm dev:desktop     # app Electron (Vite + hot reload)
pnpm dev:web         # oppure solo il renderer nel browser: http://localhost:5199
```

Per provare il multigiocatore in locale apri due finestre (o un'app e una scheda del browser)
e registra due utenti.

## Comandi

```bash
pnpm test        # test di dadi, host, nebbia, regole D&D, UPnP e server (REST + WebSocket)
pnpm e2e         # test end-to-end: due app Electron reali (tavolo multigiocatore, personaggio)
pnpm typecheck   # TypeScript su tutti i pacchetti
pnpm build       # build di server e desktop
pnpm dist        # installer (Windows NSIS, macOS DMG, Linux AppImage/deb) in apps/desktop/release
```

Variabili d'ambiente del server: `PORT` (default 4477), `HOST`, `THEVTT_DB` (percorso SQLite),
`THEVTT_ICE_SERVERS` (server STUN/TURN in JSON, es.
`[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]`; default: STUN pubblici).
Un server TURN aumenta la percentuale di connessioni dirette dietro NAT restrittivi; senza, quei
giocatori usano il relay.
L'indirizzo del server si cambia dalla schermata di accesso; il default del client si imposta
con `VITE_THEVTT_SERVER` in build.

## Prossimi passi

- Scoperta automatica del master in LAN
- Sottoclassi e opzioni oltre l'SRD (contenuti con licenza o creati dal gruppo)
- Secondo sistema di gioco per validare l'astrazione dei plugin
- Aggiornamenti automatici dell'app e firma degli installer (Windows e macOS)

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
  amici si uniscono incollando l'indirizzo ("Mi unisco"). Niente terminale
- Apertura automatica della porta sul router (UPnP), indirizzo da copiare, avvisi chiari se il
  router non collabora o il provider usa CGNAT
- Connessione diretta master ↔ giocatori (WebRTC) con ripiego automatico sul server

**Launcher**
- Account, amici con presenza online, notifiche (campanella), campagne, inviti
- Interfaccia minimal: navigazione nella barra del titolo, elenchi senza riquadri, temi

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
- **Nebbia di guerra**: il master scopre e copre a pennellate; i giocatori non ricevono nemmeno
  i token sotto la nebbia
- **Aree d'effetto**: sfera, cono, linea, cubo, con misura in metri
- **Bestiario** SRD per il master: statistiche, attacchi tirabili, PF medi o tirati
- Righello, ping, dadi autoritativi (vantaggio/svantaggio, tiri nascosti), chat con comandi
- Iniziativa con round e turni, tiro per tutti i token con i modificatori giusti
- Scheda del personaggio al tavolo, note private del master

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

### Il server

Serve **un solo server** per tutto il gruppo (account, amici, campagne). Scarica
`thevtt-server.mjs` (dalla Release o dagli Artifacts), installa Node.js 22.13+ e avvia:

```bash
node thevtt-server.mjs
```

Ascolta sulla porta 4477 e salva i dati nella cartella `data/` accanto a dove lo lanci. Nell'app,
alla schermata di accesso, clicca sull'indirizzo del server in basso per impostarlo
(es. `http://192.168.1.10:4477` in LAN, o l'IP pubblico con la porta 4477 aperta sul router).

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

- Hosting senza server per partite in LAN (scoperta locale del master)
- Linee di vista e luci dinamiche
- Sottoclassi e opzioni oltre l'SRD (contenuti con licenza o creati dal gruppo)
- Musica e suoni d'ambiente condivisi, dispense per i giocatori
- Secondo sistema di gioco per validare l'astrazione dei plugin
- Aggiornamenti automatici dell'app e firma degli installer (Windows e macOS)

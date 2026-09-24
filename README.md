# TheVTT

Virtual tabletop **desktop** con launcher social: account, amici, inviti, campagne e personaggi.
Durante la sessione **l'hosting è affidato al master**: regole, tiri di dado, stato del tavolo e mappe
vivono sul suo computer, e i giocatori si collegano **direttamente** a lui (WebRTC). Il server centrale
gestisce la parte social, mette in contatto master e giocatori e fa da relay solo quando la connessione
diretta non è possibile.

Il motore non è legato a un gioco: i regolamenti sono plugin. Il primo è **D&D 5.5 (2024)**, basato
sul System Reference Document 5.2 (CC-BY-4.0).

## Cosa c'è già

**Launcher**
- Registrazione / accesso, presenza online in tempo reale
- Amici: ricerca, richieste, accetta/rifiuta, rimozione
- Campagne: crea, modifica, elimina; invita amici; rimuovi o lascia
- Personaggi: creazione guidata, bozze, assegnazione a una campagna
- Notifiche in tempo reale (richieste, inviti, sessioni aperte)

**Tavolo** (ospitato dal master)
- Connessione diretta master ↔ giocatori (WebRTC data channel); se non riesce, ripiego automatico e
  trasparente sul relay del server. Indicatore "Diretta / Via server" e "n/m diretti" per il master
- Mappa su canvas con griglia, pan/zoom, mappe caricate o trascinate sul tavolo
- Token: movimento, PF, CA, taglia, condizioni, ritratto, token nascosti, controllo per giocatore
- Righello (5 ft per casella, diagonali 2024), ping animati
- Dadi autoritativi (tirati dall'host): `2d20kh1+5`, `4d6dl1`, vantaggio/svantaggio, tiri nascosti del master
- Chat con `/r`, `/gr` (tiro nascosto), `/gm` (messaggio privato al master)
- Iniziativa con round e turni; il giocatore può chiudere il proprio turno
- Più scene per campagna, note private del master
- Scheda cliccabile: ogni caratteristica, tiro salvezza e abilità si tira con un clic

**D&D 5.5 (2024)**
- 12 classi, 9 specie, background SRD + background personalizzato
- Serie standard, acquisto a punti (27), tiro 4d6
- Aumenti del background +2/+1 o +1/+1/+1
- Calcolo di PF, CA (armature, scudo, Difesa senza armatura), competenza, TS, abilità, CD incantesimi
- Validazione completa delle scelte

**Personalizzazione**
- Temi predefiniti, modalità chiara/scura/sistema, colore d'accento libero
- Carattere, scala dell'interfaccia, arrotondamento, densità, effetto vetro, animazioni ridotte
- Barra laterale e pannello del tavolo a sinistra o destra, barra compatta
- Colori di tavolo e griglia, nomi dei token, barre PF
- CSS personalizzato, import/export del tema in JSON

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
pnpm test        # test di dadi, host, regole D&D e server (flussi REST + WebSocket)
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
- Nebbia di guerra e linee di vista
- Compendio SRD (incantesimi, mostri, equipaggiamento) e attacchi/incantesimi sulla scheda
- Livellamento guidato e sottoclassi
- Secondo sistema di gioco per validare l'astrazione dei plugin
- Aggiornamenti automatici dell'app e firma degli installer (Windows e macOS)

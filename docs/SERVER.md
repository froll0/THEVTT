# Un server sempre acceso

Di solito il server del gruppo gira dentro l'app del master: quando il suo PC è spento, gli altri vedono solo la copia salvata sul proprio computer.

Con un server sempre acceso, invece, account, campagne, personaggi, diari, riassunti e chat ci sono a ogni ora: si preparano i personaggi, si fissa la prossima sessione e si scrive al gruppo anche a metà settimana. Il tavolo di gioco lo apre sempre il master dalla sua app; il server fa da punto d'incontro.

## Cosa serve

Una macchina sempre accesa e raggiungibile da internet:

- un piccolo VPS (Hetzner, OVH, il piano gratuito di Oracle Cloud);
- un Raspberry Pi o un NAS di casa, con la porta aperta sul router.

Bastano poche risorse: 1 CPU e 512 MB di RAM vanno bene per un gruppo.

## Con Docker (consigliato)

Dalla cartella del progetto:

```bash
docker build -t thevtt-server .
docker run -d --name thevtt -p 4477:4477 -v thevtt-data:/data --restart unless-stopped thevtt-server
```

I dati restano nel volume `thevtt-data`. Per aggiornare, ricostruisci l'immagine e riavvia il contenitore: i dati non si toccano.

## Senza Docker

1. Installa Node.js 22.13 o più recente.
2. Dalla pagina della Release scarica `thevtt-server.mjs` e `thevtt-web.zip`, ed estrai lo zip nella stessa cartella. Così accanto al server c'è la cartella `web`.
3. Avvia il server:

   ```bash
   node thevtt-server.mjs
   ```

Variabili utili:

| Variabile | A cosa serve | Predefinito |
| --- | --- | --- |
| `PORT` | la porta | `4477` |
| `THEVTT_DB` | dove sta il database | `./data/thevtt.sqlite` |
| `THEVTT_WEB` | la cartella del client web | `./web` |
| `THEVTT_ICE_SERVERS` | server TURN per voce e video, in JSON | — |

Per tenerlo acceso anche dopo un riavvio, usa un servizio systemd o `pm2`.

## Indirizzo https (consigliato)

Con un nome di dominio, [Caddy](https://caddyserver.com) davanti al server ottiene da solo il certificato:

```
tavolo.esempio.it {
  reverse_proxy localhost:4477
}
```

L'https serve per voce e video dal browser, che i browser concedono solo sulle pagine sicure.

## Come entrano i giocatori

- **Con l'app**: alla prima schermata scelgono «Mi unisco» e inseriscono l'indirizzo, per esempio `tavolo.esempio.it` oppure `203.0.113.7:4477`.
- **Dal browser**: aprono `https://tavolo.esempio.it/play/`. Non devono installare niente.
- **Il master**: entra allo stesso modo, con «Mi unisco». Quando avvia la sessione dalla pagina della campagna, il tavolo parte dal suo computer e i giocatori lo raggiungono attraverso il server.

## Spostare un gruppo già esistente

Se finora il server girava nell'app del master, account, campagne e personaggi stanno sul suo PC. Per portarli sul nuovo server:

1. Dall'app del master: Impostazioni → Backup → Crea backup. Si ottiene un file `.thevtt-backup`.
2. Copia il file sul server e, prima di farci entrare qualcuno, importalo con `--import` (il comando importa e si ferma; poi avvii il server come al solito):

   ```bash
   node thevtt-server.mjs --import gruppo.thevtt-backup
   ```

   Con Docker:

   ```bash
   docker run --rm -v thevtt-data:/data -v "$PWD":/in thevtt-server node thevtt-server.mjs --import /in/gruppo.thevtt-backup
   ```

   Se il server ha già un database, aggiungi `--force` per sostituirlo.

Le mappe e i tavoli restano nell'app del master, che continua a ospitare il tavolo di gioco.

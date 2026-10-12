# Firmare gli installer

Senza firma gli installer funzionano lo stesso, ma:

- **Windows**: SmartScreen avvisa che il programma è «non riconosciuto». Si clicca «Ulteriori informazioni → Esegui comunque».
- **macOS**: alla prima apertura serve il tasto destro sull'app e poi «Apri». Oppure Impostazioni di Sistema → Privacy e sicurezza → «Apri comunque».

Il workflow `Installer` firma da solo appena trova i certificati tra i **secrets** del repository: GitHub → Settings → Secrets and variables → Actions → New repository secret. Se i secrets non ci sono, continua a creare installer non firmati.

## Windows

Serve un certificato di firma del codice (Code Signing, OV o EV) in formato `.pfx`, comprato da un'autorità come Sectigo, DigiCert o Certum.

| Secret | Cosa mettere |
| --- | --- |
| `WIN_CSC_LINK` | il file `.pfx` codificato in base64 (`base64 -w0 certificato.pfx`) |
| `WIN_CSC_KEY_PASSWORD` | la password del `.pfx` |

Nota: i certificati EV su chiavetta USB o su HSM non si possono esportare in `.pfx`. Per quelli serve un servizio di firma nel cloud, per esempio Azure Trusted Signing.

## macOS

Serve l'Apple Developer Program (99 $/anno).

1. Da Xcode o dal portale sviluppatori crea un certificato **Developer ID Application**.
2. Esportalo dal Portachiavi come `.p12`, con una password.
3. Su appleid.apple.com crea una **password per app** per la notarizzazione.

| Secret | Cosa mettere |
| --- | --- |
| `MAC_CSC_LINK` | il `.p12` in base64 (`base64 -i certificato.p12`) |
| `MAC_CSC_KEY_PASSWORD` | la password del `.p12` |
| `APPLE_ID` | l'email dell'account sviluppatore |
| `APPLE_APP_SPECIFIC_PASSWORD` | la password per app |
| `APPLE_TEAM_ID` | il Team ID (10 caratteri, nella pagina Membership) |

Con i soli `MAC_CSC_*` l'app è firmata. Con anche i tre `APPLE_*` è pure notarizzata: si apre con un doppio clic, senza avvisi. Le autorizzazioni per microfono e videocamera sono in `apps/desktop/build/entitlements.mac.plist`.

## Aggiornamenti

L'aggiornamento in un clic funziona con o senza firma:

- **Windows**: scarica il nuovo installer, lo esegue in silenzio e riapre TheVTT.
- **Linux (AppImage)**: sostituisce il file e riparte.
- **macOS**: monta il nuovo `.dmg`, copia l'app al posto di quella vecchia e la riapre. Se l'app è stata aperta direttamente dal `.dmg`, invece, apre la pagina della versione.

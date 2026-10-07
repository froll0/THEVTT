import { Copy, FolderOpen, ImagePlus } from 'lucide-react';
import type { BackupSummary, HostedServerConfig } from '../../../preload/api';
import { useEffect, useState } from 'react';
import { Avatar, Modal, PageHeader, Section, Setting, squareImage, Switch, Tabs } from '../components/ui';
import { displayServerAddress } from '../lib/address';
import { bridge } from '../lib/platform';
import { useApp, type SettingsSection } from '../store/app';
import { DEFAULT_HOSTING, localServerUrl, useHosting } from '../store/hosting';
import { exportSettings, PRESETS, useSettings, type Settings } from '../store/settings';
import { useUpdates } from '../store/updates';

const ACCENTS = ['#c9a227', '#e6e6e8', '#e4572e', '#ef476f', '#8b7cf6', '#2f6fed', '#06b6d4', '#4fa37e', '#39d353'];
const AVATAR_COLORS = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#b388eb', '#ef476f', '#06d6a0', '#ffd166'];

const SECTIONS: { id: SettingsSection; label: string; desktop?: boolean }[] = [
  { id: 'appearance', label: 'Aspetto' },
  { id: 'table', label: 'Tavolo' },
  { id: 'server', label: 'Server' },
  { id: 'account', label: 'Account' },
  { id: 'backup', label: 'Backup', desktop: true },
  { id: 'advanced', label: 'Avanzate' },
];

export function SettingsView({ initial }: { initial?: SettingsSection }) {
  const [section, setSection] = useState<SettingsSection>(initial ?? 'appearance');
  return (
    <div className="page wide">
      <PageHeader title="Impostazioni" />
      <div className="settings">
        <nav className="settings-nav">
          {SECTIONS.filter((s) => !s.desktop || bridge).map((s) => (
            <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="col" style={{ gap: 'var(--s6)', minWidth: 0 }}>
          {section === 'appearance' && <Appearance />}
          {section === 'table' && <TableSettings />}
          {section === 'server' && <ServerSettings />}
          {section === 'account' && <Account />}
          {section === 'backup' && <BackupSettings />}
          {section === 'advanced' && <Advanced />}
        </div>
      </div>
    </div>
  );
}

function Appearance() {
  const s = useSettings();
  return (
    <>
      <Section title="Tema">
        <div className="theme-grid">
          {PRESETS.map((p) => {
            const dark = p.patch.theme === 'dark';
            const active = p.patch.accent === s.accent && p.patch.theme === s.theme && p.patch.font === s.font;
            return (
              <button key={p.id} className={`theme-card ${active ? 'on' : ''}`} onClick={() => s.set(p.patch)}>
                <div className="preview" style={{ background: dark ? '#111113' : '#fbfbfa' }}>
                  <i style={{ width: 22, background: p.patch.accent }} />
                  <i style={{ width: 34, background: dark ? '#2a2a2e' : '#e4e4e0' }} />
                </div>
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </Section>
      <div className="list">
        <Setting title="Modalità">
          <Tabs<Settings['theme']>
            value={s.theme}
            onChange={(theme) => s.set({ theme })}
            options={[
              { id: 'dark', label: 'Scura' },
              { id: 'light', label: 'Chiara' },
              { id: 'system', label: 'Sistema' },
            ]}
          />
        </Setting>
        <Setting title="Accento">
          <div className="row wrap end">
            {ACCENTS.map((c) => (
              <button key={c} className={`swatch ${s.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => s.set({ accent: c })} aria-label={c} />
            ))}
            <input type="color" value={s.accent} onChange={(e) => s.set({ accent: e.target.value })} aria-label="Colore personalizzato" />
          </div>
        </Setting>
        <Setting title="Carattere">
          <select className="select" style={{ width: 180 }} value={s.font} onChange={(e) => s.set({ font: e.target.value as Settings['font'] })}>
            <option value="sans">Moderno</option>
            <option value="rounded">Arrotondato</option>
            <option value="serif">Classico</option>
            <option value="mono">Monospace</option>
          </select>
        </Setting>
        <Setting title="Dimensione" hint={`${Math.round(s.uiScale * 100)}%`}>
          <input type="range" min={0.8} max={1.3} step={0.05} value={s.uiScale} onChange={(e) => s.set({ uiScale: Number(e.target.value) })} />
        </Setting>
        <Setting title="Angoli" hint={`${s.radius}px`}>
          <input type="range" min={0} max={16} step={1} value={s.radius} onChange={(e) => s.set({ radius: Number(e.target.value) })} />
        </Setting>
        <Setting title="Densità">
          <Tabs<Settings['density']>
            value={s.density}
            onChange={(density) => s.set({ density })}
            options={[
              { id: 'compact', label: 'Compatta' },
              { id: 'comfortable', label: 'Normale' },
              { id: 'spacious', label: 'Ariosa' },
            ]}
          />
        </Setting>
        <Setting title="Pannelli traslucidi" hint="Sul tavolo">
          <Switch on={s.glass} onChange={(glass) => s.set({ glass })} />
        </Setting>
        <Setting title="Riduci animazioni">
          <Switch on={s.reduceMotion} onChange={(reduceMotion) => s.set({ reduceMotion })} />
        </Setting>
      </div>
    </>
  );
}

function TableSettings() {
  const s = useSettings();
  return (
    <div className="list">
      <Setting title="Pannello laterale">
        <Tabs
          value={s.dockPosition}
          onChange={(dockPosition) => s.set({ dockPosition })}
          options={[
            { id: 'left', label: 'Sinistra' },
            { id: 'right', label: 'Destra' },
          ]}
        />
      </Setting>
      <Setting title="Sfondo">
        <input type="color" value={s.board.background} onChange={(e) => s.setBoard({ background: e.target.value })} />
      </Setting>
      <Setting title="Griglia" hint={`Opacità ${Math.round(s.board.gridOpacity * 100)}%`}>
        <input type="range" min={0} max={0.6} step={0.02} value={s.board.gridOpacity} onChange={(e) => s.setBoard({ gridOpacity: Number(e.target.value) })} />
        <input type="color" value={s.board.gridColor} onChange={(e) => s.setBoard({ gridColor: e.target.value })} />
      </Setting>
      <Setting title="Nomi dei token">
        <Tabs
          value={s.board.tokenNames}
          onChange={(tokenNames) => s.setBoard({ tokenNames })}
          options={[
            { id: 'always', label: 'Sempre' },
            { id: 'hover', label: 'Al passaggio' },
            { id: 'never', label: 'Mai' },
          ]}
        />
      </Setting>
      <Setting title="Barre dei punti ferita">
        <Switch on={s.board.hpBars} onChange={(hpBars) => s.setBoard({ hpBars })} />
      </Setting>
      <Setting title="Dadi 3D" hint="I dadi rotolano sul tavolo a ogni tiro. Disattivati anche con «Riduci animazioni».">
        <Switch on={s.dice3d} onChange={(dice3d) => s.set({ dice3d })} />
      </Setting>
      <Setting title="Connessione diretta" hint="Master e giocatori si collegano senza passare dal server; se non riesce si usa il server.">
        <Switch on={s.directConnection} onChange={(directConnection) => s.set({ directConnection })} />
      </Setting>
    </div>
  );
}

function CopyAddress({ value }: { value: string }) {
  const toast = useApp((s) => s.toast);
  return (
    <div className="address">
      <span className="grow selectable">{value}</span>
      <button
        className="btn ghost sm icon"
        aria-label="Copia"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast('Copiato');
        }}
      >
        <Copy size={13} />
      </button>
    </div>
  );
}

/** Asks a public service which address the internet sees, for manual port forwarding. */
function PublicIp({ port }: { port: number }) {
  const [ip, setIp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useApp((s) => s.toast);
  if (ip) {
    return (
      <div className="col" style={{ gap: 4 }}>
        <span className="small muted">Amici da casa loro (dopo aver aperto la porta sul router)</span>
        <CopyAddress value={`${ip}:${port}`} />
      </div>
    );
  }
  return (
    <button
      className="btn sm"
      style={{ width: 'fit-content' }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
          setIp(((await r.json()) as { ip: string }).ip);
        } catch {
          toast('Non riesco a scoprire il tuo indirizzo pubblico', 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      Mostra il mio indirizzo pubblico
    </button>
  );
}

function ServerSettings() {
  const { serverUrl, logout } = useApp();
  const hosting = useHosting();
  const [port, setPort] = useState(String(hosting.config?.port ?? 4477));

  useEffect(() => {
    void hosting.load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hosting.config) setPort(String(hosting.config.port));
  }, [hosting.config?.port]); // eslint-disable-line react-hooks/exhaustive-deps

  const cfg = hosting.config ?? DEFAULT_HOSTING;
  const st = hosting.status;
  const connectedHere = serverUrl === localServerUrl(cfg.port);

  return (
    <>
      <Section title="Server del gruppo">
        <p className="muted small">
          Sei collegato a <b className="mono">{displayServerAddress(serverUrl)}</b>
          {connectedHere ? ', cioè al server ospitato su questo PC.' : '.'} Account, partecipanti e campagne vivono su questo server.{' '}
          <a onClick={() => void logout()}>Cambia server</a>
        </p>
      </Section>

      {!hosting.available ? (
        <p className="muted">Ospitare il server è possibile solo dall'app desktop.</p>
      ) : (
        <>
          <div className="list">
            <Setting title="Ospita il server su questo PC" hint="Resta attivo finché TheVTT è aperto e riparte da solo all'avvio.">
              <Switch on={cfg.enabled} onChange={(enabled) => void hosting.apply({ ...cfg, enabled })} />
            </Setting>
            <Setting title="Collegamento automatico (consigliato)" hint="Gli amici ti raggiungono da qualunque rete con il codice del gruppo, senza toccare il router. Usa un tunnel gratuito di Cloudflare.">
              <Switch on={cfg.tunnel} onChange={(tunnel) => void hosting.apply({ ...cfg, tunnel })} />
            </Setting>
            <Setting title="Apri la porta sul router automaticamente" hint="Usa UPnP, supportato dalla maggior parte dei router di casa.">
              <Switch on={cfg.upnp} onChange={(upnp) => void hosting.apply({ ...cfg, upnp })} />
            </Setting>
            <TurnSetting cfg={cfg} apply={(c) => void hosting.apply(c)} />
            <Setting title="Porta">
              <input className="input mono" style={{ width: 90 }} value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} />
              <button className="btn sm" disabled={Number(port) === cfg.port} onClick={() => void hosting.apply({ ...cfg, port: Number(port) })}>
                Applica
              </button>
            </Setting>
          </div>

          {st && st.state !== 'stopped' && (
            <Section title="Stato">
              <div className="col" style={{ gap: 'var(--s3)' }}>
                <div className="row">
                  <span className={`status-dot ${st.state === 'running' ? 'online' : st.state === 'error' ? 'error' : 'connecting'}`} />
                  {st.state === 'running' ? `Attivo sulla porta ${st.port}` : st.state === 'starting' ? 'Avvio…' : st.error}
                </div>

                {st.state === 'running' && (
                  <>
                    {cfg.tunnel && (
                      <div className="col" style={{ gap: 4 }}>
                        <span className="small muted">Codice del gruppo · da dare agli amici, non cambia mai</span>
                        <CopyAddress value={st.code} />
                        <span className="faint tiny">
                          {st.published === 'yes'
                            ? 'Attivo: chi usa il codice trova il tuo server ovunque sia.'
                            : st.published === 'error'
                              ? 'Non riesco a pubblicare l’indirizzo: controlla la connessione. Riprovo da solo.'
                              : st.tunnel.state === 'downloading'
                                ? `Scarico il componente per il collegamento (una volta sola)… ${Math.round(st.tunnel.progress * 100)}%`
                                : st.tunnel.state === 'error'
                                  ? `Collegamento automatico non riuscito: ${st.tunnel.message}. Riprovo da solo.`
                                  : 'Preparo il collegamento…'}
                        </span>
                      </div>
                    )}
                    {st.tunnel.state === 'ready' && (
                      <div className="col" style={{ gap: 4 }}>
                        <span className="small muted">Indirizzo pubblico di questa sessione (cambia a ogni avvio)</span>
                        <CopyAddress value={st.tunnel.url} />
                      </div>
                    )}
                    {st.upnp.state === 'mapped' && st.upnp.externalIp && (
                      <div className="col" style={{ gap: 4 }}>
                        <span className="small muted">Amici da casa loro</span>
                        <CopyAddress value={`${st.upnp.externalIp}:${st.port}`} />
                      </div>
                    )}
                    {st.lanAddresses[0] && (
                      <div className="col" style={{ gap: 4 }}>
                        <span className="small muted">Amici sulla tua stessa rete</span>
                        <CopyAddress value={`${st.lanAddresses[0]}:${st.port}`} />
                      </div>
                    )}
                    {st.upnp.state === 'working' && <p className="muted small">Sto chiedendo al router di aprire la porta…</p>}
                    {st.upnp.state === 'mapped' && <p className="muted small">Il router ha aperto la porta {st.port}. Gli amici possono raggiungerti da internet.</p>}
                    {!cfg.tunnel && (st.upnp.state === 'unavailable' || st.upnp.state === 'failed' || st.upnp.state === 'off') && <PublicIp port={st.port} />}
                    {!cfg.tunnel && (st.upnp.state === 'unavailable' || st.upnp.state === 'failed' || st.upnp.state === 'off') && (
                      <div className="callout warn">
                        <div>
                          {st.upnp.message ?? 'Apertura automatica della porta disattivata.'}
                          <br />
                          Per giocare con amici fuori casa apri a mano la porta <b>TCP {st.port}</b> nelle impostazioni del router, verso{' '}
                          <b className="mono">{st.lanAddresses[0] ?? 'questo PC'}</b>. Poi dai loro il tuo indirizzo IP pubblico seguito da <span className="mono">:{st.port}</span>.
                        </div>
                      </div>
                    )}
                    {!cfg.tunnel && st.upnp.state === 'cgnat' && (
                      <div className="callout warn">
                        <div>
                          {st.upnp.message}. Attiva il collegamento automatico qui sopra: funziona anche in questo caso.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </>
  );
}

function Account() {
  const { user, api, run, setUser, logout } = useApp();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  // the picker fires while dragging: save once it settles
  useEffect(() => {
    if (!picked || picked === useApp.getState().user?.avatarColor) return;
    const t = setTimeout(() => void run(async () => setUser(await api.updateMe({ avatarColor: picked }))), 500);
    return () => clearTimeout(t);
  }, [picked, api, run, setUser]);
  if (!user) return null;
  return (
    <div className="list">
      <Setting title="Nome visualizzato">
        <input className="input" style={{ width: 200 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <button className="btn sm" disabled={!displayName.trim() || displayName === user.displayName} onClick={() => run(async () => setUser(await api.updateMe({ displayName })), 'Salvato')}>
          Salva
        </button>
      </Setting>
      <Setting title="Immagine del profilo" hint="La vedono gli altri partecipanti, anche in chat">
        <Avatar user={user} size={40} />
        <label className="btn sm">
          <ImagePlus size={14} /> {user.avatar ? 'Cambia' : 'Carica'}
          <input
            type="file"
            accept="image/*"
            hidden
            aria-label="Immagine del profilo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void run(async () => setUser(await api.updateMe({ avatar: await squareImage(f) })), 'Immagine aggiornata');
            }}
          />
        </label>
        {user.avatar && (
          <button className="btn ghost sm" onClick={() => run(async () => setUser(await api.updateMe({ avatar: null })))}>
            Rimuovi
          </button>
        )}
      </Setting>
      <Setting title="Colore" hint="Il tuo nome in chat, i tuoi token, disegni e ping">
        {AVATAR_COLORS.map((c) => (
          <button key={c} className={`swatch ${user.avatarColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => run(async () => setUser(await api.updateMe({ avatarColor: c })))} aria-label={c} />
        ))}
        <input
          type="color"
          className="color-input"
          value={picked ?? user.avatarColor}
          title="Scegli un colore qualsiasi"
          aria-label="Colore personalizzato"
          onChange={(e) => setPicked(e.target.value)}
        />
      </Setting>
      <Setting title="Esci" hint={`@${user.username}`}>
        <button className="btn sm danger" onClick={() => void logout()}>
          Esci
        </button>
      </Setting>
    </div>
  );
}

const sizeLabel = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const dateLabel = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function BackupSettings() {
  const { run, toast } = useApp();
  const [auto, setAuto] = useState<{ name: string; createdAt: string; bytes: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<BackupSummary | null>(null);
  const hosting = useHosting((s) => s.status);
  useEffect(() => {
    void bridge?.backup.list().then((r) => setAuto(r.backups));
  }, []);
  if (!bridge) return null;

  const create = () =>
    run(async () => {
      setBusy(true);
      try {
        const r = await bridge!.backup.create();
        if ('error' in r) throw new Error(r.error);
        if ('path' in r) toast(`Backup salvato (${sizeLabel(r.bytes)}): ${r.path}`, 'success');
      } finally {
        setBusy(false);
      }
    });
  const inspect = (name?: string) =>
    run(async () => {
      const r = await bridge!.backup.inspect(name);
      if ('error' in r) throw new Error(r.error);
      if ('summary' in r) setRestoring(r.summary);
    });
  const restore = () =>
    run(async () => {
      setBusy(true);
      const r = await bridge!.backup.restore();
      // on success the app restarts by itself
      setBusy(false);
      if ('error' in r) throw new Error(r.error);
    });

  return (
    <>
      <Section title="Il tuo backup">
        <p className="muted small">
          Un file con tutto quello che è su questo PC: {hosting && hosting.state !== 'stopped' ? 'account, campagne, personaggi, diari e chat del gruppo che ospiti, ' : ''}mappe e tavoli, creature personalizzate e il codice del gruppo. Salvalo su una chiavetta o nel cloud: se cambi computer, lo ripristini qui e riparti da dove eri.
        </p>
        <div className="list">
          <Setting title="Crea un backup" hint="Scegli dove salvare il file">
            <button className="btn sm primary" disabled={busy} onClick={() => void create()}>
              Crea backup
            </button>
          </Setting>
          <Setting title="Ripristina da un file" hint="Sostituisce i dati di questo PC; quelli di adesso vengono messi da parte">
            <button className="btn sm" disabled={busy} onClick={() => void inspect()}>
              Scegli il file…
            </button>
          </Setting>
        </div>
      </Section>
      <Section
        title="Backup automatici"
        action={
          <button className="btn ghost sm" onClick={() => void bridge!.backup.openFolder()}>
            <FolderOpen size={14} /> Apri cartella
          </button>
        }
      >
        <p className="muted small">Uno al giorno, all’avvio dell’app; tengo gli ultimi sette. Servono se qualcosa va storto su questo PC: per cambiare computer usa il backup qui sopra.</p>
        {auto.length ? (
          <div className="list">
            {auto.map((b) => (
              <Setting key={b.name} title={dateLabel(b.createdAt)} hint={sizeLabel(b.bytes)}>
                <button className="btn ghost sm" disabled={busy} onClick={() => void inspect(b.name)}>
                  Ripristina
                </button>
              </Setting>
            ))}
          </div>
        ) : (
          <p className="faint small">Ancora nessuno: il primo viene fatto al prossimo avvio.</p>
        )}
      </Section>
      {restoring && (
        <Modal
          title="Ripristinare questo backup?"
          onClose={() => setRestoring(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setRestoring(null)}>
                Annulla
              </button>
              <button className="btn danger solid" disabled={busy} onClick={() => void restore()}>
                Ripristina e riavvia
              </button>
            </>
          }
        >
          <p>
            Backup del <b>{dateLabel(restoring.createdAt)}</b> (TheVTT {restoring.appVersion}, {sizeLabel(restoring.bytes)}):{' '}
            {restoring.hasServer ? 'campagne, account e diari del gruppo' : 'nessun gruppo ospitato'}, {restoring.tables} {restoring.tables === 1 ? 'tavolo' : 'tavoli'}.
          </p>
          <p className="muted small">I dati di adesso vengono salvati in un backup automatico prima del ripristino, così puoi tornare indietro. L’app si riavvia da sola.</p>
        </Modal>
      )}
    </>
  );
}

function UpdatesSetting({ version }: { version: string }) {
  const { check, checking, checkNow } = useUpdates();
  const text = checking
    ? 'Controllo…'
    : !check
      ? 'Controllo automatico all’avvio e ogni 6 ore'
      : check.state === 'available'
        ? `Disponibile la ${check.info.latest}: la trovi in alto a destra`
        : check.state === 'none'
          ? 'Hai l’ultima versione'
          : check.state === 'error'
            ? check.message
            : 'Aggiornamenti disattivati in questa installazione';
  return (
    <Setting title={`Versione ${version}`} hint={text}>
      <button className="btn sm" disabled={checking} onClick={() => void checkNow()}>
        Controlla aggiornamenti
      </button>
    </Setting>
  );
}

function Advanced() {
  const s = useSettings();
  const { run } = useApp();
  const [css, setCss] = useState(s.customCss);
  const [info, setInfo] = useState<{ version: string; dataDir: string } | null>(null);
  useEffect(() => {
    void bridge?.info().then(setInfo);
  }, []);

  const exportTheme = () => {
    const blob = new Blob([exportSettings(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'thevtt-tema.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="list">
        <Setting title="Tema" hint="Condividi il tuo stile o importane uno">
          <button className="btn sm" onClick={exportTheme}>
            Esporta
          </button>
          <label className="btn sm">
            Importa
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void run(async () => { s.importJson(await f.text()); setCss(useSettings.getState().customCss); }, 'Tema importato');
              }}
            />
          </label>
        </Setting>
        <Setting title="Ripristina l'aspetto predefinito">
          <button className="btn sm" onClick={() => { s.reset(); setCss(''); }}>
            Ripristina
          </button>
        </Setting>
        {info && <UpdatesSetting version={info.version} />}
        {info && (
          <Setting title="Dati locali" hint={`TheVTT ${info.version}`}>
            <span className="mono tiny muted selectable">{info.dataDir}</span>
          </Setting>
        )}
      </div>
      <Section title="CSS personalizzato">
        <p className="muted small">
          Sovrascrivi qualsiasi stile. Variabili utili: <code>--accent</code> <code>--bg</code> <code>--bg-elev</code> <code>--fg</code> <code>--radius</code> <code>--font</code>
        </p>
        <textarea className="textarea mono small" rows={9} value={css} onChange={(e) => setCss(e.target.value)} placeholder={':root { --bg: #0b0b12; }'} />
        <div className="row">
          <button className="btn sm" disabled={css === s.customCss} onClick={() => s.set({ customCss: css })}>
            Applica
          </button>
        </div>
      </Section>
    </>
  );
}

/** An optional TURN server: a bridge for voice and video when two computers can't see each other. */
function TurnSetting({ cfg, apply }: { cfg: HostedServerConfig; apply: (c: HostedServerConfig) => void }) {
  const [url, setUrl] = useState(cfg.turn?.url ?? '');
  const [username, setUsername] = useState(cfg.turn?.username ?? '');
  const [credential, setCredential] = useState(cfg.turn?.credential ?? '');
  const dirty = url !== (cfg.turn?.url ?? '') || username !== (cfg.turn?.username ?? '') || credential !== (cfg.turn?.credential ?? '');
  const valid = !url || /^turns?:/.test(url.trim());
  return (
    <Setting
      title="Ponte per voce e video (facoltativo)"
      hint="Voce e video vanno diretti tra i computer. Se due giocatori non riescono a sentirsi (reti aziendali, alcune connessioni mobili), inserisci qui un server TURN: per esempio uno gratuito di Open Relay o Cloudflare."
    >
      <div className="col" style={{ gap: 6, minWidth: 260 }}>
        <input className="input mono" placeholder="turn:indirizzo:3478" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Indirizzo del server TURN" />
        <div className="row" style={{ gap: 6 }}>
          <input className="input" placeholder="Utente" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Utente TURN" />
          <input className="input" type="password" placeholder="Password" value={credential} onChange={(e) => setCredential(e.target.value)} aria-label="Password TURN" />
        </div>
        <button className="btn sm" disabled={!dirty || !valid} onClick={() => apply({ ...cfg, turn: url.trim() ? { url: url.trim(), username, credential } : null })}>
          {valid ? 'Applica' : 'L’indirizzo inizia con turn: o turns:'}
        </button>
      </div>
    </Setting>
  );
}

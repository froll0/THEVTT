import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, PageHeader, Section, Setting, Switch, Tabs } from '../components/ui';
import { displayServerAddress } from '../lib/address';
import { bridge } from '../lib/platform';
import { useApp, type SettingsSection } from '../store/app';
import { localServerUrl, useHosting } from '../store/hosting';
import { exportSettings, PRESETS, useSettings, type Settings } from '../store/settings';

const ACCENTS = ['#c9a227', '#e6e6e8', '#e4572e', '#ef476f', '#8b7cf6', '#2f6fed', '#06b6d4', '#4fa37e', '#39d353'];
const AVATAR_COLORS = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#b388eb', '#ef476f', '#06d6a0', '#ffd166'];

const SECTIONS: { id: SettingsSection; label: string; desktop?: boolean }[] = [
  { id: 'appearance', label: 'Aspetto' },
  { id: 'table', label: 'Tavolo' },
  { id: 'server', label: 'Server' },
  { id: 'account', label: 'Account' },
  { id: 'advanced', label: 'Avanzate' },
];

export function SettingsView({ initial }: { initial?: SettingsSection }) {
  const [section, setSection] = useState<SettingsSection>(initial ?? 'appearance');
  return (
    <div className="page wide">
      <PageHeader title="Impostazioni" />
      <div className="settings">
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
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

  const cfg = hosting.config ?? { enabled: false, port: 4477, upnp: true };
  const st = hosting.status;
  const connectedHere = serverUrl === localServerUrl(cfg.port);

  return (
    <>
      <Section title="Server del gruppo">
        <p className="muted small">
          Sei collegato a <b className="mono">{displayServerAddress(serverUrl)}</b>
          {connectedHere ? ', cioè al server ospitato su questo PC.' : '.'} Account, amici e campagne vivono su questo server.{' '}
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
            <Setting title="Apri la porta sul router automaticamente" hint="Usa UPnP, supportato dalla maggior parte dei router di casa.">
              <Switch on={cfg.upnp} onChange={(upnp) => void hosting.apply({ ...cfg, upnp })} />
            </Setting>
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
                    {(st.upnp.state === 'unavailable' || st.upnp.state === 'failed' || st.upnp.state === 'off') && <PublicIp port={st.port} />}
                    {(st.upnp.state === 'unavailable' || st.upnp.state === 'failed' || st.upnp.state === 'off') && (
                      <div className="callout warn">
                        <div>
                          {st.upnp.message ?? 'Apertura automatica della porta disattivata.'}
                          <br />
                          Per giocare con amici fuori casa apri a mano la porta <b>TCP {st.port}</b> nelle impostazioni del router, verso{' '}
                          <b className="mono">{st.lanAddresses[0] ?? 'questo PC'}</b>. Poi dai loro il tuo indirizzo IP pubblico seguito da <span className="mono">:{st.port}</span>.
                        </div>
                      </div>
                    )}
                    {st.upnp.state === 'cgnat' && (
                      <div className="callout warn">
                        <div>
                          {st.upnp.message}. Puoi giocare con chi è sulla tua rete. Per gli amici fuori casa, uno di loro con una connessione diversa può
                          ospitare il server, oppure potete usare un server su internet.
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
  if (!user) return null;
  return (
    <div className="list">
      <Setting title="Nome visualizzato">
        <input className="input" style={{ width: 200 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <button className="btn sm" disabled={!displayName.trim() || displayName === user.displayName} onClick={() => run(async () => setUser(await api.updateMe({ displayName })), 'Salvato')}>
          Salva
        </button>
      </Setting>
      <Setting title="Colore" hint="Avatar, token e ping">
        <Avatar user={user} size={24} />
        {AVATAR_COLORS.map((c) => (
          <button key={c} className={`swatch ${user.avatarColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => run(async () => setUser(await api.updateMe({ avatarColor: c })))} aria-label={c} />
        ))}
      </Setting>
      <Setting title="Esci" hint={`@${user.username}`}>
        <button className="btn sm danger" onClick={() => void logout()}>
          Esci
        </button>
      </Setting>
    </div>
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

import { Copy } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, Tabs } from '../components/ui';
import { displayServerAddress, normalizeServerAddress } from '../lib/address';
import { useApp } from '../store/app';
import { inviteAddress, localServerUrl, useHosting } from '../store/hosting';

type Where = 'host' | 'join';

/** Entry point: where the group plays (host here / join a friend), then account. */
export function AuthView() {
  const { serverUrl, setServer, toast } = useApp();
  const hosting = useHosting();
  // "host" only when this PC is really serving: a preselected choice that isn't running is confusing
  const hostingHere = () => {
    const h = useHosting.getState();
    return !!h.config?.enabled && h.status?.state === 'running' && localServerUrl(h.status.port) === useApp.getState().serverUrl;
  };
  const [where, setWhere] = useState<Where>(hostingHere() ? 'host' : 'join');
  const [address, setAddress] = useState(serverUrl.includes('localhost') ? '' : displayServerAddress(serverUrl));
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hosting.load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hostingHere()) setWhere('host');
  }, [hosting.status?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const running = hosting.status?.state === 'running';
  const invite = hosting.status ? inviteAddress(hosting.status) : null;

  const startHosting = async () => {
    setWhere('host');
    setError(null);
    const cfg = hosting.config ?? { enabled: true, port: 4477, upnp: true };
    const st = await hosting.apply({ ...cfg, enabled: true });
    if (st?.state === 'running') setServer(localServerUrl(st.port));
    else if (st?.error) setError(st.error);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    let target: string | null;
    if (where === 'host') {
      if (!running || !hosting.status) return setError('Il server non è ancora pronto');
      target = localServerUrl(hosting.status.port);
    } else {
      target = normalizeServerAddress(address || 'localhost');
      if (!target) return setError('Indirizzo non valido');
    }
    setBusy(true);
    try {
      if (target !== useApp.getState().serverUrl) setServer(target);
      await useApp.getState().authenticate(mode, username, password, displayName || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth-box" onSubmit={submit}>
        <div className="col" style={{ gap: 6 }}>
          <div className="logo">
            <i /> TheVTT
          </div>
          <p className="muted">Il vostro tavolo da gioco. Crea campagne, invita gli amici, gioca.</p>
        </div>

        <div className="col">
          <span className="section-title">Dove giocate?</span>
          {hosting.available ? (
            <div className="choice">
              <button type="button" className={where === 'host' ? 'on' : ''} onClick={() => void startHosting()}>
                <b>Ospito io</b>
                <small>Il server gira su questo PC. Tu inviti gli amici.</small>
              </button>
              <button type="button" className={where === 'join' ? 'on' : ''} onClick={() => setWhere('join')}>
                <b>Mi unisco</b>
                <small>Ho l'indirizzo che mi ha dato un amico.</small>
              </button>
            </div>
          ) : null}

          {where === 'host' && hosting.available && (
            <div className="callout">
              <span className={`status-dot ${running ? 'online' : hosting.status?.state === 'error' ? 'error' : 'connecting'}`} style={{ marginTop: 7 }} />
              <div className="grow">
                {running ? (
                  invite ? (
                    <>
                      Server attivo. Gli amici entrano con{' '}
                      <b className="mono selectable">{invite.address}</b>
                      <button
                        type="button"
                        className="btn ghost sm icon"
                        aria-label="Copia"
                        onClick={() => {
                          void navigator.clipboard.writeText(invite.address);
                          toast('Indirizzo copiato');
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      <div className="faint small">
                        {invite.scope === 'internet'
                          ? 'Il router ha aperto la porta: funziona anche da internet.'
                          : hosting.status?.upnp.state === 'working'
                            ? 'Sto chiedendo al router di aprire la porta…'
                            : 'Per ora vale solo per la stessa rete di casa. I dettagli sono in Impostazioni → Server.'}
                      </div>
                    </>
                  ) : (
                    'Server attivo su questo PC.'
                  )
                ) : hosting.status?.state === 'error' ? (
                  hosting.status.error
                ) : (
                  'Avvio del server…'
                )}
              </div>
            </div>
          )}

          {(where === 'join' || !hosting.available) && (
            <Field label="Indirizzo del gruppo">
              <input className="input mono" value={address} placeholder="es. 203.0.113.7:4477" onChange={(e) => setAddress(e.target.value)} />
            </Field>
          )}
        </div>

        <div className="col">
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { id: 'register', label: 'Nuovo account' },
              { id: 'login', label: 'Ho già un account' },
            ]}
          />
          <Field label="Nome utente">
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </Field>
          {mode === 'register' && (
            <Field label="Nome visualizzato (facoltativo)">
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
          )}
          <Field label="Password">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary block" disabled={busy || !username || !password || (where === 'host' && !running)}>
          {mode === 'login' ? 'Entra' : 'Crea account'}
        </button>
        <p className="faint tiny">
          Ogni gruppo usa un solo server: account, amici e campagne vivono lì. Chi ospita deve tenere TheVTT aperto mentre si gioca.
        </p>
      </form>
    </div>
  );
}

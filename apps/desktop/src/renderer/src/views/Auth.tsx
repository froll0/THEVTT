import { Server } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Field, Tabs } from '../components/ui';
import { useApp } from '../store/app';

export function AuthView() {
  const { serverUrl, setServer } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [server, setServerDraft] = useState(serverUrl);
  const [showServer, setShowServer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (server !== serverUrl) setServer(server);
      await useApp.getState().authenticate(mode, username, password, displayName || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <div className="logo">
          <i /> TheVTT
        </div>
        <p className="muted">Il tuo tavolo da gioco, ovunque. Crea campagne, invita gli amici, gioca.</p>
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            { id: 'login', label: 'Accedi' },
            { id: 'register', label: 'Registrati' },
          ]}
        />
        <Field label="Nome utente">
          <input className="input" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </Field>
        {mode === 'register' && (
          <Field label="Nome visualizzato (opzionale)">
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
        {showServer && (
          <Field label="Server">
            <input className="input mono" value={server} onChange={(e) => setServerDraft(e.target.value)} />
          </Field>
        )}
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary" disabled={busy || !username || !password}>
          {mode === 'login' ? 'Entra' : 'Crea account'}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setShowServer(!showServer)}>
          <Server size={14} /> {server.replace(/^https?:\/\//, '')}
        </button>
      </form>
    </div>
  );
}

import { Bell, Check, LogOut, Maximize2, Minus, Radio, Settings, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { bridge } from '../lib/platform';
import { useApp, type Route } from '../store/app';
import { useHosting } from '../store/hosting';
import { Avatar, Popover } from './ui';

function WindowControls() {
  if (!bridge || bridge.platform === 'darwin') return null;
  return (
    <div className="win-controls">
      <button onClick={() => bridge?.window.minimize()} aria-label="Riduci">
        <Minus size={14} />
      </button>
      <button onClick={() => bridge?.window.toggleMaximize()} aria-label="Ingrandisci">
        <Maximize2 size={12} />
      </button>
      <button className="close" onClick={() => bridge?.window.close()} aria-label="Chiudi">
        <X size={15} />
      </button>
    </div>
  );
}

const NAV: { route: Route; label: string; match: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Home', match: ['home'] },
  { route: { name: 'campaigns' }, label: 'Campagne', match: ['campaigns', 'campaign'] },
  { route: { name: 'characters' }, label: 'Personaggi', match: ['characters', 'character'] },
  { route: { name: 'friends' }, label: 'Amici', match: ['friends'] },
];

function Notifications() {
  const { invites, friends, api, run, refresh, go, upsertCampaign } = useApp();
  const requests = friends.filter((f) => f.status === 'pending_in');
  const total = invites.length + requests.length;
  return (
    <Popover
      width={320}
      trigger={(open, toggle) => (
        <button className={`btn ghost icon sm ${open ? 'active' : ''}`} onClick={toggle} aria-label="Notifiche" style={{ position: 'relative' }}>
          <Bell size={16} />
          {total > 0 && <span className="count" style={{ position: 'absolute', top: -3, right: -4 }}>{total}</span>}
        </button>
      )}
    >
      {(close) =>
        total === 0 ? (
          <div className="menu-head muted small">Nessuna notifica</div>
        ) : (
          <div className="col" style={{ gap: 0 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="menu-head row">
                <Avatar user={inv.from} size={26} />
                <div className="grow small">
                  <b>{inv.from.displayName}</b> ti invita in «{inv.campaign.name}»
                </div>
                <button
                  className="btn sm icon primary"
                  aria-label="Unisciti"
                  onClick={() =>
                    run(async () => {
                      const c = await api.acceptInvite(inv.id);
                      upsertCampaign(c);
                      await refresh(['invites']);
                      close();
                      go({ name: 'campaign', id: c.id });
                    })
                  }
                >
                  <Check size={14} />
                </button>
                <button className="btn sm icon ghost" aria-label="Rifiuta" onClick={() => run(async () => { await api.declineInvite(inv.id); await refresh(['invites']); close(); })}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {requests.map((f) => (
              <div key={f.user.id} className="menu-head row">
                <Avatar user={f.user} size={26} />
                <div className="grow small">
                  <b>{f.user.displayName}</b> vuole essere tuo amico
                </div>
                <button className="btn sm icon primary" aria-label="Accetta" onClick={() => run(async () => { await api.acceptFriend(f.user.id); await refresh(['friends']); close(); })}>
                  <Check size={14} />
                </button>
                <button className="btn sm icon ghost" aria-label="Rifiuta" onClick={() => run(async () => { await api.removeFriend(f.user.id); await refresh(['friends']); close(); })}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      }
    </Popover>
  );
}

function AccountMenu() {
  const { user, go, logout, serverUrl } = useApp();
  if (!user) return null;
  return (
    <Popover
      width={240}
      trigger={(_open, toggle) => (
        <button className="btn ghost icon sm" onClick={toggle} aria-label="Account" style={{ borderRadius: '50%' }}>
          <Avatar user={{ ...user, online: true }} size={24} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-head">
            <b>{user.displayName}</b>
            <div className="faint small">
              @{user.username} · {serverUrl.replace(/^https?:\/\//, '')}
            </div>
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => { close(); go({ name: 'settings' }); }}>
            <Settings size={15} /> Impostazioni
          </button>
          <button className="menu-item" onClick={() => void logout()}>
            <LogOut size={15} /> Esci
          </button>
        </>
      )}
    </Popover>
  );
}

function HostingIndicator() {
  const status = useHosting((s) => s.status);
  const go = useApp((s) => s.go);
  if (!status || status.state === 'stopped') return null;
  const ok = status.state === 'running';
  return (
    <button className="btn ghost sm" onClick={() => go({ name: 'settings', section: 'server' })} title="Server ospitato su questo PC">
      <span className={`status-dot ${ok ? 'online' : status.state === 'error' ? 'error' : 'connecting'}`} />
      <Radio size={14} /> Server
    </button>
  );
}

/** Window top bar. With children (table), nav is replaced by them. */
export function TopBar({ children, nav = true }: { children?: ReactNode; nav?: boolean }) {
  const { route, go, user, status, sessions } = useApp();
  const mac = bridge?.platform === 'darwin';
  const live = Object.keys(sessions).length > 0;
  return (
    <header className={`topbar ${mac ? 'mac' : ''}`}>
      <div className="brand">
        <i /> TheVTT
      </div>
      {user && nav && !children && (
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.label} className={n.match.includes(route.name) ? 'active' : ''} onClick={() => go(n.route)}>
              {n.label}
              {n.route.name === 'campaigns' && live && <span className="dot" aria-hidden title="Un tavolo è aperto" />}
            </button>
          ))}
        </nav>
      )}
      {children}
      <div className="spacer" />
      {user && (
        <div className="actions">
          {status !== 'online' && (
            <span className="row small muted" title="Connessione al server">
              <span className={`status-dot ${status}`} /> {status === 'connecting' ? 'Connessione…' : 'Offline'}
            </span>
          )}
          <HostingIndicator />
          <Notifications />
          <AccountMenu />
        </div>
      )}
      <WindowControls />
    </header>
  );
}

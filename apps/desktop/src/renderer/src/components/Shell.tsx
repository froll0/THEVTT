import { Dices, Home, Maximize2, Minus, PanelLeftClose, PanelLeftOpen, Settings, Swords, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { bridge } from '../lib/platform';
import { useApp, type Route } from '../store/app';
import { useSettings } from '../store/settings';
import { Avatar } from './ui';

export function TitleBar({ children }: { children?: ReactNode }) {
  const status = useApp((s) => s.status);
  const user = useApp((s) => s.user);
  const mac = bridge?.platform === 'darwin';
  return (
    <header className={`titlebar ${mac ? 'mac' : ''}`}>
      <div className="brand">
        <i /> TheVTT
      </div>
      {user && (
        <div className="row small" title={status === 'online' ? 'Connesso' : 'Connessione in corso…'}>
          <span className={`status-dot ${status}`} />
          {status === 'online' ? 'Online' : status === 'connecting' ? 'Connessione…' : 'Offline'}
        </div>
      )}
      <div className="grow row no-drag" style={{ justifyContent: 'center' }}>
        {children}
      </div>
      {bridge && !mac ? (
        <div className="win-controls">
          <button onClick={() => bridge?.window.minimize()} aria-label="Riduci">
            <Minus size={14} />
          </button>
          <button onClick={() => bridge?.window.toggleMaximize()} aria-label="Ingrandisci">
            <Maximize2 size={13} />
          </button>
          <button className="close" onClick={() => bridge?.window.close()} aria-label="Chiudi">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div style={{ width: 12 }} />
      )}
    </header>
  );
}

const NAV: { route: Route; label: string; icon: typeof Home; match: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Home', icon: Home, match: ['home'] },
  { route: { name: 'campaigns' }, label: 'Campagne', icon: Swords, match: ['campaigns', 'campaign'] },
  { route: { name: 'characters' }, label: 'Personaggi', icon: Dices, match: ['characters', 'character'] },
  { route: { name: 'friends' }, label: 'Amici', icon: Users, match: ['friends'] },
];

export function Sidebar() {
  const { route, go, user, invites, friends, sessions } = useApp();
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const set = useSettings((s) => s.set);
  const pendingFriends = friends.filter((f) => f.status === 'pending_in').length;
  const live = Object.keys(sessions).length;
  const badges: Partial<Record<Route['name'], number>> = { home: invites.length, friends: pendingFriends, campaigns: live };

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {NAV.map((n) => {
        const Icon = n.icon;
        const badge = badges[n.route.name];
        return (
          <button key={n.label} className={`nav-item ${n.match.includes(route.name) ? 'active' : ''}`} onClick={() => go(n.route)} title={n.label}>
            <Icon size={18} />
            <span className="label">{n.label}</span>
            {!!badge && <span className={`badge ${n.route.name === 'campaigns' ? 'live' : 'accent'}`}>{badge}</span>}
          </button>
        );
      })}
      <div className="spacer" />
      <button className={`nav-item ${route.name === 'settings' ? 'active' : ''}`} onClick={() => go({ name: 'settings' })} title="Impostazioni">
        <Settings size={18} />
        <span className="label">Impostazioni</span>
      </button>
      <button className="nav-item" onClick={() => set({ sidebarCollapsed: !collapsed })} title={collapsed ? 'Espandi' : 'Comprimi'}>
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        <span className="label">Comprimi</span>
      </button>
      {user && (
        <div className="me">
          <Avatar user={{ ...user, online: true }} size={30} presence />
          <div className="label col" style={{ gap: 0, minWidth: 0 }}>
            <b className="ellipsis">{user.displayName}</b>
            <span className="faint small ellipsis">@{user.username}</span>
          </div>
        </div>
      )}
    </nav>
  );
}

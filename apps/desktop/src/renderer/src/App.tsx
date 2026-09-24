import { useEffect } from 'react';
import { Sidebar, TitleBar } from './components/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toasts } from './components/ui';
import { useApp } from './store/app';
import { applySettings, useSettings } from './store/settings';
import { AuthView } from './views/Auth';
import { CampaignView } from './views/Campaign';
import { CampaignsView } from './views/Campaigns';
import { CharacterEditor } from './views/CharacterEditor';
import { CharactersView } from './views/Characters';
import { FriendsView } from './views/Friends';
import { HomeView } from './views/Home';
import { SettingsView } from './views/Settings';
import { TableView } from './table/TableView';

function useThemeSync() {
  const settings = useSettings();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applySettings(settings, mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings]);
}

export function App() {
  useThemeSync();
  const { user, booting, route, boot } = useApp();
  const sidebarPosition = useSettings((s) => s.sidebarPosition);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (booting) return <div className="shell"><TitleBar /></div>;

  if (!user) {
    return (
      <div className="shell">
        <TitleBar />
        <AuthView />
        <Toasts />
      </div>
    );
  }

  if (route.name === 'table') {
    return (
      <>
        <ErrorBoundary area="Il tavolo" key={route.campaignId}>
          <TableView campaignId={route.campaignId} />
        </ErrorBoundary>
        <Toasts />
      </>
    );
  }

  return (
    <div className="shell">
      <TitleBar />
      <div className={`body sidebar-${sidebarPosition}`}>
        <Sidebar />
        <main className="main">
          <ErrorBoundary area="Questa pagina" key={route.name}>
          {route.name === 'home' && <HomeView />}
          {route.name === 'campaigns' && <CampaignsView />}
          {route.name === 'campaign' && <CampaignView key={route.id} id={route.id} />}
          {route.name === 'characters' && <CharactersView />}
          {route.name === 'character' && <CharacterEditor key={route.id ?? 'new'} id={route.id} systemId={route.systemId} assignTo={route.assignTo} />}
          {route.name === 'friends' && <FriendsView />}
          {route.name === 'settings' && <SettingsView />}
          </ErrorBoundary>
        </main>
      </div>
      <Toasts />
    </div>
  );
}

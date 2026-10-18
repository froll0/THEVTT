import { dnd5e } from '@thevtt/systems';
import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompendiumView } from './views/CompendiumView';
import { MapsView, StudioView } from './views/MapsView';
import { TopBar } from './components/Shell';
import { Toasts } from './components/ui';
import { useApp } from './store/app';
import { useHosting } from './store/hosting';
import { startUpdateChecks } from './store/updates';
import { applySettings, useSettings } from './store/settings';
import { TableView } from './table/TableView';
import { AuthView } from './views/Auth';
import { CampaignView } from './views/Campaign';
import { CampaignsView } from './views/Campaigns';
import { CharacterEditor } from './views/CharacterEditor';
import { CharactersView } from './views/Characters';
import { ParticipantsView } from './views/Participants';
import { HomeView } from './views/Home';
import { JournalView } from './views/JournalView';
import { SettingsView } from './views/Settings';

export function useThemeSync() {
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
  // the GMs' homebrew of the user's campaigns joins the manual's lists
  const campaigns = useApp((s) => s.campaigns);
  useEffect(() => {
    dnd5e.applyHomebrew(campaigns.filter((c) => c.systemId === 'dnd5e-2024' && c.homebrew).map((c) => dnd5e.cleanHomebrew(c.homebrew)));
  }, [campaigns]);

  useEffect(() => {
    void useHosting.getState().load();
    void boot();
  }, [boot]);
  useEffect(startUpdateChecks, []);

  if (booting) {
    return (
      <div className="shell">
        <TopBar />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shell">
        <TopBar />
        <AuthView />
        <Toasts />
      </div>
    );
  }

  if (route.name === 'studio') {
    return (
      <>
        <ErrorBoundary area="Lo studio delle mappe" key={`${route.kind}-${route.id}`}>
          <StudioView kind={route.kind} id={route.id} />
        </ErrorBoundary>
        <Toasts />
      </>
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
      <TopBar />
      <main className="main">
        <ErrorBoundary area="Questa pagina" key={route.name}>
          {route.name === 'home' && <HomeView />}
          {route.name === 'campaigns' && <CampaignsView />}
          {route.name === 'campaign' && <CampaignView key={route.id} id={route.id} />}
          {route.name === 'characters' && <CharactersView />}
          {route.name === 'character' && <CharacterEditor key={route.id ?? 'new'} id={route.id} systemId={route.systemId} assignTo={route.assignTo} />}
          {route.name === 'participants' && <ParticipantsView />}
          {route.name === 'compendium' && <CompendiumView />}
          {route.name === 'journal' && <JournalView />}
          {route.name === 'maps' && <MapsView />}
          {route.name === 'settings' && <SettingsView initial={route.section} />}
        </ErrorBoundary>
      </main>
      <Toasts />
    </div>
  );
}

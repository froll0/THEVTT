import { dnd5e, free } from '@thevtt/systems';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/Shell';
import { Toasts } from './components/ui';
import { useApp } from './store/app';
import { useHosting } from './store/hosting';
import { startUpdateChecks } from './store/updates';
import { applySettings, useSettings } from './store/settings';
import { AuthView } from './views/Auth';
import { CampaignsView } from './views/Campaigns';
import { CharactersView } from './views/Characters';
import { ParticipantsView } from './views/Participants';
import { HomeView } from './views/Home';

// the heavier pages arrive when first opened: the app starts with the launcher alone
const TableView = lazy(() => import('./table/TableView').then((m) => ({ default: m.TableView })));
const CampaignView = lazy(() => import('./views/Campaign').then((m) => ({ default: m.CampaignView })));
const CharacterEditor = lazy(() => import('./views/CharacterEditor').then((m) => ({ default: m.CharacterEditor })));
const CompendiumView = lazy(() => import('./views/CompendiumView').then((m) => ({ default: m.CompendiumView })));
const JournalView = lazy(() => import('./views/JournalView').then((m) => ({ default: m.JournalView })));
const MapsView = lazy(() => import('./views/MapsView').then((m) => ({ default: m.MapsView })));
const StudioView = lazy(() => import('./views/MapsView').then((m) => ({ default: m.StudioView })));
const PluginStudio = lazy(() => import('./views/PluginStudio').then((m) => ({ default: m.PluginStudio })));
const WikiView = lazy(() => import('./views/WikiView').then((m) => ({ default: m.WikiView })));
const SettingsView = lazy(() => import('./views/Settings').then((m) => ({ default: m.SettingsView })));

const Loading = ({ children }: { children: ReactNode }) => (
  <Suspense
    fallback={
      <div className="stage-message">
        <div className="spinner" />
      </div>
    }
  >
    {children}
  </Suspense>
);

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
    free.applyCampaignSheets(campaigns.filter((c) => c.systemId === 'libero' && c.homebrew).map((c) => ({ campaignName: c.name, homebrew: free.cleanFreeHomebrew(c.homebrew) })));
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
          <Loading>
            <StudioView kind={route.kind} id={route.id} />
          </Loading>
        </ErrorBoundary>
        <Toasts />
      </>
    );
  }

  if (route.name === 'workshop') {
    return (
      <>
        <ErrorBoundary area="Il laboratorio delle estensioni" key={route.id ?? 'nuova'}>
          <Loading>
            <PluginStudio id={route.id} />
          </Loading>
        </ErrorBoundary>
        <Toasts />
      </>
    );
  }

  if (route.name === 'table') {
    return (
      <>
        <ErrorBoundary area="Il tavolo" key={route.campaignId}>
          <Loading>
            <TableView campaignId={route.campaignId} />
          </Loading>
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
          <Loading>
          {route.name === 'home' && <HomeView />}
          {route.name === 'campaigns' && <CampaignsView />}
          {route.name === 'campaign' && <CampaignView key={route.id} id={route.id} />}
          {route.name === 'characters' && <CharactersView />}
          {route.name === 'character' && <CharacterEditor key={route.id ?? 'new'} id={route.id} systemId={route.systemId} assignTo={route.assignTo} />}
          {route.name === 'participants' && <ParticipantsView />}
          {route.name === 'compendium' && <CompendiumView />}
          {route.name === 'journal' && <JournalView />}
          {route.name === 'wiki' && <WikiView key={route.campaignId} campaignId={route.campaignId} page={route.page} />}
          {route.name === 'maps' && <MapsView />}
          {route.name === 'settings' && <SettingsView initial={route.section} />}
          </Loading>
        </ErrorBoundary>
      </main>
      <Toasts />
    </div>
  );
}

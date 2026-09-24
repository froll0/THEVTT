import { getSystem } from '@thevtt/systems';
import { Plus } from 'lucide-react';
import { Empty, PageHeader } from '../components/ui';
import { useApp } from '../store/app';

export function CharactersView() {
  const { characters, campaigns, go } = useApp();
  return (
    <div className="page">
      <PageHeader title="Personaggi" subtitle="I tuoi eroi, pronti a sedersi a qualsiasi tavolo.">
        <button className="btn primary" onClick={() => go({ name: 'character', id: null })}>
          <Plus size={16} /> Nuovo personaggio
        </button>
      </PageHeader>
      {characters.length ? (
        <div className="grid">
          {characters.map((c) => {
            const system = getSystem(c.systemId);
            const summary = system?.summary(c.data) ?? [];
            const campaign = campaigns.find((x) => x.id === c.campaignId);
            const portrait = (c.data as { portrait?: string | null }).portrait;
            return (
              <div key={c.id} className="card clickable col" onClick={() => go({ name: 'character', id: c.id })}>
                <div className="row">
                  <div
                    className="avatar"
                    style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: portrait ? `center/cover url(${portrait})` : 'var(--accent-soft)' }}
                  />
                  <div className="grow">
                    <h3 className="ellipsis">{c.name}</h3>
                    <div className="muted small ellipsis">{summary.slice(0, 2).map((s) => s.value).join(' · ')}</div>
                  </div>
                </div>
                <div className="row between">
                  <span className="faint small">{system?.shortName ?? c.systemId}</span>
                  {campaign ? <span className="badge">{campaign.name}</span> : <span className="faint small">Libero</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Nessun personaggio. Creane uno: la procedura guidata ti accompagna passo passo.</Empty>
      )}
    </div>
  );
}

import { getSystem } from '@thevtt/systems';
import { ChevronRight } from 'lucide-react';
import { Empty, PageHeader } from '../components/ui';
import { useApp } from '../store/app';

export function Portrait({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div
      className="portrait"
      style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined, fontSize: size * 0.4 }}
    >
      {!src && name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function CharactersView() {
  const { characters, campaigns, go } = useApp();
  return (
    <div className="page">
      <PageHeader title="Personaggi" subtitle="I tuoi eroi, pronti per qualsiasi tavolo.">
        <button className="btn primary" onClick={() => go({ name: 'character', id: null })}>
          Nuovo personaggio
        </button>
      </PageHeader>
      {characters.length ? (
        <div className="list">
          {characters.map((c) => {
            const system = getSystem(c.systemId);
            const headline = system?.headline?.(c.data) ?? '';
            const campaign = campaigns.find((x) => x.id === c.campaignId);
            const portrait = (c.data as { portrait?: string | null }).portrait;
            const issues = system?.validate(c.data).length ?? 0;
            return (
              <div key={c.id} className="list-item clickable" onClick={() => go({ name: 'character', id: c.id })}>
                <Portrait src={portrait} name={c.name} />
                <div className="grow">
                  <div className="row">
                    <span className="title ellipsis">{c.name}</span>
                    {issues > 0 && <span className="badge">bozza</span>}
                  </div>
                  <div className="meta ellipsis">
                    {headline || system?.shortName}
                    {campaign ? ` · ${campaign.name}` : ''}
                  </div>
                </div>
                <ChevronRight size={16} className="faint" />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Nessun personaggio. La creazione guidata ti accompagna passo passo.</Empty>
      )}
    </div>
  );
}

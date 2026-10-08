import { listSystems } from '@thevtt/systems';
import { useState } from 'react';
import { Compendium } from '../components/Compendium';
import { Tabs } from '../components/ui';
import { getSystemUi } from '../systems';

const KEY = 'thevtt.compendium.system';

/** Launcher: the rules, always at hand outside the table too, for each game. */
export function CompendiumView() {
  const systems = listSystems().filter((s) => getSystemUi(s.id)?.compendium);
  const [systemId, setSystemId] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && systems.some((s) => s.id === saved)) return saved;
    } catch {
      /* storage off */
    }
    return systems[0]?.id ?? 'dnd5e-2024';
  });
  const pick = (id: string) => {
    setSystemId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* storage off */
    }
  };
  return (
    <div className="compendium-page">
      {systems.length > 1 && (
        <div style={{ marginBottom: 'var(--s3)' }}>
          <Tabs value={systemId} onChange={pick} options={systems.map((s) => ({ id: s.id, label: s.shortName }))} />
        </div>
      )}
      <Compendium key={systemId} systemId={systemId} />
    </div>
  );
}

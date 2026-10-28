import { Journal } from '../components/Journal';
import { PageHeader } from '../components/ui';

export function JournalView() {
  return (
    <div className="page wide">
      <PageHeader scene="stones" title="Diario" subtitle="Il tuo taccuino d’avventura: lo leggi solo tu. Al tavolo si apre in una finestra accanto alla mappa." />
      <div className="journal-page">
        <Journal />
      </div>
    </div>
  );
}

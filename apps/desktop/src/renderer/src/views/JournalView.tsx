import { Journal } from '../components/Journal';
import { PageHeader } from '../components/ui';

export function JournalView() {
  return (
    <div className="page wide">
      <PageHeader title="Diario" subtitle="Appunti di sessione che legge solo tu. Al tavolo lo apri in una finestra accanto alla mappa." />
      <div className="journal-page">
        <Journal />
      </div>
    </div>
  );
}

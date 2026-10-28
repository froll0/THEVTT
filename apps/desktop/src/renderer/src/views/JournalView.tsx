import { Journal } from '../components/Journal';
import { PageHeader, useMedia } from '../components/ui';

export function JournalView() {
  // on a phone: the list, then the open page (two columns do not fit)
  const phone = useMedia('(max-width: 720px)');
  return (
    <div className="page wide">
      <PageHeader scene="stones" title="Diario" subtitle="Il tuo taccuino d’avventura: lo leggi solo tu. Al tavolo si apre in una finestra accanto alla mappa." />
      <div className="journal-page">
        <Journal key={phone ? 'phone' : 'wide'} narrow={phone} />
      </div>
    </div>
  );
}

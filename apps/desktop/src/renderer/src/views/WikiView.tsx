import { ArrowLeft } from 'lucide-react';
import { WikiBrowser } from '../components/Wiki';
import { PageHeader } from '../components/ui';
import { useApp } from '../store/app';

/** The campaign's wiki as a page of its own, from the campaign. */
export function WikiView({ campaignId, page }: { campaignId: string; page?: string }) {
  const { go, user } = useApp();
  const campaign = useApp((s) => s.campaigns.find((c) => c.id === campaignId));
  if (!campaign) return null;
  return (
    <div className="page wide">
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => go({ name: 'campaign', id: campaignId })}>
        <ArrowLeft size={14} /> {campaign.name}
      </button>
      <PageHeader title="Wiki della campagna" subtitle={`Luoghi, personaggi, fazioni e storie di «${campaign.name}», collegati tra loro.`} />
      <WikiBrowser campaignId={campaignId} isGm={campaign.gmId === user?.id} initial={page} />
    </div>
  );
}

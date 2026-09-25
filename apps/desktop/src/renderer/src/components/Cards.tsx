import type { Campaign, CharacterRecord } from '@thevtt/shared';
import { getSystem } from '@thevtt/systems';
import { CalendarClock, Crown, Plus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useApp } from '../store/app';
import { Avatar } from './ui';

/** A stable, pleasant backdrop for things without a picture, from their name. */
export function coverStyle(name: string, image?: string | null): CSSProperties {
  if (image) return { backgroundImage: `url(${image})` };
  // FNV-1a, so that similar names still get different colours
  let x = 2166136261;
  for (const ch of name) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  const h = (x >>> 0) % 360;
  return {
    backgroundImage: `radial-gradient(120% 90% at 15% 0%, hsl(${h} 45% 42% / 0.9), transparent 60%), radial-gradient(90% 90% at 100% 100%, hsl(${(h + 50) % 360} 40% 30% / 0.9), transparent 70%), linear-gradient(135deg, hsl(${h} 25% 18%), hsl(${(h + 30) % 360} 25% 12%))`,
  };
}

const shortDate = (iso: string) => new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function CampaignCard({ c, action }: { c: Campaign; action?: ReactNode }) {
  const { go, user } = useApp();
  const isGm = c.gmId === user?.id;
  const players = c.members.filter((m) => m.role === 'player').length;
  const next = c.nextSession && new Date(c.nextSession).getTime() > Date.now() - 6 * 3600_000 ? c.nextSession : null;
  return (
    <div className="tile campaign-card clickable" onClick={() => go({ name: 'campaign', id: c.id })}>
      <div className="tile-cover" style={coverStyle(c.name, c.cover)}>
        <div className="tile-badges">
          {c.session && <span className="badge live solid">in gioco</span>}
          <span className="badge glassy">{isGm ? <><Crown size={10} /> Master</> : 'Giocatore'}</span>
        </div>
        <div className="avatars">
          {c.members.slice(0, 5).map((m) => (
            <Avatar key={m.user.id} user={m.user} size={22} />
          ))}
        </div>
      </div>
      <div className="tile-body">
        <span className="tile-title ellipsis">{c.name}</span>
        <span className="meta ellipsis">
          {getSystem(c.systemId)?.shortName ?? c.systemId} · {players} {players === 1 ? 'giocatore' : 'giocatori'}
        </span>
        {next && (
          <span className="meta ellipsis accent-text">
            <CalendarClock size={12} /> {shortDate(next)}
          </span>
        )}
        {action && (
          <div className="tile-action" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export function NewCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="tile new-tile" onClick={onClick}>
      <Plus size={20} />
      {label}
    </button>
  );
}

export function CharacterCard({ c }: { c: CharacterRecord }) {
  const { go, campaigns } = useApp();
  const system = getSystem(c.systemId);
  const headline = system?.headline?.(c.data) ?? '';
  const campaign = campaigns.find((x) => x.id === c.campaignId);
  const portrait = (c.data as { portrait?: string | null }).portrait;
  const issues = system?.validate(c.data).length ?? 0;
  return (
    <div className="tile character-card clickable" onClick={() => go({ name: 'character', id: c.id })}>
      <div className="tile-cover portrait-cover" style={coverStyle(c.name, portrait)}>
        {!portrait && <span className="cover-initial">{c.name.slice(0, 1).toUpperCase()}</span>}
        {issues > 0 && (
          <div className="tile-badges">
            <span className="badge glassy">bozza</span>
          </div>
        )}
      </div>
      <div className="tile-body">
        <span className="tile-title ellipsis">{c.name}</span>
        <span className="meta ellipsis">{headline || system?.shortName}</span>
        <span className="meta ellipsis faint">{campaign ? campaign.name : 'Libero'}</span>
      </div>
    </div>
  );
}

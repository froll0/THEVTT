import { useEffect, useState } from 'react';
import { Switch } from '../components/ui';
import { DISCORD_DEFAULTS, discordSettings, saveDiscordSettings, toDiscord, type DiscordSettings } from '../lib/discord';
import { bridge } from '../lib/platform';
import { useApp } from '../store/app';

const OPTIONS: { key: Exclude<keyof DiscordSettings, 'url'>; label: string }[] = [
  { key: 'session', label: 'Il tavolo si apre e si chiude' },
  { key: 'schedule', label: 'La prossima sessione' },
  { key: 'recaps', label: 'I riassunti delle sessioni' },
  { key: 'events', label: 'Missioni, negozi, bottino, viaggi' },
  { key: 'rolls', label: 'I tiri che vedono tutti' },
];

/** GM: the campaign's Discord channel, through a webhook kept on this computer. */
export function DiscordCard({ campaignId }: { campaignId: string }) {
  const toast = useApp((s) => s.toast);
  const [s, setS] = useState<DiscordSettings>(DISCORD_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void discordSettings(campaignId).then((v) => {
      setS(v);
      setLoaded(true);
    });
  }, [campaignId]);
  if (!bridge) return null;
  const save = (next: DiscordSettings) => {
    setS(next);
    void saveDiscordSettings(campaignId, next);
  };
  return (
    <div className="panel-card discord-card">
      <h3>Discord</h3>
      <p className="muted small">Incolla l’indirizzo di un webhook del canale del gruppo (Modifica canale → Integrazioni → Webhook). Resta su questo computer.</p>
      <input
        className="input"
        type="url"
        placeholder="https://discord.com/api/webhooks/…"
        aria-label="Webhook di Discord"
        value={s.url}
        disabled={!loaded}
        onChange={(e) => save({ ...s, url: e.target.value.trim() })}
      />
      {s.url && (
        <>
          <div className="col" style={{ gap: 4 }}>
            {OPTIONS.map((o) => (
              <label key={o.key} className="row small" style={{ gap: 8 }}>
                <Switch on={s[o.key]} onChange={(v) => save({ ...s, [o.key]: v })} label={o.label} />
                {o.label}
              </label>
            ))}
          </div>
          <button
            className="btn sm"
            onClick={() =>
              void toDiscord(campaignId, 'test', '👋 TheVTT è collegato a questo canale.').then((r) => toast('error' in r ? r.error : 'Messaggio di prova inviato', 'error' in r ? 'error' : 'success'))
            }
          >
            Manda un messaggio di prova
          </button>
        </>
      )}
    </div>
  );
}

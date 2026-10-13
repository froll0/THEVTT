import type { GameState } from '@thevtt/shared';
import { logToDiscord } from './discordText';
export { logToDiscord, recapForDiscord } from './discordText';
import { useEffect, useRef } from 'react';
import { bridge, localStore } from './platform';

/**
 * The campaign's Discord channel: the GM pastes a webhook's address and
 * chooses what gets there. Kept on the GM's computer only.
 */
export interface DiscordSettings {
  url: string;
  /** the table opens and closes */
  session: boolean;
  /** the rolls everyone sees */
  rolls: boolean;
  /** missions, shops, loot, journeys: the table's announcements */
  events: boolean;
  /** the session recaps, when published */
  recaps: boolean;
  /** the next session, when it's set */
  schedule: boolean;
}

export const DISCORD_DEFAULTS: DiscordSettings = { url: '', session: true, rolls: false, events: true, recaps: true, schedule: true };

const key = (campaignId: string) => `discord-${campaignId}`;

export async function discordSettings(campaignId: string): Promise<DiscordSettings> {
  const saved = await localStore.read<Partial<DiscordSettings>>(key(campaignId)).catch(() => null);
  return { ...DISCORD_DEFAULTS, ...(saved ?? {}) };
}

export async function saveDiscordSettings(campaignId: string, s: DiscordSettings): Promise<void> {
  await localStore.write(key(campaignId), s);
}

/** Sends a message if the campaign has a channel and wants this kind of news. */
export async function toDiscord(campaignId: string, kind: Exclude<keyof DiscordSettings, 'url'> | 'test', text: string): Promise<{ ok: true } | { error: string }> {
  if (!bridge) return { error: 'Discord funziona dall’app del master' };
  const s = await discordSettings(campaignId);
  if (!s.url) return { error: 'Nessun webhook di Discord per questa campagna' };
  if (kind !== 'test' && !s[kind]) return { ok: true };
  return bridge.discord.post(s.url, text);
}

/**
 * GM, at the table: the new lines of the log go to the channel (the ones the
 * settings want), the table's opening and closing too.
 */
export function useDiscordFeed(state: GameState | null, campaignId: string | null, name: string, active: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const log = state?.log;
  useEffect(() => {
    if (!active || !campaignId) return;
    void toDiscord(campaignId, 'session', `🟢 Il tavolo di **${name}** è aperto.`);
    return () => {
      void toDiscord(campaignId, 'session', `⚪ Il tavolo di **${name}** è chiuso.`);
      seen.current = null;
    };
  }, [active, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active || !campaignId || !log) return;
    // what was already there when the table opened isn't news
    if (!seen.current) {
      seen.current = new Set(log.map((e) => e.id));
      return;
    }
    for (const e of log) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      const m = logToDiscord(e);
      if (m) void toDiscord(campaignId, m.kind, m.text);
    }
  }, [log, active, campaignId]);
}

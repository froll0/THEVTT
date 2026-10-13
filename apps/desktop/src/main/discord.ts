/** The address of a Discord webhook (a channel's «Integrazioni → Webhook»). */
export const DISCORD_WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

/** A message to the GM's Discord channel. `f`: only for tests. */
export async function postToDiscord(url: string, content: string, f: typeof fetch = fetch): Promise<{ ok: true } | { error: string }> {
  if (typeof url !== 'string' || !DISCORD_WEBHOOK.test(url.trim())) return { error: 'Non è l’indirizzo di un webhook di Discord' };
  const text = String(content ?? '').slice(0, 1990);
  if (!text.trim()) return { ok: true };
  try {
    const res = await f(url.trim(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // no pings from the game: @everyone and friends stay plain text
      body: JSON.stringify({ content: text, username: 'TheVTT', allowed_mentions: { parse: [] } }),
    });
    if (res.status === 429) return { error: 'Discord chiede di rallentare: riprova tra poco' };
    if (!res.ok) return { error: res.status === 404 ? 'Webhook inesistente: è stato cancellato su Discord?' : `Discord ha risposto ${res.status}` };
    return { ok: true };
  } catch {
    return { error: 'Discord non raggiungibile' };
  }
}

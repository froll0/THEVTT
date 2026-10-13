import { describe, expect, it } from 'vitest';
import { roll as rollDice } from '@thevtt/shared';
import { postToDiscord } from '../src/main/discord';
import { logToDiscord, recapForDiscord } from '../src/renderer/src/lib/discordText';

describe('Discord', () => {
  it('only to a real webhook, without pings, within Discord’s length', async () => {
    let sent: { url: string; body: any } | null = null;
    const f = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)) };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    expect(await postToDiscord('https://example.com/hook', 'x', f)).toEqual({ error: 'Non è l’indirizzo di un webhook di Discord' });
    const url = 'https://discord.com/api/webhooks/123456/abc-DEF_9';
    expect(await postToDiscord(url, '@everyone ' + 'a'.repeat(3000), f)).toEqual({ ok: true });
    expect(sent!.url).toBe(url);
    expect(sent!.body.allowed_mentions).toEqual({ parse: [] });
    expect(sent!.body.content.length).toBe(1990);
    const gone = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    expect(await postToDiscord(url, 'x', gone)).toEqual({ error: 'Webhook inesistente: è stato cancellato su Discord?' });
  });

  it('turns the table’s log into messages; secrets never go', () => {
    const base = { id: '1', ts: 0, authorId: 'p', authorName: 'Giulia' };
    const roll = rollDice('1d20+5', () => 12);
    expect(logToDiscord({ ...base, kind: 'roll', text: '17', label: 'Furtività', roll })!.text).toContain('**Giulia** · Furtività: **17**');
    expect(logToDiscord({ ...base, kind: 'roll', text: '17', roll, private: true })).toBeNull();
    expect(logToDiscord({ ...base, kind: 'chat', text: 'ciao' })).toBeNull();
    expect(logToDiscord({ ...base, kind: 'system', text: 'Nuova missione: Il drago' })).toEqual({ kind: 'events', text: '📜 Nuova missione: Il drago' });
    expect(recapForDiscord('Sessione 3', 'x'.repeat(5000)).length).toBe(1990);
  });
});

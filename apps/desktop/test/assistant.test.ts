import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'thevtt-assistant-'));
vi.mock('electron', () => ({
  app: { getPath: () => dir },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
}));

const { askAssistant, assistantStatus, setAssistantKey } = await import('../src/main/assistant');
const { assistantHtml, campaignMemory, rulesContext } = await import('../src/renderer/src/lib/assistant');

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });

describe('the GM’s assistant', () => {
  it('stays off until a key is saved', async () => {
    expect(await assistantStatus()).toEqual({ configured: false });
    expect(await askAssistant({ task: 'npc', systemId: 'wtow', input: 'un oste' })).toMatchObject({ error: expect.stringContaining('non configurato') });
    expect(await setAssistantKey('sk-ant-test')).toEqual({ configured: true });
  });

  it('asks Claude with the rules passages and server-side fallbacks', async () => {
    let sent: { url: string; headers: Headers; body: any } | null = null;
    const fetch = (async (url: string, init: RequestInit) => {
      sent = { url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) };
      return reply({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Prono: **+1d** agli attacchi in mischia contro di lui (Condizioni).' }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 10, output_tokens: 20 } });
    }) as unknown as typeof globalThis.fetch;
    const r = await askAssistant({ task: 'rules', systemId: 'wtow', input: 'Prono in mischia?', context: [{ title: 'Prono', text: 'Chi attacca in mischia un bersaglio Prono ha +1d.' }] }, { fetch });
    expect(r).toEqual({ text: 'Prono: **+1d** agli attacchi in mischia contro di lui (Condizioni).', truncated: false });
    expect(sent!.url).toContain('/v1/messages');
    expect(sent!.headers.get('x-api-key')).toBe('sk-ant-test');
    expect(sent!.headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(sent!.body).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', output_config: { effort: 'medium' } });
    expect(sent!.body.system).toContain('Warhammer');
    expect(sent!.body.messages[0].content).toContain('<voce titolo="Prono">');
  });

  it('turns API failures and refusals into words for the GM', async () => {
    const fail = (status: number) => (async () => reply({ type: 'error', error: { type: 'x', message: 'no' } }, status)) as unknown as typeof fetch;
    expect(await askAssistant({ task: 'npc', systemId: 'dnd5e-2024', input: 'un oste' }, { fetch: fail(401) })).toMatchObject({ error: expect.stringContaining('chiave API non è valida') });
    expect(await askAssistant({ task: 'npc', systemId: 'dnd5e-2024', input: 'un oste' }, { fetch: fail(429) })).toMatchObject({ error: expect.stringContaining('Troppe richieste') });
    const refusal = (async () => reply({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: null }, usage: { input_tokens: 1, output_tokens: 0 } })) as unknown as typeof fetch;
    expect(await askAssistant({ task: 'npc', systemId: 'dnd5e-2024', input: 'x' }, { fetch: refusal })).toMatchObject({ error: expect.stringContaining('non può rispondere') });
  });

  it('shows its markdown safely and picks the closest compendium entries', () => {
    expect(assistantHtml('**Nome**: Ilda <b>\n- uno\n- due')).toBe('<p><strong>Nome</strong>: Ilda &lt;b&gt;</p><ul><li>uno</li><li>due</li></ul>');
    const entries = [
      { id: 'a', category: 'Regole', title: 'Prono', text: 'Una creatura prona…', render: () => null },
      { id: 'b', category: 'Regole', title: 'Afferrato', text: 'Velocità 0…', render: () => null },
    ];
    expect(rulesContext(entries, 'Cosa succede a un personaggio prono?').map((x) => x.title)).toEqual(['Prono']);
  });

  it('answers about the campaign from what the table remembers, documents cached', async () => {
    let body: any = null;
    const fetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return reply({ id: 'msg_2', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Il bestiame del mulino (Riassunto: Sessione 3).' }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 10, output_tokens: 20 } });
    }) as unknown as typeof globalThis.fetch;
    const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const state = {
      campaignName: 'Cronache',
      notes: { n1: { title: 'Il borgomastro', body: '<p>Vuole il mulino libero dai lupi</p>', updatedAt: 3 } },
      quests: { q1: { title: 'I lupi del mulino', description: '', status: 'active', objectives: [{ text: 'Trova la tana', done: true }] } },
      log: [
        { kind: 'chat', authorName: 'Giulia', text: 'Promettiamo di tornare', ts: 5 },
        { kind: 'roll', authorName: 'Giulia', text: '17', ts: 6 },
      ],
      tokens: { t1: { name: 'Lupo', characterId: null }, t2: { name: 'Elara', characterId: 'c1' } },
      encounters: {},
    };
    const docs = campaignMemory({ state, recaps: [{ title: 'Sessione 3', body: '<p>Il borgomastro promette il bestiame</p>', createdAt: '2026-01-01' }], journal: [], plain: strip }, 'cosa ha promesso il borgomastro?');
    expect(docs.map((d) => d.title)).toEqual(['Missione (in corso): I lupi del mulino', 'Nota: Il borgomastro', 'Riassunto: Sessione 3', 'Creature e PNG sulla mappa', 'Registro del tavolo (ultime righe)']);
    expect(docs.find((d) => d.title.startsWith('Missione'))!.text).toContain('[fatto] Trova la tana');
    // the dice stay out of the log; players' characters out of the NPCs
    expect(docs.at(-1)!.text).toContain('Giulia: Promettiamo di tornare');
    expect(docs.at(-1)!.text).not.toContain('17');
    expect(docs.find((d) => d.title.startsWith('Creature'))!.text).toBe('Lupo');

    const r = await askAssistant({ task: 'campaign', systemId: 'dnd5e-2024', input: 'Cosa ha promesso il borgomastro?', context: docs, campaign: 'Cronache' }, { fetch });
    expect(r).toMatchObject({ text: 'Il bestiame del mulino (Riassunto: Sessione 3).' });
    expect(body.system).toContain('«Cronache»');
    expect(body.output_config).toEqual({ effort: 'medium' });
    const [documents, question] = body.messages[0].content;
    expect(documents.cache_control).toEqual({ type: 'ephemeral' });
    expect(documents.text).toContain('<documento titolo="Riassunto: Sessione 3">');
    expect(question.text).toBe('Domanda: Cosa ha promesso il borgomastro?');
  });
});

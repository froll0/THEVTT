import Anthropic from '@anthropic-ai/sdk';
import { app, safeStorage } from 'electron';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssistantRequest, AssistantResult } from '../preload/api';

/**
 * The GM's assistant: Claude, with the GM's own Anthropic API key. Optional,
 * off until a key is saved; the key never leaves this computer except to
 * Anthropic, and is kept encrypted by the OS when it can.
 */

const MODEL = 'claude-opus-5-5';
const keyFile = () => join(app.getPath('userData'), 'assistant-key');

let cached: string | null | undefined;

async function loadKey(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await readFile(keyFile());
    cached = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch {
    cached = null;
  }
  return cached;
}

export async function assistantStatus(): Promise<{ configured: boolean }> {
  return { configured: !!(await loadKey()) };
}

export async function setAssistantKey(key: string | null): Promise<{ configured: boolean }> {
  const clean = key?.trim() ?? '';
  if (!clean) {
    await rm(keyFile(), { force: true });
    cached = null;
  } else {
    await writeFile(keyFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(clean) : Buffer.from(clean, 'utf8'));
    cached = clean;
  }
  return { configured: !!cached };
}

const SYSTEMS: Record<string, string> = {
  'dnd5e-2024': 'Dungeons & Dragons (regole del 2024)',
  wtow: 'Warhammer: the Old World – Il Gioco di Ruolo (Cubicle 7)',
  libero: 'un gioco di ruolo con regole decise dal gruppo',
};

function system(req: AssistantRequest): string {
  const game = SYSTEMS[req.systemId] ?? 'un gioco di ruolo';
  const base = `Aiuti il master di una campagna di ${game}, al tavolo virtuale TheVTT. Rispondi sempre in italiano, in modo asciutto e pronto da usare al tavolo: niente premesse, niente scuse, niente domande di ritorno.`;
  switch (req.task) {
    case 'npc':
      return `${base}
Crea un PNG a partire dall'idea del master. Scrivi, con questi titoli in grassetto e una o due righe ciascuno: **Nome**, **Chi è**, **Aspetto**, **Come parla** (con una frase tipica tra virgolette), **Cosa vuole**, **Cosa nasconde**, **Un aggancio per i personaggi**. Niente statistiche di gioco.`;
    case 'recap':
      return `${base}
Il master ti dà la bozza del riassunto di una sessione, ricavata dal registro del tavolo (chat, tiri, eventi). Riscrivila come un racconto breve in prosa, al passato, in terza persona, da leggere ai giocatori all'inizio della sessione successiva: 2-4 paragrafi. Usa solo i fatti della bozza; non inventare eventi, nomi o esiti. Ignora le statistiche dei tiri, a meno che un tiro non abbia deciso qualcosa.`;
    case 'campaign':
      return `${base}
Il master ti fa una domanda sulla sua campagna${req.campaign ? ` («${req.campaign}»)` : ''}: chi è un personaggio, cosa è successo, cosa è stato promesso, quali fili restano aperti. Rispondi usando solo i documenti della campagna che ti passa (riassunti, diario, note, missioni, registro del tavolo) e indica tra parentesi il titolo del documento da cui viene ogni fatto. Se i documenti non lo dicono, rispondi che non risulta e suggerisci dove potrebbe essere annotato. Non inventare fatti.`;
    case 'rules':
      return `${base}
Rispondi alla domanda sulle regole usando prima di tutto i brani del compendio che il master ti passa, citando il titolo della voce da cui viene ogni regola. Se i brani non bastano, dillo chiaramente e indica cosa controllare nel manuale. Non inventare numeri o regole.`;
  }
}

type Content = string | { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[];

function userContent(req: AssistantRequest): Content {
  if (req.task === 'campaign') {
    const docs = (req.context ?? []).map((c) => `<documento titolo="${c.title.replace(/"/g, "'")}">\n${c.text}\n</documento>`).join('\n\n');
    // the campaign's documents first and cached: more questions in a row cost much less
    return [
      { type: 'text', text: `Documenti della campagna:\n\n${docs || '(nessun documento)'}`, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Domanda: ${req.input}` },
    ];
  }
  return userText(req);
}

function userText(req: AssistantRequest): string {
  if (req.task === 'rules' && req.context?.length) {
    const passages = req.context.map((c) => `<voce titolo="${c.title.replace(/"/g, "'")}">\n${c.text}\n</voce>`).join('\n\n');
    return `Brani del compendio:\n\n${passages}\n\nDomanda: ${req.input}`;
  }
  return req.input;
}

/** `fetch` only for tests. */
export async function askAssistant(req: AssistantRequest, opts: { fetch?: typeof fetch } = {}): Promise<AssistantResult> {
  const apiKey = await loadKey();
  if (!apiKey) return { error: 'Assistente non configurato: inserisci la tua chiave API in Impostazioni → Avanzate.' };
  if (!req.input.trim()) return { error: 'Scrivi prima cosa ti serve.' };
  const client = new Anthropic({ apiKey, fetch: opts.fetch, maxRetries: opts.fetch ? 0 : 2 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // quick table help: answers in seconds, deeper only for rules
      output_config: { effort: req.task === 'rules' || req.task === 'campaign' ? 'medium' : 'low' },
      system: system(req),
      messages: [{ role: 'user', content: userContent(req) }],
    });
    if (response.stop_reason === 'refusal') return { error: 'L’assistente non può rispondere a questa richiesta.' };
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) return { error: 'Nessuna risposta: riprova.' };
    return { text, truncated: response.stop_reason === 'max_tokens' };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: 'La chiave API non è valida: controllala in Impostazioni → Avanzate.' };
    if (e instanceof Anthropic.PermissionDeniedError) return { error: 'La chiave API non può usare questo modello.' };
    if (e instanceof Anthropic.RateLimitError) return { error: 'Troppe richieste in poco tempo: riprova tra un momento.' };
    if (e instanceof Anthropic.APIConnectionError) return { error: 'Non riesco a raggiungere Anthropic: sei offline?' };
    if (e instanceof Anthropic.APIError) return { error: `Errore dell’assistente (${e.status ?? '?'}): riprova.` };
    return { error: 'Errore dell’assistente: riprova.' };
  }
}

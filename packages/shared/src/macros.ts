import { DiceError, roll } from './dice';

/**
 * Macros: a few lines that do in one click what one would type at the table.
 * Each line is a command (the same as in the chat, plus some for tokens) or a
 * message. Before running, `?{Question|default}` asks the user something and
 * `@name` takes a number from the character sheet.
 *
 *   /r 1d20+@for+@comp Attacco con l'ascia
 *   /danno ?{Danni|1d12+@for} Ascia
 */
export interface Macro {
  id: string;
  name: string;
  color: string;
  body: string;
}

export type MacroStep =
  | { kind: 'roll'; formula: string; label?: string; private?: boolean; blind?: boolean }
  | { kind: 'chat'; text: string; private?: boolean }
  /** damage or healing rolled and applied to the selected tokens */
  | { kind: 'hp'; formula: string; heal: boolean; label?: string }
  /** a condition switched on or off on the selected tokens */
  | { kind: 'condition'; name: string }
  /** the selected tokens join the initiative; no modifier: the character's own */
  | { kind: 'initiative'; modifier: number | null }
  | { kind: 'error'; line: number; text: string; message: string };

/** The questions a macro asks before running, in order, each once. */
export function macroQuestions(body: string): { question: string; fallback: string }[] {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/\?\{([^}|]+)(?:\|([^}]*))?\}/g)) {
    const q = m[1]!.trim();
    if (!out.has(q)) out.set(q, (m[2] ?? '').trim());
  }
  return [...out].map(([question, fallback]) => ({ question, fallback }));
}

/**
 * The macro with the answers and the sheet's numbers put in. Unknown `@names`
 * stay as they are (the check below reports them).
 */
export function expandMacro(body: string, answers: Record<string, string>, vars: Record<string, number | string>): string {
  let out = body.replace(/\?\{([^}|]+)(?:\|([^}]*))?\}/g, (_, q: string, d?: string) => answers[q.trim()] ?? (d ?? '').trim());
  out = out.replace(/@([a-zàèéìòù]+)/gi, (whole, name: string) => {
    const v = vars[name.toLowerCase()];
    return v === undefined ? whole : String(v);
  });
  // "+-1" after putting in a negative modifier
  return out.replace(/\+\s*-/g, '-').replace(/-\s*-/g, '+').replace(/-\s*\+/g, '-');
}

/** A formula the dice can roll? (null when fine, the reason otherwise) */
function formulaProblem(formula: string): string | null {
  try {
    roll(formula, () => 0.5);
    return null;
  } catch (e) {
    return e instanceof DiceError ? e.message : 'Formula non valida';
  }
}

/** Lines → steps. `#` starts a comment; empty lines are skipped. */
export function parseMacro(expanded: string): MacroStep[] {
  const steps: MacroStep[] = [];
  expanded.split('\n').forEach((raw, i) => {
    const text = raw.trim();
    if (!text || text.startsWith('#')) return;
    const line = i + 1;
    const err = (message: string) => steps.push({ kind: 'error', line, text, message });
    const m = /^\/(\S+)\s*(.*)$/.exec(text);
    if (!m) return void steps.push({ kind: 'chat', text });
    const cmd = m[1]!.toLowerCase();
    const rest = m[2]!.trim();
    const [first = '', ...more] = rest.split(/\s+/);
    const label = more.join(' ').trim() || undefined;
    if (['r', 'roll', 'tira', 'gr', 'br'].includes(cmd)) {
      if (!first) return err('Manca la formula dei dadi, per esempio /r 1d20+5');
      const problem = formulaProblem(first);
      if (problem) return err(problem);
      return void steps.push({ kind: 'roll', formula: first, label, private: cmd === 'gr', blind: cmd === 'br' });
    }
    if (cmd === 'gm' || cmd === 'master') {
      if (!rest) return err('Manca il messaggio per il master');
      return void steps.push({ kind: 'chat', text: rest, private: true });
    }
    if (['danno', 'danni', 'damage', 'cura', 'heal'].includes(cmd)) {
      const heal = cmd === 'cura' || cmd === 'heal';
      if (!first) return err(`Manca la formula, per esempio /${heal ? 'cura 2d4+2' : 'danno 2d6+3'}`);
      const problem = formulaProblem(first);
      if (problem) return err(problem);
      return void steps.push({ kind: 'hp', formula: first, heal, label });
    }
    if (['condizione', 'cond', 'condition'].includes(cmd)) {
      if (!rest) return err('Manca la condizione, per esempio /condizione Avvelenato');
      return void steps.push({ kind: 'condition', name: rest });
    }
    if (['iniziativa', 'init', 'initiative'].includes(cmd)) {
      if (!rest) return void steps.push({ kind: 'initiative', modifier: null });
      const n = Number(rest.replace(',', '.'));
      if (!Number.isFinite(n)) return err('Il modificatore dell’iniziativa è un numero, per esempio /iniziativa +2');
      return void steps.push({ kind: 'initiative', modifier: Math.round(n) });
    }
    err(`Comando sconosciuto: /${cmd}`);
  });
  return steps;
}

/** What a step will do, in words, for the macro's preview. */
export function describeStep(s: MacroStep): string {
  switch (s.kind) {
    case 'roll':
      return `${s.blind ? 'Tira alla cieca' : s.private ? 'Tira di nascosto' : 'Tira'} ${s.formula}${s.label ? ` · ${s.label}` : ''}`;
    case 'chat':
      return s.private ? `Scrive al master: «${s.text}»` : `Scrive in chat: «${s.text}»`;
    case 'hp':
      return `${s.heal ? 'Cura' : 'Infligge'} ${s.formula} ${s.heal ? 'ai' : 'di danni ai'} token selezionati${s.label ? ` · ${s.label}` : ''}`;
    case 'condition':
      return `Mette o toglie «${s.name}» ai token selezionati`;
    case 'initiative':
      return s.modifier === null ? 'Aggiunge i token selezionati all’iniziativa (col loro bonus)' : `Aggiunge i token selezionati all’iniziativa con ${s.modifier >= 0 ? '+' : ''}${s.modifier}`;
    case 'error':
      return `Riga ${s.line}: ${s.message}`;
  }
}

/** Steps that need tokens selected on the map. */
export const needsTokens = (steps: MacroStep[]) => steps.some((s) => s.kind === 'hp' || s.kind === 'condition' || s.kind === 'initiative');

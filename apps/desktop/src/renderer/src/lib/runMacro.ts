import { expandMacro, parseMacro, type GameAction, type GameState, type MacroStep, type Token } from '@thevtt/shared';
import { dnd5e } from '@thevtt/systems';

/**
 * Where a macro's `@names` come from: the character of the selected token if
 * it's one's own, otherwise one's own character at this table.
 */
export function macroCharacter(state: GameState, me: string, selected: Token[]) {
  const own = selected.find((t) => t.characterId && (t.ownerIds.includes(me) || state.gmId === me));
  const id = own?.characterId ?? state.players[me]?.characterId ?? null;
  const ch = id ? state.characters[id] : undefined;
  return ch && ch.systemId === 'dnd5e-2024' ? ch : undefined;
}

/** The numbers a macro can use, by their Italian and English names. */
export function macroVars(state: GameState, me: string, selected: Token[]): Record<string, number | string> {
  const ch = macroCharacter(state, me, selected);
  if (!ch) return {};
  const c = dnd5e.normalize(ch.data);
  const m = (a: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha') => dnd5e.abilityMod(c, a);
  const prof = dnd5e.proficiencyBonus(c.level);
  const v: Record<string, number | string> = {
    for: m('str'), str: m('str'),
    des: m('dex'), dex: m('dex'),
    cos: m('con'), con: m('con'),
    int: m('int'),
    sag: m('wis'), wis: m('wis'),
    car: m('cha'), cha: m('cha'),
    comp: prof, prof,
    livello: c.level, level: c.level,
    ca: dnd5e.armorClass(c), ac: dnd5e.armorClass(c),
    iniz: dnd5e.initiativeBonus(c), init: dnd5e.initiativeBonus(c),
    nome: ch.name, name: ch.name,
  };
  return v;
}

/** The tokens a macro acts on: those selected, or (for a player) their own on the map. */
export function macroTargets(state: GameState, me: string, selectedIds: string[]): Token[] {
  const picked = selectedIds.map((id) => state.tokens[id]).filter((t): t is Token => !!t);
  if (picked.length || state.gmId === me) return picked;
  return Object.values(state.tokens).filter((t) => t.sceneId === state.activeSceneId && t.ownerIds.includes(me));
}

/** Runs a macro: returns a problem to show, or null when everything went out. */
export function runMacro(
  body: string,
  answers: Record<string, string>,
  ctx: { state: GameState; me: string; selectedIds: string[]; dispatch: (a: GameAction) => void },
): string | null {
  const targets = macroTargets(ctx.state, ctx.me, ctx.selectedIds);
  const steps = parseMacro(expandMacro(body, answers, macroVars(ctx.state, ctx.me, targets)));
  const bad = steps.find((s): s is Extract<MacroStep, { kind: 'error' }> => s.kind === 'error');
  if (bad) return `Riga ${bad.line}: ${bad.message}`;
  if (!steps.length) return 'La macro è vuota';
  const isGm = ctx.state.gmId === ctx.me;
  const mine = targets.filter((t) => isGm || t.ownerIds.includes(ctx.me));
  if (steps.some((s) => s.kind === 'hp' || s.kind === 'condition' || s.kind === 'initiative') && !mine.length) return 'Seleziona prima uno o più token sulla mappa';
  for (const s of steps) {
    if (s.kind === 'roll') ctx.dispatch({ type: 'roll', formula: s.formula, label: s.label, private: s.private, blind: s.blind });
    else if (s.kind === 'chat') ctx.dispatch({ type: 'chat', text: s.text, private: s.private });
    else if (s.kind === 'hp') ctx.dispatch({ type: 'hp.roll', formula: s.formula, heal: s.heal, label: s.label, tokenIds: mine.map((t) => t.id) });
    else if (s.kind === 'condition') {
      const known = dnd5e.CONDITIONS.find((c) => c.toLowerCase() === s.name.toLowerCase());
      const name = known ?? s.name.charAt(0).toUpperCase() + s.name.slice(1);
      for (const t of mine) {
        const has = t.conditions.includes(name);
        ctx.dispatch({ type: 'token.update', tokenId: t.id, patch: { conditions: has ? t.conditions.filter((c) => c !== name) : [...t.conditions, name] } });
      }
    } else if (s.kind === 'initiative') {
      for (const t of mine) {
        let modifier = s.modifier;
        if (modifier === null) {
          const ch = t.characterId ? ctx.state.characters[t.characterId] : undefined;
          modifier = ch?.systemId === 'dnd5e-2024' ? dnd5e.initiativeBonus(dnd5e.normalize(ch.data)) : 0;
        }
        ctx.dispatch({ type: 'initiative.add', name: t.name, tokenId: t.id, modifier });
      }
    }
  }
  return null;
}

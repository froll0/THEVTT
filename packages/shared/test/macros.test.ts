import { describe, expect, it } from 'vitest';
import { createInitialState, describeStep, expandMacro, GameHost, macroQuestions, needsTokens, parseMacro } from '../src';

describe('macros', () => {
  it('asks its questions once, then fills in answers and the sheet', () => {
    const body = '/r 1d20+@for+@comp Attacco\n/danno ?{Danni|1d8+@for} ?{Arma|Spada}\n# un commento\n/r ?{Danni|1d8} di nuovo';
    expect(macroQuestions(body)).toEqual([
      { question: 'Danni', fallback: '1d8+@for' },
      { question: 'Arma', fallback: 'Spada' },
    ]);
    const text = expandMacro(body, { Danni: '2d6+@for' }, { for: -1, comp: 2 });
    expect(text.split('\n')[0]).toBe('/r 1d20-1+2 Attacco');
    expect(text.split('\n')[1]).toBe('/danno 2d6-1 Spada');
    const steps = parseMacro(text);
    expect(steps).toEqual([
      { kind: 'roll', formula: '1d20-1+2', label: 'Attacco', private: false, blind: false },
      { kind: 'hp', formula: '2d6-1', heal: false, label: 'Spada' },
      { kind: 'roll', formula: '2d6-1', label: 'di nuovo', private: false, blind: false },
    ]);
    expect(needsTokens(steps)).toBe(true);
  });

  it('understands every command and says what each line will do', () => {
    const steps = parseMacro('Si va!\n/gm pssst\n/gr 1d20\n/br 1d20+3 Furtività\n/cura 2d4+2 Pozione\n/condizione Avvelenato\n/iniziativa\n/iniziativa +2');
    expect(steps.map(describeStep)).toEqual([
      'Scrive in chat: «Si va!»',
      'Scrive al master: «pssst»',
      'Tira di nascosto 1d20',
      'Tira alla cieca 1d20+3 · Furtività',
      'Cura 2d4+2 ai token selezionati · Pozione',
      'Mette o toglie «Avvelenato» ai token selezionati',
      'Aggiunge i token selezionati all’iniziativa (col loro bonus)',
      'Aggiunge i token selezionati all’iniziativa con +2',
    ]);
  });

  it('points at the lines that would not work', () => {
    const steps = parseMacro('/r 1d20+@forza\n/vola alto\n/danno\n/iniziativa tanto');
    expect(steps.every((s) => s.kind === 'error')).toBe(true);
    expect(steps.map((s) => (s.kind === 'error' ? s.line : 0))).toEqual([1, 2, 3, 4]);
    expect(describeStep(steps[1]!)).toBe('Riga 2: Comando sconosciuto: /vola');
  });

  it('damage and healing land on the selected tokens, players only on their own', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
    const host = new GameHost({ state, send: () => {}, rng: () => 0.5, now: () => 0 });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Orco', hp: { current: 15, max: 15 } } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Lia', x: 3, hp: { current: 4, max: 10 }, ownerIds: ['p1'] } });
    const [orc, lia] = Object.values(host.state.tokens);
    expect(host.dispatch('gm', { type: 'hp.roll', formula: '2d6+3', tokenIds: [orc!.id], label: 'Ascia' }).ok).toBe(true);
    const dealt = Number(host.state.log.at(-1)!.text);
    expect(host.state.log.at(-1)).toMatchObject({ kind: 'roll', label: 'Ascia → Orco' });
    expect(host.state.tokens[orc!.id]!.hp!.current).toBe(15 - dealt);
    // healing never goes over the maximum
    expect(host.dispatch('p1', { type: 'hp.roll', formula: '2d4+8', tokenIds: [lia!.id], heal: true }).ok).toBe(true);
    expect(host.state.tokens[lia!.id]!.hp!.current).toBe(10);
    // a player can't hurt the GM's creatures
    expect(host.dispatch('p1', { type: 'hp.roll', formula: '1d6', tokenIds: [orc!.id] }).ok).toBe(false);
    // the GM takes it back
    host.dispatch('gm', { type: 'game.undo' });
    expect(host.state.tokens[orc!.id]!.hp!.current).toBe(15);
  });
});

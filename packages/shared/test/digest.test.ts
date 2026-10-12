import { describe, expect, it } from 'vitest';
import { createInitialState, sessionDigest, type LogEntry } from '../src';

describe('session digest', () => {
  it('drafts a recap from the public log of the session', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    const e = (p: Partial<LogEntry>): LogEntry => ({ id: Math.random().toString(), ts: 2000, authorId: 'p1', authorName: 'Ada', kind: 'chat', text: '', ...p });
    state.log = [
      e({ ts: 10, text: 'vecchio' }),
      e({ text: 'Apriamo la porta <subito>' }),
      e({ kind: 'roll', text: '', label: 'Furtività', roll: { formula: '1d20+3', total: 21, parts: [] } }),
      e({ kind: 'system', authorId: 'system', authorName: 'Sistema', text: 'Inizia il combattimento' }),
      e({ kind: 'chat', text: 'segreto', private: true }),
      e({ authorId: 'gm', authorName: 'GM', kind: 'card', card: { title: 'Palla di fuoco' }, ts: 2000 + 90 * 60000 }),
    ];
    const d = sessionDigest(state, 1000);
    expect(d.entries).toBe(4);
    expect(d.body).toContain('Presenti</b>: Ada');
    expect(d.body).toContain('&lt;subito&gt;');
    expect(d.body).toContain('Inizia il combattimento');
    expect(d.body).toContain('GM: Palla di fuoco');
    expect(d.body).toContain('Ada, Furtività: 21');
    expect(d.body).toContain('1 h 30 min');
    expect(d.body).not.toContain('segreto');
    expect(d.body).not.toContain('vecchio');
  });
});

describe('session stats', () => {
  it('counts rolls, natural 20s and 1s, the d20 average and pool successes per person', async () => {
    const { sessionStats, roll } = await import('../src');
    const seq = (...v: number[]) => {
      let i = 0;
      return () => v[i++]!;
    };
    const e = (name: string, formula: string, rng: () => number) => ({ id: name + formula, ts: 1, authorId: name, authorName: name, kind: 'roll' as const, text: '', roll: roll(formula, rng) });
    const stats = sessionStats([e('Ada', '1d20+2', seq(20)), e('Ada', '2d20kh1', seq(1, 9)), e('Bo', '4d10s3', seq(1, 2, 9, 10)), e('Bo', '1d6', seq(4))]);
    expect(stats.find((s) => s.name === 'Ada')).toMatchObject({ rolls: 2, crits: 1, fumbles: 0, d20Average: 14.5, successes: 0 });
    expect(stats.find((s) => s.name === 'Bo')).toMatchObject({ rolls: 2, crits: 0, d20Average: null, successes: 2 });
  });
});

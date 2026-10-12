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

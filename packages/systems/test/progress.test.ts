import { describe, expect, it } from 'vitest';
import { award, canLevelUp, dnd5e, levelForXp, warhammer } from '../src';

describe('experience', () => {
  it('D&D: points add up, the level they reach is offered, a milestone too', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(400000)).toBe(20);
    let c = dnd5e.normalize({ level: 1, classId: 'fighter' });
    expect(canLevelUp(c)).toBe(false);
    let r = award('dnd5e-2024', c, { xp: 200 });
    expect(r.note).toBe('+200 PE (200)');
    r = award('dnd5e-2024', r.data, { xp: 150 });
    expect(r.note).toBe('+150 PE (350) · può salire al livello 2');
    expect(canLevelUp(r.data)).toBe(true);
    c = dnd5e.levelUp(dnd5e.normalize(r.data), null);
    expect(canLevelUp(c)).toBe(false);
    const m = award('dnd5e-2024', c, { milestone: true });
    expect(m.note).toBe('può salire al livello 3');
    expect(canLevelUp(m.data)).toBe(true);
    expect(canLevelUp(dnd5e.levelUp(dnd5e.normalize(m.data), null))).toBe(false);
  });

  it('Warhammer: points to spend', () => {
    const r = award('wtow', warhammer.normalize({}), { xp: 3 });
    expect(warhammer.normalize(r.data).xp.total).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { dnd5e } from '../src';

const area = (id: string) => dnd5e.spellArea(dnd5e.SPELLS.find((s) => s.id === id)!);

describe('spell areas', () => {
  it('reads the shape and size from the spell', () => {
    expect(area('fireball')).toEqual({ shape: 'circle', metres: 6 });
    expect(area('burningHands')).toEqual({ shape: 'cone', metres: 4.5 });
    expect(area('lightningBolt')).toEqual({ shape: 'line', metres: 30 });
    expect(area('thunderwave')).toEqual({ shape: 'square', metres: 4.5 });
    expect(area('acidSplash')).toEqual({ shape: 'circle', metres: 1.5 });
    expect(area('coneOfCold')).toEqual({ shape: 'cone', metres: 18 });
  });
  it('a beam or a single target is not an area', () => {
    expect(area('eldritchBlast')).toBeNull();
    expect(area('scorchingRay')).toBeNull();
    expect(area('dancingLights')).toBeNull();
  });
});

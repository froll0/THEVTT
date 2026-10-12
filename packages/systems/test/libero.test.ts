import { describe, expect, it } from 'vitest';
import { free, getSystem } from '../src';

describe('Sistema libero', () => {
  it('formulas take the sheet’s numbers', () => {
    const c = free.createCharacter('pool-d6');
    expect(free.resolveFormula(c, '(@corpo+@combattere)d6h5')).toBe('5d6h5');
    const d20 = free.createCharacter('d20');
    d20.fields.find((f) => f.label === 'Forza')!.value = -1;
    expect(free.resolveFormula(d20, '1d20+@forza')).toBe('1d20-1');
  });

  it('is a system: hit points and defence go to the token, unknown fields are reported', () => {
    const sys = getSystem('libero')!;
    const c = { ...free.createCharacter('d20'), name: 'Ilda' };
    expect(sys.tokenDefaults(c)).toMatchObject({ hp: { current: 10, max: 10 }, ac: 10 });
    expect(free.hpField(sys.withHp!(c, 4) as typeof c)!.value).toBe(4);
    expect(sys.validate(c)).toEqual([]);
    expect(sys.validate({ ...c, rolls: [{ id: 'x', label: 'Magia', formula: '1d20+@mana' }] })).toEqual(['«Magia» usa un campo che non esiste']);
    expect(sys.quickRolls(c)[0]).toMatchObject({ label: 'Attacco in mischia', formula: '1d20+0' });
  });
});

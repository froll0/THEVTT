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

  it('every template is valid and every roll of it is dice notation', () => {
    const term = /^[+-]?(\d*d(\d+|F)(h\d+)?|\d+)$/i;
    const sys = getSystem('libero')!;
    for (const t of free.TEMPLATES) {
      const c = { ...free.createCharacter(t.id), name: 'Prova' };
      expect(sys.validate(c), t.id).toEqual([]);
      for (const q of c.rolls) {
        const f = free.resolveFormula(c, q.formula);
        expect(f.match(/[+-]?[^+-]+/g)!.every((x) => term.test(x)), `${t.id}: ${f}`).toBe(true);
      }
    }
  });
});

describe('sheets designed for a campaign', () => {
  it('cleans what comes from a file or the server', () => {
    const hb = free.cleanFreeHomebrew({
      sheets: [
        { id: 'x', name: 'Cacciatori', fields: [{ label: 'Sangue', kind: 'track', value: 2, max: 5, dots: true }, { label: 'Ispirazione', kind: 'check', value: 7 }, { label: 3 }], rolls: [{ label: 'Caccia', formula: '1d10+@sangue' }] },
        'rotto',
      ],
    });
    expect(hb.sheets).toHaveLength(1);
    expect(hb.sheets[0]!.fields).toHaveLength(2);
    expect(hb.sheets[0]!.fields[0]).toMatchObject({ kind: 'track', dots: true, max: 5 });
    expect(hb.sheets[0]!.fields[1]).toMatchObject({ kind: 'check', value: 1 });
    expect(free.cleanFreeHomebrew(null)).toEqual({ sheets: [] });
  });

  it('become the first templates, with fresh ids for every character', () => {
    const design = { ...free.designFrom('pool-d6', 'Corsari'), id: 'corsari' };
    free.applyCampaignSheets([{ campaignName: 'Mari del Sud', homebrew: { sheets: [design] } }]);
    expect(free.TEMPLATES[0]).toMatchObject({ id: 'campagna:corsari', name: 'Corsari', campaign: 'Mari del Sud' });
    const a = free.createCharacter('campagna:corsari');
    const b = free.createCharacter('campagna:corsari');
    expect(a.fields.map((f) => f.label)).toEqual(design.fields.map((f) => f.label));
    expect(a.fields[0]!.id).not.toBe(b.fields[0]!.id);
    expect(free.libero.quickRolls(a)[0]!.formula).toBe('5d6h5');
    // applied again without it: gone, the built-in ones stay
    free.applyCampaignSheets([]);
    expect(free.TEMPLATES.some((t) => t.id.startsWith('campagna:'))).toBe(false);
    expect(free.TEMPLATES.some((t) => t.id === 'd20')).toBe(true);
  });

  it('a ticked box counts as 1 in formulas', () => {
    const c = free.normalize({ fields: [{ label: 'Vantaggio', kind: 'check', value: 1 }], rolls: [] });
    expect(free.resolveFormula(c, '1d20+@vantaggio')).toBe('1d20+1');
    expect(free.libero.summary(c)[0]).toEqual({ label: 'Vantaggio', value: '✓' });
  });
});

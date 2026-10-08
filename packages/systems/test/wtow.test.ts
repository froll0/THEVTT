import { describe, expect, it } from 'vitest';
import { getSystem, warhammer as w } from '../src';

/** a finished Imperial Soldier: AC, R and Ra boosted */
function soldier() {
  return w.normalize({
    ...w.createCharacter(),
    name: 'Gunter',
    lineage: 'imperiale',
    career: 'soldato',
    boosts: ['ac', 'r', 'fato'],
    lineageSkills: ['mischia', 'difesa', 'tempra'],
    careerSkills: ['mischia', 'difesa', 'atletica', 'volonta'],
    finishSkills: ['furtivita', 'percezione'],
    armour: 'armatura-leggera',
    shield: true,
    weapons: [{ ref: 'spada', name: 'Spada' }],
    talents: [{ id: 'codice-donore' }],
  });
}

describe('Warhammer: the Old World', () => {
  it('is registered as a success-pool system', () => {
    const sys = getSystem('wtow')!;
    expect(sys.table).toBe('pool');
    expect(sys.validate(soldier())).toEqual([]);
    expect(sys.validate(w.createCharacter()).length).toBeGreaterThan(2);
  });

  it('derives characteristics, skills, fate and resilience', () => {
    const c = soldier();
    expect(w.characteristic(c, 'ac')).toBe(3);
    expect(w.characteristic(c, 'r')).toBe(4);
    // 2 → 3 (lineage) → 4 (career): the finishing touch would need a 3
    expect(w.skill(c, 'mischia')).toBe(4);
    expect(w.skill(c, 'difesa')).toBe(4);
    expect(w.skill(c, 'furtivita')).toBe(3);
    expect(w.skill(c, 'sopravvivenza')).toBe(2);
    expect(w.fateMax(c)).toBe(4);
    // R 4 + light armour 1 + shield 1
    expect(w.resilience(c)).toBe(6);
    expect(w.validate({ ...c, finishSkills: ['mischia'] })).toContain('Tocchi finali: l’abilità da portare a 4 deve essere a 3');
    expect(w.skill({ ...c, finishSkills: ['tempra'] }, 'tempra')).toBe(4);
  });

  it('builds pool formulas with the bonus cap and the one-die floor', () => {
    expect(w.testFormula(3, 4)).toBe('3d10s4');
    expect(w.testFormula(3, 4, { mod: 5, glorious: true })).toBe('6d10s4g');
    expect(w.testFormula(1, 4, { mod: -2 })).toBe('1d10s1');
    expect(w.outcome(0)).toBe('Fallimento');
    expect(w.outcome(1)).toBe('Successo Marginale');
    expect(w.outcome(3)).toBe('Successo Totale');
  });

  it('weapons use Forza for their damage', () => {
    const c = soldier();
    const a = w.attackProfile(c, { ref: 'spada', name: 'Spada' });
    expect(a).toMatchObject({ skill: 'mischia', damage: 3, pool: { dice: 3, target: 4 } });
    expect(w.damageValue('F+3', 4)).toBe(7);
    expect(w.damageValue('5', 2)).toBe(5);
    expect(w.attackProfile(c, { ref: 'ascia-a-due-mani', name: 'Ascia' }).pool.dice).toBe(2);
  });

  it('advancement: primary characteristics cost one less, failures raise skills', () => {
    const c = soldier();
    expect(w.charCost(c, 'ac')).toBe(3);
    expect(w.charCost(c, 'f')).toBe(4);
    let d = c;
    for (let i = 0; i < 3; i++) d = w.markFailure(d, 'sopravvivenza');
    expect(w.skill(d, 'sopravvivenza')).toBe(3);
    expect(d.marks.sopravvivenza).toBe(0);
  });

  it('wounds: the table, the token profile and the sheet', () => {
    const sys = getSystem('wtow')!;
    expect(sys.woundResult!(10)).toMatchObject({ name: 'Costola Incrinata' });
    expect(sys.woundResult!(30)).toMatchObject({ dead: true });
    const hurt = sys.withWound!(soldier(), { name: 'Sfregio', text: '…' }) as ReturnType<typeof soldier>;
    expect(hurt.wounds).toHaveLength(1);
    const pool = sys.tokenDefaults(hurt).pool!;
    expect(pool).toMatchObject({ type: 'pg', resilience: 6, toughness: 4, armoured: true, untreated: 1 });
    // with a shield Difesa opposes shots too
    expect(pool.ranged).toEqual({ dice: 3, target: 4 });
    expect(w.woundDice({ ...hurt, talents: [{ id: 'gagliardo' }] })).toBe(1);
    expect(hurt.wounds[0]!.heal).toBe('Una Notte di Riposo');
    expect(w.catchBreath(hurt).wounds[0]!.treated).toBe(true);
    expect(w.nightRest(hurt).wounds).toHaveLength(0);
  });

  it('has its catalogue: 6 lineages, 30 careers, the bestiary, gods and spells', () => {
    expect(w.LINEAGES).toHaveLength(6);
    expect(w.CAREERS).toHaveLength(30);
    expect(w.GODS).toHaveLength(10);
    expect(w.SPELLS.length).toBeGreaterThan(35);
    expect(w.NPCS.length).toBeGreaterThan(60);
    // every lineage's talent table names real talents
    for (const l of w.LINEAGES) for (const t of [...l.talentTable, ...(l.fixedTalents ?? [])]) expect(w.talentByName(t), t).toBeTruthy();
    // random careers cover 1-100 for every lineage
    for (const l of w.LINEAGES) {
      const covered = new Set<number>();
      for (const c of w.CAREERS) {
        const r = c.random[l.id];
        if (r) for (let i = r[0]; i <= r[1]; i++) covered.add(i);
      }
      expect(covered.size, l.name).toBe(100);
    }
    const brute = w.getNpc('cavaliere-imperiale')!;
    expect(brute).toMatchObject({ type: 'Bruto', maxWounds: 2, resilience: 6, armoured: true });
    expect(w.getNpc('gor')!.maxWounds).toBe(1);
    expect(w.getNpc('vampiro')!.maxWounds).toBeNull();
    expect(w.getNpc('ecatombe')!.maxWounds).toBe(6);
  });
});

describe('Warhammer: beyond creation', () => {
  it('a horse, magic armour and the gifts of Chaos raise Resilienza', () => {
    const c = soldier();
    const base = w.resilience(c);
    expect(w.resilience({ ...c, mount: 'cavallo' })).toBe(base + 1);
    expect(w.speedOf({ ...c, mount: 'cavallo' })).toBe('Veloce');
    // the better of the two armours, not both
    expect(w.resilience({ ...c, items: [{ id: 'x', ref: 'armatura-ferro-meteoritico', name: 'Ferro' }] })).toBe(base + 2);
    expect(w.resilience({ ...c, corruption: { ...c.corruption, gifts: ['Pelle Corazzata'] } })).toBe(base + 1);
    const pool = getSystem('wtow')!.tokenDefaults(c).pool!;
    expect(pool.checks!.Tempra).toEqual({ dice: w.characteristic(c, 'r'), target: w.skill(c, 'tempra') });
  });

  it('magic weapons attack from the sheet', () => {
    const c = { ...soldier(), weapons: [{ ref: 'lame-del-duellante', name: 'Lame del Duellante' }] };
    const a = w.attackProfile(c, c.weapons[0]!);
    expect(a.damage).toBe(w.characteristic(c, 'f') + 2);
    expect(a.traits).toContain('due volte');
  });

  it('the Intermezzo: failures raise skills, coins reset, festering wounds heal', () => {
    let c = soldier();
    const before = w.skill(c, 'tempra');
    c = w.activityFailures(c, 'tempra', 10);
    expect(w.skill(c, 'tempra')).toBe(before + 1);
    expect(c.marks.tempra).toBe(0);
    c = w.resetCoins({ ...c, sessions: 2 }, 2);
    expect(c.coins[w.statusOf(c)]).toEqual({ owned: 5, spent: 0 });
    expect(c.sessions).toBe(0);
    c = w.restAndRecover({
      ...c,
      wounds: [
        { id: '1', name: 'Escoriazione', treated: true, heal: 'Riprendere Fiato' },
        { id: '2', name: 'Ginocchio Distrutto', treated: true, heal: 'Riposare e Rimettersi' },
        { id: '3', name: 'Ferita Purulenta', treated: false, festering: true },
      ],
    });
    expect(c.wounds.map((x) => x.name)).toEqual(['Escoriazione']);
  });

  it('tables: contacts, random resources, Talagaad events', () => {
    const { contact, row } = w.contactFor(w.CONTACTS[0]!, 23);
    expect(contact.name).toBe('Giselbert Almayda');
    expect(row.min).toBe(21);
    expect(w.resourceFor('argento', 50)).toBe('Taverna');
    expect(w.eventFor(100).contacts).toContain('Van Obelmann');
    expect(w.TALAGAAD_EVENTS).toHaveLength(23);
    expect(w.CONTACTS.flatMap((g) => g.contacts)).toHaveLength(20);
  });

  it('creatures: table tests, reactions and homebrew profiles', () => {
    const giant = w.getNpc('gigante')!;
    const p = w.npcPool(giant)!;
    expect(p.reaction).toContain('Prono');
    expect(p.checks.Tempra).toEqual({ dice: giant.chars.r, target: 5 });
    const mine = w.normalizeNpc({ name: 'Ratto Gigante', type: 'Bruto', maxWounds: 2, attacks: [{ name: 'Morso', dice: 3, target: 3, damage: 3 }] })!;
    expect(mine.id).toBe('custom-ratto-gigante');
    expect(w.npcPool(mine)!.maxWounds).toBe(2);
    expect(w.normalizeNpc({ name: '' })).toBeNull();
  });

  it('exposure to Chaos makes one Vulnerabile', () => {
    const sys = getSystem('wtow')!;
    const c = sys.withCorruption!(soldier()) as ReturnType<typeof soldier>;
    expect(c.corruption.stage).toBe('vulnerabile');
  });
});

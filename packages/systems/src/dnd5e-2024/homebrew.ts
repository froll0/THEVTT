import { CLASSES } from './classes';
import type { SubclassDef } from './classes-types';
import { DAMAGE_TYPES, GEAR, type DamageType, type GearDef } from './equipment';
import { FEATS, type FeatCategory, type FeatDef } from './feats';
import { SCHOOLS, SPELLS, type SpellDef, type SpellSchool } from './spells';

/**
 * The GM's own D&D content for a campaign: spells, feats, subclasses and
 * magic items. It travels with the campaign (players' apps get it too) and
 * joins the manual's lists, so sheets, builder and compendium use it alike.
 */
export interface HomebrewItem extends GearDef {
  description: string;
  /** +1, +2, +3 weapons and armour */
  magicBonus?: number;
}

export interface DndHomebrew {
  spells: SpellDef[];
  feats: FeatDef[];
  subclasses: { classId: string; subclass: SubclassDef }[];
  items: HomebrewItem[];
}

export const HOMEBREW_ID = 'hb-';
export const emptyHomebrew = (): DndHomebrew => ({ spells: [], feats: [], subclasses: [], items: [] });

const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
const num = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const id = (v: unknown) => {
  const s = String(v ?? '').replace(/[^\w-]/g, '').slice(0, 40);
  return s.startsWith(HOMEBREW_ID) ? s : `${HOMEBREW_ID}${s || Math.random().toString(36).slice(2, 10)}`;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Homebrew from the campaign (anyone could have written it): only what makes sense. */
export function cleanHomebrew(raw: unknown): DndHomebrew {
  const r = (raw ?? {}) as Partial<Record<keyof DndHomebrew, unknown>>;
  const spells = arr(r.spells)
    .slice(0, 300)
    .map((x) => {
      const s = x as Partial<SpellDef>;
      const out: SpellDef = {
        id: id(s.id),
        name: str(s.name, 80) || 'Incantesimo',
        level: num(s.level, 0, 9),
        school: (Object.keys(SCHOOLS) as SpellSchool[]).includes(s.school as SpellSchool) ? (s.school as SpellSchool) : 'evo',
        classes: arr(s.classes).map((c) => String(c)).filter((c) => CLASSES.some((k) => k.id === c)),
        time: str(s.time, 40) || '1 azione',
        range: str(s.range, 40) || 'Personale',
        components: str(s.components, 120) || 'V, S',
        duration: str(s.duration, 60) || 'Istantanea',
        concentration: !!s.concentration,
        ritual: !!s.ritual,
        description: str(s.description, 6000),
      };
      if (s.attack) out.attack = true;
      if (s.save && ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(s.save)) out.save = s.save;
      if (s.damage && /^[\dd+\- ]{1,30}$/i.test(String(s.damage))) out.damage = String(s.damage).replace(/\s+/g, '');
      if (s.damageType && (Object.keys(DAMAGE_TYPES) as DamageType[]).includes(s.damageType)) out.damageType = s.damageType;
      if (s.heal && /^[\dd+\- ]{1,30}$/i.test(String(s.heal))) out.heal = String(s.heal).replace(/\s+/g, '');
      if (s.upcast && /^[\dd+\- ]{1,30}$/i.test(String(s.upcast))) out.upcast = String(s.upcast).replace(/\s+/g, '');
      return out;
    });
  const feats = arr(r.feats)
    .slice(0, 200)
    .map((x) => {
      const f = x as Partial<FeatDef>;
      const out: FeatDef = {
        id: id(f.id),
        name: str(f.name, 80) || 'Talento',
        category: (['origin', 'general', 'fightingStyle', 'epicBoon'] as FeatCategory[]).includes(f.category as FeatCategory) ? (f.category as FeatCategory) : 'general',
        description: str(f.description, 6000),
      };
      if (f.level) out.level = num(f.level, 1, 20);
      if (f.repeatable) out.repeatable = true;
      const inc = arr(f.abilityIncrease).filter((a): a is 'str' => ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(String(a)));
      if (inc.length) out.abilityIncrease = inc;
      return out;
    });
  const subclasses = arr(r.subclasses)
    .slice(0, 100)
    .map((x) => {
      const e = x as { classId?: unknown; subclass?: Partial<SubclassDef> };
      const sc = e.subclass ?? {};
      return {
        classId: String(e.classId ?? ''),
        subclass: {
          id: id(sc.id),
          name: str(sc.name, 80) || 'Sottoclasse',
          description: str(sc.description, 3000),
          features: arr(sc.features)
            .slice(0, 30)
            .map((ft) => ({ level: num((ft as { level?: unknown }).level, 1, 20), name: str((ft as { name?: unknown }).name, 80) || 'Privilegio', description: str((ft as { description?: unknown }).description, 4000) })),
        } as SubclassDef,
      };
    })
    .filter((e) => CLASSES.some((c) => c.id === e.classId));
  const items = arr(r.items)
    .slice(0, 300)
    .map((x) => {
      const g = x as Partial<HomebrewItem>;
      const out: HomebrewItem = { id: id(g.id), name: str(g.name, 80) || 'Oggetto', weight: Math.max(0, Number(g.weight) || 0), cost: Math.max(0, Number(g.cost) || 0), description: str(g.description, 4000) };
      if (g.magicBonus) out.magicBonus = num(g.magicBonus, 1, 3);
      return out;
    });
  return { spells, feats, subclasses, items };
}

/**
 * The homebrew of the user's campaigns joins the manual's lists (and what
 * was there before from homebrew goes away first).
 */
export function applyHomebrew(sets: DndHomebrew[]): void {
  const isHb = (x: { id: string }) => x.id.startsWith(HOMEBREW_ID);
  const keep = <T extends { id: string }>(list: T[]) => {
    const own = list.filter((x) => !isHb(x));
    list.length = 0;
    list.push(...own);
  };
  keep(SPELLS);
  keep(FEATS);
  keep(GEAR);
  for (const c of CLASSES) keep(c.subclasses);
  const seen = new Set<string>();
  const once = (x: { id: string }) => (seen.has(x.id) ? false : (seen.add(x.id), true));
  for (const set of sets) {
    SPELLS.push(...set.spells.filter(once));
    FEATS.push(...set.feats.filter(once));
    GEAR.push(...set.items.filter(once));
    for (const e of set.subclasses) {
      if (!once(e.subclass)) continue;
      CLASSES.find((c) => c.id === e.classId)?.subclasses.push(e.subclass);
    }
  }
}

/** A homebrew item's description, if the gear id is one. */
export const homebrewItem = (ref: string | null | undefined): HomebrewItem | undefined =>
  ref && ref.startsWith(HOMEBREW_ID) ? (GEAR.find((g) => g.id === ref) as HomebrewItem | undefined) : undefined;

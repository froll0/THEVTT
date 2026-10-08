/**
 * Combat for success-pool systems (Warhammer: the Old World): what a token
 * needs for the host to settle an attack, and the Zones a scene is cut into.
 */

export type PoolCombatant = 'pg' | 'Servitore' | 'Bruto' | 'Campione' | 'Mostruosità';

export interface PoolDice {
  dice: number;
  target: number;
}

export interface PoolStats {
  type: PoolCombatant;
  /** damage above this wounds, at or below it staggers */
  resilience: number;
  /** Resilience without armour (attacks that ignore it) */
  toughness: number;
  armoured: boolean;
  /** opposing melee attacks (Atletica or, armed, Difesa) */
  melee: PoolDice;
  /** opposing shots (Atletica, or Difesa with a shield) */
  ranged: PoolDice;
  wounds: number;
  /** defeated at this many wounds (Servitori 1, Bruti and Mostruosità from their profile; none for PCs and Campioni) */
  maxWounds?: number | null;
  /** Bruti and Mostruosità: what each wound does */
  track?: { at: string; effect: string }[];
  /** wounds not yet treated: one more die each on the wounds table */
  untreated?: number;
  /** one die fewer on the wounds table (Gagliardo) */
  hardy?: boolean;
  /** monsters don't stagger after a failed melee attack */
  monster?: boolean;
  /** zones a turn's free move covers: Lento and Normale one, Veloce two */
  speed?: PoolSpeed;
  /** the tests the table rolls for it (hazards, end of turn, retreat, end of the day) */
  checks?: Partial<Record<PoolCheck, PoolDice>>;
  /** Mostruosità: what its Reaction does */
  reaction?: string;
  /** Mostruosità: a choice left to make, a wound or the Reaction */
  pending?: 'wound' | 'stagger';
  /** vehicles: hits can't be opposed, no conditions but In Fiamme, wounds are breakdowns */
  vehicle?: boolean;
  /** wounds taken today (infections at the end of the day) */
  woundsToday?: number;
  /** exposure to Chaos today: 1 Lieve, 2 Profana, 3 Perniciosa, 4 Strazia Anima */
  exposure?: number;
  /** riding: the mount's name (one combatant with its rider) */
  mounted?: string;
}

export type PoolSpeed = 'Lento' | 'Normale' | 'Veloce';
export const POOL_CHECKS = ['Atletica', 'Percezione', 'Tempra', 'Sopravvivenza', 'Volontà', 'Destrezza'] as const;
export type PoolCheck = (typeof POOL_CHECKS)[number];

/** A test that takes several rolls, shared at the table. */
export interface ExtendedTest {
  id: string;
  name: string;
  /** successes needed */
  need: number;
  /** successes so far */
  have: number;
  /** what an attempt costs or needs (one Action, an Activity, a Coin…) */
  note?: string;
}

export const POOL_RANGES = ['Ravvicinata', 'Corta', 'Media', 'Lunga', 'Estrema'] as const;
export type PoolRange = (typeof POOL_RANGES)[number];

/** A region of a scene; distances are counted in zones crossed. Coordinates in cells. */
export interface Zone {
  id: string;
  sceneId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  /** Terreno Difficile */
  difficult?: boolean;
  /** Pericolo (grade), 0 = none */
  hazard?: number;
  /** covering: -1d to shots at those inside */
  cover?: boolean;
  /** higher ground: +1d to melee attacks from it */
  high?: boolean;
  /** the test against the hazard (Tempra by default) */
  hazardSkill?: PoolCheck;
  /** the condition a failure brings */
  hazardCondition?: string;
  /** the hazard strikes at the end of every turn spent inside, not just on the way in */
  hazardEach?: boolean;
  /** failing costs only the condition, no wound (a forced march) */
  hazardNoWound?: boolean;
}

const num = (v: unknown, min: number, max: number, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

export function cleanPoolStats(v: unknown): PoolStats | undefined {
  const p = v as Partial<PoolStats> | null | undefined;
  if (!p || typeof p !== 'object') return undefined;
  const dice = (d: unknown): PoolDice => ({ dice: num((d as PoolDice)?.dice, 0, 20, 1), target: num((d as PoolDice)?.target, 1, 10, 2) });
  const type: PoolCombatant = (['pg', 'Servitore', 'Bruto', 'Campione', 'Mostruosità'] as const).includes(p.type as PoolCombatant) ? (p.type as PoolCombatant) : 'Servitore';
  const out: PoolStats = {
    type,
    resilience: num(p.resilience, 0, 30, 3),
    toughness: num(p.toughness ?? p.resilience, 0, 30, 3),
    armoured: !!p.armoured,
    melee: dice(p.melee),
    ranged: dice(p.ranged ?? p.melee),
    wounds: num(p.wounds, 0, 99),
  };
  if (p.maxWounds != null) out.maxWounds = num(p.maxWounds, 1, 99, 1);
  if (Array.isArray(p.track)) out.track = p.track.slice(0, 8).map((x) => ({ at: String(x?.at ?? '').slice(0, 20), effect: String(x?.effect ?? '').slice(0, 120) }));
  if (p.untreated != null) out.untreated = num(p.untreated, 0, 20);
  if (p.hardy) out.hardy = true;
  if (p.monster || type === 'Mostruosità') out.monster = true;
  if (p.speed && (['Lento', 'Normale', 'Veloce'] as const).includes(p.speed)) out.speed = p.speed;
  if (p.checks && typeof p.checks === 'object') {
    const checks: Partial<Record<PoolCheck, PoolDice>> = {};
    for (const k of POOL_CHECKS) if (p.checks[k]) checks[k] = dice(p.checks[k]);
    if (Object.keys(checks).length) out.checks = checks;
  }
  if (typeof p.reaction === 'string' && p.reaction.trim()) out.reaction = p.reaction.slice(0, 300);
  if (p.pending === 'wound' || p.pending === 'stagger') out.pending = p.pending;
  if (p.vehicle) out.vehicle = true;
  if (p.woundsToday) out.woundsToday = num(p.woundsToday, 0, 20);
  if (p.exposure) out.exposure = num(p.exposure, 0, 4);
  if (typeof p.mounted === 'string' && p.mounted.trim()) out.mounted = p.mounted.slice(0, 40);
  return out;
}

export function cleanZone(v: unknown, sceneId: string, id: string, max: { w: number; h: number }): Zone | null {
  const z = v as Partial<Zone> | null | undefined;
  if (!z || typeof z !== 'object') return null;
  const x = num(z.x, 0, max.w - 1);
  const y = num(z.y, 0, max.h - 1);
  const zone: Zone = {
    id,
    sceneId,
    name: String(z.name ?? 'Zona').trim().slice(0, 40) || 'Zona',
    x,
    y,
    w: num(z.w, 1, max.w - x, 1),
    h: num(z.h, 1, max.h - y, 1),
  };
  if (typeof z.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(z.color)) zone.color = z.color;
  if (z.difficult) zone.difficult = true;
  if (z.cover) zone.cover = true;
  if (z.high) zone.high = true;
  const hazard = num(z.hazard, 0, 9);
  if (hazard) {
    zone.hazard = hazard;
    if (z.hazardSkill && (POOL_CHECKS as readonly string[]).includes(z.hazardSkill)) zone.hazardSkill = z.hazardSkill;
    if (typeof z.hazardCondition === 'string' && z.hazardCondition.trim()) zone.hazardCondition = z.hazardCondition.trim().slice(0, 30);
    if (z.hazardEach) zone.hazardEach = true;
    if (z.hazardNoWound) zone.hazardNoWound = true;
  }
  return zone;
}

/** The zone a point (in cells) lies in; the smallest one when they overlap. */
export function zoneAt(zones: Zone[], x: number, y: number): Zone | undefined {
  return zones
    .filter((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
    .sort((a, b) => a.w * a.h - b.w * b.h)[0];
}

/** Two zones touch (share an edge or overlap). */
export function zonesTouch(a: Zone, b: Zone): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h && !(
    // touching only at a corner does not count
    (a.x + a.w === b.x || b.x + b.w === a.x) && (a.y + a.h === b.y || b.y + b.h === a.y)
  );
}

/** Zones crossed from one zone to another (0 = the same zone, Infinity = unreachable). */
export function zoneHops(zones: Zone[], from: Zone, to: Zone): number {
  if (from.id === to.id) return 0;
  const seen = new Set([from.id]);
  let frontier = [from];
  for (let hops = 1; frontier.length && hops <= zones.length; hops++) {
    const next: Zone[] = [];
    for (const z of frontier) {
      for (const o of zones) {
        if (seen.has(o.id) || !zonesTouch(z, o)) continue;
        if (o.id === to.id) return hops;
        seen.add(o.id);
        next.push(o);
      }
    }
    frontier = next;
  }
  return Infinity;
}

/**
 * The range band between two points (cells, centres). With zones: same zone is
 * Corta (Ravvicinata within a cell and a half), the next one Media, two away
 * Lunga, further Estrema. Without zones the squares stand in for them.
 */
export function rangeBetween(zones: Zone[], a: { x: number; y: number }, b: { x: number; y: number }): PoolRange {
  const cells = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  if (cells <= 1.5) return 'Ravvicinata';
  const za = zoneAt(zones, a.x, a.y);
  const zb = zoneAt(zones, b.x, b.y);
  if (za && zb) {
    const hops = zoneHops(zones, za, zb);
    return hops === 0 ? 'Corta' : hops === 1 ? 'Media' : hops === 2 ? 'Lunga' : 'Estrema';
  }
  return cells <= 6 ? 'Corta' : cells <= 12 ? 'Media' : cells <= 24 ? 'Lunga' : 'Estrema';
}

/** What the wounds of a Bruto or Mostruosità now mean: the row of the track they reached. */
export function trackRow(track: { at: string; effect: string }[] | undefined, wounds: number): { at: string; effect: string } | undefined {
  if (!track) return undefined;
  for (const row of track) {
    const m = /(\d+)(?:\s*-\s*(\d+))?/.exec(row.at);
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : lo;
    if (wounds >= lo && wounds <= hi) return row;
  }
  return undefined;
}

export function cleanExtendedTest(v: unknown, id: string): ExtendedTest | null {
  const t = v as Partial<ExtendedTest> | null | undefined;
  if (!t || typeof t !== 'object') return null;
  const name = String(t.name ?? '').trim().slice(0, 80);
  if (!name) return null;
  const out: ExtendedTest = { id, name, need: num(t.need, 1, 99, 4), have: num(t.have, 0, 99) };
  if (typeof t.note === 'string' && t.note.trim()) out.note = t.note.trim().slice(0, 200);
  return out;
}

/** Free zones of movement in a turn. */
export function freeZones(speed: PoolSpeed | undefined): number {
  return speed === 'Veloce' ? 2 : 1;
}

/** Which side a token fights on: the players' (owned or a PC) or the GM's. */
export function poolSide(t: { ownerIds: string[]; pool?: PoolStats }): 'players' | 'gm' {
  return t.ownerIds.length > 0 || t.pool?.type === 'pg' ? 'players' : 'gm';
}

const OUT = ['Indifeso', 'Sconfitto', 'Morto'];

interface Placed {
  id: string;
  x: number;
  y: number;
  size: number;
  ownerIds: string[];
  conditions: string[];
  pool?: PoolStats;
}

const centre = (t: Placed) => ({ x: t.x + t.size / 2, y: t.y + t.size / 2 });

/** "Media – Estrema" → [2, 4]; "Corta" → [1, 1]; nothing readable → null. */
export function rangeSpan(text: string | undefined): [number, number] | null {
  if (!text) return null;
  const found = POOL_RANGES.map((r, i) => (text.toLowerCase().includes(r.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  if (!found.length) return null;
  return [Math.min(...found), Math.max(...found)];
}

/**
 * The attack modifiers the table can see for itself (Guida del Giocatore p.118):
 * melee +1d charging, +1d outnumbering the enemy in the zone, +1d from higher
 * ground (or against one who is Prono); shots -1d beyond the optimal range,
 * -1d against cover, -1d against one who is Prono.
 */
export function attackModifiers(
  zones: Zone[],
  tokens: Placed[],
  attacker: Placed | undefined,
  target: Placed,
  opts: { ranged?: boolean; charge?: boolean; optimal?: string },
): { dice: number; notes: string[] } {
  const notes: string[] = [];
  let dice = 0;
  const tc = centre(target);
  const tz = zoneAt(zones, tc.x, tc.y);
  const prone = target.conditions.includes('Prono');
  if (!opts.ranged) {
    if (opts.charge) {
      dice++;
      notes.push('+1d Carica');
    }
    const side = poolSide(target) === 'players' ? 'gm' : 'players';
    const fighting = tokens.filter((t) => !!t.pool && !t.conditions.some((c) => OUT.includes(c)));
    const near = (t: Placed) => {
      const c = centre(t);
      if (tz) return zoneAt(zones, c.x, c.y)?.id === tz.id;
      return Math.max(Math.abs(c.x - tc.x), Math.abs(c.y - tc.y)) <= 2.5;
    };
    const inZone = fighting.filter(near);
    const allies = inZone.filter((t) => poolSide(t) === side).length + (attacker && !inZone.some((t) => t.id === attacker.id) ? 1 : 0);
    const enemies = inZone.filter((t) => poolSide(t) !== side).length;
    if (allies > Math.max(1, enemies)) {
      dice++;
      notes.push(`+1d superiorità numerica (${allies} contro ${enemies})`);
    }
    const ac = attacker ? centre(attacker) : undefined;
    const az = ac ? zoneAt(zones, ac.x, ac.y) : undefined;
    if (prone || (az?.high && !tz?.high)) {
      dice++;
      notes.push(prone ? '+1d bersaglio Prono' : '+1d posizione sopraelevata');
    }
  } else {
    const span = rangeSpan(opts.optimal);
    if (attacker && span) {
      const band = rangeBetween(zones, centre(attacker), tc);
      const i = POOL_RANGES.indexOf(band);
      if (i < span[0] || i > span[1]) {
        dice--;
        notes.push(`-1d fuori Portata Ottimale (${band})`);
      }
    }
    if (tz?.cover) {
      dice--;
      notes.push('-1d copertura');
    }
    if (prone) {
      dice--;
      notes.push('-1d bersaglio Prono');
    }
  }
  return { dice, notes };
}

/* --------------------------------------------------------------- Tabelle */

/** Si Salvi Chi Può! (Guida del Giocatore p.120): 1d10 for each who fails, added up. */
export const RETREAT_TABLE: { min: number; max: number; name: string; text: string }[] = [
  { min: 1, max: 3, name: 'Persi', text: 'L’inseguimento vi spinge in zone non familiari e tornare a casa richiede tempo, durante cui il nemico agisce indisturbato.' },
  { min: 4, max: 6, name: 'Derisi', text: 'Dei rivali o alcuni passanti assistono a quello che non è proprio il vostro momento migliore e la vostra reputazione ne risentirà.' },
  { min: 7, max: 9, name: 'Debitori', text: 'Venite salvati da un altro gruppo o da qualcuno delle autorità, ritrovandovi con un debito che non sarà semplice ripagare.' },
  { min: 10, max: 12, name: 'Segnati', text: 'I nemici vi hanno scoperto, rubato i vostri piani o visto dietro le vostre maschere. La prossima volta che li affronterete saranno pronti.' },
  { min: 13, max: 15, name: 'Scoperti', text: 'I nemici vi seguono a casa, sanno dove vivete, chi vi protegge e come colpire quando siete più vulnerabili.' },
  { min: 16, max: 18, name: 'Braccati', text: 'Avete gli inseguitori alle calcagna. Tenendo un basso profilo e rimanendo nascosti a leccarvi le ferite sarete al sicuro, ma appena vi muoverete la caccia riprenderà.' },
  { min: 19, max: 21, name: 'Derubati', text: 'Abbandonate i vostri averi più pesanti per fuggire. Il GM stabilisce ciò che ogni PG perde a causa del nemico.' },
  { min: 22, max: 24, name: 'Circondati', text: 'Fuggite dritti tra le braccia di altri nemici. Per evitare un altro scontro servirà qualche abile strategia o negoziazione.' },
  { min: 25, max: 999, name: 'In trappola', text: 'Non c’è via d’uscita. Il GM illustra cosa bisogna sacrificare per fuggire: magari la retroguardia subisce Ferite o viene catturata dal nemico.' },
];

export const retreatFor = (total: number) => RETREAT_TABLE.find((r) => total >= r.min && total <= r.max) ?? RETREAT_TABLE[0]!;

/** Guasti dei Veicoli (Guida del Giocatore p.125). */
export const VEHICLE_FAULTS: { min: number; max: number; name: string; text: string }[] = [
  { min: 1, max: 3, name: 'Graffio alla Carrozzeria', text: 'Il danno è superficiale, al massimo una ruota che traballa o un portello allentato.' },
  { min: 4, max: 5, name: 'Tratto Movimentato', text: 'I passeggeri vengono sballottati: chi non supera una Prova di Tempra è Barcollante.' },
  { min: 6, max: 7, name: 'Caduta Bagagli', text: 'Il GM sceglie un avere o una Risorsa che vola via dal veicolo; un personaggio con le mani libere può afferrarlo con una Prova di Destrezza.' },
  { min: 8, max: 9, name: 'Passeggero Caduto', text: 'Un passeggero a caso cade dal veicolo, Barcollante e Prono; se il veicolo andava spedito, Tempra contro un Pericolo (2).' },
  { min: 10, max: 10, name: 'Guasto Critico', text: 'Una vela si squarcia, un remo si spezza, una ruota si rompe o un animale scappa: la Velocità cala di un grado (un veicolo Lento non si muove finché non viene riparato).' },
];

export const faultFor = (n: number) => VEHICLE_FAULTS.find((r) => n >= r.min && n <= r.max) ?? VEHICLE_FAULTS[0]!;

/** Exposure to Chaos: the dice the Volontà test loses (null: it fails by itself). */
export const EXPOSURE_LEVELS: { level: number; name: string; penalty: number | null }[] = [
  { level: 1, name: 'Lieve', penalty: 0 },
  { level: 2, name: 'Profana', penalty: 1 },
  { level: 3, name: 'Perniciosa', penalty: 2 },
  { level: 4, name: 'Strazia Anima', penalty: null },
];

/** A sheet's fresh profile for its token, keeping what only the table tracks (today's wounds, exposure, a pending choice). */
export function mergePool(old: PoolStats | undefined, fresh: PoolStats): PoolStats {
  const out = { ...fresh };
  if (old?.woundsToday) out.woundsToday = old.woundsToday;
  if (old?.exposure) out.exposure = old.exposure;
  if (old?.pending) out.pending = old.pending;
  return out;
}

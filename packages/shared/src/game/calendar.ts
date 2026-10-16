/**
 * The campaign's calendar over the world's clock: months, weekdays, moons,
 * festivals that come back every year and the GM's own dated events, which
 * fire when the clock passes them.
 */
export interface CalendarMonth {
  name: string;
  days: number;
}

export interface CalendarMoon {
  name: string;
  /** days from new moon to new moon */
  cycle: number;
  /** days into its cycle on the campaign's first day */
  offset: number;
}

export interface CalendarEvent {
  id: string;
  name: string;
  note: string;
  /** a festival every year on month/day, or once on a given date and hour */
  repeat: 'yearly' | 'once';
  /** 0-based month */
  month: number;
  /** 1-based day of the month */
  day: number;
  /** once: the year; yearly: unused */
  year: number;
  /** once: minutes after midnight it fires */
  minute: number;
  /** players see it on the calendar and hear when it comes */
  visible: boolean;
}

export interface Calendar {
  months: CalendarMonth[];
  weekdays: string[];
  /** the date of the campaign's first day */
  startYear: number;
  startMonth: number;
  startDay: number;
  /** weekday of the first day (index into weekdays) */
  startWeekday: number;
  /** after the year: «DR», «CI»… */
  era: string;
  moons: CalendarMoon[];
  events: CalendarEvent[];
}

const ITALIAN_MONTHS: [string, number][] = [
  ['Gennaio', 31],
  ['Febbraio', 28],
  ['Marzo', 31],
  ['Aprile', 30],
  ['Maggio', 31],
  ['Giugno', 30],
  ['Luglio', 31],
  ['Agosto', 31],
  ['Settembre', 30],
  ['Ottobre', 31],
  ['Novembre', 30],
  ['Dicembre', 31],
];

export const CALENDAR_PRESETS: { id: string; name: string; make: () => Calendar }[] = [
  {
    id: 'gregorian',
    name: 'Il nostro calendario',
    make: () => ({
      months: ITALIAN_MONTHS.map(([name, days]) => ({ name, days })),
      weekdays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
      startYear: 1920,
      startMonth: 0,
      startDay: 1,
      startWeekday: 3,
      era: '',
      moons: [{ name: 'Luna', cycle: 29.5, offset: 0 }],
      events: [],
    }),
  },
  {
    id: 'fantasy',
    name: 'Fantasy: dodici mesi da trenta giorni',
    make: () => ({
      months: ['Gelomorto', 'Ventofreddo', 'Disgelo', 'Germoglio', 'Fioritura', 'Sole alto', 'Mietitura', 'Frutto', 'Vendemmia', 'Foglie cadenti', 'Brina', 'Notte lunga'].map((name) => ({ name, days: 30 })),
      weekdays: ['Primo dì', 'Secondo dì', 'Terzo dì', 'Quarto dì', 'Quinto dì', 'Sesto dì', 'Riposo'],
      startYear: 1492,
      startMonth: 3,
      startDay: 1,
      startWeekday: 0,
      era: 'E.C.',
      moons: [
        { name: 'Selune', cycle: 30, offset: 0 },
        { name: 'Luna rossa', cycle: 11, offset: 4 },
      ],
      events: [
        { id: 'f-solstice', name: 'Festa di mezza estate', note: 'Fuochi sulle colline, fiere in ogni villaggio.', repeat: 'yearly', month: 5, day: 21, year: 0, minute: 0, visible: true },
        { id: 'f-harvest', name: 'Festa del raccolto', note: 'Si brinda all’ultimo covone.', repeat: 'yearly', month: 8, day: 30, year: 0, minute: 0, visible: true },
        { id: 'f-longnight', name: 'La notte più lunga', note: 'Si lasciano lumi alle finestre per i morti.', repeat: 'yearly', month: 11, day: 21, year: 0, minute: 0, visible: true },
      ],
    }),
  },
];

const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
const int = (v: unknown, min: number, max: number, def = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** A calendar from the GM (or a file): only what makes sense. */
export function cleanCalendar(raw: unknown): Calendar {
  const r = (raw ?? {}) as Partial<Calendar>;
  const months = (Array.isArray(r.months) ? r.months : [])
    .slice(0, 24)
    .map((m) => ({ name: str(m?.name, 40) || 'Mese', days: int(m?.days, 1, 100, 30) }));
  if (!months.length) months.push(...CALENDAR_PRESETS[0]!.make().months);
  const weekdays = (Array.isArray(r.weekdays) ? r.weekdays : []).slice(0, 14).map((d) => str(d, 30)).filter(Boolean);
  if (!weekdays.length) weekdays.push(...CALENDAR_PRESETS[0]!.make().weekdays);
  const startMonth = int(r.startMonth, 0, months.length - 1);
  return {
    months,
    weekdays,
    startYear: int(r.startYear, -100000, 100000, 1),
    startMonth,
    startDay: int(r.startDay, 1, months[startMonth]!.days, 1),
    startWeekday: int(r.startWeekday, 0, weekdays.length - 1),
    era: str(r.era, 20),
    moons: (Array.isArray(r.moons) ? r.moons : []).slice(0, 4).map((m) => ({
      name: str(m?.name, 30) || 'Luna',
      cycle: Math.min(400, Math.max(2, Number(m?.cycle) || 29.5)),
      offset: Math.max(0, Number(m?.offset) || 0),
    })),
    events: (Array.isArray(r.events) ? r.events : []).slice(0, 300).map((e, i) => {
      const month = int(e?.month, 0, months.length - 1);
      return {
        id: str(e?.id, 40).replace(/[^\w-]/g, '') || `ev-${i}-${Math.random().toString(36).slice(2, 8)}`,
        name: str(e?.name, 80) || 'Evento',
        note: str(e?.note, 1000),
        repeat: e?.repeat === 'once' ? 'once' : 'yearly',
        month,
        day: int(e?.day, 1, months[month]!.days, 1),
        year: int(e?.year, -100000, 100000, 0),
        minute: int(e?.minute, 0, 1439),
        visible: !!e?.visible,
      };
    }),
  };
}

export const yearLength = (c: Calendar) => c.months.reduce((n, m) => n + m.days, 0);

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
  /** "12 Fioritura 1492 E.C." */
  label: string;
}

/** The date on the campaign's day `dayIndex` (0 = the first day). */
export function dateOf(c: Calendar, dayIndex: number): CalendarDate {
  const len = yearLength(c);
  const startOfYear = c.months.slice(0, c.startMonth).reduce((n, m) => n + m.days, 0) + c.startDay - 1;
  const total = startOfYear + dayIndex;
  const year = c.startYear + Math.floor(total / len);
  let rest = ((total % len) + len) % len;
  let month = 0;
  while (rest >= c.months[month]!.days) {
    rest -= c.months[month]!.days;
    month++;
  }
  const weekday = (((c.startWeekday + dayIndex) % c.weekdays.length) + c.weekdays.length) % c.weekdays.length;
  const day = rest + 1;
  return { year, month, day, weekday, label: `${day} ${c.months[month]!.name} ${year}${c.era ? ` ${c.era}` : ''}` };
}

/** The campaign's day index of a date (inverse of dateOf). */
export function dayIndexOf(c: Calendar, year: number, month: number, day: number): number {
  const len = yearLength(c);
  const startOfYear = c.months.slice(0, c.startMonth).reduce((n, m) => n + m.days, 0) + c.startDay - 1;
  const ofYear = c.months.slice(0, month).reduce((n, m) => n + m.days, 0) + day - 1;
  return (year - c.startYear) * len + ofYear - startOfYear;
}

export const MOON_PHASES = ['Luna nuova', 'Luna crescente', 'Primo quarto', 'Gibbosa crescente', 'Luna piena', 'Gibbosa calante', 'Ultimo quarto', 'Luna calante'] as const;

/** Phase of a moon on a day: 0..7 (0 new, 4 full). */
export function moonPhase(m: CalendarMoon, dayIndex: number): number {
  const f = ((((dayIndex + m.offset) % m.cycle) + m.cycle) % m.cycle) / m.cycle;
  return Math.round(f * 8) % 8;
}

/** Events falling on a day (festivals of that month/day, and once-events of that date). */
export function eventsOn(c: Calendar, dayIndex: number): CalendarEvent[] {
  const d = dateOf(c, dayIndex);
  return c.events.filter((e) => e.month === d.month && e.day === d.day && (e.repeat === 'yearly' || e.year === d.year));
}

/** Events whose moment comes in (from, to] world minutes: what to announce as the clock moves on. */
export function eventsBetween(c: Calendar, from: number, to: number): CalendarEvent[] {
  if (to <= from) return [];
  const out: CalendarEvent[] = [];
  const first = Math.floor(from / 1440);
  const last = Math.floor(to / 1440);
  // a long jump announces only the last year's worth
  for (let d = Math.max(first, last - yearLength(c)); d <= last; d++) {
    for (const e of eventsOn(c, d)) {
      const at = d * 1440 + (e.repeat === 'once' ? e.minute : 0);
      if (at > from && at <= to) out.push(e);
    }
  }
  return out;
}

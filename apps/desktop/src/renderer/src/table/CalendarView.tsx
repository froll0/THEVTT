import {
  CALENDAR_PRESETS,
  cleanCalendar,
  dateOf,
  dayIndexOf,
  eventsOn,
  MOON_PHASES,
  moonPhase,
  newId,
  worldTime,
  type Calendar,
  type CalendarEvent,
} from '@thevtt/shared';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal, Switch } from '../components/ui';
import { useTable } from '../store/table';

const MOON_ICON = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

/** The date on the world's clock, in the campaign's calendar (if it has one). */
export function useWorldDate() {
  const minutes = useTable((s) => s.state?.world?.minutes ?? 8 * 60);
  const calendar = useTable((s) => s.state?.calendar);
  const t = worldTime(minutes);
  const date = calendar ? dateOf(calendar, t.day - 1) : null;
  return { t, calendar, date, dayIndex: t.day - 1 };
}

/**
 * The calendar: a month at a time, with today, the moons and the festivals.
 * The GM picks or edits the calendar and puts events on the days; hidden
 * ones are for the GM alone and only show up in the GM's chat when they come.
 */
export function CalendarView({ onClose }: { onClose: () => void }) {
  const { calendar, date, dayIndex } = useWorldDate();
  const isGm = useTable((s) => s.role === 'gm');
  const dispatch = useTable((s) => s.dispatch);
  const [view, setView] = useState(() => (date ? { year: date.year, month: date.month } : { year: 0, month: 0 }));
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  const save = (c: Calendar | null) => dispatch({ type: 'calendar.set', calendar: c });

  if (!calendar || editing) {
    return (
      <Modal title="Calendario della campagna" onClose={onClose} wide>
        {isGm ? (
          <CalendarSetup
            calendar={calendar ?? null}
            onSave={(c) => {
              save(c);
              const d = dateOf(c, dayIndex);
              setView({ year: d.year, month: d.month });
              setEditing(false);
            }}
            onRemove={calendar ? () => (save(null), setEditing(false)) : undefined}
          />
        ) : (
          <p className="muted">Il master non ha ancora scelto un calendario: si contano solo i giorni.</p>
        )}
      </Modal>
    );
  }

  const month = calendar.months[view.month]!;
  const first = dayIndexOf(calendar, view.year, view.month, 1);
  const lead = dateOf(calendar, first).weekday;
  const step = (n: number) => {
    let m = view.month + n;
    let y = view.year;
    if (m < 0) (m = calendar.months.length - 1), y--;
    if (m >= calendar.months.length) (m = 0), y++;
    setView({ year: y, month: m });
  };
  const pickedEvents = picked !== null ? eventsOn(calendar, picked) : [];

  return (
    <Modal title="Calendario della campagna" onClose={onClose} wide>
      <div className="calendar col">
        <div className="row between">
          <button className="btn ghost sm icon" onClick={() => step(-1)} aria-label="Mese precedente">
            <ChevronLeft size={15} />
          </button>
          <b aria-live="polite">
            {month.name} {view.year}
            {calendar.era ? ` ${calendar.era}` : ''}
          </b>
          <button className="btn ghost sm icon" onClick={() => step(1)} aria-label="Mese successivo">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${calendar.weekdays.length}, 1fr)` }} role="grid" aria-label={`${month.name} ${view.year}`}>
          {calendar.weekdays.map((w) => (
            <span key={w} className="cal-head tiny faint ellipsis" title={w}>
              {w.slice(0, 3)}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`x${i}`} />
          ))}
          {Array.from({ length: month.days }, (_, i) => {
            const d = first + i;
            const evs = eventsOn(calendar, d);
            const moons = calendar.moons.map((m) => moonPhase(m, d));
            const today = d === dayIndex;
            return (
              <button
                key={i}
                className={`cal-day ${today ? 'today' : ''} ${picked === d ? 'on' : ''} ${d < dayIndex ? 'past' : ''}`}
                onClick={() => setPicked(d)}
                aria-label={`${i + 1} ${month.name}${today ? ', oggi' : ''}${evs.length ? `: ${evs.map((e) => e.name).join(', ')}` : ''}`}
              >
                <span className="row between">
                  <b className="small">{i + 1}</b>
                  {/* full and new moons only, the others in the day's details */}
                  <span className="tiny">{moons.map((p, k) => (p === 0 || p === 4 ? <span key={k} title={`${calendar.moons[k]!.name}: ${MOON_PHASES[p]}`}>{MOON_ICON[p]}</span> : null))}</span>
                </span>
                {evs.slice(0, 2).map((e) => (
                  <span key={e.id} className={`cal-ev tiny ellipsis ${e.visible ? '' : 'secret'}`}>
                    {e.name}
                  </span>
                ))}
                {evs.length > 2 && <span className="tiny faint">+{evs.length - 2}</span>}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <DayDetails
            calendar={calendar}
            dayIndex={picked}
            events={pickedEvents}
            isGm={isGm}
            onChange={(events) => save({ ...calendar, events })}
            onGo={isGm && picked !== dayIndex ? () => dispatch({ type: 'time.advance', minutes: (picked - dayIndex) * 1440 }) : undefined}
          />
        )}
        {isGm && (
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={() => setEditing(true)}>
              Mesi, giorni e lune…
            </button>
            {date && (
              <button className="btn ghost sm" onClick={() => setView({ year: date.year, month: date.month })}>
                Torna a oggi
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function DayDetails({
  calendar,
  dayIndex,
  events,
  isGm,
  onChange,
  onGo,
}: {
  calendar: Calendar;
  dayIndex: number;
  events: CalendarEvent[];
  isGm: boolean;
  onChange: (events: CalendarEvent[]) => void;
  onGo?: () => void;
}) {
  const d = dateOf(calendar, dayIndex);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<'once' | 'yearly'>('once');
  const [hour, setHour] = useState('12:00');
  const [visible, setVisible] = useState(false);
  const add = () => {
    if (!name.trim()) return;
    const [h, m] = hour.split(':').map(Number);
    onChange([
      ...calendar.events,
      { id: newId(), name: name.trim(), note: note.trim(), repeat, month: d.month, day: d.day, year: d.year, minute: (h || 0) * 60 + (m || 0), visible },
    ]);
    setName('');
    setNote('');
  };
  return (
    <div className="cal-details col" role="region" aria-label={`Il ${d.label}`}>
      <div className="row between">
        <b>
          {calendar.weekdays[d.weekday]} {d.label}
        </b>
        {onGo && (
          <button className="btn ghost sm" onClick={onGo} title="Porta l’orologio del mondo a questo giorno, alla stessa ora">
            Vai a questo giorno
          </button>
        )}
      </div>
      {!!calendar.moons.length && (
        <span className="small faint">
          {calendar.moons.map((m) => `${MOON_ICON[moonPhase(m, dayIndex)]} ${m.name}: ${MOON_PHASES[moonPhase(m, dayIndex)]}`).join(' · ')}
        </span>
      )}
      {events.map((e) => (
        <div key={e.id} className="row cal-event" style={{ gap: 6 }}>
          {isGm && (e.visible ? <Eye size={12} aria-label="Visibile ai giocatori" /> : <EyeOff size={12} aria-label="Solo per il master" />)}
          <span className="grow small">
            <b>{e.name}</b>
            {e.repeat === 'once' && e.minute ? ` · ore ${String(Math.floor(e.minute / 60)).padStart(2, '0')}:${String(e.minute % 60).padStart(2, '0')}` : ''}
            {e.repeat === 'yearly' ? ' · ogni anno' : ''}
            {e.note && <span className="faint"> — {e.note}</span>}
          </span>
          {isGm && (
            <button className="btn ghost sm icon" onClick={() => onChange(calendar.events.filter((x) => x.id !== e.id))} aria-label={`Elimina ${e.name}`}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      {!events.length && !isGm && <span className="faint small">Niente di speciale.</span>}
      {isGm && (
        <div className="col" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6 }}>
            <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Festa, arrivo, scadenza…" aria-label="Nome dell’evento" onKeyDown={(e) => e.key === 'Enter' && add()} />
            {repeat === 'once' && <input className="input" type="time" style={{ width: 96 }} value={hour} onChange={(e) => setHour(e.target.value)} aria-label="Ora dell’evento" />}
          </div>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cosa succede (facoltativo)" aria-label="Nota dell’evento" />
          <div className="row wrap" style={{ gap: 10 }}>
            <div className="seg">
              <button className={repeat === 'once' ? 'on' : ''} onClick={() => setRepeat('once')}>
                Una volta
              </button>
              <button className={repeat === 'yearly' ? 'on' : ''} onClick={() => setRepeat('yearly')}>
                Ogni anno
              </button>
            </div>
            <label className="row small" style={{ gap: 6 }}>
              <Switch on={visible} onChange={setVisible} label="I giocatori lo vedono" /> I giocatori lo vedono
            </label>
            <button className="btn sm" disabled={!name.trim()} onClick={add}>
              <Plus size={13} /> Aggiungi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

/** GM: a preset, or one's own months, weekdays and moons. */
function CalendarSetup({ calendar, onSave, onRemove }: { calendar: Calendar | null; onSave: (c: Calendar) => void; onRemove?: () => void }) {
  const [c, setC] = useState<Calendar>(() => calendar ?? CALENDAR_PRESETS[1]!.make());
  const [months, setMonths] = useState(() => c.months.map((m) => `${m.name}: ${m.days}`).join('\n'));
  const [weekdays, setWeekdays] = useState(() => c.weekdays.join('\n'));
  const [moons, setMoons] = useState(() => c.moons.map((m) => `${m.name}: ${m.cycle}`).join('\n'));
  const preset = (id: string) => {
    const p = CALENDAR_PRESETS.find((x) => x.id === id)!.make();
    setC(p);
    setMonths(p.months.map((m) => `${m.name}: ${m.days}`).join('\n'));
    setWeekdays(p.weekdays.join('\n'));
    setMoons(p.moons.map((m) => `${m.name}: ${m.cycle}`).join('\n'));
  };
  const pair = (l: string, def: number) => {
    const [name, n] = l.split(':');
    return { name: name!.trim(), n: Number(n) || def };
  };
  const build = () =>
    cleanCalendar({
      ...c,
      months: lines(months).map((l) => ({ name: pair(l, 30).name, days: pair(l, 30).n })),
      weekdays: lines(weekdays),
      moons: lines(moons).map((l, i) => ({ name: pair(l, 29.5).name, cycle: pair(l, 29.5).n, offset: c.moons[i]?.offset ?? 0 })),
    });
  const built = build();
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="small">Parti da:</span>
        {CALENDAR_PRESETS.map((p) => (
          <button key={p.id} className="chip" onClick={() => preset(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="fields two">
        <label className="field">
          <span className="small">Mesi (nome: giorni)</span>
          <textarea className="input" rows={8} value={months} onChange={(e) => setMonths(e.target.value)} aria-label="Mesi" />
        </label>
        <label className="field">
          <span className="small">Giorni della settimana</span>
          <textarea className="input" rows={8} value={weekdays} onChange={(e) => setWeekdays(e.target.value)} aria-label="Giorni della settimana" />
        </label>
      </div>
      <label className="field">
        <span className="small">Lune (nome: giorni del ciclo)</span>
        <textarea className="input" rows={2} value={moons} onChange={(e) => setMoons(e.target.value)} aria-label="Lune" />
      </label>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="small">Il primo giorno della campagna è il</span>
        <input className="input" type="number" style={{ width: 64 }} min={1} value={c.startDay} onChange={(e) => setC({ ...c, startDay: Number(e.target.value) || 1 })} aria-label="Giorno d’inizio" />
        <select className="select" style={{ width: 'auto' }} value={Math.min(c.startMonth, built.months.length - 1)} onChange={(e) => setC({ ...c, startMonth: Number(e.target.value) })} aria-label="Mese d’inizio">
          {built.months.map((m, i) => (
            <option key={i} value={i}>
              {m.name}
            </option>
          ))}
        </select>
        <input className="input" type="number" style={{ width: 84 }} value={c.startYear} onChange={(e) => setC({ ...c, startYear: Number(e.target.value) || 0 })} aria-label="Anno d’inizio" />
        <input className="input" style={{ width: 70 }} value={c.era} onChange={(e) => setC({ ...c, era: e.target.value })} placeholder="Era" aria-label="Era" />
        <span className="small">, un</span>
        <select className="select" style={{ width: 'auto' }} value={Math.min(c.startWeekday, built.weekdays.length - 1)} onChange={(e) => setC({ ...c, startWeekday: Number(e.target.value) })} aria-label="Giorno della settimana d’inizio">
          {built.weekdays.map((w, i) => (
            <option key={i} value={i}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <span className="faint small">
        Un anno di {built.months.reduce((n, m) => n + m.days, 0)} giorni. Le feste del modello restano; quelle che aggiungi tu vanno sui giorni del calendario.
      </span>
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        {onRemove && (
          <button className="btn ghost sm" onClick={onRemove}>
            Nessun calendario
          </button>
        )}
        <button className="btn primary sm" onClick={() => onSave(built)}>
          Usa questo calendario
        </button>
      </div>
    </div>
  );
}

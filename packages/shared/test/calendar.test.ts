import { describe, expect, it } from 'vitest';
import { CALENDAR_PRESETS, cleanCalendar, createInitialState, dateOf, dayIndexOf, eventsBetween, GameHost, moonPhase, viewFor } from '../src';

const fantasy = () => CALENDAR_PRESETS.find((p) => p.id === 'fantasy')!.make();

describe('calendar', () => {
  it('dates, weekdays and moons follow the world’s days', () => {
    const c = fantasy();
    expect(dateOf(c, 0).label).toBe('1 Germoglio 1492 E.C.');
    expect(dateOf(c, 31)).toMatchObject({ month: 4, day: 2, weekday: 31 % 7 });
    expect(dateOf(c, 360 - 90).year).toBe(1493);
    expect(dayIndexOf(c, 1493, 0, 1)).toBe(270);
    expect(moonPhase(c.moons[0]!, 0)).toBe(0);
    expect(moonPhase(c.moons[0]!, 15)).toBe(4);
  });

  it('cleans what doesn’t make sense', () => {
    const c = cleanCalendar({ months: [{ name: 'A', days: 999 }], weekdays: [], startMonth: 7, events: [{ name: 'X', month: 3, day: 50 }] });
    expect(c.months[0]!.days).toBe(100);
    expect(c.weekdays.length).toBe(7);
    expect(c.startMonth).toBe(0);
    expect(c.events[0]).toMatchObject({ month: 0, day: 50, repeat: 'yearly' });
  });

  it('festivals and GM events fire as the clock passes them', () => {
    const c = fantasy();
    const day = dayIndexOf(c, 1492, 5, 21);
    expect(eventsBetween(c, 0, day * 1440 + 10).map((e) => e.name)).toEqual(['Festa di mezza estate']);
    c.events.push({ id: 'amb', name: 'Agguato al ponte', note: '', repeat: 'once', month: 3, day: 2, year: 1492, minute: 600, visible: false });
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
    const host = new GameHost({ state, send: () => {}, now: () => 0 });
    host.dispatch('gm', { type: 'calendar.set', calendar: c });
    host.dispatch('gm', { type: 'time.set', minutes: 1440 + 9 * 60 });
    expect(host.state.log.some((l) => l.text.includes('Agguato'))).toBe(false);
    host.dispatch('gm', { type: 'time.advance', minutes: 120 });
    const entry = host.state.log.find((l) => l.text.includes('Agguato al ponte'))!;
    expect(entry.private).toBe(true);
    // players don't see the GM's hidden events, on the calendar or in chat
    const pv = viewFor(host.state, 'p1');
    expect(pv.log.some((l) => l.text.includes('Agguato'))).toBe(false);
    expect(pv.calendar!.events.some((e) => e.id === 'amb')).toBe(false);
    expect(host.state.log.some((l) => l.text.startsWith('2 Germoglio 1492 E.C.'))).toBe(true);
    expect(host.dispatch('p1', { type: 'calendar.set', calendar: null }).ok).toBe(false);
  });
});

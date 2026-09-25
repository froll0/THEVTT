import { describe, expect, it } from 'vitest';
import { createInitialState, GameHost, lineOfSight, pointInPolygon, visibilityPolygon, type HostToPlayer } from '../src';

function setup() {
  const outbox: { to: string; msg: HostToPlayer }[] = [];
  const state = createInitialState({ campaignId: 'c1', campaignName: 'Test', systemId: 'dnd5e-2024', gmId: 'gm', sceneId: 's1' });
  const host = new GameHost({ state, send: (to, msg) => outbox.push({ to, msg }), rng: () => 10, now: () => 0 });
  host.upsertPlayer({ id: 'p1', displayName: 'Alice', color: '#f00', characterId: 'ch1' });
  host.upsertPlayer({ id: 'p2', displayName: 'Bob', color: '#0f0', characterId: null });
  host.upsertCharacter({ id: 'ch1', ownerId: 'p1', name: 'Lia', systemId: 'dnd5e-2024', data: {} });
  host.connect('gm');
  host.connect('p1');
  host.connect('p2');
  const lastState = (to: string) => {
    const m = [...outbox].reverse().find((o) => o.to === to && o.msg.k === 'state');
    if (!m || m.msg.k !== 'state') throw new Error('no state');
    return m.msg.state;
  };
  return { host, outbox, lastState };
}

describe('GameHost', () => {
  it('lets only the GM manage scenes', () => {
    const { host } = setup();
    expect(host.dispatch('p1', { type: 'scene.create', name: 'Dungeon' }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'scene.create', name: 'Dungeon' }).ok).toBe(true);
    expect(Object.keys(host.state.scenes)).toHaveLength(2);
  });

  it('lets players place and move only their own character', () => {
    const { host } = setup();
    expect(host.dispatch('p2', { type: 'token.create', token: { name: 'X', characterId: 'ch1' } }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1', x: 3, y: 4 } }).ok).toBe(true);
    const tok = Object.values(host.state.tokens)[0]!;
    expect(tok.ownerIds).toEqual(['p1']);
    expect(host.dispatch('p2', { type: 'token.move', tokenId: tok.id, x: 1, y: 1 }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'token.move', tokenId: tok.id, x: 999, y: 2 }).ok).toBe(true);
    expect(host.state.tokens[tok.id]!.x).toBe(29);
    expect(host.dispatch('p1', { type: 'token.update', tokenId: tok.id, patch: { hidden: true } }).ok).toBe(false);
  });

  it('hides hidden tokens, private rolls and GM notes from players', () => {
    const { host, lastState } = setup();
    host.dispatch('gm', { type: 'token.create', token: { name: 'Goblin', hidden: true } });
    host.dispatch('gm', { type: 'roll', formula: '1d20', private: true });
    host.dispatch('gm', { type: 'notes.update', text: 'segreto' });
    const view = lastState('p1');
    expect(Object.keys(view.tokens)).toHaveLength(0);
    expect(view.log.some((l) => l.kind === 'roll')).toBe(false);
    expect(view.gmNotes).toBe('');
    expect(Object.keys(lastState('gm').tokens)).toHaveLength(1);
  });

  it('resolves rolls on the host', () => {
    const { host } = setup();
    expect(host.dispatch('p1', { type: 'roll', formula: '1d20+3', label: 'Attacco' }).ok).toBe(true);
    const entry = host.state.log.at(-1)!;
    expect(entry.roll?.total).toBe(13);
    expect(entry.authorName).toBe('Alice');
    expect(host.dispatch('p1', { type: 'roll', formula: 'nope' }).ok).toBe(false);
  });

  it('runs initiative order and turns', () => {
    const { host } = setup();
    host.dispatch('gm', { type: 'initiative.add', name: 'Orco', value: 5 });
    host.dispatch('gm', { type: 'initiative.add', name: 'Drago', value: 20 });
    expect(host.state.initiative.entries.map((e) => e.name)).toEqual(['Drago', 'Orco']);
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.initiative).toMatchObject({ round: 1, turn: 0 });
    host.dispatch('gm', { type: 'initiative.next' });
    host.dispatch('gm', { type: 'initiative.next' });
    expect(host.state.initiative).toMatchObject({ round: 2, turn: 0 });
  });

  it('sends assets once per peer before the state that uses them', () => {
    const { host, outbox } = setup();
    outbox.length = 0;
    host.dispatch('gm', { type: 'asset.add', dataUrl: 'data:image/png;base64,AAAA', attachTo: { sceneId: 's1' } });
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { name: 'Taverna' } });
    const toP1 = outbox.filter((o) => o.to === 'p1').map((o) => o.msg.k);
    expect(toP1).toEqual(['asset', 'state', 'state']);
  });

  it('places new tokens on a free cell', () => {
    const { host } = setup();
    host.dispatch('gm', { type: 'token.create', token: { name: 'A', x: 5, y: 5 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'B', x: 5, y: 5 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Ogre', x: 5, y: 5, size: 2 } });
    const [a, b, ogre] = Object.values(host.state.tokens);
    expect([a!.x, a!.y]).toEqual([5, 5]);
    expect([b!.x, b!.y]).not.toEqual([5, 5]);
    const overlaps = (p: typeof a, q: typeof a) => p!.x < q!.x + q!.size && q!.x < p!.x + p!.size && p!.y < q!.y + q!.size && q!.y < p!.y + p!.size;
    expect(overlaps(ogre, a) || overlaps(ogre, b)).toBe(false);
  });

  it('rejects actions from strangers', () => {
    const { host } = setup();
    expect(host.dispatch('intruder', { type: 'chat', text: 'hi' }).ok).toBe(false);
  });
});

describe('fog of war and area templates', () => {
  it('hides tokens under the fog from players but not from the GM', () => {
    const { host, lastState } = setup();
    host.dispatch('gm', { type: 'token.create', token: { name: 'Goblin', x: 10, y: 10 } });
    host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1', x: 2, y: 2 } });
    expect(host.dispatch('p1', { type: 'fog.enable', sceneId: 's1', enabled: true }).ok).toBe(false);
    host.dispatch('gm', { type: 'fog.enable', sceneId: 's1', enabled: true });
    // everything is covered: players still see their own token
    expect(Object.values(lastState('p1').tokens).map((t) => t.name)).toEqual(['Lia']);
    expect(Object.keys(lastState('p2').tokens)).toHaveLength(0);
    expect(Object.keys(lastState('gm').tokens)).toHaveLength(2);
    host.dispatch('gm', { type: 'fog.paint', sceneId: 's1', x: 9, y: 9, w: 3, h: 3, reveal: true });
    expect(Object.values(lastState('p2').tokens).map((t) => t.name)).toEqual(['Goblin']);
    host.dispatch('gm', { type: 'fog.fill', sceneId: 's1', reveal: false });
    expect(Object.keys(lastState('p2').tokens)).toHaveLength(0);
  });

  it('keeps the revealed area when the scene is resized', () => {
    const { host } = setup();
    host.dispatch('gm', { type: 'fog.enable', sceneId: 's1', enabled: true });
    host.dispatch('gm', { type: 'fog.paint', sceneId: 's1', x: 0, y: 0, w: 2, h: 2, reveal: true });
    host.dispatch('gm', { type: 'scene.update', sceneId: 's1', patch: { widthCells: 10, heightCells: 5 } });
    const fog = host.state.scenes.s1!.fog!;
    expect(fog.revealed).toHaveLength(50);
    expect(fog.revealed.slice(0, 3)).toBe('110');
    expect(fog.revealed.slice(10, 13)).toBe('110');
  });

  it('lets everyone draw areas and only authors or the GM delete them', () => {
    const { host, lastState } = setup();
    expect(host.dispatch('p1', { type: 'template.create', template: { shape: 'cone', x: 3, y: 3, size: 3, angle: 0, color: '#f00' } }).ok).toBe(true);
    const id = Object.keys(host.state.templates!)[0]!;
    expect(lastState('p2').templates?.[id]?.shape).toBe('cone');
    expect(host.dispatch('p2', { type: 'template.delete', templateId: id }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'template.delete', templateId: id }).ok).toBe(true);
    host.dispatch('p2', { type: 'template.create', template: { shape: 'circle', x: 1, y: 1, size: 4, angle: 0, color: '#0f0' } });
    host.dispatch('gm', { type: 'template.clear' });
    expect(Object.keys(host.state.templates!)).toHaveLength(0);
  });
});

describe('notes, cards, drawings and music', () => {
  it('sends players only their own character sheets', () => {
    const { host, lastState } = setup();
    host.upsertCharacter({ id: 'ch2', ownerId: 'p2', name: 'Bor', systemId: 'dnd5e-2024', data: {} });
    host.broadcast();
    expect(Object.keys(lastState('p1').characters)).toEqual(['ch1']);
    expect(Object.keys(lastState('p2').characters)).toEqual(['ch2']);
    expect(Object.keys(lastState('gm').characters)).toHaveLength(2);
  });

  it('shows notes only to the people they are shared with', () => {
    const { host, lastState } = setup();
    host.dispatch('gm', { type: 'note.create', note: { title: 'Segreto' } });
    const id = Object.keys(host.state.notes!)[0]!;
    expect(Object.keys(lastState('p1').notes!)).toHaveLength(0);
    host.dispatch('gm', { type: 'note.update', noteId: id, patch: { shared: ['p1', 'ghost'] } });
    expect(host.state.notes![id]!.shared).toEqual(['p1']);
    expect(Object.keys(lastState('p1').notes!)).toEqual([id]);
    expect(Object.keys(lastState('p2').notes!)).toHaveLength(0);
    host.dispatch('gm', { type: 'note.update', noteId: id, patch: { shared: 'all' } });
    expect(Object.keys(lastState('p2').notes!)).toEqual([id]);
    // players can't edit the GM's notes but can write their own
    expect(host.dispatch('p1', { type: 'note.update', noteId: id, patch: { body: 'x' } }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'note.create', note: { title: 'Mie' } }).ok).toBe(true);
    expect(Object.keys(lastState('p2').notes!)).toHaveLength(1);
    expect(Object.keys(lastState('gm').notes!)).toHaveLength(2);
  });

  it('migrates the old GM scratchpad into a private note', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'x', gmId: 'gm', sceneId: 's' });
    delete state.notes;
    state.gmNotes = 'vecchie note';
    const host = new GameHost({ state, send: () => {} });
    const notes = Object.values(host.state.notes!);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.body).toBe('vecchie note');
    expect(notes[0]!.shared).toBe('private');
  });

  it('hides blind roll results from the roller', () => {
    const { host, lastState } = setup();
    host.dispatch('p1', { type: 'roll', formula: '1d20', label: 'Percezione', blind: true });
    const seen = lastState('p1').log.at(-1)!;
    expect(seen.text).toBe('?');
    expect(seen.roll).toBeUndefined();
    expect(lastState('p2').log.some((l) => l.kind === 'roll')).toBe(false);
    expect(lastState('gm').log.at(-1)!.roll?.total).toBe(10);
  });

  it('posts cards and keeps drawings per author', () => {
    const { host, lastState } = setup();
    expect(host.dispatch('p1', { type: 'card', card: { title: 'Palla di fuoco', rolls: [{ label: 'Danni', formula: '8d6' }] } }).ok).toBe(true);
    expect(lastState('p2').log.at(-1)!.card?.title).toBe('Palla di fuoco');
    expect(host.dispatch('p1', { type: 'drawing.create', points: [0, 0, 1, 1], color: '#fff', width: 0.1 }).ok).toBe(true);
    expect(host.dispatch('p1', { type: 'drawing.create', points: [0, 0], color: '#fff', width: 0.1 }).ok).toBe(false);
    const d = Object.keys(host.state.drawings!)[0]!;
    expect(host.dispatch('p2', { type: 'drawing.delete', drawingId: d }).ok).toBe(false);
    host.dispatch('p2', { type: 'drawing.clear' });
    expect(Object.keys(host.state.drawings!)).toHaveLength(1);
    host.dispatch('gm', { type: 'drawing.clear' });
    expect(Object.keys(host.state.drawings!)).toHaveLength(0);
  });

  it('plays music in sync and ships only the current track', () => {
    let now = 1000;
    const outbox: { to: string; msg: HostToPlayer }[] = [];
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'x', gmId: 'gm', sceneId: 's' });
    const host = new GameHost({ state, send: (to, msg) => outbox.push({ to, msg }), now: () => now });
    host.upsertPlayer({ id: 'p1', displayName: 'A', color: '#f00', characterId: null });
    host.connect('p1');
    const audio = 'data:audio/mpeg;base64,AAAA';
    expect(host.dispatch('p1', { type: 'asset.add', dataUrl: audio, attachTo: { track: 'x' } }).ok).toBe(false);
    expect(host.dispatch('gm', { type: 'asset.add', dataUrl: audio }).ok).toBe(false);
    host.dispatch('gm', { type: 'asset.add', dataUrl: audio, attachTo: { track: 'Taverna' } });
    host.dispatch('gm', { type: 'asset.add', dataUrl: 'data:audio/ogg;base64,BBBB', attachTo: { track: 'Battaglia' } });
    const [a, b] = host.state.music!.tracks;
    expect(outbox.some((o) => o.msg.k === 'asset')).toBe(false);
    host.dispatch('gm', { type: 'music.play', trackId: a!.id });
    expect(outbox.filter((o) => o.msg.k === 'asset').map((o) => (o.msg as { id: string }).id)).toEqual([a!.asset]);
    now += 30_000;
    host.dispatch('gm', { type: 'music.pause' });
    expect(host.state.music!.position).toBe(30);
    host.dispatch('gm', { type: 'music.play' });
    expect(host.state.music!.position).toBe(30);
    host.dispatch('gm', { type: 'music.play', trackId: b!.id });
    expect(host.state.music!.position).toBe(0);
    expect(host.dispatch('p1', { type: 'music.pause' }).ok).toBe(false);
    const last = [...outbox].reverse().find((o) => o.msg.k === 'state')!.msg;
    expect(last.k === 'state' && last.now).toBe(now);
  });
});

describe('walls, vision and props', () => {
  it('computes what a point can see around walls', () => {
    const walls = [{ a: { x: 5, y: 0 }, b: { x: 5, y: 8 } }];
    const poly = visibilityPolygon({ x: 2, y: 4 }, walls, { w: 10, h: 10 });
    expect(pointInPolygon({ x: 4, y: 4 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 7, y: 4 }, poly)).toBe(false);
    // around the end of the wall
    expect(pointInPolygon({ x: 6, y: 9.8 }, poly)).toBe(true);
    expect(lineOfSight({ x: 2, y: 4 }, { x: 6, y: 9.8 }, walls)).toBe(true);
    expect(pointInPolygon({ x: 7, y: 9.5 }, poly)).toBe(false);
    expect(lineOfSight({ x: 2, y: 4 }, { x: 7, y: 4 }, walls)).toBe(false);
    expect(lineOfSight({ x: 2, y: 4 }, { x: 4.9, y: 4 }, walls)).toBe(true);
  });

  it('hides tokens behind walls and in the dark from players', () => {
    const { host, lastState } = setup();
    host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1', x: 1, y: 1 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Orco', x: 8, y: 1 } });
    host.dispatch('gm', { type: 'token.create', token: { name: 'Goblin', x: 1, y: 8 } });
    expect(Object.keys(lastState('p1').tokens)).toHaveLength(3);
    const scene = host.state.activeSceneId;
    host.dispatch('gm', { type: 'scene.update', sceneId: scene, patch: { vision: true } });
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 5, y1: 0, x2: 5, y2: 5, kind: 'wall' }] });
    let names = Object.values(lastState('p1').tokens).map((t) => t.name).sort();
    expect(names).toEqual(['Goblin', 'Lia']);
    // walls travel to players so their client can draw the same shadows
    expect(Object.keys(lastState('p1').walls!)).toHaveLength(1);

    // darkness: only lit or darkvision areas
    host.dispatch('gm', { type: 'scene.update', sceneId: scene, patch: { ambient: 'dark' } });
    names = Object.values(lastState('p1').tokens).map((t) => t.name);
    expect(names).toEqual(['Lia']);
    const lia = Object.values(host.state.tokens).find((t) => t.name === 'Lia')!;
    host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { light: { bright: 4, dim: 8 } } });
    expect(Object.values(lastState('p1').tokens).map((t) => t.name).sort()).toEqual(['Goblin', 'Lia']);
    // players can't give themselves darkvision
    expect(host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { darkvision: 12 } }).ok).toBe(false);
    // a burning prop behind the wall doesn't help seeing through it
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'campfire', x: 8, y: 2, light: { bright: 4, dim: 6 } } });
    expect(Object.values(lastState('p1').tokens).map((t) => t.name).sort()).toEqual(['Goblin', 'Lia']);
  });

  it('lets players open doors next to them and stops them at walls', () => {
    const { host, lastState } = setup();
    host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1', x: 3, y: 3 } });
    host.dispatch('gm', { type: 'wall.create', walls: [{ x1: 5, y1: 0, x2: 5, y2: 3, kind: 'wall' }, { x1: 5, y1: 3, x2: 5, y2: 5, kind: 'door' }] });
    const [wall, door] = Object.values(host.state.walls!);
    const lia = Object.values(host.state.tokens)[0]!;
    expect(host.dispatch('p1', { type: 'token.move', tokenId: lia.id, x: 7, y: 3 }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'wall.update', wallId: wall!.id, patch: { open: true } }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'wall.update', wallId: door!.id, patch: { open: true } }).ok).toBe(true);
    expect(host.dispatch('p1', { type: 'token.move', tokenId: lia.id, x: 7, y: 3 }).ok).toBe(true);
    // far from the door now? still 2 cells: fine. Far away: no.
    expect(host.dispatch('p1', { type: 'token.move', tokenId: lia.id, x: 12, y: 3 }).ok).toBe(true);
    expect(host.dispatch('p1', { type: 'wall.update', wallId: door!.id, patch: { open: false } }).ok).toBe(false);
    expect(host.dispatch('p1', { type: 'wall.delete', wallId: wall!.id }).ok).toBe(false);
    expect(lastState('p1').walls![door!.id]!.open).toBe(true);
  });

  it('keeps hidden props from players and validates prop fields', () => {
    const { host, lastState } = setup();
    expect(host.dispatch('p1', { type: 'prop.create', prop: { kind: 'crate' } }).ok).toBe(false);
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'chest', x: 2, y: 2, w: 999, rotation: 450 } });
    host.dispatch('gm', { type: 'prop.create', prop: { kind: 'statue', hidden: true } });
    const props = Object.values(host.state.props!);
    expect(props[0]).toMatchObject({ w: 40, rotation: 90 });
    expect(Object.values(lastState('p1').props!).map((p) => p.kind)).toEqual(['chest']);
  });
});

describe('auras and map alignment', () => {
  it('lets owners set an aura and the GM line up the map', () => {
    const { host, lastState } = setup();
    host.dispatch('p1', { type: 'token.create', token: { name: 'Lia', characterId: 'ch1' } });
    const lia = Object.values(host.state.tokens)[0]!;
    expect(host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { aura: { radius: 2, color: '#ffcc00' } } }).ok).toBe(true);
    expect(lastState('p2').tokens[lia.id]!.aura).toEqual({ radius: 2, color: '#ffcc00' });
    host.dispatch('p1', { type: 'token.update', tokenId: lia.id, patch: { aura: { radius: 0, color: '#fff' } } });
    expect(host.state.tokens[lia.id]!.aura).toBeNull();
    const scene = host.state.activeSceneId;
    expect(host.dispatch('p1', { type: 'scene.update', sceneId: scene, patch: { bgCellPx: 100 } }).ok).toBe(false);
    host.dispatch('gm', { type: 'scene.update', sceneId: scene, patch: { bgCellPx: 1, bgOffsetX: 0.333, bgOffsetY: -99 } });
    expect(host.state.scenes[scene]).toMatchObject({ bgCellPx: 4, bgOffsetX: 0.33, bgOffsetY: -50 });
  });
});

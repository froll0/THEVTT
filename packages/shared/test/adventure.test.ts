import { describe, expect, it } from 'vitest';
import { createInitialState, describeAdventure, GameHost, isAdventurePackage, packAdventure } from '../src';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

function table(campaignId: string) {
  const state = createInitialState({ campaignId, campaignName: campaignId, systemId: 'dnd5e-2024', gmId: 'gm', sceneId: `${campaignId}-s1` });
  state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: null };
  return new GameHost({ state, send: () => {}, now: () => 0 });
}

describe('adventure packages', () => {
  it('a campaign’s prepared material goes into one file and comes out in another campaign', () => {
    const a = table('a');
    const s1 = a.state.activeSceneId;
    a.dispatch('gm', { type: 'scene.update', sceneId: s1, patch: { name: 'La cripta' } });
    a.dispatch('gm', { type: 'asset.add', dataUrl: PNG, attachTo: { sceneId: s1 } });
    a.dispatch('gm', { type: 'wall.create', walls: [{ x1: 0, y1: 0, x2: 4, y2: 0, kind: 'wall' }] });
    a.dispatch('gm', { type: 'token.create', token: { name: 'Scheletro', x: 2, y: 2 } });
    a.dispatch('gm', { type: 'note.create', note: { title: 'Lettera del duca', body: '<p>Venite subito</p>' } });
    const noteId = Object.keys(a.state.notes!)[0]!;
    a.dispatch('gm', { type: 'asset.add', dataUrl: PNG, attachTo: { noteId } });
    // a player's note stays out
    a.dispatch('p1', { type: 'note.create', note: { title: 'Per il master', shared: ['gm'] } });
    a.dispatch('gm', { type: 'asset.add', dataUrl: WAV, attachTo: { track: 'Tensione' } });
    const trackId = a.state.music!.tracks[0]!.id;
    a.dispatch('gm', { type: 'token.create', token: { name: 'Ghoul', x: 5, y: 5 } });
    const ghoul = Object.values(a.state.tokens).find((t) => t.name === 'Ghoul')!.id;
    a.dispatch('gm', { type: 'encounter.save', encounter: { name: 'Agguato', chapter: 'Capitolo 1', trackId, noteId }, captureTokenIds: [ghoul], removeCaptured: true });
    a.dispatch('gm', { type: 'quest.save', quest: { title: 'Trova il duca', visible: true } });
    a.dispatch('gm', { type: 'macros.set', macros: [{ id: 'm1', name: 'Paura', color: '#ff0000', body: '/r 1d20' }] });

    const pkg = JSON.parse(JSON.stringify(packAdventure(a.state, a.assetStore as Record<string, string>, { name: 'La cripta del duca' })));
    expect(isAdventurePackage(pkg)).toBe(true);
    expect(describeAdventure(pkg)).toMatchObject({ scenes: 1, encounters: 1, notes: 1, quests: 1, tracks: 1, creatures: 2 });

    const b = table('b');
    expect(b.dispatch('p1', { type: 'adventure.import', pkg }).ok).toBe(false);
    expect(b.dispatch('gm', { type: 'adventure.import', pkg }).ok).toBe(true);
    const scene = Object.values(b.state.scenes).find((s) => s.name === 'La cripta')!;
    expect(scene).toBeDefined();
    expect(b.assetStore[scene.background!]).toBe(PNG);
    expect(Object.values(b.state.walls!).filter((w) => w.sceneId === scene.id)).toHaveLength(1);
    expect(Object.values(b.state.tokens).map((t) => t.name)).toEqual(['Scheletro']);
    const note = Object.values(b.state.notes!).find((n) => n.title === 'Lettera del duca')!;
    expect(note).toMatchObject({ shared: 'private', authorId: 'gm' });
    expect(b.assetStore[note.image!]).toBe(PNG);
    expect(Object.values(b.state.notes!).some((n) => n.title === 'Per il master')).toBe(false);
    const track = b.state.music!.tracks[0]!;
    expect(b.assetStore[track.asset]).toBe(WAV);
    const enc = Object.values(b.state.encounters!)[0]!;
    expect(enc).toMatchObject({ name: 'Agguato', chapter: 'Capitolo 1', sceneId: scene.id, trackId: track.id, noteId: note.id });
    expect(enc.tokens.map((t) => t.name)).toEqual(['Ghoul']);
    // quests wait for the GM to show them
    expect(Object.values(b.state.quests!)[0]).toMatchObject({ title: 'Trova il duca', visible: false });
    expect(b.state.macros!.map((m) => m.name)).toEqual(['Paura']);
    // and it all launches as before
    expect(b.dispatch('gm', { type: 'encounter.launch', encounterId: enc.id }).ok).toBe(true);
    expect(Object.values(b.state.tokens).some((t) => t.name === 'Ghoul')).toBe(true);
  });

  it('refuses what is not an adventure', () => {
    const b = table('b');
    expect(b.dispatch('gm', { type: 'adventure.import', pkg: { format: 'thevtt-map' } as never }).ok).toBe(false);
  });
});

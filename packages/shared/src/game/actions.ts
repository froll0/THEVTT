import type { AreaTemplate, ChatCard, GameState, Note, Prop, Scene, Token, Wall } from './state';

export type TokenPatch = Partial<Omit<Token, 'id' | 'sceneId'>>;
export type ScenePatch = Partial<Omit<Scene, 'id' | 'fog'>>;

export type GameAction =
  | { type: 'scene.create'; name: string }
  | { type: 'scene.update'; sceneId: string; patch: ScenePatch }
  | { type: 'scene.activate'; sceneId: string }
  | { type: 'scene.delete'; sceneId: string }
  | { type: 'token.create'; token: Partial<Omit<Token, 'id'>> & { name: string } }
  | { type: 'token.move'; tokenId: string; x: number; y: number }
  | { type: 'token.update'; tokenId: string; patch: TokenPatch }
  | { type: 'token.delete'; tokenId: string }
  | { type: 'chat'; text: string; private?: boolean }
  /** blind: only the GM sees the result */
  | { type: 'roll'; formula: string; label?: string; private?: boolean; blind?: boolean }
  | { type: 'card'; card: ChatCard; private?: boolean }
  | { type: 'initiative.add'; name: string; tokenId?: string | null; modifier?: number; value?: number }
  | { type: 'initiative.set'; entryId: string; value: number }
  | { type: 'initiative.remove'; entryId: string }
  | { type: 'initiative.next' }
  | { type: 'initiative.prev' }
  | { type: 'initiative.clear' }
  | { type: 'character.update'; characterId: string; name?: string; data: unknown }
  | { type: 'ping'; x: number; y: number }
  | { type: 'fog.enable'; sceneId: string; enabled: boolean }
  | { type: 'fog.paint'; sceneId: string; x: number; y: number; w: number; h: number; reveal: boolean }
  | { type: 'fog.fill'; sceneId: string; reveal: boolean }
  | { type: 'template.create'; template: Omit<AreaTemplate, 'id' | 'authorId' | 'sceneId'> }
  | { type: 'template.delete'; templateId: string }
  | { type: 'template.clear' }
  | { type: 'notes.update'; text: string }
  | { type: 'note.create'; note?: Partial<Pick<Note, 'title' | 'body' | 'shared'>> }
  | { type: 'note.update'; noteId: string; patch: Partial<Pick<Note, 'title' | 'body' | 'shared' | 'image'>> }
  | { type: 'note.delete'; noteId: string }
  | { type: 'wall.create'; walls: (Pick<Wall, 'x1' | 'y1' | 'x2' | 'y2' | 'kind'> & Partial<Pick<Wall, 'open' | 'locked'>>)[] }
  | { type: 'wall.update'; wallId: string; patch: Partial<Pick<Wall, 'kind' | 'open' | 'locked'>> }
  | { type: 'wall.delete'; wallId: string }
  | { type: 'wall.clear' }
  | { type: 'prop.create'; prop: Partial<Omit<Prop, 'id' | 'sceneId'>> & { kind: string } }
  | { type: 'prop.update'; propId: string; patch: Partial<Omit<Prop, 'id' | 'sceneId'>> }
  | { type: 'prop.delete'; propId: string }
  | { type: 'drawing.create'; points: number[]; color: string; width: number; text?: string }
  | { type: 'drawing.delete'; drawingId: string }
  | { type: 'drawing.clear' }
  | { type: 'music.play'; trackId?: string; position?: number }
  | { type: 'music.pause' }
  | { type: 'music.seek'; position: number }
  | { type: 'music.loop'; loop: boolean }
  | { type: 'music.remove'; trackId: string }
  | { type: 'music.rename'; trackId: string; name: string }
  /**
   * register an image (or, for music, an audio file) and get back its id through the state.
   * Players may only attach images to their own notes.
   */
  | { type: 'asset.add'; dataUrl: string; attachTo?: { sceneId: string } | { tokenId: string } | { noteId: string } | { track: string } | { propId: string } };

/** Messages flowing inside relay payloads. */
export type PlayerToHost = { k: 'hello' } | { k: 'action'; action: GameAction; seq?: number };

export type HostToPlayer =
  /** rev grows with every state sent: receivers drop stale snapshots */
  | { k: 'state'; state: GameState; rev: number; now?: number }
  | { k: 'asset'; id: string; dataUrl: string }
  | { k: 'rejected'; seq?: number; reason: string }
  | { k: 'ping'; x: number; y: number; sceneId: string; color: string; from: string };

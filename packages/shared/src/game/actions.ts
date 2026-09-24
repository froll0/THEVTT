import type { GameState, Scene, Token } from './state';

export type TokenPatch = Partial<Omit<Token, 'id' | 'sceneId'>>;
export type ScenePatch = Partial<Omit<Scene, 'id'>>;

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
  | { type: 'roll'; formula: string; label?: string; private?: boolean }
  | { type: 'initiative.add'; name: string; tokenId?: string | null; modifier?: number; value?: number }
  | { type: 'initiative.set'; entryId: string; value: number }
  | { type: 'initiative.remove'; entryId: string }
  | { type: 'initiative.next' }
  | { type: 'initiative.prev' }
  | { type: 'initiative.clear' }
  | { type: 'character.update'; characterId: string; name?: string; data: unknown }
  | { type: 'ping'; x: number; y: number }
  | { type: 'notes.update'; text: string }
  /** host only: register an image and get back its id through the state */
  | { type: 'asset.add'; dataUrl: string; attachTo?: { sceneId: string } | { tokenId: string } };

/** Messages flowing inside relay payloads. */
export type PlayerToHost = { k: 'hello' } | { k: 'action'; action: GameAction; seq?: number };

export type HostToPlayer =
  /** rev grows with every state sent: receivers drop stale snapshots */
  | { k: 'state'; state: GameState; rev: number }
  | { k: 'asset'; id: string; dataUrl: string }
  | { k: 'rejected'; seq?: number; reason: string }
  | { k: 'ping'; x: number; y: number; sceneId: string; color: string; from: string };

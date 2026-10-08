import type { Macro } from '../macros';
import type { MapPackage } from './library';
import type { Zone } from './pool';
import type { AreaTemplate, ChatCard, GameState, Note, Prop, Quest, Scene, Token, Wall } from './state';

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type TokenPatch = Partial<Omit<Token, 'id' | 'sceneId'>>;
export type ScenePatch = Partial<Omit<Scene, 'id' | 'fog' | 'terrain' | 'seed'>>;

/**
 * `sceneId` on wall, prop and drawing actions: the GM working on a scene the
 * players are not on (the map editor). Without it, the scene being played.
 */
export type GameAction =
  /** id: optional, chosen by the GM's app to fill the new scene in the same batch */
  | { type: 'scene.create'; name: string; id?: string }
  | { type: 'scene.update'; sceneId: string; patch: ScenePatch }
  /** the painted map of a scene (null: none); its walls follow */
  | { type: 'terrain.set'; sceneId: string; terrain: string | null }
  /** a map from the library becomes a new scene (id: chosen by the GM's app, to open it right away) */
  | { type: 'scene.import'; pkg: MapPackage; id?: string; name?: string }
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
  /** an attack against each target: d20+bonus against its AC; on a hit the damage is applied (doubled dice on a 20) */
  | { type: 'attack'; attackerId?: string | null; targetIds: string[]; name: string; bonus: number; damage: string; damageType?: string; mode?: 'normal' | 'adv' | 'dis' }
  /**
   * Success-pool attack (Warhammer: the Old World): attacker's pool against each
   * target's Protezione, ties to the attacker; damage = weapon + successes over
   * the defender (all of them when unopposed) against Resilienza.
   */
  | {
      type: 'pool.attack';
      attackerId?: string | null;
      targetIds: string[];
      name: string;
      dice: number;
      target: number;
      /** null: the hit inflicts `condition` (Barcollante by default) instead of damage */
      damage: number | null;
      ranged?: boolean;
      ignoresArmour?: boolean;
      /** extra damage against armoured targets */
      vsArmoured?: number;
      glorious?: boolean;
      grim?: boolean;
      /** the defender doesn't get to oppose (surprise, Indifeso…) */
      unopposed?: boolean;
      condition?: string;
      /** extra dice on the wounds table */
      woundDice?: number;
    }
  /** GM (or the token's owner): roll on the wounds table for a token, as if it had taken a wound */
  | { type: 'pool.wound'; tokenId: string; extraDice?: number }
  /** GM: zones on a scene */
  | { type: 'zone.create'; sceneId?: string; zone: Partial<Omit<Zone, 'id' | 'sceneId'>> }
  | { type: 'zone.update'; zoneId: string; patch: Partial<Omit<Zone, 'id' | 'sceneId'>> }
  | { type: 'zone.delete'; zoneId: string }
  /** damage (or healing) rolled once and applied to these tokens */
  | { type: 'hp.roll'; formula: string; tokenIds: string[]; heal?: boolean; label?: string; damageType?: string }
  /**
   * Everyone in an area (or picked) rolls a saving throw; the damage is
   * rolled once, and those who succeed take half (or none).
   */
  | { type: 'save.group'; casterId?: string | null; tokenIds: string[]; ability: Ability; dc: number; label: string; damage?: string; damageType?: string; half?: boolean }
  /** GM: the group rests (the clock moves on; on a short rest each player spends hit dice) */
  | { type: 'rest'; kind: 'short' | 'long' }
  /** side: systems where a whole side acts together (players first, then the enemies) */
  | { type: 'initiative.add'; name: string; tokenId?: string | null; modifier?: number; value?: number; side?: 'players' | 'enemies' }
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
  | { type: 'wall.create'; sceneId?: string; walls: (Pick<Wall, 'x1' | 'y1' | 'x2' | 'y2' | 'kind'> & Partial<Pick<Wall, 'open' | 'locked'>>)[] }
  | { type: 'wall.update'; wallId: string; patch: Partial<Pick<Wall, 'kind' | 'open' | 'locked'>> }
  | { type: 'wall.delete'; wallId: string }
  | { type: 'wall.clear'; sceneId?: string }
  | { type: 'prop.create'; sceneId?: string; prop: Partial<Omit<Prop, 'id' | 'sceneId'>> & { kind: string } }
  | { type: 'prop.update'; propId: string; patch: Partial<Omit<Prop, 'id' | 'sceneId'>> }
  | { type: 'prop.delete'; propId: string }
  | { type: 'drawing.create'; sceneId?: string; points: number[]; color: string; width: number; text?: string }
  | { type: 'drawing.delete'; drawingId: string }
  | { type: 'drawing.clear' }
  | { type: 'music.play'; trackId?: string; position?: number }
  | { type: 'music.pause' }
  | { type: 'game.pause'; paused: boolean }
  /** GM: the macros shared with everyone at the table */
  | { type: 'macros.set'; macros: Macro[] }
  /** GM: the world's clock moves on (or is set) */
  | { type: 'time.advance'; minutes: number }
  | { type: 'time.set'; minutes: number }
  /** GM: a quest, new or changed */
  | { type: 'quest.save'; quest: Partial<Omit<Quest, 'updatedAt'>> & { title: string } }
  | { type: 'quest.delete'; questId: string }
  /** GM: take back (or redo) their last change to the map */
  | { type: 'game.undo' }
  | { type: 'game.redo' }
  /** several actions as one (a group moved or deleted together): one step to undo */
  | { type: 'batch'; actions: GameAction[] }
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

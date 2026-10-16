import type { Macro } from '../macros';
import type { Calendar } from './calendar';
import type { MapPackage } from './library';
import type { AdventurePackage } from './adventure';
import type { PartyLoot, RollTable, Shop } from './tables';
import type { RelationLink, RelationNode } from './relations';
import type { ExtendedTest, Maneuver, PoolCheck, Zone } from './pool';
import type { AreaTemplate, ChatCard, DiceSkin, Encounter, GameState, Note, Prop, Quest, Scene, Token, Travel, Wall } from './state';

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
  /** GM: a whole adventure joins the campaign: its scenes, encounters, notes, quests, music and macros */
  | { type: 'adventure.import'; pkg: AdventurePackage }
  | { type: 'scene.activate'; sceneId: string }
  | { type: 'scene.delete'; sceneId: string }
  | { type: 'token.create'; token: Partial<Omit<Token, 'id'>> & { name: string } }
  | { type: 'token.move'; tokenId: string; x: number; y: number }
  | { type: 'token.update'; tokenId: string; patch: TokenPatch }
  | { type: 'token.delete'; tokenId: string }
  /**
   * as: a token whose voice it is (the GM: any NPC; players: their own);
   * to: a whisper, only these people (and the GM) read it
   */
  | { type: 'chat'; text: string; private?: boolean; as?: string; to?: string[] }
  /** blind: only the GM sees the result */
  /**
   * Nimble: an attack rolled with the Primary Die (`2d6n+3`). Monsters take it
   * after their armour; heroes get to Defend first. `area`: one roll for all.
   */
  | { type: 'nimble.attack'; attackerId?: string | null; targetIds: string[]; name: string; formula: string; damageType?: string; area?: boolean; ignoreArmor?: boolean }
  /** Nimble: a hero takes the damage waiting in the chat, or Defends (−Armour, 1 action) */
  | { type: 'nimble.take'; entryId: string; defend: boolean }
  /** one's own 3D dice: colours and finish (null: back to the player colour) */
  | { type: 'dice.skin'; skin: DiceSkin | null }
  | { type: 'roll'; formula: string; label?: string; private?: boolean; blind?: boolean }
  | { type: 'card'; card: ChatCard; private?: boolean }
  /** an attack against each target: d20+bonus against its AC; on a hit the damage is applied (doubled dice on a 20) */
  | { type: 'attack'; attackerId?: string | null; targetIds: string[]; name: string; bonus: number; damage: string; damageType?: string; mode?: 'normal' | 'adv' | 'dis'; /** false: no automatic cover */ cover?: boolean }
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
      /** melee attack as part of a Charge (+1d) */
      charge?: boolean;
      /** the weapon's optimal range ("Media – Estrema"): -1d beyond it */
      optimal?: string;
      /** leave out the modifiers the table works out (charge, numbers, high ground, range, cover, Prono) */
      noAuto?: boolean;
    }
  /** GM (or the token's owner): roll on the wounds table for a token, as if it had taken a wound */
  | { type: 'pool.wound'; tokenId: string; extraDice?: number }
  /**
   * A spell that lands without an opposed roll: damage (base + Potenza, unless
   * flat) against Resilienza and a condition, on the targets, those beside the
   * first one (near) or everyone in its zone.
   */
  | {
      type: 'pool.spell';
      casterId?: string | null;
      targetIds: string[];
      name: string;
      potency?: number;
      damage?: number | null;
      flat?: boolean;
      ignoresArmour?: boolean;
      armouredMod?: number;
      unarmouredMod?: number;
      condition?: string;
      /** the condition spares the Mostruosità */
      conditionNonMonster?: boolean;
      area?: 'near' | 'zone';
      enemiesOnly?: boolean;
      maxTargets?: number;
      note?: string;
    }
  /** the Manovrare action of a token for this turn (null: none) */
  | { type: 'pool.maneuver'; tokenId: string; maneuver: Maneuver | null }
  /** GM: prepared encounters. capture: the given tokens (and the scene they're on) become the encounter's creatures */
  | { type: 'encounter.save'; encounter: Partial<Omit<Encounter, 'tokens'>> & { name: string }; captureTokenIds?: string[]; removeCaptured?: boolean }
  | { type: 'encounter.delete'; encounterId: string }
  /** GM: the encounter starts: its scene, its creatures on the map, its music, its note shared */
  | { type: 'encounter.launch'; encounterId: string }
  /** a Mostruosità's choice after a blow: take the wound, or its Reaction */
  | { type: 'pool.react'; tokenId: string; choice: 'wound' | 'reaction' }
  /**
   * A test for each token, rolled by the table from its profile: against a
   * hazard (grade: successes to avoid it; failing costs a wound with the
   * difference in dice, and the condition), or just a test.
   */
  | { type: 'pool.check'; tokenIds: string[]; check: PoolCheck; label: string; grade?: number; condition?: string; noWound?: boolean; bonus?: number }
  /** GM: the players flee; those who fail Atletica roll on Si Salvi Chi Può! */
  | { type: 'pool.retreat'; tokenIds: string[]; rearguard?: string }
  /** GM: the day is over: infections for the wounded, Volontà for those exposed to Chaos */
  | { type: 'pool.dayEnd' }
  /** extended tests shared at the table: anyone adds one or rolls for it, the GM edits or removes */
  | { type: 'extended.save'; test: Partial<ExtendedTest> & { name: string } }
  | { type: 'extended.roll'; testId: string; formula: string; label?: string }
  | { type: 'extended.delete'; testId: string }
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
  | { type: 'note.update'; noteId: string; patch: Partial<Pick<Note, 'title' | 'body' | 'shared' | 'image' | 'reveal'>> }
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
  /** GM: a journey starts, changes or ends (null) */
  | { type: 'travel.set'; travel: Pick<Travel, 'from' | 'to' | 'mode' | 'days'> | null }
  /**
   * GM: a day on the road. The clock moves on a day; with a Hazard every token
   * given tests Sopravvivenza against it.
   */
  | { type: 'travel.day'; tokenIds: string[]; hazard?: { label: string; grade: number; condition?: string; noWound?: boolean } }
  /** GM: the world's clock moves on (or is set) */
  | { type: 'time.advance'; minutes: number }
  | { type: 'time.set'; minutes: number }
  /** GM: the campaign's calendar (null: none, just day numbers) */
  | { type: 'calendar.set'; calendar: Calendar | null }
  /** GM: a quest, new or changed */
  | { type: 'quest.save'; quest: Partial<Omit<Quest, 'updatedAt'>> & { title: string } }
  | { type: 'quest.delete'; questId: string }
  /** GM: a random table, new or changed */
  | { type: 'table.save'; table: Partial<RollTable> & { name: string } }
  | { type: 'table.delete'; tableId: string }
  /** a roll on a table (players: only the shared ones); private: only the roller and the GM see it */
  | { type: 'table.roll'; tableId: string; private?: boolean }
  /** GM: the party's loot as it is now */
  | { type: 'loot.set'; loot: PartyLoot; note?: string }
  /** someone takes an item of the loot (their app puts it on their sheet) */
  | { type: 'loot.take'; itemId: string; qty?: number }
  /** GM: a shop, new or changed */
  | { type: 'shop.save'; shop: Partial<Shop> & { name: string } }
  | { type: 'shop.delete'; shopId: string }
  /** a purchase (the buyer's app pays on their sheet and adds the item) */
  | { type: 'shop.buy'; shopId: string; itemId: string; qty?: number }
  /** GM: who's who — a person, faction or place; a tie between two of them */
  | { type: 'relation.node'; node: Partial<RelationNode> & { name: string } }
  | { type: 'relation.link'; link: Partial<RelationLink> & { from: string; to: string } }
  | { type: 'relation.delete'; id: string }
  /** GM: take back (or redo) their last change to the map */
  | { type: 'game.undo' }
  | { type: 'game.redo' }
  /** several actions as one (a group moved or deleted together): one step to undo */
  | { type: 'batch'; actions: GameAction[] }
  | { type: 'music.seek'; position: number }
  | { type: 'music.loop'; loop: boolean }
  | { type: 'music.remove'; trackId: string }
  | { type: 'music.rename'; trackId: string; name: string }
  /** GM: a sound effect heard by everyone at once (built-in id or one of the table's sounds) */
  | { type: 'sfx.play'; sound: string }
  | { type: 'sfx.remove'; soundId: string }
  /**
   * register an image (or, for music, an audio file) and get back its id through the state.
   * Players may only attach images to their own notes.
   */
  | { type: 'asset.add'; dataUrl: string; attachTo?: { sceneId: string } | { tokenId: string } | { noteId: string } | { track: string } | { sound: string } | { propId: string } | { noteShown: string } };

/** Messages flowing inside relay payloads. */
export type PlayerToHost = { k: 'hello' } | { k: 'action'; action: GameAction; seq?: number };

export type HostToPlayer =
  /** rev grows with every state sent: receivers drop stale snapshots */
  | { k: 'state'; state: GameState; rev: number; now?: number }
  | { k: 'asset'; id: string; dataUrl: string }
  | { k: 'rejected'; seq?: number; reason: string }
  | { k: 'ping'; x: number; y: number; sceneId: string; color: string; from: string }
  /** a sound effect: built-in id, or the audio asset of one of the table's sounds */
  | { k: 'sfx'; sound: string; asset?: string };

import type { Drawing, GameState, Prop, Scene, Token, Wall } from './state';

/**
 * A map on its own, out of any campaign: the scene with its painted ground,
 * the walls and doors placed by hand, the scenery, the labels and (if wanted)
 * the creatures waiting there, with every picture they need. The GM keeps a
 * library of them and uses them in any campaign, or passes them to another GM
 * as a file.
 */
export interface MapPackage {
  format: 'thevtt-map';
  version: 1;
  name: string;
  scene: Omit<Scene, 'id' | 'fog'>;
  /** walls of the painted map are left out: they come back with it */
  walls: Omit<Wall, 'id' | 'sceneId'>[];
  props: Omit<Prop, 'id' | 'sceneId'>[];
  drawings: Omit<Drawing, 'id' | 'sceneId' | 'authorId'>[];
  /** creatures and NPCs only: never the players' characters */
  tokens: Omit<Token, 'id' | 'sceneId'>[];
  /** pictures by the key the rest of the package uses */
  assets: Record<string, string>;
}

export const MAP_FILE_EXT = 'thevtt-map';

/** A scene of a game, packed to be kept or shared. */
export function packScene(state: GameState, sceneId: string, assets: Record<string, string>, opts: { tokens?: boolean } = {}): MapPackage {
  const scene = state.scenes[sceneId];
  if (!scene) throw new Error('Scena inesistente');
  const used: Record<string, string> = {};
  const keep = (id: string | null | undefined): string | null => {
    if (!id || !assets[id]) return null;
    used[id] = assets[id]!;
    return id;
  };
  const { id: _id, fog: _fog, ...rest } = scene;
  return {
    format: 'thevtt-map',
    version: 1,
    name: scene.name,
    scene: { ...rest, background: keep(scene.background), seed: scene.seed ?? scene.id },
    walls: Object.values(state.walls ?? {})
      .filter((w) => w.sceneId === sceneId && !w.auto)
      .map(({ id: _w, sceneId: _s, ...w }) => w),
    props: Object.values(state.props ?? {})
      .filter((p) => p.sceneId === sceneId)
      .map(({ id: _p, sceneId: _s, ...p }) => ({ ...p, image: keep(p.image) })),
    drawings: Object.values(state.drawings ?? {})
      .filter((d) => d.sceneId === sceneId && d.authorId === state.gmId)
      .map(({ id: _d, sceneId: _s, authorId: _a, ...d }) => d),
    tokens: opts.tokens
      ? Object.values(state.tokens)
          .filter((t) => t.sceneId === sceneId && !t.characterId && t.ownerIds.length === 0)
          .map(({ id: _t, sceneId: _s, ...t }) => ({ ...t, image: keep(t.image) }))
      : [],
    assets: used,
  };
}

/** Is this (from a file, say) a map package we can read? */
export function isMapPackage(v: unknown): v is MapPackage {
  const p = v as Partial<MapPackage> | null;
  return (
    !!p &&
    typeof p === 'object' &&
    p.format === 'thevtt-map' &&
    p.version === 1 &&
    typeof p.name === 'string' &&
    !!p.scene &&
    typeof p.scene === 'object' &&
    Array.isArray(p.walls) &&
    Array.isArray(p.props) &&
    Array.isArray(p.drawings) &&
    Array.isArray(p.tokens) &&
    !!p.assets &&
    typeof p.assets === 'object'
  );
}

/** What a package holds, to show it in the library. */
export function describePackage(p: MapPackage) {
  return {
    width: p.scene.widthCells,
    height: p.scene.heightCells,
    walls: p.walls.length,
    doors: p.walls.filter((w) => w.kind === 'door').length,
    props: p.props.length,
    tokens: p.tokens.length,
    painted: !!p.scene.terrain,
    picture: !!p.scene.background,
  };
}

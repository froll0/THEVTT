import type { GameSystem } from './types';
import { dnd5e2024 } from './dnd5e-2024';
import { wtow } from './wtow';

export * from './types';
export * as dnd5e from './dnd5e-2024';
export * as warhammer from './wtow';

const registry = new Map<string, GameSystem<any>>();

export function registerSystem(system: GameSystem<any>): void {
  registry.set(system.id, system);
}

export function getSystem(id: string): GameSystem<any> | undefined {
  return registry.get(id);
}

export function listSystems(): GameSystem<any>[] {
  return [...registry.values()];
}

registerSystem(dnd5e2024);
registerSystem(wtow);

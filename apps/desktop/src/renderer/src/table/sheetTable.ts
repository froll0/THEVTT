import type { SheetTable } from '../systems';
import { useApp } from '../store/app';
import { useTable } from '../store/table';
import { useWindows } from '../store/windows';
import { metresToCells } from './props';

const AREA_NAMES = { circle: 'sfera', cone: 'cono', line: 'linea', square: 'cubo' } as const;

/**
 * What a character's sheet can do at the table: attack the token selected on
 * the map, place a spell's area, start concentrating.
 */
export function useSheetTable(characterId: string): SheetTable | undefined {
  const table = useTable();
  const me = useApp((s) => s.user?.id ?? '');
  const toast = useApp((s) => s.toast);
  const state = table.state;
  if (!state) return undefined;
  const isGm = state.gmId === me;
  const own = () => Object.values(state.tokens).find((t) => t.characterId === characterId && t.sceneId === state.activeSceneId);
  return {
    attack: (a) => {
      const attacker = own();
      const ids = table.group.tokens.length ? table.group.tokens : table.selectedTokenId ? [table.selectedTokenId] : [];
      const targets = ids.map((id) => state.tokens[id]).filter((t) => !!t && t.id !== attacker?.id && (isGm || !t.ownerIds.includes(me)));
      if (!targets.length) return false;
      table.dispatch({ type: 'attack', attackerId: attacker?.id ?? null, targetIds: targets.map((t) => t!.id), ...a });
      return true;
    },
    area: (a) => {
      const scene = state.scenes[state.activeSceneId];
      if (!scene) return;
      table.setPendingArea({ shape: a.shape, size: metresToCells(scene, a.metres), label: a.label, originTokenId: own()?.id ?? null });
      // the sheet steps aside, so the map is free to aim at
      useWindows.getState().update(`sheet:${characterId}`, { minimized: true });
      toast(`${a.label}: ${AREA_NAMES[a.shape]} di ${String(a.metres).replace('.', ',')} m. Clicca sulla mappa per posarla, Esc per annullare.`);
    },
    concentrate: () => {
      const t = own();
      if (!t || t.conditions.includes('Concentrazione')) return;
      // a new concentration spell ends the old one: the condition stays, without a time limit
      const rounds = { ...(t.conditionRounds ?? {}) };
      delete rounds.Concentrazione;
      table.dispatch({ type: 'token.update', tokenId: t.id, patch: { conditions: [...t.conditions, 'Concentrazione'], conditionRounds: rounds } });
    },
  };
}

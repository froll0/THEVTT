import type { RollResult, Token } from '@thevtt/shared';
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
  // the tokens marked as targets (Ctrl+click), otherwise those selected; never oneself, nor (for a player) their own
  const targetsFor = (selfId: string | undefined) => {
    const ids = table.targets.length ? table.targets : table.group.tokens.length ? table.group.tokens : table.selectedTokenId ? [table.selectedTokenId] : [];
    return ids.map((id) => state.tokens[id]).filter((t): t is Token => !!t && t.id !== selfId && (isGm || !t.ownerIds.includes(me)));
  };
  return {
    attack: (a) => {
      const attacker = own();
      // the tokens marked as targets (Ctrl+click), otherwise those selected
      const targets = targetsFor(attacker?.id);
      if (!targets.length) return false;
      table.dispatch({ type: 'attack', attackerId: attacker?.id ?? null, targetIds: targets.map((t) => t!.id), ...a });
      return true;
    },
    area: (a) => {
      const scene = state.scenes[state.activeSceneId];
      if (!scene) return;
      table.setPendingArea({ shape: a.shape, size: metresToCells(scene, a.metres), label: a.label, originTokenId: own()?.id ?? null, save: a.save });
      // the sheet steps aside, so the map is free to aim at
      useWindows.getState().update(`sheet:${characterId}`, { minimized: true });
      toast(`${a.label}: ${AREA_NAMES[a.shape]} di ${String(a.metres).replace('.', ',')} m. Clicca sulla mappa per posarla, Esc per annullare.`);
    },
    save: (a) => {
      const caster = own();
      const targets = targetsFor(caster?.id);
      if (!targets.length) return false;
      table.dispatch({ type: 'save.group', casterId: caster?.id ?? null, tokenIds: targets.map((t) => t.id), ...a });
      return true;
    },
    concentrate: () => {
      const t = own();
      if (!t || t.conditions.includes('Concentrazione')) return;
      // a new concentration spell ends the old one: the condition stays, without a time limit
      const rounds = { ...(t.conditionRounds ?? {}) };
      delete rounds.Concentrazione;
      table.dispatch({ type: 'token.update', tokenId: t.id, patch: { conditions: [...t.conditions, 'Concentrazione'], conditionRounds: rounds } });
    },
    poolAttack: (a) => {
      const attacker = own();
      const targets = targetsFor(attacker?.id);
      if (!targets.length) return false;
      table.dispatch({ type: 'pool.attack', attackerId: attacker?.id ?? null, targetIds: targets.map((t) => t.id), ...a });
      return true;
    },
    rollFor: (formula, label) => {
      const full = `${state.characters[characterId]?.name ?? ''} · ${label}`.slice(0, 120);
      const since = Date.now() - 2000;
      const seen = new Set((useTable.getState().state?.log ?? []).map((e) => e.id));
      return new Promise<RollResult | null>((resolve) => {
        let done = false;
        const finish = (r: RollResult | null) => {
          if (done) return;
          done = true;
          stop();
          clearTimeout(timer);
          resolve(r);
        };
        const stop = useTable.subscribe((s) => {
          const hit = s.state?.log.find((e) => !seen.has(e.id) && e.kind === 'roll' && e.authorId === me && e.label === full && e.ts >= since && e.roll);
          if (hit) finish(hit.roll!);
        });
        const timer = setTimeout(() => finish(null), 8000);
        table.dispatch({ type: 'roll', formula, label: full });
      });
    },
    token: (() => {
      const t = own();
      if (!t) return null;
      return {
        conditions: t.conditions,
        setConditions: (conditions: string[]) => table.dispatch({ type: 'token.update', tokenId: t.id, patch: { conditions } }),
        woundRoll: () => table.dispatch({ type: 'pool.wound', tokenId: t.id }),
      };
    })(),
  };
}

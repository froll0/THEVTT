import { createInitialState, expandMacro } from '@thevtt/shared';
import { warhammer } from '@thevtt/systems';
import { describe, expect, it } from 'vitest';
import { macroVars } from '../src/renderer/src/lib/runMacro';

describe('macro variables', () => {
  it('a Warhammer character gives each skill as its pool', () => {
    const state = createInitialState({ campaignId: 'c', campaignName: 'T', systemId: 'wtow', gmId: 'gm', sceneId: 's' });
    const data = { ...warhammer.createCharacter(), name: 'Gunter', lineage: 'imperiale', careerSkills: ['mischia'] };
    state.characters.ch = { id: 'ch', ownerId: 'p1', name: 'Gunter', systemId: 'wtow', data };
    state.players.p1 = { id: 'p1', displayName: 'Giulia', color: '#fff', online: true, characterId: 'ch' };
    const vars = macroVars(state, 'p1', []);
    const c = warhammer.normalize(data);
    const p = warhammer.pool(c, 'mischia');
    expect(vars.mischia).toBe(`${p.dice}d10s${p.target}`);
    expect(expandMacro('/r @volontà Volontà', {}, vars)).toMatch(/^\/r \d+d10s\d+ Volontà$/);
  });
});

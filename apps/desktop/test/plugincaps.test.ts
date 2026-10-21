import { describe, expect, it } from 'vitest';
import { CATALOG, newerVersion } from '../src/renderer/src/lib/pluginCatalog';
import { parsePlugin, pluginCapabilities } from '../src/renderer/src/lib/pluginMeta';

describe('what an extension can do', () => {
  it('reads it from the code, not from comments', () => {
    const code = `// thevtt.dispatch() e fetch() qui sono solo nominati
thevtt.on('log', (e) => thevtt.chat('ciao'));
thevtt.command('x', 'y', () => thevtt.roll('1d20'));
/* fetch('https://example.com') */`;
    expect(pluginCapabilities(code)).toEqual(['reacts', 'chat', 'roll', 'commands']);
    expect(pluginCapabilities("fetch('https://a.b'); thevtt.dispatch({ type: 'initiative.next' }); setTimeout(() => {}, 5)")).toEqual(['actions', 'timers', 'network']);
    expect(pluginCapabilities("const s = new WebSocket('wss://x')")).toEqual(['network']);
  });

  it('the catalog: named, versioned, and none of them goes online', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(8);
    for (const e of CATALOG) {
      expect(parsePlugin(e.code).name).toBe(e.name);
      expect(e.description).not.toBe('');
      expect(pluginCapabilities(e.code)).not.toContain('network');
      // every catalog entry is valid JavaScript
      expect(() => new Function('thevtt', e.code)).not.toThrow();
    }
    expect(new Set(CATALOG.map((e) => e.name)).size).toBe(CATALOG.length);
  });

  it('compares versions by their numbers', () => {
    expect(newerVersion('1.10', '1.9')).toBe(true);
    expect(newerVersion('1.0', '1.0')).toBe(false);
    expect(newerVersion('2', '1.9.9')).toBe(true);
    expect(newerVersion('1.0', '1.0.1')).toBe(false);
  });
});

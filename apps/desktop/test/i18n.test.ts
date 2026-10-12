import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeTranslator, parseDictionary } from '../src/renderer/src/i18n';

const EN = readFileSync(join(__dirname, '../src/renderer/src/i18n/en.txt'), 'utf8');

describe('English interface', () => {
  it('has a well-formed dictionary: one translation per line, same placeholders on both sides', () => {
    for (const line of EN.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const parts = line.split(' ⇒ ');
      expect(parts, line).toHaveLength(2);
      const ph = (s: string) => (s.match(/\{\d\}/g) ?? []).sort().join();
      expect(ph(parts[1]!), line).toBe(ph(parts[0]!));
    }
    const { exact, patterns } = parseDictionary(EN);
    expect(exact.size).toBeGreaterThan(1500);
    expect(patterns.length).toBeGreaterThan(100);
  });

  it('translates whole strings, patterns and their UI parts, and leaves the rest alone', () => {
    const tr = makeTranslator(EN);
    expect(tr('Impostazioni')).toBe('Settings');
    expect(tr('  Nuova   campagna ')).toBe('New campaign');
    expect(tr('Invito inviato a Ada')).toBe('Invite sent to Ada');
    expect(tr('Modifica Nuova scena')).toBe('Edit New scene');
    expect(tr('Sir Gawain')).toBeNull();
    expect(tr('')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { parsePlugin } from '../src/renderer/src/lib/pluginMeta';

describe('extensions', () => {
  it('reads name, description and version from the header', () => {
    const p = parsePlugin('// @name Meteo casuale\n// @description Tira il tempo ogni mattina\n// @version 2.1\nthevtt.on("state", () => {});');
    expect(p).toMatchObject({ name: 'Meteo casuale', description: 'Tira il tempo ogni mattina', version: '2.1' });
    expect(parsePlugin('thevtt.chat("ciao")', 'saluti').name).toBe('saluti');
  });
});

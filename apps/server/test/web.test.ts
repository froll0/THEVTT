import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';

describe('web client', () => {
  it('serves the built client at /play/ without a login, and nothing outside it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'thevtt-web-'));
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>TheVTT</title>');
    writeFileSync(join(root, 'assets', 'app.js'), 'console.log(1)');
    const { app } = await buildApp({ dbPath: ':memory:', webRoot: root });
    try {
      expect((await app.inject('/')).headers.location).toBe('/play/');
      const index = await app.inject('/play/');
      expect(index.statusCode).toBe(200);
      expect(index.headers['content-type']).toContain('text/html');
      expect(index.body).toContain('TheVTT');
      const js = await app.inject('/play/assets/app.js');
      expect(js.headers['content-type']).toContain('javascript');
      expect(js.headers['cache-control']).toContain('immutable');
      expect((await app.inject('/play/..%2F..%2Fetc%2Fpasswd')).statusCode).toBe(404);
      expect((await app.inject('/play/missing.js')).statusCode).toBe(404);
      // the API still needs a login
      expect((await app.inject('/campaigns')).statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});

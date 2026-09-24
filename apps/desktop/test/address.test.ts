import { describe, expect, it } from 'vitest';
import { displayServerAddress, normalizeServerAddress } from '../src/renderer/src/lib/address';

describe('invite addresses', () => {
  it('fills in scheme and default port', () => {
    expect(normalizeServerAddress('203.0.113.7')).toBe('http://203.0.113.7:4477');
    expect(normalizeServerAddress(' 203.0.113.7:5000 ')).toBe('http://203.0.113.7:5000');
    expect(normalizeServerAddress('192.168.1.10:4477')).toBe('http://192.168.1.10:4477');
  });

  it('keeps https hosts as they are', () => {
    expect(normalizeServerAddress('https://vtt.example.com/')).toBe('https://vtt.example.com');
  });

  it('rejects garbage', () => {
    expect(normalizeServerAddress('')).toBeNull();
    expect(normalizeServerAddress('http://')).toBeNull();
  });

  it('shows the short form', () => {
    expect(displayServerAddress('http://203.0.113.7:4477')).toBe('203.0.113.7:4477');
  });
});

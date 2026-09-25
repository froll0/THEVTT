import { _electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '../apps/desktop');
const electronPath = createRequire(join(desktopDir, 'package.json'))('electron') as unknown as string;

export interface RunningApp {
  app: ElectronApplication;
  page: Page;
  errors: string[];
}

/**
 * Launches the built desktop app with its own profile. With `hostPort`, the
 * profile is pre-configured to host the lobby server on that port.
 */
export async function launchApp(opts: { hostPort?: number } = {}): Promise<RunningApp> {
  const profile = mkdtempSync(join(tmpdir(), 'thevtt-e2e-'));
  // tests never reach out to the router, Cloudflare or the code relay
  mkdirSync(join(profile, 'data'), { recursive: true });
  writeFileSync(join(profile, 'data', 'server-config.json'), JSON.stringify({ enabled: !!opts.hostPort, port: opts.hostPort ?? 4477, upnp: false, tunnel: false }));
  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['--no-sandbox', desktopDir],
    env: { ...process.env, THEVTT_USER_DATA: profile, VITE_DEV_SERVER_URL: '' },
  });
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|WebSocket connection/.test(m.text())) errors.push(m.text());
  });
  return { app, page, errors };
}

export async function register(page: Page, opts: { where: 'host' | { join: string }; username: string; displayName: string }) {
  await expect(page.getByText('Dove giocate?')).toBeVisible();
  if (opts.where === 'host') {
    await page.getByRole('button', { name: /Ospito io/ }).click();
    await expect(page.getByText('Server attivo')).toBeVisible();
  } else {
    await page.getByRole('button', { name: /Mi unisco/ }).click();
    await page.getByLabel('Codice o indirizzo del gruppo').fill(opts.where.join);
  }
  await page.getByLabel('Nome utente').fill(opts.username);
  await page.getByLabel('Nome visualizzato (facoltativo)').fill(opts.displayName);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page.getByText(`, ${opts.displayName}`)).toBeVisible();
}

/** Calls the lobby REST API with the session token of a logged-in page. */
export async function apiCall<T = unknown>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const base = localStorage.getItem('thevtt:server') ?? 'http://localhost:4477';
      const token = localStorage.getItem('thevtt:token');
      const res = await fetch(base + path, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
      return res.json();
    },
    { method, path, body },
  ) as Promise<T>;
}

export const nav = (page: Page, label: string) => page.getByRole('banner').getByRole('button', { name: label, exact: true }).click();

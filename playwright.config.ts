import { defineConfig } from '@playwright/test';

/** End-to-end tests driving the real Electron app (build it first: pnpm e2e). */
export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { actionTimeout: 20_000 },
});

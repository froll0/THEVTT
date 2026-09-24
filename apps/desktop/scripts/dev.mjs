// Starts the Vite dev server, bundles main/preload and launches Electron against it.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { buildElectron } from './build-electron.mjs';

const require = createRequire(import.meta.url);
const server = await createServer({ configFile: 'vite.config.ts' });
await server.listen();
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5199/';

await buildElectron({ sourcemap: true });
const electron = require('electron');
const child = spawn(electron, ['.'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});

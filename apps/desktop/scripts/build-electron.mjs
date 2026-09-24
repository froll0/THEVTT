import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', external: ['electron'], logLevel: 'info' };

export async function buildElectron(opts = {}) {
  await Promise.all([
    build({ ...common, entryPoints: ['src/main/index.ts'], outfile: 'out/main/index.cjs', ...opts }),
    build({ ...common, entryPoints: ['src/preload/index.ts'], outfile: 'out/preload/index.cjs', ...opts }),
  ]);
}

// run directly (not imported by dev.mjs); pathToFileURL keeps this true on Windows paths too
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildElectron({ minify: true });

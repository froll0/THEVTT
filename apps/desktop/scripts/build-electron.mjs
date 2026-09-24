import { build } from 'esbuild';

const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', external: ['electron'], logLevel: 'info' };

export async function buildElectron(opts = {}) {
  await Promise.all([
    build({ ...common, entryPoints: ['src/main/index.ts'], outfile: 'out/main/index.cjs', ...opts }),
    build({ ...common, entryPoints: ['src/preload/index.ts'], outfile: 'out/preload/index.cjs', ...opts }),
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) await buildElectron({ minify: true });

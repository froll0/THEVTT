import { resolve } from 'node:path';
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4477);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.THEVTT_DB ?? resolve(process.cwd(), 'data', 'thevtt.sqlite');

const { app } = await buildApp({ dbPath, logger: true });
await app.listen({ port, host });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().then(() => process.exit(0));
  });
}

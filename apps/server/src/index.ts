import { resolve } from 'node:path';
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4477);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.THEVTT_DB ?? resolve(process.cwd(), 'data', 'thevtt.sqlite');

// e.g. THEVTT_ICE_SERVERS='[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]'
const iceServers = process.env.THEVTT_ICE_SERVERS ? JSON.parse(process.env.THEVTT_ICE_SERVERS) : undefined;

const { app } = await buildApp({ dbPath, logger: true, iceServers });
await app.listen({ port, host });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().then(() => process.exit(0));
  });
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4477);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.THEVTT_DB ?? resolve(process.cwd(), 'data', 'thevtt.sqlite');

// `--import gruppo.thevtt-backup`: the group the desktop app hosted moves here (accounts, campaigns, characters…)
const at = process.argv.indexOf('--import');
if (at > 0) {
  const file = process.argv[at + 1];
  if (!file) throw new Error('Manca il file: --import gruppo.thevtt-backup');
  if (existsSync(dbPath) && !process.argv.includes('--force')) {
    console.error(`Il database ${dbPath} esiste già: aggiungi --force per sostituirlo.`);
    process.exit(1);
  }
  const backup = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as { thevtt?: string; files?: Record<string, string> };
  const db = backup.thevtt === 'backup' ? backup.files?.['server/thevtt.sqlite'] : undefined;
  if (!db) {
    console.error('Nel backup non c’è il database di un gruppo ospitato.');
    process.exit(1);
  }
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, Buffer.from(db, 'base64'));
  console.log(`Gruppo importato in ${dbPath}. Ora avvia il server normalmente.`);
  process.exit(0);
}

// e.g. THEVTT_ICE_SERVERS='[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]'
const iceServers = process.env.THEVTT_ICE_SERVERS ? JSON.parse(process.env.THEVTT_ICE_SERVERS) : undefined;

// the web client (players from a browser at /play/): THEVTT_WEB, or a «web» folder next to where it starts
const web = process.env.THEVTT_WEB ?? resolve(process.cwd(), 'web');
const webRoot = existsSync(resolve(web, 'index.html')) ? web : undefined;

const { app } = await buildApp({ dbPath, logger: true, iceServers, webRoot });
if (webRoot) app.log.info(`Client web su /play/ (da ${webRoot})`);
await app.listen({ port, host });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().then(() => process.exit(0));
  });
}

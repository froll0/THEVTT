import type { AddressInfo } from 'node:net';
import type { ServerToClient } from '@thevtt/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp } from '../src/app';

let app: FastifyInstance;
let base: string;

beforeAll(async () => {
  ({ app } = await buildApp({ dbPath: ':memory:' }));
  await app.listen({ port: 0, host: '127.0.0.1' });
  base = `127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.close());

async function api<T = any>(method: string, url: string, token?: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await app.inject({
    method: method as 'GET',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: body as object,
  });
  return { status: res.statusCode, body: res.json() as T };
}

async function register(username: string) {
  const r = await api('POST', '/auth/register', undefined, { username, password: 'password123', displayName: username.toUpperCase() });
  expect(r.status).toBe(200);
  return r.body as { token: string; user: { id: string } };
}

function connect(token: string) {
  const ws = new WebSocket(`ws://${base}/ws?token=${token}`);
  const inbox: ServerToClient[] = [];
  const waiters: { pred: (m: ServerToClient) => boolean; resolve: (m: ServerToClient) => void }[] = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString()) as ServerToClient;
    inbox.push(m);
    for (const w of [...waiters]) if (w.pred(m)) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(m);
    }
  });
  const next = (pred: (m: ServerToClient) => boolean) =>
    new Promise<ServerToClient>((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) return resolve(found);
      waiters.push({ pred, resolve });
      setTimeout(() => reject(new Error('timeout')), 2000);
    });
  const open = new Promise<void>((r) => ws.once('open', () => r()));
  return { ws, next, open, send: (m: object) => ws.send(JSON.stringify(m)), inbox };
}

describe('lobby server', () => {
  it('handles auth', async () => {
    const a = await register('anna');
    expect((await api('GET', '/me', a.token)).body.username).toBe('anna');
    expect((await api('GET', '/me')).status).toBe(401);
    expect((await api('POST', '/auth/register', undefined, { username: 'ANNA', password: 'password123' })).status).toBe(409);
    expect((await api('POST', '/auth/login', undefined, { username: 'anna', password: 'wrong-pass' })).status).toBe(401);
    expect((await api('POST', '/auth/login', undefined, { username: 'Anna', password: 'password123' })).status).toBe(200);
  });

  it('runs the friends → invite → character → session flow', async () => {
    const gm = await register('master');
    const pl = await register('player1');
    const stranger = await register('stranger');

    // friendship
    expect((await api('POST', '/friends/requests', gm.token, { username: 'player1' })).body.status).toBe('requested');
    expect((await api('GET', '/friends', pl.token)).body[0].status).toBe('pending_in');
    expect((await api('POST', `/friends/${gm.user.id}/accept`, pl.token)).status).toBe(200);
    expect((await api('GET', '/friends', gm.token)).body[0].status).toBe('accepted');

    // campaign + invites
    const camp = (await api('POST', '/campaigns', gm.token, { name: 'La Miniera Perduta', systemId: 'dnd5e-2024' })).body;
    expect(camp.members).toHaveLength(1);
    expect((await api('POST', `/campaigns/${camp.id}/invites`, gm.token, { userId: stranger.user.id })).status).toBe(403);
    expect((await api('POST', `/campaigns/${camp.id}/invites`, gm.token, { userId: pl.user.id })).status).toBe(200);
    const invites = (await api('GET', '/invites', pl.token)).body;
    expect(invites[0].campaign.name).toBe('La Miniera Perduta');
    const joined = (await api('POST', `/invites/${invites[0].id}/accept`, pl.token)).body;
    expect(joined.members).toHaveLength(2);
    expect((await api('GET', `/campaigns/${camp.id}`, stranger.token)).status).toBe(404);

    // character
    const ch = (await api('POST', '/characters', pl.token, { name: 'Lia', systemId: 'dnd5e-2024', data: { level: 1 } })).body;
    expect((await api('PUT', `/campaigns/${camp.id}/character`, pl.token, { characterId: ch.id })).status).toBe(200);
    const seated = (await api('GET', `/campaigns/${camp.id}/characters`, gm.token)).body;
    expect(seated[0].campaignId).toBe(camp.id);
    // GM may update seated characters, strangers may not
    expect((await api('PUT', `/characters/${ch.id}`, gm.token, { name: 'Lia', systemId: 'dnd5e-2024', data: { level: 2 } })).status).toBe(200);
    expect((await api('PUT', `/characters/${ch.id}`, stranger.token, { name: 'X', systemId: 'dnd5e-2024', data: {} })).status).toBe(403);

    // realtime session with relay
    const host = connect(gm.token);
    const peer = connect(pl.token);
    await Promise.all([host.open, peer.open]);
    host.send({ t: 'session.start', campaignId: camp.id });
    await peer.next((m) => m.t === 'session.state' && !!m.session);
    peer.send({ t: 'session.join', campaignId: camp.id });
    await host.next((m) => m.t === 'session.peer' && m.joined);
    peer.send({ t: 'relay.host', campaignId: camp.id, payload: { k: 'hello' } });
    const got = await host.next((m) => m.t === 'relay');
    expect(got).toMatchObject({ from: pl.user.id, payload: { k: 'hello' } });
    host.send({ t: 'relay.peer', campaignId: camp.id, to: pl.user.id, payload: { k: 'state' } });
    expect(await peer.next((m) => m.t === 'relay')).toMatchObject({ payload: { k: 'state' } });
    expect((await api('GET', `/campaigns/${camp.id}`, pl.token)).body.session.participants).toEqual([pl.user.id]);

    // host disconnect ends the session
    host.ws.close();
    await peer.next((m) => m.t === 'session.state' && m.session === null);
    peer.ws.close();
  });

  it('rejects websocket without a valid token', async () => {
    const ws = new WebSocket(`ws://${base}/ws?token=nope`);
    const err = await new Promise<Error>((r) => ws.on('error', r));
    expect(err.message).toMatch(/401/);
  });
});

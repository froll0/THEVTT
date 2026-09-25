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

    // WebRTC signaling: player ↔ host only
    const offer = { type: 'description', description: { type: 'offer', sdp: 'v=0' } };
    peer.send({ t: 'rtc.signal', campaignId: camp.id, to: gm.user.id, data: offer });
    expect(await host.next((m) => m.t === 'rtc.signal')).toMatchObject({ from: pl.user.id, data: offer });
    host.send({ t: 'rtc.signal', campaignId: camp.id, to: pl.user.id, data: { type: 'bye' } });
    expect(await peer.next((m) => m.t === 'rtc.signal')).toMatchObject({ from: gm.user.id, data: { type: 'bye' } });
    peer.send({ t: 'rtc.signal', campaignId: camp.id, to: stranger.user.id, data: { type: 'bye' } });
    expect(await peer.next((m) => m.t === 'error')).toMatchObject({ message: 'Non sei seduto a questo tavolo' });
    expect((await api('GET', '/rtc/config', pl.token)).body.iceServers[0].urls).toBeTruthy();

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

describe('chat and scheduling', () => {
  it('keeps campaign and direct chats private, with unread counts and live notifications', async () => {
    const gm = await register('chatgm');
    const pl = await register('chatpl');
    const stranger = await register('chatx');
    await api('POST', '/friends/requests', gm.token, { username: 'chatpl' });
    await api('POST', `/friends/${gm.user.id}/accept`, pl.token);
    const camp = (await api('POST', '/campaigns', gm.token, { name: 'Chiacchiere', systemId: 'dnd5e-2024' })).body;
    await api('POST', `/campaigns/${camp.id}/invites`, gm.token, { userId: pl.user.id });
    const [inv] = (await api('GET', '/invites', pl.token)).body;
    await api('POST', `/invites/${inv.id}/accept`, pl.token);

    const peer = connect(pl.token);
    await peer.open;
    const sent = await api('POST', `/chat/campaign:${camp.id}`, gm.token, { text: 'Sabato si gioca?' });
    expect(sent.body).toMatchObject({ channel: `campaign:${camp.id}`, authorId: gm.user.id, text: 'Sabato si gioca?' });
    const live = await peer.next((m) => m.t === 'notify' && m.notification.kind === 'chat.message');
    expect(live).toMatchObject({ notification: { message: { channel: `campaign:${camp.id}`, text: 'Sabato si gioca?' } } });

    // direct messages: the channel is named after the other person on each side
    await api('POST', `/chat/dm:${pl.user.id}`, gm.token, { text: 'Ciao!' });
    const dm = await peer.next((m) => m.t === 'notify' && m.notification.kind === 'chat.message' && m.notification.message.channel.startsWith('dm:'));
    expect(dm).toMatchObject({ notification: { message: { channel: `dm:${gm.user.id}` } } });
    expect((await api('GET', `/chat/dm:${gm.user.id}`, pl.token)).body.map((m: { text: string }) => m.text)).toEqual(['Ciao!']);

    expect((await api('GET', '/chat/unread', pl.token)).body).toEqual({ [`campaign:${camp.id}`]: 1, [`dm:${gm.user.id}`]: 1 });
    await api('POST', `/chat/campaign:${camp.id}/read`, pl.token);
    expect((await api('GET', '/chat/unread', pl.token)).body).toEqual({ [`dm:${gm.user.id}`]: 1 });
    expect((await api('GET', '/chat/unread', gm.token)).body).toEqual({});

    // outsiders can't read or write
    expect((await api('GET', `/chat/campaign:${camp.id}`, stranger.token)).status).toBe(404);
    expect((await api('POST', `/chat/dm:${gm.user.id}`, stranger.token, { text: 'spam' })).status).toBe(403);
    expect((await api('POST', `/chat/nonsense`, gm.token, { text: 'x' })).status).toBe(400);
    peer.ws.close();
  });

  it('schedules the next session and collects answers', async () => {
    const gm = await register('schedgm');
    const pl = await register('schedpl');
    await api('POST', '/friends/requests', gm.token, { username: 'schedpl' });
    await api('POST', `/friends/${gm.user.id}/accept`, pl.token);
    const camp = (await api('POST', '/campaigns', gm.token, { name: 'Calendario', systemId: 'dnd5e-2024' })).body;
    expect(camp.nextSession).toBeNull();
    await api('POST', `/campaigns/${camp.id}/invites`, gm.token, { userId: pl.user.id });
    const [inv] = (await api('GET', '/invites', pl.token)).body;
    await api('POST', `/invites/${inv.id}/accept`, pl.token);

    expect((await api('PUT', `/campaigns/${camp.id}/rsvp`, pl.token, { answer: 'yes' })).status).toBe(400);
    expect((await api('PUT', `/campaigns/${camp.id}/schedule`, pl.token, { at: '2026-10-03T19:00:00Z' })).status).toBe(403);
    const peer = connect(pl.token);
    await peer.open;
    const c = (await api('PUT', `/campaigns/${camp.id}/schedule`, gm.token, { at: '2026-10-03T19:00:00Z' })).body;
    expect(c.nextSession).toBe('2026-10-03T19:00:00.000Z');
    expect(await peer.next((m) => m.t === 'notify' && m.notification.kind === 'session.scheduled')).toMatchObject({ notification: { campaignName: 'Calendario' } });
    expect((await api('PUT', `/campaigns/${camp.id}/rsvp`, pl.token, { answer: 'maybe' })).body.rsvps).toEqual({ [pl.user.id]: 'maybe' });
    expect((await api('PUT', `/campaigns/${camp.id}/rsvp`, pl.token, { answer: 'yes' })).body.rsvps).toEqual({ [pl.user.id]: 'yes' });
    // a new date resets the answers
    expect((await api('PUT', `/campaigns/${camp.id}/schedule`, gm.token, { at: '2026-10-10T19:00:00Z' })).body.rsvps).toEqual({});
    expect((await api('PUT', `/campaigns/${camp.id}/schedule`, gm.token, { at: 'domani' })).status).toBe(400);
    expect((await api('PUT', `/campaigns/${camp.id}/schedule`, gm.token, { at: null })).body.nextSession).toBeNull();
    peer.ws.close();
  });
});

describe('journal', () => {
  it('keeps each journal private to its author', async () => {
    const a = await register('diarioa');
    const b = await register('diariob');
    const camp = (await api('POST', '/campaigns', a.token, { name: 'Diari', systemId: 'dnd5e-2024' })).body;
    const e = (await api('POST', '/journal', a.token, { title: 'Sessione 1', body: 'Abbiamo trovato la miniera.', campaignId: camp.id })).body;
    expect(e).toMatchObject({ title: 'Sessione 1', campaignId: camp.id });
    // not a member: can't file a page under that campaign
    expect((await api('POST', '/journal', b.token, { title: 'x', campaignId: camp.id })).status).toBe(404);
    expect((await api('GET', '/journal', b.token)).body).toEqual([]);
    expect((await api('PATCH', `/journal/${e.id}`, b.token, { body: 'hack' })).status).toBe(404);
    const upd = (await api('PATCH', `/journal/${e.id}`, a.token, { body: 'Abbiamo trovato la miniera. E un drago.' })).body;
    expect(upd.body).toContain('drago');
    expect(upd.title).toBe('Sessione 1');
    expect((await api('GET', '/journal', a.token)).body).toHaveLength(1);
    expect((await api('DELETE', `/journal/${e.id}`, b.token)).status).toBe(404);
    expect((await api('DELETE', `/journal/${e.id}`, a.token)).status).toBe(200);
    expect((await api('GET', '/journal', a.token)).body).toEqual([]);
  });

  it('lets the GM write session recaps the group can read', async () => {
    const gm = await register('recapgm');
    const pl = await register('recappl');
    const other = await register('recapother');
    await api('POST', '/friends/requests', gm.token, { username: 'recappl' });
    await api('POST', `/friends/${gm.user.id}/accept`, pl.token);
    const camp = (await api('POST', '/campaigns', gm.token, { name: 'Cronache', systemId: 'dnd5e-2024' })).body;
    await api('POST', `/campaigns/${camp.id}/invites`, gm.token, { userId: pl.user.id });
    const [inv] = (await api('GET', '/invites', pl.token)).body;
    await api('POST', `/invites/${inv.id}/accept`, pl.token);
    const r = (await api('POST', `/campaigns/${camp.id}/recaps`, gm.token, { title: 'Sessione 1', body: 'Il drago è fuggito.' })).body;
    expect(r).toMatchObject({ title: 'Sessione 1', campaignId: camp.id });
    expect((await api('POST', `/campaigns/${camp.id}/recaps`, pl.token, { title: 'x' })).status).toBe(403);
    expect((await api('GET', `/campaigns/${camp.id}/recaps`, pl.token)).body).toHaveLength(1);
    expect((await api('GET', `/campaigns/${camp.id}/recaps`, other.token)).status).toBe(404);
    expect((await api('PATCH', `/campaigns/${camp.id}/recaps/${r.id}`, gm.token, { title: 'Sessione 1', body: 'Il drago è tornato.' })).body.body).toContain('tornato');
    expect((await api('DELETE', `/campaigns/${camp.id}/recaps/${r.id}`, pl.token)).status).toBe(403);
    expect((await api('DELETE', `/campaigns/${camp.id}/recaps/${r.id}`, gm.token)).status).toBe(200);
    expect((await api('GET', `/campaigns/${camp.id}/recaps`, pl.token)).body).toEqual([]);
  });

  it('stores profile pictures and campaign covers', async () => {
    const a = await register('ritratto');
    const b = await register('altro');
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const me = (await api('PATCH', '/me', a.token, { avatar: png, avatarColor: '#123456' })).body;
    expect(me).toMatchObject({ avatar: png, avatarColor: '#123456' });
    expect((await api('PATCH', '/me', a.token, { avatar: 'data:image/svg+xml;base64,PHN2Zz4=' })).status).toBe(400);
    expect((await api('PATCH', '/me', a.token, { avatar: null })).body.avatar).toBeNull();
    const camp = (await api('POST', '/campaigns', a.token, { name: 'Copertina', systemId: 'dnd5e-2024' })).body;
    expect(camp.cover).toBeNull();
    expect((await api('PATCH', `/campaigns/${camp.id}`, a.token, { cover: png })).body.cover).toBe(png);
    // only the GM changes it
    expect((await api('PATCH', `/campaigns/${camp.id}`, b.token, { cover: null })).status).not.toBe(200);
    expect((await api('GET', `/campaigns/${camp.id}`, a.token)).body.cover).toBe(png);
  });
});

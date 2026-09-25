import { randomUUID } from 'node:crypto';
import type { Campaign, CampaignInvite, CampaignRole, CharacterRecord, ChatMessage, FriendEntry, FriendStatus, RsvpAnswer, UserPublic } from '@thevtt/shared';
import { tx, type Db } from './db';
import { badRequest, conflict, forbidden, notFound } from './errors';

type Row = Record<string, unknown>;

export interface Presence {
  isOnline(userId: string): boolean;
  session(campaignId: string): Campaign['session'];
}

const AVATAR_COLORS = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#b388eb', '#ef476f', '#06d6a0', '#ffd166'];
const now = () => new Date().toISOString();
const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string];

export class Repo {
  constructor(
    private readonly db: Db,
    private readonly presence: Presence,
  ) {}

  // ---------- users ----------

  private toUser(r: Row): UserPublic {
    return {
      id: r.id as string,
      username: r.username as string,
      displayName: r.display_name as string,
      avatarColor: r.avatar_color as string,
      online: this.presence.isOnline(r.id as string),
    };
  }

  createUser(username: string, displayName: string, passwordHash: string): UserPublic {
    if (this.db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw conflict('Nome utente già in uso');
    const id = randomUUID();
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;
    this.db
      .prepare('INSERT INTO users (id, username, display_name, avatar_color, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, displayName, color, passwordHash, now());
    return this.user(id);
  }

  user(id: string): UserPublic {
    const r = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined;
    if (!r) throw notFound('Utente non trovato');
    return this.toUser(r);
  }

  credentials(username: string): { id: string; hash: string } | null {
    const r = this.db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username) as Row | undefined;
    return r ? { id: r.id as string, hash: r.password_hash as string } : null;
  }

  updateProfile(id: string, patch: { displayName?: string; avatarColor?: string }): UserPublic {
    if (patch.displayName) this.db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(patch.displayName, id);
    if (patch.avatarColor) this.db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(patch.avatarColor, id);
    return this.user(id);
  }

  searchUsers(q: string, excludeId: string): UserPublic[] {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const rows = this.db
      .prepare('SELECT * FROM users WHERE id != ? AND (username LIKE ? OR display_name LIKE ?) ORDER BY username LIMIT 20')
      .all(excludeId, like, like) as Row[];
    return rows.map((r) => this.toUser(r));
  }

  // ---------- friends ----------

  friends(userId: string): FriendEntry[] {
    const rows = this.db
      .prepare(
        `SELECT f.*, u.* FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
         WHERE f.user_a = ? OR f.user_b = ? ORDER BY u.display_name`,
      )
      .all(userId, userId, userId) as Row[];
    return rows.map((r) => {
      let status: FriendStatus = 'accepted';
      if (r.status === 'pending') status = r.requester_id === userId ? 'pending_out' : 'pending_in';
      return { user: this.toUser(r), status, since: r.created_at as string };
    });
  }

  friendIds(userId: string): string[] {
    return this.friends(userId)
      .filter((f) => f.status === 'accepted')
      .map((f) => f.user.id);
  }

  areFriends(a: string, b: string): boolean {
    const [x, y] = pair(a, b);
    const r = this.db.prepare("SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ? AND status = 'accepted'").get(x, y);
    return !!r;
  }

  /** Returns 'requested' or 'accepted' (when the other side had already asked). */
  requestFriend(from: string, to: string): 'requested' | 'accepted' {
    if (from === to) throw badRequest('Non puoi aggiungere te stesso');
    const [a, b] = pair(from, to);
    const existing = this.db.prepare('SELECT * FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b) as Row | undefined;
    if (existing?.status === 'accepted') throw conflict('Siete già amici');
    if (existing) {
      if (existing.requester_id === from) throw conflict('Richiesta già inviata');
      this.db.prepare("UPDATE friendships SET status = 'accepted', created_at = ? WHERE user_a = ? AND user_b = ?").run(now(), a, b);
      return 'accepted';
    }
    this.db
      .prepare("INSERT INTO friendships (user_a, user_b, requester_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)")
      .run(a, b, from, now());
    return 'requested';
  }

  acceptFriend(userId: string, otherId: string): void {
    const [a, b] = pair(userId, otherId);
    const r = this.db.prepare('SELECT * FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b) as Row | undefined;
    if (!r || r.status !== 'pending' || r.requester_id === userId) throw notFound('Nessuna richiesta da accettare');
    this.db.prepare("UPDATE friendships SET status = 'accepted', created_at = ? WHERE user_a = ? AND user_b = ?").run(now(), a, b);
  }

  removeFriend(userId: string, otherId: string): void {
    const [a, b] = pair(userId, otherId);
    const res = this.db.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').run(a, b);
    if (!res.changes) throw notFound('Amicizia non trovata');
  }

  // ---------- campaigns ----------

  campaignIdsFor(userId: string): string[] {
    const rows = this.db.prepare('SELECT campaign_id FROM campaign_members WHERE user_id = ?').all(userId) as Row[];
    return rows.map((r) => r.campaign_id as string);
  }

  campaigns(userId: string): Campaign[] {
    return this.campaignIdsFor(userId).map((id) => this.campaign(id));
  }

  campaign(id: string): Campaign {
    const c = this.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Row | undefined;
    if (!c) throw notFound('Campagna non trovata');
    const members = this.db
      .prepare(
        `SELECT m.role, m.character_id, u.* FROM campaign_members m JOIN users u ON u.id = m.user_id
         WHERE m.campaign_id = ? ORDER BY m.role DESC, u.display_name`,
      )
      .all(id) as Row[];
    const invites = this.db
      .prepare('SELECT i.id AS invite_id, u.* FROM invites i JOIN users u ON u.id = i.to_id WHERE i.campaign_id = ?')
      .all(id) as Row[];
    return {
      id,
      name: c.name as string,
      description: c.description as string,
      systemId: c.system_id as string,
      gmId: c.gm_id as string,
      createdAt: c.created_at as string,
      members: members.map((m) => ({
        user: this.toUser(m),
        role: m.role as CampaignRole,
        characterId: (m.character_id as string | null) ?? null,
      })),
      pendingInvites: invites.map((i) => ({ id: i.invite_id as string, user: this.toUser(i) })),
      session: this.presence.session(id),
      nextSession: (c.next_session as string | null) ?? null,
      rsvps: Object.fromEntries(
        (this.db.prepare('SELECT user_id, answer FROM session_rsvps WHERE campaign_id = ?').all(id) as Row[]).map((r) => [r.user_id as string, r.answer as RsvpAnswer]),
      ),
    };
  }

  /** A new date clears the old answers: people answer for the new one. */
  scheduleSession(campaignId: string, at: string | null): void {
    tx(this.db, () => {
      this.db.prepare('UPDATE campaigns SET next_session = ? WHERE id = ?').run(at, campaignId);
      this.db.prepare('DELETE FROM session_rsvps WHERE campaign_id = ?').run(campaignId);
    });
  }

  setRsvp(campaignId: string, userId: string, answer: RsvpAnswer): void {
    this.db.prepare('INSERT INTO session_rsvps (campaign_id, user_id, answer) VALUES (?, ?, ?) ON CONFLICT (campaign_id, user_id) DO UPDATE SET answer = excluded.answer').run(campaignId, userId, answer);
  }

  role(campaignId: string, userId: string): CampaignRole | null {
    const r = this.db.prepare('SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ?').get(campaignId, userId) as
      | Row
      | undefined;
    return (r?.role as CampaignRole | undefined) ?? null;
  }

  requireRole(campaignId: string, userId: string, needed?: CampaignRole): CampaignRole {
    const r = this.role(campaignId, userId);
    if (!r) throw notFound('Campagna non trovata');
    if (needed && r !== needed) throw forbidden('Solo il master può farlo');
    return r;
  }

  memberIds(campaignId: string): string[] {
    const rows = this.db.prepare('SELECT user_id FROM campaign_members WHERE campaign_id = ?').all(campaignId) as Row[];
    return rows.map((r) => r.user_id as string);
  }

  createCampaign(gmId: string, name: string, description: string, systemId: string): Campaign {
    const id = randomUUID();
    tx(this.db, () => {
      this.db
        .prepare('INSERT INTO campaigns (id, name, description, system_id, gm_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, name, description, systemId, gmId, now());
      this.db
        .prepare("INSERT INTO campaign_members (campaign_id, user_id, role, character_id, joined_at) VALUES (?, ?, 'gm', NULL, ?)")
        .run(id, gmId, now());
    });
    return this.campaign(id);
  }

  updateCampaign(id: string, patch: { name?: string; description?: string }): Campaign {
    if (patch.name) this.db.prepare('UPDATE campaigns SET name = ? WHERE id = ?').run(patch.name, id);
    if (patch.description !== undefined) this.db.prepare('UPDATE campaigns SET description = ? WHERE id = ?').run(patch.description, id);
    return this.campaign(id);
  }

  deleteCampaign(id: string): void {
    this.db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  }

  removeMember(campaignId: string, userId: string): void {
    this.db.prepare('DELETE FROM campaign_members WHERE campaign_id = ? AND user_id = ?').run(campaignId, userId);
  }

  // ---------- chat ----------

  /** Server-side channel key for a client channel, checking the user may use it. */
  chatChannel(userId: string, channel: string): { key: string; members: string[] } {
    const [kind, id] = channel.split(':', 2) as [string, string | undefined];
    if (kind === 'campaign' && id) {
      this.requireRole(id, userId);
      return { key: `c:${id}`, members: this.memberIds(id) };
    }
    if (kind === 'dm' && id && id !== userId) {
      if (!this.areFriends(userId, id)) throw forbidden('Puoi scrivere solo ai tuoi amici');
      const [a, b] = pair(userId, id);
      return { key: `d:${a}:${b}`, members: [userId, id] };
    }
    throw badRequest('Canale non valido');
  }

  /** Client channel name of a stored message, from the point of view of `viewerId`. */
  private clientChannel(key: string, viewerId: string): string {
    if (key.startsWith('c:')) return `campaign:${key.slice(2)}`;
    const [, a, b] = key.split(':');
    return `dm:${a === viewerId ? b : a}`;
  }

  private toMessage(r: Row, viewerId: string): ChatMessage {
    return { id: r.id as string, channel: this.clientChannel(r.channel as string, viewerId), authorId: r.author_id as string, text: r.text as string, createdAt: r.created_at as string };
  }

  messages(key: string, viewerId: string, before?: string, limit = 100): ChatMessage[] {
    const rows = (
      before
        ? this.db.prepare('SELECT * FROM messages WHERE channel = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?').all(key, before, limit)
        : this.db.prepare('SELECT * FROM messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?').all(key, limit)
    ) as Row[];
    return rows.reverse().map((r) => this.toMessage(r, viewerId));
  }

  postMessage(key: string, authorId: string, text: string): { id: string; createdAt: string } {
    const id = randomUUID();
    const createdAt = now();
    this.db.prepare('INSERT INTO messages (id, channel, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)').run(id, key, authorId, text, createdAt);
    this.markRead(authorId, key, createdAt);
    return { id, createdAt };
  }

  messageFor(id: string, viewerId: string): ChatMessage {
    return this.toMessage(this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Row, viewerId);
  }

  markRead(userId: string, key: string, at = now()): void {
    this.db.prepare('INSERT INTO channel_reads (user_id, channel, read_at) VALUES (?, ?, ?) ON CONFLICT (user_id, channel) DO UPDATE SET read_at = excluded.read_at').run(userId, key, at);
  }

  /** Unread messages per client channel (campaigns I'm in, DMs with anyone). */
  unread(userId: string): Record<string, number> {
    const rows = this.db
      .prepare(
        `SELECT m.channel, COUNT(*) AS n FROM messages m
         LEFT JOIN channel_reads r ON r.user_id = ? AND r.channel = m.channel
         WHERE m.author_id != ? AND (r.read_at IS NULL OR m.created_at > r.read_at)
           AND (m.channel LIKE ? OR m.channel LIKE ? OR m.channel IN (SELECT 'c:' || campaign_id FROM campaign_members WHERE user_id = ?))
         GROUP BY m.channel`,
      )
      .all(userId, userId, `d:${userId}:%`, `d:%:${userId}`, userId) as Row[];
    return Object.fromEntries(rows.map((r) => [this.clientChannel(r.channel as string, userId), Number(r.n)]));
  }

  // ---------- invites ----------

  invitesFor(userId: string): CampaignInvite[] {
    const rows = this.db
      .prepare(
        `SELECT i.id AS invite_id, i.created_at AS invited_at, c.id AS c_id, c.name AS c_name, c.system_id AS c_system, u.*
         FROM invites i JOIN campaigns c ON c.id = i.campaign_id JOIN users u ON u.id = i.from_id
         WHERE i.to_id = ? ORDER BY i.created_at DESC`,
      )
      .all(userId) as Row[];
    return rows.map((r) => ({
      id: r.invite_id as string,
      campaign: { id: r.c_id as string, name: r.c_name as string, systemId: r.c_system as string },
      from: this.toUser(r),
      createdAt: r.invited_at as string,
    }));
  }

  createInvite(campaignId: string, fromId: string, toId: string): void {
    if (!this.areFriends(fromId, toId)) throw forbidden('Puoi invitare solo i tuoi amici');
    if (this.role(campaignId, toId)) throw conflict('È già nella campagna');
    try {
      this.db
        .prepare('INSERT INTO invites (id, campaign_id, from_id, to_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(randomUUID(), campaignId, fromId, toId, now());
    } catch {
      throw conflict('Invito già inviato');
    }
  }

  invite(id: string): { campaignId: string; fromId: string; toId: string } {
    const r = this.db.prepare('SELECT * FROM invites WHERE id = ?').get(id) as Row | undefined;
    if (!r) throw notFound('Invito non trovato');
    return { campaignId: r.campaign_id as string, fromId: r.from_id as string, toId: r.to_id as string };
  }

  acceptInvite(id: string, userId: string): string {
    const inv = this.invite(id);
    if (inv.toId !== userId) throw notFound('Invito non trovato');
    tx(this.db, () => {
      this.db
        .prepare("INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role, character_id, joined_at) VALUES (?, ?, 'player', NULL, ?)")
        .run(inv.campaignId, userId, now());
      this.db.prepare('DELETE FROM invites WHERE id = ?').run(id);
    });
    return inv.campaignId;
  }

  deleteInvite(id: string): void {
    this.db.prepare('DELETE FROM invites WHERE id = ?').run(id);
  }

  // ---------- characters ----------

  private toCharacter(r: Row): CharacterRecord {
    return {
      id: r.id as string,
      ownerId: r.owner_id as string,
      campaignId: (r.campaign_id as string | null) ?? null,
      systemId: r.system_id as string,
      name: r.name as string,
      data: JSON.parse(r.data as string),
      updatedAt: r.updated_at as string,
    };
  }

  private readonly characterSelect = `SELECT ch.*, m.campaign_id FROM characters ch
    LEFT JOIN campaign_members m ON m.character_id = ch.id`;

  characters(ownerId: string): CharacterRecord[] {
    const rows = this.db.prepare(`${this.characterSelect} WHERE ch.owner_id = ? ORDER BY ch.updated_at DESC`).all(ownerId) as Row[];
    return rows.map((r) => this.toCharacter(r));
  }

  campaignCharacters(campaignId: string): CharacterRecord[] {
    const rows = this.db.prepare(`${this.characterSelect} WHERE m.campaign_id = ?`).all(campaignId) as Row[];
    return rows.map((r) => this.toCharacter(r));
  }

  character(id: string): CharacterRecord {
    const r = this.db.prepare(`${this.characterSelect} WHERE ch.id = ?`).get(id) as Row | undefined;
    if (!r) throw notFound('Personaggio non trovato');
    return this.toCharacter(r);
  }

  saveCharacter(ownerId: string, input: { id?: string; name: string; systemId: string; data: unknown }): CharacterRecord {
    const data = JSON.stringify(input.data ?? {});
    if (data.length > 2_000_000) throw badRequest('Scheda troppo grande');
    if (input.id) {
      this.db
        .prepare('UPDATE characters SET name = ?, system_id = ?, data = ?, updated_at = ? WHERE id = ?')
        .run(input.name, input.systemId, data, now(), input.id);
      return this.character(input.id);
    }
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO characters (id, owner_id, system_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, ownerId, input.systemId, input.name, data, now());
    return this.character(id);
  }

  deleteCharacter(id: string): void {
    this.db.prepare('DELETE FROM characters WHERE id = ?').run(id);
  }

  assignCharacter(campaignId: string, userId: string, characterId: string | null): void {
    tx(this.db, () => {
      if (characterId) this.db.prepare('UPDATE campaign_members SET character_id = NULL WHERE character_id = ?').run(characterId);
      this.db.prepare('UPDATE campaign_members SET character_id = ? WHERE campaign_id = ? AND user_id = ?').run(characterId, campaignId, userId);
    });
  }
}

import type { UserPublic, SessionInfo } from './api';

/**
 * WebSocket protocol with the lobby server (`/ws?token=...`).
 *
 * Game traffic is carried as opaque `relay` payloads: the server forwards them
 * between the GM (host) and players without reading or storing them.
 */

export type ClientToServer =
  | { t: 'session.start'; campaignId: string }
  | { t: 'session.stop'; campaignId: string }
  | { t: 'session.join'; campaignId: string }
  | { t: 'session.leave'; campaignId: string }
  /** player → host */
  | { t: 'relay.host'; campaignId: string; payload: unknown }
  /** host → one player */
  | { t: 'relay.peer'; campaignId: string; to: string; payload: unknown }
  | { t: 'ping' };

export type Notification =
  | { kind: 'friend.request'; from: UserPublic }
  | { kind: 'friend.accepted'; by: UserPublic }
  | { kind: 'friend.removed'; userId: string }
  | { kind: 'invite.received'; campaignName: string; from: UserPublic }
  | { kind: 'campaign.updated'; campaignId: string }
  | { kind: 'campaign.deleted'; campaignId: string };

export type ServerToClient =
  | { t: 'hello'; user: UserPublic }
  | { t: 'presence'; userId: string; online: boolean }
  | { t: 'notify'; notification: Notification }
  | { t: 'session.state'; session: SessionInfo | null; campaignId: string }
  /** sent to the host when a player joins or leaves the table */
  | { t: 'session.peer'; campaignId: string; userId: string; joined: boolean }
  | { t: 'relay'; campaignId: string; from: string; payload: unknown }
  | { t: 'error'; message: string }
  | { t: 'pong' };

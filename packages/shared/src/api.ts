/**
 * REST contract between the desktop client and the lobby/social server.
 * The server only stores social data (accounts, friends, campaigns, characters)
 * and relays session traffic: game state lives on the GM's machine.
 */

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  online?: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export type FriendStatus = 'accepted' | 'pending_in' | 'pending_out';

export interface FriendEntry {
  user: UserPublic;
  status: FriendStatus;
  since: string;
}

export type CampaignRole = 'gm' | 'player';

export interface CampaignMember {
  user: UserPublic;
  role: CampaignRole;
  characterId: string | null;
}

export interface SessionInfo {
  campaignId: string;
  hostId: string;
  startedAt: string;
  participants: string[];
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  systemId: string;
  gmId: string;
  createdAt: string;
  members: CampaignMember[];
  pendingInvites: { id: string; user: UserPublic }[];
  session: SessionInfo | null;
  /** next scheduled session (ISO date), set by the GM */
  nextSession: string | null;
  /** answers to the next session, by user id */
  rsvps: Record<string, RsvpAnswer>;
}

export type RsvpAnswer = 'yes' | 'no' | 'maybe';

/**
 * Chat outside the table. Channels as seen by the client:
 * "campaign:<campaignId>" or "dm:<otherUserId>".
 */
export interface ChatMessage {
  id: string;
  channel: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  systemId: string;
}

export interface CampaignInvite {
  id: string;
  campaign: { id: string; name: string; systemId: string };
  from: UserPublic;
  createdAt: string;
}

export interface CharacterRecord<TData = unknown> {
  id: string;
  ownerId: string;
  campaignId: string | null;
  systemId: string;
  name: string;
  data: TData;
  updatedAt: string;
}

export interface SaveCharacterRequest<TData = unknown> {
  name: string;
  systemId: string;
  data: TData;
}

export interface ApiError {
  error: string;
  message: string;
}

/** A page of a user's personal journal (session notes…). Only its author sees it. */
export interface JournalEntry {
  id: string;
  campaignId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

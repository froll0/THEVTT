import type {
  AuthResponse,
  Campaign,
  CampaignInvite,
  CharacterRecord,
  ChatMessage,
  CreateCampaignRequest,
  FriendEntry,
  JournalEntry,
  RsvpAnswer,
  RtcConfig,
  SaveCharacterRequest,
  UserPublic,
} from '@thevtt/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class Api {
  constructor(
    readonly baseUrl: string,
    private token: string | null = null,
    private readonly onUnauthorized?: () => void,
  ) {}

  setToken(token: string | null): void {
    this.token = token;
  }

  get wsUrl(): string {
    return `${this.baseUrl.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(this.token ?? '')}`;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, `Server non raggiungibile (${this.baseUrl})`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && this.token) this.onUnauthorized?.();
      throw new ApiError(res.status, (data as { message?: string }).message ?? `Errore ${res.status}`);
    }
    return data as T;
  }

  health = () => this.req<{ ok: boolean }>('GET', '/health');
  rtcConfig = () => this.req<RtcConfig>('GET', '/rtc/config');
  register = (username: string, password: string, displayName?: string) =>
    this.req<AuthResponse>('POST', '/auth/register', { username, password, displayName });
  login = (username: string, password: string) => this.req<AuthResponse>('POST', '/auth/login', { username, password });
  logout = () => this.req('POST', '/auth/logout');
  me = () => this.req<UserPublic>('GET', '/me');
  updateMe = (patch: { displayName?: string; avatarColor?: string; avatar?: string | null }) => this.req<UserPublic>('PATCH', '/me', patch);

  searchUsers = (q: string) => this.req<UserPublic[]>('GET', `/users/search?q=${encodeURIComponent(q)}`);
  friends = () => this.req<FriendEntry[]>('GET', '/friends');
  requestFriend = (username: string) => this.req<{ status: string }>('POST', '/friends/requests', { username });
  acceptFriend = (userId: string) => this.req('POST', `/friends/${userId}/accept`);
  removeFriend = (userId: string) => this.req('DELETE', `/friends/${userId}`);

  invites = () => this.req<CampaignInvite[]>('GET', '/invites');
  acceptInvite = (id: string) => this.req<Campaign>('POST', `/invites/${id}/accept`);
  declineInvite = (id: string) => this.req('POST', `/invites/${id}/decline`);

  campaigns = () => this.req<Campaign[]>('GET', '/campaigns');
  campaign = (id: string) => this.req<Campaign>('GET', `/campaigns/${id}`);
  createCampaign = (body: CreateCampaignRequest) => this.req<Campaign>('POST', '/campaigns', body);
  updateCampaign = (id: string, patch: { name?: string; description?: string; cover?: string | null }) => this.req<Campaign>('PATCH', `/campaigns/${id}`, patch);
  deleteCampaign = (id: string) => this.req('DELETE', `/campaigns/${id}`);
  invite = (campaignId: string, userId: string) => this.req<Campaign>('POST', `/campaigns/${campaignId}/invites`, { userId });
  cancelInvite = (campaignId: string, inviteId: string) => this.req<Campaign>('DELETE', `/campaigns/${campaignId}/invites/${inviteId}`);
  removeMember = (campaignId: string, userId: string) => this.req('DELETE', `/campaigns/${campaignId}/members/${userId}`);
  assignCharacter = (campaignId: string, characterId: string | null) =>
    this.req<Campaign>('PUT', `/campaigns/${campaignId}/character`, { characterId });
  scheduleSession = (campaignId: string, at: string | null) => this.req<Campaign>('PUT', `/campaigns/${campaignId}/schedule`, { at });
  rsvp = (campaignId: string, answer: RsvpAnswer) => this.req<Campaign>('PUT', `/campaigns/${campaignId}/rsvp`, { answer });
  campaignCharacters = (campaignId: string) => this.req<CharacterRecord[]>('GET', `/campaigns/${campaignId}/characters`);

  characters = () => this.req<CharacterRecord[]>('GET', '/characters');
  createCharacter = (body: SaveCharacterRequest) => this.req<CharacterRecord>('POST', '/characters', body);
  updateCharacter = (id: string, body: SaveCharacterRequest) => this.req<CharacterRecord>('PUT', `/characters/${id}`, body);
  deleteCharacter = (id: string) => this.req('DELETE', `/characters/${id}`);

  unread = () => this.req<Record<string, number>>('GET', '/chat/unread');
  messages = (channel: string) => this.req<ChatMessage[]>('GET', `/chat/${encodeURIComponent(channel)}`);
  sendMessage = (channel: string, text: string) => this.req<ChatMessage>('POST', `/chat/${encodeURIComponent(channel)}`, { text });
  markRead = (channel: string) => this.req('POST', `/chat/${encodeURIComponent(channel)}/read`);

  journal = () => this.req<JournalEntry[]>('GET', '/journal');
  createJournal = (body: { title?: string; body?: string; campaignId?: string | null }) => this.req<JournalEntry>('POST', '/journal', body);
  updateJournal = (id: string, patch: { title?: string; body?: string; campaignId?: string | null }) =>
    this.req<JournalEntry>('PATCH', `/journal/${id}`, patch);
  deleteJournal = (id: string) => this.req('DELETE', `/journal/${id}`);
}

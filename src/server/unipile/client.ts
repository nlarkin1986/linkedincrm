import { UnipileApiError } from "./errors";
import type {
  AccountSyncParams,
  CursorPaginationParams,
  HostedAuthLinkRequest,
  HostedAuthLinkResponse,
  ListAccountsParams,
  ListChatsParams,
  ListMessagesParams,
  PaginatedUnipileResponse,
  SendMessageRequest,
  StartChatRequest,
  UnipileConfig,
  UnipileFormBody,
  UnipileJsonBody,
  UnipileQueryParams
} from "./types";

export class UnipileClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly config: UnipileConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.baseUrl = normalizeUnipileApiUrl(config.dsn);
  }

  async listAccounts<T = unknown>(params: ListAccountsParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/accounts", params));
  }

  async createAccount<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/accounts", { method: "POST", json });
  }

  async getAccount<T = unknown>(id: string): Promise<T> {
    return this.request(`/accounts/${encodePath(id)}`);
  }

  async updateAccountProxy<T = unknown>(id: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/accounts/${encodePath(id)}`, { method: "PATCH", json });
  }

  async reconnectAccount<T = unknown>(id: string, json: UnipileJsonBody = {}): Promise<T> {
    return this.request(`/accounts/${encodePath(id)}`, { method: "POST", json });
  }

  async deleteAccount<T = unknown>(id: string): Promise<T> {
    return this.request(`/accounts/${encodePath(id)}`, { method: "DELETE" });
  }

  async solveCheckpoint<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/accounts/checkpoint", { method: "POST", json });
  }

  async resendCheckpoint<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/accounts/checkpoint/resend", { method: "POST", json });
  }

  async restartAccount<T = unknown>(id: string): Promise<T> {
    return this.request(`/accounts/${encodePath(id)}/restart`, { method: "POST" });
  }

  async createHostedAuthLink(params: HostedAuthLinkRequest): Promise<HostedAuthLinkResponse> {
    return this.request<HostedAuthLinkResponse>("/hosted/accounts/link", {
      method: "POST",
      json: {
        type: params.type ?? "create",
        providers: params.providers ?? ["LINKEDIN"],
        api_url: params.apiUrl,
        expiresOn: params.expiresOn,
        success_redirect_url: params.successRedirectUrl,
        failure_redirect_url: params.failureRedirectUrl,
        notify_url: params.notifyUrl,
        name: params.name,
        reconnect_account: params.reconnectAccount
      }
    });
  }

  async listEmails<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/emails", params));
  }

  async sendEmail<T = unknown>(form: UnipileFormBody): Promise<T> {
    return this.request("/emails", { method: "POST", form });
  }

  async listEmailContacts<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/emails/contacts", params));
  }

  async getEmail<T = unknown>(emailId: string): Promise<T> {
    return this.request(`/emails/${encodePath(emailId)}`);
  }

  async deleteEmail<T = unknown>(emailId: string): Promise<T> {
    return this.request(`/emails/${encodePath(emailId)}`, { method: "DELETE" });
  }

  async updateEmail<T = unknown>(emailId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/emails/${encodePath(emailId)}`, { method: "PUT", json });
  }

  async getEmailAttachment(emailId: string, attachmentId: string): Promise<ArrayBuffer> {
    return this.request(`/emails/${encodePath(emailId)}/attachments/${encodePath(attachmentId)}`, {
      responseType: "arrayBuffer"
    });
  }

  async listChats<T = unknown>(params: ListChatsParams): Promise<PaginatedUnipileResponse<T>> {
    return this.request(
      withQuery("/chats", {
        account_id: params.accountId,
        account_type: params.accountType ?? "LINKEDIN",
        after: params.after,
        before: params.before,
        cursor: params.cursor,
        limit: params.limit,
        unread: params.unread
      })
    );
  }

  async startChat<T = unknown>(form: StartChatRequest): Promise<T> {
    return this.request("/chats", { method: "POST", form });
  }

  async getChat<T = unknown>(chatId: string): Promise<T> {
    return this.request(`/chats/${encodePath(chatId)}`);
  }

  async deleteChat<T = unknown>(chatId: string): Promise<T> {
    return this.request(`/chats/${encodePath(chatId)}`, { method: "DELETE" });
  }

  async updateChat<T = unknown>(chatId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/chats/${encodePath(chatId)}`, { method: "PATCH", json });
  }

  async listMessagesForChat<T = unknown>(
    chatId: string,
    cursor?: string,
    params: Omit<CursorPaginationParams, "cursor"> = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(
      withQuery(`/chats/${encodePath(chatId)}/messages`, {
        cursor,
        limit: params.limit
      })
    );
  }

  async sendMessageInChat<T = unknown>(chatId: string, form: SendMessageRequest): Promise<T> {
    return this.request(`/chats/${encodePath(chatId)}/messages`, { method: "POST", form });
  }

  async listChatAttendees<T = unknown>(
    chatId: string,
    params: CursorPaginationParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/chats/${encodePath(chatId)}/attendees`, params));
  }

  async syncChatHistory<T = unknown>(chatId: string): Promise<T> {
    return this.request(`/chats/${encodePath(chatId)}/sync`);
  }

  async listMessages<T = unknown>(params: ListMessagesParams): Promise<PaginatedUnipileResponse<T>> {
    return this.request(
      withQuery("/messages", {
        account_id: params.accountId,
        after: params.after,
        before: params.before,
        cursor: params.cursor,
        limit: params.limit,
        sender_id: params.senderId
      })
    );
  }

  async getMessage<T = unknown>(messageId: string): Promise<T> {
    return this.request(`/messages/${encodePath(messageId)}`);
  }

  async deleteMessage<T = unknown>(messageId: string): Promise<T> {
    return this.request(`/messages/${encodePath(messageId)}`, { method: "DELETE" });
  }

  async updateMessage<T = unknown>(messageId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/messages/${encodePath(messageId)}`, { method: "PATCH", json });
  }

  async forwardMessage<T = unknown>(messageId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/messages/${encodePath(messageId)}/forward`, { method: "POST", json });
  }

  async addMessageReaction<T = unknown>(messageId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/messages/${encodePath(messageId)}/reaction`, { method: "POST", json });
  }

  async getMessageAttachment(messageId: string, attachmentId: string): Promise<ArrayBuffer> {
    return this.request(`/messages/${encodePath(messageId)}/attachments/${encodePath(attachmentId)}`, {
      responseType: "arrayBuffer"
    });
  }

  async listAttendees<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/chat_attendees", params));
  }

  async getAttendee<T = unknown>(id: string): Promise<T> {
    return this.request(`/chat_attendees/${encodePath(id)}`);
  }

  async getAttendeeProfilePicture(id: string): Promise<ArrayBuffer> {
    return this.request(`/chat_attendees/${encodePath(id)}/picture`, { responseType: "arrayBuffer" });
  }

  async listChatsByAttendee<T = unknown>(
    attendeeId: string,
    params: CursorPaginationParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/chat_attendees/${encodePath(attendeeId)}/chats`, params));
  }

  async listMessagesByAttendee<T = unknown>(
    senderId: string,
    params: CursorPaginationParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/chat_attendees/${encodePath(senderId)}/messages`, params));
  }

  async listWebhooks<T = unknown>(params: CursorPaginationParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/webhooks", params));
  }

  async createWebhook<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/webhooks", { method: "POST", json });
  }

  async deleteWebhook<T = unknown>(id: string): Promise<T> {
    return this.request(`/webhooks/${encodePath(id)}`, { method: "DELETE" });
  }

  async listFolders<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/folders", params));
  }

  async getFolder<T = unknown>(folderId: string): Promise<T> {
    return this.request(`/folders/${encodePath(folderId)}`);
  }

  async createDraft<T = unknown>(form: UnipileFormBody): Promise<T> {
    return this.request("/drafts", { method: "POST", form });
  }

  async listCalendars<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/calendars", params));
  }

  async getCalendar<T = unknown>(calendarId: string): Promise<T> {
    return this.request(`/calendars/${encodePath(calendarId)}`);
  }

  async listCalendarEvents<T = unknown>(
    calendarId: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/calendars/${encodePath(calendarId)}/events`, params));
  }

  async createCalendarEvent<T = unknown>(calendarId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/calendars/${encodePath(calendarId)}/events`, { method: "POST", json });
  }

  async getCalendarEvent<T = unknown>(calendarId: string, eventId: string): Promise<T> {
    return this.request(`/calendars/${encodePath(calendarId)}/events/${encodePath(eventId)}`);
  }

  async editCalendarEvent<T = unknown>(calendarId: string, eventId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/calendars/${encodePath(calendarId)}/events/${encodePath(eventId)}`, {
      method: "PATCH",
      json
    });
  }

  async deleteCalendarEvent<T = unknown>(calendarId: string, eventId: string): Promise<T> {
    return this.request(`/calendars/${encodePath(calendarId)}/events/${encodePath(eventId)}`, { method: "DELETE" });
  }

  async listSentInvitations<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/users/invite/sent", params));
  }

  async listReceivedInvitations<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/users/invite/received", params));
  }

  async handleReceivedInvitation<T = unknown>(invitationId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/users/invite/received/${encodePath(invitationId)}`, { method: "POST", json });
  }

  async getOwnProfile<T = unknown>(params: UnipileQueryParams): Promise<T> {
    return this.request(withQuery("/users/me", params));
  }

  async editOwnProfile<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/users/me/edit", { method: "PATCH", json });
  }

  async listRelations<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/users/relations", params));
  }

  async listFollowing<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/users/following", params));
  }

  async listFollowers<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/users/followers", params));
  }

  async getProfileByIdentifier<T = unknown>(identifier: string, params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery(`/users/${encodePath(identifier)}`, params));
  }

  async inviteUserByIdentifier<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/users/invite", { method: "POST", json });
  }

  async listUserPosts<T = unknown>(
    identifier: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/users/${encodePath(identifier)}/posts`, params));
  }

  async listUserComments<T = unknown>(
    identifier: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/users/${encodePath(identifier)}/comments`, params));
  }

  async listUserReactions<T = unknown>(
    identifier: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/users/${encodePath(identifier)}/reactions`, params));
  }

  async cancelSentInvitation<T = unknown>(invitationId: string): Promise<T> {
    return this.request(`/users/invite/sent/${encodePath(invitationId)}`, { method: "DELETE" });
  }

  async getAvailableContracts<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/linkedin/contracts", params));
  }

  async selectContract<T = unknown>(id: string, json: UnipileJsonBody = {}): Promise<T> {
    return this.request(`/linkedin/contracts/${encodePath(id)}/select`, { method: "POST", json });
  }

  async getHiringProjects<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/linkedin/projects", params));
  }

  async getHiringProject<T = unknown>(id: string, params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery(`/linkedin/projects/${encodePath(id)}`, params));
  }

  async performActionOnLinkedInMember<T = unknown>(userId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/linkedin/user/${encodePath(userId)}`, { method: "POST", json });
  }

  async getLinkedInCompanyProfile<T = unknown>(
    identifier: string,
    params: UnipileQueryParams = {}
  ): Promise<T> {
    return this.request(withQuery(`/linkedin/company/${encodePath(identifier)}`, params));
  }

  async getRawLinkedInData<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/linkedin", { method: "POST", json });
  }

  async getInmailBalance<T = unknown>(params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery("/linkedin/inmail_balance", params));
  }

  async getLinkedInSearchParameters<T = unknown>(params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery("/linkedin/search/parameters", params));
  }

  async searchLinkedIn<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/linkedin/search", { method: "POST", json });
  }

  async listLinkedInJobs<T = unknown>(params: UnipileQueryParams = {}): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery("/linkedin/jobs", params));
  }

  async createLinkedInJob<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/linkedin/jobs", { method: "POST", json });
  }

  async getLinkedInJob<T = unknown>(jobId: string, params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery(`/linkedin/jobs/${encodePath(jobId)}`, params));
  }

  async editLinkedInJob<T = unknown>(jobId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/linkedin/jobs/${encodePath(jobId)}`, { method: "PATCH", json });
  }

  async publishLinkedInJob<T = unknown>(draftId: string, json: UnipileJsonBody = {}): Promise<T> {
    return this.request(`/linkedin/jobs/${encodePath(draftId)}/publish`, { method: "POST", json });
  }

  async solveLinkedInJobCheckpoint<T = unknown>(draftId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/linkedin/jobs/${encodePath(draftId)}/checkpoint`, { method: "POST", json });
  }

  async closeLinkedInJob<T = unknown>(id: string, json: UnipileJsonBody = {}): Promise<T> {
    return this.request(`/linkedin/jobs/${encodePath(id)}/close`, { method: "POST", json });
  }

  async listLinkedInJobApplicants<T = unknown>(
    id: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/linkedin/jobs/${encodePath(id)}/applicants`, params));
  }

  async getLinkedInJobApplicant<T = unknown>(applicantId: string, params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery(`/linkedin/jobs/applicants/${encodePath(applicantId)}`, params));
  }

  async getLinkedInJobApplicantResume(applicantId: string, params: UnipileQueryParams = {}): Promise<ArrayBuffer> {
    return this.request(withQuery(`/linkedin/jobs/applicants/${encodePath(applicantId)}/resume`, params), {
      responseType: "arrayBuffer"
    });
  }

  async endorseLinkedInProfile<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/linkedin/profile/endorse", { method: "POST", json });
  }

  async getPost<T = unknown>(postId: string, params: UnipileQueryParams = {}): Promise<T> {
    return this.request(withQuery(`/posts/${encodePath(postId)}`, params));
  }

  async createPost<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/posts", { method: "POST", json });
  }

  async listPostComments<T = unknown>(
    postId: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/posts/${encodePath(postId)}/comments`, params));
  }

  async sendPostComment<T = unknown>(postId: string, json: UnipileJsonBody): Promise<T> {
    return this.request(`/posts/${encodePath(postId)}/comments`, { method: "POST", json });
  }

  async listPostReactions<T = unknown>(
    postId: string,
    params: UnipileQueryParams = {}
  ): Promise<PaginatedUnipileResponse<T>> {
    return this.request(withQuery(`/posts/${encodePath(postId)}/reactions`, params));
  }

  async addPostReaction<T = unknown>(json: UnipileJsonBody): Promise<T> {
    return this.request("/posts/reaction", { method: "POST", json });
  }

  async resyncAccount<T = unknown>(params: AccountSyncParams): Promise<T> {
    return this.resyncAccountMessagingData(params);
  }

  async resyncAccountMessagingData<T = unknown>(params: AccountSyncParams): Promise<T> {
    return this.request(
      withQuery(`/accounts/${encodePath(params.accountId)}/sync`, {
        partial: params.partial,
        linkedin_product: params.linkedinProduct,
        after: params.afterEpochMs,
        before: params.beforeEpochMs,
        chunk_size: params.chunkSize
      })
    );
  }

  async request<T>(
    path: string,
    options: {
      method?: string;
      headers?: HeadersInit;
      body?: BodyInit;
      json?: UnipileJsonBody;
      form?: UnipileFormBody;
      responseType?: "json" | "text" | "arrayBuffer";
    } = {}
  ): Promise<T> {
    const body = buildBody(options);
    const headers = new Headers(options.headers);
    headers.set("X-API-KEY", this.config.apiKey);
    headers.set("accept", "application/json");
    if (options.json) headers.set("content-type", "application/json");

    const res = await this.fetchImpl(`${this.baseUrl}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body
    });

    if (!res.ok) {
      throw new UnipileApiError(res.status, await res.text());
    }

    if (options.responseType === "arrayBuffer") return (await res.arrayBuffer()) as T;
    if (options.responseType === "text") return (await res.text()) as T;
    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return (await res.text()) as T;

    return (await res.json()) as T;
  }
}

function withQuery(path: string, params: UnipileQueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

function buildBody(options: {
  body?: BodyInit;
  json?: UnipileJsonBody;
  form?: UnipileFormBody;
}): BodyInit | undefined {
  if (options.json) return JSON.stringify(stripUndefined(options.json));
  if (options.form) return toFormData(options.form);
  return options.body;
}

function toFormData(input: UnipileFormBody): FormData {
  const form = new FormData();
  for (const [key, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      form.append(key, value instanceof Blob ? value : String(value));
    }
  }
  return form;
}

export function normalizeUnipileApiUrl(dsn: string): string {
  return (dsn.startsWith("http://") || dsn.startsWith("https://") ? dsn : `https://${dsn}`).replace(/\/$/, "");
}

function stripUndefined(input: UnipileJsonBody): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

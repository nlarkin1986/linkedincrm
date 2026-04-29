import { UnipileApiError } from "./errors";
import type {
  HostedAuthLinkRequest,
  HostedAuthLinkResponse,
  ListChatsParams,
  ListMessagesParams,
  PaginatedUnipileResponse,
  UnipileConfig
} from "./types";

export class UnipileClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: UnipileConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
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

  async listChats<T = unknown>(params: ListChatsParams): Promise<PaginatedUnipileResponse<T>> {
    const query = new URLSearchParams();
    query.set("account_id", params.accountId);
    query.set("account_type", params.accountType ?? "LINKEDIN");
    appendOptional(query, "after", params.after);
    appendOptional(query, "before", params.before);
    appendOptional(query, "cursor", params.cursor);
    appendOptional(query, "limit", params.limit);
    if (params.unread !== undefined) query.set("unread", String(params.unread));

    return this.request(`/chats?${query.toString()}`);
  }

  async listMessagesForChat<T = unknown>(
    chatId: string,
    cursor?: string
  ): Promise<PaginatedUnipileResponse<T>> {
    const query = new URLSearchParams();
    appendOptional(query, "cursor", cursor);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return this.request(`/chats/${encodeURIComponent(chatId)}/messages${suffix}`);
  }

  async listMessages<T = unknown>(params: ListMessagesParams): Promise<PaginatedUnipileResponse<T>> {
    const query = new URLSearchParams();
    query.set("account_id", params.accountId);
    appendOptional(query, "after", params.after);
    appendOptional(query, "before", params.before);
    appendOptional(query, "cursor", params.cursor);
    appendOptional(query, "limit", params.limit);
    appendOptional(query, "sender_id", params.senderId);

    return this.request(`/messages?${query.toString()}`);
  }

  async resyncAccount<T = unknown>(params: {
    accountId: string;
    partial?: boolean;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
    afterEpochMs?: number;
    beforeEpochMs?: number;
    chunkSize?: number;
  }): Promise<T> {
    const query = new URLSearchParams();
    appendOptional(query, "partial", params.partial);
    appendOptional(query, "linkedin_product", params.linkedinProduct);
    appendOptional(query, "after", params.afterEpochMs);
    appendOptional(query, "before", params.beforeEpochMs);
    appendOptional(query, "chunk_size", params.chunkSize);

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return this.request(`/accounts/${encodeURIComponent(params.accountId)}/sync${suffix}`);
  }

  async request<T>(
    path: string,
    options: {
      method?: string;
      headers?: HeadersInit;
      body?: BodyInit;
      json?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const body = options.json ? JSON.stringify(stripUndefined(options.json)) : options.body;
    const headers = new Headers(options.headers);
    headers.set("X-API-KEY", this.config.apiKey);
    headers.set("accept", "application/json");
    if (options.json) headers.set("content-type", "application/json");

    const res = await this.fetchImpl(`https://${this.config.dsn}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body
    });

    if (!res.ok) {
      throw new UnipileApiError(res.status, await res.text());
    }

    return (await res.json()) as T;
  }
}

function appendOptional(query: URLSearchParams, key: string, value: string | number | boolean | undefined) {
  if (value !== undefined) query.set(key, String(value));
}

function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

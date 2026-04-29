export type UnipileConfig = {
  dsn: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type PaginatedUnipileResponse<T> = {
  items: T[];
  cursor?: string | null;
};

export type HostedAuthLinkRequest = {
  type?: "create" | "reconnect";
  providers?: readonly "LINKEDIN"[] | "*";
  apiUrl: string;
  expiresOn: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  notifyUrl?: string;
  name?: string;
  reconnectAccount?: string;
};

export type HostedAuthLinkResponse = {
  object: "HostedAuthURL";
  url: string;
};

export type ListChatsParams = {
  accountId: string;
  accountType?: "LINKEDIN";
  after?: string;
  before?: string;
  cursor?: string;
  limit?: number;
  unread?: boolean;
};

export type ListMessagesParams = {
  accountId: string;
  after?: string;
  before?: string;
  cursor?: string;
  limit?: number;
  senderId?: string;
};

export type UnipileConfig = {
  dsn: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type UnipilePrimitive = string | number | boolean;

export type UnipileQueryParams = Record<string, UnipilePrimitive | null | undefined>;

export type UnipileJsonBody = Record<string, unknown>;

export type UnipileFormValue = string | number | boolean | Blob;

export type UnipileFormBody = Record<string, UnipileFormValue | UnipileFormValue[] | null | undefined>;

export type PaginatedUnipileResponse<T> = {
  items: T[];
  cursor?: string | null;
};

export type CursorPaginationParams = {
  cursor?: string;
  limit?: number;
};

export type HostedAuthLinkRequest = {
  type?: "create" | "reconnect";
  providers?: readonly UnipileProvider[] | "*";
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

export type UnipileProvider =
  | "LINKEDIN"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "MESSENGER"
  | "TELEGRAM"
  | "GOOGLE"
  | "OUTLOOK"
  | "IMAP"
  | "MAIL"
  | "CALENDAR"
  | "MOBILE";

export type ListAccountsParams = CursorPaginationParams;

export type AccountSyncParams = {
  accountId: string;
  partial?: boolean;
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
  afterEpochMs?: number;
  beforeEpochMs?: number;
  chunkSize?: number;
};

export type ListChatsParams = CursorPaginationParams & {
  accountId: string;
  accountType?: UnipileProvider;
  after?: string;
  before?: string;
  unread?: boolean;
};

export type ListMessagesParams = CursorPaginationParams & {
  accountId: string;
  after?: string;
  before?: string;
  senderId?: string;
};

export type SendMessageRequest = UnipileFormBody & {
  text?: string;
  attachments?: Blob | Blob[];
};

export type StartChatRequest = SendMessageRequest & {
  account_id: string;
  attendees_ids?: string | string[];
  title?: string;
  subject?: string;
};

export type LinkedInProduct = "classic" | "sales_navigator" | "recruiter";

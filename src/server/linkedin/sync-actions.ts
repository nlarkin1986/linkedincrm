import { assertOwnsRecord } from "@/server/auth/ownership";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";
import type { InngestQueueEvent } from "@/server/jobs/client";

export const LINKEDIN_INITIAL_SYNC_EVENT_NAME = "linkedin/account.sync_initial";
export const LINKEDIN_PARTIAL_SYNC_EVENT_NAME = "linkedin/account.sync_partial";

export type SyncQueue = {
  send(input: InngestQueueEvent): Promise<unknown>;
};

export type SyncAccountStore = {
  findLinkedInAccountById(id: string): Promise<LinkedInAccountRecord | null>;
};

export async function queueLinkedInPartialSync(input: {
  user: AuthIdentity;
  accountId: string;
  body: {
    after?: string;
    before?: string;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
  };
  store: SyncAccountStore;
  queue: SyncQueue;
}) {
  const account = assertOwnsRecord(input.user.id, await input.store.findLinkedInAccountById(input.accountId), "LinkedIn account");
  const after = input.body.after ? parseDate(input.body.after, "after") : null;
  const before = input.body.before ? parseDate(input.body.before, "before") : null;
  const linkedinProduct = input.body.linkedinProduct ?? account.linkedinProduct ?? null;

  await input.queue.send({
    id: createLinkedInPartialSyncEventId({
      unipileAccountId: account.unipileAccountId,
      after: after?.toISOString() ?? null,
      before: before?.toISOString() ?? null,
      linkedinProduct
    }),
    name: LINKEDIN_PARTIAL_SYNC_EVENT_NAME,
    data: {
      linkedinAccountId: account.id,
      after: after?.toISOString() ?? null,
      before: before?.toISOString() ?? null,
      linkedinProduct
    }
  });

  return {
    name: "syncLinkedInAccountPartial",
    linkedinAccountId: account.id,
    mode: "partial",
    after: after?.toISOString() ?? null,
    before: before?.toISOString() ?? null,
    linkedinProduct
  };
}

export async function queueLinkedInFullResync(input: {
  user: AuthIdentity;
  accountId: string;
  store: SyncAccountStore;
  queue: SyncQueue;
}) {
  const account = assertOwnsRecord(input.user.id, await input.store.findLinkedInAccountById(input.accountId), "LinkedIn account");

  await input.queue.send({
    id: createLinkedInInitialSyncEventId(account.unipileAccountId),
    name: LINKEDIN_INITIAL_SYNC_EVENT_NAME,
    data: {
      linkedinAccountId: account.id
    }
  });

  return {
    name: "syncLinkedInAccountInitial",
    linkedinAccountId: account.id,
    mode: "full"
  };
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} timestamp`);
  }
  return date;
}

export function createLinkedInInitialSyncEventId(unipileAccountId: string) {
  return `linkedin.account.sync_initial:${idSegment(unipileAccountId)}`;
}

export function createLinkedInPartialSyncEventId(input: {
  unipileAccountId: string;
  after: string | null;
  before: string | null;
  linkedinProduct: string | null;
}) {
  return [
    "linkedin.account.sync_partial",
    idSegment(input.unipileAccountId),
    idSegment(input.after),
    idSegment(input.before),
    idSegment(input.linkedinProduct)
  ].join(":");
}

function idSegment(value: string | null) {
  return value?.trim().replace(/[^a-zA-Z0-9_.-]/g, "_") || "none";
}

import { assertOwnsRecord } from "@/server/auth/ownership";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";

export type SyncQueue = {
  send(input: { name: string; data: Record<string, unknown> }): Promise<unknown>;
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

  await input.queue.send({
    name: "linkedin/account.sync_partial",
    data: {
      linkedinAccountId: account.id,
      after: after?.toISOString() ?? null,
      before: before?.toISOString() ?? null,
      linkedinProduct: input.body.linkedinProduct ?? account.linkedinProduct ?? null
    }
  });

  return {
    name: "syncLinkedInAccountPartial",
    linkedinAccountId: account.id,
    mode: "partial",
    after: after?.toISOString() ?? null,
    before: before?.toISOString() ?? null,
    linkedinProduct: input.body.linkedinProduct ?? account.linkedinProduct ?? null
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
    name: "linkedin/account.sync_initial",
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

import { AuthenticationError } from "@/server/auth/session";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";
import type { InngestQueueEvent } from "@/server/jobs/client";
import { extractUnipileAccountMetadata } from "@/server/unipile/account-metadata";
import { verifyHostedAuthClaimToken } from "@/server/unipile/connection";
import { createLinkedInInitialSyncEventId, LINKEDIN_INITIAL_SYNC_EVENT_NAME } from "./sync-actions";

export type ClaimConnectedAccountStore = {
  upsertLinkedInAccountFromHostedAuth(input: {
    userId: string;
    unipileAccountId: string;
    status: string;
    accountUserProviderId?: string | null;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
  }): Promise<LinkedInAccountRecord>;
};

export type ClaimConnectedAccountUnipileClient = {
  getAccount(accountId: string): Promise<unknown>;
};

export type ClaimConnectedAccountQueue = {
  send(input: InngestQueueEvent): Promise<unknown>;
};

export async function claimConnectedLinkedInAccount(input: {
  user: AuthIdentity;
  accountId: string;
  claimToken: string;
  claimSecret: string;
  store: ClaimConnectedAccountStore;
  unipile: ClaimConnectedAccountUnipileClient;
  queue: ClaimConnectedAccountQueue;
  now?: Date;
}) {
  const accountId = input.accountId.trim();
  if (!accountId) throw new Error("Missing LinkedIn account id");

  const claim = verifyHostedAuthClaimToken({
    token: input.claimToken,
    secret: input.claimSecret,
    now: input.now
  });
  if (claim.userId !== input.user.id) throw new AuthenticationError("Connected account claim does not match the signed-in user");

  const unipileAccount = await input.unipile.getAccount(accountId);
  const metadata = extractUnipileAccountMetadata(unipileAccount);
  const account = await input.store.upsertLinkedInAccountFromHostedAuth({
    userId: input.user.id,
    unipileAccountId: accountId,
    status: "OK",
    ...metadata
  });

  await input.queue.send({
    id: createLinkedInInitialSyncEventId(accountId),
    name: LINKEDIN_INITIAL_SYNC_EVENT_NAME,
    data: {
      linkedinAccountId: account.id
    }
  });

  return {
    linkedinAccountId: account.id,
    unipileAccountId: account.unipileAccountId,
    queuedInitialSync: true
  };
}

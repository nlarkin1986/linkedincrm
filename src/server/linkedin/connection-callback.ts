import { parseHostedAuthCallback } from "@/server/unipile/connection";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";
import type { InngestQueueEvent } from "@/server/jobs/client";
import { extractUnipileAccountMetadata } from "@/server/unipile/account-metadata";
import { createLinkedInInitialSyncEventId, LINKEDIN_INITIAL_SYNC_EVENT_NAME } from "./sync-actions";

export type HostedAuthCallbackStore = {
  upsertLinkedInAccountFromHostedAuth(input: {
    userId: string;
    unipileAccountId: string;
    status: string;
    accountUserProviderId?: string | null;
    linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
  }): Promise<LinkedInAccountRecord>;
};

export type HostedAuthCallbackQueue = {
  send(input: InngestQueueEvent): Promise<unknown>;
};

export async function handleHostedAuthCallback(input: {
  payload: unknown;
  store: HostedAuthCallbackStore;
  queue: HostedAuthCallbackQueue;
}) {
  const payload = parseHostedAuthCallback(input.payload);

  if (payload.status === "FAILED") {
    return {
      status: payload.status,
      unipileAccountId: payload.account_id,
      userId: payload.name,
      queuedInitialSync: false
    };
  }

  if (!payload.name) {
    throw new Error("Hosted auth callback is missing user name");
  }
  if (!payload.account_id) {
    throw new Error("Hosted auth callback is missing account_id");
  }
  const metadata = extractUnipileAccountMetadata(input.payload);

  const account = await input.store.upsertLinkedInAccountFromHostedAuth({
    userId: payload.name,
    unipileAccountId: payload.account_id,
    status: "OK",
    ...metadata
  });

  await input.queue.send({
    id: createLinkedInInitialSyncEventId(payload.account_id),
    name: LINKEDIN_INITIAL_SYNC_EVENT_NAME,
    data: {
      linkedinAccountId: account.id
    }
  });

  return {
    status: payload.status,
    unipileAccountId: account.unipileAccountId,
    userId: account.userId,
    linkedinAccountId: account.id,
    queuedInitialSync: true
  };
}

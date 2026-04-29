import { parseHostedAuthCallback } from "@/server/unipile/connection";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";

export type HostedAuthCallbackStore = {
  upsertLinkedInAccountFromHostedAuth(input: {
    userId: string;
    unipileAccountId: string;
    status: string;
  }): Promise<LinkedInAccountRecord>;
};

export type HostedAuthCallbackQueue = {
  send(input: { name: string; data: Record<string, unknown> }): Promise<unknown>;
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

  const account = await input.store.upsertLinkedInAccountFromHostedAuth({
    userId: payload.name,
    unipileAccountId: payload.account_id,
    status: "OK"
  });

  await input.queue.send({
    name: "linkedin/account.sync_initial",
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

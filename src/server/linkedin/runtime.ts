import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { findLinkedInAccountById } from "@/server/db/repositories/linkedin-accounts";
import { upsertLinkedInAccountFromHostedAuth } from "@/server/db/repositories/linkedin-accounts";
import type { SyncAccountStore, SyncQueue } from "./sync-actions";
import type { HostedAuthCallbackStore } from "./connection-callback";

export function createRuntimeSyncAccountStore(): SyncAccountStore {
  const db = createRuntimeDb();

  return {
    findLinkedInAccountById: (id) => findLinkedInAccountById(db, id)
  };
}

export function createRuntimeSyncQueue(): SyncQueue {
  return {
    send: (input) => inngest.send(input)
  };
}

export function createRuntimeHostedAuthCallbackStore(): HostedAuthCallbackStore {
  const db = createRuntimeDb();

  return {
    upsertLinkedInAccountFromHostedAuth: (input) => upsertLinkedInAccountFromHostedAuth(db, input)
  };
}

import { inngest } from "@/server/jobs/client";
import { readServerEnv } from "@/server/config/env";
import { createRuntimeDb } from "@/server/db/runtime";
import { findLinkedInAccountById } from "@/server/db/repositories/linkedin-accounts";
import { createRuntimeLinkedInSyncStore } from "@/server/jobs/runtime-sync-store";
import { syncLinkedInAccountInitial } from "@/server/jobs/linkedin-sync";
import { UnipileClient } from "@/server/unipile/client";

export const syncLinkedInAccountInitialFunction = inngest.createFunction(
  { id: "sync-linkedin-account-initial" },
  { event: "linkedin/account.sync_initial" },
  async ({ event }) => {
    const env = readServerEnv();
    const db = createRuntimeDb();
    const accountId = String(event.data.linkedinAccountId ?? "");
    const account = await findLinkedInAccountById(db, accountId);
    if (!account) throw new Error("LinkedIn account not found");

    const result = await syncLinkedInAccountInitial({
      account,
      unipile: new UnipileClient({ dsn: env.UNIPILE_DSN, apiKey: env.UNIPILE_API_KEY }),
      store: createRuntimeLinkedInSyncStore(db)
    });

    return result;
  }
);

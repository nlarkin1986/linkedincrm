import { inngest } from "@/server/jobs/client";
import { readServerEnvSubset } from "@/server/config/env";
import { createRuntimeDb } from "@/server/db/runtime";
import { findLinkedInAccountById } from "@/server/db/repositories/linkedin-accounts";
import { createRuntimeLinkedInSyncStore } from "@/server/jobs/runtime-sync-store";
import { syncLinkedInAccountPartial } from "@/server/jobs/linkedin-sync";
import { UnipileClient } from "@/server/unipile/client";

export const syncLinkedInAccountPartialFunction = inngest.createFunction(
  { id: "sync-linkedin-account-partial" },
  { event: "linkedin/account.sync_partial" },
  async ({ event }) => {
    const env = readServerEnvSubset(["DATABASE_URL", "UNIPILE_DSN", "UNIPILE_API_KEY"] as const);
    const db = createRuntimeDb(env.DATABASE_URL);
    const accountId = requireEventString(event.data.linkedinAccountId, "linkedinAccountId");
    const account = await findLinkedInAccountById(db, accountId);
    if (!account) throw new Error("LinkedIn account not found");
    if (typeof event.data.after !== "string") throw new Error("Partial sync requires after");

    return syncLinkedInAccountPartial({
      account,
      unipile: new UnipileClient({ dsn: env.UNIPILE_DSN, apiKey: env.UNIPILE_API_KEY }),
      store: createRuntimeLinkedInSyncStore(db),
      after: new Date(event.data.after),
      before: typeof event.data.before === "string" ? new Date(event.data.before) : undefined
    });
  }
);

function requireEventString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Event data missing ${field}`);
  }
  return value.trim();
}

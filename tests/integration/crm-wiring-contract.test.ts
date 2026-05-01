import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inngestFunctionEventNames, inngestFunctionIds } from "../../inngest/functions";

describe("CRM wiring contract", () => {
  it("keeps every externally reachable CRM entry point present", () => {
    const routeFiles = [
      "app/api/me/route.ts",
      "app/api/dashboard/route.ts",
      "app/api/import/artifact/route.ts",
      "app/api/linkedin/connect-url/route.ts",
      "app/api/linkedin/connection-callback/route.ts",
      "app/api/linkedin/claim-connected-account/route.ts",
      "app/api/linkedin/accounts/[id]/sync/route.ts",
      "app/api/linkedin/accounts/[id]/resync-full/route.ts",
      "app/api/webhooks/unipile/messaging/route.ts",
      "app/api/webhooks/unipile/account-status/route.ts",
      "app/api/webhooks/unipile/users/route.ts",
      "app/api/inngest/route.ts"
    ];

    expect(routeFiles.filter((file) => !existsSync(join(process.cwd(), file)))).toEqual([]);
  });

  it("maps queued CRM events to registered Inngest functions", () => {
    expect(new Set(inngestFunctionEventNames)).toEqual(new Set([
      "linkedin/chat.import_messages",
      "linkedin/account.sync_initial",
      "linkedin/account.sync_partial",
      "unipile/webhook.messaging",
      "unipile/webhook.account_status",
      "unipile/webhook.users"
    ]));
    expect(new Set(inngestFunctionIds)).toEqual(new Set([
      "import-chat-messages",
      "sync-linkedin-account-initial",
      "sync-linkedin-account-partial",
      "process-unipile-message-webhook",
      "process-unipile-account-status-webhook",
      "process-unipile-user-webhook"
    ]));
  });
});

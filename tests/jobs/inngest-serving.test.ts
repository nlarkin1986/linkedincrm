import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET, POST, PUT } from "../../app/api/inngest/route";
import {
  inngestFunctionEventNames,
  inngestFunctionIds,
  inngestFunctionRegistry,
  inngestFunctions
} from "../../inngest/functions";

describe("Inngest serving", () => {
  it("exposes App Router handlers for discovery and execution", () => {
    expect(GET).toEqual(expect.any(Function));
    expect(POST).toEqual(expect.any(Function));
    expect(PUT).toEqual(expect.any(Function));
  });

  it("serves every CRM job function from the central registry", () => {
    expect(inngestFunctions).toHaveLength(inngestFunctionRegistry.length);
    expect(inngestFunctionIds).toEqual([
      "import-chat-messages",
      "process-unipile-account-status-webhook",
      "process-unipile-message-webhook",
      "process-unipile-user-webhook",
      "sync-linkedin-account-initial",
      "sync-linkedin-account-partial"
    ]);
    expect(inngestFunctionEventNames).toEqual([
      "linkedin/chat.import_messages",
      "unipile/webhook.account_status",
      "unipile/webhook.messaging",
      "unipile/webhook.users",
      "linkedin/account.sync_initial",
      "linkedin/account.sync_partial"
    ]);
  });

  it("fails when a function file is added without updating the registry contract", () => {
    const sourceFiles = readdirSync(join(process.cwd(), "inngest/functions"))
      .filter((file) => file.endsWith(".ts") && file !== "index.ts")
      .sort();

    expect(sourceFiles).toEqual([
      "import-chat-messages.ts",
      "process-unipile-account-status-webhook.ts",
      "process-unipile-message-webhook.ts",
      "process-unipile-user-webhook.ts",
      "sync-linkedin-account-initial.ts",
      "sync-linkedin-account-partial.ts"
    ]);
  });
});

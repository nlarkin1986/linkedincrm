import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { processStoredAccountStatusWebhook } from "@/server/webhooks/runtime-processing";

export const processUnipileAccountStatusWebhookFunction = inngest.createFunction(
  { id: "process-unipile-account-status-webhook" },
  { event: "unipile/webhook.account_status" },
  async ({ event }) => {
    return processStoredAccountStatusWebhook(createRuntimeDb(), String(event.data.webhookEventId ?? ""));
  }
);

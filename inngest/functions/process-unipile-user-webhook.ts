import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { processStoredUserWebhook } from "@/server/webhooks/runtime-processing";

export const processUnipileUserWebhookFunction = inngest.createFunction(
  { id: "process-unipile-user-webhook" },
  { event: "unipile/webhook.users" },
  async ({ event }) => {
    return processStoredUserWebhook(createRuntimeDb(), String(event.data.webhookEventId ?? ""));
  }
);

import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { processStoredUserWebhook } from "@/server/webhooks/runtime-processing";

export const processUnipileUserWebhookFunction = inngest.createFunction(
  { id: "process-unipile-user-webhook" },
  { event: "unipile/webhook.users" },
  async ({ event }) => {
    return processStoredUserWebhook(createRuntimeDb(), requireEventString(event.data.webhookEventId, "webhookEventId"));
  }
);

function requireEventString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Event data missing ${field}`);
  }
  return value.trim();
}

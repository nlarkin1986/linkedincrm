import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { processStoredMessagingWebhook } from "@/server/webhooks/runtime-processing";

export const processUnipileMessageWebhookFunction = inngest.createFunction(
  { id: "process-unipile-message-webhook" },
  { event: "unipile/webhook.messaging" },
  async ({ event }) => {
    return processStoredMessagingWebhook(createRuntimeDb(), requireEventString(event.data.webhookEventId, "webhookEventId"));
  }
);

function requireEventString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Event data missing ${field}`);
  }
  return value.trim();
}

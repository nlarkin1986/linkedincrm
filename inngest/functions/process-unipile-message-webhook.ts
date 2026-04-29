import { inngest } from "@/server/jobs/client";

export const processUnipileMessageWebhookFunction = inngest.createFunction(
  { id: "process-unipile-message-webhook" },
  { event: "unipile/webhook.messaging" },
  async ({ event }) => {
    return {
      status: "accepted",
      webhookEventId: event.data.webhookEventId
    };
  }
);

import { inngest } from "@/server/jobs/client";

export const processUnipileUserWebhookFunction = inngest.createFunction(
  { id: "process-unipile-user-webhook" },
  { event: "unipile/webhook.users" },
  async ({ event }) => {
    return {
      status: "accepted",
      webhookEventId: event.data.webhookEventId
    };
  }
);

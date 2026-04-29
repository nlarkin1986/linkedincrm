import { inngest } from "@/server/jobs/client";

export const processUnipileAccountStatusWebhookFunction = inngest.createFunction(
  { id: "process-unipile-account-status-webhook" },
  { event: "unipile/webhook.account_status" },
  async ({ event }) => {
    return {
      status: "accepted",
      webhookEventId: event.data.webhookEventId
    };
  }
);

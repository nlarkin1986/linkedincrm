import { inngest } from "@/server/jobs/client";
import { createRuntimeDb } from "@/server/db/runtime";
import { unipileWebhookEvents } from "@/server/db/schema";
import type { WebhookEventQueue, WebhookEventStore } from "./unipile-route";

let testWebhookEventId = 0;

export function createRuntimeWebhookEventStore(): WebhookEventStore {
  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL) {
    return {
      async insertWebhookEvent() {
        testWebhookEventId += 1;
        return { id: `test_webhook_event_${testWebhookEventId}` };
      }
    };
  }

  const db = createRuntimeDb();

  return {
    async insertWebhookEvent(input) {
      const [event] = await db
        .insert(unipileWebhookEvents)
        .values({
          eventType: input.eventType,
          unipileAccountId: input.unipileAccountId,
          externalEventId: input.externalEventId,
          payload: input.payload,
          processingStatus: input.processingStatus
        })
        .returning({ id: unipileWebhookEvents.id });

      if (!event) throw new Error("Unable to persist webhook event");
      return event;
    }
  };
}

export function createRuntimeWebhookQueue(): WebhookEventQueue {
  if (process.env.NODE_ENV === "test" && !process.env.INNGEST_EVENT_KEY) {
    return {
      async send() {}
    };
  }

  return {
    send: (input) => inngest.send(input)
  };
}

import { and, eq } from "drizzle-orm";
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
        return { id: `test_webhook_event_${testWebhookEventId}`, duplicate: false };
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
        .onConflictDoNothing({
          target: [unipileWebhookEvents.eventType, unipileWebhookEvents.externalEventId]
        })
        .returning({ id: unipileWebhookEvents.id });

      if (event) return { id: event.id, duplicate: false };
      if (!input.externalEventId) throw new Error("Unable to persist webhook event");

      const [existingEvent] = await db
        .select({ id: unipileWebhookEvents.id })
        .from(unipileWebhookEvents)
        .where(and(
          eq(unipileWebhookEvents.eventType, input.eventType),
          eq(unipileWebhookEvents.externalEventId, input.externalEventId)
        ))
        .limit(1);

      if (!existingEvent) throw new Error("Unable to load duplicate webhook event");
      return { id: existingEvent.id, duplicate: true };
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

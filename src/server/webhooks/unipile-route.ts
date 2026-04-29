import { NextResponse } from "next/server";
import { readOptionalServerEnv } from "@/server/config/env";
import { verifyUnipileWebhook, WebhookAuthError } from "./unipile-auth";
import { buildStoredWebhookEvent, type StoredWebhookEvent } from "./unipile-events";

export type WebhookEventStore = {
  insertWebhookEvent(input: StoredWebhookEvent): Promise<{ id: string }>;
};

export type WebhookEventQueue = {
  send(input: { name: string; data: Record<string, unknown> }): Promise<unknown>;
};

export async function readVerifiedUnipileWebhookPayload(request: Request): Promise<Record<string, unknown>> {
  verifyUnipileWebhook(request.headers, readOptionalServerEnv().UNIPILE_WEBHOOK_SECRET);

  const payload = await request.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Webhook payload must be an object");
  }

  return payload as Record<string, unknown>;
}

export function unipileWebhookErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof WebhookAuthError) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 400 }
  );
}

export async function acceptUnipileWebhook(input: {
  eventType: string;
  queueEventName: string;
  payload: Record<string, unknown>;
  store: WebhookEventStore;
  queue: WebhookEventQueue;
}) {
  const storedEvent = buildStoredWebhookEvent(input.eventType, input.payload);
  const event = await input.store.insertWebhookEvent(storedEvent);

  await input.queue.send({
    name: input.queueEventName,
    data: {
      webhookEventId: event.id
    }
  });

  return { id: event.id, ...storedEvent };
}

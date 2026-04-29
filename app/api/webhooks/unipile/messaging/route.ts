import { NextResponse } from "next/server";
import { acceptUnipileWebhook, readVerifiedUnipileWebhookPayload, unipileWebhookErrorResponse } from "@/server/webhooks/unipile-route";
import { createRuntimeWebhookEventStore, createRuntimeWebhookQueue } from "@/server/webhooks/runtime";

export async function POST(request: Request) {
  try {
    const payload = await readVerifiedUnipileWebhookPayload(request);
    const event = await acceptUnipileWebhook({
      eventType: "messaging",
      queueEventName: "unipile/webhook.messaging",
      payload,
      store: createRuntimeWebhookEventStore(),
      queue: createRuntimeWebhookQueue()
    });

    return NextResponse.json({ accepted: true, event }, { status: 200 });
  } catch (error) {
    return unipileWebhookErrorResponse(error, "Invalid messaging webhook");
  }
}

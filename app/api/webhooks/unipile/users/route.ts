import { NextResponse } from "next/server";
import { parseNewRelationWebhook } from "@/server/webhooks/unipile-events";
import { acceptUnipileWebhook, readVerifiedUnipileWebhookPayload, unipileWebhookErrorResponse } from "@/server/webhooks/unipile-route";
import { createRuntimeWebhookEventStore, createRuntimeWebhookQueue } from "@/server/webhooks/runtime";

export async function POST(request: Request) {
  try {
    const payload = await readVerifiedUnipileWebhookPayload(request);
    const relation = parseNewRelationWebhook(payload);
    const event = await acceptUnipileWebhook({
      eventType: "users",
      queueEventName: "unipile/webhook.users",
      payload,
      store: createRuntimeWebhookEventStore(),
      queue: createRuntimeWebhookQueue()
    });

    return NextResponse.json(
      { accepted: true, event, relation },
      { status: 200 }
    );
  } catch (error) {
    return unipileWebhookErrorResponse(error, "Invalid users webhook");
  }
}

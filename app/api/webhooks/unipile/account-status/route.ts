import { NextResponse } from "next/server";
import { parseAccountStatusWebhook } from "@/server/webhooks/unipile-events";
import { acceptUnipileWebhook, readVerifiedUnipileWebhookPayload, unipileWebhookErrorResponse } from "@/server/webhooks/unipile-route";
import { createRuntimeWebhookEventStore, createRuntimeWebhookQueue } from "@/server/webhooks/runtime";

export async function POST(request: Request) {
  try {
    const payload = await readVerifiedUnipileWebhookPayload(request);
    const accountStatus = parseAccountStatusWebhook(payload);
    const event = await acceptUnipileWebhook({
      eventType: "account-status",
      queueEventName: "unipile/webhook.account_status",
      payload,
      store: createRuntimeWebhookEventStore(),
      queue: createRuntimeWebhookQueue()
    });

    return NextResponse.json(
      { accepted: true, event, accountStatus },
      { status: 200 }
    );
  } catch (error) {
    return unipileWebhookErrorResponse(error, "Invalid account status webhook");
  }
}

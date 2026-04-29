import { NextResponse } from "next/server";
import { readOptionalServerEnv } from "@/server/config/env";
import { verifyUnipileWebhook, WebhookAuthError } from "@/server/webhooks/unipile-auth";
import { buildStoredWebhookEvent } from "@/server/webhooks/unipile-events";

export async function POST(request: Request) {
  try {
    verifyUnipileWebhook(request.headers, readOptionalServerEnv().UNIPILE_WEBHOOK_SECRET);
    const payload = await readPayload(request);
    const event = buildStoredWebhookEvent("messaging", payload);

    return NextResponse.json({ accepted: true, event }, { status: 200 });
  } catch (error) {
    if (error instanceof WebhookAuthError) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid messaging webhook" },
      { status: 400 }
    );
  }
}

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const payload = await request.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Webhook payload must be an object");
  }
  return payload as Record<string, unknown>;
}

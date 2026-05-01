import { NextResponse } from "next/server";
import { readOptionalServerEnv } from "@/server/config/env";
import { verifyUnipileWebhook, WebhookAuthError } from "@/server/webhooks/unipile-auth";
import { handleHostedAuthCallback } from "@/server/linkedin/connection-callback";
import { createRuntimeHostedAuthCallbackStore, createRuntimeSyncQueue } from "@/server/linkedin/runtime";

export async function POST(request: Request) {
  try {
    const secret = readOptionalServerEnv().UNIPILE_WEBHOOK_SECRET;
    verifyUnipileWebhook(request.headers, secret);
    const result = await handleHostedAuthCallback({
      payload: await request.json(),
      store: createRuntimeHostedAuthCallbackStore(),
      queue: createRuntimeSyncQueue()
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WebhookAuthError) {
      return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid connection callback" },
      { status: 400 }
    );
  }
}

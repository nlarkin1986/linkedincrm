import { NextResponse } from "next/server";
import { AuthenticationError } from "@/server/auth/session";
import {
  appUserOwnershipIdentity,
  requireRequestAppUser,
  runtimeRequestAppUserConfig
} from "@/server/auth/request-app-user";
import { readServerEnv } from "@/server/config/env";
import { createRuntimeDb } from "@/server/db/runtime";
import { claimConnectedLinkedInAccount } from "@/server/linkedin/claim-connected-account";
import { createRuntimeClaimConnectedAccountStore, createRuntimeSyncQueue } from "@/server/linkedin/runtime";
import { UnipileApiError } from "@/server/unipile/errors";
import { UnipileClient } from "@/server/unipile/client";

export async function POST(request: Request) {
  try {
    const env = readServerEnv();
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, createRuntimeDb()));
    const user = appUserOwnershipIdentity(appUser);
    const body = await request.json().catch(() => ({}));
    if (typeof body.accountId !== "string" || typeof body.claimToken !== "string") {
      return NextResponse.json({ error: "Missing connected account claim" }, { status: 400 });
    }

    const result = await claimConnectedLinkedInAccount({
      user,
      accountId: body.accountId,
      claimToken: body.claimToken,
      claimSecret: env.UNIPILE_WEBHOOK_SECRET,
      store: createRuntimeClaimConnectedAccountStore(),
      unipile: new UnipileClient({ dsn: env.UNIPILE_DSN, apiKey: env.UNIPILE_API_KEY }),
      queue: createRuntimeSyncQueue()
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof UnipileApiError) {
      return NextResponse.json({ error: "Unable to verify connected LinkedIn account" }, { status: 502 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to claim connected LinkedIn account" },
      { status: 400 }
    );
  }
}

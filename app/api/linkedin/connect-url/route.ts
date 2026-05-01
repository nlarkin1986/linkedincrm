import { NextResponse } from "next/server";
import { readServerEnvSubset } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import {
  appUserOwnershipIdentity,
  requireRequestAppUser,
  runtimeRequestAppUserConfig
} from "@/server/auth/request-app-user";
import { AuthorizationError } from "@/server/auth/permissions";
import { buildHostedAuthLinkInput, createHostedAuthClaimToken } from "@/server/unipile/connection";
import { normalizeUnipileApiUrl, UnipileClient } from "@/server/unipile/client";
import { getConfiguredAppBaseUrl } from "@/server/http/app-origin";
import { createRuntimeDb } from "@/server/db/runtime";
import { findLinkedInAccountById } from "@/server/db/repositories/linkedin-accounts";
import { resolveReconnectUnipileAccountId } from "@/server/linkedin/connect-url";

export async function POST(request: Request) {
  try {
    const env = readServerEnvSubset([
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "APP_BASE_URL",
      "UNIPILE_DSN",
      "UNIPILE_API_KEY",
      "UNIPILE_WEBHOOK_SECRET"
    ] as const, { requireSupabasePublicKey: true });
    const db = createRuntimeDb(env.DATABASE_URL);
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, db));
    const user = appUserOwnershipIdentity(appUser);
    const body = await request.json().catch(() => ({}));
    const appBaseUrl = getConfiguredAppBaseUrl(env.APP_BASE_URL, request.url);
    const reconnectAccountId = await resolveReconnectUnipileAccountId({
      user,
      reconnectAccountId: body.reconnectAccountId,
      store: {
        findLinkedInAccountById: (id) => findLinkedInAccountById(db, id)
      }
    });
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000);
    const claimToken = createHostedAuthClaimToken({
      userId: user.id,
      expiresOn,
      secret: env.UNIPILE_WEBHOOK_SECRET
    });
    const client = new UnipileClient({ dsn: env.UNIPILE_DSN, apiKey: env.UNIPILE_API_KEY });
    const hostedAuthInput = buildHostedAuthLinkInput({
      user,
      appBaseUrl,
      expiresOn,
      claimToken,
      reconnectAccountId
    });
    const link = await client.createHostedAuthLink({
      ...hostedAuthInput,
      apiUrl: normalizeUnipileApiUrl(env.UNIPILE_DSN)
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Unipile connection URL" },
      { status: 500 }
    );
  }
}

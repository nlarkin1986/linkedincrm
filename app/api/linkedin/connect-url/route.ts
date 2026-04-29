import { NextResponse } from "next/server";
import { readServerEnv } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAuthIdentity } from "@/server/auth/request-session";
import { buildHostedAuthLinkInput } from "@/server/unipile/connection";
import { UnipileClient } from "@/server/unipile/client";
import { getConfiguredAppBaseUrl } from "@/server/http/app-origin";

export async function POST(request: Request) {
  try {
    const env = readServerEnv();
    const user = await requireRequestAuthIdentity(request, {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    const body = await request.json().catch(() => ({}));
    const appBaseUrl = getConfiguredAppBaseUrl(env.APP_BASE_URL, request.url);
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000);
    const client = new UnipileClient({ dsn: env.UNIPILE_DSN, apiKey: env.UNIPILE_API_KEY });
    const hostedAuthInput = buildHostedAuthLinkInput({
      user,
      appBaseUrl,
      expiresOn,
      reconnectAccountId: body.reconnectAccountId
    });
    const link = await client.createHostedAuthLink({
      ...hostedAuthInput,
      apiUrl: `https://${env.UNIPILE_DSN}`
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Unipile connection URL" },
      { status: 500 }
    );
  }
}

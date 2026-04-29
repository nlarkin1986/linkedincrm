import { NextResponse } from "next/server";
import { readServerEnv } from "@/server/config/env";
import { AuthenticationError, requireAuthIdentity } from "@/server/auth/session";
import { buildHostedAuthLinkInput } from "@/server/unipile/connection";
import { UnipileClient } from "@/server/unipile/client";

export async function POST(request: Request) {
  try {
    const env = readServerEnv();
    const user = requireAuthIdentity({
      user: {
        id: request.headers.get("x-auth-user-id") ?? "",
        email: request.headers.get("x-auth-email") ?? ""
      }
    });
    const body = await request.json().catch(() => ({}));
    const appBaseUrl = body.appBaseUrl ?? new URL(request.url).origin;
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

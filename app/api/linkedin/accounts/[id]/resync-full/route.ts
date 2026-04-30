import { NextResponse } from "next/server";
import { readServerEnv, readSupabasePublicKey } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAuthIdentity } from "@/server/auth/request-session";
import { AuthorizationError } from "@/server/auth/permissions";
import { queueLinkedInFullResync } from "@/server/linkedin/sync-actions";
import { createRuntimeSyncAccountStore, createRuntimeSyncQueue } from "@/server/linkedin/runtime";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const env = readServerEnv();
    const user = await requireRequestAuthIdentity(request, {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: readSupabasePublicKey(env) ?? ""
    });
    const { id } = await context.params;
    const job = await queueLinkedInFullResync({
      user,
      accountId: id,
      store: createRuntimeSyncAccountStore(),
      queue: createRuntimeSyncQueue()
    });

    return NextResponse.json(
      { job },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Unable to queue full LinkedIn resync" }, { status: 400 });
  }
}

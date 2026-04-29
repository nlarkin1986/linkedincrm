import { NextResponse } from "next/server";
import { readServerEnv } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAuthIdentity } from "@/server/auth/request-session";
import { AuthorizationError } from "@/server/auth/permissions";
import { queueLinkedInPartialSync } from "@/server/linkedin/sync-actions";
import { createRuntimeSyncAccountStore, createRuntimeSyncQueue } from "@/server/linkedin/runtime";

type SyncRequestBody = {
  mode?: "partial";
  after?: string;
  before?: string;
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const env = readServerEnv();
    const user = await requireRequestAuthIdentity(request, {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as SyncRequestBody;
    const job = await queueLinkedInPartialSync({
      user,
      accountId: id,
      body,
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue LinkedIn sync" },
      { status: 400 }
    );
  }
}

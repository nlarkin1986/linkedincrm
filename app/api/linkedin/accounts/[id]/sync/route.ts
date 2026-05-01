import { NextResponse } from "next/server";
import { readServerEnvSubset } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import {
  appUserOwnershipIdentity,
  requireRequestAppUser,
  runtimeRequestAppUserConfig
} from "@/server/auth/request-app-user";
import { AuthorizationError } from "@/server/auth/permissions";
import { queueLinkedInPartialSync } from "@/server/linkedin/sync-actions";
import { createRuntimeSyncAccountStore, createRuntimeSyncQueue } from "@/server/linkedin/runtime";
import { createRuntimeDb } from "@/server/db/runtime";

type SyncRequestBody = {
  mode?: "partial";
  after?: string;
  before?: string;
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const env = readServerEnvSubset(["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const, { requireSupabasePublicKey: true });
    const db = createRuntimeDb(env.DATABASE_URL);
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, db));
    const user = appUserOwnershipIdentity(appUser);
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

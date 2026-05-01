import { NextResponse } from "next/server";
import { prepareArtifactImport } from "@/server/import/artifact-import";
import { persistArtifactImport } from "@/server/import/artifact-persistence";
import { createRuntimeArtifactImportStore } from "@/server/import/runtime";
import { readServerEnvSubset } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/permissions";
import {
  appUserOwnershipIdentity,
  requireRequestAppUser,
  runtimeRequestAppUserConfig
} from "@/server/auth/request-app-user";
import { createRuntimeDb } from "@/server/db/runtime";

export async function POST(request: Request) {
  try {
    const env = readServerEnvSubset(["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const, { requireSupabasePublicKey: true });
    const db = createRuntimeDb(env.DATABASE_URL);
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, db));
    const user = appUserOwnershipIdentity(appUser);
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;
    const linkedinAccountId = typeof body?.linkedinAccountId === "string" ? body.linkedinAccountId : null;

    if (!rows) {
      return NextResponse.json({ error: "Expected rows array" }, { status: 400 });
    }
    if (!linkedinAccountId) {
      return NextResponse.json({ error: "Expected linkedinAccountId" }, { status: 400 });
    }

    const prepared = prepareArtifactImport(rows);
    const result = await persistArtifactImport({
      user,
      linkedinAccountId,
      rows: prepared,
      store: createRuntimeArtifactImportStore()
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import artifact rows" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { prepareArtifactImport } from "@/server/import/artifact-import";
import { persistArtifactImport } from "@/server/import/artifact-persistence";
import { createRuntimeArtifactImportStore } from "@/server/import/runtime";
import { readServerEnv, readSupabasePublicKey } from "@/server/config/env";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAuthIdentity } from "@/server/auth/request-session";

export async function POST(request: Request) {
  try {
    const env = readServerEnv();
    const user = await requireRequestAuthIdentity(request, {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: readSupabasePublicKey(env) ?? ""
    });
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import artifact rows" },
      { status: 400 }
    );
  }
}

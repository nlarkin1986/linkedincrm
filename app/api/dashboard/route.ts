import { NextResponse } from "next/server";
import { extractBearerToken } from "@/server/auth/request-session";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAppUser, runtimeRequestAppUserConfig } from "@/server/auth/request-app-user";
import { readServerEnv } from "@/server/config/env";
import { createRuntimeDb } from "@/server/db/runtime";
import { buildDashboardResponse, findDashboardRelationshipsByUserId } from "@/server/dashboard/current-user-dashboard";

export async function GET(request: Request) {
  try {
    if (!extractBearerToken(request.headers)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const env = readServerEnv();
    const db = createRuntimeDb();
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, db));
    const rows = await findDashboardRelationshipsByUserId(db, appUser.id);

    return NextResponse.json(buildDashboardResponse(rows));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load dashboard" },
      { status: 500 }
    );
  }
}

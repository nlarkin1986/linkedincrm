import { NextResponse } from "next/server";
import { AuthenticationError } from "@/server/auth/session";
import { requireRequestAppUser, runtimeRequestAppUserConfig } from "@/server/auth/request-app-user";
import { buildCurrentUserStatus } from "@/server/auth/current-user-status";
import { readServerEnv } from "@/server/config/env";
import { createRuntimeDb } from "@/server/db/runtime";
import { findLinkedInAccountsByUserId } from "@/server/db/repositories/linkedin-accounts";

export async function GET(request: Request) {
  try {
    const env = readServerEnv();
    const db = createRuntimeDb();
    const { appUser } = await requireRequestAppUser(request, runtimeRequestAppUserConfig(env, db));
    const linkedinAccounts = await findLinkedInAccountsByUserId(db, appUser.id);

    return NextResponse.json(buildCurrentUserStatus({ appUser, linkedinAccounts }));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load current user" },
      { status: 500 }
    );
  }
}

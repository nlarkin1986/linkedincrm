import { readSupabasePublicKey, type ServerEnv } from "@/server/config/env";
import { upsertAppUserFromIdentity, type AppUserRecord } from "@/server/db/repositories/app-users";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { Database } from "@/server/db/client";
import { requireRequestAuthIdentity, type RequestAuthConfig } from "./request-session";

export type RequestAppUserConfig = RequestAuthConfig & {
  upsertAppUser?: (identity: AuthIdentity) => Promise<AppUserRecord>;
};

export type RequestAppUserResult = {
  authIdentity: AuthIdentity;
  appUser: AppUserRecord;
};

export async function requireRequestAppUser(
  request: Request,
  config: RequestAppUserConfig
): Promise<RequestAppUserResult> {
  const authIdentity = await requireRequestAuthIdentity(request, config);
  const appUser = await config.upsertAppUser?.(authIdentity);
  if (appUser) return { authIdentity, appUser };

  throw new Error("App user persistence is not configured");
}

export function runtimeRequestAppUserConfig(env: ServerEnv, db: Database): RequestAppUserConfig {
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: readSupabasePublicKey(env) ?? "",
    upsertAppUser: (identity) => upsertAppUserFromIdentity(db, identity)
  };
}

export function appUserOwnershipIdentity(appUser: AppUserRecord): AuthIdentity {
  return {
    id: appUser.id,
    email: appUser.email,
    fullName: appUser.fullName
  };
}

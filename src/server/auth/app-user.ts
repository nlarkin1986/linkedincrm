import type { AppUserRecord, AuthIdentity } from "@/server/db/repositories/app-users";
import { buildAppUserFromIdentity, normalizeEmail } from "@/server/db/repositories/app-users";

export function reconcileAppUser(existing: AppUserRecord | null, identity: AuthIdentity): AppUserRecord {
  if (!existing) return buildAppUserFromIdentity(identity);

  return {
    ...existing,
    authUserId: identity.id,
    email: normalizeEmail(identity.email),
    fullName: identity.fullName ?? existing.fullName
  };
}

import type { AppUserRole } from "../schema";
import { appUsers } from "../schema";
import type { Database } from "@/server/db/client";

export type AppUserRecord = {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: AppUserRole;
};

export type AuthIdentity = {
  id: string;
  email: string;
  fullName?: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildAppUserFromIdentity(identity: AuthIdentity, fallbackId = identity.id): AppUserRecord {
  return {
    id: fallbackId,
    authUserId: identity.id,
    email: normalizeEmail(identity.email),
    fullName: identity.fullName ?? null,
    role: "ae"
  };
}

export async function upsertAppUserFromIdentity(db: Database, identity: AuthIdentity): Promise<AppUserRecord> {
  const user = buildAppUserFromIdentity(identity);
  const [record] = await db
    .insert(appUsers)
    .values(user)
    .onConflictDoUpdate({
      target: appUsers.authUserId,
      set: {
        email: user.email,
        fullName: user.fullName,
        updatedAt: new Date()
      }
    })
    .returning();

  if (!record) throw new Error("Unable to upsert app user");

  return {
    id: record.id,
    authUserId: record.authUserId,
    email: record.email,
    fullName: record.fullName,
    role: record.role ?? "ae"
  };
}

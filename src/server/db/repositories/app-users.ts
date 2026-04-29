import type { AppUserRole } from "../schema";

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

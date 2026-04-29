import type { AppUserRecord } from "@/server/db/repositories/app-users";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isAdmin(user: Pick<AppUserRecord, "role">): boolean {
  return user.role === "admin";
}

export function requireAdmin(user: Pick<AppUserRecord, "role">): void {
  if (!isAdmin(user)) {
    throw new AuthorizationError("Admin access required");
  }
}

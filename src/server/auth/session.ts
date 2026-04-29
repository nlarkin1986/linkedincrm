import { buildAppUserFromIdentity, type AppUserRecord, type AuthIdentity } from "@/server/db/repositories/app-users";

export type AuthSession = {
  user: AuthIdentity | null;
};

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function requireAuthIdentity(session: AuthSession): AuthIdentity {
  if (!session.user?.id || !session.user.email) {
    throw new AuthenticationError();
  }

  return session.user;
}

export function appUserFromSession(session: AuthSession): AppUserRecord {
  return buildAppUserFromIdentity(requireAuthIdentity(session));
}

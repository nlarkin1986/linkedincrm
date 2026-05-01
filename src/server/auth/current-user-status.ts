import type { AppUserRecord } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";
import { isHealthyLinkedInAccount } from "@/server/db/repositories/linkedin-accounts";

export type CurrentUserStatus = {
  user: {
    id: string;
    email: string;
    displayName: string;
    initials: string;
    role: AppUserRecord["role"];
  };
  linkedin: {
    state: "not_connected" | "connected" | "reconnect_required";
    accounts: Array<{
      id: string;
      status: string;
      reconnectRequired: boolean;
      linkedinProduct?: LinkedInAccountRecord["linkedinProduct"];
      lastFullSyncAt?: string | null;
      lastPartialSyncAt?: string | null;
    }>;
  };
};

export function buildCurrentUserStatus(input: {
  appUser: AppUserRecord;
  linkedinAccounts: LinkedInAccountRecord[];
}): CurrentUserStatus {
  const displayName = input.appUser.fullName?.trim() || input.appUser.email;
  const hasReconnectRequired = input.linkedinAccounts.some((account) => account.reconnectRequired);
  const hasConnectedAccount = input.linkedinAccounts.some(isHealthyLinkedInAccount);

  return {
    user: {
      id: input.appUser.id,
      email: input.appUser.email,
      displayName,
      initials: initialsForUser(displayName, input.appUser.email),
      role: input.appUser.role
    },
    linkedin: {
      state: hasReconnectRequired ? "reconnect_required" : hasConnectedAccount ? "connected" : "not_connected",
      accounts: input.linkedinAccounts.map((account) => ({
        id: account.id,
        status: account.status,
        reconnectRequired: account.reconnectRequired,
        linkedinProduct: account.linkedinProduct,
        lastFullSyncAt: account.lastFullSyncAt?.toISOString() ?? null,
        lastPartialSyncAt: account.lastPartialSyncAt?.toISOString() ?? null
      }))
    }
  };
}

export function initialsForUser(displayName: string, email: string): string {
  const nameParts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  if (nameParts.length === 1 && !nameParts[0].includes("@")) return nameParts[0].slice(0, 2).toUpperCase();

  const localPart = email.split("@")[0] ?? email;
  return localPart.slice(0, 2).toUpperCase();
}

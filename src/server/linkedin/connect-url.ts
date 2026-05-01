import { assertOwnsRecord } from "@/server/auth/ownership";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";

export type ConnectUrlAccountStore = {
  findLinkedInAccountById(id: string): Promise<LinkedInAccountRecord | null>;
};

export async function resolveReconnectUnipileAccountId(input: {
  user: AuthIdentity;
  reconnectAccountId?: unknown;
  store: ConnectUrlAccountStore;
}): Promise<string | undefined> {
  if (typeof input.reconnectAccountId !== "string" || !input.reconnectAccountId.trim()) {
    return undefined;
  }

  const account = assertOwnsRecord(
    input.user.id,
    await input.store.findLinkedInAccountById(input.reconnectAccountId.trim()),
    "LinkedIn account"
  );
  return account.unipileAccountId;
}

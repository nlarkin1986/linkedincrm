import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { linkedinAccounts } from "@/server/db/schema";

export type LinkedInAccountRecord = {
  id: string;
  userId: string;
  unipileAccountId: string;
  status: string;
  reconnectRequired: boolean;
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
};

export function isHealthyLinkedInAccount(account: Pick<LinkedInAccountRecord, "status" | "reconnectRequired">) {
  return account.status === "OK" && !account.reconnectRequired;
}

export async function findLinkedInAccountById(
  db: Database,
  id: string
): Promise<LinkedInAccountRecord | null> {
  const [account] = await db
    .select()
    .from(linkedinAccounts)
    .where(eq(linkedinAccounts.id, id))
    .limit(1);

  return account
    ? {
      id: account.id,
      userId: account.userId,
      unipileAccountId: account.unipileAccountId,
      status: account.status ?? "pending",
      reconnectRequired: account.reconnectRequired ?? false,
      linkedinProduct: account.linkedinProduct
    }
    : null;
}

export async function upsertLinkedInAccountFromHostedAuth(
  db: Database,
  input: {
    userId: string;
    unipileAccountId: string;
    status: string;
  }
): Promise<LinkedInAccountRecord> {
  const [account] = await db
    .insert(linkedinAccounts)
    .values({
      userId: input.userId,
      unipileAccountId: input.unipileAccountId,
      status: input.status,
      reconnectRequired: input.status !== "OK"
    })
    .onConflictDoUpdate({
      target: linkedinAccounts.unipileAccountId,
      set: {
        userId: input.userId,
        status: input.status,
        reconnectRequired: input.status !== "OK",
        updatedAt: new Date()
      }
    })
    .returning();

  if (!account) throw new Error("Unable to upsert LinkedIn account");

  return {
    id: account.id,
    userId: account.userId,
    unipileAccountId: account.unipileAccountId,
    status: account.status ?? "pending",
    reconnectRequired: account.reconnectRequired ?? false,
    linkedinProduct: account.linkedinProduct
  };
}

import { desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { linkedinAccounts } from "@/server/db/schema";
import type { LinkedInProduct } from "@/server/unipile/types";

export type LinkedInAccountRecord = {
  id: string;
  userId: string;
  unipileAccountId: string;
  status: string;
  statusMessage?: string | null;
  reconnectRequired: boolean;
  linkedinProduct?: LinkedInProduct | null;
  accountUserProviderId?: string | null;
  lastFullSyncAt?: Date | null;
  lastPartialSyncAt?: Date | null;
  updatedAt?: Date | null;
};

export function isHealthyLinkedInAccount(account: Pick<LinkedInAccountRecord, "status" | "reconnectRequired">) {
  return ["OK", "SYNC_SUCCESS", "CREATION_SUCCESS", "RECONNECTED"].includes(account.status) && !account.reconnectRequired;
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

  return account ? toLinkedInAccountRecord(account) : null;
}

export async function findLinkedInAccountsByUserId(
  db: Database,
  userId: string
): Promise<LinkedInAccountRecord[]> {
  const accounts = await db
    .select()
    .from(linkedinAccounts)
    .where(eq(linkedinAccounts.userId, userId))
    .orderBy(desc(linkedinAccounts.updatedAt));

  return accounts.map(toLinkedInAccountRecord);
}

export async function upsertLinkedInAccountFromHostedAuth(
  db: Database,
  input: {
    userId: string;
    unipileAccountId: string;
    status: string;
    accountUserProviderId?: string | null;
    linkedinProduct?: LinkedInProduct | null;
  }
): Promise<LinkedInAccountRecord> {
  const metadata = accountMetadataValues(input);
  const [account] = await db
    .insert(linkedinAccounts)
    .values({
      userId: input.userId,
      unipileAccountId: input.unipileAccountId,
      status: input.status,
      reconnectRequired: input.status !== "OK",
      ...metadata
    })
    .onConflictDoUpdate({
      target: linkedinAccounts.unipileAccountId,
      set: {
        userId: input.userId,
        status: input.status,
        reconnectRequired: input.status !== "OK",
        updatedAt: new Date(),
        ...metadata
      }
    })
    .returning();

  if (!account) throw new Error("Unable to upsert LinkedIn account");

  return toLinkedInAccountRecord(account);
}

export async function updateLinkedInAccountMetadataByUnipileId(
  db: Database,
  input: {
    unipileAccountId: string;
    accountUserProviderId?: string | null;
    linkedinProduct?: LinkedInProduct | null;
  }
) {
  const metadata = accountMetadataValues(input);
  if (Object.keys(metadata).length === 0) return;

  await db
    .update(linkedinAccounts)
    .set({
      ...metadata,
      updatedAt: new Date()
    })
    .where(eq(linkedinAccounts.unipileAccountId, input.unipileAccountId));
}

function toLinkedInAccountRecord(account: typeof linkedinAccounts.$inferSelect): LinkedInAccountRecord {
  return {
    id: account.id,
    userId: account.userId,
    unipileAccountId: account.unipileAccountId,
    status: account.status ?? "pending",
    statusMessage: account.statusMessage,
    reconnectRequired: account.reconnectRequired ?? false,
    linkedinProduct: account.linkedinProduct,
    accountUserProviderId: account.accountUserProviderId,
    lastFullSyncAt: account.lastFullSyncAt,
    lastPartialSyncAt: account.lastPartialSyncAt,
    updatedAt: account.updatedAt
  };
}

function accountMetadataValues(input: {
  accountUserProviderId?: string | null;
  linkedinProduct?: LinkedInProduct | null;
}) {
  return {
    ...(input.accountUserProviderId !== undefined ? { accountUserProviderId: input.accountUserProviderId } : {}),
    ...(input.linkedinProduct !== undefined ? { linkedinProduct: input.linkedinProduct } : {})
  };
}

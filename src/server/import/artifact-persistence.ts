import type { PreparedArtifactRelationship } from "./artifact-import";
import { assertOwnsRecord } from "@/server/auth/ownership";
import type { AuthIdentity } from "@/server/db/repositories/app-users";
import type { LinkedInAccountRecord } from "@/server/db/repositories/linkedin-accounts";

export type ArtifactImportStore = {
  findLinkedInAccountById(id: string): Promise<LinkedInAccountRecord | null>;
  upsertArtifactRelationship(input: {
    userId: string;
    linkedinAccountId: string;
    row: PreparedArtifactRelationship;
  }): Promise<void>;
};

export async function persistArtifactImport(input: {
  user: AuthIdentity;
  linkedinAccountId: string;
  rows: PreparedArtifactRelationship[];
  store: ArtifactImportStore;
}) {
  const account = assertOwnsRecord(
    input.user.id,
    await input.store.findLinkedInAccountById(input.linkedinAccountId),
    "LinkedIn account"
  );

  for (const row of input.rows) {
    await input.store.upsertArtifactRelationship({
      userId: input.user.id,
      linkedinAccountId: account.id,
      row
    });
  }

  return {
    importedCount: input.rows.length,
    linkedinAccountId: account.id
  };
}

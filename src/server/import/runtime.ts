import { eq } from "drizzle-orm";
import { createRuntimeDb } from "@/server/db/runtime";
import {
  accountPeople,
  crmAccounts,
  linkedinRelationships,
  people
} from "@/server/db/schema";
import { findLinkedInAccountById } from "@/server/db/repositories/linkedin-accounts";
import type { ArtifactImportStore } from "./artifact-persistence";

export function createRuntimeArtifactImportStore(): ArtifactImportStore {
  const db = createRuntimeDb();

  return {
    findLinkedInAccountById: (id) => findLinkedInAccountById(db, id),
    async upsertArtifactRelationship(input) {
      const [existingPerson] = input.row.person.linkedinUrl
        ? await db
          .select()
          .from(people)
          .where(eq(people.linkedinUrl, input.row.person.linkedinUrl))
          .limit(1)
        : await db
          .select()
          .from(people)
          .where(eq(people.fullName, input.row.person.fullName))
          .limit(1);

      const person = existingPerson ?? (await db
        .insert(people)
        .values({
          fullName: input.row.person.fullName,
          title: input.row.person.title,
          location: input.row.person.location,
          linkedinUrl: input.row.person.linkedinUrl,
          source: "artifact_import"
        })
        .returning())[0];

      if (!person) throw new Error("Unable to persist imported person");

      if (input.row.accountName) {
        const [existingAccount] = await db
          .select()
          .from(crmAccounts)
          .where(eq(crmAccounts.name, input.row.accountName))
          .limit(1);
        const account = existingAccount ?? (await db
          .insert(crmAccounts)
          .values({
            name: input.row.accountName,
            ownerUserId: input.userId
          })
          .returning())[0];

        if (account) {
          await db
            .insert(accountPeople)
            .values({
              accountId: account.id,
              personId: person.id,
              relationshipType: "artifact_import",
              matchSource: "artifact_import",
              matchConfidence: 100
            })
            .onConflictDoNothing();
        }
      }

      await db
        .insert(linkedinRelationships)
        .values({
          userId: input.userId,
          linkedinAccountId: input.linkedinAccountId,
          personId: person.id,
          relationshipStatus: input.row.relationship.relationshipStatus,
          relationshipStage: input.row.relationship.relationshipStage,
          freshnessBucket: input.row.relationship.freshnessBucket,
          lastActivityAt: input.row.relationship.lastActivityAt,
          hasReplied: input.row.relationship.hasReplied,
          manualResponded: input.row.relationship.manualResponded
        })
        .onConflictDoUpdate({
          target: [linkedinRelationships.userId, linkedinRelationships.personId],
          set: {
            relationshipStatus: input.row.relationship.relationshipStatus,
            relationshipStage: input.row.relationship.relationshipStage,
            freshnessBucket: input.row.relationship.freshnessBucket,
            lastActivityAt: input.row.relationship.lastActivityAt,
            hasReplied: input.row.relationship.hasReplied,
            manualResponded: input.row.relationship.manualResponded,
            updatedAt: new Date()
          }
        });
    }
  };
}

import { describe, expect, it } from "vitest";
import { prepareArtifactImport } from "@/server/import/artifact-import";
import { persistArtifactImport } from "@/server/import/artifact-persistence";
import { markRelationshipResponded, type RelationshipRecord } from "@/server/db/repositories/relationships";

describe("artifact import", () => {
  it("prepares imported artifact rows for persisted people and relationships", () => {
    const rows = prepareArtifactImport([
      {
        name: "LauraLee Hall",
        account: "Example Brand",
        title: "Director, Global Guest Experience",
        location: "Marietta, Georgia",
        freshnessBucket: "warm",
        lastActivityAt: "2026-04-24T12:02:00Z"
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      person: {
        fullName: "LauraLee Hall",
        title: "Director, Global Guest Experience"
      },
      accountName: "Example Brand",
      relationship: {
        relationshipStatus: "connected",
        freshnessBucket: "warm",
        hasReplied: false
      }
    });
  });

  it("maps rows without activity to connected_no_dm", () => {
    expect(
      prepareArtifactImport([
        {
          name: "Jane Smith",
          freshnessBucket: "no_activity"
        }
      ])[0].relationship.relationshipStage
    ).toBe("connected_no_dm");
  });

  it("rejects invalid freshness buckets before persistence", () => {
    expect(() =>
      prepareArtifactImport([
        {
          name: "Bad Bucket",
          freshnessBucket: "cold" as never
        }
      ])
    ).toThrow(/invalid freshness bucket/i);
  });

  it("marks responded relationships persistently in domain state", () => {
    const relationship: RelationshipRecord = {
      id: "rel_1",
      userId: "user_1",
      linkedinAccountId: "acct_1",
      personId: "person_1",
      relationshipStatus: "connected",
      relationshipStage: "dm_sent_no_reply",
      freshnessBucket: "warm",
      lastActivityAt: null,
      lastOutboundAt: new Date("2026-04-20T12:00:00Z"),
      lastInboundAt: null,
      hasReplied: false,
      manualResponded: false,
      doNotContact: false,
      snoozedUntil: null
    };

    const responded = markRelationshipResponded(relationship, new Date("2026-04-29T12:00:00Z"));

    expect(responded).toMatchObject({
      manualResponded: true,
      hasReplied: true,
      relationshipStage: "replied"
    });
    expect(responded.lastInboundAt?.toISOString()).toBe("2026-04-29T12:00:00.000Z");
  });

  it("persists prepared rows against an owned LinkedIn account", async () => {
    const persisted: unknown[] = [];
    const rows = prepareArtifactImport([{ name: "Jane Buyer", freshnessBucket: "warm" }]);
    const result = await persistArtifactImport({
      user: { id: "user_1", email: "one@example.com" },
      linkedinAccountId: "linkedin_account_1",
      rows,
      store: {
        async findLinkedInAccountById() {
          return {
            id: "linkedin_account_1",
            userId: "user_1",
            unipileAccountId: "unipile_account_1",
            status: "OK",
            reconnectRequired: false
          };
        },
        async upsertArtifactRelationship(input) {
          persisted.push(input);
        }
      }
    });

    expect(result).toEqual({ importedCount: 1, linkedinAccountId: "linkedin_account_1" });
    expect(persisted).toHaveLength(1);
  });
});

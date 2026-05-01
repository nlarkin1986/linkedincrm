import { describe, expect, it } from "vitest";
import { buildDashboardResponse, type DashboardRelationshipRow } from "@/server/dashboard/current-user-dashboard";

describe("buildDashboardResponse", () => {
  it("returns zero counts and empty rows when the user has no synced relationships", () => {
    expect(buildDashboardResponse([])).toEqual({
      summary: {
        total: 0,
        fresh: 0,
        warm: 0,
        cooling: 0,
        stale: 0,
        noActivity: 0,
        dataAsOf: null
      },
      rows: []
    });
  });

  it("builds counts and rows from the current user's relationships", () => {
    const response = buildDashboardResponse([
      row({ relationshipId: "rel_1", personName: "Nate Prospect", freshnessBucket: "fresh" }),
      row({ relationshipId: "rel_2", personName: "Avery Buyer", freshnessBucket: "warm" }),
      row({ relationshipId: "rel_3", personName: "Jordan Lead", freshnessBucket: "cooling" }),
      row({ relationshipId: "rel_4", personName: "Riley Contact", freshnessBucket: "stale" }),
      row({ relationshipId: "rel_5", personName: "Morgan Account", freshnessBucket: "no_activity" })
    ]);

    expect(response.summary).toMatchObject({
      total: 5,
      fresh: 1,
      warm: 1,
      cooling: 1,
      stale: 1,
      noActivity: 1
    });
    expect(response.rows.map((relationship) => relationship.relationshipId)).toEqual([
      "rel_1",
      "rel_2",
      "rel_3",
      "rel_4",
      "rel_5"
    ]);
  });

  it("uses the latest activity or update timestamp as dataAsOf", () => {
    const response = buildDashboardResponse([
      row({
        relationshipId: "rel_1",
        lastActivityAt: new Date("2026-04-29T12:00:00.000Z"),
        updatedAt: new Date("2026-04-30T12:00:00.000Z")
      }),
      row({
        relationshipId: "rel_2",
        lastActivityAt: new Date("2026-04-30T18:00:00.000Z"),
        updatedAt: new Date("2026-04-29T18:00:00.000Z")
      })
    ]);

    expect(response.summary.dataAsOf).toBe("2026-04-30T18:00:00.000Z");
  });
});

function row(overrides: Partial<DashboardRelationshipRow>): DashboardRelationshipRow {
  return {
    relationshipId: "rel",
    personName: "Prospect",
    accountName: "Account",
    title: "Title",
    stage: "needs_review",
    freshnessBucket: "no_activity",
    lastActivityAt: null,
    updatedAt: null,
    ...overrides
  };
}

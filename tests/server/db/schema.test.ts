import { describe, expect, it } from "vitest";
import { appUsers, freshnessBucket, linkedinAccounts, messageDirection, relationshipStage } from "@/server/db/schema";
import { buildAppUserFromIdentity, normalizeEmail } from "@/server/db/repositories/app-users";

describe("database schema", () => {
  it("includes the required auth identity field on app users", () => {
    expect(appUsers.authUserId.name).toBe("auth_user_id");
  });

  it("stores the connected LinkedIn account provider user id for direction inference", () => {
    expect(linkedinAccounts.accountUserProviderId.name).toBe("account_user_provider_id");
  });

  it("defines relationship stage and freshness enums used by the dashboard", () => {
    expect(relationshipStage.enumValues).toContain("dm_sent_no_reply");
    expect(relationshipStage.enumValues).toContain("do_not_contact");
    expect(freshnessBucket.enumValues).toEqual(["fresh", "warm", "cooling", "stale", "no_activity"]);
  });

  it("keeps chat/message direction values aligned with the migration", () => {
    expect(messageDirection.enumValues).toEqual(["inbound", "outbound", "unknown"]);
  });

  it("normalizes app user email casing without changing auth identity", () => {
    expect(normalizeEmail(" Daniel@Example.COM ")).toBe("daniel@example.com");
    expect(
      buildAppUserFromIdentity({
        id: "00000000-0000-0000-0000-000000000001",
        email: "Daniel@Example.COM",
        fullName: "Daniel Torres"
      })
    ).toMatchObject({
      authUserId: "00000000-0000-0000-0000-000000000001",
      email: "daniel@example.com",
      fullName: "Daniel Torres",
      role: "ae"
    });
  });
});

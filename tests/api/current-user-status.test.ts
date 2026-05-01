import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/me/route";
import { buildCurrentUserStatus, initialsForUser } from "@/server/auth/current-user-status";

describe("current user status", () => {
  it("returns 401 without bearer auth before reading integration environment", async () => {
    const response = await GET(new Request("https://app.example.com/api/me"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });

  it("renders connected LinkedIn account status for the signed-in app user", () => {
    const status = buildCurrentUserStatus({
      appUser: {
        id: "app_user_1",
        authUserId: "00000000-0000-0000-0000-000000000001",
        email: "nate@example.com",
        fullName: "Nate Larkin",
        role: "ae"
      },
      linkedinAccounts: [
        {
          id: "linkedin_account_1",
          userId: "app_user_1",
          unipileAccountId: "unipile_account_1",
          status: "OK",
          reconnectRequired: false,
          lastFullSyncAt: new Date("2026-04-30T18:00:00Z")
        }
      ]
    });

    expect(status.user).toMatchObject({
      id: "app_user_1",
      displayName: "Nate Larkin",
      initials: "NL"
    });
    expect(status.linkedin).toMatchObject({
      state: "connected",
      accounts: [
        {
          id: "linkedin_account_1",
          status: "OK",
          reconnectRequired: false,
          lastFullSyncAt: "2026-04-30T18:00:00.000Z"
        }
      ]
    });
  });

  it("falls back to email display and not-connected state when no account exists", () => {
    expect(
      buildCurrentUserStatus({
        appUser: {
          id: "app_user_1",
          authUserId: "00000000-0000-0000-0000-000000000001",
          email: "nate@example.com",
          fullName: null,
          role: "ae"
        },
        linkedinAccounts: []
      })
    ).toMatchObject({
      user: {
        displayName: "nate@example.com",
        initials: "NA"
      },
      linkedin: {
        state: "not_connected"
      }
    });
  });

  it("keeps connected account metadata before initial full sync completes", () => {
    const status = buildCurrentUserStatus({
      appUser: {
        id: "app_user_1",
        authUserId: "00000000-0000-0000-0000-000000000001",
        email: "nate@example.com",
        fullName: "Nate Larkin",
        role: "ae"
      },
      linkedinAccounts: [
        {
          id: "linkedin_account_1",
          userId: "app_user_1",
          unipileAccountId: "unipile_account_1",
          status: "OK",
          reconnectRequired: false,
          lastFullSyncAt: null
        }
      ]
    });

    expect(status.linkedin).toMatchObject({
      state: "connected",
      accounts: [
        {
          id: "linkedin_account_1",
          status: "OK",
          reconnectRequired: false,
          lastFullSyncAt: null
        }
      ]
    });
  });

  it("prioritizes reconnect required state", () => {
    expect(
      buildCurrentUserStatus({
        appUser: {
          id: "app_user_1",
          authUserId: "00000000-0000-0000-0000-000000000001",
          email: "nate@example.com",
          fullName: "Nate Larkin",
          role: "ae"
        },
        linkedinAccounts: [
          {
            id: "linkedin_account_1",
            userId: "app_user_1",
            unipileAccountId: "unipile_account_1",
            status: "OK",
            reconnectRequired: true
          }
        ]
      }).linkedin.state
    ).toBe("reconnect_required");
  });

  it("treats healthy Unipile lifecycle statuses as connected", () => {
    expect(
      buildCurrentUserStatus({
        appUser: {
          id: "app_user_1",
          authUserId: "00000000-0000-0000-0000-000000000001",
          email: "nate@example.com",
          fullName: "Nate Larkin",
          role: "ae"
        },
        linkedinAccounts: [
          {
            id: "linkedin_account_1",
            userId: "app_user_1",
            unipileAccountId: "unipile_account_1",
            status: "SYNC_SUCCESS",
            reconnectRequired: false,
            lastFullSyncAt: new Date("2026-04-30T18:00:00Z")
          }
        ]
      }).linkedin.state
    ).toBe("connected");
  });

  it("derives initials from names and email addresses", () => {
    expect(initialsForUser("Nate Larkin", "nate@example.com")).toBe("NL");
    expect(initialsForUser("Nate", "nate@example.com")).toBe("NA");
    expect(initialsForUser("nate@example.com", "nate@example.com")).toBe("NA");
  });
});

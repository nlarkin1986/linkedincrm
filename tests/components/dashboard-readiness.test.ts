import { describe, expect, it } from "vitest";
import { classifyDashboardReadiness } from "@/components/dashboard/dashboard-readiness";
import type { CurrentUserStatus } from "@/components/auth/authenticated-user-summary";
import type { DashboardData } from "@/components/dashboard/authenticated-dashboard";

describe("classifyDashboardReadiness", () => {
  it("classifies profile failures as account recovery", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_error",
        message: "Unable to load current user."
      })
    ).toEqual({ status: "account_recovery", message: "Unable to load current user." });
  });

  it("classifies signed-in users with no LinkedIn account as setup", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({ state: "not_connected", accounts: [] }),
        dashboard: { status: "not_requested" }
      }).status
    ).toBe("linkedin_setup");
  });

  it("classifies reconnect-required accounts with the local account id", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({
          state: "reconnect_required",
          accounts: [{ id: "linkedin_account_1", status: "CREDENTIALS", reconnectRequired: true }]
        }),
        dashboard: { status: "not_requested" }
      })
    ).toMatchObject({
      status: "linkedin_reconnect",
      accountId: "linkedin_account_1"
    });
  });

  it("classifies connected accounts without full sync as syncing", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({
          state: "connected",
          accounts: [{ id: "linkedin_account_1", status: "OK", reconnectRequired: false, lastFullSyncAt: null }]
        }),
        dashboard: { status: "ready", dashboard: dashboard([]) }
      }).status
    ).toBe("syncing");
  });

  it("classifies connected accounts with full sync and no rows as empty", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({
          state: "connected",
          accounts: [
            {
              id: "linkedin_account_1",
              status: "OK",
              reconnectRequired: false,
              lastFullSyncAt: "2026-04-30T18:00:00.000Z"
            }
          ]
        }),
        dashboard: { status: "ready", dashboard: dashboard([]) }
      }).status
    ).toBe("connected_empty");
  });

  it("classifies connected accounts with rows as dashboard ready", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({
          state: "connected",
          accounts: [
            {
              id: "linkedin_account_1",
              status: "OK",
              reconnectRequired: false,
              lastFullSyncAt: "2026-04-30T18:00:00.000Z"
            }
          ]
        }),
        dashboard: {
          status: "ready",
          dashboard: dashboard([{ relationshipId: "rel_1", personName: "Avery Buyer" }])
        }
      }).status
    ).toBe("dashboard_ready");
  });

  it("classifies dashboard failures after a connected profile as operational errors", () => {
    expect(
      classifyDashboardReadiness({
        status: "profile_ready",
        user: user({
          state: "connected",
          accounts: [
            {
              id: "linkedin_account_1",
              status: "OK",
              reconnectRequired: false,
              lastFullSyncAt: "2026-04-30T18:00:00.000Z"
            }
          ]
        }),
        dashboard: { status: "error", message: "Unable to load dashboard." }
      })
    ).toMatchObject({ status: "operational_error", message: "Unable to load dashboard." });
  });
});

function user(linkedin: CurrentUserStatus["linkedin"]): CurrentUserStatus {
  return {
    user: {
      id: "app_user_1",
      displayName: "Nate Larkin",
      email: "nate@example.com",
      initials: "NL",
      role: "ae"
    },
    linkedin
  };
}

function dashboard(rows: Partial<DashboardData["rows"][number]>[]): DashboardData {
  return {
    summary: {
      total: rows.length,
      fresh: 0,
      warm: 0,
      cooling: 0,
      stale: 0,
      noActivity: 0,
      dataAsOf: null
    },
    rows: rows.map((row, index) => ({
      relationshipId: `rel_${index}`,
      personName: "Prospect",
      accountName: null,
      title: null,
      stage: "needs_review",
      freshnessBucket: "no_activity",
      ...row
    }))
  };
}

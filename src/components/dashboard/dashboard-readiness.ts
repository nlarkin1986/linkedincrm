import type { CurrentUserStatus } from "@/components/auth/authenticated-user-summary";
import type { DashboardData } from "@/components/dashboard/authenticated-dashboard";

export type DashboardReadiness =
  | { status: "account_recovery"; message: string }
  | { status: "linkedin_setup"; user: CurrentUserStatus }
  | { status: "linkedin_reconnect"; user: CurrentUserStatus; accountId: string | null }
  | { status: "syncing"; user: CurrentUserStatus }
  | { status: "connected_empty"; user: CurrentUserStatus; dashboard: DashboardData }
  | { status: "dashboard_ready"; user: CurrentUserStatus; dashboard: DashboardData }
  | { status: "operational_error"; user: CurrentUserStatus; message: string };

export type DashboardDataResult =
  | { status: "not_requested" }
  | { status: "error"; message: string }
  | { status: "ready"; dashboard: DashboardData };

export type DashboardReadinessInput =
  | { status: "profile_error"; message: string }
  | { status: "profile_ready"; user: CurrentUserStatus; dashboard: DashboardDataResult };

export function classifyDashboardReadiness(input: DashboardReadinessInput): DashboardReadiness {
  if (input.status === "profile_error") {
    return { status: "account_recovery", message: input.message };
  }

  const user = input.user;
  if (user.linkedin.state === "not_connected") {
    return { status: "linkedin_setup", user };
  }
  if (user.linkedin.state === "reconnect_required") {
    return {
      status: "linkedin_reconnect",
      user,
      accountId: user.linkedin.accounts.find((account) => account.reconnectRequired)?.id ?? null
    };
  }

  const dashboard = input.dashboard;
  if (dashboard.status === "error") {
    return { status: "operational_error", user, message: dashboard.message };
  }
  if (dashboard.status !== "ready") {
    return { status: "syncing", user };
  }

  if (!hasCompletedFullSync(user)) {
    return { status: "syncing", user };
  }
  if (dashboard.dashboard.rows.length === 0) {
    return { status: "connected_empty", user, dashboard: dashboard.dashboard };
  }

  return { status: "dashboard_ready", user, dashboard: dashboard.dashboard };
}

function hasCompletedFullSync(user: CurrentUserStatus): boolean {
  return user.linkedin.accounts.some((account) => Boolean(account.lastFullSyncAt));
}

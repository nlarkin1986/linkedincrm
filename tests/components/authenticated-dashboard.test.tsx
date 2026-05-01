import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView, type DashboardData } from "@/components/dashboard/authenticated-dashboard";
import type { CurrentUserStatus } from "@/components/auth/authenticated-user-summary";

const user: CurrentUserStatus = {
  user: {
    id: "app_user_1",
    displayName: "Nate Larkin",
    email: "nate@example.com",
    initials: "NL",
    role: "ae"
  },
  linkedin: {
    state: "connected" as const,
    accounts: [
      {
        id: "linkedin_account_1",
        status: "OK",
        reconnectRequired: false,
        lastFullSyncAt: "2026-04-30T18:00:00.000Z"
      }
    ]
  }
};

describe("DashboardView", () => {
  it("renders the loading state before profile and dashboard data are ready", () => {
    render(<DashboardView state={{ status: "loading" }} />);

    expect(screen.getByText("Loading dashboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Loading/i })).toBeInTheDocument();
  });

  it("renders an account recovery state when profile loading fails", () => {
    const retry = vi.fn();

    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: { status: "account_recovery", message: "getaddrinfo ENOTFOUND db.example.supabase.co" }
        }}
        onRetry={retry}
      />
    );

    expect(screen.getByText("Sign in again to continue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in again/i })).toHaveAttribute("href", "/login?next=%2F");
    expect(screen.getByRole("button", { name: /Profile error/i })).toBeInTheDocument();
    expect(screen.queryByText(/getaddrinfo/i)).not.toBeInTheDocument();
    expect(screen.queryByText("LauraLee Hall")).not.toBeInTheDocument();
  });

  it("renders a dedicated LinkedIn setup state without dashboard metrics", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: {
            status: "linkedin_setup",
            user: {
              ...user,
              linkedin: { state: "not_connected", accounts: [] }
            }
          }
        }}
      />
    );

    expect(screen.getByText("Connect LinkedIn to start tracking relationships")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in to connect LinkedIn/i })).toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
    expect(screen.queryByText("LauraLee Hall")).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing Supabase/i)).not.toBeInTheDocument();
  });

  it("renders a dedicated LinkedIn reconnect state", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: {
            status: "linkedin_reconnect",
            user: {
              ...user,
              linkedin: {
                state: "reconnect_required",
                accounts: [{ id: "linkedin_account_1", status: "CREDENTIALS", reconnectRequired: true }]
              }
            },
            accountId: "linkedin_account_1"
          }
        }}
      />
    );

    expect(screen.getByText("Reconnect LinkedIn to keep your dashboard current")).toBeInTheDocument();
    expect(screen.queryByText("LauraLee Hall")).not.toBeInTheDocument();
  });

  it("renders a syncing state before initial relationship sync completes", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: { status: "syncing", user }
        }}
      />
    );

    expect(screen.getByText("Syncing your LinkedIn relationships")).toBeInTheDocument();
    expect(screen.queryByText("No LinkedIn relationship data yet")).not.toBeInTheDocument();
  });

  it("renders a connected empty state without demo rows", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: {
            status: "connected_empty",
            user,
            dashboard: dashboard([])
          }
        }}
      />
    );

    expect(screen.getByText("0 connections · Data as of not synced yet")).toBeInTheDocument();
    expect(screen.getByText("No LinkedIn relationships found yet")).toBeInTheDocument();
    expect(screen.queryByText("LauraLee Hall")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    expect(screen.queryByText("Example Brand")).not.toBeInTheDocument();
    expect(screen.queryByText("2K Games")).not.toBeInTheDocument();
  });

  it("renders API-provided dashboard counts and rows", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: {
            status: "dashboard_ready",
            user,
            dashboard: {
              summary: {
                total: 2,
                fresh: 1,
                warm: 1,
                cooling: 0,
                stale: 0,
                noActivity: 0,
                dataAsOf: "2026-04-30T18:00:00.000Z"
              },
              rows: [
                {
                  relationshipId: "rel_1",
                  personName: "Nate Prospect",
                  accountName: "Gladly Customer",
                  title: "VP Support",
                  stage: "dm_sent_no_reply",
                  freshnessBucket: "warm"
                },
                {
                  relationshipId: "rel_2",
                  personName: "Avery Buyer",
                  accountName: null,
                  title: null,
                  stage: "replied",
                  freshnessBucket: "fresh"
                }
              ]
            }
          }
        }}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Nate Prospect")).toBeInTheDocument();
    expect(screen.getByText("Gladly Customer")).toBeInTheDocument();
    expect(screen.getByText("Dm Sent No Reply")).toBeInTheDocument();
    expect(screen.getByText("Avery Buyer")).toBeInTheDocument();
    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders friendly operational copy when dashboard data fails after LinkedIn is connected", () => {
    render(
      <DashboardView
        state={{
          status: "ready",
          readiness: {
            status: "operational_error",
            user,
            message: "getaddrinfo ENOTFOUND db.example.supabase.co"
          }
        }}
      />
    );

    expect(screen.getByText("Dashboard data is unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Your account is connected/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /getaddrinfo/i })).not.toBeInTheDocument();
  });
});

function dashboard(rows: DashboardData["rows"]): DashboardData {
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
    rows
  };
}

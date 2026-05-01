"use client";

import { BarChart2, RefreshCw, Search, Settings, Upload } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedUserSummaryView, type CurrentUserStatus } from "@/components/auth/authenticated-user-summary";
import { RequireAuth } from "@/components/auth/require-auth";
import { classifyDashboardReadiness, type DashboardReadiness } from "@/components/dashboard/dashboard-readiness";
import { Badge } from "@/components/gladly/badge";
import { Button } from "@/components/gladly/button";
import { Input } from "@/components/gladly/input";
import { LinkedInConnectButton } from "@/components/linkedin/linkedin-connect-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/gladly/table";
import { createBrowserSupabaseClient } from "@/client/supabase";

export type DashboardData = {
  summary: {
    total: number;
    fresh: number;
    warm: number;
    cooling: number;
    stale: number;
    noActivity: number;
    dataAsOf: string | null;
  };
  rows: Array<{
    relationshipId: string;
    personName: string;
    accountName: string | null;
    title: string | null;
    stage: string;
    freshnessBucket: string;
  }>;
};

export type DashboardState =
  | { status: "loading" }
  | { status: "ready"; readiness: DashboardReadiness };

export function AuthenticatedDashboard() {
  return (
    <RequireAuth>
      <AuthenticatedDashboardContent />
    </RequireAuth>
  );
}

function AuthenticatedDashboardContent() {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const loadDashboard = useCallback(async () => {
    setState({ status: "loading" });
    if (supabase instanceof Error) {
      setState({
        status: "ready",
        readiness: classifyDashboardReadiness({
          status: "profile_error",
          message: "Unable to load your account."
        })
      });
      return;
    }

    let accessToken: string;
    try {
      const { data, error } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (error || !token) {
        redirectToLogin();
        return;
      }
      accessToken = token;
    } catch {
      redirectToLogin();
      return;
    }

    try {
      const headers = {
        authorization: `Bearer ${accessToken}`
      };
      const userResponse = await fetch("/api/me", { headers });
      const userBody = await userResponse.json().catch(() => ({}));

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          redirectToLogin();
          return;
        }
        setState({
          status: "ready",
          readiness: classifyDashboardReadiness({
            status: "profile_error",
            message: typeof userBody.error === "string" ? userBody.error : "Unable to load current user."
          })
        });
        return;
      }

      const user = userBody as CurrentUserStatus;
      const setupReadiness = classifyDashboardReadiness({
        status: "profile_ready",
        user,
        dashboard: { status: "not_requested" }
      });
      if (setupReadiness.status === "linkedin_setup" || setupReadiness.status === "linkedin_reconnect") {
        setState({ status: "ready", readiness: setupReadiness });
        return;
      }

      let dashboardResponse: Response;
      let dashboardBody: Record<string, unknown>;
      try {
        dashboardResponse = await fetch("/api/dashboard", { headers });
        dashboardBody = await dashboardResponse.json().catch(() => ({}));
      } catch (error) {
        setState({
          status: "ready",
          readiness: classifyDashboardReadiness({
            status: "profile_ready",
            user,
            dashboard: {
              status: "error",
              message: error instanceof Error ? error.message : "Unable to load dashboard."
            }
          })
        });
        return;
      }

      if (!dashboardResponse.ok) {
        if (dashboardResponse.status === 401) {
          redirectToLogin();
          return;
        }
        setState({
          status: "ready",
          readiness: classifyDashboardReadiness({
            status: "profile_ready",
            user,
            dashboard: {
              status: "error",
              message: typeof dashboardBody.error === "string" ? dashboardBody.error : "Unable to load dashboard."
            }
          })
        });
        return;
      }

      setState({
        status: "ready",
        readiness: classifyDashboardReadiness({
          status: "profile_ready",
          user,
          dashboard: { status: "ready", dashboard: dashboardBody as DashboardData }
        })
      });
    } catch (error) {
      setState({
        status: "ready",
        readiness: classifyDashboardReadiness({
          status: "profile_error",
          message: error instanceof Error ? error.message : "Unable to load your account."
        })
      });
    }
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return <DashboardView state={state} onRetry={loadDashboard} />;
}

function redirectToLogin() {
  window.location.replace(`/login?next=${encodeURIComponent("/")}`);
}

export function DashboardView({
  state,
  onRetry
}: {
  state: DashboardState;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return <DashboardShell userSummary={{ status: "loading" }} body={<DashboardLoadingState />} />;
  }

  return <DashboardShell userSummary={summaryForReadiness(state.readiness)} body={bodyForReadiness(state.readiness, onRetry)} />;
}

function DashboardShell({
  userSummary,
  body
}: {
  userSummary: ComponentProps<typeof AuthenticatedUserSummaryView>["summary"];
  body: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gladly-page">
      <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gladly-green flex items-center justify-center text-white font-bold">
            +
          </div>
          <span className="text-xl font-semibold text-gray-900">Gladly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/linkedin"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gladly-green transition-colors hover:text-gladly-green-hover focus:outline-none focus:ring-2 focus:ring-gladly-green focus:ring-offset-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <AuthenticatedUserSummaryView summary={userSummary} />
        </div>
      </header>
      {body}
    </main>
  );
}

function DashboardBody({
  dashboard,
  onRetry
}: {
  dashboard: DashboardData;
  onRetry?: () => void;
}) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Connections Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">{dashboardSubtitle(dashboard.summary)}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button className="flex-1 sm:flex-none" onClick={onRetry} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh Connections
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={onRetry}>
            <BarChart2 className="h-4 w-4" />
            Refresh Activity
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {summaryBuckets(dashboard.summary).map((bucket) => (
          <div key={bucket.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{bucket.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{bucket.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-stretch justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <Input
            aria-label="Search relationships"
            className="w-full sm:w-80"
            icon={<Search className="h-4 w-4" />}
            placeholder="Search by name, account, title, or location"
            rounded
          />
          <Button className="sm:flex-none" variant="secondary">
            <Upload className="h-4 w-4" />
            Export
          </Button>
        </div>
        {dashboard.rows.length > 0 ? <DashboardTable rows={dashboard.rows} /> : <DashboardEmptyState />}
      </div>
    </section>
  );
}

function summaryForReadiness(readiness: DashboardReadiness): ComponentProps<typeof AuthenticatedUserSummaryView>["summary"] {
  if (readiness.status === "account_recovery") {
    return { status: "error", message: readiness.message };
  }
  return { status: "ready", data: readiness.user };
}

function bodyForReadiness(readiness: DashboardReadiness, onRetry?: () => void) {
  if (readiness.status === "account_recovery") {
    return <AccountRecoveryState onRetry={onRetry} />;
  }
  if (readiness.status === "linkedin_setup") {
    return <LinkedInOnboardingState mode="connect" />;
  }
  if (readiness.status === "linkedin_reconnect") {
    return <LinkedInOnboardingState accountId={readiness.accountId} mode="reconnect" />;
  }
  if (readiness.status === "syncing") {
    return <DashboardSyncingState onRetry={onRetry} />;
  }
  if (readiness.status === "connected_empty") {
    return <ConnectedEmptyState dashboard={readiness.dashboard} onRetry={onRetry} />;
  }
  if (readiness.status === "operational_error") {
    return <DashboardOperationalErrorState detail={readiness.message} onRetry={onRetry} />;
  }
  return <DashboardBody dashboard={readiness.dashboard} onRetry={onRetry} />;
}

function DashboardTable({ rows }: { rows: DashboardData["rows"] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Freshness</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.relationshipId}>
              <TableCell className="font-medium text-gray-900">{row.personName}</TableCell>
              <TableCell>{row.accountName ?? "Unmatched"}</TableCell>
              <TableCell>{row.title ?? "Unknown"}</TableCell>
              <TableCell>{formatStage(row.stage)}</TableCell>
              <TableCell>
                <Badge variant={row.freshnessBucket === "fresh" ? "active" : "neutral"}>
                  {formatFreshness(row.freshnessBucket)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Loading dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Fetching your profile and LinkedIn relationship data.</p>
      </div>
    </section>
  );
}

function AccountRecoveryState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Sign in again to continue</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          We could not confirm your Gladly account. Sign in again, then return here to connect LinkedIn or view your dashboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md bg-gladly-green px-4 py-2 text-sm font-medium text-white hover:bg-gladly-green-hover"
            href="/login?next=%2F"
          >
            Sign in again
          </Link>
          {onRetry ? (
            <Button onClick={onRetry} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LinkedInOnboardingState({
  mode,
  accountId
}: {
  mode: "connect" | "reconnect";
  accountId?: string | null;
}) {
  const reconnect = mode === "reconnect";
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm font-medium text-gladly-green">{reconnect ? "LinkedIn reconnect required" : "LinkedIn setup"}</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {reconnect ? "Reconnect LinkedIn to keep your dashboard current" : "Connect LinkedIn to start tracking relationships"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          {reconnect
            ? "Your LinkedIn connection needs attention before Gladly can sync new relationship activity."
            : "Gladly uses your connected LinkedIn account to sync relationship activity into this dashboard."}
        </p>
        <LinkedInConnectButton
          className="mt-5"
          label={reconnect ? "Reconnect LinkedIn" : "Connect LinkedIn"}
          mode={mode}
          reconnectAccountId={accountId ?? undefined}
          returnPath="/"
        />
      </div>
    </section>
  );
}

function DashboardSyncingState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Syncing your LinkedIn relationships</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Your LinkedIn account is connected. Gladly will show relationship activity here after the initial sync finishes.
        </p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Check again
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ConnectedEmptyState({ dashboard, onRetry }: { dashboard: DashboardData; onRetry?: () => void }) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">No LinkedIn relationships found yet</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          LinkedIn is connected, but Gladly has not found synced relationships for this account yet.
        </p>
        <p className="mt-2 text-sm text-gray-500">{dashboardSubtitle(dashboard.summary)}</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh dashboard
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function DashboardOperationalErrorState({ detail, onRetry }: { detail: string; onRetry?: () => void }) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">Dashboard data is unavailable</h1>
        <p className="mt-2 max-w-2xl text-sm text-red-700">
          Your account is connected, but we could not load relationship data right now.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-red-600">Technical detail: {detail}</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function DashboardEmptyState() {
  return (
    <div className="border-t border-gray-200 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-gray-900">No LinkedIn relationship data yet</h2>
      <p className="mt-2 text-sm text-gray-500">
        Connect LinkedIn and run the initial sync to populate your relationship dashboard.
      </p>
      <Link
        href="/settings/linkedin"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-gladly-green px-4 py-2 text-sm font-medium text-white hover:bg-gladly-green-hover"
      >
        Open LinkedIn settings
      </Link>
    </div>
  );
}

function dashboardSubtitle(summary: DashboardData["summary"]): string {
  const dataAsOf = summary.dataAsOf ? new Date(summary.dataAsOf).toLocaleDateString() : "not synced yet";
  return `${summary.total} connections · Data as of ${dataAsOf}`;
}

function summaryBuckets(summary: DashboardData["summary"]) {
  return [
    { label: "Total", value: summary.total },
    { label: "Fresh", value: summary.fresh },
    { label: "Warm", value: summary.warm },
    { label: "Cooling", value: summary.cooling },
    { label: "Stale", value: summary.stale },
    { label: "No Activity", value: summary.noActivity }
  ];
}

function formatStage(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFreshness(value: string): string {
  if (value === "no_activity") return "No Activity";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

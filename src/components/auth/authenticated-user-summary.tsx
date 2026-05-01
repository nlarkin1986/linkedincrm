"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/gladly/badge";
import { UserMenu } from "@/components/gladly/user-menu";
import { createBrowserSupabaseClient } from "@/client/supabase";

export type CurrentUserStatus = {
  user: {
    id?: string;
    displayName: string;
    email: string;
    initials: string;
    role?: "ae" | "bdr" | "manager" | "admin" | null;
  };
  linkedin: {
    state: "not_connected" | "connected" | "reconnect_required";
    accounts: Array<{
      id?: string;
      status: string;
      reconnectRequired: boolean;
      linkedinProduct?: "classic" | "sales_navigator" | "recruiter" | null;
      lastFullSyncAt?: string | null;
      lastPartialSyncAt?: string | null;
    }>;
  };
};

export type SummaryState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CurrentUserStatus };

type AuthenticatedUserSummaryProps = {
  variant?: "menu" | "linkedin-settings";
};

export function AuthenticatedUserSummary({ variant = "menu" }: AuthenticatedUserSummaryProps) {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [summary, setSummary] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      let accessToken: string | null = null;
      try {
        if (supabase instanceof Error) {
          setSummary({ status: "error", message: supabase.message });
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
        if (error || !accessToken) {
          if (active) setSummary({ status: "unauthenticated" });
          return;
        }
      } catch {
        if (active) setSummary({ status: "unauthenticated" });
        return;
      }

      try {
        const response = await fetch("/api/me", {
          headers: {
            authorization: `Bearer ${accessToken}`
          }
        });
        const body = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setSummary({
            status: response.status === 401 ? "unauthenticated" : "error",
            message: typeof body.error === "string" ? body.error : "Unable to load current user."
          });
          return;
        }

        setSummary({ status: "ready", data: body as CurrentUserStatus });
      } catch (error) {
        if (!active) return;
        setSummary({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to load current user."
        });
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [supabase]);

  return <AuthenticatedUserSummaryView summary={summary} variant={variant} />;
}

export function AuthenticatedUserSummaryView({
  summary,
  variant = "menu"
}: {
  summary: SummaryState;
  variant?: "menu" | "linkedin-settings";
}) {
  if (variant === "menu") {
    if (summary.status === "ready") {
      return <UserMenu initials={summary.data.user.initials} name={summary.data.user.displayName} />;
    }
    if (summary.status === "error") {
      return <UserMenu initials="!" name="Profile error" />;
    }

    const initials = summary.status === "unauthenticated" ? "?" : "--";
    const name = summary.status === "unauthenticated" ? "Sign in" : "Loading";
    return <UserMenu initials={initials} name={name} />;
  }

  if (summary.status === "loading") {
    return <LinkedInSettingsSummary name="Loading account..." detail="Checking your signed-in account." badge="Pending" />;
  }
  if (summary.status === "unauthenticated") {
    return (
      <LinkedInSettingsSummary
        name="Sign in required"
        detail="Sign in before connecting a LinkedIn account."
        badge="Signed out"
      />
    );
  }
  if (summary.status === "error") {
    return (
      <LinkedInSettingsSummary
        name="Unable to load account"
        detail={summary.message}
        badge="Error"
        badgeVariant="danger"
      />
    );
  }

  const accountState = summary.data.linkedin.state;
  if (accountState === "connected") {
    return (
      <LinkedInSettingsSummary
        name={summary.data.user.displayName}
        detail="LinkedIn account connected. Historical sync is available for this signed-in user."
        badge="Connected"
        badgeVariant="active"
      />
    );
  }
  if (accountState === "reconnect_required") {
    return (
      <LinkedInSettingsSummary
        name={summary.data.user.displayName}
        detail="LinkedIn needs to be reconnected for this signed-in user."
        badge="Reconnect"
      />
    );
  }

  return (
    <LinkedInSettingsSummary
      name={summary.data.user.displayName}
      detail="No LinkedIn account is connected for this signed-in user."
      badge="Not connected"
    />
  );
}

function LinkedInSettingsSummary({
  name,
  detail,
  badge,
  badgeVariant
}: {
  name: string;
  detail: string;
  badge: string;
  badgeVariant?: "active" | "neutral" | "danger";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{name}</h2>
        <p className="mt-1 text-sm text-gray-500">{detail}</p>
      </div>
      <Badge variant={badgeVariant}>{badge}</Badge>
    </div>
  );
}

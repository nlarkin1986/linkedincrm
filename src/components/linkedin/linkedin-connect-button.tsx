"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, RefreshCw } from "lucide-react";
import { Button } from "@/components/gladly/button";
import { createBrowserSupabaseClient } from "@/client/supabase";

type SessionState = "checking" | "signed_out" | "signed_in";

export type LinkedInConnectButtonProps = {
  className?: string;
  label?: string;
  mode?: "connect" | "reconnect";
  onHostedAuthUrl?: (url: string) => void;
  reconnectAccountId?: string;
  returnPath?: string;
};

export function LinkedInConnectButton({
  className = "mt-4",
  label,
  mode = "connect",
  onHostedAuthUrl,
  reconnectAccountId,
  returnPath = "/settings/linkedin"
}: LinkedInConnectButtonProps) {
  const supabase = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch (error) {
      return error instanceof Error ? error : new Error("Unable to initialize Supabase auth.");
    }
  }, []);
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (supabase instanceof Error) {
      setSessionState("signed_out");
      setMessage("Sign in is unavailable right now. Try refreshing the page.");
      return;
    }
    const client = supabase;

    let active = true;

    async function loadSession() {
      try {
        const { data } = await client.auth.getSession();
        if (active) setSessionState(data.session ? "signed_in" : "signed_out");
      } catch {
        if (active) setSessionState("signed_out");
      }
    }

    void loadSession();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      setSessionState(session ? "signed_in" : "signed_out");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleClick() {
    setMessage(null);

    if (supabase instanceof Error) {
      setMessage("Sign in is unavailable right now. Try refreshing the page.");
      return;
    }

    if (mode === "reconnect" && !reconnectAccountId) {
      setMessage("Unable to start LinkedIn reconnection. Open LinkedIn settings and try again.");
      return;
    }

    if (sessionState !== "signed_in") {
      window.location.href = `/login?next=${encodeURIComponent(returnPath)}`;
      return;
    }

    setLoading(true);
    let accessToken: string | null = null;
    try {
      const { data, error } = await supabase.auth.getSession();
      accessToken = data.session?.access_token ?? null;
      if (error || !accessToken) {
        setLoading(false);
        setSessionState("signed_out");
        window.location.href = `/login?next=${encodeURIComponent(returnPath)}`;
        return;
      }
    } catch {
      setLoading(false);
      setSessionState("signed_out");
      window.location.href = `/login?next=${encodeURIComponent(returnPath)}`;
      return;
    }

    const response = await fetch("/api/linkedin/connect-url", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(mode === "reconnect" ? { reconnectAccountId } : {})
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || typeof body.url !== "string") {
      setLoading(false);
      setMessage("Unable to start LinkedIn connection. Try again.");
      return;
    }

    if (onHostedAuthUrl) {
      setLoading(false);
      onHostedAuthUrl(body.url);
      return;
    }
    window.location.assign(body.url);
  }

  const signedOut = sessionState === "signed_out";

  return (
    <div className={className}>
      <Button disabled={loading || sessionState === "checking"} onClick={handleClick}>
        {signedOut ? <LogIn className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        {buttonLabel({ sessionState, loading, label, mode })}
      </Button>
      {message ? (
        <p className="mt-3 text-sm text-red-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function buttonLabel({
  sessionState,
  loading,
  label,
  mode
}: {
  sessionState: SessionState;
  loading: boolean;
  label?: string;
  mode: "connect" | "reconnect";
}): string {
  if (loading) return "Opening LinkedIn auth...";
  if (sessionState === "checking") return "Checking sign in...";
  if (sessionState === "signed_out") return "Sign in to connect LinkedIn";
  return label ?? (mode === "reconnect" ? "Reconnect LinkedIn" : "Connect LinkedIn");
}

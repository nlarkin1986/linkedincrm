"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, RefreshCw } from "lucide-react";
import { Button } from "@/components/gladly/button";
import { createBrowserSupabaseClient } from "@/client/supabase";

type SessionState = "checking" | "signed_out" | "signed_in";

export function LinkedInConnectButton() {
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
      setMessage(supabase.message);
      return;
    }
    const client = supabase;

    let active = true;

    async function loadSession() {
      const { data } = await client.auth.getSession();
      if (active) setSessionState(data.session ? "signed_in" : "signed_out");
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
      setMessage(supabase.message);
      return;
    }

    if (sessionState !== "signed_in") {
      window.location.href = `/login?next=${encodeURIComponent("/settings/linkedin")}`;
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      setLoading(false);
      setSessionState("signed_out");
      setMessage(error?.message ?? "Sign in again before connecting LinkedIn.");
      return;
    }

    const response = await fetch("/api/linkedin/connect-url", {
      method: "POST",
      headers: {
        authorization: `Bearer ${data.session.access_token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || typeof body.url !== "string") {
      setLoading(false);
      setMessage(typeof body.error === "string" ? body.error : "Unable to create LinkedIn connection URL.");
      return;
    }

    window.location.assign(body.url);
  }

  const signedOut = sessionState === "signed_out";

  return (
    <div className="mt-4">
      <Button disabled={loading || sessionState === "checking"} onClick={handleClick}>
        {signedOut ? <LogIn className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        {buttonLabel(sessionState, loading)}
      </Button>
      {message ? (
        <p className="mt-3 text-sm text-red-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function buttonLabel(sessionState: SessionState, loading: boolean): string {
  if (loading) return "Opening LinkedIn auth...";
  if (sessionState === "checking") return "Checking sign in...";
  if (sessionState === "signed_out") return "Sign in to connect LinkedIn";
  return "Connect LinkedIn";
}
